"use strict";
const button = document.getElementById("verify-button");
const status = document.getElementById("chain-status");
const result = document.getElementById("chain-result");
function line(parent, name, value) {
  const row = document.createElement("div"); row.className = "data-row";
  const title = document.createElement("span"); title.textContent = name;
  const body = document.createElement("strong"); body.textContent = value;
  row.append(title, body); parent.append(row);
}
async function verify() {
  button.disabled = true;
  button.textContent = "Checking NEAR testnet…";
  status.className = "pill checking";
  status.textContent = "Connecting";
  result.replaceChildren();
  try {
    const response = await fetch("/api/onchain", {cache: "no-store"});
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "NEAR RPC did not verify the state");
    status.className = "pill verified";
    status.textContent = "Verified live";
    line(result, "Network", data.network);
    line(result, "Latest block", String(data.blockHeight));
    line(result, "Deployed code", data.codeHash);
    line(result, "Registered reviewer", data.owner);
    line(result, "Agent proposal", data.proposal.nonce);
    line(result, "Proposed amount", (data.proposal.amount_milli_near / 1000).toFixed(2) + " NEAR (test tokens)");
    line(result, "Approval state", data.proposal.approved ? "Approved by reviewer" : "Awaiting review");
    line(result, "Reserved in contract", (data.reservedMilliNear / 1000).toFixed(2) + " NEAR");
    line(result, "Money transferred", "None — contract has no transfer action");
    line(result, "Verification time", new Date(data.verifiedAt).toLocaleString());
    const note = document.createElement("p"); note.className = "note";
    note.textContent = "This panel reads finalized contract state from NEAR testnet RPC. It does not submit transactions or sign anything.";
    result.append(note);
  } catch (err) {
    status.className = "pill fail";
    status.textContent = "Unverified right now";
    const note = document.createElement("p"); note.className = "note";
    note.textContent = "Live check failed: " + String(err.message) + ". The transaction links remain available below.";
    result.append(note);
  } finally {
    button.disabled = false;
    button.textContent = "Verify again";
  }
}
button.addEventListener("click", verify);
verify();
