'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const phoneSource = fs.readFileSync('assets/js/experience-1g-phone.js', 'utf8');
const interactionsSource = fs.readFileSync('assets/js/experience-interactions.js', 'utf8');
const phoneKey = 'commsArchive1GPhoneSession.v1';

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
function runtime(options = {}) {
  const sessionStorage = storage(options.initial), elements = new Map(), completed = [];
  let owner = {}, observer, demo = false;
  const app = { querySelector(selector) { return selector === '.experience-1g' ? owner : null; } };
  const document = {
    getElementById(id) {
      if (id === 'app') return app;
      if (!elements.has(id)) elements.set(id, { hidden: true, textContent: '', pause() {}, removeAttribute(name) { delete this[name]; } });
      return elements.get(id);
    },
    querySelector(selector) { return selector === '.experience-1g' ? owner : null; }
  };
  const recordings = [], requests = [], revoked = [];
  const window = {
    document, sessionStorage, localStorage: storage(), isSecureContext: true, addEventListener() {},
    DemoManager: { storageKey: key => demo ? `demo:${key}` : key },
    CommsArchiveLan: { LanMemory: { completedExperienceNodes: completed } },
    completeEraExperienceNode(era, id) { if (!completed.includes(id)) completed.push(id); return true; }, render() {},
    URL: { createObjectURL: () => 'blob:recording', revokeObjectURL: value => revoked.push(value) },
    MutationObserver: class { constructor(callback) { observer = callback; } observe() {} },
    navigator: { mediaDevices: { getUserMedia() { return new Promise((resolve, reject) => requests.push({ resolve, reject })); } } },
    MediaRecorder: class {
      constructor(stream) { this.stream = stream; this.state = 'inactive'; this.mimeType = 'audio/webm'; recordings.push(this); }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['audio']) }); this.onstop?.(); }); }
    }
  };
  const context = vm.createContext({ window, document, console, setTimeout, clearTimeout, Blob });
  vm.runInContext(phoneSource, context);
  vm.runInContext(interactionsSource, context);
  return { window, api: window.CommsArchive1GPhone, completed, sessionStorage, elements, requests, recordings, revoked,
    replaceOwner(value = {}) { owner = value; observer(); }, setDemo(value) { demo = value; } };
}
function microphone() { const track = { stopped: false, stop() { this.stopped = true; } }; return { track, stream: { getTracks: () => [track] } }; }
function phoneMap(api, x, y) {
  const phone = { dataset: {}, style: {}, handlers: {}, addEventListener(name, handler) { this.handlers[name] = handler; }, setPointerCapture() {} };
  const map = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) };
  api.bind({ querySelector: selector => selector === '.experience-1g-map' ? map : selector === '.experience-1g-phone' ? phone : null });
  phone.handlers.pointerdown({ pointerId: 1, button: 0, preventDefault() {} });
  phone.handlers.pointermove({ pointerId: 1, clientX: x, clientY: y });
  phone.handlers.pointerup({ pointerId: 1 });
}

test('1G重拨时重新检查当前位置覆盖，挂断后重新输入的号码可见', () => {
  const r = runtime(), api = r.api;
  for (let index = 0; index < 7; index++) api.press('0');
  assert.equal(api.dial(), true);
  phoneMap(api, 84, 18);
  assert.equal(api.confirmCoverage(), true);
  phoneMap(api, 15, 79);
  assert.equal(api.dial(), false);
  assert.equal(api.getState().phase, 'ready');
  assert.match(r.elements.get('oneGCallStatus').textContent, /信号已降至/);
  api.hangup(); api.press('0');
  assert.match(api.render({ id: '1G', moment: '场景' }), /id="oneGNumber">0<\/strong>/);
});

test('1G损坏的会话缓存恢复为可操作值，并转义缓存中的HTML', () => {
  const r = runtime({ initial: { [phoneKey]: JSON.stringify({ phase: 'unknown', digits: { broken: true }, x: 'wrong', y: -200, familyIndex: -2, message: '<img src=x onerror=alert(1)>' }) } });
  const value = r.api.getState();
  assert.equal(value.phase, 'dial'); assert.equal(value.digits, ''); assert.equal(value.x, 15); assert.equal(value.y, 10); assert.equal(value.familyIndex, 0);
  assert.equal(r.api.press('0'), true);
  const html = r.api.render({ id: '1G', moment: '<b>场景</b>' });
  assert.doesNotMatch(html, /<img|<b>场景/);
  assert.match(html, /&lt;img/);
  assert.equal(r.api.confirmCoverage(), false, '拨号之前不能直接登记覆盖步骤');
});

test('录音的重复开始不会并行申请或覆盖活动麦克风流', async () => {
  const r = runtime(), mic = microphone();
  const pending = r.api.startRecording();
  assert.equal(await r.api.startRecording(), false);
  assert.equal(r.requests.length, 1);
  r.requests[0].resolve(mic.stream);
  assert.equal(await pending, true);
  assert.equal(await r.api.startRecording(), false);
  assert.equal(r.recordings.length, 1);
  assert.equal(r.api.stopRecording(), true);
  await Promise.resolve();
  assert.equal(mic.track.stopped, true);
  assert.equal(r.elements.get('oneGRecordingPlayback').hidden, false);
  r.api.cleanupRecording();
  assert.equal(r.elements.get('oneGRecordingPlayback').hidden, true);
  assert.deepEqual(r.revoked, ['blob:recording']);
});

test('取消待授权录音后，迟到的权限结果释放设备且不会影响下一次录音', async () => {
  const r = runtime(), oldMic = microphone(), newMic = microphone();
  const first = r.api.startRecording();
  assert.equal(r.api.stopRecording(), true);
  const second = r.api.startRecording();
  r.requests[1].resolve(newMic.stream);
  assert.equal(await second, true);
  r.requests[0].resolve(oldMic.stream);
  assert.equal(await first, false);
  assert.equal(oldMic.track.stopped, true);
  assert.equal(newMic.track.stopped, false);
  r.api.cleanup(); assert.equal(newMic.track.stopped, true);
});

test('旧权限请求失败不会停止后续有效录音', async () => {
  const r = runtime(), mic = microphone();
  const old = r.api.startRecording(); r.api.cleanupRecording();
  const current = r.api.startRecording(); r.requests[1].resolve(mic.stream);
  assert.equal(await current, true);
  r.requests[0].reject(new Error('old request failed'));
  assert.equal(await old, false);
  assert.equal(mic.track.stopped, false);
  r.api.cleanup(); assert.equal(mic.track.stopped, true);
});

test('体验界面重绘和正式/演示模式切换都会释放当前录音', async () => {
  const r = runtime(), firstMic = microphone();
  const first = r.api.startRecording(); r.requests[0].resolve(firstMic.stream); await first;
  r.replaceOwner(); await Promise.resolve();
  assert.equal(firstMic.track.stopped, true);
  assert.equal(r.elements.get('oneGRecordingPlayback').hidden, true);
  const secondMic = microphone(), second = r.api.startRecording();
  r.requests[1].resolve(secondMic.stream); await second;
  r.setDemo(true); r.api.getState(); await Promise.resolve();
  assert.equal(secondMic.track.stopped, true);
  r.api.press('1'); r.setDemo(false); r.api.press('2'); r.api.reset();
  assert.equal(r.api.getState().digits, '');
  r.setDemo(true); assert.equal(r.api.getState().digits, '1', '正式重置保留演示会话');
});

test('录音权限等待期间替换界面会丢弃迟到的设备流', async () => {
  const r = runtime(), mic = microphone(), pending = r.api.startRecording();
  r.replaceOwner(); r.requests[0].resolve(mic.stream);
  assert.equal(await pending, false);
  assert.equal(mic.track.stopped, true);
  assert.equal(r.recordings.length, 0);
});

test('两步体验进度从越界步骤和过期完成标记恢复，未知缓存不进入运行状态', () => {
  const r = runtime(), key = 'commsArchiveExperienceProgress.v1';
  r.window.localStorage.setItem(key, JSON.stringify({
    '2G:EXPERIENCE_2G_COMPOSE': { step: 1, feedback: ['wrong'], complete: true },
    '2G:EXPERIENCE_2G_RELAY': { step: 999, feedback: [], complete: false },
    '2G:EXPERIENCE_2G_DELIVERY': { step: -5, feedback: ['wrong'], complete: true },
    'fake:UNKNOWN': { step: 1, feedback: [], complete: true }
  }));
  const api = r.window.CommsArchiveExperience;
  assert.equal(api.get('2G', 'EXPERIENCE_2G_COMPOSE').complete, false);
  assert.equal(api.advance('2G', 'EXPERIENCE_2G_COMPOSE').complete, true);
  const recovered = api.get('2G', 'EXPERIENCE_2G_RELAY');
  assert.equal(recovered.step, 2); assert.equal(recovered.complete, true); assert.equal(recovered.feedback.length, 2);
  assert.equal(api.get('2G', 'EXPERIENCE_2G_DELIVERY').step, 0);
  assert.equal(api.get('fake', 'UNKNOWN'), null);
});
