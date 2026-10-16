'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const lanSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const dialogueSource = fs.readFileSync('assets/js/lan-dialogue-1g.js', 'utf8');
const cssSource = fs.readFileSync('assets/css/lan.css', 'utf8');

class Element {
  constructor() {
    this.id = ''; this.dataset = {}; this.hidden = false; this.textContent = ''; this.innerHTML = '';
    this.nodes = new Map(); this.events = {}; this.parentElement = null; this.attributes = {};
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append() {}
  addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
  querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 700, top: 600, width: 420, height: 140 }; }
}

function createRuntime(prepareDialogues = null) {
  const elements = new Map(); const listeners = new Map(); const body = new Element();
  body.appendCalls = 0;
  body.append = element => { body.appendCalls++; element.parentElement = body; elements.set(`#${element.id}`, element); elements.set(element.id, element); };
  const document = {
    body,
    getElementById: id => elements.get(id) || elements.get(`#${id}`) || null,
    createElement: () => new Element(),
    querySelector(selector) {
      if (selector === '#app') return new Element();
      if (selector === '#lanCaption' || selector === '#lanEmotion' || selector === '#lanVoiceNote') return elements.get('lanCompanion')?.querySelector(selector) || null;
      return elements.get(selector) || null;
    },
    addEventListener(name, callback) { (listeners.get(name) || (listeners.set(name, []), listeners.get(name))).push(callback); },
    removeEventListener(name, callback) { listeners.set(name, (listeners.get(name) || []).filter(item => item !== callback)); },
    listeners
  };
  const localStorage = { getItem: () => null, setItem() {} };
  const window = { innerWidth: 1000, innerHeight: 800, dispatchEvent() {} };
  const context = { window, document, localStorage, CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }, Date, JSON, String, Object, Array, Math, Set, console };
  vm.runInNewContext(dialogueSource, context, { filename: 'lan-dialogue-1g.js' });
  prepareDialogues?.(window);
  vm.runInNewContext(lanSource, context, { filename: 'lan-system.js' });
  return { lan: window.CommsArchiveLan, window, document };
}

test('一段多句对白只进入一次；后续只更新字幕，卡片节点和位置保持不变', () => {
  const runtime = createRuntime();
  runtime.lan.trigger('lan_1g_enter_001', '1G');
  const box = runtime.document.getElementById('lanCompanion');
  const appendCount = runtime.document.body.appendCalls;
  const initialPosition = box.getBoundingClientRect();
  assert.equal(runtime.window.lanDialoguePhase.phase, 'enter');

  runtime.lan.next();
  assert.equal(runtime.window.lanDialoguePhase.phase, 'talking');
  for (let i = 0; i < 2; i++) runtime.lan.next();

  assert.equal(runtime.document.getElementById('lanCompanion'), box);
  assert.equal(box.parentElement, runtime.document.body);
  assert.equal(runtime.document.body.appendCalls, appendCount);
  assert.deepEqual(box.getBoundingClientRect(), initialPosition);
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  assert.equal(runtime.window.lanDialoguePhase.phase, 'talking');

  while (runtime.lan.currentDialogue) runtime.lan.next();
  assert.equal(runtime.window.LanDisplayMode.mode, 'companion');
  assert.equal(runtime.window.lanDialoguePhase.phase, 'exit');
});

test('链接的下一段剧情沿用中央面板，不先收成卡片再重新弹出', () => {
  const runtime = createRuntime(window => window.LanDialogues1G.push(
    { id: 'anim_chain_a', era: '1G', location: 'summary', trigger: 'anim-chain-a', emotion: 'thinking', dialogueType: 'story', text: '第一段。', next: 'anim_chain_b' },
    { id: 'anim_chain_b', era: '1G', location: 'transition', trigger: 'anim-chain-b', emotion: 'thinking', dialogueType: 'optional', text: '接着说的内容。', next: null }
  ));
  runtime.lan.trigger('anim_chain_a', '1G');
  const box = runtime.document.getElementById('lanCompanion');
  const appendCount = runtime.document.body.appendCalls;
  runtime.lan.next();

  assert.equal(runtime.lan.currentDialogue.id, 'anim_chain_b');
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  assert.equal(runtime.window.lanDialoguePhase.phase, 'talking');
  assert.equal(runtime.document.getElementById('lanCompanion'), box);
  assert.equal(runtime.document.body.appendCalls, appendCount);

  runtime.lan.next();
  assert.equal(runtime.window.lanDialoguePhase.phase, 'exit');
  assert.equal(runtime.window.LanDisplayMode.mode, 'companion');
});

test('新的对白重新播放进入动画；句间字幕使用独立轻量过渡', () => {
  const runtime = createRuntime();
  runtime.lan.trigger('lan_1g_enter_001', '1G');
  const box = runtime.document.getElementById('lanCompanion');
  while (runtime.lan.currentDialogue) runtime.lan.next();
  runtime.lan.trigger('lan_1g_enter_001', '1G');

  assert.equal(runtime.window.lanDialoguePhase.phase, 'enter');
  assert.equal(box.dataset.dialoguePhase, 'enter');
  assert.match(cssSource, /data-mode="dialogue"\]\[data-dialogue-phase="enter"\]\{animation:lanDialogueEnter/);
  assert.match(cssSource, /lan-caption\.lan-text-changing\{animation:lanTextRefresh/);
});

test('减少动态效果设置会关闭澜进入、收束和字幕动画', () => {
  assert.match(cssSource, /prefers-reduced-motion:\s*reduce[^}]*lan-companion\[data-dialogue-phase="enter"\][^}]*animation:none!important/s);
  assert.match(cssSource, /lanCardEnter/);
  assert.match(cssSource, /lanCardSettle/);
});
