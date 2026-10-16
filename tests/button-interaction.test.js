const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const InteractionDebugger = require('../assets/js/interaction-debugger.js');

const appSource = fs.readFileSync('app.js', 'utf8');
const lanSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const audioSource = fs.readFileSync('assets/js/audio-system.js', 'utf8');
const css = ['style.css', 'assets/css/lan.css', 'assets/css/audio-system.css', 'assets/css/history-media.css']
  .map((file) => fs.readFileSync(file, 'utf8')).join('\n');

function sourceFunction(name) {
  const line = appSource.split(/\r?\n/).find((entry) => entry.startsWith(`function ${name}(`));
  assert.ok(line, `找不到 ${name} 函数`);
  return line;
}

function sourceFunctionBlockUntil(name, nextName) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = appSource.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `找不到 ${name} 到 ${nextName} 的函数区块`);
  return appSource.slice(start, end).trim();
}

function homeHarness({ visited = [], completed = [], order = [], access = () => ({ ok: true, reason: '' }), enterResult = true } = {}) {
  const calls = [];
  const state = { visited: [...visited], completed: [...completed], order: [...order], logs: [], evidence: [], tasks: {} };
  const eras = ['1G', '2G', '3G', '4G', '5G', '6G'].map((id) => ({ id }));
  const window = { DemoManager: { isActive: () => false }, InteractionDebugger: { record: (...args) => calls.push(['trace', ...args]) } };
  const context = vm.createContext({
    window, state, eras, route: 'home', progression: { state: { currentEra: '2G' } }, lastEraEntryError: '该时代尚未解锁。',
    localStorage: { getItem: () => null }, defaultState: () => ({ visited: [], completed: [], order: [], logs: [], evidence: [], clues: {}, tasks: {} }),
    normalizeSavedState: (raw) => raw,
    progressionEraAllowed: access,
    startReviewRoute: () => calls.push(['startReviewRoute']),
    enterEra: (index) => { calls.push(['enterEra', index]); return enterResult; },
    go: (page) => { calls.push(['go', page]); return true; },
    showInteractionNotice: (message) => calls.push(['notice', message]),
  });
  vm.runInContext([sourceFunction('homeFormalState'), sourceFunctionBlockUntil('homeFormalProgressStatus', 'hasFormalExplorationProgress'), sourceFunction('hasFormalExplorationProgress'), sourceFunction('homePrimaryAction')].join('\n'), context);
  return { calls, context, state };
}

function debugHarness({ route = 'home', dialogue = { isPlaying: false, queueLength: 0 }, overlay = null } = {}) {
  const listeners = {};
  const timers = [];
  let currentRoute = route;
  const button = {
    tagName: 'BUTTON', id: 'testButton', className: 'btn', innerText: '继续探索', textContent: '继续探索',
    disabled: false, type: 'button', dataset: {}, parentElement: null,
    getAttribute(name) { return name === 'onclick' ? 'homePrimaryAction()' : name === 'data-nav' ? '' : null; },
    closest(selector) { return selector.includes('button') || selector.includes('[role="button"]') ? this : null; },
  };
  const body = { className: '', dataset: {}, classList: { contains: () => false } };
  const doc = {
    body, activeElement: null, hidden: false,
    addEventListener(type, callback) { listeners[type] = callback; },
    querySelector() { return null; },
    querySelectorAll() { return overlay ? [overlay] : []; },
    elementFromPoint() { return overlay || button; },
  };
  const root = {
    location: { search: '?interactionDebug=1' }, document: doc,
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    crypto: { randomUUID: () => 'test-session' }, console: { info() {} },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    getComputedStyle(element) { return element.style || {}; },
    CommsArchiveApp: { getRoute: () => currentRoute, getInteractionState: () => ({ route: currentRoute }) },
    CommsArchiveLan: { debugSnapshot: () => dialogue },
  };
  const api = InteractionDebugger.create(root, doc);
  return {
    api, button, listeners, timers,
    setRoute(value) { currentRoute = value; },
    click(target = button) { listeners.click({ target, clientX: 1, clientY: 1, isTrusted: true }); },
    pointerDown(target = button) { listeners.pointerdown({ target, clientX: 1, clientY: 1, pointerType: 'mouse' }); },
    runTimers() { for (const callback of timers.splice(0)) callback(); },
  };
}

test('首页主入口绑定动态探索分流；档案、航线、搜索与设置仍有导航入口', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const homeLine = sourceFunction('home');
  assert.match(homeLine, /id="homeContinueExplore"[^>]+onclick="homePrimaryAction\(\)"[^>]*>✦ \$\{buttonLabel\} →/);
  assert.match(appSource, /getHomeProgressStatus\(\)\{const status=homeFormalProgressStatus\(\)/, '开发者可只读查看首页命中的存档字段');
  assert.match(appSource, /progressStatus=homeFormalProgressStatus\(formalState\),hasProgress=progressStatus\.hasProgress/);
  assert.match(html, /id="eraRouteButton" data-nav="eras"/);
  assert.match(html, /id="archiveNavButton" data-nav="archive"/);
  assert.match(html, /id="knowledgeSearchButton" data-nav="search"/);
  assert.match(html, /id="audioSettingsToggle"/);
});

test('常用章节、展品与档案操作的回调目标存在', () => {
  for (const callback of ['enterEra', 'enterSelectedEra', 'closeModal', 'completeEra', 'returnFromChapter', 'openImageViewer', 'closeImageViewer', 'openArchiveExhibit', 'exportData', 'resetData', 'selectExhibitTab']) {
    assert.match(appSource, new RegExp(`function ${callback}\\(`), `缺少章节或档案回调 ${callback}`);
  }
  for (const callback of ['next', 'skip', 'toggleHistory', 'expandDialogue']) {
    assert.match(lanSource, new RegExp(`\\b${callback}\\b`), `缺少澜对白回调 ${callback}`);
  }
  assert.match(lanSource, /box\.addEventListener\?\.\('click'/);
  assert.match(lanSource, /box\.addEventListener\?\.\('keydown'/);
  assert.match(audioSource, /querySelector\('#audioSettingsToggle'\)\?\.addEventListener\('click', openSettings\)/);
});

test('导航点击使用 document 委托，章节重绘替换内容后仍可用', () => {
  assert.match(appSource, /document\.addEventListener\('click',e=>\{const b=e\.target\.closest\('\[data-nav\]'\);if\(b\)\{e\.preventDefault\(\);go\(b\.dataset\.nav\)\}\}\)/);
  assert.match(appSource, /app\.innerHTML=content/);
});

test('锁定时代仍显示可读原因，并由禁用态阻止误入', () => {
  const card = sourceFunction('card');
  assert.match(card, /class="era-lock-reason"[^>]*role="status"/);
  assert.match(card, /disabled title=/);
  assert.match(css, /\.era-lock-reason/);
});

test('对话、设置、图片和演示弹层高于澜陪伴卡片，亮度层不接收点击', () => {
  assert.match(css, /\.modal-backdrop\{position:fixed;inset:0;z-index:110;/);
  assert.match(css, /\.demo-route-backdrop\{position:fixed;inset:0;z-index:110;/);
  assert.match(css, /\.image-viewer\{position:fixed;z-index:110;/);
  assert.match(css, /\.demo-guide\{position:fixed;z-index:110;/);
  assert.match(css, /\.health-panel\{position:fixed;z-index:110;/);
  assert.match(css, /body::after\{[^}]*pointer-events:none/);
  assert.match(css, /body\.lan-dialogue-active::before\{[^}]*z-index:89/);
  assert.match(css, /\.lan-companion\{z-index:90/);
});

test('点击日志记录按钮、页面、状态及回调执行结果', () => {
  const h = debugHarness();
  h.click();
  h.setRoute('chapter');
  h.runTimers();
  const events = h.api.getTrace().events;
  const click = events.find((event) => event.event === 'BUTTON_CLICK');
  const result = events.find((event) => event.event === 'BUTTON_ACTION_RESULT');
  assert.equal(click.state.buttonId, 'testButton');
  assert.equal(click.state.currentPage, 'home');
  assert.equal(click.state.callbackType, 'inline');
  assert.equal(result.state.currentPage, 'chapter');
  assert.equal(result.state.callbackExecuted, true);
  assert.equal(result.state.reason, '');
  assert.ok(events.some((event) => event.event === 'BUTTON_HANDLER_START'));
  assert.ok(events.some((event) => event.event === 'BUTTON_HANDLER_SUCCESS'));
  assert.equal(click.state.topElement, 'button#testButton.btn');
});

test('缺少回调、对白等待和透明遮罩分别给出明确诊断原因', () => {
  const missing = debugHarness();
  missing.button.getAttribute = () => null;
  missing.click(); missing.runTimers();
  assert.equal(missing.api.getTrace().events.find((event) => event.event === 'BUTTON_ACTION_RESULT').state.reason, 'missing_callback');
  assert.ok(missing.api.getTrace().events.some((event) => event.event === 'BUTTON_HANDLER_FAILED'));

  const waiting = debugHarness({ dialogue: { isPlaying: true, queueLength: 1 } });
  waiting.click(); waiting.runTimers();
  assert.equal(waiting.api.getTrace().events.find((event) => event.event === 'BUTTON_ACTION_RESULT').state.reason, 'waiting_dialogue');

  const overlay = { tagName: 'DIV', id: 'transition-layer', className: 'transition-overlay', hidden: false,
    style: { display: 'block', opacity: '0', pointerEvents: 'auto', zIndex: '9999' },
    getBoundingClientRect() { return { width: 800, height: 600 }; } };
  const blocked = debugHarness({ overlay });
  blocked.click(); blocked.runTimers();
  assert.ok(blocked.api.getTrace().events.some((event) => event.event === 'TRANSITION_OVERLAY_BLOCK'));
  assert.equal(blocked.api.getTrace().events.find((event) => event.event === 'BUTTON_ACTION_RESULT').state.reason, 'overlay_blocked');
});

test('禁用时代入口的指针操作记录 locked 原因', () => {
  const h = debugHarness();
  h.button.disabled = true;
  h.pointerDown();
  const entry = h.api.getTrace().events.find((event) => event.event === 'BUTTON_DISABLED_PRESS');
  assert.equal(entry.state.reason, 'locked');
});

test('普通存档读取会修复关键集合形状并保留其他有效进度字段', () => {
  const defaultState = () => ({ visited: [], completed: [], clues: {}, logs: [], quizBest: 0, order: [], tasks: {}, evidence: [] });
  const context = vm.createContext({ eras: ['1G', '2G', '3G', '4G', '5G', '6G'].map((id) => ({ id })), defaultState });
  vm.runInContext(`const isPlainRecord=${appSource.split(/\r?\n/).find((line) => line.startsWith('const isPlainRecord=' )).slice('const isPlainRecord='.length)};\n${sourceFunction('normalizeSavedState')}`, context);
  const restored = vm.runInContext(`normalizeSavedState({visited:'1G',completed:null,order:{bad:true},logs:'old',clues:[],tasks:{'1G':'broken'},evidence:'bad',quizBest:8,customRecord:{kept:true}})`, context);
  assert.deepEqual(Array.from(restored.visited), []);
  assert.deepEqual(Array.from(restored.completed), []);
  assert.deepEqual(Array.from(restored.order), []);
  assert.deepEqual(Array.from(restored.logs), []);
  assert.deepEqual(Array.from(restored.evidence), []);
  assert.deepEqual({ ...restored.tasks['1G'] }, {});
  assert.equal(restored.quizBest, 8);
  assert.equal(restored.customRecord.kept, true);
});

test('继续探索恢复到最近可进入时代；无合法恢复节点时回到时代航线并提示', () => {
  const recovered = homeHarness({ visited: ['1G', '2G'], order: ['1G', '2G'], access: (id) => ({ ok: id === '1G', reason: '需要先完成1G归档。' }) });
  vm.runInContext('homePrimaryAction()', recovered.context);
  assert.ok(recovered.calls.some(([name, index]) => name === 'enterEra' && index === 0));
  assert.equal(recovered.calls.some(([name, index]) => name === 'enterEra' && index === 1), false);

  const noEntry = homeHarness({ visited: ['1G', '2G'], order: ['1G', '2G'], access: () => ({ ok: false, reason: '该时代尚未解锁。' }), enterResult: false });
  vm.runInContext('homePrimaryAction()', noEntry.context);
  assert.ok(noEntry.calls.some(([name, page]) => name === 'go' && page === 'eras'));
  assert.ok(noEntry.calls.some(([name]) => name === 'notice'));
  assert.deepEqual(Array.from(noEntry.state.visited), ['1G', '2G']);
});

test('进度阻止与违法节点操作都有反馈处理函数，不再抛未定义异常', () => {
  assert.match(appSource, /function progressionBlock\(/);
  assert.match(appSource, /function rejectProgress\(/);
  assert.match(appSource, /function showInteractionNotice\(/);
  assert.match(appSource, /record\('NAVIGATION_BLOCKED','rejectProgress'/);
});

test('被进度门控的点击记录明确原因并显示可见提示', () => {
  const calls = [];
  const notice = { textContent: '', hidden: true, setAttribute() {} };
  const context = vm.createContext({
    route: 'chapter', eraIndex: 0, eras: [{ id: '1G' }], state: { visited: ['1G'], completed: [], clues: {}, logs: [], order: [], evidence: [] },
    progression: { state: { currentEra: '1G', currentNode: '1g_entry' }, ProgressValidator: { logIllegalAttempt: (...args) => { calls.push(['illegal', ...args]); return { ok: false }; } } },
    window: { DemoManager: { isActive: () => false }, InteractionDebugger: { record: (...args) => calls.push(['trace', ...args]) } },
    document: { querySelector: () => notice, createElement: () => notice }, app: { prepend() {} },
  });
  vm.runInContext([sourceFunction('showInteractionNotice'), sourceFunction('progressionBlock'), sourceFunction('rejectProgress')].join('\n'), context);
  assert.equal(vm.runInContext("progressionBlock({ok:false,reason:'请先完成当前调查。'})", context), true);
  assert.equal(notice.textContent, '请先完成当前调查。');
  assert.equal(vm.runInContext("rejectProgress('select-clue','1G','请先打开调查区。')", context), true);
  assert.ok(calls.some(([kind, action]) => kind === 'illegal' && action === 'select-clue'));
  assert.ok(calls.some(([kind, event]) => kind === 'trace' && event === 'NAVIGATION_BLOCKED'));
});
