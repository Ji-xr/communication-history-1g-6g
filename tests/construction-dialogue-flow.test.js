'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appSource = fs.readFileSync('app.js', 'utf8');
const lanSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const dialogueSource = fs.readFileSync('assets/js/lan-dialogue-1g.js', 'utf8');

class Element {
  constructor() {
    this.id = ''; this.dataset = {}; this.hidden = false; this.textContent = ''; this.innerHTML = '';
    this.nodes = new Map(); this.events = {}; this.attributes = {}; this.parentElement = null; this.style = {};
    this.classes = new Set();
    this.classList = {
      toggle: (name, force) => { const enabled = force === undefined ? !this.classes.has(name) : !!force; enabled ? this.classes.add(name) : this.classes.delete(name); return enabled; },
      add: name => this.classes.add(name), remove: name => this.classes.delete(name), contains: name => this.classes.has(name)
    };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(element) { if (element) element.parentElement = this; }
  addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
  querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 700, top: 600, width: 420, height: 140 }; }
}

function lanRuntime({ omitEntryDialogue = false } = {}) {
  const elements = new Map(); const body = new Element();
  body.append = element => { if (!element) return; element.parentElement = body; elements.set(element.id, element); elements.set(`#${element.id}`, element); };
  const app = new Element(); app.hidden = false;
  const document = {
    body,
    getElementById: id => elements.get(id) || elements.get(`#${id}`) || null,
    createElement: () => new Element(),
    querySelector(selector) {
      if (selector === '#app') return app;
      if (['#lanCaption', '#lanEmotion', '#lanVoiceNote'].includes(selector)) return elements.get('lanCompanion')?.querySelector(selector) || null;
      return elements.get(selector) || null;
    },
    addEventListener() {}, removeEventListener() {}
  };
  const storage = new Map();
  const localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) };
  let completedDialogue = 0;
  const progress = {
    state: { dialogueProgress: { activeId: 'lan.1g.chapter-entry' } },
    completeDialogue() { completedDialogue++; this.state.dialogueProgress.activeId = null; return { ok: true, next: { nodeId: '1g_scene' } }; }
  };
  const window = {
    innerWidth: 1200, innerHeight: 900, dispatchEvent() {}, addEventListener() {},
    CommsArchiveProgressManager: progress,
    renderProgression() {}
  };
  const context = {
    window, document, localStorage,
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    Date, JSON, String, Object, Array, Math, Set, console
  };
  vm.runInNewContext(dialogueSource, context, { filename: 'lan-dialogue-1g.js' });
  if (omitEntryDialogue) window.LanDialogues1G = window.LanDialogues1G.filter(item => item.id !== 'lan_1g_enter_001');
  vm.runInNewContext(lanSource, context, { filename: 'lan-system.js' });
  return { context, window, document, lan: window.CommsArchiveLan, storage, progress, get completedDialogue() { return completedDialogue; } };
}

function appFunction(name) {
  const line = appSource.split(/\r?\n/).find(value => value.startsWith(`function ${name}(`));
  assert.ok(line, `找不到 app.js 中的 ${name} 函数`);
  return line;
}

test('建设调查线索点击会派发澜事件，关键反馈进入中央对白并可逐句推进', () => {
  const runtime = lanRuntime();
  const eras = [{ id: '1G', opts: [['电话', '', ''], ['无线信号', '', ''], ['基站', '', '']] }];
  const state = { clues: {}, tasks: {} };
  const progression = { currentEra: () => '1G', currentNode: () => ({ key: 'investigation' }) };
  const bridge = appFunction('dispatchLanEvent');
  const pick = appSource.match(/function pick\(i\)\{.*?(?=function pickSecond)/s)?.[0];
  assert.ok(pick, '找到建设调查区的线索点击回调');
  let renders = 0;
  const appContext = {
    window: runtime.window, eras, eraIndex: 0, progression, state, selected: null, secondSelected: null,
    persistTask() {}, render() { renders++; }, console
  };
  vm.runInNewContext(`${bridge}\nwindow.dispatchLanEvent=dispatchLanEvent;\n${pick}\nglobalThis.pickClue=pick;`, appContext);

  appContext.dispatchLanEvent('TASK_START', { era: '1G' });
  assert.equal(runtime.lan.currentDialogue.id, 'lan_1g_task_start_001');
  assert.equal(runtime.lan.debugSnapshot().displayMode, 'dialogue', '任务说明必须进入中央剧情模式');
  while (runtime.lan.currentDialogue) runtime.lan.next();
  appContext.dispatchLanEvent('TASK_REVEAL', { era: '1G' });
  assert.equal(runtime.lan.currentDialogue.id, 'lan_1g_issue_001');
  assert.equal(runtime.lan.debugSnapshot().displayMode, 'dialogue', '调查分析反馈必须进入中央剧情模式');
  while (runtime.lan.currentDialogue) runtime.lan.next();

  appContext.pickClue(1);

  assert.deepEqual(Array.from(state.clues['1G']), [1]);
  assert.equal(renders, 1, '触发对白后仍会重绘调查区');
  assert.equal(runtime.lan.currentDialogue.id, 'lan_1g_signal_area_001');
  assert.equal(runtime.lan.debugSnapshot().displayMode, 'dialogue', '线索分析必须进入中央剧情模式');
  const initialLine = runtime.lan.currentDialogue.lineIndex;
  runtime.lan.next();
  assert.equal(runtime.lan.currentDialogue.lineIndex, initialLine + 1, '点击推进确实进入下一句');
  assert.equal(runtime.lan.debugSnapshot().displayMode, 'dialogue', '连续对白保持中央位置');
  while (runtime.lan.currentDialogue) runtime.lan.next();
  assert.equal(runtime.lan.debugSnapshot().lanControlsReleased, true);
  assert.equal(runtime.lan.debugSnapshot().displayMode, 'companion');
});

test('建设调查任务说明进入中央对白；档案往返期间保持未结束的调查对白', () => {
  const runtime = lanRuntime();
  runtime.lan.dispatchEvent('TASK_CLUE', { era: '1G', clue: 'signal-area' });
  assert.equal(runtime.lan.currentDialogue.id, 'lan_1g_signal_area_001');
  assert.equal(runtime.lan.debugSnapshot().displayMode, 'dialogue');
  runtime.lan.next();
  const activeId = runtime.lan.currentDialogue.id;
  const activeLine = runtime.lan.currentDialogue.lineIndex;

  runtime.lan.onRoute('archive', {});
  assert.equal(runtime.lan.currentDialogue.id, activeId, '进入档案不覆盖正在进行的任务对白');
  assert.equal(runtime.lan.currentDialogue.lineIndex, activeLine);
  runtime.lan.onRoute('chapter', { era: '1G', suppressAutoDialogue: true });
  assert.equal(runtime.lan.currentDialogue.id, activeId, '返回调查区不重播或替换任务对白');
  assert.equal(runtime.lan.currentDialogue.lineIndex, activeLine);
  assert.equal(runtime.lan.debugSnapshot().displayMode, 'dialogue');
});

test('引导对白队列为空但入口进度仍活动时自动完成引导并开放历史现场', () => {
  const runtime = lanRuntime({ omitEntryDialogue: true });
  const result = runtime.lan.checkGuidedDialogueState({ route: 'chapter', era: '1G' });
  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(runtime.completedDialogue, 1);
  assert.equal(runtime.progress.state.dialogueProgress.activeId, null);
});

test('档案页可返回原探索路由、时代与滚动位置，不重新进入或重置任务', () => {
  const route = ['go', 'returnFromArchive'].map(appFunction).join('\n');
  const calls = { render: 0, dismissed: [], saved: [] };
  const state = { task: { selected: 1, completed: false } };
  const context = {
    window: {
      scrollY: 638,
      InteractionDebugger: { record() {} },
      DemoManager: { saveView: (...args) => calls.saved.push(args) },
      CommsArchiveLan: { dismissRouteDialogue: location => { calls.dismissed.push(location); return false; } }
    },
    eras: [{ id: '1G' }, { id: '2G' }, { id: '3G' }, { id: '4G' }],
    route: 'chapter', eraIndex: 3, transitionInProgress: false, galleryActive: false,
    galleryReturn: false, travelTimer: null, reviewGuideActive: false, reviewGuideStage: 0,
    archiveReturnContext: null, pendingRouteScrollRestore: null, suppressLanAutoDialogueOnce: false,
    state, clearTimeout() {}, render() { calls.render++; }
  };
  vm.runInNewContext(`${route}\nglobalThis.go=go;globalThis.returnFromArchive=returnFromArchive;`, context);
  context.go('archive');
  context.window.scrollY = 12;
  assert.equal(context.returnFromArchive(), true);
  assert.equal(context.route, 'chapter');
  assert.equal(context.eraIndex, 3);
  assert.equal(context.pendingRouteScrollRestore, 638);
  assert.equal(context.suppressLanAutoDialogueOnce, true);
  assert.equal(calls.dismissed[0], 'archive');
  assert.equal(calls.render, 2);
  assert.equal(state.task.selected, 1);
  assert.equal(state.task.completed, false);
  assert.match(appFunction('archive'), /onclick="returnFromArchive\(\)"[^>]*>← 返回探索/);
  const render = appSource.match(/function render\(\)\{[\s\S]*?\}window\.renderProgression/)?.[0];
  assert.ok(render, '找到实际页面渲染入口');
  assert.match(render, /explicitScrollRestore=pendingRouteScrollRestore;pendingRouteScrollRestore=null/);
  assert.match(render, /preservePagePosition\(explicitScrollRestore\?\?\(keepScroll\?previousScroll:0\)\)/);
  assert.match(render, /suppressAutoDialogue=suppressLanAutoDialogueOnce;suppressLanAutoDialogueOnce=false/);
});

test('无待续任务对白时，返回会关闭档案提示且不自动重播时代欢迎对白', () => {
  const runtime = lanRuntime();
  runtime.lan.onRoute('archive', {});
  assert.equal(runtime.lan.currentDialogue.id, 'lan.archive.open');
  assert.equal(runtime.lan.dismissRouteDialogue('archive'), true);
  assert.equal(runtime.lan.currentDialogue, null);
  runtime.lan.onRoute('chapter', { era: '1G', suppressAutoDialogue: true });
  assert.equal(runtime.lan.currentDialogue, null);
});
