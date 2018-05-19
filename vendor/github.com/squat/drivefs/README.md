# drivefs

drivefs allows you to serve static files in your Go application from Google Drive using the familiar http.FileSystem interface.

[![Go Report Card](https://goreportcard.com/badge/github.com/squat/drivefs)](https://goreportcard.com/report/github.com/squat/drivefs)
[![Documentation](https://godoc.org/github.com/squat/drivefs?status.svg)](http://godoc.org/github.com/squat/drivefs)

## Usage

```go
import (
    "log"
    "net/http"

    "google.golang.org/api/drive/v3"
    "github.com/squat/drivefs"
)

func main() {
    ...
    driveService, err := drive.New(oauthHttpClient)
    // Handle error.
    if err != nil {
        log.Fatal(err)
    }
    fs := drivefs.New(driveService)
    // Simple static webserver:
    log.Fatal(http.ListenAndServe(":8080", http.FileServer(fs)))
}
```
