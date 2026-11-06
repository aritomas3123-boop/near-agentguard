"use strict";
const http = require("node:http");
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const port = Number(process.env.PORT || 10000);
const wasmPath = path.join(__dirname, "agentguard_near.wasm");
const html = fs.readFileSync(path.join(__dirname, "index.html"));
const wasm = fs.readFileSync(wasmPath);
if(wasm.length < 16 || !wasm.subarray(0,4).equals(Buffer.from([0,97,115,109]))) throw new Error("Expected compiled WASM missing");
const checksum = crypto.createHash("sha256").update(wasm).digest("hex");
function headers(res,type) {
  res.setHeader("Content-Type",type);
  res.setHeader("Cache-Control","public, max-age=180");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Content-Security-Policy","default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; script-src 'none'; base-uri 'none'; frame-ancestors 'none'");
}
http.createServer((req,res)=>{
  if(req.method!=="GET" && req.method!=="HEAD"){res.writeHead(405,{"Allow":"GET, HEAD"});res.end();return}
  const p = (req.url||"/").split("?")[0];
  if(p==="/health") {
    headers(res,"application/json; charset=utf-8");
    const body=JSON.stringify({status:"ok",contractWasmBuilt:true,wasmBytes:wasm.length,sha256:checksum,network:"none",onChainDeployed:false,transfersEnabled:false});
    res.end(req.method==="HEAD"?"":body);
    return;
  }
  if(p==="/contract.wasm") {
    headers(res,"application/wasm");
    res.setHeader("Content-Disposition",'attachment; filename="agentguard_near.wasm"');
    res.end(req.method==="HEAD"?"":wasm);
    return;
  }
  if(p==="/") {
    headers(res,"text/html; charset=utf-8");
    res.end(req.method==="HEAD"?"":html);
    return;
  }
  res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});
  res.end("Not found");
}).listen(port,"0.0.0.0",()=>console.log("AgentGuard proof-server listening on",port,"WASM SHA256",checksum));
