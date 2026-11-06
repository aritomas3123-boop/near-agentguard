# Security / scope

This is an experimental testnet-only smart-contract prototype. Never provide it with real funds.

- **Initialization:** the caller must be the deployed contract account.
- **Identity:** blockchain predecessor accounts identify agents; owner is set during initialization.
- **Replay:** nonces are tracked per account; replays rejected.
- **Limits:** values and daily reservations live in contract state.
- **Approval:** only configured reviewer may mark proposal approved.
- **No transfer function:** a recorded approval does not send NEAR.

Not implemented: cancellation/release of reserved budget, pruning expired records, guaranteed gas/storage bounds, role rotation, restrictive token execution, external code audit, account/payee ownership validation, abuse-resistant UI/backend integration.

All paths should be assumed insecure for production until independently audited.
