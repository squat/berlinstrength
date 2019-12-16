package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/squat/berlinstrength/rfid"
	"github.com/squat/berlinstrength/websocket"

	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/sheets/v4"
)

const (
	bsIDColumn       = 0
	expirationColumn = 1
	nameColumn       = 2
	emailColumn      = 5
	photoColumn      = 10
	rfidColumn       = 9
	minRowLength     = nameColumn + 1
	defaultRowLength = 11
	dateFormat       = "02/01/2006"
)

// notFoundError is the error type returned when a resource is not found.
// This allows the server to return a 404.
type notFoundError struct {
	resource string
	id       string
}

// Error implements the error interface.
func (e *notFoundError) Error() string {
	return fmt.Sprintf("%s %q was not found", e.resource, e.id)
}

// Config represents the configuration for the Berlin Strength API.
type Config struct {
	// OAuth ID
	ClientID string
	// OAuth secret
	ClientSecret string
	// Allowed emails
	Emails []string
	// File descriptor for the RFID scanner; defaults to os.Stdin
	File *os.File
	// URL at which to listen
	URL *url.URL
}

// API is a Berlin Strength API.
type API struct {
	clients    map[string]client
	config     *Config
	done       <-chan struct{}
	handleRFID func(string)
	hub        *websocket.Hub
	mux        http.Handler
	rfid       rfid.RFID
	sheets     map[string]string

	rfidScansTotal *prometheus.CounterVec
}

type client struct {
	drive  *drive.Service
	sheets *sheets.Service
}

func newClient(oauthClient *http.Client) (*client, error) {
	d, err := drive.New(oauthClient)
	if err != nil {
		return nil, fmt.Errorf("failed to create Drive client: %v", err)
	}
	s, err := sheets.New(oauthClient)
	if err != nil {
		return nil, fmt.Errorf("failed to create Sheets client: %v", err)
	}
	return &client{
		drive:  d,
		sheets: s,
	}, nil
}

type user struct {
	BSID       string    `json:"bsID"`
	Debt       bool      `json:"debt"`
	Email      string    `json:"email"`
	Expiration time.Time `json:"expiration"`
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Photo      string    `json:"photo"`
}

func (u *user) UnmarshalJSON(b []byte) error {
	var m map[string]interface{}
	err := json.Unmarshal(b, &m)
	if err != nil {
		return err
	}
	if _, ok := m["bsID"].(string); ok {
		u.BSID = strings.ToLower(m["bsID"].(string))
	}

	if _, ok := m["email"].(string); ok {
		_, err = mail.ParseAddress(m["email"].(string))
		if err != nil {
			return err
		}
		u.Email = strings.ToLower(m["email"].(string))
	}
	if _, ok := m["debt"].(bool); ok {
		u.Debt = m["debt"].(bool)
	}
	if _, ok := m["id"].(string); ok {
		u.ID = strings.ToLower(m["id"].(string))
	}
	if _, ok := m["name"].(string); ok {
		u.Name = m["name"].(string)
	}
	if _, ok := m["photo"].(string); ok {
		u.Photo = m["photo"].(string)
	}
	var expiration time.Time
	if _, ok := m["expiration"].(string); ok {
		if m["expiration"].(string) != "" {
			expiration, err = time.ParseInLocation(time.RFC3339, m["expiration"].(string), loc)
			if err != nil {
				return err
			}
		}
	}
	u.Expiration = expiration
	return nil
}

func rowToUser(row []interface{}) (*user, error) {
	if len(row) < minRowLength {
		return nil, fmt.Errorf("the given row does not have the right number of fields; expected at least %d, got %d", minRowLength, len(row))
	}
	bsID, ok := row[bsIDColumn].(string)
	if !ok {
		return nil, fmt.Errorf("failed to parse row field %q", "bsid")
	}
	eDate, ok := row[expirationColumn].(string)
	if !ok {
		return nil, fmt.Errorf("failed to parse row field %q", "expiration date")
	}
	expiration, err := time.ParseInLocation(dateFormat, eDate, loc)
	if err != nil {
		return nil, fmt.Errorf("failed to parse expiration as date %v", err)
	}
	name, ok := row[nameColumn].(string)
	if !ok {
		return nil, fmt.Errorf("failed to parse row field %q", "name")
	}
	// email, photo, and rfid must be checked conditionally since they are exceptions to the format.
	var email string
	if len(row) > emailColumn {
		email, ok = row[emailColumn].(string)
		if !ok {
			return nil, fmt.Errorf("failed to parse row field %q", "email")
		}
	}
	var photo string
	if len(row) > photoColumn {
		photo, ok = row[photoColumn].(string)
		if !ok {
			return nil, fmt.Errorf("failed to parse row field %q", "photo")
		}
	}
	var id string
	if len(row) > rfidColumn {
		id, ok = row[rfidColumn].(string)
		if !ok {
			return nil, fmt.Errorf("failed to parse row field %q", "id")
		}
	}
	return &user{
		BSID:       strings.ToLower(bsID),
		Email:      strings.ToLower(email),
		Expiration: expiration,
		ID:         strings.ToLower(id),
		Name:       name,
		Photo:      photo,
	}, nil
}

func userToRow(u *user) []interface{} {
	r := make([]interface{}, defaultRowLength)
	r[bsIDColumn] = strings.ToLower(u.BSID)
	r[expirationColumn] = u.Expiration.Format(dateFormat)
	r[nameColumn] = u.Name
	r[emailColumn] = strings.ToLower(u.Email)
	r[photoColumn] = u.Photo
	r[rfidColumn] = strings.ToLower(u.ID)
	return r
}

type initialState struct {
	Client      user    `json:"client"`
	Email       string  `json:"email"`
	ClientError string  `json:"clientError"`
	Sheets      []sheet `json:"sheets"`
	SheetID     string  `json:"sheetID"`
}

type sheet struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
