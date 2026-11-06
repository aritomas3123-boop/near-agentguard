"use strict";
const $ = id => document.getElementById(id);
const status = $("agent-status");
const result = $("agent-output");
const submit = $("agent-submit");
const form = $("agent-form");
const nonceInput = $("agent-nonce");
function resetNonce(){ nonceInput.value = "draft-" + crypto.randomUUID().replace(/-/g,"").slice(0,12); }
function node(tag, text, klass) { const n = document.createElement(tag); n.textContent = text; if(klass)n.className = klass; return n; }
function addResult(label, text) {
 const row = node("div","","data-row");
 row.append(node("span",label),node("strong",text));
 result.append(row);
}
async function showStatus(){
 try {
  const r = await fetch("/api/agent/status", {cache:"no-store"});
  const x = await r.json();
  if(!r.ok)throw new Error("Status unavailable");
  status.textContent = x.modelConfigured ? "Gemini advisory enabled · No signing keys" : "Blockchain policy active · Gemini model not configured";
  status.className = "pill " + (x.modelConfigured ? "verified" : "checking");
 }catch{status.textContent = "Agent service status unavailable";status.className="pill fail";}
}
async function assess(e){
 e.preventDefault();submit.disabled=true;submit.textContent="Checking contract…";result.replaceChildren();
 const amount = Number($("agent-amount").value);
 const request = {
   recipient: $("agent-recipient").value,
   amountMilliNear: amount,
   nonce: nonceInput.value,
   purpose: $("agent-purpose").value
 };
 try {
  const r = await fetch("/api/agent/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});
  const x = await r.json();
  if(!r.ok||!x.ok)throw new Error(x.error||"Analysis unavailable");
  result.append(node("h3",x.policy.decision === "BLOCKED" ? "Request blocked by policy" : "Eligible for human review",x.policy.decision==="BLOCKED"?"bad":"good"));
  addResult("Read-only testnet status","Verified");
  addResult("Reserved today",(x.policy.reservedMilliNear/1000).toFixed(3)+" test NEAR");
  addResult("Available budget",(x.policy.remainingMilliNear/1000).toFixed(3)+" test NEAR");
  for(const check of x.policy.checks) addResult((check.pass?"✓ ":"✕ ")+check.id,check.detail);
  addResult("Gemini analysis",x.ai.status==="COMPLETED" ? "Completed (advisory only)" : x.ai.status==="NOT_CONFIGURED" ? "Not connected — policy checks only" : "Unavailable — policy checks only");
  if(x.ai.explanation)addResult("Commentary",x.ai.explanation);
  if(x.ai.reviewQuestions?.length)for(const q of x.ai.reviewQuestions)addResult("Reviewer question",q);
  addResult("Funds transferred","None");
  addResult("Transaction signed","No");
  const paragraph=node("p",x.policy.nextStep,"note");result.append(paragraph);
  if(x.policy.unsignedDraft){
   const pre=node("pre",JSON.stringify(x.policy.unsignedDraft,null,2),"code");
   pre.style.whiteSpace="pre-wrap";pre.style.wordBreak="break-word";
   result.append(pre);
  }
 } catch(err) {
  result.append(node("h3","No action permitted","bad"));
  result.append(node("p",String(err.message).slice(0,220),"note"));
 } finally {
  submit.disabled=false;submit.textContent="Analyze safely";
 }
}
form.addEventListener("submit",assess);
$("agent-new-nonce").addEventListener("click",resetNonce);
$("agent-demo-safe").addEventListener("click",()=>{
 $("agent-recipient").value="storage.near";
 $("agent-amount").value="500";
 $("agent-purpose").value="Reserve a small testnet budget for a research agent to store an audit record.";
 resetNonce();form.requestSubmit();
});
$("agent-demo-block").addEventListener("click",()=>{
 $("agent-recipient").value="unlisted.near";
 $("agent-amount").value="2500";
 $("agent-purpose").value="Ask an AI to send funds outside the recipient allowlist.";
 resetNonce();form.requestSubmit();
});
resetNonce();showStatus();
