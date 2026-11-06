# Build verification — 2026-11-06

**Project:** NEAR AgentGuard Rust contract v0.1.0  
**Git commit:** `ab463465159b484bfb84c19c6f64716635e691d6`  
**Host:** Render Free, isolated service `srv-dbn39gbbc2fs73eaq3k0`.

## Verified evidence
- Render deployment: `dep-dbn39gjbc2fs73eaq4g0` status **live**.
- Rust unit tests executed on Render during Docker build: **20 passed, 0 failed**.
- Cross-compiled `wasm32-unknown-unknown` release artifact with `cargo build --release --target wasm32-unknown-unknown`.
- Remote artifact bytes: **224460**.
- SHA-256: `469c8c15bcb396a096326e81e1439ff9032eba6b1ef16d5df757760aafd881d5`.
- Downloaded artifact again to local Windows environment; SHA-256 matched exactly.
- External `GET /health` and `GET /` both returned **HTTP 200**.
- Runtime endpoint `/health` explicitly reports `onChainDeployed: false` and `transfersEnabled: false`.

## URLs
- Hosted, compiled proof: https://near-agentguard-contract-proof.onrender.com/
- Exact compiled binary: https://near-agentguard-contract-proof.onrender.com/contract.wasm
- Machine-readable build info: https://near-agentguard-contract-proof.onrender.com/health

## Strict limitations
This successful build does **not** establish an onchain NEAR testnet deployment, real custody, wallet enforcement, NEAR transactions or contest eligibility. No private keys or payment credentials are present in the build. The previous Hatchable application is a separate policy sandbox and is **not** yet connected to the compiled contract.

GitHub Actions workflow creation remains blocked by the GitHub OAuth integration's missing `workflow` scope. Render Docker builds run `cargo test --all-targets` on each successful auto-deploy instead. All results above were observed from the Render build and public binary; they were not inferred from static code alone.
