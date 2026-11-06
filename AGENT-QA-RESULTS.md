# AgentGuard — Public agent integration QA (2026-11-06)

**Deployment:** https://near-agentguard-contract-proof.onrender.com/  
**Git revision:** `5778ceb72bcd60d3afdccc95844fc2dac0edf4d7`  
**Design:** Read-only planning tool. Never signs, approves, broadcasts or transfers.

## Confirmed results

| Scenario | Actual public API result |
| --- | --- |
| Allowed: 0.5 test NEAR, `storage.near`, new nonce | `ELIGIBLE_FOR_HUMAN_REVIEW`; unsigned draft; existing on-chain reservation read as 1.25 NEAR |
| Recipient `unlisted.near` | `BLOCKED`; allowlist check failed |
| 2.5 test NEAR proposal | `BLOCKED`; per-action limit check failed |
| Existing nonce `case-a10001` | `BLOCKED`; on-chain nonce replay check failed |
| AI status | `NOT_CONFIGURED`, server-side `GEMINI_API_KEY` missing |
| Side effects | All responses `signed:false`, `transferred:false` |
| Local Node agent tests | **16 passed, 0 failed** |
| Rust contract tests on Render | **20 passed, 0 failed** |

All public requests were made against the actual Render URL, with real NEAR testnet RPC reads.

## The honest AI distinction

The proposal analyzer is deployed, and its deterministic policy engine is connected to the live deployed NEAR contract. **Gemini is not yet connected.** Without a configured API key, no generative inference occurs. The UI and the JSON response make this explicit.

To activate real AI commentary, add `GEMINI_API_KEY` to the Render service environment securely via its dashboard. Never paste the key into GitHub, README, screenshots, logs or this public site. Additional credits and costs may apply. If Gemini is activated, it remains *advisory only* and cannot alter `BLOCKED` decisions or sign a transaction.

## Remaining gates

- Gemini inference verified from a public test request, if the hackathon requires a live LLM.
- End-to-end browser test, threat model and adversarial cases.
- Record a real, readable demo, publish the required X post, check official hackathon requirements and submit only after user approval.
- If desired, add a truly permissioned transaction signing flow outside the public read-only service, controlled by the testnet account owner.
