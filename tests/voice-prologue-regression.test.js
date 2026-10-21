'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/js/lan-system.js','utf8');
const toggle=source.split(/\r?\n/).find(line=>line.trim().startsWith('function toggleVoice()'));
test('开启自动语音立即朗读当前句，关闭后停止；更新界面不重复播放',()=>{
 const calls=[],settings={voice:false},line={id:'test',dialogue:'当前句'};
 const c=vm.createContext({settings,queue:[line],queueIndex:0,PREF_KEY:'prefs',storageSet:()=>{},stopSpeechForPageHide:()=>calls.push('stop'),updateWidget:()=>calls.push('render'),speak:(text,meta)=>calls.push({text,id:meta.id})});
 vm.runInContext(toggle,c);c.toggleVoice();assert.deepEqual(calls,['render',{text:'当前句',id:'test'}]);c.toggleVoice();assert.equal(calls.at(-2),'stop');assert.equal(calls.filter(v=>typeof v==='object').length,1);
});
test('空闲时开启自动语音不朗读系统状态，更不改变进度',()=>{
 let spoken=0;const c=vm.createContext({settings:{voice:false},queue:[],queueIndex:0,PREF_KEY:'prefs',storageSet(){},stopSpeechForPageHide(){},updateWidget(){},speak(){spoken++;}});vm.runInContext(toggle,c);c.toggleVoice();assert.equal(spoken,0);
});
test('显示模块及其倍速变更不调用剧情推进和时代解锁',()=>{
 const voice=fs.readFileSync('assets/js/lan-voice.js','utf8');assert.doesNotMatch(voice,/enterEra\(|completeDialogue\(|navigateChapterNext\(|dispatchEvent\(/);assert.doesNotMatch(voice,/new root\.SpeechSynthesisUtterance|synth\.speak/);
});
