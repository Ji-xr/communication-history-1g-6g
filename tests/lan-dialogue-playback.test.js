'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const systemSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const dialogueSource = fs.readFileSync('assets/js/lan-dialogue-1g.js', 'utf8');
const MEMORY_KEY = 'commsArchive.lanMemory.v1';
const ENTRY_ID = 'lan_1g_enter_001';
const PROGRESSION_ENTRY = 'lan.1g.chapter-entry';

class Element {
  constructor() {
    this.id = ''; this.dataset = {}; this.hidden = false; this.textContent = ''; this.innerHTML = '';
    this.nodes = new Map();
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  setAttribute() {}
  append() {}
  querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
  querySelectorAll() { return []; }
  addEventListener() {}
}

function createRuntime(sharedStorage = new Map()) {
  const elements = new Map();
  const body = new Element();
  body.append = (el) => { elements.set(`#${el.id}`, el); elements.set('lanCompanion', el); };
  const app = new Element(); app.hidden = false;
  const doc = {
    body,
    getElementById(id) { return elements.get(id) || elements.get(`#${id}`) || null; },
    createElement() { return new Element(); },
    querySelector(selector) {
      if (selector === '#app') return app;
      if (selector === '#lanCaption' || selector === '#lanEmotion' || selector === '#lanVoiceNote') {
        const box = elements.get('lanCompanion'); return box?.querySelector(selector) || null;
      }
      return elements.get(selector) || null;
    }
  };
  const localStorage = {
    getItem(key) { return sharedStorage.has(key) ? sharedStorage.get(key) : null; },
    setItem(key, value) { sharedStorage.set(key, String(value)); },
    removeItem(key) { sharedStorage.delete(key); }
  };
  const progressionCalls = [];
  const progression = {
    active: true,
    state: { dialogueProgress: { get activeId() { return progression.active ? 'lan.1g.chapter-entry' : null; } } },
    get protectsCurrentDialogue() { return this.active; },
    completeDialogue(id) {
      progressionCalls.push(id);
      if (id !== PROGRESSION_ENTRY) return { ok: false, reason: 'unexpected dialogue' };
      this.active = false;
      return { ok: true };
    }
  };
  const events = [];
  const window = {
    CommsArchiveProgressManager: progression,
    dispatchEvent(event) { events.push(event); },
    renderProgression() { events.push({ type: 'renderProgression' }); }
  };
  const context = {
    window, document: doc, localStorage,
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    console, Date, JSON, String, Object, Array, Math, Set
  };
  vm.runInNewContext(dialogueSource, context, { filename: 'lan-dialogue-1g.js' });
  vm.runInNewContext(systemSource, context, { filename: 'lan-system.js' });
  return { lan: window.CommsArchiveLan, storage: sharedStorage, progression, progressionCalls, events, document: doc };
}

function enter1G(runtime) { runtime.lan.onRoute('chapter', { era: '1G' }); }
function stored(runtime) { return JSON.parse(runtime.storage.get(MEMORY_KEY) || '{}'); }
function readCurrentDialogue(runtime) {
  return runtime.lan.currentDialogue?.dialogue || '';
}

test('1. 首次进入1G仅触发一次入口对白，播放完成记录为已读并释放节点', () => {
  const rt = createRuntime(); enter1G(rt);
  assert.equal(rt.lan.currentDialogue.id, ENTRY_ID);
  assert.match(readCurrentDialogue(rt), /欢迎来到通信历史的第一页。时间是20世纪80年代。/);
  const lineCount = rt.lan.dialogueData.find(x => x.id === ENTRY_ID).text.split('\n').length;
  for (let i = 0; i < lineCount; i++) rt.lan.next();
  const memory = stored(rt);
  assert.ok(memory.viewedDialogues.includes(ENTRY_ID));
  assert.notEqual(rt.lan.currentDialogue?.id, ENTRY_ID);
  assert.deepEqual(rt.progressionCalls, [PROGRESSION_ENTRY]);
});

test('2. 首次对白播放中跳过会记入跳过列表，并完成入口门控而不锁任务', () => {
  const rt = createRuntime(); enter1G(rt);
  rt.lan.skip();
  const memory = stored(rt);
  assert.ok(memory.skippedDialogues.includes(ENTRY_ID));
  assert.equal(memory.dialogueHistory.at(-1).action, 'skip');
  assert.equal(memory.currentDialogue, '');
  assert.equal(memory.lastDialogue, '');
  assert.equal(rt.progression.active, false);
  assert.deepEqual(rt.progressionCalls, [PROGRESSION_ENTRY]);
  assert.equal(rt.lan.replayLastSkipped(), true);
  assert.equal(rt.lan.currentDialogue.id, ENTRY_ID);
});

test('3A. 完整读完后刷新与重新载入不会强制重播入口对白', () => {
  const storage = new Map(); const first = createRuntime(storage); enter1G(first);
  const lineCount = first.lan.dialogueData.find(x => x.id === ENTRY_ID).text.split('\n').length;
  for (let i = 0; i < lineCount; i++) first.lan.next();
  const afterReload = createRuntime(storage); enter1G(afterReload);
  assert.ok(stored(afterReload).viewedDialogues.includes(ENTRY_ID));
  assert.notEqual(afterReload.lan.currentDialogue?.id, ENTRY_ID);
});

test('3B. 播放中刷新从保存的句子继续，不从整段第一句重播', () => {
  const storage = new Map(); const first = createRuntime(storage); enter1G(first);
  first.lan.next(); first.lan.next();
  const savedCursor = stored(first).currentDialogueLine;
  assert.equal(savedCursor, 2);
  assert.equal(stored(first).lastDialogue, ENTRY_ID);
  const afterReload = createRuntime(storage); enter1G(afterReload);
  const dialogue = afterReload.lan.dialogueData.find(x => x.id === ENTRY_ID);
  assert.equal(readCurrentDialogue(afterReload), dialogue.text.split('\n')[savedCursor]);
  assert.equal(stored(afterReload).currentDialogueLine, savedCursor);
});

test('4. 离开并重新进入1G时，入口对白不重复强制播放', () => {
  const rt = createRuntime(); enter1G(rt);
  const lineCount = rt.lan.dialogueData.find(x => x.id === ENTRY_ID).text.split('\n').length;
  for (let i = 0; i < lineCount; i++) rt.lan.next();
  rt.lan.onRoute('gallery', {}); enter1G(rt);
  assert.equal(rt.lan.history.filter(item => item.id === ENTRY_ID).length, 1);
});

test('5. 跳过入口后重新进入，不强制重播；用户仍可主动重看', () => {
  const rt = createRuntime(); enter1G(rt); rt.lan.skip();
  rt.lan.onRoute('gallery', {}); enter1G(rt);
  assert.equal(rt.lan.history.filter(item => item.id === ENTRY_ID).length, 1);
  assert.equal(rt.lan.replayLastSkipped(), true);
  assert.equal(rt.lan.currentDialogue.id, ENTRY_ID);
});

test('6. 跳过全部澜对白不影响任务处理入口', () => {
  const rt = createRuntime(); enter1G(rt); rt.lan.skip();
  const requiredHint = rt.lan.dialogueData.find(item => item.id === 'lan_1g_task_start_001');
  assert.equal(requiredHint.dialogueType, 'hint');
  rt.lan.trigger(requiredHint.id); rt.lan.skip();
  let taskStatus = 'available';
  rt.lan.onTaskStart('1G'); taskStatus = 'active';
  assert.equal(taskStatus, 'active');
  assert.equal(rt.progression.active, false, '必读提示可跳过，且入口节点已正常解除');
  assert.ok(stored(rt).skippedDialogues.includes(requiredHint.id));
  assert.equal(rt.lan.replayLastSkipped(), true, '跳过的必要提示可以主动重看');
  assert.equal(rt.lan.currentDialogue.id, requiredHint.id);
});

test('7. 跳过可选线索不阻塞，可通过重看入口找回提示', () => {
  const rt = createRuntime();
  assert.equal(rt.lan.dispatchEvent('TASK_CLUE', { era: '1G', clue: 'signal-area' }), true);
  rt.lan.skip();
  assert.ok(stored(rt).skippedDialogues.includes('lan_1g_signal_area_001'));
  assert.equal(rt.progression.active, true, '可选对白不改变入口节点门控');
  assert.equal(rt.lan.replayLastSkipped(), true);
  assert.equal(rt.lan.currentDialogue.id, 'lan_1g_signal_area_001');
});

test('8. 五次离开、重入与刷新后入口触发不重复，记忆字段稳定', () => {
  const storage = new Map(); let rt = createRuntime(storage); enter1G(rt);
  const lineCount = rt.lan.dialogueData.find(x => x.id === ENTRY_ID).text.split('\n').length;
  for (let i = 0; i < lineCount; i++) rt.lan.next();
  for (let cycle = 0; cycle < 5; cycle++) {
    rt.lan.onRoute('gallery', {}); rt = createRuntime(storage); enter1G(rt);
  }
  const memory = stored(rt);
  assert.equal(rt.lan.history.filter(item => item.id === ENTRY_ID).length, 1);
  for (const field of ['viewedDialogues', 'skippedDialogues', 'completedTriggers', 'dialogueHistory', 'lastDialogue', 'dialogueVersion']) assert.ok(Object.hasOwn(memory, field), `missing ${field}`);
  assert.equal(memory.dialogueVersion, '1.0');
  assert.equal(memory.dialogueHistory[0].action, 'view');
  assert.ok(memory.completedTriggers.includes('trigger_1g_enter'));
});

test('9. 兼容旧版LanMemory并保留completedEvents历史字段', () => {
  const storage = new Map([[MEMORY_KEY, JSON.stringify({ completedEvents: ['trigger_1g_enter'], viewedDialogues: [ENTRY_ID] })]]);
  const rt = createRuntime(storage);
  const memory = rt.lan.LanMemory;
  assert.ok(memory.completedTriggers.includes('trigger_1g_enter'));
  assert.ok(memory.viewedDialogues.includes(ENTRY_ID));
  assert.equal(Array.isArray(memory.completedEvents), true);
});
