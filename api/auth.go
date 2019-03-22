package api

import (
	"math/rand"
	"time"

	"github.com/dghubble/sessions"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

const (
	letterBytes     = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	sessionName     = "bss"
	sessionIDKey    = "googleID"
	sessionSheetKey = "sheetID"
)

var (
	sessionStore = sessions.NewCookieStore(randBytes(32), nil)
)

func randBytes(n int) []byte {
	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[rand.Intn(len(letterBytes))]
	}
	return b
}
