# AgentGuard: verified NEAR testnet transactions (2026-11-06)

Network: **NEAR testnet**. All transaction fees came from free faucet tokens. No mainnet money was used.

- Contract: `agentguard-audit-20261106.testnet`
- Authorized reviewer: `agentguard-review-20261106.testnet`
- Demonstration agent: `agentguard-agent-20261106.testnet`
- Proposal: `agentguard-agent-20261106.testnet:case-a10001`

## Recorded on-chain actions

1. [Contract deployed and initialized](https://explorer.testnet.near.org/transactions/4NPktQj9PdUB97ZNvkwJ2QzuhGNJqnVbRsYAc16staqF).
2. [Agent proposal accepted](https://explorer.testnet.near.org/transactions/EcV85FPVYYDbnbShaLG9vkzNEZ1Dw7vtJyz1gpiSDcbB): nonce `case-a10001`, recipient `api.near.ai`, amount 1250 milliNEAR.
3. [Approval attempted by agent — rejected](https://explorer.testnet.near.org/transactions/GiYHu4XfiJVPzg3wrraVXVZ8wR77BEw4KgPSXCjDSzQH). On-chain execution failed, as designed.
4. [Approval signed by authorized reviewer — succeeded](https://explorer.testnet.near.org/transactions/EyV16Dog1wjRxUGguzdsh6gVrv8cojg1KVuaFXiyehPp).
5. [Original proposal nonce repeated — rejected](https://explorer.testnet.near.org/transactions/DnPxvaLSTxQYm5Q8sAyz1FdyioSwwiY8RjhyNiE4Y9dt).

A finalized blockchain query returned `approved: true` and `get_reserved_milli_near(..., 20763): 1250`.

The compiled WASM is 224460 bytes. Its SHA-256 is `469c8c15bcb396a096326e81e1439ff9032eba6b1ef16d5df757760aafd881d5`. A NEAR `view_code` query returned precisely the same bytes and SHA-256; `view_account` code hash was `5kdzRKEybprMkh7BWg7NoT4v87Bjn6795HaYy4WiBhvt`.

## Independent, read-only live validation

`https://near-agentguard-contract-proof.onrender.com/api/onchain` queries NEAR testnet RPC, checks the account's code hash and reviewer and proposal fields and returns the current approved and reserved state. If independent verification fails, the endpoint returns HTTP 503 rather than pretending success.

The contract **does not transfer funds**. Approval is only a durable on-chain policy state transition. All wallet keys remain on the owner's computer, separate from Render and GitHub.
