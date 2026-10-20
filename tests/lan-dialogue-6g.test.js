'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const files=['assets/js/lan-dialogue-6g.js','assets/js/experience-story-6g.js','assets/js/era-archive-6g.js','assets/js/lan-system.js'];
class Element{constructor(){this.id='';this.dataset={};this.hidden=false;this.style={};this.nodes=new Map();this.classList={toggle(){},add(){},remove(){}}}setAttribute(){}append(){}addEventListener(){}querySelector(id){if(!this.nodes.has(id))this.nodes.set(id,new Element());return this.nodes.get(id)}querySelectorAll(){return[]}}
function runtime(storage=new Map()){const nodes=new Map(),body=new Element();body.append=node=>nodes.set(node.id,node);const document={body,getElementById:id=>nodes.get(id)||null,createElement:()=>new Element(),querySelector:()=>new Element()};const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))};const events=[],window={dispatchEvent:event=>events.push(event)};const context={window,document,localStorage,CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},Date,JSON,String,Object,Array,Math,Set,console};for(const file of files)vm.runInNewContext(fs.readFileSync(file,'utf8'),context);return{window,lan:window.CommsArchiveLan,events,storage}}
test('6G对白使用统一字段，进入、任务、调查和归档触发均可匹配',()=>{const rt=runtime();assert.ok(rt.window.LanDialogues6G.length>=10);for(const item of rt.window.LanDialogues6G){for(const key of ['id','era','location','trigger','emotion','dialogueType','storyLine','text'])assert.ok(item[key],`${item.id} missing ${key}`);assert.equal(item.era,'6G')}assert.equal(rt.lan.dispatchEvent('TASK_CLUE',{era:'6G',clue:'ai-model'}),true);assert.equal(rt.lan.currentDialogue.id,'lan_6g_check_ai_001')});
test('未完成5G归档时阻止6G入口，5G完成后首次进入触发欢迎对白',()=>{const store=new Map(),rt=runtime(store);rt.lan.onRoute('chapter',{era:'6G'});assert.equal(rt.lan.currentDialogue.id,'lan.6g.locked');store.set('commsArchive.lanMemory.v1',JSON.stringify({...rt.lan.LanMemory,completedEras:['5G']}));const unlocked=runtime(store);unlocked.lan.onRoute('chapter',{era:'6G'});assert.equal(unlocked.lan.currentDialogue.id,'lan_6g_enter_001');assert.ok(unlocked.lan.LanMemory.completedTriggers.includes('ENTER_6G'))});
test('6G对白、研究档案与体验先于LanSystem加载；不加载旧归档包装器', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const app = fs.readFileSync('app.js', 'utf8');
  const ui = fs.readFileSync('assets/js/6g-archive-ui.js', 'utf8');
  const lan = fs.readFileSync('assets/js/lan-system.js', 'utf8');
  const dialogue = html.indexOf('lan-dialogue-6g.js');
  const archive = html.indexOf('era-archive-6g.js');
  const experience = html.indexOf('experience-story-6g.js');
  const system = html.indexOf('lan-system.js');
  const appIndex = html.indexOf('app.js');
  assert.ok(dialogue >= 0 && dialogue < archive && archive < system && system < appIndex);
  assert.ok(experience >= 0 && experience < system);
  assert.doesNotMatch(html, /6g-archive-ui\.js/);
  assert.match(html, /COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED=false/);
  assert.ok(fs.existsSync('assets/js/experience-story-6g.js'));
  assert.ok(fs.existsSync('assets/js/6g-archive-ui.js'));
  assert.match(app, /function archiveExitContent\(/);
  assert.match(app, /openEraExperience/);
  assert.match(ui, /completeEraArchive6G/);
  assert.match(lan, /FINAL_STORY_READY/);
  assert.match(ui, /研究阶段/);
});
