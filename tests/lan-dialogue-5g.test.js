'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const scripts = ['assets/js/lan-dialogue-5g.js', 'assets/js/experience-story-5g.js', 'assets/js/era-archive-5g.js', 'assets/js/lan-system.js'];
class Element { constructor(){this.id='';this.dataset={};this.hidden=false;this.nodes=new Map();this.classList={toggle(){},add(){},remove(){}}}setAttribute(){}append(){}querySelector(id){if(!this.nodes.has(id))this.nodes.set(id,new Element());return this.nodes.get(id)}querySelectorAll(){return[]}addEventListener(){} }
function runtime(storage=new Map()){
  const nodes=new Map(),body=new Element();body.append=node=>nodes.set(node.id,node);
  const document={body,getElementById:id=>nodes.get(id)||null,createElement:()=>new Element(),querySelector:()=>new Element()};
  const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))};
  const events=[],window={dispatchEvent:event=>events.push(event)};
  const context={window,document,localStorage,CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},Date,JSON,String,Object,Array,Math,Set,console};
  scripts.forEach(file=>vm.runInNewContext(fs.readFileSync(file,'utf8'),context));
  return {window,lan:window.CommsArchiveLan,events,storage};
}
function finish(rt,id){const item=rt.window.LanDialogues5G.find(dialogue=>dialogue.id===id);assert.ok(item,id);for(let i=0;i<item.text.split('\n').length;i++)rt.lan.next()}

test('5G首次进入播放欢迎对白，跳过并刷新后不重复强制播放',()=>{
  const store=new Map(),rt=runtime(store);
  rt.lan.onRoute('chapter',{era:'5G'});
  assert.equal(rt.lan.currentDialogue.id,'lan_5g_enter_001');
  rt.lan.skip();
  assert.ok(rt.lan.LanMemory.skippedDialogues.includes('lan_5g_enter_001'));
  const reload=runtime(store);reload.lan.onRoute('chapter',{era:'5G'});
  assert.notEqual(reload.lan.currentDialogue?.id,'lan_5g_enter_001');
});

test('5G四件展品、技术资料和四条调查线索分别触发对应对白',()=>{
  const rt=runtime();
  for(const [exhibitId,id] of [['exhibit.5g.city','lan_5g_city_001'],['exhibit.5g.car','lan_5g_car_001'],['exhibit.5g.robot','lan_5g_robot_001'],['exhibit.5g.sensor','lan_5g_sensor_001']]){
    assert.equal(rt.lan.dispatchEvent('EXHIBIT_CLICK',{era:'5G',exhibitId}),true);assert.equal(rt.lan.currentDialogue.id,id);rt.lan.skip();
  }
  for(const [event,context,id] of [['TECH_START',{era:'5G'},'lan_5g_tech_001'],['TASK_START',{era:'5G'},'lan_5g_task_start_001'],['TASK_CLUE',{era:'5G',clue:'device-connection'},'lan_5g_clue_device_001'],['TASK_CLUE',{era:'5G',clue:'latency'},'lan_5g_clue_latency_001'],['TASK_CLUE',{era:'5G',clue:'edge-node'},'lan_5g_clue_edge_001'],['TASK_CLUE',{era:'5G',clue:'data-sync'},'lan_5g_clue_sync_001'],['TASK_REVEAL',{era:'5G'},'lan_5g_reveal_001']]){
    assert.equal(rt.lan.dispatchEvent(event,context),true,id);assert.equal(rt.lan.currentDialogue.id,id);rt.lan.skip();
  }
});

test('5G任务完成进入归档对白，完成归档后触发6G解锁与时代跳转',()=>{
  const rt=runtime();
  rt.lan.onTaskComplete('5G');assert.equal(rt.lan.currentDialogue.id,'lan_5g_task_complete_001');
  finish(rt,'lan_5g_task_complete_001');assert.equal(rt.lan.currentDialogue.id,'lan_5g_archive_entry_001');
  rt.lan.skip();
  for(const node of rt.window.ExperienceStory5G.nodes)rt.lan.completeExperienceNode(node.trigger,'5G');
  assert.equal(rt.lan.completeEraArchive5G({era:'5G',constructionCompleted:true,experienceCompleted:true,evidenceUnlocked:['evidence.5g.result']}),true);
  assert.equal(rt.lan.currentDialogue.id,'lan_5g_archive_complete_001');
  finish(rt,'lan_5g_archive_complete_001');assert.equal(rt.lan.currentDialogue.id,'lan_5g_unlock_6g_001');
  finish(rt,'lan_5g_unlock_6g_001');
  assert.ok(!rt.events.some(event=>event.type==='comms-archive-lan-next'&&event.detail?.era==='6G'));
  assert.ok(rt.lan.LanMemory.completedTriggers.includes('UNLOCK_6G'));
});

test('5G对白、档案与可选体验数据加载；旧归档包装器不进入正式页面',()=>{
  const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),ui=fs.readFileSync('assets/js/5g-archive-ui.js','utf8'),lan=fs.readFileSync('assets/js/lan-dialogue-5g.js','utf8');
  assert.match(html,/lan-dialogue-5g\.js/);assert.match(html,/experience-story-5g\.js/);assert.doesNotMatch(html,/5g-archive-ui\.js/);assert.match(html,/era-archive-5g\.js/);
  assert.ok(fs.existsSync('assets/js/experience-story-5g.js'));assert.ok(fs.existsSync('assets/js/5g-archive-ui.js'));
  assert.match(app,/technologyLabActions/);assert.match(app,/前往时代档案出口/);const guided=app.slice(app.indexOf('function guidedChapter('),app.indexOf('\nfunction guidedDiscoverExhibit('));assert.doesNotMatch(guided,/recordGuidedExperience|体验者记录|进入用户体验区/);
  assert.match(ui,/experienceInteractionMarkup\('5G',node,done\.has\(node\.trigger\)\)/);assert.match(lan,/联网设备可以交换状态并协同工作/);
});
