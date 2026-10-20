'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appSource = fs.readFileSync('app.js', 'utf8');

function between(start, end) {
  const from = appSource.indexOf(start);
  const to = appSource.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing app source segment: ${start}`);
  return appSource.slice(from, to).trim();
}

function createGalleryRuntime() {
  let nextTimer = 0;
  const timers = new Map();
  const app = { hidden: true };
  const elements = {
    '#archive3d': { hidden: false },
    '#galleryStatus': { hidden: true, innerHTML: '' },
    '#galleryInfo': { hidden: true },
    '#exhibitHint': { hidden: true, textContent: '' },
    '#modalRoot': { innerHTML: '' }
  };
  const classes = new Set(['gallery-open']);
  const state = { visited: [], completed: [], tasks: {}, logs: [], evidence: [] };
  const context = vm.createContext({
    window: { InteractionDebugger: { record() {} }, CommsArchiveViewerFlow: { set() {} } },
    document: {
      querySelector(selector) { return elements[selector] || null; },
      body: { classList: { remove(value) { classes.delete(value); } } }
    },
    app, state,
    eras: [{ id: '1G', title: '失联的呼叫' }, { id: '2G', title: '迟迟未抵达的短信' }],
    galleryActive: true, galleryReturn: false, galleryInstance: { dispose() { context.disposals++; } },
    galleryRequestId: 0,
    route: 'eras', eraIndex: 0, reviewGuideActive: false,
    travelTimer: null, transitionInProgress: false, pendingEraIndex: null, lastEraEntryError: '',
    disposals: 0, entries: [], failures: [], renders: 0,
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    enterEra(index) { context.entries.push(index); context.route = 'chapter'; context.eraIndex = index; return true; },
    returnFromChapter() { context.route = 'eras'; },
    showTransitFailure(...args) { context.failures.push(args); },
    render() { context.renders++; }, rebindProgression() {}, save() { return true; },
    escapeHtml(value) { return String(value ?? ''); },
    showExhibitHint() {}, closeModal() {}, console, JSON, String, Number
  });
  const functions = [
    between('function close3DGallery(', 'function renderReviewTimeline('),
    between('function enterSelectedEra(', 'function returnFromChapter('),
    between('function beginEraTravel(', 'function cancelEraTravel('),
    between('function cancelEraTravel(', 'function showTransitFailure(')
  ];
  vm.runInContext(functions.join('\n'), context, { filename: 'app.js:gallery-navigation' });
  function runTimers() {
    for (const [id, callback] of [...timers]) {
      timers.delete(id);
      callback();
    }
  }
  return { context, app, elements, classes, timers, runTimers };
}

test('长廊时代介绍按钮进入章节后退出长廊并显示章节', () => {
  const runtime = createGalleryRuntime();
  runtime.context.enterSelectedEra(0);
  runtime.runTimers();
  assert.equal(runtime.context.route, 'chapter');
  assert.deepEqual(runtime.context.entries, [0]);
  assert.equal(runtime.app.hidden, false, '进入章节必须重新显示主内容');
  assert.equal(runtime.elements['#archive3d'].hidden, true);
  assert.equal(runtime.context.galleryActive, false);
  assert.equal(runtime.classes.has('gallery-open'), false);
  assert.equal(runtime.context.disposals, 1);
});

test('穿越等待期间退出展厅会取消定时导航，避免退出后仍被带入章节', () => {
  const runtime = createGalleryRuntime();
  runtime.context.beginEraTravel(0, true);
  assert.equal(runtime.timers.size, 1);
  runtime.context.close3DGallery();
  runtime.runTimers();
  assert.deepEqual(runtime.context.entries, []);
  assert.equal(runtime.context.route, 'eras');
  assert.equal(runtime.context.transitionInProgress, false);
  assert.equal(runtime.context.pendingEraIndex, null);
  assert.equal(runtime.elements['#galleryStatus'].hidden, true);
  assert.equal(runtime.app.hidden, false);
});

test('取消穿越后保留展厅并能再次选择时代', () => {
  const runtime = createGalleryRuntime();
  runtime.context.beginEraTravel(0, true);
  runtime.context.cancelEraTravel();
  runtime.runTimers();
  assert.deepEqual(runtime.context.entries, []);
  assert.equal(runtime.context.galleryActive, true);
  assert.equal(runtime.elements['#archive3d'].hidden, false);
  assert.equal(runtime.context.transitionInProgress, false);
  assert.equal(runtime.context.pendingEraIndex, null);
  runtime.context.beginEraTravel(1, true);
  runtime.runTimers();
  assert.deepEqual(runtime.context.entries, [1]);
  assert.equal(runtime.context.route, 'chapter');
});
