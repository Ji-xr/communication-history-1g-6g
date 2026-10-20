'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/lan-voice.js','utf8');
function runtime(supported = true, natural = false) {
  const events = {}, spoken = [], timers = new Map(), storage = new Map(), ducks = new Set();
  let list = [], count = 0, demo = false, paused = 0, resumed = 0;
  const synth = {getVoices:()=>list, cancel(){}, speak(u){spoken.push(u);u.onstart?.();},pause(){paused++;},resume(){resumed++;},addEventListener(name,fn){events[name]=fn;}};
  const window = { document:{visibilityState:'visible',addEventListener(name,fn){events[name]=fn;}},
    addEventListener(name,fn){events[name]=fn;}, setTimeout(fn){timers.set(++count,fn);return count;},clearTimeout(id){timers.delete(id);},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    DemoManager:{isActive:()=>demo,dialogueSpeed:1.7,storageKey:k=>demo?'demo.'+k:k},
    ExhibitionSoundtrack:{setDucked(value,reason){if(value)ducks.add(reason);else ducks.delete(reason);}} };
  const audios=[];
  if(natural){window.LanVoiceCatalog={'你好。':'assets/media/voice/test.mp3'};window.Audio=class{
    constructor(src){this.src=src;this.plays=0;this.pauses=0;audios.push(this);}play(){this.plays++;this.onplaying?.();return Promise.resolve();}pause(){this.pauses++;}
  };}
  if(supported){window.speechSynthesis=synth;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};}
  vm.runInNewContext(source,{window});
  return {api:window.LanVoice,spoken,timers,storage,ducks,window,events,audios,
    setVoices(v){list=v;events.voiceschanged?.();},demo(v){demo=v;},
    end(){spoken.at(-1).onend();},tick(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());},
    hidden(v){window.document.visibilityState=v?'hidden':'visible';events.visibilitychange();},
    get paused(){return paused;},get resumed(){return resumed;} };
}
const zh={voiceURI:'cn',name:'Xiaoxiao Natural',lang:'zh-CN',localService:false};
test('Chinese voice choice honors preference and skips default English',()=>{
  const r=runtime();r.setVoices([{voiceURI:'en',name:'English',lang:'en-US',default:true},zh,{voiceURI:'tw',name:'Chinese',lang:'zh-TW'}]);
  r.api.speak('你好。');assert.equal(r.spoken[0].voice,zh);
  r.storage.set('commsArchive.lanVoice.v1',JSON.stringify({voice:'tw'}));r.api.speak('你好。');assert.equal(r.spoken.at(-1).voice.voiceURI,'tw');
});
test('voices arriving asynchronously are used by the next utterance',()=>{
  const r=runtime();r.api.speak('先听听。再看看？');assert.equal(r.spoken[0].lang,'zh-CN');
  r.setVoices([zh]);r.end();r.tick();assert.equal(r.spoken[1].voice,zh);
});
test('delivery varies with emotion while demo speed stays conversational',()=>{
  const r=runtime();r.api.speak('我们再看看。',{emotion:'nostalgia'});const slow=r.spoken.at(-1).rate;
  r.demo(true);r.api.speak('准备好了吗？',{emotion:'curious'});assert.ok(r.spoken.at(-1).rate>slow);assert.ok(r.spoken.at(-1).rate<=1.16);
  assert.ok(r.spoken.at(-1).pitch>1);
});
test('spoken terminology is normalized without changing captions',()=>{
  const r=runtime(),caption='1G到6G，AI与LTE。';r.api.speak(caption);assert.equal(caption,'1G到6G，AI与LTE。');
  assert.match(r.spoken[0].text,/一代移动通信到六代移动通信/);assert.match(r.spoken[0].text,/人工智能与L T E/);
  assert.ok([...r.api.segments('声'.repeat(350))].every(s=>s.length<=110));
});
test('cancel and late callbacks cannot revive an old dialogue or release new speech ducking',()=>{
  const r=runtime();r.api.speak('旧的一句。还有一句。');const old=r.spoken[0];r.end();assert.equal(r.timers.size,1);
  r.api.speak('新的一句。');old.onend();old.onerror({error:'interrupted'});r.tick();assert.equal(r.spoken.length,2);assert.ok(r.ducks.has('speech'));
  r.api.cancel();r.spoken.at(-1).onend();r.tick();assert.equal(r.spoken.length,2);assert.equal(r.ducks.size,0);
});
test('pause and resume during utterance and between sentences retain the queue',()=>{
  const r=runtime();r.api.speak('第一句。第二句。');r.hidden(true);assert.equal(r.paused,1);assert.equal(r.ducks.size,0);
  r.hidden(false);assert.equal(r.resumed,1);assert.ok(r.ducks.has('speech'));
  r.end();r.hidden(true);r.tick();assert.equal(r.spoken.length,1);r.hidden(false);assert.equal(r.spoken.length,2);
  r.end();assert.equal(r.api.state.status,'done');assert.equal(r.ducks.size,0);
});
test('speech finishing while hidden resumes remaining sentences without deadlock',()=>{
  const r=runtime();r.api.speak('第一句。第二句。');r.hidden(true);r.end();assert.equal(r.timers.size,0);r.hidden(false);assert.equal(r.spoken.length,2);
});
test('error, autoplay rejection, unsupported browser and pagehide release speech',()=>{
  const r=runtime();r.api.speak('听听。');r.spoken[0].onerror({error:'not-allowed'});assert.equal(r.api.state.status,'blocked');assert.equal(r.ducks.size,0);
  r.api.speak('听听。');r.events.pagehide();r.end();assert.equal(r.api.state.playing,false);
  const missing=runtime(false);assert.equal(missing.api.speak('你好'),false);assert.equal(missing.api.state.status,'unsupported');
});
test('voice preferences stay scoped to formal and demo mode',()=>{
  const r=runtime();r.storage.set('commsArchive.lanVoice.v1',JSON.stringify({style:'calm',speed:.9}));
  assert.equal(r.api.state.preferences.style,'calm');r.demo(true);assert.equal(r.api.state.preferences.style,'conversation');assert.equal(r.api.state.preferences.speed,1);
});
test('malformed stored settings fall back to validated preferences',()=>{
  const r=runtime();r.storage.set('commsArchive.lanVoice.v1','{');assert.equal(r.api.state.preferences.speed,1);
  r.storage.set('commsArchive.lanVoice.v1',JSON.stringify({speed:20,style:'bad',voice:42}));assert.equal(r.api.state.preferences.speed,1);assert.equal(r.api.state.preferences.voice,'');
});
test('default neural audio plays locally without invoking mechanical synthesis',()=>{
 const r=runtime(true,true);assert.equal(r.api.speak('你好。'),true);assert.equal(r.spoken.length,0);assert.equal(r.audios[0].src,'assets/media/voice/test.mp3');assert.equal(r.api.state.status,'speaking');
 r.hidden(true);assert.equal(r.audios[0].pauses,1);assert.equal(r.ducks.size,0);r.hidden(false);assert.equal(r.audios[0].plays,2);assert.ok(r.ducks.has('speech'));
 r.audios[0].onended();assert.equal(r.api.state.status,'done');assert.equal(r.ducks.size,0);
});
test('neural audio works without a system TTS implementation',()=>{
 const r=runtime(false,true);assert.equal(r.api.supported,true);assert.equal(r.api.speak('你好。'),true);r.api.cancel();assert.equal(r.audios[0].pauses,1);
});
test('missing audio remains visible as a recoverable status and never silently becomes system TTS',()=>{
 const r=runtime(true,true);assert.equal(r.api.speak('未收录'),false);assert.equal(r.api.state.status,'missing');assert.equal(r.spoken.length,0);
 r.storage.set('commsArchive.lanVoice.v1',JSON.stringify({voice:'system'}));assert.equal(r.api.speak('未收录'),true);assert.equal(r.spoken.length,1);
});
test('switching neural lines ignores late callbacks and media failures restore music',()=>{
 const r=runtime(true,true);r.api.speak('你好。');const oldEnd=r.audios[0].onended;r.api.speak('你好。');oldEnd();assert.ok(r.api.state.playing);assert.equal(r.audios[0].pauses,1);
 r.audios[1].onerror();assert.equal(r.api.state.status,'audioerror');assert.equal(r.ducks.size,0);
});
test('neural speech autoplay rejection has a retry message and clears ducking',async()=>{
 const r=runtime(true,true);r.window.Audio.prototype.play=function(){return Promise.reject({name:'NotAllowedError'});};
 r.api.speak('你好。');await new Promise(resolve=>setImmediate(resolve));assert.equal(r.api.state.status,'blocked');assert.equal(r.ducks.size,0);
});
