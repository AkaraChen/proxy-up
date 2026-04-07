PLANO_VERSION   ?= 0.4.17
ENVOY_VERSION   ?= v1.37.0
PLATFORM_SLUG   ?= darwin-arm64

PLANO_BASE_URL  := https://github.com/katanemo/plano/releases/download
ENVOY_BASE_URL  := https://github.com/tetratelabs/archive-envoy/releases/download

ENVOY_ASSET     := assets/envoy/$(PLATFORM_SLUG)/envoy
BRIGHTSTAFF_ASSET := assets/brightstaff/$(PLATFORM_SLUG)/brightstaff
WASM_ASSET      := assets/wasm/llm_gateway.wasm

WEBSITE_DIR     := apps/website
DIST_DIR        := $(WEBSITE_DIR)/dist
WEB_ASSET_DIR   := assets/web

BINARY          := proxy-up

.PHONY: all fetch-assets build-frontend build clean FORCE
.DELETE_ON_ERROR:

all: fetch-assets build-frontend build

## Download Envoy, Brightstaff, and llm_gateway.wasm into assets/
fetch-assets: $(ENVOY_ASSET) $(BRIGHTSTAFF_ASSET) $(WASM_ASSET)

FORCE:

$(ENVOY_ASSET): FORCE
	@if [ -s "$@" ]; then \
	  echo "Using existing Envoy $(ENVOY_VERSION) at $@"; \
	else \
	  mkdir -p $(dir $@) && \
	  echo "Downloading Envoy $(ENVOY_VERSION) for $(PLATFORM_SLUG)..." && \
	  rm -f "$@" "$@.tmp" "$@.tar.xz.tmp" && \
	  TMPDIR=$$(mktemp -d) && \
	  curl -fsSL "$(ENVOY_BASE_URL)/$(ENVOY_VERSION)/envoy-$(ENVOY_VERSION)-$(PLATFORM_SLUG).tar.xz" \
	    -o "$$TMPDIR/envoy.tar.xz" && \
	  tar -xf "$$TMPDIR/envoy.tar.xz" -C "$$TMPDIR" && \
	  ENVOY_BIN=$$(find "$$TMPDIR" -type f -name envoy -path "*/bin/*" | head -1) && \
	  test -n "$$ENVOY_BIN" && \
	  cp "$$ENVOY_BIN" "$@.tmp" && \
	  test -s "$@.tmp" && \
	  chmod 755 "$@.tmp" && \
	  mv "$@.tmp" "$@" && \
	  rm -rf "$$TMPDIR" && \
	  echo "  -> $@"; \
	fi

$(BRIGHTSTAFF_ASSET): FORCE
	@if [ -s "$@" ]; then \
	  echo "Using existing Brightstaff $(PLANO_VERSION) at $@"; \
	else \
	  mkdir -p $(dir $@) && \
	  echo "Downloading Brightstaff $(PLANO_VERSION) for $(PLATFORM_SLUG)..." && \
	  rm -f "$@" "$@.tmp" "$@.gz.tmp" && \
	  curl -fsSL "$(PLANO_BASE_URL)/$(PLANO_VERSION)/brightstaff-$(PLATFORM_SLUG).gz" \
	    -o "$@.gz.tmp" && \
	  gzip -dc "$@.gz.tmp" > "$@.tmp" && \
	  test -s "$@.tmp" && \
	  chmod 755 "$@.tmp" && \
	  mv "$@.tmp" "$@" && \
	  rm -f "$@.gz.tmp" && \
	  echo "  -> $@"; \
	fi

$(WASM_ASSET): FORCE
	@if [ -s "$@" ]; then \
	  echo "Using existing llm_gateway.wasm $(PLANO_VERSION) at $@"; \
	else \
	  mkdir -p $(dir $@) && \
	  echo "Downloading llm_gateway.wasm $(PLANO_VERSION)..." && \
	  rm -f "$@" "$@.tmp" "$@.gz.tmp" && \
	  curl -fsSL "$(PLANO_BASE_URL)/$(PLANO_VERSION)/llm_gateway.wasm.gz" \
	    -o "$@.gz.tmp" && \
	  gzip -dc "$@.gz.tmp" > "$@.tmp" && \
	  test -s "$@.tmp" && \
	  mv "$@.tmp" "$@" && \
	  rm -f "$@.gz.tmp" && \
	  echo "  -> $@"; \
	fi

## Build the React frontend and copy to assets/web/
build-frontend:
	@echo "Building frontend..."
	@cd $(WEBSITE_DIR) && vp build
	@rm -rf $(WEB_ASSET_DIR)
	@mkdir -p $(WEB_ASSET_DIR)
	@cp -r $(DIST_DIR)/. $(WEB_ASSET_DIR)/
	@echo "  -> $(WEB_ASSET_DIR)"

## Build the Go binary
build: fetch-assets
	@echo "Building $(BINARY)..."
	@go build -o $(BINARY) ./cmd/proxy-up
	@echo "  -> ./$(BINARY)"

## Remove downloaded assets and built artifacts
clean:
	@rm -f $(ENVOY_ASSET) $(ENVOY_ASSET).tmp $(ENVOY_ASSET).tar.xz.tmp
	@rm -f $(BRIGHTSTAFF_ASSET) $(BRIGHTSTAFF_ASSET).tmp $(BRIGHTSTAFF_ASSET).gz.tmp
	@rm -f $(WASM_ASSET) $(WASM_ASSET).tmp $(WASM_ASSET).gz.tmp
	@rm -rf $(WEB_ASSET_DIR)
	@rm -f $(BINARY)
