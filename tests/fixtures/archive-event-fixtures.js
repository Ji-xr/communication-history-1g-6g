'use strict';

const {
  EraEvent,
  EventDependency,
  HardDependency,
  SoftDependency,
  DerivedDependency,
} = require('../../assets/js/archive-event-graph.js');

function makeEvent(id, era, type, options = {}) {
  return new EraEvent({
    id,
    era,
    type,
    version: options.version ?? 2,
    sequence: options.sequence ?? 0,
    timestamp: options.timestamp ?? `2026-10-13T00:00:${String(options.sequence ?? 0).padStart(2, '0')}Z`,
    payload: options.payload ?? {},
    dependencies: options.dependencies ?? [],
  });
}

const eventFixtures = {
  visited1G: () => makeEvent('visit-1g', '1G', 'era.visited', { sequence: 1 }),
  taskStarted: (id = 'task-start-1g') => makeEvent(id, '1G', 'task.started', { sequence: 2, payload: { taskId: 'coverage-1g' } }),
  taskCompleted: (id = 'task-done-1g', dependencies = [new HardDependency('task-start-1g')]) => makeEvent(id, '1G', 'task.completed', { sequence: 3, payload: { taskId: 'coverage-1g' }, dependencies }),
  evidence: (id = 'evidence-1g', sourceEventId = 'task-done-1g', dependencies = [new HardDependency(sourceEventId)]) => makeEvent(id, '1G', 'evidence.recorded', { sequence: 4, payload: { evidenceId: '1G-E-001', sourceTaskId: 'coverage-1g', sourceEventId }, dependencies }),
  decision: (id, value, sequence = 5) => makeEvent(id, '1G', 'decision.recorded', { sequence, payload: { decisionKey: 'preferred-route', value } }),
  dependencyClasses: () => ({
    generic: new EventDependency('generic-parent'),
    hard: new HardDependency('hard-parent'),
    soft: new SoftDependency('soft-parent'),
    derived: new DerivedDependency('derived-parent', () => makeEvent('derived-parent', '1G', 'task.started', { sequence: 1, payload: { taskId: 'coverage-1g' } }), 'restore-task-start'),
  }),
};

module.exports = { makeEvent, eventFixtures };
