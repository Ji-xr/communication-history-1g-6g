'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProgression } = require('../assets/js/progression-manager.js');

const appSource = fs.readFileSync('app.js', 'utf8');
const lanSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const eras = ['1G', '2G', '3G', '4G', '5G', '6G'];
const lanFiles = eras.map(era => `assets/js/lan-dialogue-${era.toLowerCase()}.js`);

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `Missing source section: ${startMarker}`);
  return source.slice(start, end).trim();
}

const eraSource = between(appSource, 'const eras=[', "\neras.find(item=>item.id==='2G')");
const hallSource = between(appSource, 'const hallDeepening={', '\nfunction exhibitThumbnail(');
const guidedSource = [
  eraSource,
  hallSource,
  between(appSource, 'function eraArrivalResolved(', '\nfunction guidedChapter('),
  between(appSource, 'function guidedChapter(', '\nfunction guidedDiscoverExhibit('),
  'globalThis.__renderGuidedChapter = guidedChapter; globalThis.__eras = eras; globalThis.__hallDeepening = hallDeepening;'
].join('\n');

function makeState() {
  return { visited: [], completed: [], order: [], clues: {}, logs: [], tasks: {}, evidence: [] };
}

function makeRenderHarness(era, key, lanMemory) {
  const state = makeState();
  const exhibitsByEra = Object.fromEntries(eras.map(id => [id, []]));
  const dataContext = vm.createContext({});
  vm.runInContext(`${eraSource}\nglobalThis.__eras=eras;`, dataContext);
  vm.runInContext(`${hallSource}\nglobalThis.__hall=hallDeepening;`, dataContext);
  for (const id of eras) exhibitsByEra[id] = Array.from(dataContext.__hall[id].exhibits || [], item => item.id);
  const progression = createProgression(state, { exhibitsByEra });
  for (const node of progression.state.eras[era].nodes) {
    node.status = node.key === key ? 'ACTIVE' : node.key === 'entry' && key !== 'entry' ? 'COMPLETED' : 'AVAILABLE';
  }
  progression.state.currentEra = era;
  progression.state.currentNode = `${era.toLowerCase()}_${key}`;
  const window = {
    CommsArchiveLan: { LanMemory: lanMemory, debugSnapshot: () => ({ isPlaying: false }) },
    DemoManager: { isActive: () => false, state: { routeMode: 'free' } }
  };
  const context = vm.createContext({
    state, progression, window,
    eraIndex: eras.indexOf(era), selected: null, secondSelected: null, taskStep: 0,
    flowStepIndex: 0, understandingSelected: null, designResponse: '',
    progressionEraAllowed: () => ({ ok: true, reason: '' }),
    guidedNodeRailMarkup: () => '', chapterNavigationMarkup: () => '',
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); },
    mediaAssets: Object.fromEntries(eras.map(id => [id, { photo: null, photoNote: '情境示意', photoTitle: '', photoSource: '', photoLicense: '', photoCredit: '' }]))
  });
  vm.runInContext(guidedSource, context, { filename: 'app.js:narrative-render' });
  return { context, progression, state, render: () => context.__renderGuidedChapter() };
}

class Element {
  constructor() {
    this.id = ''; this.dataset = {}; this.style = {}; this.hidden = false; this.textContent = '';
    this.nodes = new Map(); this.classList = { toggle() {}, add() {}, remove() {}, contains() { return false; } };
  }
  setAttribute() {}
  append(element) { element.parentElement = this; }
  querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
  querySelectorAll() { return []; }
  addEventListener() {}
}

function makeLanRuntime(era, { store = new Map(), progression = null } = {}) {
  const nodes = new Map(), body = new Element(), app = new Element();
  app.hidden = false;
  body.append = element => { element.parentElement = body; nodes.set(element.id, element); };
  const slot = new Element(); slot.id = 'progressLanSlot';
  const document = {
    body,
    getElementById(id) { return nodes.get(id) || (id === 'progressLanSlot' ? slot : null); },
    createElement() { return new Element(); },
    querySelector(selector) { return selector === '#app' ? app : nodes.get('lanCompanion')?.querySelector(selector) || null; },
    querySelectorAll(selector) { return selector === '#lanCompanion' && nodes.has('lanCompanion') ? [nodes.get('lanCompanion')] : []; },
    addEventListener() {}
  };
  const localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) };
  const currentProgression = progression || {
    state: { dialogueProgress: { activeId: `lan.${era.toLowerCase()}.chapter-entry` } },
    completed: [],
    completeDialogue(id) { if (id !== this.state.dialogueProgress.activeId) return { ok: false }; this.state.dialogueProgress.activeId = null; this.completed.push(id); return { ok: true }; }
  };
  let renderCount = 0;
  const window = {
    CommsArchiveProgressManager: currentProgression,
    InteractionDebugger: { record() {} },
    AudioSystem: { playEffect() {}, setEra() {} },
    dispatchEvent() { return true; },
    renderProgression() { renderCount++; }
  };
  const context = { window, document, localStorage, CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }, Date, JSON, String, Number, Math, Object, Array, Set, console };
  for (const file of lanFiles) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  vm.runInNewContext(lanSource, context, { filename: 'assets/js/lan-system.js' });
  return { lan: window.CommsArchiveLan, window, document, progression: currentProgression, store, get renderCount() { return renderCount; } };
}

function finishDialogue(runtime, id) {
  const item = runtime.lan.dialogueData.find(dialogue => dialogue.id === id);
  assert.ok(item, `Missing dialogue ${id}`);
  for (const _line of String(item.text).split('\n')) runtime.lan.next();
}

const arrivalFirstLines = {
  '1G': /^欢迎来到通信历史的第一页。时间是20世纪80年代。/,
  '2G': /^欢迎来到2G时代。时间是20世纪90年代。/,
  '3G': /^欢迎来到3G时代，时间来到21世纪初。/,
  '4G': /^欢迎来到4G时代，时间来到2010年代。/,
  '5G': /^欢迎来到5G时代。这里是当代通信持续演进的现场。/,
  '6G': /^欢迎来到6G研究情境。这里呈现的是探索方向/,
};

test('1G至6G首次进入时实际先播放本时代抵达对白，重复渲染不会重复触发', () => {
  for (const era of eras) {
    const store = new Map();
    if (era === '6G') store.set('commsArchive.lanMemory.v1', JSON.stringify({ completedEras: ['5G'] }));
    const runtime = makeLanRuntime(era, { store });
    runtime.lan.onRoute('chapter', { era });
    const expectedId = `lan_${era.toLowerCase()}_enter_001`;
    assert.equal(runtime.lan.currentDialogue?.id, expectedId, `${era} should start at its arrival dialogue`);
    assert.match(runtime.lan.currentDialogue.dialogue, arrivalFirstLines[era], `${era} arrival must identify era/time before story details`);
    assert.equal(runtime.lan.LanDisplayMode.mode, 'dialogue');
    runtime.lan.onRoute('chapter', { era });
    assert.equal(runtime.lan.currentDialogue?.id, expectedId, `${era} rerender must not restart or replace the arrival line`);
    finishDialogue(runtime, expectedId);
    assert.ok(runtime.lan.LanMemory.viewedDialogues.includes(expectedId), `${era} arrival read state is preserved`);
    assert.equal(runtime.lan.currentDialogue, null, `${era} does not auto-play a second line after the arrival`);
    assert.equal(runtime.lan.LanDisplayMode.mode, 'companion');
    runtime.lan.onRoute('eras', {});
    runtime.lan.onRoute('chapter', { era });
    assert.notEqual(runtime.lan.currentDialogue?.id, expectedId, `${era} return does not replay the completed welcome`);
  }
});

test('时代开场说明背景但不提前复述现场异常', () => {
  const incidentDetails = {
    '1G': ['呼叫没有接通'],
    '2G': ['短信已从终端提交', '迟迟没有送达'],
    '3G': ['网页', '图片'],
    '4G': ['体育直播突然停住', '缓冲图标不断旋转'],
    '5G': ['机械臂没有按时响应'],
    '6G': ['测试车已驶过路口', '数字模型里的车辆却仍停在原地']
  };
  for (const era of eras) {
    const store = new Map();
    if (era === '6G') store.set('commsArchive.lanMemory.v1', JSON.stringify({ completedEras: ['5G'] }));
    const runtime = makeLanRuntime(era, { store });
    runtime.lan.onRoute('chapter', { era });
    const arrival = runtime.lan.currentDialogue;
    assert.equal(arrival?.id, `lan_${era.toLowerCase()}_enter_001`);
    for (const detail of incidentDetails[era]) {
      assert.equal(arrival.dialogue.includes(detail), false, `${era}开场不应提前复述现场异常：${detail}`);
    }
  }
});

test('同一时代遗留的待播任务对白不能排在尚未读过的时代抵达对白之前', () => {
  const store = new Map([['commsArchive.lanMemory.v1', JSON.stringify({
    completedTriggers: ['trigger_2g_task_start'], completedEvents: ['trigger_2g_task_start'],
    currentDialogue: 'lan_2g_task_start_001', currentDialogueLine: 1
  })]]);
  const runtime = makeLanRuntime('2G', { store });
  runtime.lan.onRoute('chapter', { era: '2G' });
  assert.equal(runtime.lan.currentDialogue?.id, 'lan_2g_enter_001');
  assert.match(runtime.lan.currentDialogue.dialogue, arrivalFirstLines['2G']);
});

test('刷新恢复本时代未读入口当前句，不串入其他时代对白', () => {
  for (const era of eras) {
    const store = new Map();
    if (era === '6G') store.set('commsArchive.lanMemory.v1', JSON.stringify({ completedEras: ['5G'] }));
    const first = makeLanRuntime(era, { store });
    first.lan.onRoute('chapter', { era });
    first.lan.next();
    const opening = first.lan.dialogueData.find(item => item.id === `lan_${era.toLowerCase()}_enter_001`);
    const savedLine = first.lan.LanMemory.currentDialogueLine;
    const restored = makeLanRuntime(era, { store });
    restored.lan.onRoute('chapter', { era });
    assert.equal(restored.lan.currentDialogue.id, opening.id);
    assert.equal(restored.lan.currentDialogue.dialogue, opening.text.split('\n')[savedLine]);
  }
});

test('页面正文等时代开场读完后才显示事件记录；场景与调查不重复铺陈同一事件', () => {
  for (const era of eras) {
    const memory = { completedEvents: [], viewedDialogues: [], skippedDialogues: [] };
    const entry = makeRenderHarness(era, 'entry', memory);
    let markup = entry.render();
    assert.match(markup, new RegExp(`${era} ·`));
    assert.match(markup, /请先阅读澜的时代开场/);
    assert.doesNotMatch(markup, /现场记录：/);
    memory.completedEvents.push(`lan_${era.toLowerCase()}_enter_001`);
    markup = entry.render();
    assert.match(markup, /现场记录：/);
    assert.ok(markup.includes(entry.context.__eras.find(item => item.id === era).open), `${era} arrival renders actual event record`);
    assert.equal(markup.split(entry.context.__eras.find(item => item.id === era).open).length - 1, 1, `${era} entry shows the event once`);

    const scene = makeRenderHarness(era, 'scene', memory);
    assert.doesNotMatch(scene.render(), new RegExp(escapeRegExp(entry.context.__eras.find(item => item.id === era).open)), `${era} incident is not repeated in the next node`);
  }
  const memory = { completedEvents: ['lan_2g_enter_001'], viewedDialogues: ['lan_2g_enter_001'], skippedDialogues: [] };
  const investigation = makeRenderHarness('2G', 'investigation', memory);
  const markup = investigation.render();
  assert.match(markup, /沿着短信经过的环节逐步检查，找出信息停留在哪里/);
  assert.doesNotMatch(markup, /情境记录显示：一条短信已从终端提交/);
  const exhibitBody = between(appSource, 'function renderExhibitBody(', '\nfunction technicalChallengeSection(');
  assert.doesNotMatch(exhibitBody, /\$\{e\.open\}/, '展品详情不再把同一现场事件当作时代背景重复展示');
});

function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

test('只有点击“进入历史现场”才触发已配置的现场观察对白', () => {
  const state = makeState();
  const progression = createProgression(state);
  assert.equal(progression.enterEra('1G').ok, true);
  const runtime = makeLanRuntime('1G', { progression });
  runtime.lan.onRoute('chapter', { era: '1G' });
  finishDialogue(runtime, 'lan_1g_enter_001');
  assert.equal(runtime.lan.currentDialogue, null, '入口对白结束后等待手动章节操作');

  const navigationSource = between(appSource, 'function navigateChapterNext(', '\nfunction chapterNavigationMarkup(');
  const window = { CommsArchiveLan: runtime.lan, InteractionDebugger: { record() {} }, DemoManager: { isActive: () => false } };
  const context = vm.createContext({
    window, state, progression, route: 'chapter', eraIndex: 0, eras: [{ id: '1G' }],
    guidedNodeOrder: ['entry', 'scene', 'investigation', 'technology', 'archive'],
    chapterNodeBlockReason: () => '', guidedNodeAccessReason: () => '', showInteractionNotice() {},
    progressionBlock(result) { throw new Error(result.reason); }, pendingRouteScrollRestore: null,
    render() {}, dispatchLanEvent(event, detail) { return runtime.lan.dispatchEvent(event, detail); }
  });
  vm.runInContext(`${navigationSource}\nglobalThis.__navigateChapterNext=navigateChapterNext;`, context);
  assert.equal(context.__navigateChapterNext(), true);
  assert.equal(progression.currentNode().key, 'scene');
  assert.equal(runtime.lan.currentDialogue?.id, 'lan_1g_observe_001');
  finishDialogue(runtime, 'lan_1g_observe_001');
  assert.equal(runtime.lan.dispatchEvent('SCENE_OBSERVED', { era: '1G' }), false, 'scene observation event is one-shot');
});

test('演示模式直接选时代从时代入口开始，不预先标记入口对白完成', () => {
  const source = fs.readFileSync('assets/js/demo-app.js', 'utf8');
  assert.match(source, /enterRouteEra\(id\) \{ if \(!ERA_IDS\.includes\(id\)\) return false; const result = enterDemoEra\(id, 'entry'\)/);
  assert.match(source, /routeMode !== 'recommended'\) return enterDemoEra\(eras\[index\]\?\.id, 'entry'\)/);
  assert.match(source, /nodeIndex > 0 && !progression\.state\.dialogueProgress\.completedIds\.includes\(entryDialogueId\)/);
});
