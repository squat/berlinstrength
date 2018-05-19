package api

import (
	"errors"
	"math/rand"
	"net/http"

	"github.com/dghubble/sessions"
)

const (
	letterBytes     = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	sessionName     = "bss"
	sessionIDKey    = "googleID"
	sessionSheetKey = "sheetID"
)

// Authentication Errors
var (
	// ErrInvalidState represents a non-matching or empty state parameter.
	ErrInvalidState = errors.New("oauth2: Invalid OAuth2 state parameter")
	// ErrMissingStateCode represents a missing state or code in the callback request.
	ErrMissingStateCode = errors.New("oauth2: Request missing code or state")
	sessionStore        = sessions.NewCookieStore(randBytes(32), nil)
)

func randBytes(n int) []byte {
	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[rand.Intn(len(letterBytes))]
	}
	return b
}

// parseCallback parses the "code" and "state" parameters from the http.Request
// and returns them.
func parseCallback(req *http.Request) (authCode, state string, err error) {
	err = req.ParseForm()
	if err != nil {
		return "", "", err
	}
	authCode = req.Form.Get("code")
	state = req.Form.Get("state")
	if authCode == "" || state == "" {
		return "", "", ErrMissingStateCode
	}
	return authCode, state, nil
}
