'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const dataFiles=['assets/js/lan-dialogue-1g.js','assets/js/lan-dialogue-2g.js','assets/js/lan-dialogue-3g.js','assets/js/era-archive-3g.js','assets/js/lan-dialogue-3g-archive.js','assets/js/lan-dialogue-4g.js','assets/js/experience-story-4g.js','assets/js/era-archive-4g.js','assets/js/lan-system.js'];
function runtime(){const window={};const localStorage={getItem:()=>null,setItem(){}};const document={getElementById:()=>null,body:{append(){}},createElement:()=>({})};const context={window,localStorage,document,Date,JSON,String,Object,Array,Math,Set,console};for(const file of dataFiles)vm.runInNewContext(fs.readFileSync(file,'utf8'),context);return window.CommsArchiveLan;}

test('1G—4G登记对白都由兼容层输出统一字段，且原始1G文本不变',()=>{
  const lan=runtime(),source=fs.readFileSync('assets/js/lan-dialogue-1g.js','utf8');
  assert.ok(source.includes("trigger:'first_enter_1g'"));
  assert.ok(lan.dialogueData.some(item=>item.id==='lan_1g_enter_001'&&item.text.startsWith('欢迎来到通信历史的第一页。时间是20世纪80年代。')));
  for(const item of lan.dialogueData)for(const field of ['id','era','location','trigger','emotion','dialogueType','storyLine','text','next','unlockCondition'])assert.ok(Object.hasOwn(item,field),`${item.id} missing ${field}`);
  assert.equal(lan.dialogueData.find(item=>item.id==='lan_1g_enter_001').dialogueType,'story');
  assert.equal(lan.dialogueData.find(item=>item.id==='lan_1g_observe_001').dialogueType,'optional');
  assert.equal(lan.dialogueData.find(item=>item.id==='lan_3g_task_start_001').storyLine,'main');
});

test('对白规范化补齐类型与双线字段，并保留已有扩展字段',()=>{
  const lan=runtime(),item=lan.normalizeDialogue({id:'x',era:'4G',location:'task',trigger:'start_4g_task',emotion:'nostalgic',text:'保留正文',relatedTask:'task.4g.investigation'});
  assert.deepEqual({...item},{id:'x',era:'4G',location:'task',trigger:'START_4G_TASK',emotion:'nostalgia',text:'保留正文',relatedTask:'task.4g.investigation',dialogueType:'optional',storyLine:'main',dialogue:'保留正文',next:null,unlockCondition:''});
});

test('Emotion统一别名并为不在枚举内的旧值提供兼容映射',()=>{
  const lan=runtime();
  assert.equal(lan.normalizeEmotion('nostalgic'),'nostalgia');
  assert.equal(lan.normalizeEmotion('respect'),'thinking');
  assert.equal(lan.normalizeEmotion('proud'),'success');
  assert.equal(lan.normalizeEmotion('curious'),'curious');
});

test('Trigger标准化只规范4G格式，旧1G—3G标识原样兼容',()=>{
  const lan=runtime();
  assert.equal(lan.normalizeTrigger('start_4g_task','4G'),'START_4G_TASK');
  assert.equal(lan.normalizeTrigger('first_enter_1g','1G'),'first_enter_1g');
  assert.equal(lan.normalizeTrigger('CLICK_FIRST_MOBILE_INTERNET','3G'),'CLICK_FIRST_MOBILE_INTERNET');
});
