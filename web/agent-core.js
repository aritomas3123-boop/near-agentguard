"use strict";

const ALLOWED = Object.freeze(["api.near.ai", "storage.near", "audit.near"]);
const MAX_ACTION_MILLI = 2000;
const MAX_DAILY_MILLI = 10000;
const AGENT_ACCOUNT = "agentguard-agent-20261106.testnet";
const CONTRACT_ACCOUNT = "agentguard-audit-20261106.testnet";

function validateRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("A JSON object is required.");
  const { recipient, amountMilliNear, nonce, purpose } = payload;
  if (typeof recipient !== "string" || recipient.length > 100) throw new Error("Invalid recipient.");
  if (typeof amountMilliNear !== "number" || !Number.isSafeInteger(amountMilliNear) ||
      amountMilliNear <= 0 || amountMilliNear > 100000) throw new Error("Amount must be a positive integer in milliNEAR.");
  if (typeof nonce !== "string" || !/^[a-zA-Z0-9_-]{6,64}$/.test(nonce)) throw new Error("Nonce must be 6–64 letters, digits, underscore or dash.");
  if (typeof purpose !== "string" || purpose.length < 8 || purpose.length > 600) throw new Error("Purpose must be 8–600 characters.");
  if (/[\u0000-\u001f\u007f]/.test(purpose)) throw new Error("Purpose contains control characters.");
  return { recipient, amountMilliNear, nonce, purpose: purpose.trim() };
}

function computePolicy(request, { reservedMilliNear, priorProposal, dayUtc, chainVerified }) {
  if (typeof reservedMilliNear !== "number" || !Number.isSafeInteger(reservedMilliNear) ||
      reservedMilliNear < 0) throw new Error("Invalid authoritative on-chain daily reservation.");
  if (!Number.isSafeInteger(dayUtc) || dayUtc < 0) throw new Error("Invalid chain day.");
  if (chainVerified !== true) throw new Error("Contract state was not independently verified.");
  const used = !!priorProposal;
  const checks = [
    { id: "allowlist", pass: ALLOWED.includes(request.recipient), detail: ALLOWED.includes(request.recipient) ? "Recipient is allowed by the contract" : "Recipient is not allowed" },
    { id: "single_limit", pass: request.amountMilliNear <= MAX_ACTION_MILLI, detail: request.amountMilliNear <= MAX_ACTION_MILLI ? "Within 2 NEAR single-action cap" : "Exceeds 2 NEAR per-action cap" },
    { id: "daily_limit", pass: reservedMilliNear + request.amountMilliNear <= MAX_DAILY_MILLI, detail: reservedMilliNear + request.amountMilliNear <= MAX_DAILY_MILLI ? "Within 10 NEAR daily cap" : "Would exceed 10 NEAR daily cap" },
    { id: "nonce_replay", pass: !used, detail: used ? "Nonce already exists on chain" : "Nonce not found in on-chain proposal state" }
  ];
  const eligible = checks.every(x => x.pass);
  return {
    decision: eligible ? "ELIGIBLE_FOR_HUMAN_REVIEW" : "BLOCKED",
    checks,
    dayUtc,
    reservedMilliNear,
    remainingMilliNear: Math.max(0, MAX_DAILY_MILLI - reservedMilliNear),
    contractAccount: CONTRACT_ACCOUNT,
    agentAccount: AGENT_ACCOUNT,
    nextStep: eligible ? "Human reviews an UNSIGNED proposed transaction; the website never submits or signs it." : "Do not sign or send the proposal.",
    unsignedDraft: eligible ? {
      network: "testnet", signerAccountId: AGENT_ACCOUNT, receiverAccountId: CONTRACT_ACCOUNT,
      method: "propose", args: {
        nonce: request.nonce, recipient: request.recipient, amount_milli_near: request.amountMilliNear
      }, deposit: "0 NEAR", gas: "30 Tgas"
    } : null,
    moneyTransferred: false, transactionSubmitted: false
  };
}

module.exports = { ALLOWED, MAX_ACTION_MILLI, MAX_DAILY_MILLI, AGENT_ACCOUNT, CONTRACT_ACCOUNT, validateRequest, computePolicy };
