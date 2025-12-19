# SurrealDB IPC Protocol

This crate contains the SurrealDB Inter-Process Communication (IPC) protocol.

Starting with SurrealDB 3.0, the SurrealDB server exposes a gRPC interface. All
gRPC and protobuf messages are exposed under the `proto` module.

This crate also contains the SurrealDB Flatbuffers protocol which is for
efficient transmission of SurrealDB `Value`s.
