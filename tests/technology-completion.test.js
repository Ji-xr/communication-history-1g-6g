'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProgression } = require('../assets/js/progression-manager.js');

const app = fs.readFileSync('app.js', 'utf8');
function between(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source segment ${start}`);
  return source.slice(from, to).trim();
}
const eraData = between(app, 'const eras=[', "\neras.find(item=>item.id==='2G')");
const labData = between(app, 'const hallDeepening={', '\nfunction exhibitThumbnail(');
const handlers = [
  between(app, 'function guidedStatusLabel(', '\nfunction guidedExhibitCatalogue('),
  between(app, 'function technologyLabActions(', '\nfunction answerUnderstanding('),
  between(app, 'function understandingTask(', '\nfunction answerUnderstanding('),
  between(app, 'function answerUnderstanding(', '\nconst futureThoughtChoices='),
  between(app, 'const futureThoughtChoices=', '\nfunction recordFutureThought('),
  between(app, 'function futureReflectionTask(', '\nfunction recordFutureThought('),
  between(app, 'function ensureEraInvestigationEvidence(', '\nfunction completeGuidedSceneFromExhibit('),
  between(app, 'function completeResearchVisit(', '\nfunction guidedChapter(')
].join('\n');
const ERA_IDS = ['1G', '2G', '3G', '4G', '5G', '6G'];

function runtimeFor(era) {
  const priorCompleted = ERA_IDS.slice(0, ERA_IDS.indexOf(era));
  const evidenceId = `evidence.${era.toLowerCase()}.investigation`;
  const state = {
    visited: [era], completed: priorCompleted, order: [era], clues: {}, logs: [],
    evidence: [
      { evidenceId, eraId: era },
      ...(era === '6G' ? ['evidence_6g_delay', 'evidence_6g_sensor', 'evidence_6g_ai', 'evidence_6g_twin'].map(id => ({ evidenceId: id, eraId: '6G' })) : [])
    ],
    tasks: { [era]: { selected: 0, step: 1, understandingCompleted: false } }
  };
  const progression = createProgression(state, { save: () => true });
  progression.state.evidence = [evidenceId, ...(era === '6G' ? ['evidence_6g_delay', 'evidence_6g_sensor', 'evidence_6g_ai', 'evidence_6g_twin'] : [])];
  const nodes = progression.state.eras[era].nodes;
  for (const node of nodes) {
    node.status = ({ entry: 'COMPLETED', scene: 'COMPLETED', investigation: 'COMPLETED', technology: 'ACTIVE', archive: 'LOCKED' })[node.key];
  }
  progression.state.dialogueProgress.completedIds.push(`lan.${era.toLowerCase()}.chapter-entry`);
  progression.state.exhibitProgress[`exhibit.${era.toLowerCase()}.test`] = { exhibitId: `exhibit.${era.toLowerCase()}.test`, eraId: era, status: 'FOUND' };
  progression.state.currentEra = era;
  progression.state.currentNode = `${era.toLowerCase()}_technology`;
  const window = { InteractionDebugger: { record() {} } };
  const context = vm.createContext({
    state, progression, window, console, Date, Math, Object, Array, String, Number,
    eraIndex: ERA_IDS.indexOf(era), route: 'chapter',
    mediaAssets: Object.fromEntries(ERA_IDS.map(id => [id, { flowNote: `${id}技术流程` }])),
    exhibitLinks: Object.fromEntries(ERA_IDS.map(id => [id, { evidenceId: `evidence.${id.toLowerCase()}.investigation` }])),
    render() { context.renderCount = (context.renderCount || 0) + 1; },
    save() { context.saveCount = (context.saveCount || 0) + 1; return true; },
    showInteractionNotice(message) { context.notice = message; },
    progressionBlock(result) { if (!result?.ok) { context.notice = result?.reason || 'progression blocked'; return true; } return false; },
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); },
    syncTaskProgress() {}
  });
  vm.runInContext(eraData, context);
  vm.runInContext(labData, context);
  vm.runInContext(handlers, context);
  context.eras = vm.runInContext('eras', context);
  context.hallDeepening = vm.runInContext('hallDeepening', context);
  return { state, progression, context };
}

test('1G至5G答题后停留在技术实验室，读完解释后可手动进入档案出口', () => {
  for (const era of ERA_IDS.slice(0, 5)) {
    const { state, progression, context } = runtimeFor(era);
    const knowledge = context.hallDeepening[era].knowledge;
    assert.ok(knowledge?.options?.some(option => option.correct), `${era} has a correct technical answer`);
    const correct = knowledge.options.findIndex(option => option.correct);
    const incorrect = knowledge.options.findIndex(option => !option.correct);

    assert.equal(vm.runInContext(`answerUnderstanding(${incorrect})`, context), true);
    assert.equal(progression.state.eras[era].nodes.find(node => node.key === 'technology').status, 'ACTIVE');
    assert.equal(state.tasks[era].understandingCompleted, false);
    assert.equal(vm.runInContext(`answerUnderstanding(${correct})`, context), true);
    assert.equal(state.tasks[era].understandingCompleted, true);
    assert.equal(state.tasks[era].technologyLabCompleted, true);
    assert.equal(progression.state.eras[era].nodes.find(node => node.key === 'technology').status, 'COMPLETED');
    assert.equal(progression.state.taskProgress[era].technologyCompleted, true);
    assert.equal(progression.currentNode().key, 'technology', `${era} remains on the lab after a correct answer`);
    assert.equal(progression.state.eras[era].nodes.length, 5);

    const markup = vm.runInContext(`technologyLabActions(eras[eraIndex],state.tasks['${era}'],progression.state.eras['${era}'].nodes.find(node=>node.key==='technology'))`, context);
    assert.match(markup, /实验结论/);
    assert.match(markup, /前往时代档案出口/);
    assert.doesNotMatch(markup, /体验区|生活体验/);
    assert.equal(vm.runInContext('enterArchiveExit()', context), true, `${era} archive transition is a real action`);
    assert.equal(progression.currentNode().key, 'archive');
    assert.ok(context.renderCount > 0);
  }
});

test('6G研究观察完成后仍停留实验室，显示研究结论和手动档案出口', () => {
  const { state, progression, context } = runtimeFor('6G');
  assert.equal(vm.runInContext('completeResearchVisit()', context), true);
  assert.equal(state.tasks['6G'].understandingCompleted, true);
  assert.equal(progression.state.eras['6G'].nodes.find(node => node.key === 'technology').status, 'COMPLETED');
  assert.equal(progression.state.taskProgress['6G'].technologyCompleted, true);
  assert.equal(progression.currentNode().key, 'technology');
  const markup = vm.runInContext("`${technologyLabActions(eras[eraIndex],state.tasks['6G'],progression.currentNode())} ${futureReflectionTask()}`", context);
  assert.match(markup, /前往时代档案出口/);
  assert.match(markup, /研究/);
});

test('实验结论阅读状态独立保存；正式入口不再加载用户体验节点', () => {
  const { state, progression, context } = runtimeFor('1G');
  const correct = context.hallDeepening['1G'].knowledge.options.findIndex(option => option.correct);
  assert.equal(vm.runInContext(`answerUnderstanding(${correct})`, context), true);
  assert.equal(state.tasks['1G'].technologyConclusionViewed, false);
  assert.equal(vm.runInContext('markTechnologyConclusionRead()', context), true);
  assert.equal(state.tasks['1G'].technologyConclusionViewed, true);
  assert.equal(progression.currentNode().key, 'technology', 'reading the conclusion does not navigate');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED=false/);
  assert.match(html, /<script[^>]+src="assets\/js\/experience-interactions\.js"/);
  assert.doesNotMatch(app, /onclick="enterExperienceZone\(\)"/);
});

test('旧六节点存档停在体验区时安全迁移；保留体验日志并恢复到档案出口', () => {
  const oldNodes = ['entry', 'scene', 'investigation', 'technology', 'life', 'archive'].map(key => ({
    eraId: '1G', nodeId: `1g_${key}`, key,
    status: key === 'life' ? 'ACTIVE' : ['entry', 'scene', 'investigation', 'technology'].includes(key) ? 'COMPLETED' : 'LOCKED',
    unlockedTime: null, completedTime: key === 'technology' ? '2026-10-10T10:00:00.000Z' : null
  }));
  const state = {
    visited: ['1G'], completed: [], clues: {}, logs: [{ id: 'era-impact-1g', era: '1G', title: '旧体验影响' }],
    evidence: [{ evidenceId: 'evidence.1g.investigation', eraId: '1G' }],
    tasks: { '1G': { selected: 0, step: 1, understandingCompleted: true } },
    lanMemory: { completedExperienceNodes: ['EXPERIENCE_1G_CALL'] },
    progression: {
      version: 1, currentEra: '1G', currentNode: '1g_life',
      dialogueProgress: { completedIds: ['lan.1g.chapter-entry'], activeId: null },
      eras: { '1G': { eraId: '1G', nodes: oldNodes } },
      exhibitProgress: { phone: { exhibitId: 'phone', eraId: '1G', status: 'FOUND' } },
      taskProgress: {}, evidence: ['evidence.1g.investigation']
    }
  };
  const manager = createProgression(state, { save: () => true });
  assert.deepEqual(manager.state.eras['1G'].nodes.map(node => node.key), ['entry', 'scene', 'investigation', 'technology', 'archive']);
  assert.equal(manager.state.eras['1G'].nodes.find(node => node.key === 'technology').status, 'COMPLETED');
  assert.equal(manager.currentNode().key, 'archive');
  assert.deepEqual(state.logs, [{ id: 'era-impact-1g', era: '1G', title: '旧体验影响' }]);
  assert.deepEqual(state.lanMemory.completedExperienceNodes, ['EXPERIENCE_1G_CALL']);
  assert.notEqual(manager.state.eras['1G'].nodes.find(node => node.key === 'archive').status, 'COMPLETED', '迁移不会伪造封存完成');
});
