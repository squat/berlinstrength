package websocket

import (
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	log "github.com/sirupsen/logrus"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second
	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second
	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10
	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// wsClient is a middleman between the websocket connection and the hub.
type wsClient struct {
	hub *Hub
	// The websocket connection.
	conn *websocket.Conn
	// Buffered channel of outbound messages.
	send chan []byte
	// Topics that the client follows
	topics []string
}

// readPump pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (w *wsClient) readPump() {
	defer func() {
		w.hub.unregister <- w
		w.conn.Close()
	}()
	w.conn.SetReadLimit(maxMessageSize)
	w.conn.SetReadDeadline(time.Now().Add(pongWait))
	w.conn.SetPongHandler(func(string) error { w.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, _, err := w.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Warnf("unexpected websocket close: %v", err)
			}
			break
		}
	}
}

// writePump pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (w *wsClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		w.conn.Close()
	}()
	for {
		select {
		case message, ok := <-w.send:
			w.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				w.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := w.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Warnf("failed to write data message to websocket: %v", err)
				return
			}
		case <-ticker.C:
			w.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := w.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Warnf("failed to write ping message to websocket: %v", err)
				return
			}
		}
	}
}

func (w *wsClient) follows(topic string) bool {
	for _, t := range w.topics {
		if t == topic {
			return true
		}
	}
	return false
}

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Inbound messages to send to the clients.
	Raw chan Message
	// Signal when to stop the hub.
	done <-chan struct{}
	// Register requests from the ws clients.
	register chan *wsClient
	// Unregister requests from ws clients.
	unregister chan *wsClient
	// Registered ws clients.
	ws map[*wsClient]struct{}
}

// NewHub returns a new websocket hub.
func NewHub(done <-chan struct{}) *Hub {
	h := &Hub{
		Raw:        make(chan Message),
		done:       done,
		register:   make(chan *wsClient),
		unregister: make(chan *wsClient),
		ws:         make(map[*wsClient]struct{}),
	}
	go h.run()
	return h
}

// ServeHTTP handles websocket requests from the peer.
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Warnf("failed to upgrade websocket: %v", err)
		return
	}
	// If an error is returned, then we may have a nil or empty slice, but that's fine; it just means the client will not follow any topics.
	topics, _ := TopicsFromContext(r.Context())
	wsc := &wsClient{hub: h, conn: conn, send: make(chan []byte), topics: topics}
	h.register <- wsc

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go wsc.writePump()
	go wsc.readPump()
}

func (h *Hub) run() {
	defer func() {
		for w := range h.ws {
			delete(h.ws, w)
			close(w.send)
		}
		close(h.register)
		close(h.unregister)
		close(h.Raw)
	}()
	for {
		select {
		case <-h.done:
			return
		case w := <-h.register:
			h.ws[w] = struct{}{}
		case w := <-h.unregister:
			if _, ok := h.ws[w]; ok {
				delete(h.ws, w)
				close(w.send)
			}
		case m := <-h.Raw:
			for w := range h.ws {
				go func(w *wsClient) {
					if m.Topic != "" && !w.follows(m.Topic) {
						return
					}
					select {
					case w.send <- m.Data:
					default:
						delete(h.ws, w)
						close(w.send)
					}
				}(w)
			}
		}
	}
}

// Broadcast sends a message to all clients.
func (h *Hub) Broadcast(data []byte) {
	h.Send(data, "")
}

// Send sends a message to the clients listening to a particular topic.
func (h *Hub) Send(data []byte, topic string) {
	h.Raw <- Message{data, topic}
}

// Message representa a message that can be sent to websocket clients.
// If the topic is not empty, then the message will only be sent to clients
// that follow the given topic.
type Message struct {
	// Data is the payload actually sent to the clients.
	Data []byte
	// Topic used to filter which clients to send the message to.
	Topic string
}
