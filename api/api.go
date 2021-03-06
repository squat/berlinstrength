package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"reflect"
	"strings"
	"time"

	"github.com/squat/berlinstrength/rfid"
	// statik needs to be imported to trigger the init func.
	_ "github.com/squat/berlinstrength/statik"
	"github.com/squat/berlinstrength/websocket"
	"github.com/squat/drivefs"

	"github.com/dghubble/gologin"
	"github.com/dghubble/gologin/google"
	oauthlogin "github.com/dghubble/gologin/oauth2"
	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rakyll/statik/fs"
	log "github.com/sirupsen/logrus"
	"golang.org/x/oauth2"
	googleOAuth2 "golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/sheets/v4"
)

const (
	sheetsQuery     = "mimeType = 'application/vnd.google-apps.spreadsheet'"
	directoryQuery  = "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
	directoryName   = "user_photos"
	userRange       = "A:K"
	userUpdateRange = "A%d:K%d"
	debtRange       = "DEBT!A:A"
	visitRange      = "VISIT!A:B"
	registerTimeout = 5 * time.Second
)

var (
	loc, _      = time.LoadLocation("Europe/Berlin")
	statikFS, _ = fs.New()
)

// New returns a new ServeMux with app routes.
func New(config *Config, reg prometheus.Registerer, gat prometheus.Gatherer) *API {
	if reg == nil {
		reg = prometheus.DefaultRegisterer
	}
	if gat == nil {
		gat = prometheus.DefaultGatherer
	}
	ins := newInstrumentationMiddleware(reg)

	r := mux.NewRouter()
	oauth2Config := &oauth2.Config{
		ClientID:     config.ClientID,
		ClientSecret: config.ClientSecret,
		RedirectURL:  fmt.Sprintf("%s/callback", config.URL),
		Endpoint:     googleOAuth2.Endpoint,
		Scopes:       []string{"profile", "email", sheets.SpreadsheetsScope, drive.DriveMetadataReadonlyScope, drive.DriveFileScope},
	}
	done := make(chan (struct{}))
	f := config.File
	if f == nil {
		f = os.Stdin
	}
	a := &API{
		clients:    make(map[string]client),
		config:     config,
		done:       done,
		handleRFID: nil,
		hub:        websocket.NewHub(done),
		mux:        r,
		rfid:       rfid.New(f, done),
		sheets:     make(map[string]string),
		rfidScansTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "berlin_strength_rfid_scans_total",
				Help: "The number of RFID scans.",
			},
			[]string{"result"},
		),
	}
	reg.MustRegister(a.rfidScansTotal)

	// state param cookies require HTTPS by default; disable for localhost development
	stateConfig := gologin.DefaultCookieConfig
	if config.URL.Scheme != "https" {
		stateConfig = gologin.DebugOnlyCookieConfig
	}
	r.Handle("/metrics", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		promhttp.InstrumentMetricHandler(reg, promhttp.HandlerFor(gat, promhttp.HandlerOpts{})).ServeHTTP(w, r)
	}))
	r.Handle("/", ins.newHandler("root", a.initialStateWithID(a.initialStateWithSheets(http.HandlerFunc(homeHandler)))))
	r.Handle("/edit/{id}", ins.newHandler("edit", a.initialStateWithID(a.initialStateWithSheets(a.initialStateWithClient(http.HandlerFunc(homeHandler))))))
	r.Handle("/register", ins.newHandler("register", a.initialStateWithID(a.initialStateWithSheets(http.HandlerFunc(homeHandler)))))
	r.Handle("/sheets", ins.newHandler("sheets", a.initialStateWithID(a.initialStateWithSheets(http.HandlerFunc(homeHandler)))))
	r.Handle("/scan/{id}", ins.newHandler("scan", a.initialStateWithID(a.initialStateWithSheets(a.initialStateWithClient(http.HandlerFunc(homeHandler))))))

	r.Handle("/login", ins.newHandler("login", google.StateHandler(stateConfig, loginHandler(oauth2Config))))
	r.HandleFunc("/logout", ins.newHandler("logout", http.HandlerFunc(a.logoutHandler)))
	r.Handle("/callback", ins.newHandler("callback", google.StateHandler(stateConfig, google.CallbackHandler(oauth2Config, a.issueSession(oauth2Config), nil))))
	r.Handle("/api/ws", ins.newHandler("api-ws", a.requireLogin(a.websocketHandler(a.hub))))
	r.Handle("/api/scan", ins.newHandler("api-scan", a.requireLogin(http.HandlerFunc(a.scanHandler)))).Methods("GET")
	r.Handle("/api/user", ins.newHandler("api-create-user", a.requireLogin(http.HandlerFunc(a.createUserHandler)))).Methods("POST")
	r.Handle("/api/user/{id}", ins.newHandler("api-get-user", a.requireLogin(http.HandlerFunc(a.getUserHandler)))).Methods("GET")
	r.Handle("/api/user/{id}", ins.newHandler("api-update-user", a.requireLogin(http.HandlerFunc(a.updateUserHandler)))).Methods("PUT")
	r.Handle("/api/sheet/{id}", ins.newHandler("api-sheet", a.requireLogin(http.HandlerFunc(a.sheetHandler)))).Methods("POST")
	r.Handle("/api/upload", ins.newHandler("api-upload", a.requireLogin(http.HandlerFunc(a.uploadHandler)))).Methods("POST")
	r.PathPrefix("/static/").Handler(ins.newHandler("static", http.StripPrefix("/static/", http.FileServer(statikFS))))
	r.PathPrefix("/photo/").Handler(ins.newHandler("photo", a.requireLogin(http.StripPrefix("/photo/", http.HandlerFunc(a.photoHandler)))))
	a.handleRFID = a.broadcastUser
	go a.watchRFID()
	return a
}

// ServeHTTP implements the http.Handler interface.
func (a *API) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	a.mux.ServeHTTP(w, r)
}

// issueSession issues a cookie session after successful Google login
func (a *API) issueSession(config *oauth2.Config) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		googleUser, err := google.UserFromContext(ctx)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		var found bool
		for _, e := range a.config.Emails {
			if googleUser.Email == e {
				found = true
				break
			}
		}
		if !found {
			http.Error(w, "", http.StatusUnauthorized)
			return
		}
		token, err := oauthlogin.TokenFromContext(ctx)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		oauthClient := config.Client(context.Background(), token)
		client, err := newClient(oauthClient)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		a.clients[googleUser.Email] = *client
		s := sessionStore.New(sessionName)
		s.Values[sessionIDKey] = googleUser.Email
		s.Save(w)
		http.Redirect(w, r, "/", http.StatusFound)
	}
	return http.HandlerFunc(fn)
}

func (a *API) broadcastUser(scanID string) {
	for id, sid := range a.sheets {
		go func(id, sid string) {
			if c, ok := a.clients[id]; ok {
				var u *user
				var err error
				var j []byte
				defer func() {
					if err != nil {
						a.rfidScansTotal.WithLabelValues("error").Inc()
						return
					}
					a.rfidScansTotal.WithLabelValues("success").Inc()
				}()
				a.hub.Send([]byte(`{"scanning":true}`), id)
				u, _, _, err = findUser(sid, scanID, rfidColumn, c)
				if err != nil {
					a.hub.Send(errorToJSON(err), id)
					log.Error(err)
					return
				}
				j, err = json.Marshal(u)
				if err != nil {
					a.hub.Send(errorToJSON(err), id)
					log.Errorf("failed to marshal user to JSON: %v", err)
					return
				}
				err = recordVisit(sid, u.BSID, c)
				if err != nil {
					log.Errorf("failed to record visit: %v", err)
				}
				a.hub.Send(j, id)
			}
		}(id, sid)
	}
}

// ensureDirectory tries to find the default photo directory and creates one if it does not already exist.
func ensureDirectory(ctx context.Context, c client) (*drive.File, error) {
	dirs, err := c.drive.Files.List().Context(ctx).Q(directoryQuery).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to list directories: %v", err)
	}
	for _, dir := range dirs.Files {
		if dir.Name == directoryName {
			return dir, nil
		}
	}
	return c.drive.Files.Create(&drive.File{Name: directoryName, MimeType: "application/vnd.google-apps.folder"}).Context(ctx).Fields(googleapi.Field("id")).Do()
}

// userRangeToUser converts a *sheets.ValueRange representing a user to a user struct.
func userRangeToUser(vr *sheets.ValueRange, scanID string, scanIDColumn int) (*user, int, []interface{}, error) {
	var i int
	var row []interface{}
	for i = range vr.Values {
		if len(vr.Values[i]) > scanIDColumn {
			if id, ok := vr.Values[i][scanIDColumn].(string); ok && strings.ToLower(id) == strings.ToLower(scanID) {
				row = vr.Values[i]
				break
			}
		}
	}
	// The Sheets API is not 0-index.
	i++
	if row == nil {
		return nil, i, nil, &notFoundError{"user", scanID}
	}
	u, err := rowToUser(row)
	if err != nil {
		return nil, i, nil, fmt.Errorf("failed to parse user: %v", err)
	}
	return u, i, row, nil
}

// debtRangeToDebt converts a *sheets.ValueRange representing debts to a boolean identifying if
// the given user has debt.
func debtRangeToDebt(vr *sheets.ValueRange, id string) bool {
	for i := range vr.Values {
		if len(vr.Values[i]) == 1 {
			if bsID, ok := vr.Values[i][0].(string); ok && strings.ToLower(bsID) == strings.ToLower(id) {
				return true
			}
		}
	}
	return false
}

// findUser will look for a user in the specified sheet by either BSID or RFID, and return a pointer to the user, the row of the user in the spreadsheet, and any error.
func findUser(sid, scanID string, scanIDColumn int, c client) (*user, int, []interface{}, error) {
	var dvr, uvr *sheets.ValueRange
	var err error
	if scanIDColumn == bsIDColumn {
		res, err := c.sheets.Spreadsheets.Values.BatchGet(sid).Ranges(userRange, debtRange).MajorDimension("ROWS").Do()
		if err != nil {
			return nil, 0, nil, fmt.Errorf("failed to batch get spreadsheet data: %v", err)
		}
		uvr = res.ValueRanges[0]
		dvr = res.ValueRanges[1]
	} else {
		uvr, err = c.sheets.Spreadsheets.Values.Get(sid, userRange).MajorDimension("ROWS").Do()
		if err != nil {
			return nil, 0, nil, fmt.Errorf("failed to get spreadsheet data: %v", err)
		}
		dvr, err = c.sheets.Spreadsheets.Values.Get(sid, debtRange).MajorDimension("ROWS").Do()
		if err != nil {
			return nil, 0, nil, fmt.Errorf("failed to get spreadsheet debt data: %v", err)
		}
	}
	u, i, row, err := userRangeToUser(uvr, scanID, scanIDColumn)
	if err != nil {
		return nil, i, nil, err
	}
	u.Debt = debtRangeToDebt(dvr, u.BSID)
	log.Infof("found email %q for %q", u.Email, scanID)
	return u, i, row, nil
}

func recordVisit(sid, id string, c client) error {
	vr := &sheets.ValueRange{
		MajorDimension: "ROWS",
		Values: [][]interface{}{
			{id, time.Now().Format(time.RFC3339)},
		},
	}
	_, err := c.sheets.Spreadsheets.Values.Append(sid, visitRange, vr).ValueInputOption("RAW").InsertDataOption("INSERT_ROWS").Do()
	return err
}

// loginHandler redirects a user to the OAuth login URL to get a token.
func loginHandler(config *oauth2.Config) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		state, err := oauthlogin.StateFromContext(ctx)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		authURL := config.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
		http.Redirect(w, r, authURL, http.StatusFound)
	}
	return http.HandlerFunc(fn)
}

// logoutHandler destroys the session and redirects to home.
func (a *API) logoutHandler(w http.ResponseWriter, r *http.Request) {
	if !a.isAuthenticated(r) {
		if r.Method == "POST" {
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	id, err := idFromSession(r)
	if err != nil {
		log.Warnf("failed to find and destroy client for logout: %v", err)
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	delete(a.clients, id)
	delete(a.sheets, id)
	sessionStore.Destroy(w, sessionName)
	if r.Method == "POST" {
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/", http.StatusFound)
}

// getUserHandler allows the client to fetch a user from the sheet.
func (a *API) getUserHandler(w http.ResponseWriter, r *http.Request) {
	bsID := mux.Vars(r)["id"]
	sid, err := sheetFromSession(r)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	id, err := idFromSession(r)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	u, _, _, err := findUser(sid, bsID, bsIDColumn, a.clients[id])
	if err != nil {
		if _, ok := err.(*notFoundError); ok {
			writeJSONError(err, http.StatusNotFound).ServeHTTP(w, r)
			return
		}
		writeJSONError(err, http.StatusInternalServerError).ServeHTTP(w, r)
		return
	}
	writeJSON(u).ServeHTTP(w, r)
}

// updateUserHandler allows the client to update a user in the sheet.
func (a *API) updateUserHandler(w http.ResponseWriter, r *http.Request) {
	bsID := mux.Vars(r)["id"]
	sid, err := sheetFromSession(r)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	id, err := idFromSession(r)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	decoder := json.NewDecoder(r.Body)
	var u user
	err = decoder.Decode(&u)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	defer r.Body.Close()
	row := userToRow(&u)
	_, n, existingRow, err := findUser(sid, bsID, bsIDColumn, a.clients[id])
	if err != nil {
		if _, ok := err.(*notFoundError); ok {
			writeJSONError(err, http.StatusNotFound).ServeHTTP(w, r)
			return
		}
		writeJSONError(err, http.StatusInternalServerError).ServeHTTP(w, r)
		return
	}
	for i := range existingRow {
		if i >= len(row) {
			break
		}
		if v, ok := row[i].(string); ok && v != "" {
			continue
		}
		row[i] = existingRow[i]
	}
	vr := &sheets.ValueRange{
		MajorDimension: "ROWS",
		Values:         [][]interface{}{row},
	}
	_, err = a.clients[id].sheets.Spreadsheets.Values.Update(sid, fmt.Sprintf(userUpdateRange, n, n), vr).ValueInputOption("RAW").Context(r.Context()).Do()
	if err != nil {
		log.Error(err)
		writeJSONError(err, http.StatusInternalServerError).ServeHTTP(w, r)
		return
	}
	writeJSON(u).ServeHTTP(w, r)
}

// createUserHandler allows the client to add a new row to the sheet.
func (a *API) createUserHandler(w http.ResponseWriter, r *http.Request) {
	sid, err := sheetFromSession(r)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	id, err := idFromSession(r)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	decoder := json.NewDecoder(r.Body)
	var u user
	err = decoder.Decode(&u)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	defer r.Body.Close()
	row := userToRow(&u)
	vr := &sheets.ValueRange{
		MajorDimension: "ROWS",
		Values:         [][]interface{}{row},
	}
	_, err = a.clients[id].sheets.Spreadsheets.Values.Append(sid, userRange, vr).ValueInputOption("RAW").InsertDataOption("INSERT_ROWS").Context(r.Context()).Do()
	if err != nil {
		log.Error(err)
		writeJSONError(err, http.StatusInternalServerError).ServeHTTP(w, r)
		return
	}
	writeJSON(u).ServeHTTP(w, r)
}

// scanHandler grabs a single ID from the RFID scanner.
func (a *API) scanHandler(w http.ResponseWriter, r *http.Request) {
	sid, err := sheetFromSession(r)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	scanID, err := a.scanOnce()
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	writeJSON(struct {
		ScanID  string `json:"scanID"`
		SheetID string `json:"sheetID"`
	}{scanID, sid}).ServeHTTP(w, r)
}

// scanOnce retrieves exactly one value from the RFID scanner.
// This method is not safe for concurrent use since it is modifying the `handleRFID field on the API pointer.
func (a *API) scanOnce() (string, error) {
	if reflect.ValueOf(a.broadcastUser).Pointer() != reflect.ValueOf(a.handleRFID).Pointer() {
		return "", errors.New("another client is currently reading a RFID value")
	}
	ch := make(chan (string), 1)
	a.handleRFID = func(id string) {
		ch <- id
		// We need to ensure that this function is only run once so that the channel does not block watchRFID.
		a.handleRFID = a.broadcastUser
	}
	defer func() { a.handleRFID = a.broadcastUser }()
	select {
	case <-time.After(registerTimeout):
		return "", errors.New("timed out waiting for RFID scan")
	case id := <-ch:
		return id, nil
	}
}

// sheetHandler allows a client to specify a sheet ID.
func (a *API) sheetHandler(w http.ResponseWriter, r *http.Request) {
	sid := mux.Vars(r)["id"]
	s, err := sessionStore.Get(r, sessionName)
	if err != nil {
		writeJSONError(err, http.StatusInternalServerError).ServeHTTP(w, r)
		return
	}
	s.Values[sessionSheetKey] = sid
	s.Save(w)
	a.sheets[s.Values[sessionIDKey].(string)] = sid
	writeJSON(struct {
		SheetID string `json:"sheetID"`
	}{sid}).ServeHTTP(w, r)
}

// websocketHandler handles websocket connections and ensures clients are
// registered to the correct topics.
func (a *API) websocketHandler(next http.Handler) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		id, err := idFromSession(r)
		if err != nil {
			log.Errorf("failed to upgrade websocket request: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		ctx := websocket.WithTopics(r.Context(), []string{id})
		next.ServeHTTP(w, r.WithContext(ctx))
	}
	return http.HandlerFunc(fn)
}

func (a *API) photoHandler(w http.ResponseWriter, r *http.Request) {
	id, err := idFromSession(r)
	if err != nil {
		log.Errorf("expected to find session in cookie: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	http.FileServer(drivefs.New(a.clients[id].drive)).ServeHTTP(w, r)
}

func (a *API) uploadHandler(w http.ResponseWriter, r *http.Request) {
	id, err := idFromSession(r)
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	f, _, err := r.FormFile("data")
	if err != nil {
		writeJSONError(err, http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	defer f.Close()
	bsID := r.FormValue("bsID")
	if bsID == "" {
		writeJSONError(errors.New("bsID is required"), http.StatusBadRequest).ServeHTTP(w, r)
		return
	}
	dir, err := ensureDirectory(r.Context(), a.clients[id])
	if err != nil {
		log.Errorf("failed to ensure photo directory exists: %v", err)
		writeJSONError(err, http.StatusInternalServerError).ServeHTTP(w, r)
		return
	}
	file, err := a.clients[id].drive.Files.Create(&drive.File{Name: bsID, Parents: []string{dir.Id}}).Context(r.Context()).Fields(googleapi.Field("id")).Media(f).Do()
	if err != nil {
		log.Errorf("failed to upload file: %v", err)
		writeJSONError(err, http.StatusInternalServerError).ServeHTTP(w, r)
		return
	}
	writeJSON(struct {
		FileID string `json:"fileID"`
	}{file.Id}).ServeHTTP(w, r)
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	is, err := initialStateFromContext(r.Context())
	if err != nil {
		log.Errorf("failed to get initial state from context: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	j, err := json.Marshal(is)
	if err != nil {
		log.Errorf("failed to marshal initial state to JSON: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	index, err := statikFS.Open("/index.html")
	if err != nil {
		log.Fatal(err)
	}
	indexHTML, err := ioutil.ReadAll(index)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Fprintf(w, string(indexHTML), j)
}

// initialStateWithID adds basic initial state to the request context.
// This initial state is ultimately used to render the HTML with a JSON
// payload that can be used to bootstrap the React app.
// If the request is authenticated, the user ID is added and the next
// handler is called, otherwise the HTML is rendered with unauthenticated
// initial state..
func (a *API) initialStateWithID(next http.Handler) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		is := &initialState{Sheets: []sheet{}}
		if !a.isAuthenticated(r) {
			ctx := withInitialState(r.Context(), is)
			homeHandler(w, r.WithContext(ctx))
			return
		}
		id, err := idFromSession(r)
		if err != nil {
			log.Errorf("expected to find session in cookie: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		is.Email = id
		ctx := withInitialState(r.Context(), is)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
	return http.HandlerFunc(fn)
}

// initialStateWithSheets adds Google Sheet data to the request context
// and calls the next handler.
func (a *API) initialStateWithSheets(next http.Handler) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		is, err := initialStateFromContext(r.Context())
		if err != nil {
			log.Errorf("failed to get initial state from context: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		sid, err := sheetFromSession(r)
		if err != nil {
			if r.URL.Path != "/sheets" {
				http.Redirect(w, r, "/sheets", http.StatusFound)
			}
			fl, err := a.clients[is.Email].drive.Files.List().Context(r.Context()).Q(sheetsQuery).Do()
			if err != nil {
				log.Errorf("failed to list sheets: %v", err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			for _, f := range fl.Files {
				is.Sheets = append(is.Sheets, sheet{ID: f.Id, Name: f.Name})
			}
		} else {
			// The client already has selected a sheet.
			// Ensure the server state matches.
			is.SheetID = sid
			a.sheets[is.Email] = sid
		}
		ctx := withInitialState(r.Context(), is)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
	return http.HandlerFunc(fn)
}

// initialStateWithClient adds information about a client to the request context
// and calls the next handler.
func (a *API) initialStateWithClient(next http.Handler) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		is, err := initialStateFromContext(r.Context())
		if err != nil {
			log.Errorf("failed to get initial state from context: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		id := mux.Vars(r)["id"]
		if id != strings.ToLower(id) {
			http.Redirect(w, r, strings.ToLower(r.URL.Path), http.StatusFound)
			return
		}
		if id != "" {
			u, _, _, err := findUser(is.SheetID, id, bsIDColumn, a.clients[is.Email])
			if err != nil {
				is.ClientError = err.Error()
			} else {
				is.Client = *u
			}
		} else {
			is.ClientError = fmt.Sprintf("%q is not a valid ID", id)
		}
		ctx := withInitialState(r.Context(), is)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
	return http.HandlerFunc(fn)
}

// requireLogin redirects unauthenticated users to the login route.
func (a *API) requireLogin(next http.Handler) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		if !a.isAuthenticated(r) {
			if r.Method == "POST" {
				http.Error(w, "", http.StatusUnauthorized)
				return
			}
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}
		next.ServeHTTP(w, r)
	}
	return http.HandlerFunc(fn)
}

// isAuthenticated returns true if the user has a signed session cookie.
func (a *API) isAuthenticated(r *http.Request) bool {
	if id, err := idFromSession(r); err == nil {
		if _, ok := a.clients[id]; ok {
			return true
		}
	}
	return false
}

func (a *API) watchRFID() {
	var r string
	var ok bool
	scan := a.rfid.Scan()
	for {
		select {
		case <-a.done:
			return
		case r, ok = <-scan:
			if !ok {
				log.Info("Reached the end of RFID scanner input")
				return
			}
			if a.handleRFID != nil {
				a.handleRFID(r)
			}
		}
	}
}

func writeJSON(data interface{}) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(data)
	}
	return http.HandlerFunc(fn)
}

func writeJSONError(err error, status int) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		w.Header().Set("Content-Type", "application/json")
		data := struct {
			Error string `json:"error"`
		}{err.Error()}
		json.NewEncoder(w).Encode(data)
	}
	return http.HandlerFunc(fn)
}

func errorToJSON(err error) []byte {
	data := struct {
		Error string `json:"error"`
	}{err.Error()}
	j, err := json.Marshal(data)
	if err != nil {
		return []byte(`{"error": "error"}`)
	}
	return []byte(j)
}

func idFromSession(r *http.Request) (string, error) {
	s, err := sessionStore.Get(r, sessionName)
	if err != nil {
		return "", fmt.Errorf("failed to find ID in session store: %v", err)
	}
	id, ok := s.Values[sessionIDKey].(string)
	if !ok || id == "" {
		return "", errors.New("failed to find ID in session store")
	}
	return id, err
}

func sheetFromSession(r *http.Request) (string, error) {
	s, err := sessionStore.Get(r, sessionName)
	if err != nil {
		return "", fmt.Errorf("failed to find sheet ID in session store: %v", err)
	}
	sid, ok := s.Values[sessionSheetKey].(string)
	if !ok || sid == "" {
		return "", errors.New("failed to find sheet ID in session store")
	}
	return sid, err
}
