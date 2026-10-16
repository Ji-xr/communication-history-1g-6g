'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/lan-system.js', 'utf8');
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

function runtime(fixtures = []) {
  const nodes = new Map(); const body = new Element();
  body.append = element => { element.parentElement = body; nodes.set(element.id, element); nodes.set(`#${element.id}`, element); };
  const app = new Element(); app.hidden = false;
  const document = {
    body,
    getElementById: id => nodes.get(id) || nodes.get(`#${id}`) || null,
    createElement: () => new Element(),
    querySelector(selector) {
      if (selector === '#app') return app;
      if (selector === '#lanCaption' || selector === '#lanEmotion' || selector === '#lanVoiceNote') return nodes.get('lanCompanion')?.querySelector(selector) || null;
      return nodes.get(selector) || null;
    },
    addEventListener() {}, removeEventListener() {}
  };
  const store = new Map();
  const localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)) };
  const window = { innerWidth: 1200, innerHeight: 900, dispatchEvent() {} };
  let fakeNow=1000; class TestDate extends Date { static now(){fakeNow+=200;return fakeNow;} }
  const context = { window, document, localStorage, CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }, Date:TestDate, JSON, String, Object, Array, Math, Set, console };
  vm.runInNewContext(dialogueSource, context, { filename: 'lan-dialogue-1g.js' });
  window.LanDialogues1G.push(...fixtures);
  vm.runInNewContext(source, context, { filename: 'lan-system.js' });
  return { lan: window.CommsArchiveLan, window, document };
}

function cardClick(box) { box.events.click[0]({ target: { closest: () => null } }); }
function keyPress(box, key, target = box) { let prevented = false; box.events.keydown[0]({ key, target, preventDefault() { prevented = true; } }); return prevented; }

test('主动任务反馈与归档对白进入中央模式；普通展品补充对白留在陪伴卡片', () => {
  const app = runtime([
    { id: 'fixture.task-feedback', era: '1G', location: 'task', trigger: 'inspect-signal', emotion: 'thinking', dialogueType: 'optional', text: '线索反馈。' },
    { id: 'fixture.archive-note', era: '1G', location: 'archive', trigger: 'view-archive', emotion: 'research', dialogueType: 'optional', text: '归档总结。' },
    { id: 'fixture.exhibit-note', era: '1G', location: 'exhibit', trigger: 'view-object', emotion: 'curious', dialogueType: 'optional', text: '展品补充说明。' }
  ]);
  app.lan.trigger('fixture.task-feedback');
  assert.equal(app.window.LanDisplayMode.mode, 'dialogue');
  app.lan.skip();
  app.lan.trigger('fixture.archive-note');
  assert.equal(app.window.LanDisplayMode.mode, 'dialogue');
  app.lan.skip();
  app.lan.trigger('fixture.exhibit-note');
  assert.equal(app.window.LanDisplayMode.mode, 'companion');
});

test('中央对白播放中点击“收为卡片”只登记结束后收起，不移动或重挂载面板', () => {
  const app = runtime(); app.lan.trigger('lan_1g_enter_001', '1G');
  const box = app.document.getElementById('lanCompanion'); const startingParent = box.parentElement;
  const startingPosition = box.getBoundingClientRect(); const control = box.querySelector('.lan-collapse');
  assert.equal(app.lan.toggleCollapse(), true);
  assert.equal(app.window.LanDisplayMode.mode, 'dialogue');
  assert.equal(box.parentElement, startingParent);
  assert.deepEqual(box.getBoundingClientRect(), startingPosition);
  assert.equal(control.textContent, '结束后收起');
  while (app.lan.currentDialogue) app.lan.next();
  assert.equal(app.window.LanDisplayMode.mode, 'companion');
  assert.equal(box.classList.contains('is-collapsed'), true);
  assert.equal(app.lan.LanMemory.lanUI.position, 'bottom-right');
});

test('同一章节重新绘制不会提前结束入场状态或重播入场动画', () => {
  const app = runtime(); app.lan.onRoute('chapter', { era: '1G' });
  const box = app.document.getElementById('lanCompanion');
  assert.equal(app.window.lanDialoguePhase.phase, 'enter');
  app.lan.onRoute('chapter', { era: '1G' });
  assert.equal(app.window.lanDialoguePhase.phase, 'enter');
  assert.equal(app.document.getElementById('lanCompanion'), box);
  app.lan.next();
  assert.equal(app.window.lanDialoguePhase.phase, 'talking');
});

test('整段对白使用同一面板；点击、Enter、空格逐句推进，跳过清空队列', () => {
  const app = runtime(); app.lan.trigger('lan_1g_enter_001', '1G');
  const box = app.document.getElementById('lanCompanion'); const id = app.lan.currentDialogue.id;
  const firstIndex = app.lan.currentDialogue.lineIndex;
  cardClick(box);
  assert.equal(app.lan.currentDialogue.lineIndex, firstIndex + 1);
  keyPress(box, 'Enter');
  assert.equal(app.lan.currentDialogue.lineIndex, firstIndex + 2);
  keyPress(box, ' ');
  assert.equal(app.lan.currentDialogue.lineIndex, firstIndex + 3);
  assert.equal(box.dataset.mode, 'dialogue');
  assert.equal(app.lan.currentDialogue.id, id);
  app.lan.skip();
  assert.equal(app.lan.currentDialogue, null);
  assert.equal(app.window.LanDisplayMode.mode, 'companion');
  assert.equal(box.querySelector('#lanCardHint').textContent, '点击卡片查看澜提示');
});

test('空对白返回失败且不冒充成功；活动对白不会被回看按钮覆盖', () => {
  const app = runtime([
    { id: 'fixture.empty', era: '1G', location: 'task', trigger: 'empty', emotion: 'thinking', dialogueType: 'hint', text: '  \n ' }
  ]);
  assert.equal(app.lan.trigger('fixture.empty'), false);
  app.lan.trigger('lan_1g_enter_001', '1G');
  const activeId = app.lan.currentDialogue.id; const button = app.document.getElementById('lanCompanion').querySelector('#lanRevisitButton');
  assert.equal(button.hidden, true);
  assert.equal(app.lan.currentDialogue.id, activeId);
  assert.equal(app.window.LanDisplayMode.mode, 'dialogue');
});

test('跳过记录的回看按钮在当前对白结束后重新开放', () => {
  const app = runtime(); app.lan.trigger('lan_1g_enter_001', '1G'); app.lan.skip();
  app.lan.onRoute('gallery', {}); app.lan.onRoute('chapter', { era: '1G' });
  const button = app.document.getElementById('lanCompanion').querySelector('#lanRevisitButton');
  assert.equal(button.hidden, true);
  while (app.lan.currentDialogue) app.lan.next();
  assert.equal(button.hidden, false);
  assert.equal(app.lan.replayLastSkipped(), true);
  assert.equal(app.lan.currentDialogue.id, 'lan_1g_enter_001');
});

test('澜卡片中声明的按键均有对应处理接口，历史记录翻页接口也完整', () => {
  const app = runtime(); app.lan.trigger('lan.home.first-visit');
  const box = app.document.getElementById('lanCompanion');
  const widgetHandlers = [...box.innerHTML.matchAll(/onclick="CommsArchiveLan\.([A-Za-z0-9_]+)\(/g)].map(match => match[1]);
  assert.ok(widgetHandlers.length >= 8);
  for (const name of widgetHandlers) assert.equal(typeof app.lan[name], 'function', `missing CommsArchiveLan.${name}`);
  for (const name of ['previous', 'next', 'jumpTo', 'close']) assert.equal(typeof app.window.LanDialogueNavigator[name], 'function', `missing LanDialogueNavigator.${name}`);
  const before = app.lan.currentDialogue.lineIndex;
  assert.equal(keyPress(box, 'Enter', { closest: () => ({}) }), false);
  assert.equal(app.lan.currentDialogue.lineIndex, before, '键盘事件不会与按钮原生操作重复触发');
});

test('引导队列结束或跳过后不会残留“点击继续”的假提示，状态释放', () => {
  const app = runtime(); app.lan.onRoute('chapter', { era: '1G' });
  const box = app.document.getElementById('lanCompanion');
  app.lan.skip();
  assert.equal(app.lan.debugSnapshot().isPlaying, false);
  assert.equal(app.lan.debugSnapshot().lanControlsReleased, true);
  assert.equal(box.querySelector('#lanCardHint').textContent, '点击卡片查看澜提示');
  assert.equal(app.lan.checkGuidedDialogueState({ route: 'chapter', era: '1G' }).ok, false);
});
