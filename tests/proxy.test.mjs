import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {loadApp} from './app-harness.mjs';
function proxy(session){return loadApp('proxy.ts',{modules:{'better-auth/cookies':{getCookieCache:async()=>session}}}).exports.default;}
test('health remains public and an unauthenticated API request has a JSON 401 contract',async()=>{
 const invoke=proxy(null);const health=await invoke(new NextRequest('http://localhost/api/health'));assert.equal(health.headers.get('x-middleware-next'),'1');
 const api=await invoke(new NextRequest('http://localhost/api/generate-video',{method:'POST'}));assert.equal(api.status,401);assert.deepEqual(await api.json(),{error:'Authentication required'});
});
test('public sign-in stays public and protected browser pages retain their redirect',async()=>{
 const invoke=proxy(null);for(const route of ['/','/auth/signin','/api/auth/get-session'])assert.equal((await invoke(new NextRequest('http://localhost'+route))).headers.get('x-middleware-next'),'1');
 const protectedPage=await invoke(new NextRequest('http://localhost/private'));assert.equal(protectedPage.status,307);assert.equal(protectedPage.headers.get('location'),'http://localhost/auth/signin');
 const admitted=await proxy({user:{id:'fixture-user'}})(new NextRequest('http://localhost/api/generate-video'));assert.equal(admitted.headers.get('x-middleware-next'),'1');
});
