

SCHEMA_SRCS := $(shell find schema -type f)

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
	cargo package --workspace

rust-publish: $(ALL_RUST_SRCS)
	cargo publish --workspace
