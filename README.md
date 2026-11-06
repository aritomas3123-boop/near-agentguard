# AgentGuard: on-chain approval and budget guard for NEAR agents

**NEAR Hackathon candidate** in the AI Security & Defense track. This is a working **testnet proof of concept**, NOT a wallet, payment app, escrow service, or audited mainnet product.

## Public demonstration

- [Live demonstration with read-only on-chain verification](https://near-agentguard-contract-proof.onrender.com/)
- [Current contract data (JSON, public)](https://near-agentguard-contract-proof.onrender.com/api/onchain)
- [Download the actual deployed WASM](https://near-agentguard-contract-proof.onrender.com/contract.wasm)
- [On-chain transaction record](ONCHAIN-PROOF.md)
- [Build and testing evidence](BUILD-VERIFICATION.md)
- [Security limitations](SECURITY.md)

The contract `agentguard-audit-20261106.testnet` accepts proposals with an allowlisted recipient, a maximum 2 NEAR per proposal and 10 NEAR per agent per UTC day, and distinct nonces. A different account, `agentguard-review-20261106.testnet`, must approve proposals. Replay and self-approval attempts were rejected **by NEAR testnet**.

## Real recorded transaction flow

1. Agent proposal (1.25 test NEAR) recorded on-chain.
2. Agent tries to approve its own proposal; blockchain rejects it.
3. Authorized reviewer approves; blockchain records `approved: true`.
4. Agent repeats nonce; blockchain rejects the replay.

The live Render page verifies this on-chain state independently through JSON-RPC. The Docker build executes `cargo test --all-targets` (**20 passed, 0 failed**) and builds a WASM file whose SHA-256 matches the deployed contract byte-for-byte.

## Compile locally

Install Rust stable and the WebAssembly target, then:

```bash
cargo test --all-targets
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
```

Render deploys the public read-only evidence UI automatically from this repository. GitHub Actions is not enabled because the current GitHub OAuth integration lacks the workflow permission; Docker build tests are the verified CI gate.

**Limits:** no real assets, no fund transfer function, no third-party human identity proof, no production wallet controls, no completed independent security audit. It is not yet submitted to the contest.
