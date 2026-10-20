'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/lan-system.js', 'utf8');
function between(text, start, end) {
  const from = text.indexOf(start), to = text.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing LanSystem segment: ${start}`);
  return text.slice(from, to).trim();
}
function declaration(name, next) { return between(source, `  function ${name}(`, `\n  function ${next}(`); }

const normalize = between(source, '  const DIALOGUE_TYPES =', '  const dialogueData = []');
const centralLocations = between(source, '  const CENTRAL_DIALOGUE_LOCATIONS=', '\n  function priorityDialogue(');
const dialogueFunctions = [
  centralLocations,
  declaration('priorityDialogue', 'setDisplayMode'),
  declaration('setDisplayMode', 'setDialoguePhase'),
  declaration('setDialoguePhase', 'setDisplayPreference'),
  declaration('applySavedLanPosition', 'updateWidget'),
  declaration('show', 'find'),
  declaration('advanceFromUser', 'trigger'),
  declaration('next', 'returnToCompanion'),
  declaration('returnToCompanion', 'dismissRouteDialogue'),
  declaration('skip', 'replayLastSkipped')
].join('\n');

function createDialogueRuntime() {
  const modes = new Set(), bodyModes = new Set();
  const makeClassList = set => ({
    toggle(name, force) { if (force) set.add(name); else set.delete(name); },
    add(name) { set.add(name); }, remove(name) { set.delete(name); }, contains(name) { return set.has(name); }
  });
  const caption = { textContent: '' }, expand = { setAttribute() {} }, revisit = { hidden: true };
  const app = { hidden: false };
  const box = {
    dataset: {}, style: { left: '222px', top: '111px', right: 'auto', bottom: 'auto' }, hidden: false, parentElement: null, classList: makeClassList(modes),
    querySelector(selector) { return selector === '.lan-open' ? expand : selector === '#lanCaption' ? caption : selector === '#lanRevisitButton' ? revisit : null; }
  };
  const slot = { append(element) { element.parentElement = this; } };
  const body = { classList: makeClassList(bodyModes), append(element) { element.parentElement = this; } };
  const document = { body, getElementById(id) { return id === 'lanCompanion' ? box : id === 'progressLanSlot' ? slot : null; }, querySelector(selector) { return selector === '#app' ? app : null; } };
  const window = { InteractionDebugger: { record() {} }, AudioSystem: { playEffect() {} }, dispatchEvent() { return true; }, renderProgression() { context.progressionRefreshCount = (context.progressionRefreshCount || 0) + 1; } };
  const context = vm.createContext({
    window, root: window, document, console, Date, Math, String, Number, Object, Array, Set,
    DIALOGUE_TYPES: ['story', 'hint', 'optional', 'choice'], STORY_LINES: ['main', 'builder', 'experience', 'archive'],
    EMOTIONS: ['expecting', 'research', 'thinking', 'nostalgia', 'warm', 'encourage', 'success', 'happy', 'curious'],
    LanDisplayMode: { mode: 'companion', preference: 'auto' }, lanDialoguePhase: { phase: 'exit', sequenceId: null }, lastAdvanceInputAt: 0,
    LAN_CORNERS: ['bottom-right', 'bottom-left', 'top-left', 'top-right'],
    mounted: true, queue: [], queueIndex: 0, queueDisplayMode: 'companion', collapsed: false,
    collapseAfterDialogue: false, continueDialoguePresentation: false,
    settings: {}, memory: { completedEvents: [], completedTriggers: [], currentDialogue: '', currentDialogueLine: 0, lastDialogue: '', skippedDialogues: [], viewedDialogues: [], dialogueHistory: [], lanUI: { position: 'custom', x: 45, y: 70 }, settings: {} },
    history: [], model: null,
    makeRoot: () => box,
    updateWidget(entry) { context.lastDisplayedLine = entry.dialogue; context.setDisplayMode(context.queue.length ? context.queueDisplayMode : (context.priorityDialogue(entry) ? 'dialogue' : 'companion')); caption.textContent = entry.dialogue; },
    persistHistory(entry) { context.history.push(entry); }, refreshHistory() {}, saveMemory() {}, stopSpeechForPageHide() {},
    isEraLine() { return false; }, progressionEntryId() { return null; }, find() { return null; },
    recordDialogueAction() {}, syncCardPrompt() {}, syncCollapseControl() {},
    priorityDialogue() {}, setDisplayMode() {}, setDialoguePhase() {}
  });
  vm.runInContext(normalize, context, { filename: 'lan-system.js:normalize' });
  vm.runInContext(dialogueFunctions, context, { filename: 'lan-system.js:dialogue-flow' });
  return { context, box, bodyModes, modes, caption, slot, body };
}

test('独立互动使用同一个澜面板：开场居中、短反馈陪伴、结束不写主线记忆也不导航',()=>{
 const {context,box}=createDialogueRuntime(),before=JSON.stringify(context.memory);
 vm.runInContext("showInteractionFeedback({era:'6G',event:'enter',text:'未来研究情境。',story:true})",context);
 assert.equal(box.dataset.mode,'dialogue');assert.equal(context.history.length,0);
 assert.equal(vm.runInContext("showInteractionFeedback({era:'6G',event:'apply',text:'刚应用参数。'})",context),false,'不能打断正在阅读的正式对白');
 vm.runInContext('next()',context);assert.equal(context.queue.length,0);assert.equal(box.dataset.mode,'companion');
 vm.runInContext("showInteractionFeedback({era:'6G',event:'apply',text:'参数已应用。'})",context);assert.equal(box.dataset.mode,'companion');
 vm.runInContext("showInteractionFeedback({era:'6G',event:'end',text:'模型比较结束。',story:true})",context);assert.equal(box.dataset.mode,'dialogue');
 vm.runInContext('skip()',context);assert.equal(context.queue.length,0);assert.equal(box.dataset.mode,'companion');assert.equal(JSON.stringify(context.memory),before);assert.equal(context.progressionRefreshCount||0,0);
});

test('重要体验对白即使是optional也进入中央模式，普通展品补充仍为陪伴卡片', () => {
  const runtime = createDialogueRuntime(), { context } = runtime;
  const experienceLine = { id: 'experience_line', era: '4G', location: 'experience', trigger: 'EXPERIENCE_NODE', dialogueType: 'optional', storyLine: 'experience', text: '体验内容。' };
  const exhibitLine = { id: 'exhibit_line', era: '4G', location: 'exhibit', trigger: 'VIEW_4G_PHONE', dialogueType: 'optional', storyLine: 'main', text: '展品补充。' };
  assert.equal(vm.runInContext(`priorityDialogue(${JSON.stringify(experienceLine)})`, context), true);
  assert.equal(vm.runInContext(`priorityDialogue(${JSON.stringify(exhibitLine)})`, context), false);
  vm.runInContext(`show(${JSON.stringify(experienceLine)})`, context);
  assert.equal(context.LanDisplayMode.mode, 'dialogue');
  assert.equal(runtime.box.dataset.mode, 'dialogue');
  assert.ok(runtime.bodyModes.has('lan-dialogue-active'));
  vm.runInContext('next()', context);
  assert.equal(context.LanDisplayMode.mode, 'companion', '中央剧情队列完成后先恢复陪伴模式');
  vm.runInContext(`show(${JSON.stringify(exhibitLine)})`, context);
  assert.equal(context.LanDisplayMode.mode, 'companion');
});

test('连续中央对白保持同一显示模式，队列结束后回到陪伴卡片', () => {
  const runtime = createDialogueRuntime(), { context, box } = runtime;
  const story = { id: 'lan_task_sequence', era: '3G', location: 'task', trigger: 'TASK_START', dialogueType: 'hint', storyLine: 'builder', text: '第一句。\n第二句。' };
  vm.runInContext(`show(${JSON.stringify(story)})`, context);
  assert.equal(context.LanDisplayMode.mode, 'dialogue');
  assert.equal(box.dataset.dialoguePhase, 'enter');
  vm.runInContext('next()', context);
  assert.equal(context.lastDisplayedLine, '第二句。');
  assert.equal(context.LanDisplayMode.mode, 'dialogue');
  assert.equal(box.dataset.dialoguePhase, 'talking');
  vm.runInContext('next()', context);
  assert.equal(context.LanDisplayMode.mode, 'companion');
  assert.equal(box.dataset.mode, 'companion');
  assert.ok(!runtime.bodyModes.has('lan-dialogue-active'));
});

test('最后一句结束时立即刷新章节状态，不要求额外点击空白澜卡片', () => {
  const { context } = createDialogueRuntime();
  const story = { id: 'lan_node_completion', era: '2G', location: 'entrance', trigger: 'ENTER_2G', dialogueType: 'story', text: '第一句。\n最后一句。' };
  vm.runInContext(`show(${JSON.stringify(story)})`, context);
  vm.runInContext('next()', context);
  assert.equal(context.progressionRefreshCount || 0, 0, '读到最后一句时不能提前释放节点');
  vm.runInContext('next()', context);
  assert.equal(context.queue.length, 0);
  assert.equal(context.LanDisplayMode.mode, 'companion');
  assert.equal(context.progressionRefreshCount, 1, '最后一句的这一次点击就更新节点导航状态');
});

test('跳过整段对白时也立即刷新章节状态', () => {
  const { context } = createDialogueRuntime();
  const story = { id: 'lan_node_skip', era: '5G', location: 'task', trigger: 'TASK_START', dialogueType: 'story', text: '调查引导。' };
  vm.runInContext(`show(${JSON.stringify(story)})`, context);
  vm.runInContext('skip()', context);
  assert.equal(context.queue.length, 0);
  assert.equal(context.LanDisplayMode.mode, 'companion');
  assert.equal(context.progressionRefreshCount, 1);
});

test('1G实验室剧情即使缺少dialogueType也不能被调用方降级到陪伴卡片', () => {
  const runtime = createDialogueRuntime(), { context, box } = runtime;
  const legacyLabLine = { id: 'lan_1g_lab_001', era: '1G', location: 'laboratory', trigger: 'enter_technology_lab', text: '我们先一起检查这套通信设备。' };
  assert.equal(context.priorityDialogue(legacyLabLine), true);
  vm.runInContext(`show(${JSON.stringify(legacyLabLine)}, {}, 'companion')`, context);
  assert.equal(context.LanDisplayMode.mode, 'dialogue');
  assert.equal(box.dataset.mode, 'dialogue');
  assert.equal(box.parentElement, runtime.body);
  assert.equal(box.style.left, '', '中央模式应清除拖动保存的角落坐标');
  assert.equal(box.style.top, '');
});

test('首次进入首页的档案缺失介绍进入中央剧情模式', () => {
  const { context } = createDialogueRuntime();
  const welcome = { id: 'lan.home.first-visit', location: 'home', trigger: 'first-visit', text: '我们一起补全通信历史中的生活体验。' };
  assert.equal(context.priorityDialogue(welcome), true);
  vm.runInContext(`show(${JSON.stringify(welcome)}, {}, 'companion')`, context);
  assert.equal(context.LanDisplayMode.mode, 'dialogue');
});

test('离开中央对白后重新挂回陪伴槽并恢复用户保存的位置', () => {
  const runtime = createDialogueRuntime(), { context, box, slot } = runtime;
  const story = { id: 'central_story', era: '2G', location: 'entrance', trigger: 'ENTER_2G', dialogueType: 'story', text: '剧情对白。' };
  vm.runInContext(`show(${JSON.stringify(story)})`, context);
  assert.equal(box.parentElement, runtime.body);
  vm.runInContext('next()', context);
  assert.equal(context.LanDisplayMode.mode, 'companion');
  assert.equal(box.parentElement, slot);
  assert.equal(box.style.left, '45px');
  assert.equal(box.style.top, '70px');
});

test('章节重绘请求陪伴模式时，正在播放的中央剧情仍保持中央', () => {
  const runtime = createDialogueRuntime(), { context, box } = runtime;
  const story = { id: 'lan_redraw_story', era: '5G', location: 'task-analysis', trigger: 'TASK_REVEAL', dialogueType: 'hint', storyLine: 'builder', text: '正在分析关键线索。' };
  vm.runInContext(`show(${JSON.stringify(story)})`, context);
  vm.runInContext("setDisplayMode('companion')", context);
  assert.equal(context.LanDisplayMode.mode, 'dialogue');
  assert.equal(box.dataset.mode, 'dialogue');
  assert.equal(box.parentElement, runtime.body);
});

test('点击对白主体推进下一句，快速重复输入不会重复推进', () => {
  const runtime = createDialogueRuntime(), { context } = runtime;
  const story = { id: 'lan_click_story', era: '6G', location: 'ending', trigger: 'FINAL_STORY', dialogueType: 'story', text: '第一句。\n第二句。' };
  vm.runInContext(`show(${JSON.stringify(story)})`, context);
  assert.equal(vm.runInContext('advanceFromUser()', context), undefined);
  assert.equal(context.lastDisplayedLine, '第二句。');
  assert.equal(vm.runInContext('advanceFromUser()', context), false, '160ms内的重复点击应被去抖');
  assert.equal(context.LanDisplayMode.mode, 'dialogue');
});

test('跳过整段剧情后释放暗幕并恢复陪伴卡片', () => {
  const runtime = createDialogueRuntime(), { context, box, bodyModes, slot } = runtime;
  const story = { id: 'lan_skip_story', era: '4G', location: 'experience', trigger: 'EXPERIENCE_START', dialogueType: 'story', storyLine: 'experience', text: '第一句。\n第二句。' };
  vm.runInContext(`show(${JSON.stringify(story)})`, context);
  vm.runInContext('skip()', context);
  assert.equal(context.LanDisplayMode.mode, 'companion');
  assert.equal(box.dataset.mode, 'companion');
  assert.equal(box.parentElement, slot);
  assert.equal(context.queue.length, 0);
  assert.ok(!bodyModes.has('lan-dialogue-active'));
});

test('1G至6G体验节点对白的location与storyLine均被统一判定为中央剧情', () => {
  const dataWindow = {};
  for (const file of ['lan-dialogue-1g.js', 'lan-dialogue-2g.js', 'lan-dialogue-3g.js', 'lan-dialogue-4g.js', 'lan-dialogue-5g.js', 'lan-dialogue-6g.js']) {
    vm.runInNewContext(fs.readFileSync(`assets/js/${file}`, 'utf8'), { window: dataWindow }, { filename: file });
  }
  const runtime = createDialogueRuntime(), { context } = runtime;
  const lines = [dataWindow.LanDialogues1G, dataWindow.LanDialogues2G, dataWindow.LanDialogues3G, dataWindow.LanDialogues4G, dataWindow.LanDialogues5G, dataWindow.LanDialogues6G].flat().filter(item => item.location === 'experience');
  assert.ok(lines.length >= 16);
  for (const line of lines) assert.equal(context.priorityDialogue(line), true, `${line.id} 应进入中央模式`);
});
