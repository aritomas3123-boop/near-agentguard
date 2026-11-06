## Safe agent workflow (new)

The public Render demonstration includes an **agent proposal analyzer** at
https://near-agentguard-contract-proof.onrender.com/#agent.

It executes a read-only tool chain:

1. Check the deployed NEAR testnet contract code hash and reviewer.
2. Read the on-chain reserved budget for the fixed demo agent (current UTC day).
3. Check whether the specific request nonce is already present in the on-chain proposal registry.
4. Apply a deterministic per-action limit (2 NEAR), per-day limit (10 NEAR), and recipient allowlist.
5. Optionally call Google Gemini for **advisory risk commentary**.
6. Output a draft of a transaction for human review; never sign, broadcast, transfer, or access wallet keys.

**Critical:** AI commentary is enabled only with a server-side `GEMINI_API_KEY` environment
variable configured on the Render service. If it is not configured, the page clearly reports
`NOT_CONFIGURED`, and the deterministic contract-policy checks still work. No AI inference is
claimed in this condition. The model, if configured, cannot alter a blocked policy outcome.

Optional model name can be configured via `GEMINI_MODEL`. The API key must **never** be
committed to GitHub, sent in browser JavaScript, or placed in a URL.

```bash
node --test web/agent-core.test.js
```

The Docker image runs these 16 Node tests as well as the 20 Rust contract tests on every build.

Production security is **not** established. There is no transfer function, no custody, and
no on-chain transaction signed by this public service. The demo uses a fixed public testnet
agent account, and the unsigned draft requires a separate operator and user approval.