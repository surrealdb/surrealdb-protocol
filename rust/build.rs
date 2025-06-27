//! Build script for compiling Protobuf files into Rust code.

fn main() {
    let files = glob::glob("../surrealdb/**/*.proto").expect("Failed to glob files");
    let files = files.map(|f| f.unwrap()).collect::<Vec<_>>();

    if files.is_empty() {
        panic!("No files found in schema directory");
    }

    let result = prost_build::Config::new()
        .btree_map(["."])
        .bytes(["."])
        .enable_type_names()
        .type_name_domain(["surrealdb.protocol"], "surrealdb.protocol")
        .compile_protos(&files, &["../"]);

    if let Err(e) = result {
        println!("Error compiling protos:\n{}", e);
        std::process::exit(1);
    }

    println!("Compiled {} files", files.len());
}
