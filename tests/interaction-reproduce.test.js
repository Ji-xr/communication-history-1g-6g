const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { create } = require('../assets/js/interaction-debugger.js');

const rootDir = path.resolve(__dirname, '..');

function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function createHarness(search = '?interactionDebug=1') {
  const listeners = new Map();
  const document = {
    addEventListener(type, handler) {
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    }
  };
  const root = {
    location: { search },
    sessionStorage: createStorage(),
    console: { info() {} },
    setTimeout: () => 1,
    addEventListener() {}
  };
  const debuggerApi = create(root, document);
  debuggerApi.clear();
  return { debuggerApi, listeners, root, document };
}

test('交互日志记录含时间、事件、来源、快照，并保存到当前标签页会话', () => {
  const { debuggerApi, root } = createHarness();
  const entry = debuggerApi.record('HOME_START_CLICK', 'homePrimaryAction', { buttonId: 'start', inputEnabled: true });
  assert.equal(debuggerApi.enabled, true);
  assert.equal(entry.event, 'HOME_START_CLICK');
  assert.equal(entry.source, 'homePrimaryAction');
  assert.ok(Number.isFinite(Date.parse(entry.time)));
  assert.equal(entry.state.buttonId, 'start');
  const saved = JSON.parse(root.sessionStorage.getItem('commsArchive.interactionTrace.v1'));
  assert.equal(saved.sessionId, debuggerApi.getTrace().sessionId);
  assert.equal(saved.events.length, 1);
});

test('未开启诊断时不记录事件，开启后能够继续采集', () => {
  const { debuggerApi } = createHarness('');
  assert.equal(debuggerApi.record('IGNORED', 'test'), null);
  assert.equal(debuggerApi.getTrace().events.length, 0);
  debuggerApi.enable();
  debuggerApi.record('PROLOGUE_READY', 'startReviewRoute');
  assert.deepEqual(debuggerApi.getTrace().events.map(item => item.event), ['DEBUG_ENABLED', 'PROLOGUE_READY']);
});

test('文档捕获阶段记录实际按钮点击来源和禁用状态', () => {
  const { debuggerApi, listeners } = createHarness();
  const button = {
    tagName: 'BUTTON', id: 'start', className: 'btn', innerText: '开始调查', textContent: '开始调查', disabled: false,
    closest(selector) { return selector.includes('button') ? this : null; },
    getClientRects() { return [{}]; }
  };
  listeners.get('click')[0]({ target: button, clientX: 2, clientY: 4, isTrusted: true });
  const events = debuggerApi.getTrace().events;
  const click = events.find((item) => item.event === 'BUTTON_CLICK');
  assert.ok(click);
  assert.ok(events.some((item) => item.event === 'BUTTON_HANDLER_START'));
  assert.equal(click.state.buttonId, 'start');
  assert.equal(click.state.buttonDisabled, false);
});

test('最小复现路线能按首页、序章、入场、澜对白、下一时代顺序留痕', () => {
  const { debuggerApi } = createHarness();
  [
    ['HOME_START_CLICK', 'homePrimaryAction'],
    ['LAN_DIALOGUE_START', 'CommsArchiveLan.show'],
    ['PROLOGUE_READY', 'startReviewRoute'],
    ['PROLOGUE_CONTINUE_CLICK', 'CommsArchiveLan.next'],
    ['LAN_DIALOGUE_END', 'CommsArchiveLan.next'],
    ['INPUT_ENABLED', 'CommsArchiveLan.next'],
    ['GALLERY_ENTRY_CLICK', 'open3DGallery'],
    ['3D_INIT_START', 'open3DGallery'],
    ['3D_INIT_SUCCESS', 'open3DGallery'],
    ['GALLERY_READY', 'open3DGallery'],
    ['ERA_ENTER_REQUEST', 'beginEraTravel'],
    ['ERA_PROGRESS_VALIDATION', 'enterEra'],
    ['ERA_ENTER_SUCCESS', 'beginEraTravel'],
    ['LAN_DIALOGUE_START', 'CommsArchiveLan.show'],
    ['LAN_DIALOGUE_END', 'CommsArchiveLan.next'],
    ['INPUT_ENABLED', 'CommsArchiveLan.next'],
    ['NEXT_ERA_CLICK', 'CommsArchiveLan.next'],
    ['ERA_ENTER_REQUEST', 'enterEra'],
    ['ERA_PROGRESS_VALIDATION', 'enterEra'],
    ['NEXT_ERA_SUCCESS', 'enterEra']
  ].forEach(([event, source], index) => debuggerApi.record(event, source, { sequence: index + 1 }));
  assert.deepEqual(debuggerApi.getTrace().events.map(item => item.event), [
    'HOME_START_CLICK', 'LAN_DIALOGUE_START', 'PROLOGUE_READY', 'PROLOGUE_CONTINUE_CLICK', 'LAN_DIALOGUE_END',
    'INPUT_ENABLED', 'GALLERY_ENTRY_CLICK', '3D_INIT_START', '3D_INIT_SUCCESS', 'GALLERY_READY',
    'ERA_ENTER_REQUEST', 'ERA_PROGRESS_VALIDATION', 'ERA_ENTER_SUCCESS', 'LAN_DIALOGUE_START',
    'LAN_DIALOGUE_END', 'INPUT_ENABLED', 'NEXT_ERA_CLICK', 'ERA_ENTER_REQUEST',
    'ERA_PROGRESS_VALIDATION', 'NEXT_ERA_SUCCESS'
  ]);
  assert.equal(debuggerApi.currentStep, 'NEXT_ERA_SUCCESS');
});

test('四类中断状态与时代校验失败有明确分类', () => {
  const cases = [
    ['KEY_ACTION_NOT_SEEN', { key: 'ArrowRight' }, '键盘事件被拦截'],
    ['BUTTON_DISABLED_PRESS', { buttonDisabled: true }, '按钮状态锁死'],
    ['TRANSITION_OVERLAY_BLOCK', { overlay: { element: 'div#galleryStatus' } }, '转场遮罩拦截'],
    ['LAN_DIALOGUE_END', { dialogue: { isPlaying: true, persistedCurrentDialogue: 'lan.1g.entry', inputEnabled: false } }, '澜对白未释放'],
    ['NEXT_ERA_BLOCKED', { reason: '需要完成1G归档' }, '其他原因']
  ];
  for (const [event, state, expected] of cases) {
    const { debuggerApi } = createHarness();
    debuggerApi.record(event, 'fixture', state);
    assert.equal(debuggerApi.classify().category, expected);
  }
});

test('应用关键调用点已接入对应事件，不改写时代与任务判定逻辑', () => {
  const app = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
  const lan = fs.readFileSync(path.join(rootDir, 'assets/js/lan-system.js'), 'utf8');
  const viewer = fs.readFileSync(path.join(rootDir, 'assets/js/archive3d.js'), 'utf8');
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  for (const marker of ['HOME_START_CLICK', 'PROLOGUE_READY', 'GALLERY_ENTRY_CLICK', 'ERA_ENTER_REQUEST', 'ERA_PROGRESS_VALIDATION', 'ERA_ENTER_SUCCESS', 'ERA_ENTER_FAILED', 'NEXT_ERA_BLOCKED', 'NEXT_ERA_SUCCESS']) assert.ok(app.includes(marker), `app.js missing ${marker}`);
  for (const marker of ['LAN_DIALOGUE_START', 'PROLOGUE_CONTINUE_CLICK', 'LAN_DIALOGUE_END', 'LAN_DIALOGUE_SKIP', 'debugSnapshot']) assert.ok(lan.includes(marker), `lan-system.js missing ${marker}`);
  assert.match(viewer, /record\('MOVE_ACTION'/);
  assert.match(viewer, /record\('SELECT_ACTION'/);
  assert.match(html, /assets\/js\/interaction-debugger\.js/);
  assert.ok(html.indexOf('assets/js/interaction-debugger.js') < html.indexOf('assets/js/lan-system.js'), 'diagnostics must load before LanSystem');
  assert.ok(lan.includes("record('INPUT_ENABLED'"));
});

test('1G时代进入后采集真实交互层快照', () => {
  const app = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
  const debuggerSource = fs.readFileSync(path.join(rootDir, 'assets/js/interaction-debugger.js'), 'utf8');
  for (const marker of ['ERA_INTERACTION_CHECK', 'inputEnabled:true']) assert.ok(app.includes(marker), `app.js missing ${marker}`);
  for (const marker of ['function layerSnapshot()', "['transition', '#galleryStatus']", "['canvas', '.archive3d-canvas']", "['lan', '#lanCompanion']", 'layers: layerSnapshot()']) assert.ok(debuggerSource.includes(marker), `interaction debugger missing ${marker}`);
});

test('引导页澜对白使用居中模式时，进度栏不再强制静态定位', () => {
  const progressionCss = fs.readFileSync(path.join(rootDir, 'assets/css/progression.css'), 'utf8');
  const lanSystem = fs.readFileSync(path.join(rootDir, 'assets/js/lan-system.js'), 'utf8');
  assert.match(progressionCss, /\.guided-lan-slot \.lan-companion:not\(\[data-mode="dialogue"\]\):not\(\[data-mode="history"\]\)\{position:static!important/);
  assert.doesNotMatch(progressionCss, /\.guided-lan-slot \.lan-companion\{position:static!important/);
  assert.match(lanSystem, /function syncActivePresentation\(\)[\s\S]*?return setDisplayMode\(queue\.length\?queueDisplayMode:LanDisplayMode\.mode\)/);
  assert.match(lanSystem, /function onRoute\(route, context = \{\}\) \{\s*const box=makeRoot\(\);[\s\S]*?syncActivePresentation\(\)/);
  assert.match(lanSystem, /if \(centered\) \{[\s\S]*?document\.body\?\.append\(box\)/);
});

test('诊断面板背景点击穿透，保留复制、清空和收起控件', () => {
  const debuggerSource = fs.readFileSync(path.join(rootDir, 'assets/js/interaction-debugger.js'), 'utf8');
  assert.match(debuggerSource, /shell\.innerHTML = '<div style="pointer-events:none/);
  for (const control of ['data-trace-copy', 'data-trace-clear', 'data-trace-hide']) assert.match(debuggerSource, new RegExp(`${control}[^>]*pointer-events:auto`));
  assert.match(debuggerSource, /data-trace-body style="[^\"]*pointer-events:none/);
});

