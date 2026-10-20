'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const text=require('../assets/js/unicode-text.js');
const {createModel}=require('../assets/js/independent-interactions.js');
test('70-character SMS preserves emoji at the truncation boundary',()=>{
 const m=createModel('2G');m.act('draft','中'.repeat(69)+'😀'+'余');
 assert.equal(m.getState().draft,'中'.repeat(69)+'😀');assert.ok(m.getState().draft.isWellFormed());
});
test('legacy drafts with a lone surrogate are repaired without harming valid emoji',()=>{
 assert.equal(text.limit('旧草稿\uD83D',70),'旧草稿');assert.equal(text.limit('😀\uDE00中文',70),'😀中文');
});
test('visible-character limits and deletion preserve families, flags and combining accents',()=>{
 for(const symbol of ['😀','👨‍👩‍👧‍👦','🇨🇳','e\u0301','👍🏽']){
  assert.equal(text.length(symbol),1);assert.equal(text.limit('中'.repeat(69)+symbol+'余',70),'中'.repeat(69)+symbol);
  assert.equal(text.dropLast('中文'+symbol),'中文');
 }
});
test('workbench edits, keyboard deletion and saved content use safe text handling',()=>{
 const storage=new Map(),window={CommsText:text,document:{querySelector:()=>null},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 vm.runInNewContext(fs.readFileSync('assets/js/era-workbench.js','utf8'),{window});
 const api=window.CommsEraExperience;api.edit('2G','draft','中'.repeat(69)+'👨‍👩‍👧‍👦');
 let state=JSON.parse(storage.get('commsArchive.eraWorkbench.v1'));assert.equal(text.length(state['2G'].draft),70);
 api.key('2G','back');state=JSON.parse(storage.get('commsArchive.eraWorkbench.v1'));assert.equal(state['2G'].draft,'中'.repeat(69));
 api.edit('4G','comment','好'.repeat(69)+'🇨🇳余');state=JSON.parse(storage.get('commsArchive.eraWorkbench.v1'));assert.equal(state['4G'].comment,'好'.repeat(69)+'🇨🇳');
});
