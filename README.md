# NEAR AgentGuard — Smart-contract candidate

AI Security & Defense hackathon prototype for NEAR Testnet.

**Current status:** source code for review and automated build; **not deployed on-chain**. It does not custody, send or transfer tokens.

## Contract policy
- Each account may request a reservation for an allowlisted recipient.
- Maximum single reservation: 2,000 milliNEAR (2 NEAR).
- Maximum per-account UTC-day cumulative reservation: 10,000 milliNEAR (10 NEAR).
- Requests must include a 6–64-character unique nonce; reusing a nonce is rejected.
- Only the initialized owner/reviewer may mark a proposal approved.
- Approval changes state; **it does not transfer funds**.
- The contract can only be initialized by the contract account itself.

## Build / test
Rust stable + wasm32-unknown-unknown:

```bash
cargo test --all-targets
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
```

GitHub Actions runs both test and build steps automatically on each push. **A workflow file is not proof that a test has passed**: inspect its most recent job result before making any reliability claims.

## Deployment
Only deploy to **NEAR testnet**, after tests pass and an account owner approves the deployment transaction. No seed phrases or private keys belong in the repository, chat or CI logs.

The project does **not** implement on-chain transfer constraints, restricted account access keys, real wallet signing, or human identity verification yet. It must not be marketed as a production-grade custody solution.

## Related frontend
Early policy sandbox: https://near-agentguard.hatchable.site (private, requires authorized sign-in).
The hosted web sandbox and this contract are separate until their integration is implemented and validated.

## Competition
Before submission: actual testnet deployment and transaction hash; authentic screen recording; public repository with reproducible tests, threat model, and documented limitations; eligibility and deadline confirmation.

**No submission has been made for this project.**

## Verified remote build
Render Docker build passed 20/20 Rust tests and created a WebAssembly artifact. See [BUILD-VERIFICATION.md](BUILD-VERIFICATION.md) and the [live read-only proof](https://near-agentguard-contract-proof.onrender.com/). This is **not deployed on NEAR**.

