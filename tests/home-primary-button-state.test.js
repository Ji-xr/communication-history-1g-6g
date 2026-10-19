const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Progress = require('../assets/js/progression-manager.js');

const appSource = fs.readFileSync('app.js', 'utf8');
const APP_VERSION = /^const APP_VERSION='([^']+)'/m.exec(appSource)?.[1];
const ERA_IDS = ['1G', '2G', '3G', '4G', '5G', '6G'];

function functionSource(name) {
  const line = appSource.split(/\r?\n/).find((entry) => entry.startsWith(`function ${name}(`));
  assert.ok(line, `找不到 ${name} 函数`);
  return line;
}

function functionBlockUntil(name, nextName) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = appSource.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `找不到 ${name} 到 ${nextName} 的函数区块`);
  return appSource.slice(start, end).trim();
}

function createHarness({ demo = false, state = {}, formalSave = null } = {}) {
  const calls = [];
  const storage = new Map();
  if (formalSave !== null) storage.set('commsArchive', JSON.stringify(formalSave));
  const localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
  };
  const currentState = {
    visited: [], completed: [], order: [], logs: [], evidence: [], clues: {}, tasks: {},
    ...state,
  };
  const eras = ERA_IDS.map((id) => ({ id }));
  const window = {
    DemoManager: { isActive: () => demo },
    DemoAppActions: { advance: () => { calls.push(['demoAdvance']); return true; } },
    InteractionDebugger: { record: (...args) => calls.push(['trace', ...args]) },
  };
  const context = vm.createContext({
    window, localStorage, state: currentState, eras, route: 'home', APP_VERSION,
    reviewGuideActive: false, reviewGuideStage: 0, progression: { state: { currentEra: null } },
    defaultState: () => ({ visited: [], completed: [], order: [], logs: [], evidence: [], clues: {}, tasks: {} }),
    normalizeSavedState: (raw) => ({ ...context.defaultState(), ...raw }),
    escapeHtml: (text) => String(text),
    startReviewRoute: () => {
      calls.push(['startReviewRoute']);
      currentState.explorationStarted = true;
      currentState.reviewGuideActive = true;
      localStorage.setItem('commsArchive', JSON.stringify(currentState));
    },
    resumeFirstExploration: () => {
      calls.push(['resumeFirstExploration']);
      context.route = 'prologue';
      calls.push(['render']);
      return true;
    },
    enterEra: (index) => { calls.push(['enterEra', index]); return true; },
    go: (page) => { calls.push(['go', page]); return true; },
    render: () => calls.push(['render']),
    showInteractionNotice: (message) => calls.push(['notice', message]),
    progressionEraAllowed: () => ({ ok: true }),
    lastEraEntryError: '',
    DemoManager: window.DemoManager,
  });
  vm.runInContext([
    functionSource('homeFormalState'), functionBlockUntil('homeFormalProgressStatus', 'hasFormalExplorationProgress'),
    functionSource('hasFormalExplorationProgress'),
    functionSource('home'), functionSource('homePrimaryAction'),
  ].join('\n'), context);
  return { calls, context, state: currentState, storage, localStorage };
}

function buttonLabel(harness) {
  const markup = vm.runInContext('home()', harness.context);
  return markup.match(/id="homeContinueExplore"[^>]*>✦ ([^<]+) →<\/button>/)?.[1] || null;
}

test('全新正式存档显示“开始探索”，点击进入序章', () => {
  const h = createHarness({ formalSave: {} });
  assert.equal(buttonLabel(h), '开始探索');
  vm.runInContext('homePrimaryAction()', h.context);
  assert.ok(h.calls.some(([name]) => name === 'startReviewRoute'));
  assert.equal(buttonLabel(h), '继续探索', '开始序章后应保存探索已启动状态');
});

test('有效时代进度显示“继续探索”，点击恢复最近未完成时代', () => {
  const h = createHarness({ state: { visited: ['1G'], order: ['1G'] } });
  assert.equal(buttonLabel(h), '继续探索');
  vm.runInContext('homePrimaryAction()', h.context);
  assert.ok(h.calls.some(([name, index]) => name === 'enterEra' && index === 0));
  assert.equal(h.calls.some(([name]) => name === 'startReviewRoute'), false);
});

test('旧存档迁移自动落在1G时仍优先恢复访问顺序里最近的有效时代', () => {
  const legacy = { visited: ['1G', '2G'], completed: [], order: ['1G', '2G'], clues: {}, logs: [], evidence: [], tasks: {} };
  Progress.createProgression(legacy, { save: () => true });
  assert.equal(legacy.progression.currentEra, '1G', '验证旧存档迁移产生了默认的最早待开放指针');
  assert.ok(legacy.progression.legacyImportedEras.includes('2G'));
  const h = createHarness({ state: legacy });
  assert.equal(buttonLabel(h), '继续探索');
  vm.runInContext('homePrimaryAction()', h.context);
  assert.ok(h.calls.some(([name, index]) => name === 'enterEra' && index === 1), '恢复2G而不是迁移默认指针1G');
});

test('正式进度刷新后仍显示“继续探索”并恢复最近位置', () => {
  const saved = { visited: ['1G', '2G'], order: ['1G', '2G'], completed: ['1G'] };
  const h = createHarness({ demo: true, state: { visited: [] }, formalSave: saved });
  assert.equal(buttonLabel(h), '继续探索');
  vm.runInContext('homePrimaryAction()', h.context);
  assert.ok(h.calls.some(([name]) => name === 'demoAdvance'), '演示上下文只推进演示路线');
  assert.equal(JSON.parse(h.storage.get('commsArchive')).order.at(-1), '2G', '正式存档未被演示改写');

  const resumed = createHarness({ state: saved });
  assert.equal(buttonLabel(resumed), '继续探索');
  vm.runInContext('homePrimaryAction()', resumed.context);
  assert.ok(resumed.calls.some(([name, index]) => name === 'enterEra' && index === 1));
});

test('只开始了序章的存档显示“继续探索”并回到序章', () => {
  const h = createHarness({ state: { explorationStarted: true, reviewGuideActive: true } });
  assert.equal(buttonLabel(h), '继续探索');
  vm.runInContext('homePrimaryAction()', h.context);
  assert.equal(h.context.route, 'prologue');
  assert.ok(h.calls.some(([name]) => name === 'render'));
  assert.equal(h.calls.some(([name]) => name === 'startReviewRoute'), false, '恢复时不重置序章引导');
});

test('新建空白正式存档恢复“开始探索”，并保留其他存档键', () => {
  const h = createHarness({ formalSave: { visited: [], completed: [], order: [], tasks: {}, logs: [], evidence: [] } });
  h.storage.set('commsArchive.backup.v1', JSON.stringify({ visited: ['4G'] }));
  assert.equal(buttonLabel(h), '开始探索');
  assert.equal(JSON.parse(h.storage.get('commsArchive.backup.v1')).visited[0], '4G');
});

test('进度管理器给空白安装种下的1G入口指针和空节点不算正式探索', () => {
  const fresh = { visited: [], completed: [], order: [], clues: {}, logs: [], evidence: [], tasks: {}, explorationStarted: false };
  Progress.createProgression(fresh, { save: () => true });
  const h = createHarness({ state: fresh });
  assert.equal(buttonLabel(h), '开始探索');
  assert.deepEqual(Array.from(vm.runInContext('homeFormalProgressStatus(state).reasons', h.context)), []);
  vm.runInContext('homePrimaryAction()', h.context);
  assert.ok(h.calls.some(([name]) => name === 'startReviewRoute'), '初始化写入的1G指针不会跳过序章');
});

test('设置、空任务、无效日志、关闭的引导和默认值不构成探索进度', () => {
  const h = createHarness({ state: {
    settings: { audio: { enabled: true, volume: 70 }, brightness: 100 },
    reviewGuideDismissed: true,
    tasks: { '1G': { step: 0, selected: null, secondSelected: null, understandingSelected: null, understandingCompleted: false } },
    logs: ['初始化完成'], evidence: ['未关联时代的旧记录'],
    progression: { currentEra: '1G', currentNode: '1g_entry', dialogueProgress: { activeId: null, completedIds: [] },
      eras: { '1G': { nodes: [{ key: 'entry', nodeId: '1g_entry', status: 'ACTIVE' }] } }, lanMemory: { visitedEras: [] } },
  } });
  assert.equal(buttonLabel(h), '开始探索');
  assert.deepEqual(Array.from(vm.runInContext('homeFormalProgressStatus(state).reasons', h.context)), []);
});

test('只开始序章后刷新仍显示继续探索，返回时不会被初始化1G指针跳过序章', () => {
  const started = { explorationStarted: true, reviewGuideActive: true, reviewGuideStage: 0,
    progression: { currentEra: '1G', currentNode: '1g_entry', dialogueProgress: { activeId: null, completedIds: [] },
      eras: { '1G': { nodes: [{ key: 'entry', nodeId: '1g_entry', status: 'ACTIVE' }] } }, lanMemory: { visitedEras: [] } } };
  const h = createHarness({ state: started });
  assert.equal(buttonLabel(h), '继续探索');
  vm.runInContext('homePrimaryAction()', h.context);
  assert.equal(h.context.route, 'prologue');
});

test('首次点击写入正式开始标记后，模拟刷新仍显示“继续探索”', () => {
  const first = createHarness({ formalSave: {} });
  assert.equal(buttonLabel(first), '开始探索');
  vm.runInContext('homePrimaryAction()', first.context);
  const persisted = JSON.parse(first.storage.get('commsArchive'));
  assert.equal(persisted.explorationStarted, true);
  const refreshed = createHarness({ state: persisted });
  assert.equal(buttonLabel(refreshed), '继续探索');
  vm.runInContext('homePrimaryAction()', refreshed.context);
  assert.equal(refreshed.context.route, 'prologue');
});

test('首页只读诊断列出判定进度的字段且演示模式仍读取正式存档', () => {
  const formal = { visited: ['4G'], order: ['4G'], completed: [] };
  const h = createHarness({ demo: true, formalSave: formal });
  const status = vm.runInContext('homeFormalProgressStatus(homeFormalState())', h.context);
  assert.equal(status.hasProgress, true);
  assert.ok(Array.from(status.reasons).includes('visited'));
  assert.equal(JSON.parse(h.storage.get('commsArchive')).visited[0], '4G');
});

test('演示存档不会影响正式主按钮判断或改写正式存档', () => {
  const formal = { visited: ['3G'], order: ['3G'], completed: [] };
  const h = createHarness({ demo: true, state: { visited: ['6G'], completed: ['1G'] }, formalSave: formal });
  const before = h.storage.get('commsArchive');
  assert.equal(buttonLabel(h), '继续探索', '按钮根据正式存档而非演示进度显示');
  vm.runInContext('homePrimaryAction()', h.context);
  assert.ok(h.calls.some(([name]) => name === 'demoAdvance'));
  assert.equal(h.storage.get('commsArchive'), before);
});

test('空白正式存档在演示模式中仍显示“开始探索”', () => {
  const h = createHarness({ demo: true, state: { visited: ['5G'] }, formalSave: {} });
  assert.equal(buttonLabel(h), '开始探索');
  vm.runInContext('homePrimaryAction()', h.context);
  assert.ok(h.calls.some(([name]) => name === 'demoAdvance'));
  assert.equal(h.storage.has('commsArchive'), true, '演示点击不写入正式存档');
  assert.equal(JSON.parse(h.storage.get('commsArchive')).visited, undefined);
});

test('六代完成后仍保持“继续探索”，点击进入文明档案', () => {
  const h = createHarness({ state: { visited: ERA_IDS, completed: ERA_IDS, order: ERA_IDS } });
  assert.equal(buttonLabel(h), '继续探索');
  vm.runInContext('homePrimaryAction()', h.context);
  assert.ok(h.calls.some(([name, page]) => name === 'go' && page === 'archive'));
});
