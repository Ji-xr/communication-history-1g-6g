'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ArchiveEventGraph,
  ArchiveEventError,
  HardDependency,
  SoftDependency,
  DerivedDependency,
  serializeEvent,
} = require('../assets/js/archive-event-graph.js');
const { makeEvent, eventFixtures } = require('./fixtures/archive-event-fixtures.js');

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    dump(key) { return data.get(key); },
  };
}

function rejectsCode(fn, code) {
  assert.throws(fn, (error) => error instanceof ArchiveEventError && error.code === code);
}

test('基础依赖：建立并识别 EraEvent 与四种依赖夹具', () => {
  const deps = eventFixtures.dependencyClasses();
  assert.equal(eventFixtures.visited1G().era, '1G');
  assert.equal(deps.generic.type, 'hard');
  assert.equal(deps.hard.type, 'hard');
  assert.equal(deps.soft.type, 'soft');
  assert.equal(deps.derived.type, 'derived');
});

test('01 乱序重放：按硬依赖顺序应用事件，不产生提前完成状态', () => {
  const graph = new ArchiveEventGraph();
  const start = eventFixtures.taskStarted();
  const done = eventFixtures.taskCompleted();
  const result = graph.replay([done, start]);
  assert.deepEqual(result.appliedIds, ['task-start-1g', 'task-done-1g']);
  assert.equal(result.state.tasks['coverage-1g'].status, 'completed');
});

test('02 缺失硬前置：拒绝重放不完整事件', () => {
  rejectsCode(() => new ArchiveEventGraph().replay([eventFixtures.taskCompleted()]), 'MISSING_HARD_DEPENDENCY');
});

test('03 缺失软前置：允许重放并记录提示', () => {
  const event = makeEvent('soft-child', '1G', 'era.visited', { dependencies: [new SoftDependency('optional-parent')] });
  const result = new ArchiveEventGraph().replay([event]);
  assert.deepEqual(result.state.visited, ['1G']);
  assert.equal(result.warnings[0].code, 'MISSING_SOFT_DEPENDENCY');
});

test('04 可推导事件恢复：恢复缺失任务开始事件后再完成任务', () => {
  const start = eventFixtures.taskStarted('restored-start');
  const done = eventFixtures.taskCompleted('restored-done', [new DerivedDependency('restored-start', () => start, 'restore-start')]);
  const result = new ArchiveEventGraph().replay([done]);
  assert.deepEqual(result.recoveredIds, ['restored-start']);
  assert.equal(result.state.tasks['coverage-1g'].status, 'completed');
});

test('05 重复事件：幂等去重，不重复执行 reducer', () => {
  const event = eventFixtures.visited1G();
  const result = new ArchiveEventGraph().replay([event, event]);
  assert.deepEqual(result.appliedIds, [event.id]);
  assert.deepEqual(result.duplicateIds, [event.id]);
  assert.deepEqual(result.state.visited, ['1G']);
});

test('07 跨版本迁移成功：逐版本迁移并保留事件标识', () => {
  const graph = new ArchiveEventGraph({ version: 2, migrations: {
    1: (event) => ({ ...event, version: 2, payload: { ...event.payload, migrated: true } }),
  } });
  const legacy = makeEvent('legacy-visit', '1G', 'era.visited', { version: 1 });
  const result = graph.replay([legacy]);
  assert.equal(result.orderedEvents[0].version, 2);
  assert.equal(result.orderedEvents[0].payload.migrated, true);
});

test('08 跨版本迁移失败：拒绝损坏的迁移结果', () => {
  const graph = new ArchiveEventGraph({ version: 2, migrations: { 1: () => { throw new Error('fixture migration failure'); } } });
  const legacyEvent = makeEvent('bad-legacy', '1G', 'era.visited', { version: 1 });
  rejectsCode(() => graph.replay([legacyEvent]), 'MIGRATION_FAILED');
  rejectsCode(() => graph.replay([makeEvent('future-event', '1G', 'era.visited', { version: 3 })]), 'FUTURE_VERSION');
  const legacyRaw = JSON.stringify([serializeEvent(legacyEvent)]);
  const storage = memoryStorage({ 'commsArchive.events.v1': legacyRaw, commsArchive: '{"schema":"comms-archive-v1"}' });
  rejectsCode(() => graph.applyTransaction(storage, []), 'MIGRATION_FAILED');
  assert.equal(storage.dump('commsArchive.events.v1'), legacyRaw);
  assert.equal(storage.dump('commsArchive'), '{"schema":"comms-archive-v1"}');
});

test('06 相同 ID 不同内容：报告冲突，不覆盖已存在事件', () => {
  const one = eventFixtures.decision('same-id', 'left');
  const two = eventFixtures.decision('same-id', 'right');
  rejectsCode(() => new ArchiveEventGraph().replay([one, two]), 'EVENT_ID_CONFLICT');
});

test('13 用户决定保护：离线合并保留本地决定并记录冲突', () => {
  const local = eventFixtures.decision('local-choice', 'visit-radio-room', 1);
  const remote = eventFixtures.decision('remote-choice', 'visit-network-room', 2);
  const result = new ArchiveEventGraph().mergeOffline([local], [remote]);
  assert.equal(result.state.decisions['preferred-route'], 'visit-radio-room');
  assert.equal(result.conflicts[0].code, 'USER_DECISION_PROTECTED');
});

test('09 依赖循环：拒绝循环图', () => {
  const a = makeEvent('cycle-a', '1G', 'era.visited', { dependencies: [new HardDependency('cycle-b')] });
  const b = makeEvent('cycle-b', '1G', 'era.visited', { dependencies: [new HardDependency('cycle-a')] });
  rejectsCode(() => new ArchiveEventGraph().replay([a, b]), 'DEPENDENCY_CYCLE');
});

test('10 时代跳跃：拒绝跨过未完成时代的主线跃迁', () => {
  const jump = makeEvent('jump-1g-3g', '3G', 'era.transition', { payload: { from: '1G', to: '3G' } });
  rejectsCode(() => new ArchiveEventGraph().replay([jump]), 'ERA_JUMP');
});

test('11 任务状态异常：未开始任务不能直接标记完成', () => {
  const done = makeEvent('orphan-task-done', '1G', 'task.completed', { payload: { taskId: 'coverage-1g' } });
  rejectsCode(() => new ArchiveEventGraph().replay([done]), 'TASK_STATE_INVALID');
  const invalid = makeEvent('invalid-task-status', '1G', 'task.status', { payload: { taskId: 'coverage-1g', status: 'won' } });
  rejectsCode(() => new ArchiveEventGraph().replay([invalid]), 'TASK_STATUS_INVALID');
});

test('12 证据来源异常：任务完成事件缺少声明依赖时不发放证据', () => {
  const start = eventFixtures.taskStarted();
  const done = eventFixtures.taskCompleted();
  const evidence = eventFixtures.evidence('bad-evidence', done.id, []);
  rejectsCode(() => new ArchiveEventGraph().replay([evidence, done, start]), 'EVIDENCE_SOURCE_INVALID');
});

test('14 事务失败回滚：写入失败保留事件与旧版页面存档', () => {
  const beforeEvents = JSON.stringify([serializeEvent(eventFixtures.visited1G())]);
  const legacyArchive = '{"schema":"comms-archive-v1","progress":{}}';
  const base = memoryStorage({ 'commsArchive.events.v1': beforeEvents, commsArchive: legacyArchive });
  const failingStorage = {
    getItem: base.getItem,
    removeItem: base.removeItem,
    setItem(key, value) {
      if (key === 'commsArchive.events.v1') throw new Error('quota fixture');
      base.setItem(key, value);
    },
  };
  rejectsCode(() => new ArchiveEventGraph().applyTransaction(failingStorage, [makeEvent('next', '2G', 'era.visited')]), 'TRANSACTION_ROLLED_BACK');
  assert.equal(base.dump('commsArchive.events.v1'), beforeEvents);
  assert.equal(base.dump('commsArchive'), legacyArchive);
});

test('15 完整离线同步流程：合并两端事件、保护决定并保留旧存档', () => {
  const legacyArchive = '{"schema":"comms-archive-v1","progress":{"1G":true}}';
  const local = [eventFixtures.decision('device-choice', 'keep-local', 1), eventFixtures.visited1G()];
  const remoteStart = makeEvent('remote-task-start', '2G', 'task.started', { sequence: 3, payload: { taskId: 'sms-2g' } });
  const remoteDone = makeEvent('remote-task-done', '2G', 'task.completed', { sequence: 4, payload: { taskId: 'sms-2g' }, dependencies: [new HardDependency(remoteStart.id)] });
  const conflictingDecision = makeEvent('server-choice', '1G', 'decision.recorded', { sequence: 5, payload: { decisionKey: 'preferred-route', value: 'server-alternative' } });
  const storage = memoryStorage({ 'commsArchive.events.v1': JSON.stringify(local.map(serializeEvent)), commsArchive: legacyArchive });
  const result = new ArchiveEventGraph().syncOffline(storage, [remoteDone, conflictingDecision, remoteStart]);
  const saved = JSON.parse(storage.dump('commsArchive.events.v1'));
  const replayed = new ArchiveEventGraph().replay(saved);
  assert.equal(result.state.tasks['sms-2g'].status, 'completed');
  assert.equal(replayed.state.decisions['preferred-route'], 'keep-local');
  assert.ok(saved.some((event) => event.id === 'device-choice'));
  assert.ok(saved.some((event) => event.id === 'remote-task-done'));
  assert.equal(storage.dump('commsArchive'), legacyArchive);
});
