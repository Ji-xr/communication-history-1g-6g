'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createProgression, nodeId } = require('../assets/js/progression-manager.js');

function fresh() {
  const state = { visited: [], completed: [], clues: {}, logs: [], tasks: {}, evidence: [] };
  const manager = createProgression(state);
  manager.enterEra('1G');
  manager.completeDialogue('lan.1g.chapter-entry');
  return { state, manager };
}

test('完成建设调查后直接进入技术实验室，即使历史现场仍可探索', () => {
  const { state, manager } = fresh();
  assert.equal(manager.requestNode('1G', nodeId('1G', 'investigation')).ok, true);
  manager.state.eras['1G'].nodes.find(node => node.key === 'technology').status = 'LOCKED';
  state.tasks['1G'] = { selected: 1, step: 1 };

  const result = manager.completeInvestigation();

  assert.equal(result.ok, true);
  assert.equal(manager.state.eras['1G'].nodes.find(node => node.key === 'investigation').status, 'COMPLETED');
  assert.equal(manager.state.eras['1G'].nodes.find(node => node.key === 'scene').status, 'AVAILABLE');
  assert.equal(manager.currentNode().key, 'technology');
  assert.equal(manager.state.eras['1G'].nodes.find(node => node.key === 'technology').status, 'ACTIVE');
});

test('序章完成后技术实验室可自由进入，不需要先完成建设调查', () => {
  const { manager } = fresh();
  const result = manager.requestNode('1G', nodeId('1G', 'technology'));
  assert.equal(result.ok, true);
  assert.equal(manager.currentNode().key, 'technology');
});

test('残留引导对白状态不会阻止调查完成后的技术节点切换', () => {
  const { state, manager } = fresh();
  manager.requestNode('1G', nodeId('1G', 'investigation'));
  state.tasks['1G'] = { selected: 0, step: 1 };
  manager.state.dialogueProgress.activeId = 'lan.1g.investigation-hint';

  const result = manager.completeInvestigation();

  assert.equal(result.ok, true);
  assert.equal(manager.currentNode().key, 'technology');
});

test('技术实验室位置刷新后恢复，未完成的调查不能伪造完成状态', () => {
  const { state, manager } = fresh();
  manager.requestNode('1G', nodeId('1G', 'investigation'));
  state.tasks['1G'] = { selected: 1, step: 1 };
  assert.equal(manager.completeInvestigation().ok, true);

  const restored = createProgression(state);
  assert.equal(restored.currentEra(), '1G');
  assert.equal(restored.currentNode().key, 'technology');

  const other = fresh();
  other.manager.requestNode('1G', nodeId('1G', 'investigation'));
  other.state.tasks['1G'] = { selected: 1, step: 0 };
  assert.equal(other.manager.completeInvestigation().ok, false);
  assert.notEqual(other.manager.state.eras['1G'].nodes.find(node => node.key === 'investigation').status, 'COMPLETED');
});
