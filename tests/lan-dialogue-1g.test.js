const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const dataSource=fs.readFileSync('assets/js/lan-dialogue-1g.js','utf8');
const lanSource=fs.readFileSync('assets/js/lan-system.js','utf8');
const appSource=fs.readFileSync('app.js','utf8');
const context={window:{}};
vm.runInNewContext(dataSource,context);
const dialogues=JSON.parse(JSON.stringify(context.window.LanDialogues1G));
const triggers=JSON.parse(JSON.stringify(context.window.LanTriggers1G));
const byTrigger=id=>dialogues.find(item=>item.trigger===id);

test('六代对白文件中的1G脚本保留14段原文并加入3段生活体验对白',()=>{
  assert.equal(dialogues.length,17);
  for(const item of dialogues){for(const field of ['id','era','location','trigger','emotion','text','next','unlockCondition'])assert.ok(Object.hasOwn(item,field),`${item.id} missing ${field}`);assert.equal(item.era,'1G');assert.ok(item.text.trim())}
  assert.match(byTrigger('first_enter_1g').text,/^欢迎来到通信历史的第一页。时间是20世纪80年代。/);
  assert.match(byTrigger('click_battery').text,/强壮的手臂/);
  assert.match(byTrigger('finish_1g').text,/第一次远行/);
  for(const [nodeId,dialogueId] of [['EXPERIENCE_1G_CALL','lan_1g_experience_call_001'],['EXPERIENCE_1G_COVERAGE','lan_1g_experience_coverage_001'],['EXPERIENCE_1G_RECONNECT','lan_1g_experience_reconnect_001']]){
    assert.ok(dialogues.some(item=>item.id===dialogueId&&item.location==='experience'&&item.storyLine==='experience'));
    assert.ok(triggers.some(item=>item.event==='EXPERIENCE_NODE'&&item.condition.nodeId===nodeId&&item.dialogueId===dialogueId));
  }
});

test('入口欢迎只在首次进入触发，且保留既有ProgressValidator对白门控',()=>{
  const entry=triggers.find(item=>item.event==='ENTER_ERA');
  assert.deepEqual(entry.condition,{era:'1G',firstEnter:true});
  assert.ok(lanSource.includes("dispatchEvent('ENTER_ERA', { era:'1G', firstEnter:true })"));
  assert.ok(lanSource.includes("completeDialogue(chapterEntryId,{holdCurrent:true})"));
  assert.ok(lanSource.includes('function progressionEntryId(dialogue)'));
  assert.ok(lanSource.includes("/^lan_([1-6])g_enter_001$/"));
});

test('展品、天线与电池线索分别绑定到稳定事件和展品ID',()=>{
  assert.equal(triggers.find(item=>item.id==='trigger_1g_phone').condition.exhibitId,'exhibit.1g.handset');
  assert.equal(triggers.find(item=>item.id==='trigger_1g_antenna').condition.detail,'antenna');
  assert.equal(triggers.find(item=>item.id==='trigger_1g_battery').condition.detail,'battery');
  assert.ok(appSource.includes('EXHIBIT_DETAIL')&&appSource.includes('antenna'));
  assert.ok(appSource.includes('EXHIBIT_DETAIL')&&appSource.includes('battery'));
});

test('技术实验室、技术难点、任务开始与调查线索都有实际调用位置',()=>{
  for(const [event,needle] of [
    ['TECH_START',"dispatchLanEvent('TECH_START',{era})"],
    ['TECH_PROBLEM','TECH_PROBLEM'],
    ['TASK_START',"if(targetKey==='investigation')dispatchLanEvent('TASK_START',{era})"],
    ['TASK_REVEAL',"dispatchLanEvent('TASK_REVEAL',{era})"],
    ['TASK_CLUE',"dispatchLanEvent('TASK_CLUE',{era:'1G',clue:'base-station'})"]
  ]){assert.ok(triggers.some(item=>item.event===event));assert.ok(needle instanceof RegExp?needle.test(appSource):appSource.includes(needle),`${event} is not wired`)}
  assert.ok(lanSource.includes("activeDialogue?.id==='lan_1g_issue_001'"),'完成1G调查分析对白后自动展示原有完成反馈')
});

test('归档对白保留完成任务与解锁2G反馈，章节切换由手动导航按钮负责',()=>{
  assert.ok(triggers.some(item=>item.event==='TASK_COMPLETE'&&item.dialogueId==='lan_1g_task_complete_001'));
  assert.ok(triggers.some(item=>item.event==='ERA_ARCHIVE'&&item.dialogueId==='lan_1g_summary_001'));
  assert.ok(triggers.some(item=>item.event==='ERA_UNLOCK'&&item.dialogueId==='lan_1g_unlock_2g_001'));
  assert.ok(lanSource.includes("activeDialogue?.next?.startsWith('ENTER_ERA:')"));
  assert.doesNotMatch(appSource,/comms-archive-lan-next/);
  assert.ok(appSource.includes('function navigateChapterNext()'));
});

test('刷新可恢复尚未读完的1G触发对白，已读记录放入澜独立本地记忆',()=>{
  assert.ok(lanSource.includes("const MEMORY_KEY = 'commsArchive.lanMemory.v1'"));
  assert.ok(lanSource.includes('function pending1GDialogue()'));
  assert.ok(lanSource.includes('if (pending) trigger(pending.id,\'1G\')'));
  assert.ok(lanSource.includes('memory.completedEvents.push(activeDialogue.id)'));
  assert.ok(!lanSource.includes("localStorage.setItem('commsArchive', JSON.stringify(memory))"));
});

test('兼容LanSystem.setEmotion接口并保留原有CommsArchiveLan入口',()=>{
  assert.ok(lanSource.includes('function setEmotion(emotion)'));
  assert.ok(lanSource.includes('root.LanSystem = root.CommsArchiveLan'));
  assert.ok(lanSource.includes('dispatchEvent, setEmotion'));
});
