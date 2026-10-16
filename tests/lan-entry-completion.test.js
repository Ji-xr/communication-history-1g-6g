const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Progress = require('../assets/js/progression-manager.js');

const eras = ['1G', '2G', '3G', '4G', '5G', '6G'];
const dialogueFiles = [
  'assets/js/lan-dialogue-1g.js', 'assets/js/lan-dialogue-2g.js', 'assets/js/lan-dialogue-3g.js',
  'assets/js/lan-dialogue-4g.js', 'assets/js/lan-dialogue-5g.js', 'assets/js/lan-dialogue-6g.js',
];

class TestElement {
  constructor() {
    this.id = ''; this.dataset = {}; this.style = { setProperty() {} }; this.hidden = false;
    this.textContent = ''; this.innerHTML = ''; this.parentElement = null; this.listeners = new Map();
    this.classList = { toggle() {}, add() {}, remove() {} }; this.nodes = new Map();
  }
  setAttribute() {}
  append(child) { child.parentElement = this; if (child.id) this.nodes.set(`#${child.id}`, child); }
  remove() { this.parentElement = null; }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  querySelector(selector) { if (this.isBody) return this.nodes.get(selector) || null; if (!this.nodes.has(selector)) this.nodes.set(selector, new TestElement()); return this.nodes.get(selector); }
  querySelectorAll(selector) { return selector === '#lanCompanion' && this.id === 'lanCompanion' ? [this] : []; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 140 }; }
}

function createRuntime(era) {
  let clock = 1000;
  const storage = new Map();
  const body = new TestElement();
  body.isBody = true;
  const app = new TestElement(); app.hidden = false;
  let lan = null;
  const document = {
    body,
    addEventListener() {}, removeEventListener() {},
    createElement() { return new TestElement(); },
    getElementById(id) { return body.nodes.get(`#${id}`) || null; },
    querySelector(selector) {
      if (selector === '#app') return app;
      if (selector === '#lanCompanion') return body.querySelector('#lanCompanion');
      if (selector === '#lanCaption' || selector === '#lanEmotion' || selector === '#lanVoiceNote' || selector === '#lanVoiceToggle' || selector === '#lanRevisitButton' || selector === '#lanCardHint') return body.querySelector('#lanCompanion')?.querySelector(selector) || null;
      return null;
    },
    querySelectorAll(selector) { return selector === '#lanCompanion' ? (body.querySelector('#lanCompanion') ? [body.querySelector('#lanCompanion')] : []) : []; },
  };
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }, removeItem(key) { storage.delete(key); },
  };
  const preceding = eras.slice(0, eras.indexOf(era));
  if (preceding.length) storage.set('commsArchive.lanMemory.v1', JSON.stringify({ completedEras: preceding }));
  const state = { visited: [...preceding], completed: [...preceding], order: [...preceding], logs: [], evidence: [], clues: {}, tasks: {} };
  const manager = Progress.createProgression(state, { save: () => true });
  assert.equal(manager.enterEra(era).ok, true);
  let completeCalls = 0;
  const completeDialogue = manager.completeDialogue.bind(manager);
  manager.completeDialogue = (...args) => { completeCalls++; return completeDialogue(...args); };
  const events = [];
  const window = {
    CommsArchiveProgressManager: manager,
    DemoManager: { isActive: () => false },
    InteractionDebugger: { record() {} },
    AudioSystem: { playEffect() {}, setEra() {} },
    dispatchEvent(event) { events.push(event); },
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    innerWidth: 1000, innerHeight: 800,
    renderProgression() { events.push({ type: 'renderProgression' }); lan.onRoute('chapter', { era }); },
  };
  class TestDate extends Date { static now() { return clock; } }
  const context = vm.createContext({ window, document, localStorage, Date: TestDate, CustomEvent: window.CustomEvent, console, Math, JSON, String, Object, Array, Set, Map, RegExp });
  for (const file of dialogueFiles) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  vm.runInContext(fs.readFileSync('assets/js/lan-system.js', 'utf8'), context, { filename: 'assets/js/lan-system.js' });
  lan = window.CommsArchiveLan;
  lan.onRoute('chapter', { era });
  function clickCard() {
    clock += 200;
    const box = document.getElementById('lanCompanion');
    const click = box?.listeners.get('click');
    assert.equal(typeof click, 'function', '澜卡片已绑定真实点击回调');
    click({ target: { closest: () => null } });
  }
  const box = document.getElementById('lanCompanion');
  const modeTransitions = [];
  box.dataset = new Proxy(box.dataset, { set(target, key, value) { if (key === 'mode' && target.mode !== value) modeTransitions.push(value); target[key] = value; return true; } });
  return { lan, manager, state, events, storage, document, clickCard, modeTransitions, getCompleteCalls: () => completeCalls };
}

for (const era of eras) {
  test(`${era}：入口对白最后一句完成引导，但章节推进留给底部按钮`, () => {
    const runtime = createRuntime(era);
    const entryId = `lan_${era.toLowerCase()}_enter_001`;
    const progressionId = `lan.${era.toLowerCase()}.chapter-entry`;
    const entry = runtime.lan.dialogueData.find((item) => item.id === entryId);
    assert.ok(entry, `${era}入口对白存在`);
    const lineCount = entry.text.split(/\n+/).filter(Boolean).length;
    assert.equal(runtime.lan.currentDialogue.id, entryId);
    assert.equal(runtime.manager.state.dialogueProgress.activeId, progressionId);
    assert.equal(runtime.lan.LanDisplayMode.mode, 'dialogue');
    runtime.modeTransitions.length = 0;

    // 逐句真实触发澜卡片的 click listener，而不是直接调用进度完成函数。
    for (let line = 0; line < lineCount; line++) runtime.clickCard();

    assert.equal(runtime.getCompleteCalls(), 1, '入口对白完成回调只执行一次');
    assert.ok(runtime.manager.state.dialogueProgress.completedIds.includes(progressionId));
    assert.equal(runtime.manager.state.dialogueProgress.activeId, null);
    assert.equal(runtime.manager.currentNode()?.key, 'entry', '对白只完成入口节点，不移动章节指针');
    assert.equal(runtime.manager.state.eras[era].nodes.find(node => node.key === 'entry').status, 'COMPLETED');
    assert.equal(runtime.manager.state.eras[era].nodes.find(node => node.key === 'scene').status, 'AVAILABLE', '历史现场已开放，等待用户点击下一环节按钮');
    assert.ok(runtime.lan.LanMemory.viewedDialogues.includes(entryId), '原入口对白已记录为阅读完成');
    assert.ok(runtime.events.some((event) => event?.type === 'renderProgression'), '对白完成后章节更新，显示下一环节按钮');
    assert.equal(runtime.lan.currentDialogue, null, '入口对白结束后不自动插入另一段对白');
    assert.equal(runtime.lan.LanDisplayMode.mode, 'companion', '对白结束后恢复右下角陪伴卡片');
    assert.ok(!runtime.events.some(event => event?.type === 'comms-archive-lan-next'), '对白不发送时代导航事件');
  });
}

test('入口对白卡片的快速重复点击不会推进两句或重复完成导航', () => {
  const runtime = createRuntime('4G');
  const box = runtime.document.getElementById('lanCompanion');
  const click = box.listeners.get('click');
  const event = { target: { closest: () => null } };
  click(event);
  click(event); // 同一时刻重复点击会被Lan系统的输入节流忽略。
  assert.equal(runtime.lan.debugSnapshot().lineIndex, 1);
  assert.equal(runtime.getCompleteCalls(), 0);
});
