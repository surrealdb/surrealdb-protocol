# Makefile
#
# This Makefile is used to build the SurrealDB Protocol.
#
# It is used to generate the Rust and TypeScript code from the SurrealDB Protocol.

PROTO_SCHEMA_SRCS := $(shell find surrealdb -type f -name "*.proto")
FB_SCHEMA_SRCS := $(shell find surrealdb -type f -name "*.fbs")

################################################################################
# Plugins
################################################################################
#
# Every code generator is pinned. Generated code is checked in and CI asserts
# that `make gen` reproduces it byte for byte, so an unpinned generator shows up
# as a spurious diff on an unrelated PR.

PROTOC_GEN_PROST_VERSION := 0.5.0
PROTOC_GEN_TONIC_VERSION := 0.5.0
TS_PROTO_VERSION         := 2.11.5
FLATC_VERSION            := 25.12.19

build:
	mkdir -p build

plugins:
	mkdir -p plugins

# Rust
plugins/protoc-gen-prost: | plugins
	rm -f $@
	cargo install --locked --version $(PROTOC_GEN_PROST_VERSION) protoc-gen-prost
	hash -r
	cp $(shell bash -c "which protoc-gen-prost") $@
	chmod +x $@

plugins/protoc-gen-tonic: | plugins
	rm -f $@
	cargo install --locked --version $(PROTOC_GEN_TONIC_VERSION) protoc-gen-tonic
	hash -r
	cp $(shell bash -c "which protoc-gen-tonic") $@
	chmod +x $@

# C
plugins/protoc-gen-c: | plugins
	rm -f $@
	brew install protobuf-c
	hash -r
	cp $(shell bash -c "which protoc-gen-c") $@
	chmod +x $@

# Typescript
plugins/protoc-gen-ts_proto: | plugins
	rm -f $@
	bun install ts-proto@$(TS_PROTO_VERSION)
	ln -s $(shell pwd)/node_modules/.bin/protoc-gen-ts_proto $(shell pwd)/$@
	chmod +x $@

# Flatbuffers
# Resolved inside the recipe, not by $(shell): make expands every recipe line
# before running the first, so a $(shell which flatc) would evaluate before the
# install below had a chance to provide it.
FLATC := plugins/flatc
$(FLATC): | plugins
	@set -e; \
	  if [ "$$(uname)" = "Darwin" ]; then \
	    brew install flatbuffers; \
	    src="$$(command -v flatc)"; \
	  else \
	    tmp="$$(mktemp -d)"; \
	    curl -fsSL -o "$$tmp/flatc.zip" \
	      "https://github.com/google/flatbuffers/releases/download/v$(FLATC_VERSION)/Linux.flatc.binary.g++-13.zip"; \
	    unzip -q -o "$$tmp/flatc.zip" -d "$$tmp"; \
	    src="$$tmp/flatc"; \
	    chmod +x "$$src"; \
	  fi; \
	  installed="$$("$$src" --version | sed 's/.*version //')"; \
	  if [ "$$installed" != "$(FLATC_VERSION)" ]; then \
	    echo "flatc $$installed found, expected $(FLATC_VERSION);"; \
	    echo "generated flatbuffers code is version-sensitive and CI diffs it."; \
	    exit 1; \
	  fi; \
	  cp "$$src" $@; \
	  chmod +x $@

ALL_PLUGINS := plugins/protoc-gen-prost plugins/protoc-gen-tonic plugins/protoc-gen-c plugins/protoc-gen-ts_proto

################################################################################
# Code Generation
################################################################################

# The pinned protoc-gen-prost emits `tag="1"` while the checked-in code uses
# `tag = "1"`. Normalising here (rather than by hand after each run) is what
# lets CI diff `gen/` against the committed output. Idempotent: a no-op on
# already-spaced input.
RUST_PROTO_GEN := \
	gen/rust/proto/surrealdb/protocol/rpc/v1/surrealdb.protocol.rpc.v1.rs \
	gen/rust/proto/surrealdb/protocol/v1/surrealdb.protocol.v1.rs

proto-gen: buf.yaml buf.gen.yaml $(PROTO_SCHEMA_SRCS) $(ALL_PLUGINS)
	buf generate
	perl -pi -e 'if (/#\[prost\(/) { s/="/ = "/g }' $(RUST_PROTO_GEN)

proto-check: buf.yaml buf.gen.yaml $(PROTO_SCHEMA_SRCS) $(ALL_PLUGINS)
	buf lint

# The generated output CI diffs.
#
# gen/c is excluded: protoc-gen-c has no pinnable release channel matching the
# macOS build maintainers use locally, so diffing it fails on formatting noise
# rather than real drift. Pin it and add it here when that changes.
GEN_CHECK_PATHS := gen/rust gen/ts

# Fails when the checked-in generated code no longer matches the schemas.
.PHONY: gen-check
gen-check: gen
	@git diff --exit-code -- $(GEN_CHECK_PATHS) \
	  || { echo "Generated code is stale. Run 'make gen' and commit the result."; exit 1; }

# Fails when value.proto and value.fbs have drifted apart.
.PHONY: parity-check
parity-check:
	bun run scripts/parity.ts

# flatc --rust-module-root-file overwrites mod.rs per input file. root.fbs
# includes all other schemas, so its mod.rs has every type. We pass all
# schemas for individual file generation, with root.fbs last so its
# complete mod.rs is the one that survives.
FB_ROOT_SCHEMA := surrealdb/protocol/v1/root.fbs
FB_DEP_SCHEMAS := $(filter-out $(FB_ROOT_SCHEMA),$(FB_SCHEMA_SRCS))

gen/rust/fb: $(FB_SCHEMA_SRCS) $(FLATC)
    # Remove existing files.
	rm -rf gen/rust/fb
	mkdir -p gen/rust/fb
	$(FLATC) --rust --rust-module-root-file -I $(PWD) -o $@ $(FB_DEP_SCHEMAS) $(FB_ROOT_SCHEMA)

.PHONY: fb-gen
fb-gen: gen/rust/fb

# A FileDescriptorSet is the machine-readable form of the schema, consumed by
# the proto<->flatbuffers parity check.
#
# Build artefact, not checked in: it is derived from the .proto files that sit
# beside it, and committing ~200 KiB that churns on every schema edit buys
# nothing. Regenerate with `make descriptor-gen`.
build/descriptor.json: buf.yaml $(PROTO_SCHEMA_SRCS) | build
	buf build -o $@

.PHONY: descriptor-gen
descriptor-gen: build/descriptor.json

gen: proto-gen fb-gen

################################################################################
# Rust
################################################################################
RUST_SRCS := $(shell find rust -type f -name "*.rs")
RUST_GEN_SRCS := $(shell find gen/rust -type f -name "*.rs")
ALL_RUST_SRCS := $(RUST_SRCS) $(RUST_GEN_SRCS)


rust-build: $(ALL_RUST_SRCS)
	cargo build --workspace

rust-test: $(ALL_RUST_SRCS)
	cargo test --workspace

rust-fmt: $(ALL_RUST_SRCS)
	cargo fmt --all

rust-clippy: $(ALL_RUST_SRCS)
	cargo clippy --all-targets --all-features -- -D warnings

rust-package: $(ALL_RUST_SRCS)
	cargo package --workspace -p surrealdb-protocol

rust-publish: $(ALL_RUST_SRCS)
	cargo publish --workspace


