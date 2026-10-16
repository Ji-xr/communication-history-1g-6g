const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/demo-manager.js', 'utf8');

function runtime(seed = {}) {
  const data = new Map(Object.entries(seed));
  const timers = [];
  const listeners = {};
  let now = 1000;
  class FakeDate extends Date { static now() { return now; } }
  const localStorage = {
    get length() { return data.size; },
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(key); },
    key(index) { return [...data.keys()][index] ?? null; }
  };
  const guide = { setAttribute() {}, classList: { add() {}, remove() {} } };
  const document = {
    body: { append(node) { node.parent = this; } },
    createElement() { return { setAttribute() {}, classList: { add() {}, remove() {} } }; },
    addEventListener(type, listener) { listeners[type] = listener; }
  };
  const window = { localStorage, document };
  vm.runInNewContext(source, { window, Date: FakeDate, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {}, Math, JSON, String, Number, Array });
  return { window, data, timers, advance(ms) { now += ms; }, listeners };
}

test('演示存档、澜记忆和答题键使用独立命名空间，普通存档保持原样', () => {
  const rt = runtime({ commsArchive: JSON.stringify({ completed: ['1G'], logs: ['keep'] }), 'commsArchive.lanMemory.v1': 'normal-lan' });
  const demo = rt.window.DemoManager;
  demo.start({ visited: [], completed: [] }, 'prologue');
  const proxy = demo.storageProxy(rt.window.localStorage);
  proxy.setItem('commsArchive.lanMemory.v1', 'demo-lan');
  proxy.setItem('quiz.records', 'demo-quiz');
  demo.saveView('chapter', 2);
  demo.saveAppState({ visited: ['1G'], completed: [], tasks: {} });
  assert.equal(rt.window.localStorage.getItem('commsArchive'), JSON.stringify({ completed: ['1G'], logs: ['keep'] }));
  assert.equal(rt.window.localStorage.getItem('commsArchive.lanMemory.v1'), 'normal-lan');
  assert.equal(rt.window.localStorage.getItem('demoArchive::commsArchive.lanMemory.v1'), 'demo-lan');
  assert.equal(rt.window.localStorage.getItem('demoArchive::quiz.records'), 'demo-quiz');
  assert.deepEqual(JSON.parse(JSON.stringify(demo.state.appState)), { visited: ['1G'], completed: [], tasks: {} });
  assert.equal(demo.state.currentRoute, 'chapter');
  assert.equal(demo.state.eraIndex, 2);
});

test('刷新可恢复活动演示，退出后回到普通命名空间', () => {
  const rt = runtime({ commsArchive: JSON.stringify({ completed: ['1G'] }) });
  rt.window.DemoManager.start({ visited: ['1G'], completed: [] }, 'chapter');
  rt.window.DemoManager.setStep('fourg');
  const resumed = runtime(Object.fromEntries(rt.data));
  assert.equal(resumed.window.DemoManager.shouldResume(), true);
  assert.equal(resumed.window.DemoManager.state.currentStep, 'fourg');
  assert.deepEqual(JSON.parse(JSON.stringify(resumed.window.DemoManager.loadAppState({}))).visited, ['1G']);
  resumed.window.DemoManager.exit();
  assert.equal(resumed.window.DemoManager.isActive(), false);
  assert.equal(resumed.window.localStorage.getItem('commsArchive'), JSON.stringify({ completed: ['1G'] }));
});

test('演示开始时间写入独立演示状态，重新开始会重置演示计时', () => {
  const rt = runtime();
  rt.window.DemoManager.start({}, 'prologue');
  assert.equal(rt.window.DemoManager.state.startedAt, 1000);
  rt.advance(45000);
  assert.equal(rt.window.DemoManager.state.currentStep, 'welcome');
  rt.window.DemoManager.start({}, 'prologue', { routeMode: 'recommended' });
  assert.equal(rt.window.DemoManager.state.startedAt, 46000);
  assert.deepEqual(JSON.parse(rt.window.localStorage.getItem('demoArchive')).completedSteps, []);
});

test('30秒无操作会触发可关闭的引导提示', () => {
  const rt = runtime(); let hints = 0;
  rt.window.DemoManager.start({}, 'prologue');
  rt.window.DemoAppActions = { onIdle() { hints += 1; } };
  rt.window.DemoGuide.start();
  assert.equal(rt.timers.length, 1);
  rt.advance(31000); rt.timers[0]();
  assert.equal(hints, 1);
  assert.equal(rt.window.DemoGuide.idleNotified, true);
});

test('演示路线依次经过1G调查、4G技术实验、5G展品和6G档案，不经过体验节点', () => {
  const data = new Map([['commsArchive', JSON.stringify({ completed: ['2G'], logs: ['untouched'] })]]);
  const localStorage = { get length() { return data.size; }, getItem(key) { return data.get(key) ?? null; }, setItem(key, value) { data.set(key, String(value)); }, removeItem(key) { data.delete(key); }, key(index) { return [...data.keys()][index] ?? null; } };
  const document = { body: { append() {} }, createElement() { return { setAttribute() {} }; }, addEventListener() {} };
  const window = { localStorage, document, viewerState: { mode: 'fallback', status: 'failed' } };
  const eraIds = ['1G', '2G', '3G', '4G', '5G', '6G'];
  const nodes = ['entry', 'scene', 'investigation', 'technology', 'archive'];
  const progression = { state: { eras: Object.fromEntries(eraIds.map(era => [era, { nodes: nodes.map(key => ({ key, nodeId: `${era}_${key}`, status: 'LOCKED' })) }])), currentEra: null, currentNode: null, exhibitProgress: {}, dialogueProgress: {} } };
  const lanMemory = { completedExperienceNodes: [], completedTasks: [], eraArchives: [] };
  const state = { visited: [], completed: [], clues: {}, logs: [], order: [], tasks: {}, evidence: [] };
  const hallDeepening = Object.fromEntries(eraIds.map(era => [era, { exhibits: [{ id: `exhibit.${era}`, type: '展品' }] }]));
  for (const era of eraIds) progression.state.exhibitProgress[`exhibit.${era}`] = { status: 'LOCKED', eraId: era };
  const vmContext = vm.createContext({ window, Date, JSON, Math, String, Number, Array, Object, setTimeout() { return 1; }, clearTimeout() {}, console,
    state, route: 'home', eraIndex: 0, taskStep: 0, selected: null, secondSelected: null, understandingSelected: null, designResponse: '',
    reviewGuideActive: false, reviewGuideStage: 0, progression, eras: eraIds.map(id => ({ id })), hallDeepening,
    defaultState: () => ({ visited: [], completed: [], clues: {}, logs: [], order: [], tasks: {}, evidence: [] }),
    rebindProgression() {}, save() { return true; }, render() {},
    enterEra(index) { progression.state.currentEra = eraIds[index]; route = 'chapter'; return true; },
    completeEra() { const era = progression.state.currentEra; if (era && !state.completed.includes(era)) state.completed.push(era); if (era === '6G') lanMemory.eraArchives.push({ archiveId: 'archive_6g', era, completed: true }); route = 'chapter-end'; return true; },
    beginEraTravel() {}, open3DGallery() {}, go(name) { route = name; },
    app: { insertAdjacentHTML() {} }, quizStore: { loadSession() { return null; } }, quizSession: null, quizStorageOk: true,
    CommsArchiveLan: { reloadStorageContext() {}, openPrologue() {}, onTaskStart() {}, onTaskComplete() { if (!lanMemory.completedTasks.includes('task.6g.investigation')) lanMemory.completedTasks.push('task.6g.investigation'); },
      get LanMemory() { return lanMemory; },
      collectBuilderEvidence6G() { return true; } },
    AudioSystem: { reloadSettings() {} }, CommsArchiveQuiz: { createStore() { return { loadSession() { return null; } }; } },
    ExperienceStory6G: { nodes: [{ trigger: 'EXPERIENCE_6G_A' }, { trigger: 'EXPERIENCE_6G_B' }] }, EraArchive6G: { evidenceIds: ['evidence_a', 'evidence_b'] },
    ArchiveEvidence6G: [], collect6GEvidenceCard(id) { state.evidence.push({ evidenceId: id }); return true; },
    complete6GArchive() { lanMemory.eraArchives.push({ archiveId: 'archive_6g', completed: true }); return true; },
    guidedDiscoverExhibit(era, id) { progression.state.exhibitProgress[id].status = 'FOUND'; }
  });
  const managerSource = fs.readFileSync('assets/js/demo-manager.js', 'utf8');
  const appSource = fs.readFileSync('assets/js/demo-app.js', 'utf8');
  vm.runInContext("window.CommsArchiveLan=CommsArchiveLan;window.AudioSystem=AudioSystem;window.CommsArchiveQuiz=CommsArchiveQuiz;window.ExperienceStory6G=ExperienceStory6G;window.EraArchive6G=EraArchive6G;window.ArchiveEvidence6G=ArchiveEvidence6G;enterEra=function(index){progression.state.currentEra=eras[index].id;route='chapter';return true};completeEra=function(){const era=progression.state.currentEra;if(era&&!state.completed.includes(era))state.completed.push(era);if(era==='6G')window.CommsArchiveLan.LanMemory.eraArchives.push({archiveId:'archive_6g',era,completed:true});route='chapter-end';return true};beginEraTravel=function(){};open3DGallery=function(){window.__galleryCalls=(window.__galleryCalls||0)+1};go=function(name){route=name};render=function(){};collect6GEvidenceCard=function(id){state.evidence.push({evidenceId:id})};complete6GArchive=function(){window.CommsArchiveLan.LanMemory.eraArchives.push({archiveId:'archive_6g',completed:true});return true};guidedDiscoverExhibit=function(era,id){progression.state.exhibitProgress[id].status='FOUND'};Object.assign(window,{enterEra,completeEra,beginEraTravel,open3DGallery,go,render,collect6GEvidenceCard,complete6GArchive,guidedDiscoverExhibit});", vmContext);
  vm.runInContext(managerSource, vmContext);
  vm.runInContext(appSource, vmContext);
  window.startDemoMode();
  window.DemoAppActions.advance();
  assert.equal(window.DemoManager.state.currentStep, 'oneg');
  assert.equal(window.__galleryCalls || 0, 0);
  assert.equal(vm.runInContext("route", vmContext), 'chapter');
  vm.runInContext('selected=1; taskStep=1;', vmContext);
  assert.equal(vm.runInContext('selected', vmContext), 1);
  assert.equal(vm.runInContext('taskStep', vmContext), 1);
  window.DemoAppActions.advance();
  assert.equal(window.DemoManager.state.currentStep, 'fourg');
  window.DemoAppActions.advance();
  window.completeEra();
  assert.equal(window.DemoManager.state.currentStep, 'fiveg');
  window.DemoAppActions.advance();
  window.guidedDiscoverExhibit('5G', 'exhibit.5G');
  assert.equal(window.DemoManager.state.currentStep, 'sixg');
  window.DemoAppActions.advance();
  assert.equal(window.DemoManager.state.currentStep, 'sixg', '生成6G演示资料后仍停留在档案出口');
  window.completeEra();
  assert.equal(window.DemoManager.state.currentStep, 'complete');
  assert.equal(lanMemory.eraArchives.some(record => record.archiveId === 'archive_6g'), true);
  window.DemoAppActions.advance();
  assert.equal(vm.runInContext('route', vmContext), 'final');
  assert.equal(localStorage.getItem('commsArchive'), JSON.stringify({ completed: ['2G'], logs: ['untouched'] }));
  window.DemoAppActions.restart();
  assert.equal(window.DemoManager.state.currentStep, 'welcome');
  assert.equal(window.DemoManager.state.routeMode, 'recommended');
  assert.equal(localStorage.getItem('commsArchive'), JSON.stringify({ completed: ['2G'], logs: ['untouched'] }));
});

