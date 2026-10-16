'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const lan = fs.readFileSync('assets/js/lan-system.js', 'utf8');

function functionSource(name) {
  const line = app.split(/\r?\n/).find((entry) => entry.startsWith(`function ${name}(`));
  assert.ok(line, `找不到 ${name} 函数`);
  return line;
}

function functionBlock(name, nextName) {
  const start = app.indexOf(`function ${name}(`);
  const end = app.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `找不到 ${name} 函数区块`);
  return app.slice(start, end).trim();
}

function routeHarness({ alreadyRead = false, demo = false, initialRoute = 'home' } = {}) {
  const calls = [];
  const listeners = new Map();
  const window = {
    DemoManager: { isActive: () => demo },
    InteractionDebugger: { record: (...args) => calls.push(['trace', ...args]) },
    CommsArchiveLan: {
      LanMemory: { completedEvents: alreadyRead ? ['lan.prologue.first-travel'] : [] },
      openPrologue() { calls.push(['openPrologue']); },
    },
    addEventListener(name, callback) { listeners.set(name, callback); },
  };
  const context = vm.createContext({
    window,
    state: { explorationStarted: false, reviewGuideDismissed: false },
    reviewGuideActive: false,
    reviewGuideStage: 0,
    route: initialRoute,
    lastEraEntryError: '',
    saveGuide() { calls.push(['saveGuide']); },
    render() { calls.push(['render']); },
    showInteractionNotice(message) { calls.push(['notice', message]); },
    enterEra(index) { calls.push(['enterEra', index]); context.route = 'chapter'; return true; },
  });
  vm.runInContext('let firstExplorationProloguePending=false;', context);
  vm.runInContext([
    functionBlock('enterFirstEraAfterPrologue', 'handleFirstExplorationPrologueRead'),
    functionSource('handleFirstExplorationPrologueRead'),
    functionSource('resumeFirstExploration'),
    functionSource('startReviewRoute'),
    "window.addEventListener('comms-archive-prologue-read',handleFirstExplorationPrologueRead);",
  ].join('\n'), context);
  return { calls, context, listeners };
}

test('首次探索的序章结束事件通过既有时代入口校验进入1G，重复事件不重复导航', () => {
  const h = routeHarness();
  vm.runInContext('startReviewRoute()', h.context);
  assert.equal(h.context.route, 'prologue');
  assert.equal(vm.runInContext('firstExplorationProloguePending', h.context), true);
  assert.equal(h.calls.filter(([name]) => name === 'enterEra').length, 0, '对白完成前不进入时代');
  assert.ok(h.calls.some(([name]) => name === 'openPrologue'));

  h.listeners.get('comms-archive-prologue-read')();
  assert.equal(h.context.route, 'chapter');
  assert.deepEqual(h.calls.filter(([name]) => name === 'enterEra'), [['enterEra', 0]]);
  assert.equal(vm.runInContext('firstExplorationProloguePending', h.context), false);
  h.listeners.get('comms-archive-prologue-read')();
  assert.deepEqual(h.calls.filter(([name]) => name === 'enterEra'), [['enterEra', 0]], '序章结束回调只导航一次');
});

test('正式首次探索的序章不再展示时代选择页或额外的1G确认按钮', () => {
  const markupFn = functionSource('prologue');
  const h = routeHarness();
  vm.runInContext(markupFn, h.context);
  vm.runInContext('firstExplorationProloguePending=true', h.context);
  const firstVisitMarkup = vm.runInContext('prologue()', h.context);
  assert.match(firstVisitMarkup, /通信档案的缺口/);
  assert.match(firstVisitMarkup, /序章结束后将直接进入1G《失联的呼叫》/);
  assert.doesNotMatch(firstVisitMarkup, /下一站，交给你来决定/);
  assert.doesNotMatch(firstVisitMarkup, /onclick="go\('eras'\)"/);

  vm.runInContext('firstExplorationProloguePending=false', h.context);
  const regularMarkup = vm.runInContext('prologue()', h.context);
  assert.match(regularMarkup, /下一站，交给你来决定/);
  assert.match(regularMarkup, /onclick="go\('eras'\)"/);
});

test('刷新后未完成序章会恢复对白；已完成序章直接进入1G且不重播', () => {
  const inProgress = routeHarness();
  vm.runInContext('resumeFirstExploration()', inProgress.context);
  assert.equal(inProgress.context.route, 'prologue');
  assert.equal(vm.runInContext('firstExplorationProloguePending', inProgress.context), true);
  assert.ok(inProgress.calls.some(([name]) => name === 'openPrologue'));
  assert.equal(inProgress.calls.filter(([name]) => name === 'enterEra').length, 0);

  const completed = routeHarness({ alreadyRead: true });
  vm.runInContext('resumeFirstExploration()', completed.context);
  assert.equal(completed.context.route, 'chapter');
  assert.deepEqual(completed.calls.filter(([name]) => name === 'enterEra'), [['enterEra', 0]]);
  assert.equal(completed.calls.some(([name]) => name === 'openPrologue'), false, '已完成的序章不会重复播放');
});

test('不在正式首次探索中的序章事件不会进入1G，比赛演示时代选择保持独立', () => {
  const manual = routeHarness({ initialRoute: 'archive' });
  vm.runInContext('firstExplorationProloguePending=true', manual.context);
  manual.listeners.get('comms-archive-prologue-read')();
  assert.equal(manual.calls.some(([name]) => name === 'enterEra'), false);

  const demo = routeHarness({ demo: true });
  vm.runInContext('firstExplorationProloguePending=true', demo.context);
  demo.listeners.get('comms-archive-prologue-read')();
  assert.equal(demo.calls.some(([name]) => name === 'enterEra'), false);
});

test('时代入口仍使用统一进度校验，1G开场对白和五节点手动导航保持接入', () => {
  assert.match(app, /function enterSelectedEra\(i\)[\s\S]*?return !!enterEra\(i\)/);
  assert.match(app, /function enterEra\(i\)\{[\s\S]*?progression\.enterEra\(eras\[i\]\.id\)/);
  assert.equal([...app.matchAll(/progression\.enterEra\(eras\[i\]\.id\)/g)].length, 1);
  assert.match(lan, /else if \(route === 'chapter' && era\)/);
  assert.match(lan, /dispatchEvent\('ENTER_ERA', \{ era:'1G', firstEnter:true \}\)/);
  assert.match(app, /请先阅读澜的时代开场。她会介绍当时的通信环境；对白结束后，再查看现场记录并进入历史现场。/);
  assert.match(app, /if\(reviewGuideActive&&i===0\)reviewGuideStep\(1\)/);
  assert.match(app, /function navigateChapterNext\(\)[\s\S]*?dialogue.*?return false/);
  assert.doesNotMatch(app, /function enterSelectedEra\(i\)[\s\S]*?CommunicationsHistory3D\?\.enterSelected/);
});

test('序章结束与跳过都发出同一完成事件，之后仍由1G自己的入口对白接续', () => {
  assert.match(lan, /activeDialogue\?\.id === 'lan\.prologue\.first-travel'[\s\S]*?dispatchEvent\(new CustomEvent\('comms-archive-prologue-read'\)\)/);
  assert.match(lan, /active\?\.id==='lan\.prologue\.first-travel'\)window\.dispatchEvent\(new CustomEvent\('comms-archive-prologue-read'\)\)/);
  assert.match(lan, /pending1GDialogue\(\)[\s\S]*?dispatchEvent\('ENTER_ERA', \{ era:'1G', firstEnter:true \}\)/);
});

test('文明档案返回上下文与独立时代航线继续保留', () => {
  assert.match(app, /function returnFromArchive\(\)[\s\S]*?archiveReturnContext/);
  assert.match(app, /function erasPage\(\)[\s\S]*?时代航线/);
});
