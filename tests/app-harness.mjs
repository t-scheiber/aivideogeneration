import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const root=process.cwd(),require=createRequire(path.join(root,'package.json'));
export function loadApp(relative,{modules={},globals={},env={}}={}) {
 const cache=new Map(),logs=[];
 const context=vm.createContext({Buffer,FormData,File,Headers,Request,Response,URL,URLSearchParams,TextEncoder,TextDecoder,AbortSignal,process:{env},console:{log:(...args)=>logs.push(args),error:(...args)=>logs.push(args),warn:(...args)=>logs.push(args)},fetch:()=>{throw Error('Unexpected external request');},setTimeout:()=>{throw Error('Unexpected real timer');},...globals});
 function load(filename){
  const full=path.resolve(root,filename);if(!full.startsWith(root+path.sep))throw Error('Import outside project');
  if(cache.has(full))return cache.get(full).exports;
  const module={exports:{}};cache.set(full,module);
  const text=fs.readFileSync(full,'utf8');
  const code=ts.transpileModule(text,{fileName:full,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const imports=id=>{if(Object.hasOwn(modules,id))return modules[id];if(id.startsWith('.')){const base=path.resolve(path.dirname(full),id);for(const extension of ['','.ts','.tsx'])if(fs.existsSync(base+extension))return load(base+extension);throw Error('Missing local module');}if(['next/server','react/jsx-runtime','react'].includes(id))return require(id);throw Error('Unmocked application import: '+id);};
  const wrapper=vm.runInContext(`(function(require,module,exports){${code}\n})`,context,{timeout:1000});wrapper(imports,module,module.exports);return module.exports;
 }
 return {exports:load(relative),logs};
}
export function videoForm(changes={}) {
 const form=new FormData();for(const [key,value] of Object.entries({prompt:'A quiet mountain lake at sunrise',negativePrompt:'',provider:'veo-3',numberOfVideos:'1',aspectRatio:'16:9',durationSeconds:'8',veo3Model:'veo3-fast',veo3Resolution:'720p',veo3Audio:'true',...changes}))if(value!==undefined)form.set(key,value);return form;
}
export function videoRequest(form=videoForm()) {return new Request('http://localhost/api/generate-video',{method:'POST',body:form});}
