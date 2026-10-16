'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const scripts=['assets/js/lan-dialogue-1g.js','assets/js/lan-dialogue-2g.js','assets/js/lan-system.js'].map(path=>fs.readFileSync(path,'utf8'));
const appSource=fs.readFileSync('app.js','utf8');
const htmlSource=fs.readFileSync('index.html','utf8');
const MEMORY_KEY='commsArchive.lanMemory.v1';

class Element{constructor(){this.id='';this.dataset={};this.hidden=false;this.nodes=new Map();this.classList={toggle(){},add(){},remove(){}}}setAttribute(){}append(){}querySelector(id){if(!this.nodes.has(id))this.nodes.set(id,new Element());return this.nodes.get(id)}querySelectorAll(){return []}addEventListener(){}}
function runtime(storage=new Map()){
  const nodes=new Map(),body=new Element();body.append=el=>{el.parentElement=body;nodes.set('lanCompanion',el);nodes.set(`#${el.id}`,el)};
  const app=new Element();app.hidden=false;
  const document={body,getElementById(id){return nodes.get(id)||nodes.get(`#${id}`)||null},createElement(){return new Element()},querySelector(selector){if(selector==='#app')return app;if(selector==='#lanCaption'||selector==='#lanEmotion'||selector==='#lanVoiceNote')return nodes.get('lanCompanion')?.querySelector(selector)||null;return null}};
  const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  const progressionCalls=[],events=[];let activeDialogue='lan.2g.chapter-entry';
  const progression={state:{dialogueProgress:{get activeId(){return activeDialogue}}},completeDialogue(id){progressionCalls.push(id);if(id!==activeDialogue)return{ok:false,reason:'not active'};activeDialogue=null;return{ok:true}}};
  const window={CommsArchiveProgressManager:progression,dispatchEvent:event=>events.push(event),renderProgression(){}};
  const context={window,document,localStorage,CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},Date,JSON,String,Object,Array,Math,Set,console};
  for(const source of scripts)vm.runInNewContext(source,context);
  return{lan:window.CommsArchiveLan,events,progressionCalls,storage,progression,document};
}
function enter(rt){rt.lan.onRoute('chapter',{era:'2G'})}
function finish(rt,id){const item=rt.lan.dialogueData.find(d=>d.id===id);assert.ok(item,`missing dialogue ${id}`);const count=item.text.split('\n').length;for(let i=0;i<count;i++)rt.lan.next()}

test('首次进入2G触发故事对白并解除本时代入口门控',()=>{
  const rt=runtime();enter(rt);
  assert.equal(rt.lan.currentDialogue.id,'lan_2g_enter_001');
  assert.equal(rt.lan.currentDialogue.dialogueType,'story');
  assert.equal(rt.lan.LanDisplayMode.mode,'dialogue','2G正式入口剧情必须进入中央对白模式');
  const box=rt.document.getElementById('lanCompanion');
  assert.equal(box.dataset.mode,'dialogue','2G对白DOM必须同步为中央模式');
  assert.equal(box.parentElement,rt.document.body,'中央对白必须脱离章节侧栏容器');
  finish(rt,'lan_2g_enter_001');
  assert.deepEqual(rt.progressionCalls,['lan.2g.chapter-entry']);
  assert.ok(rt.lan.LanMemory.viewedDialogues.includes('lan_2g_enter_001'));
  assert.equal(rt.lan.currentDialogue,null,'时代入口对白结束后留在入口节点，下一步由章节按钮决定');
  assert.equal(rt.lan.LanDisplayMode.mode,'companion','2G入口剧情结束后恢复陪伴卡片');
});

test('跳过2G入口故事会记录跳过并开放探索，不重复强制播放',()=>{
  const storage=new Map(),rt=runtime(storage);enter(rt);rt.lan.skip();
  assert.ok(rt.lan.LanMemory.skippedDialogues.includes('lan_2g_enter_001'));
  assert.deepEqual(rt.progressionCalls,['lan.2g.chapter-entry']);
  const reopened=runtime(storage);enter(reopened);
  assert.notEqual(reopened.lan.currentDialogue.id,'lan_2g_enter_001');
});

test('刷新后恢复2G入口对白当前句，而不是从头重播',()=>{
  const storage=new Map(),first=runtime(storage);enter(first);first.lan.next();first.lan.next();
  const cursor=first.lan.LanMemory.currentDialogueLine;
  const reloaded=runtime(storage);enter(reloaded);
  const source=reloaded.lan.dialogueData.find(d=>d.id==='lan_2g_enter_001').text.split('\n');
  assert.equal(reloaded.lan.currentDialogue.dialogue,source[cursor]);
  assert.equal(reloaded.lan.LanMemory.lastDialogue,'lan_2g_enter_001');
});

test('2G手机、SIM卡与短信流程展品分别触发独立对白且不重复触发',()=>{
  const rt=runtime();
  const entries=[['exhibit.2g.handset','lan_2g_phone_001'],['exhibit.2g.sim','lan_2g_sim_001'],['exhibit.2g.sms','lan_2g_sms_001']];
  for(const[id,dialogueId]of entries){assert.equal(rt.lan.dispatchEvent('EXHIBIT_CLICK',{era:'2G',exhibitId:id}),true);assert.equal(rt.lan.currentDialogue.id,dialogueId);rt.lan.skip();assert.equal(rt.lan.dispatchEvent('EXHIBIT_CLICK',{era:'2G',exhibitId:id}),false)}
  assert.equal(rt.lan.LanMemory.completedTriggers.filter(id=>id.startsWith('trigger_2g_')).length,3);
});

test('短信调查开始、四类线索与真相揭晓都有独立触发',()=>{
  const rt=runtime();
  assert.equal(rt.lan.dispatchEvent('TASK_START',{era:'2G'}),true);
  assert.equal(rt.lan.currentDialogue.id,'lan_2g_task_start_001');rt.lan.skip();
  for(const clue of ['send-sms','terminal','network','smsc','number-config']){assert.equal(rt.lan.dispatchEvent('TASK_CLUE',{era:'2G',clue}),true,clue);assert.ok(rt.lan.currentDialogue.id.startsWith('lan_2g_'));rt.lan.skip()}
  assert.equal(rt.lan.dispatchEvent('TASK_REVEAL',{era:'2G'}),true);
  assert.equal(rt.lan.currentDialogue.id,'lan_2g_reveal_001');
  assert.match(rt.lan.dialogueData.find(item=>item.id==='lan_2g_reveal_001').text,/短信服务中心的转发配置异常/);
});

test('完成2G任务后按短信送达、年代总结、3G解锁对白推进',()=>{
  const rt=runtime();
  rt.lan.onTaskComplete('2G');assert.equal(rt.lan.currentDialogue.id,'lan_2g_task_complete_001');
  finish(rt,'lan_2g_task_complete_001');assert.equal(rt.lan.currentDialogue.id,'lan_2g_summary_001');
  finish(rt,'lan_2g_summary_001');assert.equal(rt.lan.currentDialogue.id,'lan_2g_unlock_3g_001');
  finish(rt,'lan_2g_unlock_3g_001');
  assert.ok(rt.lan.LanMemory.completedTriggers.includes('trigger_2g_unlock_3g'));
  assert.ok(!rt.events.some(event=>event.type==='comms-archive-lan-next'&&event.detail?.era==='3G'));
});

test('应用已将2G入口、展品、调查、技术实验室和3G过渡接入真实调用点',()=>{
  assert.match(htmlSource,/assets\/js\/lan-dialogue-2g\.js/);
  assert.match(appSource,/dispatchLanEvent\('TASK_CLUE',\{era:'2G',clue:\['terminal','network','smsc','number-config'\]\[i\]\}\)/);
  assert.doesNotMatch(appSource,/comms-archive-lan-next/);
  assert.ok(appSource.includes('function navigateChapterNext()'));
  assert.ok(appSource.includes("eras.find(item=>item.id==='2G').secondary.opts.push"));
  assert.ok(scripts[2].includes("if (era === '2G') { dispatchEvent('TASK_COMPLETE'"));
});
