// @generated
/// Generated client implementations.
pub mod surreal_db_service_client {
    #![allow(
        unused_variables,
        dead_code,
        missing_docs,
        clippy::wildcard_imports,
        clippy::let_unit_value,
    )]
    use tonic::codegen::*;
    use tonic::codegen::http::Uri;
    #[derive(Debug, Clone)]
    pub struct SurrealDbServiceClient<T> {
        inner: tonic::client::Grpc<T>,
    }
    impl SurrealDbServiceClient<tonic::transport::Channel> {
        /// Attempt to create a new client by connecting to a given endpoint.
        pub async fn connect<D>(dst: D) -> Result<Self, tonic::transport::Error>
        where
            D: TryInto<tonic::transport::Endpoint>,
            D::Error: Into<StdError>,
        {
            let conn = tonic::transport::Endpoint::new(dst)?.connect().await?;
            Ok(Self::new(conn))
        }
    }
    impl<T> SurrealDbServiceClient<T>
    where
        T: tonic::client::GrpcService<tonic::body::Body>,
        T::Error: Into<StdError>,
        T::ResponseBody: Body<Data = Bytes> + std::marker::Send + 'static,
        <T::ResponseBody as Body>::Error: Into<StdError> + std::marker::Send,
    {
        pub fn new(inner: T) -> Self {
            let inner = tonic::client::Grpc::new(inner);
            Self { inner }
        }
        pub fn with_origin(inner: T, origin: Uri) -> Self {
            let inner = tonic::client::Grpc::with_origin(inner, origin);
            Self { inner }
        }
        pub fn with_interceptor<F>(
            inner: T,
            interceptor: F,
        ) -> SurrealDbServiceClient<InterceptedService<T, F>>
        where
            F: tonic::service::Interceptor,
            T::ResponseBody: Default,
            T: tonic::codegen::Service<
                http::Request<tonic::body::Body>,
                Response = http::Response<
                    <T as tonic::client::GrpcService<tonic::body::Body>>::ResponseBody,
                >,
            >,
            <T as tonic::codegen::Service<
                http::Request<tonic::body::Body>,
            >>::Error: Into<StdError> + std::marker::Send + std::marker::Sync,
        {
            SurrealDbServiceClient::new(InterceptedService::new(inner, interceptor))
        }
        /// Compress requests with the given encoding.
        ///
        /// This requires the server to support it otherwise it might respond with an
        /// error.
        #[must_use]
        pub fn send_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.inner = self.inner.send_compressed(encoding);
            self
        }
        /// Enable decompressing responses.
        #[must_use]
        pub fn accept_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.inner = self.inner.accept_compressed(encoding);
            self
        }
        /// Limits the maximum size of a decoded message.
        ///
        /// Default: `4MB`
        #[must_use]
        pub fn max_decoding_message_size(mut self, limit: usize) -> Self {
            self.inner = self.inner.max_decoding_message_size(limit);
            self
        }
        /// Limits the maximum size of an encoded message.
        ///
        /// Default: `usize::MAX`
        #[must_use]
        pub fn max_encoding_message_size(mut self, limit: usize) -> Self {
            self.inner = self.inner.max_encoding_message_size(limit);
            self
        }
        pub async fn get_capabilities(
            &mut self,
            request: impl tonic::IntoRequest<super::GetCapabilitiesRequest>,
        ) -> std::result::Result<
            tonic::Response<super::GetCapabilitiesResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/GetCapabilities",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "GetCapabilities",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn health(
            &mut self,
            request: impl tonic::IntoRequest<super::HealthRequest>,
        ) -> std::result::Result<tonic::Response<super::HealthResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Health",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Health",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn attach_session(
            &mut self,
            request: impl tonic::IntoRequest<super::AttachSessionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::AttachSessionResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/AttachSession",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "AttachSession",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn detach_session(
            &mut self,
            request: impl tonic::IntoRequest<super::DetachSessionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::DetachSessionResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/DetachSession",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "DetachSession",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn reset_session(
            &mut self,
            request: impl tonic::IntoRequest<super::ResetSessionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::ResetSessionResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ResetSession",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "ResetSession",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn r#use(
            &mut self,
            request: impl tonic::IntoRequest<super::UseRequest>,
        ) -> std::result::Result<tonic::Response<super::UseResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Use",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new("surrealdb.protocol.rpc.v1.SurrealDBService", "Use"),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn set_variable(
            &mut self,
            request: impl tonic::IntoRequest<super::SetVariableRequest>,
        ) -> std::result::Result<
            tonic::Response<super::SetVariableResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/SetVariable",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "SetVariable",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn unset_variable(
            &mut self,
            request: impl tonic::IntoRequest<super::UnsetVariableRequest>,
        ) -> std::result::Result<
            tonic::Response<super::UnsetVariableResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/UnsetVariable",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "UnsetVariable",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn signup(
            &mut self,
            request: impl tonic::IntoRequest<super::SignupRequest>,
        ) -> std::result::Result<tonic::Response<super::SignupResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Signup",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Signup",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn signin(
            &mut self,
            request: impl tonic::IntoRequest<super::SigninRequest>,
        ) -> std::result::Result<tonic::Response<super::SigninResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Signin",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Signin",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn authenticate(
            &mut self,
            request: impl tonic::IntoRequest<super::AuthenticateRequest>,
        ) -> std::result::Result<
            tonic::Response<super::AuthenticateResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Authenticate",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Authenticate",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn refresh_tokens(
            &mut self,
            request: impl tonic::IntoRequest<super::RefreshTokensRequest>,
        ) -> std::result::Result<
            tonic::Response<super::RefreshTokensResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/RefreshTokens",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "RefreshTokens",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn revoke_tokens(
            &mut self,
            request: impl tonic::IntoRequest<super::RevokeTokensRequest>,
        ) -> std::result::Result<
            tonic::Response<super::RevokeTokensResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/RevokeTokens",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "RevokeTokens",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn invalidate(
            &mut self,
            request: impl tonic::IntoRequest<super::InvalidateRequest>,
        ) -> std::result::Result<
            tonic::Response<super::InvalidateResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Invalidate",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Invalidate",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn begin_transaction(
            &mut self,
            request: impl tonic::IntoRequest<super::BeginTransactionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::BeginTransactionResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/BeginTransaction",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "BeginTransaction",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn commit_transaction(
            &mut self,
            request: impl tonic::IntoRequest<super::CommitTransactionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::CommitTransactionResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/CommitTransaction",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "CommitTransaction",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn cancel_transaction(
            &mut self,
            request: impl tonic::IntoRequest<super::CancelTransactionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::CancelTransactionResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/CancelTransaction",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "CancelTransaction",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn query(
            &mut self,
            request: impl tonic::IntoRequest<super::QueryRequest>,
        ) -> std::result::Result<
            tonic::Response<tonic::codec::Streaming<super::QueryResponse>>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Query",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Query",
                    ),
                );
            self.inner.server_streaming(req, path, codec).await
        }
        pub async fn run(
            &mut self,
            request: impl tonic::IntoRequest<super::RunRequest>,
        ) -> std::result::Result<tonic::Response<super::RunResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Run",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new("surrealdb.protocol.rpc.v1.SurrealDBService", "Run"),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn kill(
            &mut self,
            request: impl tonic::IntoRequest<super::KillRequest>,
        ) -> std::result::Result<tonic::Response<super::KillResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Kill",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new("surrealdb.protocol.rpc.v1.SurrealDBService", "Kill"),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn subscribe(
            &mut self,
            request: impl tonic::IntoRequest<super::SubscribeRequest>,
        ) -> std::result::Result<
            tonic::Response<tonic::codec::Streaming<super::SubscribeResponse>>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Subscribe",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Subscribe",
                    ),
                );
            self.inner.server_streaming(req, path, codec).await
        }
        pub async fn import_surql(
            &mut self,
            request: impl tonic::IntoStreamingRequest<
                Message = super::ImportSurqlRequest,
            >,
        ) -> std::result::Result<
            tonic::Response<super::ImportSurqlResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ImportSurql",
            );
            let mut req = request.into_streaming_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "ImportSurql",
                    ),
                );
            self.inner.client_streaming(req, path, codec).await
        }
        pub async fn export_surql(
            &mut self,
            request: impl tonic::IntoRequest<super::ExportSurqlRequest>,
        ) -> std::result::Result<
            tonic::Response<tonic::codec::Streaming<super::ExportSurqlResponse>>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ExportSurql",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "ExportSurql",
                    ),
                );
            self.inner.server_streaming(req, path, codec).await
        }
        pub async fn export_directory(
            &mut self,
            request: impl tonic::IntoRequest<super::ExportDirectoryRequest>,
        ) -> std::result::Result<
            tonic::Response<tonic::codec::Streaming<super::ExportDirectoryResponse>>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ExportDirectory",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "ExportDirectory",
                    ),
                );
            self.inner.server_streaming(req, path, codec).await
        }
        pub async fn export_ml_model(
            &mut self,
            request: impl tonic::IntoRequest<super::ExportMlModelRequest>,
        ) -> std::result::Result<
            tonic::Response<tonic::codec::Streaming<super::ExportMlModelResponse>>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ExportMlModel",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "ExportMlModel",
                    ),
                );
            self.inner.server_streaming(req, path, codec).await
        }
        pub async fn import_ml_model(
            &mut self,
            request: impl tonic::IntoStreamingRequest<
                Message = super::ImportMlModelRequest,
            >,
        ) -> std::result::Result<
            tonic::Response<super::ImportMlModelResponse>,
            tonic::Status,
        > {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic_prost::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ImportMlModel",
            );
            let mut req = request.into_streaming_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "ImportMlModel",
                    ),
                );
            self.inner.client_streaming(req, path, codec).await
        }
    }
}
/// Generated server implementations.
pub mod surreal_db_service_server {
    #![allow(
        unused_variables,
        dead_code,
        missing_docs,
        clippy::wildcard_imports,
        clippy::let_unit_value,
    )]
    use tonic::codegen::*;
    /// Generated trait containing gRPC methods that should be implemented for use with SurrealDbServiceServer.
    #[async_trait]
    pub trait SurrealDbService: std::marker::Send + std::marker::Sync + 'static {
        async fn get_capabilities(
            &self,
            request: tonic::Request<super::GetCapabilitiesRequest>,
        ) -> std::result::Result<
            tonic::Response<super::GetCapabilitiesResponse>,
            tonic::Status,
        >;
        async fn health(
            &self,
            request: tonic::Request<super::HealthRequest>,
        ) -> std::result::Result<tonic::Response<super::HealthResponse>, tonic::Status>;
        async fn attach_session(
            &self,
            request: tonic::Request<super::AttachSessionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::AttachSessionResponse>,
            tonic::Status,
        >;
        async fn detach_session(
            &self,
            request: tonic::Request<super::DetachSessionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::DetachSessionResponse>,
            tonic::Status,
        >;
        async fn reset_session(
            &self,
            request: tonic::Request<super::ResetSessionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::ResetSessionResponse>,
            tonic::Status,
        >;
        async fn r#use(
            &self,
            request: tonic::Request<super::UseRequest>,
        ) -> std::result::Result<tonic::Response<super::UseResponse>, tonic::Status>;
        async fn set_variable(
            &self,
            request: tonic::Request<super::SetVariableRequest>,
        ) -> std::result::Result<
            tonic::Response<super::SetVariableResponse>,
            tonic::Status,
        >;
        async fn unset_variable(
            &self,
            request: tonic::Request<super::UnsetVariableRequest>,
        ) -> std::result::Result<
            tonic::Response<super::UnsetVariableResponse>,
            tonic::Status,
        >;
        async fn signup(
            &self,
            request: tonic::Request<super::SignupRequest>,
        ) -> std::result::Result<tonic::Response<super::SignupResponse>, tonic::Status>;
        async fn signin(
            &self,
            request: tonic::Request<super::SigninRequest>,
        ) -> std::result::Result<tonic::Response<super::SigninResponse>, tonic::Status>;
        async fn authenticate(
            &self,
            request: tonic::Request<super::AuthenticateRequest>,
        ) -> std::result::Result<
            tonic::Response<super::AuthenticateResponse>,
            tonic::Status,
        >;
        async fn refresh_tokens(
            &self,
            request: tonic::Request<super::RefreshTokensRequest>,
        ) -> std::result::Result<
            tonic::Response<super::RefreshTokensResponse>,
            tonic::Status,
        >;
        async fn revoke_tokens(
            &self,
            request: tonic::Request<super::RevokeTokensRequest>,
        ) -> std::result::Result<
            tonic::Response<super::RevokeTokensResponse>,
            tonic::Status,
        >;
        async fn invalidate(
            &self,
            request: tonic::Request<super::InvalidateRequest>,
        ) -> std::result::Result<
            tonic::Response<super::InvalidateResponse>,
            tonic::Status,
        >;
        async fn begin_transaction(
            &self,
            request: tonic::Request<super::BeginTransactionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::BeginTransactionResponse>,
            tonic::Status,
        >;
        async fn commit_transaction(
            &self,
            request: tonic::Request<super::CommitTransactionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::CommitTransactionResponse>,
            tonic::Status,
        >;
        async fn cancel_transaction(
            &self,
            request: tonic::Request<super::CancelTransactionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::CancelTransactionResponse>,
            tonic::Status,
        >;
        /// Server streaming response type for the Query method.
        type QueryStream: tonic::codegen::tokio_stream::Stream<
                Item = std::result::Result<super::QueryResponse, tonic::Status>,
            >
            + std::marker::Send
            + 'static;
        async fn query(
            &self,
            request: tonic::Request<super::QueryRequest>,
        ) -> std::result::Result<tonic::Response<Self::QueryStream>, tonic::Status>;
        async fn run(
            &self,
            request: tonic::Request<super::RunRequest>,
        ) -> std::result::Result<tonic::Response<super::RunResponse>, tonic::Status>;
        async fn kill(
            &self,
            request: tonic::Request<super::KillRequest>,
        ) -> std::result::Result<tonic::Response<super::KillResponse>, tonic::Status>;
        /// Server streaming response type for the Subscribe method.
        type SubscribeStream: tonic::codegen::tokio_stream::Stream<
                Item = std::result::Result<super::SubscribeResponse, tonic::Status>,
            >
            + std::marker::Send
            + 'static;
        async fn subscribe(
            &self,
            request: tonic::Request<super::SubscribeRequest>,
        ) -> std::result::Result<tonic::Response<Self::SubscribeStream>, tonic::Status>;
        async fn import_surql(
            &self,
            request: tonic::Request<tonic::Streaming<super::ImportSurqlRequest>>,
        ) -> std::result::Result<
            tonic::Response<super::ImportSurqlResponse>,
            tonic::Status,
        >;
        /// Server streaming response type for the ExportSurql method.
        type ExportSurqlStream: tonic::codegen::tokio_stream::Stream<
                Item = std::result::Result<super::ExportSurqlResponse, tonic::Status>,
            >
            + std::marker::Send
            + 'static;
        async fn export_surql(
            &self,
            request: tonic::Request<super::ExportSurqlRequest>,
        ) -> std::result::Result<
            tonic::Response<Self::ExportSurqlStream>,
            tonic::Status,
        >;
        /// Server streaming response type for the ExportDirectory method.
        type ExportDirectoryStream: tonic::codegen::tokio_stream::Stream<
                Item = std::result::Result<super::ExportDirectoryResponse, tonic::Status>,
            >
            + std::marker::Send
            + 'static;
        async fn export_directory(
            &self,
            request: tonic::Request<super::ExportDirectoryRequest>,
        ) -> std::result::Result<
            tonic::Response<Self::ExportDirectoryStream>,
            tonic::Status,
        >;
        /// Server streaming response type for the ExportMlModel method.
        type ExportMlModelStream: tonic::codegen::tokio_stream::Stream<
                Item = std::result::Result<super::ExportMlModelResponse, tonic::Status>,
            >
            + std::marker::Send
            + 'static;
        async fn export_ml_model(
            &self,
            request: tonic::Request<super::ExportMlModelRequest>,
        ) -> std::result::Result<
            tonic::Response<Self::ExportMlModelStream>,
            tonic::Status,
        >;
        async fn import_ml_model(
            &self,
            request: tonic::Request<tonic::Streaming<super::ImportMlModelRequest>>,
        ) -> std::result::Result<
            tonic::Response<super::ImportMlModelResponse>,
            tonic::Status,
        >;
    }
    #[derive(Debug)]
    pub struct SurrealDbServiceServer<T> {
        inner: Arc<T>,
        accept_compression_encodings: EnabledCompressionEncodings,
        send_compression_encodings: EnabledCompressionEncodings,
        max_decoding_message_size: Option<usize>,
        max_encoding_message_size: Option<usize>,
    }
    impl<T> SurrealDbServiceServer<T> {
        pub fn new(inner: T) -> Self {
            Self::from_arc(Arc::new(inner))
        }
        pub fn from_arc(inner: Arc<T>) -> Self {
            Self {
                inner,
                accept_compression_encodings: Default::default(),
                send_compression_encodings: Default::default(),
                max_decoding_message_size: None,
                max_encoding_message_size: None,
            }
        }
        pub fn with_interceptor<F>(
            inner: T,
            interceptor: F,
        ) -> InterceptedService<Self, F>
        where
            F: tonic::service::Interceptor,
        {
            InterceptedService::new(Self::new(inner), interceptor)
        }
        /// Enable decompressing requests with the given encoding.
        #[must_use]
        pub fn accept_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.accept_compression_encodings.enable(encoding);
            self
        }
        /// Compress responses with the given encoding, if the client supports it.
        #[must_use]
        pub fn send_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.send_compression_encodings.enable(encoding);
            self
        }
        /// Limits the maximum size of a decoded message.
        ///
        /// Default: `4MB`
        #[must_use]
        pub fn max_decoding_message_size(mut self, limit: usize) -> Self {
            self.max_decoding_message_size = Some(limit);
            self
        }
        /// Limits the maximum size of an encoded message.
        ///
        /// Default: `usize::MAX`
        #[must_use]
        pub fn max_encoding_message_size(mut self, limit: usize) -> Self {
            self.max_encoding_message_size = Some(limit);
            self
        }
    }
    impl<T, B> tonic::codegen::Service<http::Request<B>> for SurrealDbServiceServer<T>
    where
        T: SurrealDbService,
        B: Body + std::marker::Send + 'static,
        B::Error: Into<StdError> + std::marker::Send + 'static,
    {
        type Response = http::Response<tonic::body::Body>;
        type Error = std::convert::Infallible;
        type Future = BoxFuture<Self::Response, Self::Error>;
        fn poll_ready(
            &mut self,
            _cx: &mut Context<'_>,
        ) -> Poll<std::result::Result<(), Self::Error>> {
            Poll::Ready(Ok(()))
        }
        fn call(&mut self, req: http::Request<B>) -> Self::Future {
            match req.uri().path() {
                "/surrealdb.protocol.rpc.v1.SurrealDBService/GetCapabilities" => {
                    #[allow(non_camel_case_types)]
                    struct GetCapabilitiesSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::GetCapabilitiesRequest>
                    for GetCapabilitiesSvc<T> {
                        type Response = super::GetCapabilitiesResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::GetCapabilitiesRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::get_capabilities(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = GetCapabilitiesSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Health" => {
                    #[allow(non_camel_case_types)]
                    struct HealthSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::HealthRequest>
                    for HealthSvc<T> {
                        type Response = super::HealthResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::HealthRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::health(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = HealthSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/AttachSession" => {
                    #[allow(non_camel_case_types)]
                    struct AttachSessionSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::AttachSessionRequest>
                    for AttachSessionSvc<T> {
                        type Response = super::AttachSessionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::AttachSessionRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::attach_session(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = AttachSessionSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/DetachSession" => {
                    #[allow(non_camel_case_types)]
                    struct DetachSessionSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::DetachSessionRequest>
                    for DetachSessionSvc<T> {
                        type Response = super::DetachSessionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::DetachSessionRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::detach_session(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = DetachSessionSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ResetSession" => {
                    #[allow(non_camel_case_types)]
                    struct ResetSessionSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::ResetSessionRequest>
                    for ResetSessionSvc<T> {
                        type Response = super::ResetSessionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::ResetSessionRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::reset_session(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = ResetSessionSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Use" => {
                    #[allow(non_camel_case_types)]
                    struct UseSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::UseRequest> for UseSvc<T> {
                        type Response = super::UseResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::UseRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::r#use(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = UseSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/SetVariable" => {
                    #[allow(non_camel_case_types)]
                    struct SetVariableSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::SetVariableRequest>
                    for SetVariableSvc<T> {
                        type Response = super::SetVariableResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::SetVariableRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::set_variable(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = SetVariableSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/UnsetVariable" => {
                    #[allow(non_camel_case_types)]
                    struct UnsetVariableSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::UnsetVariableRequest>
                    for UnsetVariableSvc<T> {
                        type Response = super::UnsetVariableResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::UnsetVariableRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::unset_variable(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = UnsetVariableSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Signup" => {
                    #[allow(non_camel_case_types)]
                    struct SignupSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::SignupRequest>
                    for SignupSvc<T> {
                        type Response = super::SignupResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::SignupRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::signup(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = SignupSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Signin" => {
                    #[allow(non_camel_case_types)]
                    struct SigninSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::SigninRequest>
                    for SigninSvc<T> {
                        type Response = super::SigninResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::SigninRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::signin(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = SigninSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Authenticate" => {
                    #[allow(non_camel_case_types)]
                    struct AuthenticateSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::AuthenticateRequest>
                    for AuthenticateSvc<T> {
                        type Response = super::AuthenticateResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::AuthenticateRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::authenticate(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = AuthenticateSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/RefreshTokens" => {
                    #[allow(non_camel_case_types)]
                    struct RefreshTokensSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::RefreshTokensRequest>
                    for RefreshTokensSvc<T> {
                        type Response = super::RefreshTokensResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::RefreshTokensRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::refresh_tokens(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = RefreshTokensSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/RevokeTokens" => {
                    #[allow(non_camel_case_types)]
                    struct RevokeTokensSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::RevokeTokensRequest>
                    for RevokeTokensSvc<T> {
                        type Response = super::RevokeTokensResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::RevokeTokensRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::revoke_tokens(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = RevokeTokensSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Invalidate" => {
                    #[allow(non_camel_case_types)]
                    struct InvalidateSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::InvalidateRequest>
                    for InvalidateSvc<T> {
                        type Response = super::InvalidateResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::InvalidateRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::invalidate(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = InvalidateSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/BeginTransaction" => {
                    #[allow(non_camel_case_types)]
                    struct BeginTransactionSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::BeginTransactionRequest>
                    for BeginTransactionSvc<T> {
                        type Response = super::BeginTransactionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::BeginTransactionRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::begin_transaction(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = BeginTransactionSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/CommitTransaction" => {
                    #[allow(non_camel_case_types)]
                    struct CommitTransactionSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::CommitTransactionRequest>
                    for CommitTransactionSvc<T> {
                        type Response = super::CommitTransactionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::CommitTransactionRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::commit_transaction(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = CommitTransactionSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/CancelTransaction" => {
                    #[allow(non_camel_case_types)]
                    struct CancelTransactionSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::CancelTransactionRequest>
                    for CancelTransactionSvc<T> {
                        type Response = super::CancelTransactionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::CancelTransactionRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::cancel_transaction(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = CancelTransactionSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Query" => {
                    #[allow(non_camel_case_types)]
                    struct QuerySvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::ServerStreamingService<super::QueryRequest>
                    for QuerySvc<T> {
                        type Response = super::QueryResponse;
                        type ResponseStream = T::QueryStream;
                        type Future = BoxFuture<
                            tonic::Response<Self::ResponseStream>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::QueryRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::query(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = QuerySvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.server_streaming(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Run" => {
                    #[allow(non_camel_case_types)]
                    struct RunSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::RunRequest> for RunSvc<T> {
                        type Response = super::RunResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::RunRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::run(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = RunSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Kill" => {
                    #[allow(non_camel_case_types)]
                    struct KillSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::KillRequest> for KillSvc<T> {
                        type Response = super::KillResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::KillRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::kill(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = KillSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Subscribe" => {
                    #[allow(non_camel_case_types)]
                    struct SubscribeSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::ServerStreamingService<super::SubscribeRequest>
                    for SubscribeSvc<T> {
                        type Response = super::SubscribeResponse;
                        type ResponseStream = T::SubscribeStream;
                        type Future = BoxFuture<
                            tonic::Response<Self::ResponseStream>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::SubscribeRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::subscribe(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = SubscribeSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.server_streaming(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ImportSurql" => {
                    #[allow(non_camel_case_types)]
                    struct ImportSurqlSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::ClientStreamingService<super::ImportSurqlRequest>
                    for ImportSurqlSvc<T> {
                        type Response = super::ImportSurqlResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                tonic::Streaming<super::ImportSurqlRequest>,
                            >,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::import_surql(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = ImportSurqlSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.client_streaming(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ExportSurql" => {
                    #[allow(non_camel_case_types)]
                    struct ExportSurqlSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::ServerStreamingService<super::ExportSurqlRequest>
                    for ExportSurqlSvc<T> {
                        type Response = super::ExportSurqlResponse;
                        type ResponseStream = T::ExportSurqlStream;
                        type Future = BoxFuture<
                            tonic::Response<Self::ResponseStream>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::ExportSurqlRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::export_surql(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = ExportSurqlSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.server_streaming(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ExportDirectory" => {
                    #[allow(non_camel_case_types)]
                    struct ExportDirectorySvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::ServerStreamingService<
                        super::ExportDirectoryRequest,
                    > for ExportDirectorySvc<T> {
                        type Response = super::ExportDirectoryResponse;
                        type ResponseStream = T::ExportDirectoryStream;
                        type Future = BoxFuture<
                            tonic::Response<Self::ResponseStream>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::ExportDirectoryRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::export_directory(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = ExportDirectorySvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.server_streaming(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ExportMlModel" => {
                    #[allow(non_camel_case_types)]
                    struct ExportMlModelSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::ServerStreamingService<super::ExportMlModelRequest>
                    for ExportMlModelSvc<T> {
                        type Response = super::ExportMlModelResponse;
                        type ResponseStream = T::ExportMlModelStream;
                        type Future = BoxFuture<
                            tonic::Response<Self::ResponseStream>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::ExportMlModelRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::export_ml_model(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = ExportMlModelSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.server_streaming(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/surrealdb.protocol.rpc.v1.SurrealDBService/ImportMlModel" => {
                    #[allow(non_camel_case_types)]
                    struct ImportMlModelSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::ClientStreamingService<super::ImportMlModelRequest>
                    for ImportMlModelSvc<T> {
                        type Response = super::ImportMlModelResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<
                                tonic::Streaming<super::ImportMlModelRequest>,
                            >,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::import_ml_model(&inner, request)
                                    .await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = ImportMlModelSvc(inner);
                        let codec = tonic_prost::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.client_streaming(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                _ => {
                    Box::pin(async move {
                        let mut response = http::Response::new(
                            tonic::body::Body::default(),
                        );
                        let headers = response.headers_mut();
                        headers
                            .insert(
                                tonic::Status::GRPC_STATUS,
                                (tonic::Code::Unimplemented as i32).into(),
                            );
                        headers
                            .insert(
                                http::header::CONTENT_TYPE,
                                tonic::metadata::GRPC_CONTENT_TYPE,
                            );
                        Ok(response)
                    })
                }
            }
        }
    }
    impl<T> Clone for SurrealDbServiceServer<T> {
        fn clone(&self) -> Self {
            let inner = self.inner.clone();
            Self {
                inner,
                accept_compression_encodings: self.accept_compression_encodings,
                send_compression_encodings: self.send_compression_encodings,
                max_decoding_message_size: self.max_decoding_message_size,
                max_encoding_message_size: self.max_encoding_message_size,
            }
        }
    }
    /// Generated gRPC service name
    pub const SERVICE_NAME: &str = "surrealdb.protocol.rpc.v1.SurrealDBService";
    impl<T> tonic::server::NamedService for SurrealDbServiceServer<T> {
        const NAME: &'static str = SERVICE_NAME;
    }
}
