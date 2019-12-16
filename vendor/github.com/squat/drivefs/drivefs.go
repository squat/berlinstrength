// Package drivefs allows Google Drive to be used as a static file server by implementing the http.FileSystem interface.
//
// Usage example:
//
//   import (
//       "log"
//       "net/http"
//
//       "google.golang.org/api/drive/v3"
//       "github.com/squat/drivefs"
//   )
//
//   func main() {
//       ...
//       driveService, err := drive.New(oauthHttpClient)
//       // Handle error.
//       if err != nil {
//           log.Fatal(err)
//       }
//       fs := drivefs.New(driveService)
//       // Simple static webserver:
//       log.Fatal(http.ListenAndServe(":8080", http.FileServer(fs)))
//   }
package drivefs

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
)

const (
	headSize = 512
)

type driveFS struct {
	service *drive.FilesService
}

// New creates a new http.FileSystem backed by Google Drive.
func New(service *drive.Service) http.FileSystem {
	return &driveFS{service: service.Files}
}

// Open returns a file in Google Drive whose ID matches the one given.
// If no matching file is found, os.ErrNotExist is returned.
// If an API error is encountered, the error is returned.
func (fs *driveFS) Open(id string) (http.File, error) {
	call := fs.service.Get(strings.TrimPrefix(id, "/")).Fields(googleapi.Field("size"), googleapi.Field("modifiedTime"))
	file, err := call.Do()
	if err != nil {
		if gErr, ok := err.(*googleapi.Error); ok && gErr.Code == http.StatusNotFound {
			return nil, os.ErrNotExist
		}
		return nil, fmt.Errorf("failed to get file information: %v", err)
	}
	return newDriveFile(call, file)
}

// driveFile represents a file from Google Drive and is used
// to implement the http.File interface.
type driveFile struct {
	call     *drive.FilesGetCall
	file     *drive.File
	head     []byte
	position int64
	reader   io.ReadCloser
}

func newDriveFile(call *drive.FilesGetCall, file *drive.File) (*driveFile, error) {
	r, err := call.Download()
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %v", err)
	}
	var head []byte
	if file.Size >= int64(headSize) {
		head = make([]byte, headSize)
		_, err := r.Body.Read(head)
		if err != nil {
			return nil, err
		}
	}
	return &driveFile{
		call:     call,
		file:     file,
		head:     head,
		position: 0,
		reader:   r.Body,
	}, nil
}

// Close closes the file and returns an error if one was encountered.
func (f *driveFile) Close() error {
	return f.reader.Close()
}

// Read reads up to len(p) bytes into p. It returns the number of bytes read (0 <= n <= len(p)) and any error encountered.
func (f *driveFile) Read(p []byte) (int, error) {
	var n int
	var err error
	if f.position < int64(len(f.head)) {
		n, err = io.MultiReader(bytes.NewBuffer(f.head[f.position:]), f.reader).Read(p)
	} else {
		n, err = f.reader.Read(p)
	}
	f.position += int64(n)
	return n, err
}

// Seek sets the offset for the next Read, returning the new offset relative to the start of the file and an error, if any.
func (f *driveFile) Seek(offset int64, whence int) (int64, error) {
	switch whence {
	case io.SeekCurrent:
		offset += f.position
	case io.SeekEnd:
		offset += f.file.Size
	}

	if offset == f.position {
		return f.position, nil
	}

	if offset > f.position {
		p := make([]byte, offset-f.position)
		_, err := f.reader.Read(p)
		return f.position, err
	}

	// This optimization lets us reuse the first bytes of a file,
	// e.g. for determining file type, without initiating a second API call.
	if f.position <= int64(len(f.head)) {
		f.position = offset
		return f.position, nil
	}

	// If the desired offset if behind the current position,
	// restart the download and seek to the desired position.
	r, err := f.call.Download()
	if err != nil {
		return f.position, err
	}
	f.reader = r.Body
	f.position = 0
	return f.Seek(offset, io.SeekStart)
}

// Stat always returns an os.FileInfo and no error and is used to implement
// the http.File interface.
func (f *driveFile) Stat() (os.FileInfo, error) {
	return newDriveFileStat(f.file), nil
}

// Readdir always returns an empty slice of os.FileInfo and no error,
// since listing directories is not implemented.
func (f *driveFile) Readdir(count int) ([]os.FileInfo, error) {
	return make([]os.FileInfo, 0), nil
}

// driveFileStat is used to implement the os.FileInfo interface
// from a Google Drive file.
type driveFileStat struct {
	file *drive.File
}

func newDriveFileStat(file *drive.File) *driveFileStat {
	return &driveFileStat{file: file}
}

// Name returns the name of the Google Drive file.
func (fs *driveFileStat) Name() string {
	return fs.file.Name
}

// Name returns the size of the Google Drive file.
func (fs *driveFileStat) Size() int64 {
	return fs.file.Size
}

// Mode returns a "0777" FileMode to implement the os.FileInfo interface.
func (fs *driveFileStat) Mode() os.FileMode {
	return os.ModePerm
}

// ModTime returns the modification time of the file or, if an error was
// encountered parsing the time, the current time.
func (fs *driveFileStat) ModTime() time.Time {
	t, err := time.Parse(time.RFC3339, fs.file.ModifiedTime)
	if err != nil {
		return time.Now()
	}
	return t
}

// IsDir always return false to implement the os.FileInfo interface.
func (fs *driveFileStat) IsDir() bool {
	return false
}

// Sys always returns nil to implement the os.FileInfo interface.
func (fs *driveFileStat) Sys() interface{} {
	return nil
}
