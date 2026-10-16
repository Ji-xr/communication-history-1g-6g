'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const lanSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const dialogueSource = fs.readFileSync('assets/js/lan-dialogue-1g.js', 'utf8');
const cssSource = fs.readFileSync('assets/css/lan.css', 'utf8');
const memoryKey = 'commsArchive.lanMemory.v1';

class Element {
  constructor() {
    this.id = ''; this.dataset = {}; this.hidden = false; this.textContent = ''; this.innerHTML = '';
    this.nodes = new Map(); this.events = {}; this.attributes = {}; this.parentElement = null;
    this.classNames = new Set(); this.classList = { toggle: (name, force) => force ? this.classNames.add(name) : this.classNames.delete(name), add: name => this.classNames.add(name), remove: name => this.classNames.delete(name), contains: name => this.classNames.has(name) };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append() {}
  addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
  querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 700, top: 600, width: 280, height: 160 }; }
}

function createRuntime(storage = new Map(), prepareDialogues = null) {
  const elements = new Map(); const listeners = new Map(); const body = new Element();
  body.appendCalls = 0;
  body.append = element => { body.appendCalls++; element.parentElement = body; elements.set(`#${element.id}`, element); elements.set(element.id, element); };
  const slot = new Element(); slot.id = 'progressLanSlot'; slot.append = element => { element.parentElement = slot; elements.set(`#${element.id}`, element); elements.set(element.id, element); };
  elements.set('progressLanSlot', slot); elements.set('#progressLanSlot', slot);
  const document = {
    body,
    getElementById: id => elements.get(id) || elements.get(`#${id}`) || null,
    createElement: () => new Element(),
    querySelector(selector) {
      if (selector === '#app') return new Element();
      if (selector === '#lanCaption' || selector === '#lanEmotion' || selector === '#lanVoiceNote') return elements.get('lanCompanion')?.querySelector(selector) || null;
      return elements.get(selector) || null;
    },
    querySelectorAll(selector) { return selector === '#lanCompanion' && elements.get('lanCompanion') ? [elements.get('lanCompanion')] : []; },
    addEventListener(name, callback) { (listeners.get(name) || (listeners.set(name, []), listeners.get(name))).push(callback); },
    removeEventListener(name, callback) { listeners.set(name, (listeners.get(name) || []).filter(item => item !== callback)); },
    listeners
  };
  const localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) };
  const events = []; const window = { innerWidth: 1000, innerHeight: 800, dispatchEvent: event => events.push(event) };
  const context = { window, document, localStorage, CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }, Date, JSON, String, Object, Array, Math, Set, console };
  vm.runInNewContext(dialogueSource, context, { filename: 'lan-dialogue-1g.js' });
  prepareDialogues?.(window);
  vm.runInNewContext(lanSource, context, { filename: 'lan-system.js' });
  return { lan: window.CommsArchiveLan, window, document, storage, events, slot, body };
}

test('story对白进入中心剧情模式，并公开LanDisplayMode状态', () => {
  const runtime = createRuntime();
  runtime.lan.onRoute('chapter', { era: '1G' });
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  assert.equal(runtime.document.getElementById('lanCompanion').dataset.mode, 'dialogue');
});

test('首页首次档案介绍进入中央剧情；普通optional对白仍为陪伴卡片', () => {
  const runtime = createRuntime();
  runtime.lan.trigger('lan.home.first-visit');
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  for (let index = 0; index < 4; index++) runtime.lan.next();
  assert.equal(runtime.window.LanDisplayMode.mode, 'companion');
  runtime.lan.trigger('lan.gallery.select-era');
  assert.equal(runtime.window.LanDisplayMode.mode, 'companion');
  runtime.lan.expandDialogue();
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  runtime.lan.next();
  runtime.lan.hideDialogue();
  assert.equal(runtime.window.LanDisplayMode.mode, 'hidden');
});

test('重要hint进入中心模式，跳过后缩为陪伴卡片且不阻塞任务入口', () => {
  const runtime = createRuntime();
  runtime.lan.trigger('lan_1g_task_start_001', '1G');
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  runtime.lan.skip();
  assert.equal(runtime.window.LanDisplayMode.mode, 'companion');
  assert.equal(runtime.lan.LanMemory.currentDialogue, '');
  assert.equal(runtime.lan.LanMemory.skippedDialogues.includes('lan_1g_task_start_001'), true);
});

test('story对白播放完成后自动缩为陪伴卡片', () => {
  const runtime = createRuntime();
  runtime.lan.onRoute('chapter', { era: '1G' });
  for (let index = 0; index < 20 && runtime.window.LanDisplayMode.mode === 'dialogue'; index++) runtime.lan.next();
  assert.equal(runtime.window.LanDisplayMode.mode, 'companion');
});

test('手动展开的多句陪伴对白保持中央模式直到整段结束', () => {
  const runtime = createRuntime();
  runtime.lan.trigger('lan.home.first-visit');
  runtime.lan.expandDialogue();
  for (let index = 0; index < 3; index++) {
    runtime.lan.next();
    assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  }
  runtime.lan.next();
  assert.equal(runtime.window.LanDisplayMode.mode, 'companion');
});

test('重要叙事与连续关联对白保持中央模式，结束后才回到陪伴卡片', () => {
  const runtime = createRuntime(new Map(), window => {
    window.LanDialogues1G.push(
      { id: 'test_story_chain_1', era: '1G', location: 'summary', trigger: 'test-summary', emotion: 'thinking', dialogueType: 'story', text: '第一句。', next: 'test_story_chain_2' },
      { id: 'test_story_chain_2', era: '1G', location: 'exhibit', trigger: 'test-follow-up', emotion: 'thinking', dialogueType: 'optional', text: '接下来的叙事内容。', next: null }
    );
  });
  runtime.lan.trigger('test_story_chain_1');
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  runtime.lan.next();
  assert.equal(runtime.lan.currentDialogue.id, 'test_story_chain_2');
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  runtime.lan.next();
  assert.equal(runtime.window.LanDisplayMode.mode, 'companion');
});

test('拖动写入lanMemory.lanUI，刷新后恢复自定义位置', () => {
  const storage = new Map(); const runtime = createRuntime(storage);
  runtime.lan.trigger('lan.gallery.select-era');
  const box = runtime.document.getElementById('lanCompanion');
  const dragHandle = box.querySelector('.lan-drag-area');
  dragHandle.events.pointerdown[0]({ clientX: 710, clientY: 610, target: { closest: () => null }, preventDefault() {} });
  runtime.document.listeners.get('pointermove')[0]({ clientX: 730, clientY: 580 });
  runtime.document.listeners.get('pointerup')[0]();
  assert.deepEqual({ ...runtime.lan.LanMemory.lanUI }, { position: 'custom', x: 712, y: 570 });
  const refreshed = createRuntime(storage);
  refreshed.lan.trigger('lan.gallery.select-era');
  assert.deepEqual({ ...refreshed.lan.LanMemory.lanUI }, { position: 'custom', x: 712, y: 570 });
  assert.equal(refreshed.document.getElementById('lanCompanion').dataset.position, 'custom');
});

test('快捷换角落按bottom-right、bottom-left、top-left、top-right循环并持久化', () => {
  const runtime = createRuntime(); runtime.lan.trigger('lan.home.first-visit');
  const expected = ['bottom-left', 'top-left', 'top-right', 'bottom-right'];
  for (const position of expected) { runtime.lan.moveCardToNextCorner(); assert.equal(runtime.lan.LanMemory.lanUI.position, position); }
});

test('澜显示偏好兼容保存：简洁模式在对白结束后收起，始终陪伴可重新展开', () => {
  const runtime = createRuntime();
  runtime.lan.setDisplayPreference('minimal');
  assert.equal(runtime.window.LanDisplayMode.mode, 'hidden');
  runtime.lan.onRoute('chapter', { era: '1G' });
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  runtime.lan.skip();
  assert.equal(runtime.window.LanDisplayMode.mode, 'hidden');
  runtime.lan.setDisplayPreference('always');
  assert.equal(runtime.window.LanDisplayMode.mode, 'companion');
  const saved = JSON.parse(runtime.storage.get(memoryKey));
  assert.equal(saved.settings.display.lanMode, 'always');
  assert.deepEqual(saved.viewedDialogues, []);
});

test('澜情绪控制器使用对白既有emotion同步状态标签与视觉状态', () => {
  const runtime = createRuntime();
  runtime.lan.setEmotion('research');
  const box = runtime.document.getElementById('lanCompanion');
  assert.equal(box.dataset.emotion, 'research');
  assert.equal(box.querySelector('#lanEmotion').textContent, '研究中');
  assert.equal(runtime.window.LanEmotionController.set('curious'), 'curious');
});

test('中心模式、陪伴卡片、拖动把手和减少动态效果样式已定义', () => {
  for (const selector of ['.lan-dialogue-center', '.lan-companion-card', '.lan-avatar', '.lan-drag-area']) assert.ok(cssSource.includes(selector));
  assert.match(cssSource, /prefers-reduced-motion:\s*reduce/);
});

test('六代正式入口真实触发后，章节重绘仍由澜系统恢复中央模式', () => {
  const files = ['lan-dialogue-1g.js','lan-dialogue-2g.js','lan-dialogue-3g.js','lan-dialogue-4g.js','lan-dialogue-5g.js','lan-dialogue-6g.js'];
  for (const file of files) {
    const runtime = createRuntime(new Map(), window => {
      for (const dataFile of files) vm.runInNewContext(fs.readFileSync(`assets/js/${dataFile}`, 'utf8'), { window }, { filename: dataFile });
    });
    const era = file.match(/([1-6])g/)?.[1] + 'G';
    const entry = runtime.window[`LanDialogues${era}`]?.find(item => item.location === 'entrance');
    assert.ok(entry, `${era}入口对白存在`);
    assert.equal(runtime.lan.trigger(entry.id, era), true, `${era}由澜系统触发入口剧情`);
    const box = runtime.document.getElementById('lanCompanion');
    assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
    assert.equal(box.dataset.mode, 'dialogue');
    assert.equal(box.parentElement, runtime.body);
    // Simulate the old node being placed into the newly rendered slot.
    runtime.slot.append(box);
    runtime.lan.onRoute('chapter', { era });
    assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue', `${era}重绘后仍为剧情模式`);
    assert.equal(box.dataset.mode, 'dialogue', `${era}重绘后DOM仍为中央模式`);
    assert.equal(box.parentElement, runtime.body, `${era}重绘后澜离开章节裁剪容器`);
    assert.equal(runtime.lan.debugSnapshot().duplicateCount, 1, `${era}只有一个澜卡片DOM`);
  }
});

test('正式剧情播放时隐藏或普通卡片请求不能降级显示模式', () => {
  const runtime = createRuntime();
  runtime.lan.trigger('lan_1g_task_start_001', '1G');
  assert.equal(runtime.lan.hideDialogue(), false);
  runtime.lan.setDisplayMode('companion');
  assert.equal(runtime.window.LanDisplayMode.mode, 'dialogue');
  assert.equal(runtime.document.getElementById('lanCompanion').dataset.mode, 'dialogue');
});
