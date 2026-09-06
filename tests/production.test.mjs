import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import http from 'node:http';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

// Test transport can connect only to this process's loopback server.
function loopback(pathname,{method='GET',body}={}) {
 assert.ok(pathname.startsWith('/')&&!pathname.startsWith('//'));
 return new Promise((resolve,reject)=>{
  const request=http.request({hostname:'127.0.0.1',port:31871,path:pathname,method},response=>{
   const chunks=[];let bytes=0;
   response.on('data',chunk=>{bytes+=chunk.length;if(bytes>4*1024*1024){response.destroy();reject(Error('Unexpected response size'));}else chunks.push(chunk);});
   response.on('error',reject);response.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:response.statusCode,headers:Object.fromEntries(Object.entries(response.headers).filter(([,value])=>value!==undefined).map(([key,value])=>[key,Array.isArray(value)?value.join(','):value]))})));
  });
  request.setTimeout(1000,()=>request.destroy(Error('Loopback request timed out')));request.on('error',reject);request.end(body);
 });
}

test('production Next server serves health/assets and rejects anonymous generation without provider access',async()=>{
 const origin='http://127.0.0.1:31871',root=process.cwd(),sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'aivideo-production-'));
 for(const file of ['.next','node_modules','package.json','next.config.mjs'])fs.symlinkSync(path.join(root,file),path.join(sandbox,file));
 const env={...process.env,AUTH_SECRET:'public-test-fixture-auth-secret-never-a-live-key',BETTER_AUTH_URL:origin,NEXT_PUBLIC_APP_URL:origin};
 for(const key of ['VEO3_API_KEY','RUNWAYML_API_KEY','LUMA_API_KEY','OPENAI_API_KEY','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'])delete env[key];
 const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-H','127.0.0.1','-p','31871'],{env,cwd:sandbox,stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',chunk=>logs+=chunk);child.stderr.on('data',chunk=>logs+=chunk);
 try {
  let ready=false;
  for(let i=0;i<100;i++){
   if(child.exitCode!==null)throw Error('Production server exited before readiness');
   try{const response=await loopback('/api/health');if(response.status===200){ready=true;assert.deepEqual(await response.json(),{status:'ok',message:'App is up and running'});break;}}catch{}
   await delay(100);
  }
  assert.equal(ready,true,'Public health endpoint never became ready');
  const htmlResponse=await loopback('/');assert.equal(htmlResponse.status,200);const html=await htmlResponse.text();assert.match(html,/Generate Videos with AI/);assert.doesNotMatch(html,/<header>|icon\?&lt;generated|apple-icon\?/);
  const favicon=await loopback('/favicon.ico');assert.equal(favicon.status,200);assert.deepEqual(Buffer.from(await favicon.arrayBuffer()),fs.readFileSync('app/favicon.ico'));
  const api=await loopback('/api/generate-video',{method:'POST',body:'not parsed without authentication'});assert.equal(api.status,401);assert.deepEqual(await api.json(),{error:'Authentication required'});
  const asset=html.match(/(?:src|href)="([^"?#]*\/_next\/static\/[^"?#]+)(?:\?[^"#]*)?"/);assert.ok(asset,'Built static asset missing');const bundled=await loopback(asset[1]);assert.equal(bundled.status,200);assert.ok((await bundled.arrayBuffer()).byteLength>0);
  assert.doesNotMatch(logs,/test-fixture-auth-secret|provider-key/);
 } finally {
  if(child.exitCode===null){child.kill('SIGTERM');await Promise.race([once(child,'exit'),delay(5000)]);if(child.exitCode===null)child.kill('SIGKILL');}
  fs.rmSync(sandbox,{recursive:true,force:true});
 }
});
