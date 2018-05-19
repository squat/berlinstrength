package websocket

import (
	"context"
	"fmt"
)

type key int

const (
	topicsKey key = iota
	errorKey
)

// ErrContextMissing is returned when a context is missing a certain value.
type ErrContextMissing struct {
	// Value is the value that is missing from the context.
	Value string
}

// Error implements the error interface.
func (e *ErrContextMissing) Error() string {
	return fmt.Sprintf("context missing %s", e.Value)
}

// WithTopics returns a copy of the given context with the topics stored.
func WithTopics(ctx context.Context, topics []string) context.Context {
	return context.WithValue(ctx, topicsKey, topics)
}

// TopicsFromContext returns the topics from the given context or an error.
func TopicsFromContext(ctx context.Context) ([]string, error) {
	topics, ok := ctx.Value(topicsKey).([]string)
	if !ok {
		return nil, &ErrContextMissing{"topics"}
	}
	return topics, nil
}

// WithError returns a copy of the given context with the error stored.
func WithError(ctx context.Context, err error) context.Context {
	return context.WithValue(ctx, errorKey, err)
}

// ErrorFromContext returns the error from the given context or an error.
func ErrorFromContext(ctx context.Context) error {
	err, ok := ctx.Value(errorKey).(error)
	if !ok {
		return &ErrContextMissing{"error"}
	}
	return err
}
