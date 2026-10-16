'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProgression } = require('../assets/js/progression-manager.js');

const app = fs.readFileSync('app.js', 'utf8');
const eraIds = ['1G', '2G', '3G', '4G', '5G', '6G'];
const between = (source, start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source segment: ${start}`);
  return source.slice(from, to).trim();
};
const dataSource = between(app, 'const eras=[', "\neras.find(item=>item.id==='2G')") + '\n' + between(app, 'const hallDeepening={', '\nfunction exhibitThumbnail(');
const completionSource = [
  between(app, 'function chapterNodeBlockReason(', '\nfunction guidedNodeAccessReason('),
  between(app, 'function ensureEraInvestigationEvidence(', '\nfunction completeGuidedSceneFromExhibit('),
  between(app, 'function completeGuidedSceneFromExhibit(', '\nfunction experienceTask('),
  between(app, 'function guidedDiscoverExhibit(', '\nfunction guidedOpenFlow('),
  between(app, 'function persistTask()', '\nfunction pick(')
].join('\n');

function runtimeFor(era, nodeKey) {
  const prior = eraIds.slice(0, eraIds.indexOf(era));
  const exhibits = Object.fromEntries(eraIds.map(id => [id, []]));
  const tasks = { [era]: { selected: 0, step: 0 } };
  const state = { visited: [...prior, era], completed: [...prior], order: [...prior, era], clues: {}, logs: [], tasks, evidence: [] };
  const progression = createProgression(state, { exhibitsByEra: exhibits, requiredEvidenceByEra: {} });
  progression.state.currentEra = era;
  progression.state.currentNode = `${era.toLowerCase()}_${nodeKey}`;
  const nodes = progression.state.eras[era].nodes;
  const index = ['entry', 'scene', 'investigation', 'technology', 'archive'].indexOf(nodeKey);
  nodes.forEach((node, nodeIndex) => {
    node.status = nodeIndex < index ? 'COMPLETED' : nodeIndex === index ? 'ACTIVE' : 'LOCKED';
  });
  const exhibitProgress = {};
  progression.state.exhibitProgress = exhibitProgress;
  const events = [], notices = [];
  const ctx = vm.createContext({
    state, progression, eraIndex: eraIds.indexOf(era), route: 'chapter', selected: 0, secondSelected: null, taskStep: 0,
    eras: [], hallDeepening: {}, mediaAssets: Object.fromEntries(eraIds.map(id => [id, { photoSource: `source-${id}` }])),
    exhibitLinks: Object.fromEntries(eraIds.map(id => [id, { evidenceId: `evidence.${id.toLowerCase()}.investigation`, taskId: `task.${id.toLowerCase()}.investigation`, exhibitId: `exhibit.${id.toLowerCase()}.main`, flowId: `flow.${id.toLowerCase()}.main` }])),
    window: { InteractionDebugger: { record(...args) { events.push(args); } }, DemoManager: { isActive: () => false } },
    console, Date, Math, Object, Array, String, Number,
    save() { ctx.saveCount = (ctx.saveCount || 0) + 1; return true; },
    render() { ctx.renderCount = (ctx.renderCount || 0) + 1; },
    showExhibitDetails(...args) { ctx.openedExhibits ||= []; ctx.openedExhibits.push(args); },
    showInteractionNotice(message) { notices.push(message); },
    dispatchLanEvent(event, payload) { events.push([event, payload]); return true; },
    progressionBlock(result) { if (!result?.ok) { notices.push(result?.reason || 'blocked'); return true; } return false; },
    rejectProgress(action, target, reason) { notices.push(reason); return true; }
  });
  vm.runInContext(dataSource, ctx, { filename: 'app.js:chapter-data' });
  ctx.eras = vm.runInContext('eras', ctx);
  ctx.hallDeepening = vm.runInContext('hallDeepening', ctx);
  vm.runInContext(completionSource, ctx, { filename: 'app.js:chapter-completion' });
  return { state, progression, ctx, events, notices };
}

test('1G—6G查看代表展品后立即完成历史现场，保留在当前节点且可选展品不触发完成', () => {
  for (const era of eraIds) {
    const { progression, ctx } = runtimeFor(era, 'scene');
    const exhibits = ctx.hallDeepening[era].exhibits;
    const primary = exhibits[0], optional = exhibits[1];
    assert.equal(progression.markDiscoverable(optional.id, era).ok, true);
    vm.runInContext(`guidedDiscoverExhibit('${era}','${optional.id}')`, ctx);
    assert.equal(ctx.openedExhibits.at(-1)[2], optional.id, `${era}: optional exhibit detail opens`);
    assert.equal(progression.state.eras[era].nodes.find(node => node.key === 'scene').status, 'ACTIVE', `${era}: optional exhibit cannot satisfy the scene`);

    assert.equal(progression.markDiscoverable(primary.id, era).ok, true);
    vm.runInContext(`guidedDiscoverExhibit('${era}','${primary.id}')`, ctx);
    assert.equal(ctx.openedExhibits.at(-1)[2], primary.id, `${era}: required exhibit detail opens`);
    assert.equal(progression.state.eras[era].nodes.find(node => node.key === 'scene').status, 'COMPLETED');
    assert.equal(progression.currentNode().key, 'scene', `${era}: completion does not navigate automatically`);
    assert.equal(vm.runInContext(`chapterNodeBlockReason('${era}','scene')`, ctx), '', `${era}: next-step gate is immediately clear`);
    assert.ok(ctx.renderCount > 0, `${era}: scene completion refreshes immediately`);
  }
});

test('旧存档已有必看展品记录时，进入章节渲染会安全补齐现场节点状态', () => {
  for (const era of eraIds) {
    const { progression, ctx } = runtimeFor(era, 'scene');
    const primary = ctx.hallDeepening[era].exhibits[0];
    progression.state.exhibitProgress[primary.id] = { exhibitId: primary.id, eraId: era, status: 'FOUND' };
    assert.equal(vm.runInContext('reconcileGuidedNodeCompletion()', ctx), true, `${era}: existing completion is reconciled`);
    assert.equal(progression.currentNode().key, 'scene');
    assert.equal(progression.state.eras[era].nodes.find(node => node.key === 'scene').status, 'COMPLETED');
  }
});

test('1G—6G揭晓调查结果后立即完成建设调查、保存唯一证据并停留等待手动导航', () => {
  for (const era of eraIds) {
    const { state, progression, ctx, events } = runtimeFor(era, 'investigation');
    ctx.selected = 0;
    ctx.taskStep = 0;
    assert.equal(vm.runInContext('setTaskStep(1)', ctx), true, `${era}: result reveal succeeds`);
    assert.equal(progression.state.eras[era].nodes.find(node => node.key === 'investigation').status, 'COMPLETED');
    assert.equal(progression.currentNode().key, 'investigation', `${era}: user remains on the investigation result`);
    assert.equal(state.evidence.filter(item => item.evidenceId === `evidence.${era.toLowerCase()}.investigation`).length, 1);
    assert.ok(events.some(([event, payload]) => event === 'TASK_REVEAL' && payload.era === era));
    assert.equal(vm.runInContext(`chapterNodeBlockReason('${era}','investigation')`, ctx), '');

    assert.equal(vm.runInContext(`completeGuidedInvestigationFromResult('${era}')`, ctx), true, `${era}: repeat reconciliation is safe`);
    assert.equal(state.evidence.filter(item => item.evidenceId === `evidence.${era.toLowerCase()}.investigation`).length, 1, `${era}: evidence is not duplicated`);
  }
});

test('场景与调查节点不再要求额外的确认按钮', () => {
  assert.doesNotMatch(app, /onclick="advanceGuided(?:Scene)?\(/);
  assert.doesNotMatch(app, /onclick="(?:completeGuidedScene|recordGuidedInvestigation)\(/);
  assert.match(app, /历史现场观察已完成/);
  assert.match(app, /建设调查已完成/);
});
