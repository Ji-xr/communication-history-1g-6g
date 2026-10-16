'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/experience-1g-phone.js', 'utf8');

function makePhoneRuntime(overrides = {}) {
  const memory = new Map(), done = [], elements = new Map(); let renders = 0;
  const sessionStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)) };
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, { textContent: '', value: 0, hidden: true, removeAttribute() {}, pause() {} }); return elements.get(id); },
    querySelector() { return null; }
  };
  const window = {
    sessionStorage, document, URL: { createObjectURL() { return 'blob:session-only'; }, revokeObjectURL() {} },
    addEventListener() {},
    CommsArchiveLan: { LanMemory: { completedExperienceNodes: done } },
    completeEraExperienceNode(era, trigger) { if (!done.includes(trigger)) done.push(trigger); renders += 1; return true; },
    render() { renders += 1; },
    ...overrides
  };
  const context = vm.createContext({ window, document, console, Math, Number, String, Set, Map, Array, Object, JSON, Blob, setTimeout, clearTimeout });
  vm.runInContext(source, context, { filename: 'experience-1g-phone.js' });
  return { api: window.CommsArchive1GPhone, window, done, memory, elements, get renders() { return renders; } };
}

test('1G模拟设备要求实际输入虚构号码，错误号码不推进体验', () => {
  const runtime = makePhoneRuntime(), { api } = runtime;
  const markup = api.render({ id: '1G', moment: '早期移动电话让用户在外出时联系家人。' });
  assert.match(markup, /000-0000/);
  assert.match(markup, /不会连接电话网络/);
  assert.match(markup, /oneg-keypad/);
  api.press('1');
  assert.equal(api.dial(), false);
  assert.equal(api.getState().phase, 'dial');
  assert.equal(runtime.done.length, 0);
  assert.match(runtime.elements.get('oneGCallStatus').textContent, /号码不匹配/);
  for (let i = 0; i < 6; i++) api.press('0');
  assert.equal(api.getState().digits, '1000000');
});

test('1G呼叫经历覆盖失败、可拖动寻找可用信号、重拨后联系家人并写入三个既有体验节点', () => {
  const runtime = makePhoneRuntime(), { api, done } = runtime;
  for (let i = 0; i < 7; i++) api.press('0');
  assert.equal(api.dial(), true);
  assert.equal(api.getState().phase, 'locate');
  assert.match(api.getState().message, /呼叫未建立/);
  assert.ok(done.includes('EXPERIENCE_1G_CALL'));
  assert.ok(api.signalAt(15, 79) < 64, '初始位置覆盖不足');

  let best = { x: 0, y: 0, signal: 0 };
  for (let x = 0; x <= 100; x += 2) for (let y = 0; y <= 100; y += 2) {
    const signal = api.signalAt(x, y); if (signal > best.signal) best = { x, y, signal };
  }
  assert.ok(best.signal >= 64, '街区中存在可用覆盖位置');
  const fakePhone = { style: {}, dataset: {}, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, setPointerCapture() {} };
  const fakeMap = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) };
  const container = { querySelector(selector) { return selector === '.experience-1g-map' ? fakeMap : selector === '.experience-1g-phone' ? fakePhone : null; } };
  api.bind(container);
  fakePhone.listeners.pointerdown({ pointerId: 7, preventDefault() {} });
  fakePhone.listeners.pointermove({ pointerId: 7, clientX: best.x, clientY: best.y });
  fakePhone.listeners.pointerup({ pointerId: 7 });
  assert.equal(Math.round(api.getState().x), best.x, '鼠标/触摸拖动会更新电话位置');
  assert.equal(Math.round(api.getState().y), best.y, '拖动位置可在当前会话恢复');
  assert.ok(api.signalAt(api.getState().x, api.getState().y) >= 64);
  assert.equal(api.confirmCoverage(), true);
  assert.ok(done.includes('EXPERIENCE_1G_COVERAGE'));
  assert.equal(api.getState().phase, 'ready');
  assert.equal(api.dial(), true);
  assert.equal(api.getState().phase, 'family');
  api.nextFamilyLine(); api.nextFamilyLine(); api.nextFamilyLine();
  assert.equal(api.finishCall(), true);
  assert.ok(done.includes('EXPERIENCE_1G_RECONNECT'));
  assert.equal(api.getState().phase, 'summary');
  assert.match(api.render({ id: '1G', moment: '场景' }), /记录时代影响/);
});

test('1G找信号模型同时考虑路径遮挡，不把信号简单等同于距基站远近', () => {
  const { api } = makePhoneRuntime();
  assert.notEqual(api.signalAt(62, 25), api.signalAt(62, 55));
  assert.ok(api.signalAt(15, 79) < api.signalAt(84, 18));
});

test('录音不自动请求麦克风；权限拒绝可跳过且不阻断通话体验', async () => {
  let requests = 0;
  const runtime = makePhoneRuntime({ navigator: { mediaDevices: { async getUserMedia() { requests += 1; const error = new Error('denied'); error.name = 'NotAllowedError'; throw error; } } }, MediaRecorder: function MediaRecorder() {}, isSecureContext: true, location: { hostname: 'localhost' } });
  assert.equal(requests, 0, '载入模块不会申请麦克风');
  assert.equal(await runtime.api.startRecording(), false);
  assert.equal(requests, 1, '只有用户调用开始录音才请求麦克风');
  assert.match(runtime.elements.get('oneGRecordingStatus').textContent, /可以跳过录音/);
  assert.equal(runtime.api.getState().phase, 'dial');
});
