/* 《通信简史》CommsArchive 事件依赖图核心。
 * 独立于当前 commsArchive 状态存档；可供后续澜存档接入，也可在 Node 中离线测试。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CommsArchiveEvents = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ERA_ORDER = ['1G', '2G', '3G', '4G', '5G', '6G'];
  const DEFAULT_EVENT_KEY = 'commsArchive.events.v1';

  class ArchiveEventError extends Error {
    constructor(code, message, details = {}) {
      super(message);
      this.name = 'ArchiveEventError';
      this.code = code;
      this.details = details;
    }
  }

  class EventDependency {
    constructor(eventId, type = 'hard') {
      if (typeof eventId !== 'string' || !eventId.trim()) throw new TypeError('依赖事件必须具有非空 ID。');
      if (!['hard', 'soft', 'derived'].includes(type)) throw new TypeError(`未知依赖类型：${type}`);
      this.eventId = eventId;
      this.type = type;
    }
  }
  class HardDependency extends EventDependency { constructor(eventId) { super(eventId, 'hard'); } }
  class SoftDependency extends EventDependency { constructor(eventId) { super(eventId, 'soft'); } }
  class DerivedDependency extends EventDependency {
    constructor(eventId, derive, deriveKey = eventId) {
      super(eventId, 'derived');
      if (typeof derive !== 'function') throw new TypeError('DerivedDependency 需要恢复函数。');
      this.derive = derive;
      this.deriveKey = deriveKey;
    }
  }

  class EraEvent {
    constructor({ id, era, type, version = 1, sequence = 0, timestamp = '', payload = {}, dependencies = [] } = {}) {
      if (!id || typeof id !== 'string') throw new TypeError('EraEvent.id 必须是字符串。');
      if (!ERA_ORDER.includes(era)) throw new TypeError(`EraEvent.era 无效：${era}`);
      if (!type || typeof type !== 'string') throw new TypeError('EraEvent.type 必须是字符串。');
      if (!Number.isInteger(version) || version < 1) throw new TypeError('EraEvent.version 必须是正整数。');
      if (!Array.isArray(dependencies)) throw new TypeError('EraEvent.dependencies 必须是数组。');
      this.id = id;
      this.era = era;
      this.type = type;
      this.version = version;
      this.sequence = Number.isFinite(sequence) ? sequence : 0;
      this.timestamp = timestamp || '';
      this.payload = clone(payload);
      this.dependencies = dependencies.map(normalizeDependency);
    }
  }

  class ArchiveEventGraph {
    constructor({ version = 2, migrations = {}, derivedResolvers = {}, eventKey = DEFAULT_EVENT_KEY } = {}) {
      if (!Number.isInteger(version) || version < 1) throw new TypeError('目标存档版本必须是正整数。');
      this.version = version;
      this.migrations = migrations;
      this.derivedResolvers = derivedResolvers;
      this.eventKey = eventKey;
    }

    normalizeEvent(input) {
      return input instanceof EraEvent ? input : new EraEvent(input);
    }

    migrateEvent(input) {
      let event = this.normalizeEvent(input);
      if (event.version > this.version) throw new ArchiveEventError('FUTURE_VERSION', `事件 ${event.id} 来自不支持的未来版本 ${event.version}。`, { eventId: event.id, version: event.version });
      while (event.version < this.version) {
        const migrate = this.migrations[event.version];
        if (typeof migrate !== 'function') throw new ArchiveEventError('MIGRATION_MISSING', `事件 ${event.id} 缺少 ${event.version} → ${event.version + 1} 迁移器。`, { eventId: event.id, version: event.version });
        try {
          const next = migrate(clone(event));
          if (!next || next.id !== event.id || next.version !== event.version + 1) throw new Error('迁移器必须保留事件 ID，并恰好提升一个版本。');
          event = this.normalizeEvent(next);
        } catch (error) {
          if (error instanceof ArchiveEventError) throw error;
          throw new ArchiveEventError('MIGRATION_FAILED', `事件 ${event.id} 迁移失败：${error.message}`, { eventId: event.id, version: event.version, cause: error });
        }
      }
      return event;
    }

    replay(inputEvents, { initialState = emptyState(), protectedDecisions = {} } = {}) {
      if (!Array.isArray(inputEvents)) throw new TypeError('重放事件必须是数组。');
      const eventMap = new Map();
      const duplicateIds = [];
      for (const input of inputEvents) {
        const event = this.migrateEvent(input);
        const prior = eventMap.get(event.id);
        if (!prior) eventMap.set(event.id, event);
        else if (fingerprint(prior) === fingerprint(event)) duplicateIds.push(event.id);
        else throw new ArchiveEventError('EVENT_ID_CONFLICT', `事件 ID ${event.id} 对应不同内容，拒绝覆盖。`, { eventId: event.id });
      }

      const state = clone(initialState);
      const warnings = [];
      const conflicts = [];
      const recoveredIds = [];
      const ordered = [];
      const visiting = new Set();
      const visited = new Set();

      const visit = (event) => {
        if (visited.has(event.id)) return;
        if (visiting.has(event.id)) throw new ArchiveEventError('DEPENDENCY_CYCLE', `检测到事件依赖循环：${[...visiting, event.id].join(' → ')}`, { eventId: event.id });
        visiting.add(event.id);
        for (const dependency of event.dependencies) {
          let target = eventMap.get(dependency.eventId);
          if (!target && dependency.type === 'derived') {
            const derive = dependency.derive || this.derivedResolvers[dependency.deriveKey];
            if (typeof derive === 'function') {
              const restored = derive({ event: clone(event), state: clone(state), events: [...eventMap.values()] });
              if (restored) {
                target = this.migrateEvent(restored);
                if (target.id !== dependency.eventId) throw new ArchiveEventError('DERIVED_ID_MISMATCH', `推导依赖要求 ${dependency.eventId}，恢复结果却是 ${target.id}。`);
                const prior = eventMap.get(target.id);
                if (prior && fingerprint(prior) !== fingerprint(target)) throw new ArchiveEventError('EVENT_ID_CONFLICT', `恢复事件 ${target.id} 与已有内容冲突。`);
                if (!prior) { eventMap.set(target.id, target); recoveredIds.push(target.id); }
                else target = prior;
              }
            }
          }
          if (!target) {
            if (dependency.type === 'hard' || dependency.type === 'derived') throw new ArchiveEventError('MISSING_HARD_DEPENDENCY', `事件 ${event.id} 缺少必需前置 ${dependency.eventId}。`, { eventId: event.id, dependencyId: dependency.eventId });
            warnings.push({ code: 'MISSING_SOFT_DEPENDENCY', eventId: event.id, dependencyId: dependency.eventId });
            continue;
          }
          visit(target);
        }
        visiting.delete(event.id);
        visited.add(event.id);
        ordered.push(event);
      };

      const roots = [...eventMap.values()].sort(compareEvents);
      for (const event of roots) visit(event);
      const appliedIds = [];
      for (const event of ordered) {
        const applied = reduceEvent(state, event, { protectedDecisions, conflicts, availableEvents: eventMap });
        if (applied) appliedIds.push(event.id);
      }
      return { state, orderedEvents: ordered, appliedIds, duplicateIds, recoveredIds, warnings, conflicts };
    }

    applyTransaction(storage, incomingEvents, { key = this.eventKey } = {}) {
      if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new TypeError('事务需要兼容 Storage 的存储对象。');
      const before = storage.getItem(key);
      let existing;
      try { existing = before ? JSON.parse(before) : []; }
      catch (error) { throw new ArchiveEventError('STORE_CORRUPT', `事件存档无法解析：${error.message}`); }
      if (!Array.isArray(existing)) throw new ArchiveEventError('STORE_CORRUPT', '事件存档根节点必须是数组。');
      const result = this.replay([...existing, ...incomingEvents]);
      const serialized = JSON.stringify(result.orderedEvents.map(serializeEvent));
      try {
        storage.setItem(key, serialized);
      } catch (error) {
        // Storage.setItem 对 localStorage 是原子写入；尝试恢复也兼容会先写后抛的适配器。
        try { if (before === null) storage.removeItem?.(key); else storage.setItem(key, before); } catch (_) { /* 保留最初提交失败的异常 */ }
        throw new ArchiveEventError('TRANSACTION_ROLLED_BACK', `事务写入失败，存档未提交：${error.message}`, { cause: error });
      }
      return result;
    }

    mergeOffline(localEvents, remoteEvents, { initialState = emptyState() } = {}) {
      const local = this.replay(localEvents, { initialState });
      const protectedDecisions = { ...local.state.decisions };
      return this.replay([...localEvents, ...remoteEvents], { initialState, protectedDecisions });
    }

    syncOffline(storage, remoteEvents, options = {}) {
      const key = options.key || this.eventKey;
      let localEvents = [];
      const raw = storage.getItem(key);
      if (raw) {
        try { localEvents = JSON.parse(raw); } catch (error) { throw new ArchiveEventError('STORE_CORRUPT', `本地事件存档无法解析：${error.message}`); }
      }
      if (!Array.isArray(localEvents)) throw new ArchiveEventError('STORE_CORRUPT', '本地事件存档根节点必须是数组。');
      const result = this.mergeOffline(localEvents, remoteEvents, options);
      try { storage.setItem(key, JSON.stringify(result.orderedEvents.map(serializeEvent))); }
      catch (error) { throw new ArchiveEventError('TRANSACTION_ROLLED_BACK', `离线同步提交失败：${error.message}`, { cause: error }); }
      return result;
    }
  }

  function reduceEvent(state, event, context) {
    const p = event.payload || {};
    switch (event.type) {
      case 'era.visited':
        if (!state.visited.includes(event.era)) state.visited.push(event.era);
        return true;
      case 'era.completed':
        if (!state.completed.includes(event.era)) state.completed.push(event.era);
        return true;
      case 'era.transition': {
        const from = p.from, to = p.to;
        if (!ERA_ORDER.includes(from) || !ERA_ORDER.includes(to) || ERA_ORDER.indexOf(to) !== ERA_ORDER.indexOf(from) + 1) {
          throw new ArchiveEventError('ERA_JUMP', `非法时代过渡：${from} → ${to}。`, { eventId: event.id });
        }
        if (!state.completed.includes(from)) throw new ArchiveEventError('ERA_NOT_COMPLETE', `时代 ${from} 尚未完成，不能沿主线过渡。`, { eventId: event.id });
        state.currentEra = to;
        state.transitions.push({ from, to, eventId: event.id });
        return true;
      }
      case 'task.started': {
        const taskId = requireString(p.taskId, 'taskId', event);
        const current = state.tasks[taskId];
        if (current?.status === 'completed') return false;
        state.tasks[taskId] = { status: 'in-progress', era: event.era, startedBy: event.id };
        return true;
      }
      case 'task.status': {
        if (!['not-started', 'in-progress', 'completed'].includes(p.status)) throw new ArchiveEventError('TASK_STATUS_INVALID', `任务状态非法：${p.status}`, { eventId: event.id });
        state.tasks[requireString(p.taskId, 'taskId', event)] = { status: p.status, era: event.era, changedBy: event.id };
        return true;
      }
      case 'task.completed': {
        const taskId = requireString(p.taskId, 'taskId', event);
        if (state.tasks[taskId]?.era !== event.era || state.tasks[taskId]?.status !== 'in-progress') {
          throw new ArchiveEventError('TASK_STATE_INVALID', `任务 ${taskId} 未处于本年代的进行中状态，不能完成。`, { eventId: event.id, taskId });
        }
        state.tasks[taskId] = { ...state.tasks[taskId], status: 'completed', completedBy: event.id };
        return true;
      }
      case 'evidence.recorded': {
        const source = context.availableEvents.get(p.sourceEventId);
        const dependencyDeclared = event.dependencies.some((dep) => dep.eventId === p.sourceEventId && dep.type !== 'soft');
        if (!source || source.type !== 'task.completed' || source.era !== event.era || source.payload.taskId !== p.sourceTaskId || !dependencyDeclared) {
          throw new ArchiveEventError('EVIDENCE_SOURCE_INVALID', `证据 ${p.evidenceId || event.id} 的来源任务、年代或硬依赖不匹配。`, { eventId: event.id });
        }
        if (!state.evidence.some((item) => item.evidenceId === p.evidenceId)) state.evidence.push({ evidenceId: p.evidenceId, era: event.era, taskId: p.sourceTaskId, sourceEventId: source.id });
        return true;
      }
      case 'decision.recorded': {
        const key = requireString(p.decisionKey, 'decisionKey', event);
        if (Object.prototype.hasOwnProperty.call(context.protectedDecisions, key)) {
          if (stableStringify(context.protectedDecisions[key]) !== stableStringify(p.value)) context.conflicts.push({ code: 'USER_DECISION_PROTECTED', decisionKey: key, kept: context.protectedDecisions[key], ignored: p.value, eventId: event.id });
          state.decisions[key] = clone(context.protectedDecisions[key]);
          return stableStringify(context.protectedDecisions[key]) === stableStringify(p.value);
        }
        if (Object.prototype.hasOwnProperty.call(state.decisions, key) && stableStringify(state.decisions[key]) !== stableStringify(p.value)) {
          context.conflicts.push({ code: 'USER_DECISION_CONFLICT', decisionKey: key, kept: state.decisions[key], ignored: p.value, eventId: event.id });
          return false;
        }
        state.decisions[key] = clone(p.value);
        return true;
      }
      default:
        throw new ArchiveEventError('EVENT_TYPE_UNKNOWN', `不支持的事件类型：${event.type}`, { eventId: event.id });
    }
  }

  function normalizeDependency(value) {
    if (value instanceof EventDependency) return value;
    if (!value || typeof value.eventId !== 'string') throw new TypeError('事件依赖格式无效。');
    if (value.type === 'derived') {
      const resolver = value.derive;
      if (typeof resolver !== 'function') return { eventId: value.eventId, type: 'derived', deriveKey: value.deriveKey || value.eventId };
      return new DerivedDependency(value.eventId, resolver, value.deriveKey || value.eventId);
    }
    return value.type === 'soft' ? new SoftDependency(value.eventId) : new HardDependency(value.eventId);
  }
  function requireString(value, field, event) {
    if (typeof value !== 'string' || !value) throw new ArchiveEventError('EVENT_PAYLOAD_INVALID', `${event.id} 缺少 ${field}。`, { eventId: event.id, field });
    return value;
  }
  function emptyState() { return { visited: [], completed: [], currentEra: '1G', transitions: [], tasks: {}, evidence: [], decisions: {} }; }
  function compareEvents(a, b) { return (a.sequence - b.sequence) || String(a.timestamp).localeCompare(String(b.timestamp)) || a.id.localeCompare(b.id); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  }
  function fingerprint(event) {
    return stableStringify({ id: event.id, era: event.era, type: event.type, version: event.version, sequence: event.sequence, timestamp: event.timestamp, payload: event.payload, dependencies: event.dependencies.map((dep) => ({ eventId: dep.eventId, type: dep.type, deriveKey: dep.deriveKey || null })) });
  }
  function serializeEvent(event) {
    return { id: event.id, era: event.era, type: event.type, version: event.version, sequence: event.sequence, timestamp: event.timestamp, payload: clone(event.payload), dependencies: event.dependencies.map((dep) => ({ eventId: dep.eventId, type: dep.type, deriveKey: dep.deriveKey || undefined })) };
  }

  return { ERA_ORDER, DEFAULT_EVENT_KEY, ArchiveEventError, EventDependency, HardDependency, SoftDependency, DerivedDependency, EraEvent, ArchiveEventGraph, emptyState, serializeEvent };
});
