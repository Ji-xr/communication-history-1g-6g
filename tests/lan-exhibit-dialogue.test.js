'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const scripts = [
  'assets/js/lan-dialogue-1g.js', 'assets/js/lan-dialogue-2g.js', 'assets/js/lan-dialogue-3g.js',
  'assets/js/lan-dialogue-3g-archive.js', 'assets/js/lan-dialogue-4g.js', 'assets/js/lan-dialogue-5g.js',
  'assets/js/lan-dialogue-6g.js', 'assets/js/lan-system.js'
];

class Element {
  constructor(id = '') {
    this.id = id;
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.textContent = '';
    this.innerHTML = '';
    this.parentElement = null;
    this.nodes = new Map();
    this.listeners = {};
    this.classNames = new Set();
    this.classList = {
      toggle: (name, force) => {
        const enabled = force === undefined ? !this.classNames.has(name) : !!force;
        enabled ? this.classNames.add(name) : this.classNames.delete(name);
        return enabled;
      },
      add: name => this.classNames.add(name),
      remove: name => this.classNames.delete(name),
      contains: name => this.classNames.has(name)
    };
  }
  append(node) { if (node) node.parentElement = this; }
  setAttribute() {}
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  removeEventListener() {}
  querySelector(selector) {
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element(selector.replace(/^#|^\./, '')));
    return this.nodes.get(selector);
  }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; }
}

function runtime(era = null) {
  const nodes = new Map();
  const body = new Element('body');
  body.append = node => { node.parentElement = body; nodes.set(node.id, node); };
  const slot = new Element('progressLanSlot');
  const app = new Element('app'); app.hidden = false;
  const document = {
    body,
    getElementById(id) { return nodes.get(id) || (id === 'progressLanSlot' ? slot : null); },
    createElement(tag) { return new Element(tag); },
    querySelector(selector) {
      if (selector === '#app') return app;
      if (selector === '#lanCaption' || selector === '#lanEmotion' || selector === '#lanVoiceNote') return nodes.get('lanCompanion')?.querySelector(selector) || null;
      return null;
    },
    querySelectorAll(selector) { return selector === '#lanCompanion' && nodes.has('lanCompanion') ? [nodes.get('lanCompanion')] : []; },
    addEventListener() {},
    removeEventListener() {}
  };
  const store = new Map();
  if (era === '6G') store.set('commsArchive.lanMemory.v1', JSON.stringify({ completedEras: ['5G'] }));
  const localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)) };
  const debugEvents = [];
  const window = {
    innerWidth: 1280,
    innerHeight: 900,
    dispatchEvent() {},
    AudioSystem: { playEffect() {}, setEra() {} },
    InteractionDebugger: { record: (...args) => debugEvents.push(args) }
  };
  const context = {
    window, document, localStorage, console, Date, JSON, String, Number, Object, Array, Math, Set,
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  };
  for (const file of scripts) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  if (era) window.CommsArchiveLan.onRoute('chapter', { era });
  return { lan: window.CommsArchiveLan, window, document, store, debugEvents };
}

test('六代正式入口由真实章节路由触发中央对白，并挂到页面顶层', () => {
  const ids = { '1G': 'lan_1g_enter_001', '2G': 'lan_2g_enter_001', '3G': 'lan_3g_enter_001', '4G': 'lan_4g_enter_001', '5G': 'lan_5g_enter_001', '6G': 'lan_6g_enter_001' };
  for (const [era, id] of Object.entries(ids)) {
    const rt = runtime(era);
    const snapshot = rt.lan.debugSnapshot();
    assert.equal(snapshot.activeDialogueId, id, `${era}入口ID`);
    assert.equal(snapshot.displayMode, 'dialogue', `${era}状态`);
    assert.equal(snapshot.queueDisplayMode, 'dialogue', `${era}队列状态`);
    assert.equal(snapshot.domMode, 'dialogue', `${era}DOM状态`);
    assert.equal(snapshot.dialogueSurface, '', `${era}时代入口不应误用展品专用层级`);
    assert.equal(snapshot.domParent, 'body', `${era}中央框不应留在进度栏`);
    assert.equal(rt.document.getElementById('lanCompanion').dataset.mode, 'dialogue');
    rt.lan.setDisplayMode('companion');
    assert.equal(rt.lan.debugSnapshot().domMode, 'dialogue', `${era}重绘/普通模式请求不能降级正在播放的剧情`);
  }
});

test('时代展品事件实际播放的讲解统一进入中央模式', () => {
  const inventory = runtime().lan.dialogueData.filter(item =>
    /^lan_[1-6]g_/.test(item.id) && ['exhibit', 'exhibit-detail'].includes(item.location)
  );
  assert.ok(inventory.length >= 15, `展品讲解清单不完整：${inventory.length}`);
  for (const item of inventory) {
    const rt = runtime();
    const rule = rt.lan.triggers.find(trigger => trigger.dialogueId === item.id && /^EXHIBIT/.test(trigger.event || ''));
    assert.ok(rule, `${item.id}缺少实际展品事件映射`);
    const opened = rule.event === 'EXHIBIT_CLICK'
      ? rt.lan.onExhibit(rule.condition.era, rule.condition.exhibitId)
      : rt.lan.dispatchEvent(rule.event, rule.condition);
    assert.equal(opened, true, `${item.id}事件未执行`);
    const snapshot = rt.lan.debugSnapshot();
    assert.equal(snapshot.activeDialogueId, item.id);
    assert.equal(snapshot.displayMode, 'dialogue', `${item.id}应中央显示`);
    assert.equal(snapshot.queueDisplayMode, 'dialogue');
    assert.equal(snapshot.domMode, 'dialogue');
    assert.equal(snapshot.dialogueSurface, 'exhibit', `${item.id}需要展品讲解层级`);
    assert.equal(snapshot.domParent, 'body');
  }
});

test('lan.exhibit.open是通用单句提示，保持陪伴模式且不会抢占2G正式入口剧情', () => {
  const idle = runtime();
  assert.equal(idle.lan.onExhibit('2G', 'exhibit.2g.unmapped'), true);
  assert.equal(idle.lan.debugSnapshot().activeDialogueId, 'lan.exhibit.open');
  assert.equal(idle.lan.debugSnapshot().displayMode, 'companion');
  assert.equal(idle.lan.debugSnapshot().queueDisplayMode, 'companion');
  assert.equal(idle.lan.debugSnapshot().dialogueSurface, '');

  const duringStory = runtime('2G');
  const before = duringStory.lan.debugSnapshot();
  assert.equal(before.activeDialogueId, 'lan_2g_enter_001');
  assert.equal(duringStory.lan.onExhibit('2G', 'exhibit.2g.handset'), false);
  const after = duringStory.lan.debugSnapshot();
  assert.equal(after.activeDialogueId, 'lan_2g_enter_001');
  assert.equal(after.displayMode, 'dialogue');
  assert.equal(after.queueDisplayMode, 'dialogue');
  assert.ok(duringStory.debugEvents.some(([event, , detail]) => event === 'LAN_DIALOGUE_SUPPRESSED' && detail.reason === 'formal-dialogue-active'));
  assert.ok(!duringStory.lan.LanMemory.completedTriggers.includes('trigger_2g_phone'), '被抑制的展品事件不能被误记为已完成');
});

test('正式展品讲解结束后恢复陪伴卡片，且普通手动章节导航状态不被设置', () => {
  const rt = runtime();
  assert.equal(rt.lan.onExhibit('2G', 'exhibit.2g.handset'), true);
  const length = rt.lan.dialogueData.find(item => item.id === 'lan_2g_phone_001').text.split('\n').length;
  for (let i = 0; i < length; i++) rt.lan.next();
  const snapshot = rt.lan.debugSnapshot();
  assert.equal(snapshot.isPlaying, false);
  assert.equal(snapshot.displayMode, 'companion');
  assert.equal(snapshot.domMode, 'companion');
  assert.equal(snapshot.dialogueSurface, '');
  assert.equal(snapshot.domParent, 'progressLanSlot');
  assert.ok(!rt.debugEvents.some(([event]) => event === 'NAVIGATION_SUCCESS'), '展品对白结束不能自动切换章节');
});
