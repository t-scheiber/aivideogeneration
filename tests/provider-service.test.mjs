import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './app-harness.mjs';
const input={prompt:'A mountain lake at sunrise',negativePrompt:'clouds',durationSeconds:5,aspectRatio:'16:9',numberOfVideos:1};
function service(fetch){const loaded=loadApp('lib/video-provider-service.ts',{globals:{fetch,setTimeout:callback=>{callback();return 1;}}});return {...loaded,service:new loaded.exports.VideoProviderService()};}
test('missing keys and unknown providers make no external request',async()=>{
 let calls=0;const loaded=service(()=>{calls++;throw Error('unexpected');});for(const provider of ['veo-3','runwayml','luma','openai-sora','unknown','__proto__'])assert.equal((await loaded.service.generateVideo(provider,input)).success,false);assert.equal(calls,0);
});
test('provider request bodies and returned video contracts remain compatible with current adapters',async()=>{
 const urls={'runwayml':'https://api.runwayml.com/v1/image_to_video','luma':'https://api.lumalabs.ai/dream-machine/v1/generations','openai-sora':'https://api.openai.com/v1/video/generations'};
 for(const [provider,url] of Object.entries(urls)){
  const calls=[];const loaded=service(async(...args)=>{calls.push(args);return Response.json({video_url:'https://example.test/video.mp4'});});const result=await loaded.service.generateVideo(provider,input,'test-provider-key');assert.equal(result.success,true);assert.equal(result.provider,provider);assert.equal(calls.length,1);assert.equal(calls[0][0],url);const options=calls[0][1],body=JSON.parse(options.body);assert.equal(options.headers.Authorization,'Bearer test-provider-key');assert.equal(body.prompt,input.prompt);assert.equal(body.negative_prompt,input.negativePrompt);assert.equal(body.duration,5);assert.equal(result.videos[0],'https://example.test/video.mp4');
 }
});
test('VEO polls only its task path and returns the completed video with charged credits',async()=>{
 const calls=[];const loaded=service(async(url,options)=>{calls.push([url,options]);return Response.json(calls.length===1?{taskId:'fixture-task'}:{status:'completed',result:{videoUrl:'https://example.test/video.mp4'},credits:{charged:2}});});const result=await loaded.service.generateVideo('veo-3',{...input,durationSeconds:8,veo3Audio:false},'test-provider-key');assert.equal(result.success,true);assert.equal(result.cost,2);assert.equal(calls.length,2);assert.equal(calls[1][0],'https://api.veo3gen.app/api/status/fixture-task');assert.equal(JSON.parse(calls[0][1].body).audio,false);
});
test('provider response bodies and exception diagnostics never become response text or logs',async()=>{
 for(const provider of ['veo-3','runwayml','luma','openai-sora']){
  const loaded=service(async()=>new Response('private-provider-diagnostic',{status:401}));const result=await loaded.service.generateVideo(provider,input,'test-provider-key');assert.equal(result.success,false);assert.doesNotMatch(JSON.stringify(result),/private-provider-diagnostic/);assert.doesNotMatch(JSON.stringify(loaded.logs),/private-provider-diagnostic/);
 }
 const loaded=service(async()=>{throw Error('private-network-diagnostic');});const result=await loaded.service.generateVideo('runwayml',input,'test-provider-key');assert.equal(result.success,false);assert.doesNotMatch(JSON.stringify(result),/private-network-diagnostic/);assert.doesNotMatch(JSON.stringify(loaded.logs),/private-network-diagnostic/);
});
