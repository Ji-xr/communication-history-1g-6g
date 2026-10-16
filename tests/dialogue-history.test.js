'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const lanSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const dialogueSource = fs.readFileSync('assets/js/lan-dialogue-1g.js', 'utf8');
const memoryKey = 'commsArchive.lanMemory.v1';
const historyKey = 'commsArchive.lanHistory.v1';

class Element {
  constructor() { this.id=''; this.dataset={}; this.hidden=false; this.textContent=''; this.innerHTML=''; this.nodes=new Map(); this.classList={toggle(){},add(){},remove(){}}; }
  setAttribute() {} append() {}
  addEventListener() {}
  querySelector(selector) { if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector); }
  querySelectorAll() { return []; }
}
function runtime(storage=new Map()) {
  const elements=new Map(),body=new Element();body.append=element=>elements.set(element.id,element);
  const document={body,getElementById:id=>elements.get(id)||null,createElement:()=>new Element(),querySelector(selector){if(selector==='#app')return new Element();if(selector.startsWith('#lan'))return elements.get('lanCompanion')?.querySelector(selector)||null;return null;},addEventListener(){},removeEventListener(){}};
  const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))};
  const window={document,innerWidth:1000,innerHeight:800,dispatchEvent(){}};
  const context={window,document,localStorage,Date,JSON,String,Object,Array,Math,Set,console,CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}}};
  vm.runInNewContext(dialogueSource,context);vm.runInNewContext(lanSource,context);
  return {lan:window.CommsArchiveLan,window,storage};
}

test('只可浏览完整看过的对白；未看对白没有提前进入导航列表', () => {
  const app=runtime();
  app.lan.trigger('lan_1g_enter_001','1G');
  for(let i=0;i<20&&app.window.LanDisplayMode.mode==='dialogue';i++)app.lan.next();
  assert.equal(app.lan.LanMemory.viewedDialogues.includes('lan_1g_enter_001'),true);
  app.lan.toggleHistory();
  const lines=app.window.LanDialogueNavigator.lines;
  assert.ok(lines.length>1);
  assert.ok(lines.every(line=>line.id==='lan_1g_enter_001'));
  assert.equal(app.lan.LanMemory.viewedDialogues.includes('lan_1g_task_start_001'),false);
  assert.equal(lines.some(line=>line.id==='lan_1g_task_start_001'),false);
  assert.equal(app.window.LanDisplayMode.mode,'history');
});

test('上一句、下一句和jumpTo仅改变回看游标，不触发对白或改动任务状态', () => {
  const app=runtime();app.lan.trigger('lan_1g_enter_001','1G');
  for(let i=0;i<20&&app.window.LanDisplayMode.mode==='dialogue';i++)app.lan.next();
  const completedTasks=[...app.lan.LanMemory.completedTasks],completedEvents=[...app.lan.LanMemory.completedEvents];
  app.lan.toggleHistory();
  const navigator=app.window.LanDialogueNavigator,last=navigator.current;
  const previous=navigator.previous();
  assert.notEqual(previous.text,last.text);
  assert.equal(navigator.next().text,last.text);
  assert.equal(navigator.jumpTo('lan_1g_enter_001',0).lineIndex,0);
  assert.deepEqual([...app.lan.LanMemory.completedTasks],completedTasks);
  assert.deepEqual([...app.lan.LanMemory.completedEvents],completedEvents);
  assert.equal(app.lan.currentDialogue,null);
  navigator.close();
  assert.equal(app.window.LanDisplayMode.mode,'companion');
});

test('刷新后从本地历史恢复已读对白和浏览顺序', () => {
  const storage=new Map(),first=runtime(storage);first.lan.trigger('lan_1g_enter_001','1G');
  for(let i=0;i<20&&first.window.LanDisplayMode.mode==='dialogue';i++)first.lan.next();
  const refreshed=runtime(storage);refreshed.lan.toggleHistory();
  assert.ok(refreshed.window.LanDialogueNavigator.lines.length>1);
  assert.ok(refreshed.window.LanDialogueNavigator.lines.every(line=>line.id==='lan_1g_enter_001'));
  const memory=JSON.parse(storage.get(memoryKey));
  assert.ok(memory.dialogueHistory.some(item=>item.dialogueId==='lan_1g_enter_001'&&item.viewed&&item.timestamp));
  assert.ok(Array.isArray(JSON.parse(storage.get(historyKey))));
});

test('澜进度写入不会覆盖LanMemory中保存的音效偏好', () => {
  const storage=new Map([[memoryKey,JSON.stringify({settings:{audio:{enabled:false,volume:28}},completedEras:['2G']})]]);
  const app=runtime(storage);app.lan.trigger('lan_1g_enter_001','1G');app.lan.skip();
  const memory=JSON.parse(storage.get(memoryKey));
  assert.deepEqual(memory.settings.audio,{enabled:false,volume:28});
  assert.deepEqual(memory.completedEras,['2G']);
});
