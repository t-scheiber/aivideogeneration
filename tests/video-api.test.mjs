import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp,videoForm,videoRequest} from './app-harness.mjs';
function route({session={user:{id:'fixture-user'}},result={success:true,videos:['https://example.test/video.mp4'],provider:'veo-3',cost:1},env={VEO3_API_KEY:'fixture'},throwSession=false}={}) {
 const calls=[];const loaded=loadApp('app/api/generate-video/route.ts',{env,modules:{'@/lib/auth-server':{getServerSession:async()=>{if(throwSession)throw Error('internal-auth-diagnostic');return session;}},'@/lib/video-provider-service':{VideoProviderService:class{async generateVideo(...args){calls.push(args);return result;}}}}});return {...loaded,calls,post:loaded.exports.POST};
}
test('unauthenticated generation refuses before parsing data or contacting a provider',async()=>{
 const handler=route({session:null});let parsed=false;const response=await handler.post({formData:async()=>{parsed=true;throw Error('unexpected');}});assert.equal(response.status,401);assert.equal(parsed,false);assert.equal(handler.calls.length,0);
});
test('valid VEO form preserves request options and successful API response',async()=>{
 const handler=route(),response=await handler.post(videoRequest());assert.equal(response.status,200);assert.equal(handler.calls.length,1);const [provider,input,key]=handler.calls[0];assert.equal(provider,'veo-3');assert.equal(key,'fixture');assert.equal(input.prompt,'A quiet mountain lake at sunrise');assert.equal(input.durationSeconds,8);assert.equal(input.numberOfVideos,1);assert.equal(input.veo3Audio,true);assert.deepEqual(await response.json(),{videos:['https://example.test/video.mp4'],provider:'veo-3',cost:1});
});
test('malformed and unsupported form values stop before provider access',async()=>{
 for(const changed of [{prompt:'   '},{prompt:new File(['x'],'prompt.txt')},{provider:'unknown'},{provider:'__proto__'},{durationSeconds:'8seconds'},{durationSeconds:'NaN'},{durationSeconds:'-8'},{durationSeconds:'0'},{durationSeconds:'9'},{numberOfVideos:'2'},{numberOfVideos:'1.5'},{numberOfVideos:'0'},{aspectRatio:'9:16'},{veo3Model:'unreviewed'},{veo3Resolution:'4K'},{veo3Audio:'maybe'},{negativePrompt:new File(['x'],'negative.txt')},{conditioningImage:'not-a-file'}]){
  const handler=route(),response=await handler.post(videoRequest(videoForm(changed)));assert.equal(response.status,400,JSON.stringify(changed));assert.equal(handler.calls.length,0);
 }
});
test('invalid multipart request returns a client error and missing configuration makes no provider call',async()=>{
 const malformed=route();const response=await malformed.post(new Request('http://localhost/api/generate-video',{method:'POST',body:'broken multipart',headers:{'content-type':'multipart/form-data'}}));assert.equal(response.status,400);assert.equal(malformed.calls.length,0);
 const unconfigured=route({env:{}});assert.equal((await unconfigured.post(videoRequest())).status,500);assert.equal(unconfigured.calls.length,0);
});
test('provider errors and internal authentication errors never expose internal diagnostics',async()=>{
 const handler=route({result:{success:false,provider:'veo-3',error:'private-upstream-diagnostic'}});const response=await handler.post(videoRequest());assert.equal(response.status,400);assert.doesNotMatch(await response.text(),/private-upstream-diagnostic/);
 const auth=route({throwSession:true});const failed=await auth.post(videoRequest());assert.equal(failed.status,500);assert.doesNotMatch(await failed.text(),/internal-auth-diagnostic/);assert.doesNotMatch(JSON.stringify(auth.logs),/internal-auth-diagnostic/);
});
