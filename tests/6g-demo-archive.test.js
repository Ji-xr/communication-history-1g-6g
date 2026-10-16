const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/6g-archive-ui.js', 'utf8');

test('演示模式的6G s0-s3线索标记可安全封存并写入调查日志', () => {
  const evidenceIds = ['delay', 'sensor', 'ai', 'twin'];
  const experienceNodes = ['city', 'environment', 'ai', 'merge'].map(trigger => ({ trigger }));
  const memory = {
    completedTasks: ['task.6g.investigation'],
    completedExperienceNodes: experienceNodes.map(node => node.trigger),
    eraArchives: [],
    eraProgress: { '6G': { evidenceProgress: { collectedIds: evidenceIds } } }
  };
  const state = {
    tasks: { '6G': { completed: true } },
    clues: { '6G': [0, 's0', 's1', 's2', 's3'] },
    logs: []
  };
  const era = {
    id: '6G',
    opts: [['检查通信数据'], ['检查环境感知'], ['检查人工智能分析']],
    core: '6G仍处于研究发展阶段。'
  };
  const root = {
    endPage() { return ''; },
    eraArchiveCards() { return ''; },
    completeEra() { return true; },
    EraArchive6G: { id: 'archive_6g', evidenceIds, title: '消失的数字世界', keywords: [], evidence: [] },
    ExperienceStory6G: { nodes: experienceNodes },
    CommsArchiveLan: {
      get LanMemory() { return memory; },
      getExperienceStory() { return { nodes: experienceNodes }; },
      completeEraArchive6G() {
        memory.eraArchives.push({ archiveId: 'archive_6g', completed: true });
        return true;
      }
    },
    alert(message) { throw new Error(message); }
  };
  const context = vm.createContext({ window: root, state, eras: [era], save() {}, render() {}, Date, Set, String, Number, Array, Object });
  vm.runInContext(source, context);

  assert.equal(root.complete6GArchive(), true);
  assert.equal(state.tasks['6G'].archiveCompleted, true);
  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0].direction, '检查通信数据、检查环境感知、检查人工智能分析');
});
