package api

import (
	"context"
	"fmt"
)

type key int

const (
	initialStateKey key = iota
)

// errContextMissing is returned when a context is missing a certain value.
type errContextMissing struct {
	// Value is the value that is missing from the context.
	Value string
}

// Error implements the error interface.
func (e *errContextMissing) Error() string {
	return fmt.Sprintf("context missing %s", e.Value)
}

// withInitialState returns a copy of the given context with the initial state stored.
func withInitialState(ctx context.Context, is *initialState) context.Context {
	return context.WithValue(ctx, initialStateKey, is)
}

// initialStateFromContext returns the initial state from the given context or an error.
func initialStateFromContext(ctx context.Context) (*initialState, error) {
	is, ok := ctx.Value(initialStateKey).(*initialState)
	if !ok {
		return nil, &errContextMissing{"initial state"}
	}
	return is, nil
}
