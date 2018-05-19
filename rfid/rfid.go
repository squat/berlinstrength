package rfid

import (
	"bufio"
	"os"
	"regexp"
)

var alphaNum = regexp.MustCompile("[^a-zA-Z0-9]+")

// RFID is the abtracts the implementation of a RFID scanner.
type RFID interface {
	// Scan returns a chan that can be used to receive scanned IDs.
	Scan() <-chan string
}

type rfid struct {
	ch   chan string
	done <-chan struct{}
	in   *bufio.Scanner
}

func (r *rfid) Scan() <-chan string {
	return r.ch
}

func (r *rfid) start() {
	go func() {
		var s string
		for !isDone(r.done) && r.in.Scan() {
			if s = alphaNum.ReplaceAllString(r.in.Text(), ""); s != "" {
				r.ch <- s
			}
		}
		close(r.ch)
	}()
}

// New returns a new RFID scanner that reads from the given file.
func New(f *os.File, done <-chan struct{}) RFID {
	r := &rfid{
		ch:   make(chan (string)),
		done: done,
		in:   bufio.NewScanner(f),
	}
	r.start()
	return r
}

// NewFromStdin returns a new RFID scanner that reads from standard in.
func NewFromStdin(done <-chan struct{}) RFID {
	return New(os.Stdin, done)
}

func isDone(done <-chan struct{}) bool {
	select {
	case <-done:
		return true
	default:
	}
	return false
}
