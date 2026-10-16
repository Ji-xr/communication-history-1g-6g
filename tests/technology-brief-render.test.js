const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProgression, nodeId } = require('../assets/js/progression-manager.js');

const appSource = fs.readFileSync('app.js', 'utf8');
const runtimeSource = fs.readFileSync('assets/js/runtime-content.js', 'utf8');

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `找不到源码起点：${startMarker}`);
  assert.ok(end > start, `找不到源码终点：${endMarker}`);
  return source.slice(start, end).trim();
}

function declaration(source, name, nextName) {
  return sourceBetween(source, `function ${name}(`, `\nfunction ${nextName}(`);
}

const eraDataSource = sourceBetween(appSource, 'const eras=[', "\neras.find(item=>item.id==='2G')");
const hallDataSource = sourceBetween(appSource, 'const hallDeepening={', '\nfunction exhibitThumbnail(');
const flowDataSource = [
  sourceBetween(runtimeSource, '  const flowDefinitions = {', '  const flowNotes = {'),
  sourceBetween(runtimeSource, '  const flowNotes = {', '\n\n  try {'),
].join('\n');
const futureChoicesSource = sourceBetween(appSource, 'const futureThoughtChoices=', '\nfunction futureReflectionTask(');
const enterEraSource = sourceBetween(appSource, 'let lastEraEntryError=', '\nfunction chapterLegacy(');

const rendererSource = [
  eraDataSource,
  hallDataSource,
  flowDataSource,
  futureChoicesSource,
  sourceBetween(appSource, 'const exhibitCatalogueViewState=', '\n{const savedTask'),
  declaration(appSource, 'technologyBrief', 'guidedStatusLabel'),
  declaration(appSource, 'guidedStatusLabel', 'guidedExhibitCatalogue'),
  declaration(appSource, 'exhibitCatalogueStateKey', 'setExhibitCatalogueExpanded'),
  declaration(appSource, 'setExhibitCatalogueExpanded', 'rememberExhibitCataloguePosition'),
  declaration(appSource, 'rememberExhibitCataloguePosition', 'guidedExhibitCatalogue'),
  sourceBetween(appSource, 'function guidedExhibitCatalogue(', '\nfunction technologyLabActions('),
  declaration(appSource, 'technologyLabActions', 'understandingTask'),
  declaration(appSource, 'understandingTask', 'answerUnderstanding'),
  sourceBetween(appSource, 'function answerUnderstanding(', '\nconst futureThoughtChoices='),
  declaration(appSource, 'futureReflectionTask', 'recordFutureThought'),
  declaration(appSource, 'flowDiagram', 'imageSupplement'),
  declaration(appSource, 'eraArrivalResolved', 'guidedChapter'),
  declaration(appSource, 'guidedChapter', 'guidedDiscoverExhibit'),
  enterEraSource,
  'globalThis.__renderGuidedChapter = guidedChapter; globalThis.__enterEra = enterEra; globalThis.__eras = eras; globalThis.__hallDeepening = hallDeepening; globalThis.__flowDefinitions = flowDefinitions; globalThis.__flowNotes = flowNotes;'
].join('\n');

function makeState() {
  return { visited: [], completed: [], order: [], clues: {}, logs: [], tasks: {}, evidence: [] };
}

function configureHarness({ era = '1G', progression, state, demo = false } = {}) {
  const ctx = vm.createContext({
    state,
    progression,
    route: 'home',
    eraIndex: ['1G', '2G', '3G', '4G', '5G', '6G'].indexOf(era),
    transitionInProgress: false,
    reviewGuideActive: false,
    reviewGuideStage: 0,
    taskStep: Number.isInteger(state.tasks?.[era]?.step) ? state.tasks[era].step : 0,
    selected: null,
    secondSelected: null,
    understandingSelected: null,
    designResponse: '',
    flowStepIndex: 0,
    lastEraEntryError: '',
    save() {},
    reviewGuideStep() {},
    progressionEraAllowed: () => ({ ok: true, reason: '' }),
    progressionBlock(result) { throw new Error(result?.reason || 'progression blocked'); },
    ensureEraInvestigationEvidence() { return true; },
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); },
    mediaAssets: {},
    window: {
      DemoManager: { isActive: () => demo, state: { routeMode: 'free' } },
      InteractionDebugger: { record() {} }
    }
  });
  vm.runInContext(rendererSource, ctx, { filename: 'app.js:technology-render-test' });
  for (const item of ctx.__eras) {
    ctx.mediaAssets[item.id] = {
      flow: ctx.__flowDefinitions[item.id],
      flowNote: ctx.__flowNotes[item.id]
    };
  }
  ctx.render = () => { ctx.lastMarkup = ctx.__renderGuidedChapter(); };
  return ctx;
}

function makeProgressionAtTechnology(era = '1G') {
  const state = makeState();
  const progression = createProgression(state);
  if (era === '1G') {
    progression.enterEra('1G');
    progression.completeDialogue('lan.1g.chapter-entry');
    progression.requestNode('1G', nodeId('1G', 'investigation'));
    state.tasks['1G'] = { selected: 0, step: 1 };
    assert.equal(progression.completeInvestigation().ok, true);
    return { state, progression };
  }
  const record = progression.state.eras[era];
  for (const node of record.nodes) node.status = node.key === 'technology' ? 'ACTIVE' : node.key === 'entry' ? 'COMPLETED' : 'AVAILABLE';
  progression.state.currentEra = era;
  progression.state.currentNode = nodeId(era, 'technology');
  progression.state.dialogueProgress.activeId = null;
  state.visited.push(era);
  return { state, progression };
}

test('首次进入1G执行真实时代入口函数并渲染入口章节', () => {
  const state = makeState();
  const progression = createProgression(state);
  const ctx = configureHarness({ state, progression });

  assert.equal(ctx.__enterEra(0), true);
  assert.equal(ctx.route, 'chapter');
  assert.match(ctx.lastMarkup, /时代入口 \/ 20世纪80年代/);
  assert.match(ctx.lastMarkup, /现场记录：/);
  assert.match(ctx.lastMarkup, /模拟测试记录显示，一次早期移动电话呼叫没有接通/);
  assert.doesNotMatch(ctx.lastMarkup, /核心问题：/);
});

test('建设调查完成后，继续进入1G会实际渲染技术实验室和原有技术资料', () => {
  const { state, progression } = makeProgressionAtTechnology('1G');
  const ctx = configureHarness({ state, progression });

  assert.equal(progression.currentNode().key, 'technology');
  assert.equal(ctx.__enterEra(0), true);
  assert.match(ctx.lastMarkup, /技术实验室 \/ 1G/);
  assert.match(ctx.lastMarkup, /理解模拟蜂窝通信/);
  assert.match(ctx.lastMarkup, /一次移动呼叫通常如何从终端进入蜂窝网络/);
  assert.match(ctx.lastMarkup, /早期移动电话通过无线电与蜂窝网络连接/);
  assert.match(ctx.lastMarkup, /技术流程示意/);
  assert.match(ctx.lastMarkup, /技术理解 · 1G/);
  assert.match(ctx.lastMarkup, /onclick="answerUnderstanding\(0\)"/);
  assert.equal(vm.runInContext('answerUnderstanding(0)', ctx), true);
  assert.equal(state.tasks['1G'].understandingCompleted, true);
  assert.equal(progression.state.eras['1G'].nodes.find(node => node.key === 'technology').status, 'COMPLETED');
});

test('1G至6G技术实验室渲染各自时代数据、流程图和可操作理解任务', () => {
  for (const era of ['1G', '2G', '3G', '4G', '5G', '6G']) {
    const { state, progression } = makeProgressionAtTechnology(era);
    const ctx = configureHarness({ era, state, progression });
    const markup = ctx.__renderGuidedChapter();
    const eraData = ctx.__eras.find(item => item.id === era);
    const knowledge = ctx.__hallDeepening[era].knowledge;

    assert.match(markup, new RegExp(`技术实验室 \/ ${era}`));
    assert.ok(markup.includes(knowledge.prompt), `${era}技术理解题应显示`);
    assert.ok(markup.includes(eraData.objectInfo), `${era}设备技术说明应显示`);
    assert.match(markup, new RegExp(`${era} 技术流程示意`));
    assert.match(markup, /onclick="answerUnderstanding\(0\)"|未来通信猜想/);
  }
});

test('刷新后进度管理器恢复1G技术节点，时代进入函数仍能渲染技术摘要', () => {
  const { state, progression } = makeProgressionAtTechnology('1G');
  const restoredState = JSON.parse(JSON.stringify(state));
  const restoredProgression = createProgression(restoredState);
  const ctx = configureHarness({ state: restoredState, progression: restoredProgression });

  assert.equal(restoredProgression.currentNode().key, 'technology');
  assert.equal(ctx.__enterEra(0), true);
  assert.match(ctx.lastMarkup, /技术实验室 \/ 1G/);
  assert.match(ctx.lastMarkup, /理解模拟蜂窝通信/);
});

