'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const systemSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const dialogueSource = fs.readFileSync('assets/js/lan-dialogue-1g.js', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');
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
  addEventListener() {}
  querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
  querySelectorAll() { return []; }
}

function createRuntime() {
  const elements = new Map();
  const body = new Element();
  body.append = (element) => { elements.set(`#${element.id}`, element); elements.set('lanCompanion', element); };
  const app = new Element(); app.hidden = false;
  const document = {
    body,
    getElementById(id) { return elements.get(id) || elements.get(`#${id}`) || null; },
    createElement() { return new Element(); },
    querySelector(selector) {
      if (selector === '#app') return app;
      if (['#lanCaption', '#lanEmotion', '#lanVoiceNote'].includes(selector)) return elements.get('lanCompanion')?.querySelector(selector) || null;
      return elements.get(selector) || null;
    }
  };
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const progressionCalls = [], events = [];
  const progression = {
    active: true,
    state: { currentEra: '1G', dialogueProgress: { get activeId() { return progression.active ? PROGRESSION_ENTRY : null; } } },
    completeDialogue(id) {
      progressionCalls.push(id);
      if (id !== PROGRESSION_ENTRY || !progression.active) return { ok: false, reason: '引导已不再处于活动状态。' };
      progression.active = false;
      return { ok: true, next: { nodeId: '1g_scene' } };
    }
  };
  const window = {
    CommsArchiveProgressManager: progression,
    dispatchEvent(event) { events.push(event); },
    renderProgression() { events.push({ type: 'renderProgression' }); }
  };
  const context = {
    window, document, localStorage,
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    console, Date, JSON, String, Object, Array, Math, Set
  };
  vm.runInNewContext(dialogueSource, context, { filename: 'lan-dialogue-1g.js' });
  vm.runInNewContext(systemSource, context, { filename: 'lan-system.js' });
  return { lan: window.CommsArchiveLan, storage, progression, progressionCalls, events };
}

function stored(runtime) { return JSON.parse(runtime.storage.get(MEMORY_KEY) || '{}'); }

test('现有引导队列仍在播放时，不会误完成或跳过对白', () => {
  const runtime = createRuntime();
  runtime.lan.onRoute('chapter', { era: '1G' });

  assert.equal(runtime.lan.currentDialogue.id, ENTRY_ID);
  const result = runtime.lan.checkGuidedDialogueState({ route: 'chapter', era: '1G' });

  assert.equal(result.ok, false);
  assert.equal(runtime.progression.active, true);
  assert.deepEqual(runtime.progressionCalls, []);
  assert.equal(runtime.lan.currentDialogue.id, ENTRY_ID);
});

test('入口对白缺失且引导队列为空时，只恢复对白完成状态并开放下一环节按钮', () => {
  const runtime = createRuntime();
  runtime.lan.dialogueData.splice(0, runtime.lan.dialogueData.length, ...runtime.lan.dialogueData.filter(item => item.id !== ENTRY_ID));

  runtime.lan.onRoute('chapter', { era: '1G' });
  assert.equal(runtime.lan.currentDialogue, null, '复现场景应为无可播放对白');
  assert.equal(runtime.progression.active, true, '修复前进度仍显示引导进行中');

  // 与 app.js 一样，在章节路由完成对白恢复尝试后检查空队列状态。
  const result = runtime.lan.checkGuidedDialogueState({ route: 'chapter', era: '1G' });
  const memory = stored(runtime);

  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(runtime.progression.active, false);
  assert.deepEqual(runtime.progressionCalls, [PROGRESSION_ENTRY]);
  assert.ok(memory.completedEvents.includes(ENTRY_ID));
  assert.ok(memory.completedEvents.includes('trigger_1g_enter'));
  assert.ok(memory.completedTriggers.includes('trigger_1g_enter'));
  assert.equal(memory.viewedDialogues.includes(ENTRY_ID), false, '系统恢复不应伪记为用户已读');
  assert.equal(runtime.lan.currentDialogue, null, '恢复流程不自动插入历史现场对白');
  assert.ok(runtime.events.some(event => event.type === 'renderProgression'));
});

test('仅在当前时代章节执行恢复，不会完成其他时代的活动引导', () => {
  const runtime = createRuntime();
  runtime.lan.onRoute('chapter', { era: '1G' });
  runtime.lan.skip();
  runtime.progression.active = true;

  const result = runtime.lan.checkGuidedDialogueState({ route: 'chapter', era: '2G' });

  assert.equal(result.ok, false);
  assert.equal(runtime.progression.active, true);
  assert.equal(runtime.progressionCalls.length, 1, '只有显式跳过原对白时完成过一次');
});

test('应用在章节对白恢复尝试后检查队列，自动接入异常恢复', () => {
  const routeIndex = appSource.indexOf('window.CommsArchiveLan?.onRoute(route,');
  const recoveryIndex = appSource.indexOf('window.CommsArchiveLan?.checkGuidedDialogueState?.({route,');

  assert.ok(routeIndex >= 0, 'app.js should route the current page through LanSystem');
  assert.ok(recoveryIndex > routeIndex, 'recovery must run after the route has tried to restore dialogue');
});

