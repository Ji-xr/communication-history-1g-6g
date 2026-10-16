'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProgression, nodeId } = require('../assets/js/progression-manager.js');

const appSource = fs.readFileSync('app.js', 'utf8');
const runtimeSource = fs.readFileSync('assets/js/runtime-content.js', 'utf8');
const erasSource = [
  between(appSource, 'const eras=[', "\neras.find(item=>item.id==='2G')"),
  between(appSource, "eras.find(item=>item.id==='2G').secondary.opts.push", '\nconst questions=')
].join('\n');
const hallSource = between(appSource, 'const hallDeepening={', '\nfunction exhibitThumbnail(');
const flowSource = [
  between(runtimeSource, '  const flowDefinitions = {', '  const flowNotes = {'),
  between(runtimeSource, '  const flowNotes = {', '\n\n  try {')
].join('\n');
const eraEntrySource = between(appSource, 'let lastEraEntryError=', '\nfunction chapterLegacy(');
const endPageSource = appSource.slice(appSource.indexOf('function endPage('), appSource.indexOf('\n', appSource.indexOf('function endPage(')));
assert.ok(endPageSource.startsWith('function endPage('), '找到真实的时代结尾页渲染器');

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `缺少源码起点：${startMarker}`);
  assert.ok(end > start, `缺少源码终点：${endMarker}`);
  return source.slice(start, end).trim();
}

function declaration(name, nextName) {
  return between(appSource, `function ${name}(`, `\nfunction ${nextName}(`);
}

const chapterSource = [
  erasSource,
  hallSource,
  between(appSource, 'const exhibitCatalogueViewState=', '\n{const savedTask'),
  flowSource,
  between(appSource, 'const futureThoughtChoices=', '\nfunction futureReflectionTask('),
  declaration('technologyBrief', 'chapterTransition'),
  declaration('chapterTransition', 'guidedStatusLabel'),
  declaration('guidedStatusLabel', 'guidedExhibitCatalogue'),
  declaration('exhibitCatalogueStateKey', 'setExhibitCatalogueExpanded'),
  declaration('setExhibitCatalogueExpanded', 'rememberExhibitCataloguePosition'),
  declaration('rememberExhibitCataloguePosition', 'guidedExhibitCatalogue'),
  between(appSource, 'function guidedExhibitCatalogue(', '\nfunction technologyLabActions('),
  declaration('technologyLabActions', 'understandingTask'),
  declaration('understandingTask', 'answerUnderstanding'),
  declaration('archiveExitContent', 'guidedChapter'),
  between(appSource, 'function futureReflectionTask(', '\nfunction recordFutureThought('),
  declaration('flowDiagram', 'imageSupplement'),
  between(appSource, 'function experienceTask(', '\nfunction renderExperienceStory('),
  between(appSource, 'function renderExperienceStory(', '\nfunction render1GExperience('),
  between(appSource, 'function render1GExperience(', '\nfunction complete3GExperience('),
  'function evidenceCards(){return \'<div class="empty">测试档案列表</div>\'}',
  between(appSource, 'function experienceInteractionMarkup(', '\nfunction recordGuidedExperience('),
  between(appSource, 'function render4GExperience(', 'function complete4GExperience('),
  between(appSource, 'function render5GExperience(', 'function complete5GExperience('),
  between(appSource, 'function render6GExperience(', 'function complete6GExperience('),
  eraEntrySource,
  endPageSource,
  between(appSource, 'function chapterLegacy(', '\nfunction chapter('),
  declaration('guidedChapter', 'guidedDiscoverExhibit'),
  'globalThis.__renderGuidedChapter = guidedChapter; globalThis.__eras = eras; globalThis.__hallDeepening = hallDeepening; globalThis.__flowDefinitions = flowDefinitions; globalThis.__flowNotes = flowNotes;'
].join('\n');

const ERA_IDS = ['1G', '2G', '3G', '4G', '5G', '6G'];
const NODE_KEYS = ['entry', 'scene', 'investigation', 'technology', 'archive'];

function htmlHandlers(markup) {
  const found = [];
  const attribute = /\bonclick\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of markup.matchAll(attribute)) {
    const expression = match[1] ?? match[2] ?? match[3] ?? '';
    for (const call of expression.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      if (!['if', 'while', 'for', 'switch', 'catch'].includes(call[1])) found.push(call[1]);
    }
  }
  return [...new Set(found)];
}

function appHandlerNames() {
  return new Set([...appSource.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(match => match[1]));
}

function createRenderer(era, nodeKey, { demo = false, existingSave = false } = {}) {
  const window = {
    DemoManager: { isActive: () => demo, state: { routeMode: demo ? 'free' : 'normal' } },
    InteractionDebugger: { record() {} },
    CommsArchiveLan: {
      LanMemory: {
        completedExperienceNodes: [],
        eraArchives: [],
        completedEvents: existingSave || demo ? [`lan_${era.toLowerCase()}_enter_001`] : [],
        viewedDialogues: [],
        skippedDialogues: []
      },
      getExperienceStory(id) { return window[`ExperienceStory${id}`]; }
    },
    CommsArchiveExperience: {
      get(_era, trigger) { return { title: trigger, prompt: '检查现场状态。', actions: ['开始互动'], feedback: [], step: 0, total: 1, result: '记录已生成。' }; }
    }
  };
  const context = vm.createContext({
    window,
    state: { visited: [era], completed: existingSave ? ERA_IDS.slice(0, ERA_IDS.indexOf(era)) : [], order: [era], clues: {}, logs: [], tasks: { [era]: { selected: 1, step: 1 } }, evidence: [{ evidenceId: `evidence.${era.toLowerCase()}.investigation`, eraId: era }], progression: null },
    route: 'chapter', eraIndex: ERA_IDS.indexOf(era), transitionInProgress: false,
    reviewGuideActive: false, taskStep: 1, selected: 1, secondSelected: 0,
    understandingSelected: null, designResponse: '', flowStepIndex: 1,
    mediaAssets: {}, exhibitLinks: {},
    save() { return true; }, reviewGuideStep() {}, dispatchLanEvent() {},
    progressionEraAllowed() { return { ok: true, reason: '' }; },
    progressionBlock(result) { throw new Error(result?.reason || '进度被阻止'); },
    showInteractionNotice() {}, render() {},
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); },
    console, Date, Math, Object, Array, Set, String, Number
  });

  vm.runInContext(chapterSource, context, { filename: 'app.js:chapter-runtime-integrity' });
  for (const script of ['experience-story-1g.js', 'experience-story-2g.js', 'lan-dialogue-3g.js', 'experience-story-4g.js', 'experience-story-5g.js', 'experience-story-6g.js']) {
    vm.runInContext(fs.readFileSync(`assets/js/${script}`, 'utf8'), context, { filename: script });
  }
  for (const item of context.__eras) {
    context.mediaAssets[item.id] = {
      flow: context.__flowDefinitions[item.id],
      flowNote: context.__flowNotes[item.id],
      photo: item.id === '6G' ? null : `assets/images/photos/${item.id.toLowerCase()}.jpg`,
      photoTitle: `${item.id}馆藏资料`, photoNote: `${item.id}展品资料`, photoType: '测试馆藏',
      photoCredit: '项目资料', photoLicense: '项目资料许可', photoLicenseUrl: '#license', photoSource: '#source'
    };
  }

  const state = context.state;
  const exhibitIds = Object.fromEntries(ERA_IDS.map(id => [id, context.__hallDeepening[id].exhibits.map(item => item.id)]));
  const progression = createProgression(state, { exhibitsByEra: exhibitIds, save: () => true });
  context.progression = progression;
  const eraNodes = progression.state.eras[era].nodes;
  for (const node of eraNodes) {
    node.status = node.key === nodeKey ? 'ACTIVE' : (nodeKey === 'entry' ? 'LOCKED' : 'AVAILABLE');
  }
  if (nodeKey !== 'entry') eraNodes.find(node => node.key === 'entry').status = 'COMPLETED';
  if (nodeKey === 'archive') {
    for (const key of ['scene', 'investigation', 'technology']) eraNodes.find(node => node.key === key).status = 'COMPLETED';
    state.tasks[era].understandingCompleted = true;
  }
  if (nodeKey === 'technology' && existingSave) {
    for (const key of ['scene', 'investigation']) eraNodes.find(node => node.key === key).status = 'COMPLETED';
    eraNodes.find(node => node.key === 'technology').status = 'COMPLETED';
    eraNodes.find(node => node.key === 'archive').status = 'AVAILABLE';
    state.tasks[era].understandingCompleted = true;
  }
  progression.state.currentEra = era;
  progression.state.currentNode = nodeId(era, nodeKey);
  progression.state.dialogueProgress.activeId = nodeKey === 'entry' ? `lan.${era.toLowerCase()}.chapter-entry` : null;
  if (existingSave) state.tasks[era].understandingCompleted = true;
  context.__render = () => context.__renderGuidedChapter();
  context.render = () => { context.lastMarkup = context.__renderGuidedChapter(); };
  context.hallOverview = eraData => `<div>${eraData.id}历史现场</div>`;
  context.imageSupplement = () => '';
  context.eraArchivePanel3G = () => '';
  context.eraArchivePanel4G = () => '';
  context.ensureEraInvestigationEvidence = () => true;
  return { context, state, progression, window };
}

test('chapterTransition有真实实现，并为1G至6G生成时代衔接内容', () => {
  assert.match(appSource, /function chapterTransition\(e\)/);
  const { context } = createRenderer('1G', 'archive');
  for (const era of ERA_IDS) {
    const item = context.__eras.find(value => value.id === era);
    const markup = vm.runInContext(`chapterTransition(eras.find(item => item.id === ${JSON.stringify(era)}))`, context);
    assert.match(markup, /chapter-transition/);
    assert.match(markup, new RegExp(era));
    assert.ok(markup.includes(context.__hallDeepening[era].transition || item.end), `${era}应有真实衔接说明`);
  }
});

test('旧版时代结尾页实际渲染1G至6G归档衔接段落及可用导航', () => {
  const declaredHandlers = appHandlerNames();
  for (const era of ERA_IDS) {
    const { context } = createRenderer(era, 'archive', { existingSave: true });
    const markup = vm.runInContext('endPage()', context, { timeout: 1000 });
    assert.match(markup, /chapter-transition/);
    assert.ok(markup.includes(context.__hallDeepening[era].transition || context.__eras.find(item => item.id === era).end));
    for (const handler of htmlHandlers(markup)) assert.ok(declaredHandlers.has(handler), `${era}结尾页回调${handler}必须存在`);
  }
});

test('1G至6G的五个正式节点均执行真实guidedChapter渲染，不抛出运行时异常', () => {
  for (const era of ERA_IDS) {
    for (const nodeKey of NODE_KEYS) {
      const { context } = createRenderer(era, nodeKey, { existingSave: true });
      const markup = vm.runInContext('__renderGuidedChapter()', context, { timeout: 1000 });
      assert.match(markup, new RegExp(`${era} ·`), `${era}/${nodeKey}应产生章节内容`);
      assert.match(markup, new RegExp(context.__eras.find(item => item.id === era).title));
      assert.match(markup, new RegExp(`\\b${nodeKey}\\b|${nodeKey === 'scene' ? '历史现场' : nodeKey === 'archive' ? '档案出口' : nodeKey === 'technology' ? '技术实验室' : nodeKey === 'investigation' ? '建设调查' : '时代入口'}`));
      if (nodeKey === 'technology') assert.match(markup, /技术流程示意/);
      if (nodeKey === 'technology') assert.match(markup, /前往时代档案出口/);
      if (nodeKey === 'archive') assert.match(markup, /时代档案出口/);
    }
  }
});

test('六代实际生成的章节按钮均指向已定义的应用处理函数', () => {
  const declaredHandlers = appHandlerNames();
  for (const era of ERA_IDS) {
    for (const nodeKey of NODE_KEYS) {
      const { context } = createRenderer(era, nodeKey);
      const markup = vm.runInContext('__renderGuidedChapter()', context, { timeout: 1000 });
      for (const handler of htmlHandlers(markup)) {
        assert.ok(declaredHandlers.has(handler), `${era}/${nodeKey}生成了未定义的onclick处理函数 ${handler}`);
      }
    }
  }
});

test('新用户、旧存档恢复和演示模式均可调用真实章节渲染器', () => {
  const first = createRenderer('1G', 'entry');
  assert.equal(vm.runInContext('enterEra(0)', first.context), true, '新用户通过实际enterEra进入1G');
  assert.equal(first.context.route, 'chapter');
  const firstMarkup = first.context.lastMarkup;
  assert.match(firstMarkup, /时代入口/);

  const restored = createRenderer('4G', 'technology', { existingSave: true });
  restored.state.progression = restored.progression.state;
  const restoredState = JSON.parse(JSON.stringify(restored.state));
  delete restoredState.progression;
  const restoredProgression = createProgression(restoredState);
  assert.equal(restoredProgression.currentEra(), '4G');
  assert.notEqual(restoredProgression.currentNode().key, 'life', '恢复位置不再指向已取消的体验节点');
  assert.equal(restoredProgression.state.eras['4G'].nodes.find(node => node.key === 'technology').status, 'COMPLETED');
  const resume = createRenderer('4G', 'technology', { existingSave: true });
  assert.equal(vm.runInContext('enterEra(3)', resume.context), true, '已有存档通过实际enterEra恢复4G技术实验室');
  assert.match(resume.context.lastMarkup, /时代档案出口 \/ 4G/);

  const demo = createRenderer('6G', 'technology', { demo: true });
  assert.match(vm.runInContext('__renderGuidedChapter()', demo.context), /6G仍处于研究发展阶段/);
  assert.equal(demo.window.DemoManager.isActive(), true);
});

test('旧版兼容渲染器的六代路径均可执行，6G调用现有未来通信猜想任务', () => {
  for (const era of ERA_IDS) {
    const { context } = createRenderer(era, 'technology');
    const markup = vm.runInContext('chapterLegacy()', context, { timeout: 1000 });
    assert.match(markup, new RegExp(era));
    if (era === '6G') assert.match(markup, /未来通信猜想/);
  }
  assert.doesNotMatch(appSource, /researchDesignTask\s*\(/);
});

test('实际章节页面节点切换可完成，并由进度管理器开放时代归档和下一时代', () => {
  const state = { visited: [], completed: [], order: [], clues: {}, logs: [], tasks: {}, evidence: [] };
  const manager = createProgression(state, { exhibitsByEra: { '1G': ['phone-1g'] } });
  assert.equal(manager.enterEra('1G').ok, true);
  assert.equal(manager.completeDialogue('lan.1g.chapter-entry').ok, true);
  assert.equal(manager.requestNode('1G', nodeId('1G', 'scene')).ok, true);
  assert.equal(manager.markDiscoverable('phone-1g', '1G').ok, true);
  assert.equal(manager.discoverExhibit('phone-1g', '1G').ok, true);
  assert.equal(manager.completeScene().ok, true);
  state.tasks['1G'] = { selected: 1, step: 1 };
  assert.equal(manager.requestNode('1G', nodeId('1G', 'investigation')).ok, true);
  assert.equal(manager.completeInvestigation().ok, true);
  state.evidence.push({ evidenceId: 'evidence.1g.investigation', eraId: '1G' });
  manager.state.evidence = ['evidence.1g.investigation'];
  state.tasks['1G'].understandingCompleted = true;
  assert.equal(manager.requestNode('1G', nodeId('1G', 'technology')).ok, true);
  assert.equal(manager.completeTechnology({ holdCurrent: true }).ok, true);
  assert.equal(manager.currentNode().key, 'technology', '完成技术实验后仍停留在当前页面');
  assert.equal(manager.requestNode('1G', nodeId('1G', 'archive')).ok, true);
  assert.equal(manager.completeArchive().ok, true);
  state.completed.push('1G');
  assert.equal(state.completed.includes('1G'), true);
  assert.equal(manager.enterEra('2G').ok, true);
  assert.equal(manager.currentEra(), '2G');
});

test('扫描结果：chapterTransition缺失已修复，反复出现的历史错误标识均有实现', () => {
  const chapterTransitionCalls = [...appSource.matchAll(/\bchapterTransition\s*\(/g)];
  const chapterTransitionDefinitions = [...appSource.matchAll(/\bfunction\s+chapterTransition\s*\(/g)];
  assert.equal(chapterTransitionDefinitions.length, 1);
  assert.equal(chapterTransitionCalls.length, 2, '定义与旧版时代结尾页调用；新归档出口不依赖旧页面');
  for (const identifier of ['guidedStatusLabel', 'progressionBlock', 'rejectProgress', 'technologyBrief']) {
    assert.match(appSource, new RegExp(`function\\s+${identifier}\\s*\\(`), `${identifier}应有实际定义`);
  }
  assert.doesNotMatch(appSource, /researchDesignTask\s*\(/);
});
