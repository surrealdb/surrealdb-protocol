//! Size bounds for the byte-stream RPCs.
//!
//! `ImportSurql`, `ExportSurql`, `ImportMlModel` and `ExportMlModel` carry
//! opaque bytes split into [`DataChunk`] frames rather than parsed statements,
//! so neither peer ever buffers a whole stream. These are the chunk sizes
//! `common.proto` specifies for those frames.
//!
//! The names keep their `FILE_` prefix from the directory export they were
//! introduced for, so that the server and SDK crates which size their message
//! limits from them keep compiling.
//!
//! [`DataChunk`]: crate::proto::rpc::v1::DataChunk

/// The default size, in bytes, of a [`DataChunk`]'s payload (256 KiB).
///
/// Producers should split a stream into chunks no larger than this by
/// default; consumers should be able to handle any chunk up to
/// [`MAX_FILE_CHUNK_SIZE`].
///
/// [`DataChunk`]: crate::proto::rpc::v1::DataChunk
pub const DEFAULT_FILE_CHUNK_SIZE: usize = 256 * 1024;

/// The maximum size, in bytes, a [`DataChunk`]'s payload may carry (1 MiB).
///
/// Bounded so a single chunk fits comfortably within every transport binding's
/// message-size limit (gRPC's 4 MiB default, the WebSocket 128 MiB cap).
///
/// [`DataChunk`]: crate::proto::rpc::v1::DataChunk
pub const MAX_FILE_CHUNK_SIZE: usize = 1024 * 1024;
