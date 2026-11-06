# Build the Rust contract and execute unit tests on Render's remote builder.
# The resulting service only READS NEAR Testnet; it never holds keys or sends transactions.
FROM rust:1.99-bookworm AS compile
WORKDIR /src
COPY Cargo.toml ./
COPY src ./src
RUN rustup target add wasm32-unknown-unknown
RUN cargo test --all-targets
RUN cargo build --release --target wasm32-unknown-unknown
RUN test -s target/wasm32-unknown-unknown/release/agentguard_near.wasm && \
    sha256sum target/wasm32-unknown-unknown/release/agentguard_near.wasm > /src/contract.sha256

FROM node:22-alpine
WORKDIR /app
COPY web/server.js ./server.js
COPY web/index.html ./index.html
COPY web/app.js ./app.js
COPY web/agent-core.js ./agent-core.js
COPY web/agent-ai.js ./agent-ai.js
COPY web/agent-ui.js ./agent-ui.js
COPY web/agent-core.test.js ./agent-core.test.js
RUN node --test agent-core.test.js
COPY --from=compile /src/target/wasm32-unknown-unknown/release/agentguard_near.wasm ./agentguard_near.wasm
COPY --from=compile /src/contract.sha256 ./contract.sha256
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000
USER node
CMD ["node", "server.js"]
