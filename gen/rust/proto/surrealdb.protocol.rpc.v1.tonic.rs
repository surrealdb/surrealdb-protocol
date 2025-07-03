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
        T: tonic::client::GrpcService<tonic::body::BoxBody>,
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
                http::Request<tonic::body::BoxBody>,
                Response = http::Response<
                    <T as tonic::client::GrpcService<tonic::body::BoxBody>>::ResponseBody,
                >,
            >,
            <T as tonic::codegen::Service<
                http::Request<tonic::body::BoxBody>,
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
            let codec = tonic::codec::ProstCodec::default();
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
        pub async fn version(
            &mut self,
            request: impl tonic::IntoRequest<super::VersionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::VersionResponse>,
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
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Version",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Version",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn info(
            &mut self,
            request: impl tonic::IntoRequest<super::InfoRequest>,
        ) -> std::result::Result<tonic::Response<super::InfoResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Info",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new("surrealdb.protocol.rpc.v1.SurrealDBService", "Info"),
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
            let codec = tonic::codec::ProstCodec::default();
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
        pub async fn live(
            &mut self,
            request: impl tonic::IntoRequest<super::LiveRequest>,
        ) -> std::result::Result<
            tonic::Response<tonic::codec::Streaming<super::LiveResponse>>,
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
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Live",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new("surrealdb.protocol.rpc.v1.SurrealDBService", "Live"),
                );
            self.inner.server_streaming(req, path, codec).await
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
            let codec = tonic::codec::ProstCodec::default();
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
            let codec = tonic::codec::ProstCodec::default();
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
            let codec = tonic::codec::ProstCodec::default();
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
            let codec = tonic::codec::ProstCodec::default();
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
            let codec = tonic::codec::ProstCodec::default();
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
        pub async fn reset(
            &mut self,
            request: impl tonic::IntoRequest<super::ResetRequest>,
        ) -> std::result::Result<tonic::Response<super::ResetResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Reset",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Reset",
                    ),
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
            let codec = tonic::codec::ProstCodec::default();
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
        pub async fn set(
            &mut self,
            request: impl tonic::IntoRequest<super::SetRequest>,
        ) -> std::result::Result<tonic::Response<super::SetResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Set",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new("surrealdb.protocol.rpc.v1.SurrealDBService", "Set"),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn unset(
            &mut self,
            request: impl tonic::IntoRequest<super::UnsetRequest>,
        ) -> std::result::Result<tonic::Response<super::UnsetResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Unset",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Unset",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn select(
            &mut self,
            request: impl tonic::IntoRequest<super::SelectRequest>,
        ) -> std::result::Result<tonic::Response<super::SelectResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Select",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Select",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn create(
            &mut self,
            request: impl tonic::IntoRequest<super::CreateRequest>,
        ) -> std::result::Result<tonic::Response<super::CreateResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Create",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Create",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn insert(
            &mut self,
            request: impl tonic::IntoRequest<super::InsertRequest>,
        ) -> std::result::Result<tonic::Response<super::InsertResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Insert",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Insert",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn upsert(
            &mut self,
            request: impl tonic::IntoRequest<super::UpsertRequest>,
        ) -> std::result::Result<tonic::Response<super::UpsertResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Upsert",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Upsert",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn update(
            &mut self,
            request: impl tonic::IntoRequest<super::UpdateRequest>,
        ) -> std::result::Result<tonic::Response<super::UpdateResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Update",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Update",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn delete(
            &mut self,
            request: impl tonic::IntoRequest<super::DeleteRequest>,
        ) -> std::result::Result<tonic::Response<super::DeleteResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Delete",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Delete",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn relate(
            &mut self,
            request: impl tonic::IntoRequest<super::RelateRequest>,
        ) -> std::result::Result<tonic::Response<super::RelateResponse>, tonic::Status> {
            self.inner
                .ready()
                .await
                .map_err(|e| {
                    tonic::Status::unknown(
                        format!("Service was not ready: {}", e.into()),
                    )
                })?;
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Relate",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "Relate",
                    ),
                );
            self.inner.unary(req, path, codec).await
        }
        pub async fn run_function(
            &mut self,
            request: impl tonic::IntoRequest<super::RunFunctionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::RunFunctionResponse>,
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
            let codec = tonic::codec::ProstCodec::default();
            let path = http::uri::PathAndQuery::from_static(
                "/surrealdb.protocol.rpc.v1.SurrealDBService/RunFunction",
            );
            let mut req = request.into_request();
            req.extensions_mut()
                .insert(
                    GrpcMethod::new(
                        "surrealdb.protocol.rpc.v1.SurrealDBService",
                        "RunFunction",
                    ),
                );
            self.inner.unary(req, path, codec).await
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
        async fn health(
            &self,
            request: tonic::Request<super::HealthRequest>,
        ) -> std::result::Result<tonic::Response<super::HealthResponse>, tonic::Status>;
        async fn version(
            &self,
            request: tonic::Request<super::VersionRequest>,
        ) -> std::result::Result<tonic::Response<super::VersionResponse>, tonic::Status>;
        async fn info(
            &self,
            request: tonic::Request<super::InfoRequest>,
        ) -> std::result::Result<tonic::Response<super::InfoResponse>, tonic::Status>;
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
        /// Server streaming response type for the Live method.
        type LiveStream: tonic::codegen::tokio_stream::Stream<
                Item = std::result::Result<super::LiveResponse, tonic::Status>,
            >
            + std::marker::Send
            + 'static;
        async fn live(
            &self,
            request: tonic::Request<super::LiveRequest>,
        ) -> std::result::Result<tonic::Response<Self::LiveStream>, tonic::Status>;
        async fn r#use(
            &self,
            request: tonic::Request<super::UseRequest>,
        ) -> std::result::Result<tonic::Response<super::UseResponse>, tonic::Status>;
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
        async fn invalidate(
            &self,
            request: tonic::Request<super::InvalidateRequest>,
        ) -> std::result::Result<
            tonic::Response<super::InvalidateResponse>,
            tonic::Status,
        >;
        async fn reset(
            &self,
            request: tonic::Request<super::ResetRequest>,
        ) -> std::result::Result<tonic::Response<super::ResetResponse>, tonic::Status>;
        async fn kill(
            &self,
            request: tonic::Request<super::KillRequest>,
        ) -> std::result::Result<tonic::Response<super::KillResponse>, tonic::Status>;
        async fn set(
            &self,
            request: tonic::Request<super::SetRequest>,
        ) -> std::result::Result<tonic::Response<super::SetResponse>, tonic::Status>;
        async fn unset(
            &self,
            request: tonic::Request<super::UnsetRequest>,
        ) -> std::result::Result<tonic::Response<super::UnsetResponse>, tonic::Status>;
        async fn select(
            &self,
            request: tonic::Request<super::SelectRequest>,
        ) -> std::result::Result<tonic::Response<super::SelectResponse>, tonic::Status>;
        async fn create(
            &self,
            request: tonic::Request<super::CreateRequest>,
        ) -> std::result::Result<tonic::Response<super::CreateResponse>, tonic::Status>;
        async fn insert(
            &self,
            request: tonic::Request<super::InsertRequest>,
        ) -> std::result::Result<tonic::Response<super::InsertResponse>, tonic::Status>;
        async fn upsert(
            &self,
            request: tonic::Request<super::UpsertRequest>,
        ) -> std::result::Result<tonic::Response<super::UpsertResponse>, tonic::Status>;
        async fn update(
            &self,
            request: tonic::Request<super::UpdateRequest>,
        ) -> std::result::Result<tonic::Response<super::UpdateResponse>, tonic::Status>;
        async fn delete(
            &self,
            request: tonic::Request<super::DeleteRequest>,
        ) -> std::result::Result<tonic::Response<super::DeleteResponse>, tonic::Status>;
        async fn relate(
            &self,
            request: tonic::Request<super::RelateRequest>,
        ) -> std::result::Result<tonic::Response<super::RelateResponse>, tonic::Status>;
        async fn run_function(
            &self,
            request: tonic::Request<super::RunFunctionRequest>,
        ) -> std::result::Result<
            tonic::Response<super::RunFunctionResponse>,
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
        type Response = http::Response<tonic::body::BoxBody>;
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
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Version" => {
                    #[allow(non_camel_case_types)]
                    struct VersionSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::VersionRequest>
                    for VersionSvc<T> {
                        type Response = super::VersionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::VersionRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::version(&inner, request).await
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
                        let method = VersionSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Info" => {
                    #[allow(non_camel_case_types)]
                    struct InfoSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::InfoRequest> for InfoSvc<T> {
                        type Response = super::InfoResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::InfoRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::info(&inner, request).await
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
                        let method = InfoSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Live" => {
                    #[allow(non_camel_case_types)]
                    struct LiveSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::ServerStreamingService<super::LiveRequest>
                    for LiveSvc<T> {
                        type Response = super::LiveResponse;
                        type ResponseStream = T::LiveStream;
                        type Future = BoxFuture<
                            tonic::Response<Self::ResponseStream>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::LiveRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::live(&inner, request).await
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
                        let method = LiveSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                        let codec = tonic::codec::ProstCodec::default();
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
                        let codec = tonic::codec::ProstCodec::default();
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
                        let codec = tonic::codec::ProstCodec::default();
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
                        let codec = tonic::codec::ProstCodec::default();
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
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Reset" => {
                    #[allow(non_camel_case_types)]
                    struct ResetSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::ResetRequest> for ResetSvc<T> {
                        type Response = super::ResetResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::ResetRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::reset(&inner, request).await
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
                        let method = ResetSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Set" => {
                    #[allow(non_camel_case_types)]
                    struct SetSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::SetRequest> for SetSvc<T> {
                        type Response = super::SetResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::SetRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::set(&inner, request).await
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
                        let method = SetSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Unset" => {
                    #[allow(non_camel_case_types)]
                    struct UnsetSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::UnsetRequest> for UnsetSvc<T> {
                        type Response = super::UnsetResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::UnsetRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::unset(&inner, request).await
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
                        let method = UnsetSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Select" => {
                    #[allow(non_camel_case_types)]
                    struct SelectSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::SelectRequest>
                    for SelectSvc<T> {
                        type Response = super::SelectResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::SelectRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::select(&inner, request).await
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
                        let method = SelectSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Create" => {
                    #[allow(non_camel_case_types)]
                    struct CreateSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::CreateRequest>
                    for CreateSvc<T> {
                        type Response = super::CreateResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::CreateRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::create(&inner, request).await
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
                        let method = CreateSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Insert" => {
                    #[allow(non_camel_case_types)]
                    struct InsertSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::InsertRequest>
                    for InsertSvc<T> {
                        type Response = super::InsertResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::InsertRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::insert(&inner, request).await
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
                        let method = InsertSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Upsert" => {
                    #[allow(non_camel_case_types)]
                    struct UpsertSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::UpsertRequest>
                    for UpsertSvc<T> {
                        type Response = super::UpsertResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::UpsertRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::upsert(&inner, request).await
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
                        let method = UpsertSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Update" => {
                    #[allow(non_camel_case_types)]
                    struct UpdateSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::UpdateRequest>
                    for UpdateSvc<T> {
                        type Response = super::UpdateResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::UpdateRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::update(&inner, request).await
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
                        let method = UpdateSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Delete" => {
                    #[allow(non_camel_case_types)]
                    struct DeleteSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::DeleteRequest>
                    for DeleteSvc<T> {
                        type Response = super::DeleteResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::DeleteRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::delete(&inner, request).await
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
                        let method = DeleteSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/Relate" => {
                    #[allow(non_camel_case_types)]
                    struct RelateSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::RelateRequest>
                    for RelateSvc<T> {
                        type Response = super::RelateResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::RelateRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::relate(&inner, request).await
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
                        let method = RelateSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                "/surrealdb.protocol.rpc.v1.SurrealDBService/RunFunction" => {
                    #[allow(non_camel_case_types)]
                    struct RunFunctionSvc<T: SurrealDbService>(pub Arc<T>);
                    impl<
                        T: SurrealDbService,
                    > tonic::server::UnaryService<super::RunFunctionRequest>
                    for RunFunctionSvc<T> {
                        type Response = super::RunFunctionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::RunFunctionRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as SurrealDbService>::run_function(&inner, request).await
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
                        let method = RunFunctionSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
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
                _ => {
                    Box::pin(async move {
                        let mut response = http::Response::new(empty_body());
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
