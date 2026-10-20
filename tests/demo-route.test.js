const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const managerSource = fs.readFileSync('assets/js/demo-manager.js', 'utf8');
const appSource = fs.readFileSync('assets/js/demo-app.js', 'utf8');

function createHarness() {
  const data = new Map();
  const localStorage = { get length() { return data.size; }, getItem(k) { return data.get(k) ?? null; }, setItem(k, v) { data.set(String(k), String(v)); }, removeItem(k) { data.delete(k); }, key(i) { return [...data.keys()][i] ?? null; } };
  const nodes = ['entry', 'scene', 'investigation', 'technology', 'life', 'archive'];
  const ids = ['1G', '2G', '3G', '4G', '5G', '6G'];
  const eraRecords = Object.fromEntries(ids.map(id => [id, { nodes: nodes.map(key => ({ key, nodeId: `${id}.${key}`, status: 'LOCKED' })) }]));
  const progression = { state: { eras: eraRecords, exhibitProgress: {}, dialogueProgress: {} }, persist() {} };
  const state = { visited: [], completed: [], clues: {}, logs: [], order: [], tasks: {}, evidence: [] };
  for (const id of ids) progression.state.exhibitProgress[`exhibit.${id}`] = { status: 'LOCKED' };
  const document = { body: { append() {} }, createElement() { return { setAttribute() {} }; }, addEventListener() {} };
  const window = { localStorage, document, CommsArchiveLan: { reloadStorageContext() {}, onTaskStart() {}, onTaskComplete() {}, get LanMemory() { return { completedExperienceNodes: [], completedTasks: [], eraArchives: [] }; } }, AudioSystem: { reloadSettings() {} }, CommsArchiveQuiz: { createStore() { return { loadSession() { return null; } }; } }, DemoGuide: { start() {}, refresh() {}, setMessage() {} }, go() {} };
  const context = vm.createContext({ window, Date, JSON, Math, String, Number, Array, Object, Set, structuredClone: value => JSON.parse(JSON.stringify(value)), setTimeout() { return 1; }, clearTimeout() {}, console,
    state, route: 'home', eraIndex: 0, taskStep: 0, selected: null, secondSelected: null, understandingSelected: null, designResponse: '', reviewGuideActive: false, reviewGuideStage: 0,
    progression, eras: ids.map(id => ({ id, title: `${id}展厅` })), hallDeepening: Object.fromEntries(ids.map(id => [id, { exhibits: [{ id: `exhibit.${id}` }] }])),
    defaultState: () => ({ visited: [], completed: [], clues: {}, logs: [], order: [], tasks: {}, evidence: [] }), rebindProgression() {}, save() { return true; }, render() {},
    enterEra(index) { progression.state.currentEra = ids[index]; if (!state.visited.includes(ids[index])) state.visited.push(ids[index]); route = 'chapter'; return true; }, completeEra() {}, beginEraTravel() {}, open3DGallery() {},
    close3DGallery() {}, loadState() { return state; }, quizStore: { loadSession() { return null; } }, quizSession: null, quizStorageOk: true });
  vm.runInContext(managerSource, context);
  vm.runInContext("enterEra=function(index){progression.state.currentEra=eras[index].id;if(!state.visited.includes(eras[index].id))state.visited.push(eras[index].id);route='chapter';return true};window.enterEra=enterEra;", context);
  vm.runInContext(appSource, context);
  return { window, state, progression, context };
}

test('自由演示直接进入任意时代，普通存档不参与解锁', () => {
  const h = createHarness();
  h.window.startDemoMode('free');
  assert.equal(h.window.DemoManager.state.routeMode, 'free');
  assert.equal(h.window.DemoManager.state.currentStep, 'free');
  assert.equal(h.window.enterEra(5), true);
  assert.equal(h.progression.state.currentEra, '6G');
  assert.equal(h.progression.state.currentNode, '6G.entry');
  assert.equal(h.progression.state.dialogueProgress.activeId, 'lan.6g.chapter-entry');
  assert.ok(!h.progression.state.dialogueProgress.completedIds.includes('lan.6g.chapter-entry'));
  assert.equal(vm.runInContext('state.visited.includes("6G")', h.context), true);
  assert.equal(vm.runInContext('state.completed.includes("5G")', h.context), true);
});

test('重启演示清除同一命名空间内的体验缓存，不残留上一次的设备输入',()=>{
 const h=createHarness();h.window.document.querySelector=()=>null;h.window.startDemoMode('free');
 vm.runInContext(fs.readFileSync('assets/js/era-workbench.js','utf8'),h.context);
 const api=h.window.CommsEraExperience;
 api.edit('2G','draft','上一次演示的短信');
 assert.equal(api.getState('2G').draft,'上一次演示的短信');
 h.window.startDemoMode('free');
 assert.equal(api.getState('2G').draft,'');
});

test('设备体验停留时不弹出无关的调查提示，章节演示仍保留原有提示',()=>{
 const h=createHarness();h.window.startDemoMode('free');let hints=0;
 h.window.DemoAppActions.lanHint=()=>{hints++;};
 vm.runInContext("route='experience'",h.context);h.window.DemoAppActions.onIdle();assert.equal(hints,0);
 vm.runInContext("route='chapter'",h.context);h.window.DemoAppActions.onIdle();assert.equal(hints,1);
});

test('随机路线保留去重后的时代，并允许演示中改线与记录当前位置', () => {
  const h = createHarness();
  h.window.startDemoMode('random', ['2G', '5G', '2G']);
  assert.deepEqual(Array.from(h.window.DemoManager.state.routeIds), ['2G', '5G']);
  assert.equal(h.window.DemoAppActions.enterRouteEra('5G'), true);
  assert.equal(h.window.DemoManager.state.routePosition, 1);
  h.window.DemoManager.setRoute('random', ['1G', '6G']);
  assert.deepEqual(Array.from(h.window.DemoManager.state.routeIds), ['1G', '6G']);
});
