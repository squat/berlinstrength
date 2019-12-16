.PHONY: all push container clean container-name container-latest push-latest local fmt lint test js static statik

ARCH ?= amd64
ALL_ARCH := amd64 arm arm64
BIN := bs
PROJECT := berlinstrength
PKG := github.com/squat/$(PROJECT)
REGISTRY ?= index.docker.io
IMAGE ?= squat/$(PROJECT)-$(ARCH)

PRODUCTION ?= 0
TAG := $(shell git describe --abbrev=0 --tags HEAD 2>/dev/null)
COMMIT := $(shell git rev-parse HEAD)
VERSION := $(COMMIT)
ifneq ($(TAG),)
    ifeq ($(COMMIT), $(shell git rev-list -n1 $(TAG)))
        VERSION := $(TAG)
    endif
endif
DIRTY := $(shell test -z "$$(git diff --shortstat 2>/dev/null)" || echo -dirty)
VERSION := $(VERSION)$(DIRTY)
JS_FLAGS :=
ifeq ($(PRODUCTION), 1)
JS_FLAGS += --mode production
endif
LD_FLAGS := -ldflags '-X $(PKG)/version.Version=$(VERSION)'
SRC := $(shell find . -type f -name '*.go' -not -path "./vendor/*") ./statik/statik.go
GO_FILES ?= $$(find . -name '*.go' -not -path './vendor/*')
GO_PKGS ?= $$(go list ./... | grep -v "$(PKG)/vendor")
JS_SRC := $(shell find ./static \( -iname \*.tsx -o -iname \*.css \) -not -path "./static/dist/*" -not -path "./static/node_modules/*")
JS_TARGETS := $(addprefix ./static/dist/,bundle.js bundle.css)
STATIC_SRC := $(addprefix ./static/,index.html sounds.ogg)
STATIC_TARGETS := $(addprefix ./static/dist/,index.html sounds.ogg)

BUILD_IMAGE ?= golang:1.13.1-alpine

build: bin/$(ARCH)/$(BIN)

build-%:
	@$(MAKE) --no-print-directory ARCH=$* build

container-latest-%:
	@$(MAKE) --no-print-directory ARCH=$* container-latest

container-%:
	@$(MAKE) --no-print-directory ARCH=$* container

push-latest-%:
	@$(MAKE) --no-print-directory ARCH=$* push-latest

push-%:
	@$(MAKE) --no-print-directory ARCH=$* push

all-build: $(addprefix build-, $(ALL_ARCH))

all-container: $(addprefix container-, $(ALL_ARCH))

all-push: $(addprefix push-, $(ALL_ARCH))

all-container-latest: $(addprefix container-latest-, $(ALL_ARCH))

all-push-latest: $(addprefix push-latest-, $(ALL_ARCH))

bin/$(ARCH):
	@mkdir -p $@

bin/$(ARCH)/$(BIN): $(SRC) go.mod bin/$(ARCH)
	@mkdir -p bin/$(ARCH)
	@echo "building: $@"
	@docker run --rm \
	    -u $$(id -u):$$(id -g) \
	    -v $$(pwd):/$(PROJECT) \
	    -w /$(PROJECT) \
	    $(BUILD_IMAGE) \
	    /bin/sh -c " \
	        GOARCH=$(ARCH) \
	        GOOS=linux \
	        GOCACHE=/$(PROJECT)/.cache \
		CGO_ENABLED=0 \
		go build -mod=vendor -o $@ \
		    $(LD_FLAGS) \
		    ./cmd/$(@F)/... \
	    "

js: $(JS_TARGETS)
$(JS_TARGETS): $(JS_SRC) static/node_modules
	yarn --cwd static run build $(JS_FLAGS)

static/node_modules: static/package.json
	yarn --cwd static --frozen-lockfile --ignore-engines install

static: $(STATIC_TARGETS)
$(STATIC_TARGETS): $(STATIC_SRC)
	cp static/index.html static/dist/index.html
	cp static/sounds.ogg static/dist/sounds.ogg

statik: statik/statik.go
statik/statik.go: $(JS_TARGETS) $(STATIC_TARGETS)
	statik -src=./static/dist -f -m

fmt:
	@echo $(GO_PKGS)
	gofmt -w -s $(GO_FILES)

lint:
	@echo 'golint $(GO_PKGS)'
	@lint_res=$$(golint $(GO_PKGS)); if [ -n "$$lint_res" ]; then \
		echo ""; \
		echo "Golint found style issues. Please check the reported issues"; \
		echo "and fix them if necessary before submitting the code for review:"; \
		echo "$$lint_res"; \
		exit 1; \
	fi
	@echo 'gofmt -d -s $(GO_FILES)'
	@fmt_res=$$(gofmt -d -s $(GO_FILES)); if [ -n "$$fmt_res" ]; then \
		echo ""; \
		echo "Gofmt found style issues. Please check the reported issues"; \
		echo "and fix them if necessary before submitting the code for review:"; \
		echo "$$fmt_res"; \
		exit 1; \
	fi
	@echo 'yarn --cwd static run lint'
	@if ! tslint_res=$$(yarn --cwd static run lint); then \
		echo ""; \
		echo "tslint found style issues. Please check the reported issues"; \
		echo "and fix them if necessary before submitting the code for review:"; \
		echo "$$tslint_res"; \
		exit 1; \
	fi

test: lint vet

local: $(SRC) go.mod
	@GOOS=linux \
	    CGO_ENABLED=0 \
	    go build -o bin/$(BIN) \
	    $(LD_FLAGS) \
	    ./cmd/$(BIN)/...

container: .container-$(ARCH)-$(VERSION) container-name
.container-$(ARCH)-$(VERSION): bin/$(ARCH)/$(BIN) Dockerfile
	@docker build -t $(IMAGE):$(VERSION) --build-arg ARCH=$(ARCH) .
	@docker images -q $(IMAGE):$(VERSION) > $@

container-latest: .container-$(ARCH)-$(VERSION)
	@docker tag $(IMAGE):$(VERSION) $(IMAGE):latest
	@echo "container: $(IMAGE):latest"

container-name:
	@echo "container: $(IMAGE):$(VERSION)"

push: .push-$(ARCH)-$(VERSION) push-name
.push-$(ARCH)-$(VERSION): .container-$(ARCH)-$(VERSION)
	@docker push $(REGISTRY)/$(IMAGE):$(VERSION)
	@docker images -q $(IMAGE):$(VERSION) > $@

push-latest: container-latest
	@docker push $(REGISTRY)/$(IMAGE):latest
	@echo "pushed: $(IMAGE):latest"

push-name:
	@echo "pushed: $(IMAGE):$(VERSION)"

clean: container-clean bin-clean static-clean

container-clean:
	rm -rf .container-* .push-*

bin-clean:
	rm -rf bin

static-clean:
	rm -rf static/dist
	rm -rf static/node_modules
	rm -rf statik

vet:
	@echo 'go vet $(GO_PKGS)'
	@go vet $(GO_PKGS); if [ $$? -eq 1 ]; then \
		echo ""; \
		echo "Vet found suspicious constructs. Please check the reported constructs"; \
		echo "and fix them if necessary before submitting the code for review."; \
		exit 1; \
	fi
