import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadApp} from './app-harness.mjs';
test('root layout uses valid document structure and Next metadata instead of placeholder icon URLs',()=>{
 const {exports}=loadApp('app/layout.tsx',{modules:{'./globals.css':{},'./providers':{Providers:({children})=>children}}});const html=renderToStaticMarkup(React.createElement(exports.default,{children:React.createElement('main',null,'Page content')}));assert.match(html,/<html lang="en">/);assert.match(html,/<body/);assert.doesNotMatch(html,/<header>|generated|apple-icon\?/);assert.equal(exports.metadata.title,'Generate Videos with AI');
});
