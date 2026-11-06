"use strict";
const http = require("node:http");
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

const PORT = Number(process.env.PORT || 10000);
const ACCOUNT = "agentguard-audit-20261106.testnet";
const REVIEWER = "agentguard-review-20261106.testnet";
const AGENT = "agentguard-agent-20261106.testnet";
const PROPOSAL_ID = AGENT + ":case-a10001";
const EXPECTED_CODE_HASH = "5kdzRKEybprMkh7BWg7NoT4v87Bjn6795HaYy4WiBhvt";
const RPC_ENDPOINTS = ["https://rpc.testnet.fastnear.com", "https://rpc.testnet.near.org"];
const TX = Object.freeze({
  deploy: "4NPktQj9PdUB97ZNvkwJ2QzuhGNJqnVbRsYAc16staqF",
  propose: "EcV85FPVYYDbnbShaLG9vkzNEZ1Dw7vtJyz1gpiSDcbB",
  unauthorized: "GiYHu4XfiJVPzg3wrraVXVZ8wR77BEw4KgPSXCjDSzQH",
  approval: "EyV16Dog1wjRxUGguzdsh6gVrv8cojg1KVuaFXiyehPp",
  replay: "DnPxvaLSTxQYm5Q8sAyz1FdyioSwwiY8RjhyNiE4Y9dt",
});
const wasm = fs.readFileSync(path.join(__dirname, "agentguard_near.wasm"));
if (wasm.length < 16 || !wasm.subarray(0, 4).equals(Buffer.from([0, 97, 115, 109]))) {
  throw new Error("The compiled WASM is missing or invalid");
}
const wasmSha256 = crypto.createHash("sha256").update(wasm).digest("hex");
const files = {
  "/": {type: "text/html; charset=utf-8", data: fs.readFileSync(path.join(__dirname, "index.html"))},
  "/app.js": {type: "application/javascript; charset=utf-8", data: fs.readFileSync(path.join(__dirname, "app.js"))},
  "/contract.wasm": {type: "application/wasm", data: wasm}
};
let serial = 0;

function setHeaders(res, type, cache = "no-store") {
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", cache);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'");
}
function json(res, status, obj) {
  setHeaders(res, "application/json; charset=utf-8");
  res.statusCode = status;
  res.end(JSON.stringify(obj));
}
async function rpc(method, params) {
  const errors = [];
  for (const url of RPC_ENDPOINTS) {
    try {
      const result = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({jsonrpc: "2.0", id: ++serial, method, params}),
        signal: AbortSignal.timeout(8000)
      });
      if (!result.ok) throw new Error("HTTP " + result.status);
      const doc = await result.json();
      if (doc.error || !doc.result) throw new Error(doc.error?.message || "Missing RPC result");
      return doc.result;
    } catch (err) {
      errors.push(url + ": " + String(err.message).slice(0, 120));
    }
  }
  throw new Error("NEAR testnet read failed. " + errors.join(" | "));
}
async function view(method, args) {
  const result = await rpc("query", {
    request_type: "call_function", finality: "final", account_id: ACCOUNT,
    method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString("base64")
  });
  if (!Array.isArray(result.result)) throw new Error("Unexpected view response");
  return JSON.parse(Buffer.from(result.result).toString("utf8"));
}
async function verifyOnChain() {
  const [account, owner, proposal] = await Promise.all([
    rpc("query", {request_type: "view_account", finality: "final", account_id: ACCOUNT}),
    view("owner", {}),
    view("get_proposal", {id: PROPOSAL_ID})
  ]);
  if (account.code_hash !== EXPECTED_CODE_HASH) throw new Error("The contract code hash differs from the audited deployment");
  if (owner !== REVIEWER) throw new Error("The reviewer does not match the approved account");
  if (!proposal || proposal.agent !== AGENT || proposal.recipient !== "api.near.ai" ||
      proposal.nonce !== "case-a10001" || proposal.amount_milli_near !== 1250) {
    throw new Error("The recorded demonstration proposal does not match the audited case");
  }
  const reserved = await view("get_reserved_milli_near", {agent: AGENT, day_utc: proposal.day_utc});
  if (typeof reserved !== "number" || reserved < proposal.amount_milli_near) {
    throw new Error("The on-chain reserve does not match the proposal");
  }
  return {
    ok: true, network: "testnet", verifiedAt: new Date().toISOString(),
    blockHeight: account.block_height, account: ACCOUNT, codeHash: account.code_hash,
    binarySha256: wasmSha256, owner, proposal, reservedMilliNear: reserved,
    onChainDeployed: true, approvalIsTransfer: false, fundsTransferred: false,
    transactions: TX, source: "Live NEAR testnet JSON-RPC, read-only calls"
  };
}
const app = http.createServer(async (req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, {"Allow": "GET, HEAD"}); res.end(); return;
  }
  if (pathname === "/health") {
    json(res, 200, {
      status: "ok", contractWasmBuilt: true, wasmBytes: wasm.length, sha256: wasmSha256,
      deploymentNetwork: "testnet", deploymentTransaction: TX.deploy,
      deployedCodeHash: EXPECTED_CODE_HASH, onChainDeploymentObserved: true,
      liveOnChainVerification: "/api/onchain", transfersEnabled: false,
      productionReady: false
    });
    return;
  }
  if (pathname === "/api/onchain") {
    try {
      const result = await verifyOnChain();
      json(res, 200, result);
    } catch (error) {
      res.setHeader("Retry-After", "15");
      json(res, 503, {ok: false, reason: "Cannot independently verify the live NEAR testnet state",
        message: String(error.message).slice(0, 300), fundsTransferred: false});
    }
    return;
  }
  if (Object.hasOwn(files, pathname)) {
    setHeaders(res, files[pathname].type, "public, max-age=300");
    if (pathname === "/contract.wasm") {
      res.setHeader("Content-Disposition", 'attachment; filename="agentguard_near.wasm"');
    }
    res.end(req.method === "HEAD" ? "" : files[pathname].data);
    return;
  }
  res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
  res.end("Not found");
});
app.listen(PORT, "0.0.0.0", () => {
  console.log("AgentGuard public testnet evidence service listening on", PORT, "wasm sha256", wasmSha256);
});
