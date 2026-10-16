'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createProgression } = require('../assets/js/progression-manager.js');

const appSource = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

test('正式章节没有用户体验区与时代影响提交入口', () => {
  assert.match(html, /COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED=true/);
  assert.doesNotMatch(html, /<script[^>]+src="assets\/js\/(?:experience-story|experience-interactions|experience-1g-phone)/);
  const guided = appSource.slice(appSource.indexOf('function guidedChapter('), appSource.indexOf('\nfunction guidedDiscoverExhibit('));
  assert.doesNotMatch(guided, /renderExperienceStory|recordGuidedExperience|体验者记录|进入用户体验区|记录时代影响/);
  assert.match(guided, /technologyLabActions/);
  assert.match(guided, /archiveExitContent/);
});

test('旧存档中的体验影响日志和体验进度保留；迁移后不存在体验节点', () => {
  const oldKeys = ['entry', 'scene', 'investigation', 'technology', 'life', 'archive'];
  const state = {
    visited: ['1G'], completed: [], clues: {}, logs: [{ id: 'era-impact-1g', era: '1G', title: '已记录的时代影响' }],
    evidence: [{ evidenceId: 'evidence.1g.investigation', eraId: '1G' }],
    tasks: { '1G': { selected: 0, step: 1, understandingCompleted: true } },
    lanMemory: { completedExperienceNodes: ['EXPERIENCE_1G_CALL'] },
    progression: {
      version: 1, currentEra: '1G', currentNode: '1g_life',
      dialogueProgress: { completedIds: ['lan.1g.chapter-entry'], activeId: null },
      eras: { '1G': { nodes: oldKeys.map(key => ({ key, eraId: '1G', nodeId: `1g_${key}`, status: key === 'life' ? 'ACTIVE' : ['entry', 'scene', 'investigation', 'technology'].includes(key) ? 'COMPLETED' : 'LOCKED' })) } },
      exhibitProgress: { phone: { exhibitId: 'phone', eraId: '1G', status: 'FOUND' } },
      evidence: ['evidence.1g.investigation'], taskProgress: {}
    }
  };
  const manager = createProgression(state, { save: () => true });
  assert.deepEqual(manager.state.eras['1G'].nodes.map(node => node.key), ['entry', 'scene', 'investigation', 'technology', 'archive']);
  assert.equal(manager.currentNode().key, 'archive');
  assert.equal(manager.state.eras['1G'].nodes.find(node => node.key === 'archive').status, 'ACTIVE');
  assert.equal(state.logs[0].title, '已记录的时代影响');
  assert.deepEqual(state.lanMemory.completedExperienceNodes, ['EXPERIENCE_1G_CALL']);
  const afterFirstMigration=JSON.stringify(state.progression),repairCount=manager.state.repairLog.length;
  const restoredAgain=createProgression(state,{save:()=>true});
  assert.equal(restoredAgain.currentNode().key,'archive');
  assert.equal(JSON.stringify(state.progression),afterFirstMigration,'重复恢复不会反复改写五节点进度');
  assert.equal(restoredAgain.state.repairLog.length,repairCount,'重复恢复不会重复追加迁移记录');
});

test('时代档案仍保留对通信生活影响的总结资料', () => {
  assert.match(appSource, /通信对日常生活的影响/);
  assert.match(appSource, /source\.experience\|\|e\.record/);
  assert.match(appSource, /e\.moment/);
});
