'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const lanSource=fs.readFileSync('assets/js/lan-system.js','utf8');
const dialogueSource=fs.readFileSync('assets/js/lan-dialogue-1g.js','utf8');
const cssSource=fs.readFileSync('assets/css/lan.css','utf8');

class Element{
  constructor(){this.id='';this.dataset={};this.hidden=false;this.textContent='';this.innerHTML='';this.nodes=new Map();this.events={};this.attributes={};this.classList={toggle(){},add(){},remove(){}}}
  setAttribute(name,value){this.attributes[name]=String(value)}
  append(){}
  addEventListener(name,callback){(this.events[name]||(this.events[name]=[])).push(callback)}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector)}
  querySelectorAll(){return[]}
  getBoundingClientRect(){return{left:700,top:600,width:420,height:140}}
}

function runtime(fixtures=[]){
  const elements=new Map(),listeners=new Map(),body=new Element();
  body.append=element=>{elements.set(`#${element.id}`,element);elements.set(element.id,element)};
  const document={body,getElementById:id=>elements.get(id)||elements.get(`#${id}`)||null,createElement:()=>new Element(),querySelector(selector){if(selector==='#app')return new Element();if(['#lanCaption','#lanEmotion','#lanVoiceNote'].includes(selector))return elements.get('lanCompanion')?.querySelector(selector)||null;return elements.get(selector)||null},addEventListener(name,callback){(listeners.get(name)||(listeners.set(name,[]),listeners.get(name))).push(callback)},removeEventListener(name,callback){listeners.set(name,(listeners.get(name)||[]).filter(item=>item!==callback))},listeners};
  const store=new Map(),localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,String(value))};
  const window={innerWidth:1000,innerHeight:800,dispatchEvent(){}};
  let fakeNow=1000;class TestDate extends Date{static now(){fakeNow+=200;return fakeNow}}
  const context={window,document,localStorage,CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},Date:TestDate,JSON,String,Object,Array,Math,Set,console};
  vm.runInNewContext(dialogueSource,context,{filename:'lan-dialogue-1g.js'});
  window.LanDialogues1G.push(...fixtures);
  vm.runInNewContext(lanSource,context,{filename:'lan-system.js'});
  return{lan:window.CommsArchiveLan,window,document};
}

const clickCard=(box,target=null)=>box.events.click[0]({target:{closest:()=>target}});

test('陪伴卡片保持桌面横向尺寸，手机端使用窄屏尺寸且长文本受限',()=>{
  assert.match(cssSource,/\.lan-companion\[data-mode="companion"\]\{[^}]*width:min\(420px,calc\(100vw - 28px\)\);height:140px;min-height:140px;aspect-ratio:3\/1/);
  assert.match(cssSource,/@media\(max-width:760px\)\{\.lan-companion\[data-mode="companion"\]\{[^}]*width:min\(420px,90vw\);height:120px;min-height:120px/);
  assert.match(cssSource,/\.lan-companion\[data-mode="companion"\] \.lan-caption\{[^}]*-webkit-line-clamp:2/);
  assert.match(cssSource,/\.lan-companion\[data-mode="companion"\] \.lan-actions\>:not\(\.lan-card-hint\):not\(\.lan-skip\)\{display:none\}/);
});

test('点击陪伴对白文字推进一句，跳过按钮不会额外推进',()=>{
  const app=runtime([{id:'fixture.companion',era:'1G',location:'gallery',trigger:'companion',emotion:'warm',dialogueType:'optional',text:'第一句。\n第二句。'}]);app.lan.trigger('fixture.companion');
  const box=app.document.getElementById('lanCompanion');
  assert.equal(box.dataset.mode,'companion');
  assert.equal(box.querySelector('#lanCardHint').textContent,'点击卡片继续');
  assert.doesNotMatch(box.innerHTML,/class="lan-next"/);
  assert.match(box.innerHTML,/class="lan-skip"[^>]*>跳过/);
  const firstIndex=app.lan.currentDialogue.lineIndex;
  clickCard(box);
  assert.equal(app.lan.currentDialogue.lineIndex,firstIndex+1);
  assert.equal(box.querySelector('#lanCardHint').textContent,'点击卡片继续');
  const currentId=app.lan.currentDialogue.id,currentIndex=app.lan.currentDialogue.lineIndex;
  clickCard(box,'button');
  assert.equal(app.lan.currentDialogue.id,currentId);
  assert.equal(app.lan.currentDialogue.lineIndex,currentIndex);
  app.lan.skip();
  assert.equal(app.lan.currentDialogue,null);
  assert.equal(box.querySelector('#lanCardHint').textContent,'点击卡片查看澜提示');
});

test('story对白整卡推进时保持中央模式直到整段结束',()=>{
  const app=runtime();app.lan.trigger('lan_1g_enter_001','1G');
  const box=app.document.getElementById('lanCompanion');
  assert.equal(box.dataset.mode,'dialogue');
  const line=app.lan.currentDialogue.lineIndex;
  clickCard(box);
  assert.equal(app.lan.currentDialogue.lineIndex,line+1);
  assert.equal(box.dataset.mode,'dialogue');
  let guard=0;while(app.window.LanDisplayMode.mode==='dialogue'&&guard++<20)clickCard(box);
  assert.equal(app.window.LanDisplayMode.mode,'companion');
});

test('choice或requiresChoice对白不会被整卡点击跳过',()=>{
  const app=runtime([{id:'fixture.choice',era:'1G',location:'task',trigger:'fixture-choice',emotion:'thinking',dialogueType:'choice',requiresChoice:true,text:'请选择调查方向。'}]);
  app.lan.trigger('fixture.choice','1G');
  const box=app.document.getElementById('lanCompanion');
  const id=app.lan.currentDialogue.id,index=app.lan.currentDialogue.lineIndex;
  assert.equal(app.window.CommsArchiveLan.normalizeDialogue({dialogueType:'choice'}).dialogueType,'choice');
  assert.equal(box.dataset.choiceRequired,'true');
  assert.equal(box.querySelector('#lanCardHint').textContent,'请先完成下方选择');
  clickCard(box);
  assert.equal(app.lan.currentDialogue.id,id);
  assert.equal(app.lan.currentDialogue.lineIndex,index);
});

test('键盘Enter和空格可推进卡片对白，卡片拖动不再预先取消点击',()=>{
  const app=runtime();app.lan.trigger('lan.home.first-visit');
  const box=app.document.getElementById('lanCompanion'),start=app.lan.currentDialogue.lineIndex;
  box.events.keydown[0]({key:'Enter',target:box,preventDefault(){}});
  assert.equal(app.lan.currentDialogue.lineIndex,start+1);
  box.events.keydown[0]({key:' ',target:box,preventDefault(){}});
  assert.equal(app.lan.currentDialogue.lineIndex,start+2);
  assert.doesNotMatch(lanSource,/event\.preventDefault\?\.\(\);const move=moveEvent/);
});

test('点击澜头像区域可推进，轻点不触发拖动，实际拖动不会误推进对白',()=>{
  const app=runtime([{id:'fixture.drag',era:'1G',location:'gallery',trigger:'companion',emotion:'warm',dialogueType:'optional',text:'第一句。\n第二句。'}]);app.lan.trigger('fixture.drag');
  const box=app.document.getElementById('lanCompanion'),handle=box.querySelector('.lan-drag-area'),start=app.lan.currentDialogue.lineIndex;
  let prevented=false;
  handle.events.pointerdown[0]({clientX:710,clientY:610,target:{closest:()=>null},preventDefault(){prevented=true}});
  assert.equal(prevented,false);
  app.document.listeners.get('pointerup')[0]();
  assert.equal(app.lan.LanMemory.lanUI.position,'bottom-right');
  clickCard(box);
  assert.equal(app.lan.currentDialogue.lineIndex,start+1);

  const dragStart=app.lan.currentDialogue.lineIndex;
  handle.events.pointerdown[0]({clientX:710,clientY:610,target:{closest:()=>null},preventDefault(){prevented=true}});
  let movePrevented=false;
  app.document.listeners.get('pointermove')[0]({clientX:730,clientY:630,preventDefault(){movePrevented=true}});
  app.document.listeners.get('pointerup')[0]();
  assert.equal(movePrevented,true);
  assert.equal(app.lan.LanMemory.lanUI.position,'custom');
  clickCard(box);
  assert.equal(app.lan.currentDialogue.lineIndex,dragStart);
});
