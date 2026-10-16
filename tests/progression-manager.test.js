'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createProgression, nodeId } = require('../assets/js/progression-manager.js');

function fresh(extra = {}) {
  const state = { visited: [], completed: [], clues: {}, logs: [], tasks: {}, evidence: [], ...extra };
  const manager = createProgression(state, { exhibitsByEra: { '1G': ['phone-1g'], '2G': ['phone-2g'] } });
  return { state, manager };
}
function reachScene(manager) {
  assert.equal(manager.enterEra('1G').ok, true);
  assert.equal(manager.completeDialogue('lan.1g.chapter-entry').ok, true);
  assert.equal(manager.currentNode().key, 'scene');
}
function reachInvestigation(manager) {
  reachScene(manager);
  assert.equal(manager.markDiscoverable('phone-1g', '1G').ok, true);
  assert.equal(manager.discoverExhibit('phone-1g', '1G').ok, true);
  assert.equal(manager.completeScene().ok, true);
  assert.equal(manager.currentNode().key, 'investigation');
}

test('1. 锁定展品不能被直接点击，违规有日志', () => {
  const { manager } = fresh(); manager.enterEra('1G');
  const result = manager.discoverExhibit('phone-1g', '1G');
  assert.equal(result.ok, false);
  assert.equal(manager.state.illegalProgressAttempts.at(-1).userAction, 'open-exhibit');
});

test('2. 未读完澜的序章不能进入探索区；引导结束后三个探索节点开放，档案仍受完成条件控制', () => {
  const { manager } = fresh(); manager.enterEra('1G');
  assert.equal(manager.protectsCurrentDialogue, true);
  assert.equal(manager.requestNode('1G', nodeId('1G', 'scene')).ok, false);
  assert.equal(manager.currentNode().key, 'entry');
  assert.equal(manager.completeDialogue('lan.1g.chapter-entry').ok, true);
  assert.equal(manager.protectsCurrentDialogue, false);
  for (const key of ['scene', 'investigation', 'technology']) assert.equal(manager.requestNode('1G', nodeId('1G', key)).ok, true);
  assert.equal(manager.requestNode('1G', nodeId('1G', 'archive')).ok, false, '时代档案出口仍需满足既有必做条件');
});

test('3. 部分损坏的节点存档会重建结构并保留已完成时代记录', () => {
  const state = { visited: ['1G'], completed: ['1G'], clues: {}, logs: [], tasks: {}, evidence: [], progression: { version: 1, eras: { '1G': { nodes: [{ nodeId: 'bad', status: 'BROKEN' }] } }, currentEra: '6G', currentNode: '6g_archive' } };
  const manager = createProgression(state, { exhibitsByEra: { '1G': ['phone-1g'] } });
  assert.equal(state.completed.includes('1G'), true);
  assert.equal(manager.state.eras['1G'].nodes.length, 5);
  assert.ok(manager.state.repairLog.length > 0);
  assert.equal(manager.state.currentEra, '2G');
});

test('4. 伪造的节点完成状态会回退，已完成正文不删除', () => {
  const { state, manager } = fresh();
  const rec = manager.state.eras['1G'];
  rec.nodes.forEach((node) => { node.status = 'COMPLETED'; });
  manager.state.currentEra = '1G'; manager.state.currentNode = nodeId('1G', 'archive');
  const repair = manager.validateAndRepair();
  assert.ok(repair.repairs.length > 0);
  assert.notEqual(rec.nodes[2].status, 'COMPLETED');
  assert.equal(state.completed.length, 0);
});

test('5. 展品、调查和技术可并行探索；不依赖体验节点即可进入归档', () => {
  const { state, manager } = fresh(); reachScene(manager);
  manager.markDiscoverable('phone-1g', '1G'); manager.discoverExhibit('phone-1g', '1G');
  state.tasks['1G'] = { selected: 1, step: 1 };
  assert.equal(manager.requestNode('1G', nodeId('1G', 'investigation')).ok, true);
  assert.equal(manager.completeInvestigation().ok, true);
  state.evidence.push({ evidenceId: 'evidence.1g.investigation', eraId: '1G' });
  manager.state.evidence = ['evidence.1g.investigation'];
  assert.equal(manager.requestNode('1G', nodeId('1G', 'technology')).ok, true);
  state.tasks['1G'].understandingCompleted = true;
  assert.equal(manager.completeTechnology().ok, true);
  assert.equal(manager.state.exhibitProgress['phone-1g'].status, 'ANALYZED');
  assert.equal(manager.completeArchive().ok, false, '历史现场仍未完成时不能归档');
  assert.equal(manager.requestNode('1G', nodeId('1G', 'scene')).ok, true);
  assert.equal(manager.completeScene().ok, true);
  assert.equal(manager.requestNode('1G', nodeId('1G', 'archive')).ok, true);
  assert.equal(manager.currentNode().key, 'archive');
  assert.equal(manager.completeArchive().ok, true);
});

test('6. 刷新恢复使用存档中的当前合法节点', () => {
  const { state, manager } = fresh(); reachInvestigation(manager);
  state.tasks['1G'] = { selected: 0, step: 1 };
  manager.completeInvestigation();
  manager.requestNode('1G', nodeId('1G', 'technology'));
  const restored = createProgression(state, { exhibitsByEra: { '1G': ['phone-1g'] } });
  assert.equal(restored.currentEra(), '1G');
  assert.equal(restored.currentNode().key, 'technology');
});

test('7. 未归档前不能跨时代跳转，归档后下一时代才可进入', () => {
  const { state, manager } = fresh();
  assert.equal(manager.enterEra('2G').ok, false);
  assert.equal(manager.enterEra('1G').ok, true);
  assert.equal(manager.enterEra('2G').ok, false);
  reachScene(manager);
  manager.markDiscoverable('phone-1g', '1G'); manager.discoverExhibit('phone-1g', '1G'); manager.completeScene();
  state.tasks['1G'] = { selected: 1, step: 1 };
  manager.completeInvestigation(); state.tasks['1G'].understandingCompleted = true;
  state.evidence.push({ evidenceId: 'evidence.1g.investigation', eraId: '1G' });
  manager.state.evidence = ['evidence.1g.investigation'];
  manager.completeTechnology();
  state.tasks['1G'].selected = 1;
  assert.equal(manager.completeArchive().ok, true);
  state.completed.push('1G');
  assert.equal(manager.enterEra('2G').ok, true);
});

test('8. 即使导入的后代完成标记存在，也不能越过缺失的中间时代', () => {
  const { manager } = fresh({ completed: ['1G', '2G', '3G', '5G'] });
  assert.equal(manager.canEnterEra('6G').ok, false);
  assert.match(manager.canEnterEra('6G').reason, /4G/);
});

test('9. 后代时代的旧完成记录保留，但当前恢复位置回到缺失的4G', () => {
  const { state, manager } = fresh({ completed: ['1G', '2G', '3G', '5G'] });
  manager.state.currentEra = '5G'; manager.state.currentNode = nodeId('5G', 'archive');
  manager.state.eras['5G'].nodes.forEach((node) => { node.status = 'COMPLETED'; });
  const result = manager.validateAndRepair();
  assert.equal(state.completed.includes('5G'), true);
  assert.equal(manager.currentEra(), '4G');
  assert.ok(result.repairs.length > 0);
});
