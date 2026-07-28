//! Ergonomic helpers for the streaming directory-export protocol.
//!
//! The `ExportDirectory` RPC streams a directory-format export
//! (manifest + schema + per-table data files) as a sequence of frames. Each
//! file is sent as a `FileBegin` -> `FileChunk`* -> `FileEnd` run so that
//! neither peer ever buffers a whole file: the file's byte count and SHA-256
//! are carried in the `FileEnd` trailer, computed incrementally as the chunks
//! are produced. The manifest is streamed as the final file (`manifest.json`),
//! so no frame grows with the number of files. The stream is bracketed by a
//! `Begin` frame and terminated by either an `End` frame (success) or an
//! `Error` frame.

use bytes::Bytes;

use crate::proto::rpc::v1::{
    ExportDirectoryBegin, ExportDirectoryEnd, ExportDirectoryResponse, FileBegin, FileChunk,
    FileEnd, export_directory_response::Frame,
};
use crate::proto::v1::SurrealError;

/// The default size, in bytes, of a [`FileChunk`]'s payload (256 KiB).
///
/// Producers should split each file into chunks no larger than this by
/// default; consumers should be able to handle any chunk up to
/// [`MAX_FILE_CHUNK_SIZE`].
pub const DEFAULT_FILE_CHUNK_SIZE: usize = 256 * 1024;

/// The maximum size, in bytes, a [`FileChunk`]'s payload may carry (1 MiB).
///
/// Bounded so a single chunk fits comfortably within every transport binding's
/// message-size limit (gRPC's 4 MiB default, the WebSocket 128 MiB cap) while
/// guaranteeing neither peer has to buffer a whole file.
pub const MAX_FILE_CHUNK_SIZE: usize = 1024 * 1024;

impl ExportDirectoryResponse {
    /// Wraps the opening [`ExportDirectoryBegin`] frame of the stream.
    pub fn begin(begin: ExportDirectoryBegin) -> Self {
        Self {
            frame: Some(Frame::Begin(begin)),
        }
    }

    /// Wraps a [`FileBegin`] frame announcing a new file.
    pub fn file_begin(file_begin: FileBegin) -> Self {
        Self {
            frame: Some(Frame::FileBegin(file_begin)),
        }
    }

    /// Builds a [`FileChunk`] frame carrying `data` for the file `file_id`.
    pub fn file_chunk(file_id: u64, data: Bytes) -> Self {
        Self {
            frame: Some(Frame::FileChunk(FileChunk { file_id, data })),
        }
    }

    /// Builds a [`FileEnd`] trailer frame carrying the file's total `bytes` and
    /// `sha256` (lowercase hex).
    pub fn file_end(file_id: u64, bytes: u64, sha256: String) -> Self {
        Self {
            frame: Some(Frame::FileEnd(FileEnd {
                file_id,
                bytes,
                sha256,
            })),
        }
    }

    /// Builds the completion [`ExportDirectoryEnd`] frame carrying the stream
    /// totals.
    pub fn end(file_count: u64, total_bytes: u64) -> Self {
        Self {
            frame: Some(Frame::End(ExportDirectoryEnd {
                file_count,
                total_bytes,
            })),
        }
    }

    /// Builds a terminal error frame.
    pub fn error(error: SurrealError) -> Self {
        Self {
            frame: Some(Frame::Error(error)),
        }
    }
}

#[cfg(test)]
mod tests {
    use prost::Message;

    use super::*;
    use crate::proto::rpc::v1::{ExportCompression, FileBegin};
    use crate::proto::v1::ErrorKind;

    #[test]
    fn frame_constructors() {
        assert!(matches!(
            ExportDirectoryResponse::begin(ExportDirectoryBegin::default()).frame,
            Some(Frame::Begin(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::file_begin(FileBegin::default()).frame,
            Some(Frame::FileBegin(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::file_chunk(1, Bytes::from_static(b"x")).frame,
            Some(Frame::FileChunk(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::file_end(1, 10, "abc".to_string()).frame,
            Some(Frame::FileEnd(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::end(0, 0).frame,
            Some(Frame::End(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::error(SurrealError::new(ErrorKind::Internal, "boom")).frame,
            Some(Frame::Error(_))
        ));
    }

    /// Every frame variant must survive a prost encode/decode round-trip, and
    /// the `FileEnd` trailer must preserve the file's size and hash exactly.
    #[test]
    fn frame_round_trip() {
        let frames = vec![
            ExportDirectoryResponse::begin(ExportDirectoryBegin {
                format_version: "1".to_string(),
                namespace: "ns".to_string(),
                database: "db".to_string(),
                surrealdb_version: "3.0.0".to_string(),
                compression: ExportCompression::Zstd as i32,
            }),
            ExportDirectoryResponse::file_begin(FileBegin {
                file_id: 42,
                relative_path: "data/users/0001.surql.zst".to_string(),
                table: "users".to_string(),
                compression: ExportCompression::Zstd as i32,
            }),
            ExportDirectoryResponse::file_chunk(42, Bytes::from_static(b"chunk-bytes")),
            ExportDirectoryResponse::file_end(42, 4096, "deadbeef".to_string()),
            ExportDirectoryResponse::end(3, 4096),
            ExportDirectoryResponse::error(SurrealError::new(ErrorKind::Internal, "boom")),
        ];

        for frame in frames {
            let bytes = frame.encode_to_vec();
            let decoded = ExportDirectoryResponse::decode(bytes.as_slice()).unwrap();
            assert_eq!(frame, decoded);
        }
    }

    #[test]
    fn file_end_trailer_preserves_size_and_hash() {
        let frame = ExportDirectoryResponse::file_end(9, 1_234_567, "abc123".to_string());
        let decoded = ExportDirectoryResponse::decode(frame.encode_to_vec().as_slice()).unwrap();
        match decoded.frame {
            Some(Frame::FileEnd(end)) => {
                assert_eq!(end.file_id, 9);
                assert_eq!(end.bytes, 1_234_567);
                assert_eq!(end.sha256, "abc123");
            }
            other => panic!("expected FileEnd, got {other:?}"),
        }
    }
}
