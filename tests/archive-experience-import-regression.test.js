'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const triggers = ['EXPERIENCE_1G_CALL', 'EXPERIENCE_1G_COVERAGE', 'EXPERIENCE_1G_RECONNECT'];
const clone = value => JSON.parse(JSON.stringify(value));
const newState = () => ({ visited: ['1G'], completed: [], logs: [], clues: {}, tasks: {}, order: ['1G'], evidence: [], progression: { version: 1 } });
const newJourney = (done = []) => ({ version: 1, memory: { completedExperienceNodes: [...done] }, history: [] });

function between(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source segment: ${start}`);
  return source.slice(from, to);
}

function makeRuntime(route = 'archive') {
  const localValues = new Map(), sessionValues = new Map();
  const storage = values => ({ getItem: key => values.get(key) ?? null,
    setItem(key, value) { values.set(key, String(value)); }, removeItem(key) { values.delete(key); } });
  const localStorage = storage(localValues), sessionStorage = storage(sessionValues);
  sessionStorage.setItem('commsArchive1GPhoneSession.v1', JSON.stringify({ phase: 'summary', digits: '0000000', x: 60, y: 55, moves: 5, message: '旧旅程已完成', familyIndex: 3 }));
  let journey = newJourney(triggers);
  const document = { getElementById() { return null; }, querySelector() { return null; } };
  const window = { localStorage, sessionStorage, document, addEventListener() {}, InteractionDebugger: { record() {} } };
  const context = vm.createContext({
    window, document, localStorage, route, eraIndex: 0, state: newState(),
    eras: ['1G', '2G', '3G', '4G', '5G', '6G'].map(id => ({ id })),
    isPlainRecord: value => !!value && typeof value === 'object' && !Array.isArray(value),
    normalizeSavedState: clone,
    saveAllowed: true, journeyAllowed: true, renderFailure: false, confirmAllowed: true,
    savedState: null, renders: 0, lastHtml: '', alerts: [],
    rebindProgression() {},
    save() { if (!context.saveAllowed) return false; context.savedState = clone(context.state); return true; },
    render() {
      context.renders++;
      if (context.renderFailure) throw new Error('simulated render failure');
      if (context.route === 'experience') context.lastHtml = window.CommsArchive1GPhone.render({ id: '1G', moment: '模拟生活现场' });
    },
    go(name) { context.route = name; return true; },
    confirm() { return context.confirmAllowed; },
    alert(message) { context.alerts.push(message); },
    console, Date, JSON, Number, String, Object, Array, Map, Set, Math, Error, setTimeout, clearTimeout
  });
  window.CommsArchiveLan = {
    get LanMemory() { return clone(journey.memory); },
    validateJourneyData(value) { return value?.version === 1 && Array.isArray(value.memory?.completedExperienceNodes) && Array.isArray(value.history); },
    createEmptyJourneyData() { return newJourney(); },
    exportJourneyData() { return clone(journey); },
    importJourneyData(value) { if (!context.journeyAllowed) return false; journey = clone(value); return true; }
  };
  vm.runInContext(fs.readFileSync('assets/js/experience-interactions.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('assets/js/experience-1g-phone.js', 'utf8'), context);
  window.CommsArchiveExperience.advance('2G', 'EXPERIENCE_2G_RELAY');
  window.CommsArchiveExperience.advance('2G', 'EXPERIENCE_2G_RELAY');
  vm.runInContext([
    between('function validateImportedArchiveState(', '\nfunction applyArchiveImport('),
    between('function applyArchiveImport(', '\nasync function handleArchiveImport(')
  ].join('\n'), context, { filename: 'app.js:archive-import' });
  return { context, window, localValues, sessionValues, getJourney: () => clone(journey) };
}

function v2(done = []) { return { format: 'comms-archive-v2', version: 2, state: newState(), journey: newJourney(done) }; }
function assertOldRuntime(runtime) {
  assert.equal(runtime.window.CommsArchive1GPhone.getState().phase, 'summary');
  assert.equal(runtime.window.CommsArchiveExperience.get('2G', 'EXPERIENCE_2G_RELAY').step, 2);
  assert.ok(runtime.sessionValues.has('commsArchive1GPhoneSession.v1'));
  assert.ok(runtime.localValues.has('commsArchiveExperienceProgress.v1'));
}

test('导入未完成体验的v2档案会清除旧1G总结和旧互动缓存，允许重新体验', () => {
  const runtime = makeRuntime();
  assert.equal(runtime.context.applyArchiveImport(v2()), true);
  assert.equal(runtime.window.CommsArchive1GPhone.getState().phase, 'dial');
  assert.equal(runtime.window.CommsArchiveExperience.get('2G', 'EXPERIENCE_2G_RELAY').step, 0);
  assert.deepEqual(runtime.getJourney().memory.completedExperienceNodes, []);
  assert.equal(runtime.sessionValues.has('commsArchive1GPhoneSession.v1'), false);
  assert.equal(runtime.localValues.has('commsArchiveExperienceProgress.v1'), false);
});

test('v2档案含全部1G完成记录时，清除运行缓存后仍能由正式档案恢复总结', () => {
  const runtime = makeRuntime('experience');
  assert.equal(runtime.context.applyArchiveImport(v2(triggers)), true);
  const html = runtime.window.CommsArchive1GPhone.render({ id: '1G', moment: '测试' });
  assert.equal(runtime.window.CommsArchive1GPhone.getState().phase, 'summary');
  assert.match(html, /recordGuidedExperience\(\)/);
  assert.deepEqual(runtime.getJourney().memory.completedExperienceNodes, triggers);
});

test('文件读取期间切到体验页时，成功导入后同步刷新显示，旧总结不会留在页面', () => {
  const runtime = makeRuntime('experience');
  assert.equal(runtime.context.applyArchiveImport(v2()), true);
  assert.equal(runtime.context.route, 'experience');
  assert.equal(runtime.context.renders, 2);
  assert.match(runtime.context.lastHtml, /CommsArchive1GPhone\.dial\(\)/);
  assert.doesNotMatch(runtime.context.lastHtml, /recordGuidedExperience\(\)/);
});

test('导入旧v1档案会创建空旅程并清旧体验缓存，取消导入则完整保留', () => {
  const cancelled = makeRuntime();
  cancelled.context.confirmAllowed = false;
  assert.equal(cancelled.context.applyArchiveImport({ format: 'comms-archive-v1', state: newState() }), false);
  assertOldRuntime(cancelled);
  const runtime = makeRuntime();
  assert.equal(runtime.context.applyArchiveImport({ format: 'comms-archive-v1', state: newState() }), true);
  assert.deepEqual(runtime.getJourney().memory.completedExperienceNodes, []);
  assert.equal(runtime.window.CommsArchive1GPhone.getState().phase, 'dial');
  assert.equal(runtime.window.CommsArchiveExperience.get('2G', 'EXPERIENCE_2G_RELAY').step, 0);
});

test('无效文件、主档案保存失败、旅程导入失败和首次渲染失败都保留旧体验缓存', () => {
  for (const failure of ['invalid', 'save', 'journey', 'render']) {
    const runtime = makeRuntime();
    const originalState = runtime.context.state;
    const originalJourney = runtime.getJourney();
    const data = v2();
    if (failure === 'invalid') data.state.visited = ['UNKNOWN'];
    if (failure === 'save') runtime.context.saveAllowed = false;
    if (failure === 'journey') runtime.context.journeyAllowed = false;
    if (failure === 'render') runtime.context.renderFailure = true;
    assert.throws(() => runtime.context.applyArchiveImport(data), undefined, failure);
    assert.equal(runtime.context.state, originalState, `${failure}保留或回滚旧主状态`);
    assert.deepEqual(runtime.getJourney(), originalJourney, `${failure}保留或回滚旧旅程`);
    assertOldRuntime(runtime);
  }
});
