'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
class Element{constructor(){this.id='';this.dataset={};this.hidden=false;this.style={};this.nodes=new Map();this.classList={toggle(){},add(){},remove(){},contains(){return false}};this.textContent='';this.innerHTML=''}setAttribute(){}append(){}addEventListener(){}querySelector(id){if(!this.nodes.has(id))this.nodes.set(id,new Element());return this.nodes.get(id)}querySelectorAll(){return[]}}
function runtime(storage=new Map()){
  const window={},nodes=new Map(),body=new Element();body.append=node=>nodes.set(node.id,node);
  const document={body,getElementById:id=>nodes.get(id)||null,createElement:()=>new Element(),querySelector:()=>new Element()};
  const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))};
  const context={window,document,localStorage,CustomEvent:class{},Date,JSON,String,Object,Array,Math,Set,console};
  for(const file of ['assets/js/lan-dialogue-5g.js','assets/js/experience-story-5g.js','assets/js/era-archive-5g.js','assets/js/lan-system.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  return{story:window.ExperienceStory5G,lan:window.CommsArchiveLan,storage};
}
test('5G体验线覆盖交通、家庭、医疗协作和工业协作四种场景',()=>{
  const rt=runtime();assert.equal(rt.story.era,'5G');assert.deepEqual(Array.from(rt.story.nodes,node=>node.id),['experience.5g.traffic','experience.5g.home','experience.5g.medical','experience.5g.industry']);
  assert.equal(rt.lan.getExperienceStory('5G'),rt.story);
});
test('体验节点逐项保存、完成后去重，刷新后仍能恢复',()=>{
  const rt=runtime(),triggers=rt.story.nodes.map(node=>node.trigger);
  for(const trigger of triggers)assert.equal(rt.lan.completeExperienceNode(trigger,'5G'),true);
  assert.equal(rt.lan.completeExperienceNode(triggers[0],'5G'),false);
  assert.deepEqual(Array.from(rt.lan.LanMemory.completedExperienceNodes),Array.from(triggers));
  const reload=runtime(rt.storage);assert.deepEqual(Array.from(reload.lan.LanMemory.completedExperienceNodes),Array.from(triggers));
  assert.ok(reload.lan.LanMemory.completedTriggers.includes('COMPLETE_5G_EXPERIENCE'));
});
