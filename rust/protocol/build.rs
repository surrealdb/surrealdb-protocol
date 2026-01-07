//! Build script for the surrealdb-protocol crate.
//!
//! This build script sets up the `CARGO_WORKSPACE_DIR` environment variable
//! that is used by the `lib.rs` include! macros to locate the generated
//! protocol files in the `gen/` directory at the workspace root.

fn main() {
    // Set CARGO_WORKSPACE_DIR for use in the lib.rs include! macros
    // This points to the workspace root where the gen/ directory is located
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is not set");

    // The protocol crate is at rust/protocol, so workspace root is 2 levels up
    let workspace_dir = std::path::Path::new(&manifest_dir)
        .parent() // rust/
        .and_then(|p| p.parent()) // workspace root
        .expect("Failed to determine workspace root");

    println!(
        "cargo:rustc-env=CARGO_WORKSPACE_DIR={}/",
        workspace_dir.display()
    );
}
