'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/audio-system.js', 'utf8');
const key = 'commsArchive.lanMemory.v1';
const audioPrefsKey = 'commsArchive.audioPreferences.v2';

class AudioNode {
  constructor() { this.gain = { value: 0, setTargetAtTime() {}, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }; this.frequency = { value: 0, setTargetAtTime() {} }; this.state = 'running'; this.events = {}; }
  connect() {} start() {} stop() {} addEventListener(type, callback) { this.events[type] = callback; }
  setAttribute() {} append() {}
  querySelector(selector) { if (!this.children) this.children = new Map(); if (!this.children.has(selector)) this.children.set(selector, new AudioNode()); return this.children.get(selector); }
}
class FakeAudioContext {
  constructor() { this.state = 'suspended'; this.currentTime = 1; this.destination = {}; }
  createGain() { return new AudioNode(); }
  createOscillator() { return new AudioNode(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

function createRuntime(storage = new Map(), audioSupported = true, demoManager = null) {
  const panel = new AudioNode(); panel.id = 'audioSettings';
  const toggle = new AudioNode();
  const brightnessVars = {};
  const body = new AudioNode(); body.style = { setProperty(name, value) { brightnessVars[name] = value; } };
  const doc = {
    readyState: 'complete', body, documentElement: { dataset: {} }, events: {},
    createElement: () => panel,
    querySelector: selector => selector === '#audioSettingsToggle' ? toggle : null,
    addEventListener(type, callback) { this.events[type] = callback; },
    removeEventListener(type) { delete this.events[type]; }
  };
  const localStorage = { getItem: item => storage.get(item) || null, setItem: (item, value) => storage.set(item, String(value)) };
  const window = { document: doc, localStorage, AudioContext: audioSupported ? FakeAudioContext : undefined, DemoManager: demoManager };
  const context = { window, localStorage, JSON, Number, Math, Object, Promise };
  vm.runInNewContext(source, context, { filename: 'audio-system.js' });
  return { audio: window.AudioSystem, storage, panel, toggle, document: doc, brightnessVars };
}

test('音效设置保存在独立偏好键，保留已有LanMemory与进度字段', () => {
  const storage = new Map([[key, JSON.stringify({ visited: ['1G'], settings: { audio: { enabled: true, volume: 70 } } })]]);
  const runtime = createRuntime(storage);
  runtime.audio.setVolume(42);
  runtime.audio.setEnabled(false);
  const legacy = JSON.parse(storage.get(key));
  assert.deepEqual(legacy.visited, ['1G']);
  assert.deepEqual(legacy.settings.audio, { enabled: true, volume: 70 });
  assert.deepEqual(JSON.parse(storage.get(audioPrefsKey)), { version: 2, enabled: false, volume: 42 });
  const refreshed = createRuntime(storage);
  assert.equal(refreshed.audio.state.enabled, false);
  assert.equal(refreshed.audio.state.volume, 42);
});

test('时代切换选择独立氛围主题，禁用时不播放提示音', () => {
  const runtime = createRuntime();
  runtime.audio.setEra('5G');
  assert.equal(runtime.audio.state.currentTrack, 'era_5g');
  runtime.audio.setEnabled(false);
  assert.equal(runtime.audio.playEffect('complete'), false);
});

test('首次真实用户点击后才恢复AudioContext', async () => {
  const runtime = createRuntime();
  runtime.audio.setEnabled(false);
  assert.equal(runtime.audio.playEffect('click'), false);
  runtime.audio.setEnabled(true);
  runtime.document.events.click({ isTrusted: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(runtime.audio.playEffect('click'), true);
});

test('不支持WebAudio时给出降级状态，接口不抛错', async () => {
  const runtime = createRuntime(new Map(), false);
  runtime.audio.setEra('6G');
  runtime.audio.setEnabled(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(runtime.audio.state.currentTrack, 'era_6g');
  assert.equal(runtime.audio.playEffect('dialogue'), false);
});

test('演示模式音量使用独立音效偏好命名空间，退出后恢复日常设置', () => {
  const storage = new Map([[key, JSON.stringify({ settings: { audio: { enabled: true, volume: 42 } } })]]);
  let demoActive = true;
  const demoManager = { storageKey(value) { return demoActive ? `demoArchive::${value}` : value; } };
  const runtime = createRuntime(storage, true, demoManager);
  runtime.audio.setVolume(91);
  assert.equal(JSON.parse(storage.get(key)).settings.audio.volume, 42);
  assert.equal(JSON.parse(storage.get(`demoArchive::${audioPrefsKey}`)).volume, 91);
  demoActive = false;
  runtime.audio.reloadSettings();
  assert.equal(runtime.audio.state.volume, 42);
});

test('亮度、澜显示模式与操作提示单独保存在localStorage，不改写进度档案', () => {
  const storage = new Map([["commsArchive", JSON.stringify({ completed: ['1G'] })]]);
  const runtime = createRuntime(storage);
  runtime.audio.setBrightness(118);
  runtime.audio.setLanMode('minimal');
  runtime.audio.setOperationHints(false);
  assert.deepEqual(JSON.parse(storage.get('commsArchive.experienceSettings.v1')), { brightness: 118, lanMode: 'minimal', operationHints: false });
  assert.equal(runtime.brightnessVars['--brightness-overlay-opacity'], '0.126');
  assert.equal(runtime.document.documentElement.dataset.operationHints, 'off');
  assert.equal(storage.get('commsArchive'), JSON.stringify({ completed: ['1G'] }));
  const refreshed = createRuntime(storage);
  assert.equal(refreshed.audio.state.brightness, 118);
  assert.equal(refreshed.audio.state.lanMode, 'minimal');
  assert.equal(refreshed.audio.state.operationHints, false);
});
