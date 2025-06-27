# Makefile
#
# This Makefile is used to build the SurrealDB Protocol.
#
# It is used to generate the Rust and TypeScript code from the SurrealDB Protocol.

SCHEMA_SRCS := $(shell find surrealdb -type f)

################################################################################
# Plugins
################################################################################

build:
	mkdir -p build

plugins:
	mkdir -p plugins

# Rust
plugins/protoc-gen-prost: plugins
	rm -f $@
	cargo install protoc-gen-prost
	hash -r
	cp $(shell bash -c "which protoc-gen-prost") $@
	chmod +x $@

plugins/protoc-gen-tonic: plugins
	rm -f $@
	cargo install protoc-gen-tonic
	hash -r
	cp $(shell bash -c "which protoc-gen-tonic") $@
	chmod +x $@

# C
plugins/protoc-gen-c: plugins
	rm -f $@
	brew install protobuf-c
	hash -r
	cp $(shell bash -c "which protoc-gen-c") $@
	chmod +x $@

# Typescript
plugins/protoc-gen-ts_proto: plugins
	rm -f $@
	bun install ts-proto
	ln -s $(shell pwd)/node_modules/.bin/protoc-gen-ts_proto $(shell pwd)/$@
	chmod +x $@


ALL_PLUGINS := plugins/protoc-gen-prost plugins/protoc-gen-tonic plugins/protoc-gen-c plugins/protoc-gen-ts_proto

################################################################################
# Code Generation
################################################################################

gen: buf.yaml buf.gen.yaml $(SCHEMA_SRCS) $(ALL_PLUGINS)
	buf generate


################################################################################
# Rust
################################################################################
RUST_SRCS := $(shell find rust/src -type f -name "*.rs")
ALL_RUST_SRCS := $(SCHEMA_SRCS) $(RUST_SRCS)


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


