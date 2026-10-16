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
  return{window,lan:window.CommsArchiveLan,storage};
}
test('5G归档清楚区分4G内容消费与5G设备系统协作，并保留证据关联',()=>{
  const {window}=runtime(),archive=window.EraArchive5G;
  assert.equal(archive.id,'archive_5g');assert.equal(archive.title,'万物互联');assert.match(archive.summary,/人与设备/);assert.match(archive.experience,/智慧交通/);
  assert.deepEqual(Array.from(archive.evidence,item=>item.evidenceId),['evidence.5g.result']);
  assert.equal(archive.evidence[0].sourceTask,'task.5g.investigation');assert.equal(archive.evidence[0].exhibitId,'exhibit.5g.factory');assert.equal(archive.evidence[0].flowId,'flow.5g.communication');
});
test('5G归档需要建设任务、全部体验节点和证据，且只保存一次',()=>{
  const store=new Map(),rt=runtime(store),context={era:'5G',constructionCompleted:true,experienceCompleted:true,evidenceUnlocked:['evidence.5g.result']};
  assert.equal(rt.lan.completeEraArchive5G(context),false);rt.lan.onTaskComplete('5G');
  for(const node of rt.window.ExperienceStory5G.nodes)rt.lan.completeExperienceNode(node.trigger,'5G');
  assert.equal(rt.lan.completeEraArchive5G(context),true);assert.equal(rt.lan.completeEraArchive5G(context),false);
  assert.equal(rt.lan.LanMemory.eraArchives.filter(item=>item.archiveId==='archive_5g').length,1);
  const reload=runtime(store);assert.equal(reload.window.EraArchive5G.completed,true);assert.ok(reload.lan.LanMemory.completedEras.includes('5G'));
  assert.deepEqual(Array.from(reload.lan.LanMemory.eraArchives[0].evidenceUnlocked),['evidence.5g.result']);
});
