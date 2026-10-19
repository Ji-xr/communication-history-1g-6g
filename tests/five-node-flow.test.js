'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createProgression, nodeId } = require('../assets/js/progression-manager.js');

const ERAS = ['1G', '2G', '3G', '4G', '5G', '6G'];
const REQUIRED_6G = ['evidence_6g_delay', 'evidence_6g_sensor', 'evidence_6g_ai', 'evidence_6g_twin'];

function beginEra(era, { require6GEvidence = true } = {}) {
  const prior = ERAS.slice(0, ERAS.indexOf(era));
  const state = {
    visited: [], completed: prior, order: [], clues: {}, logs: [],
    tasks: { [era]: { selected: 1, step: 1, understandingCompleted: true } },
    evidence: []
  };
  const manager = createProgression(state, {
    exhibitsByEra: { [era]: [`exhibit-${era}`] },
    requiredEvidenceByEra: require6GEvidence ? { '6G': REQUIRED_6G } : {}
  });
  assert.equal(manager.enterEra(era).ok, true);
  assert.equal(manager.completeDialogue(`lan.${era.toLowerCase()}.chapter-entry`).ok, true);
  assert.equal(manager.requestNode(era, nodeId(era, 'scene')).ok, true);
  assert.equal(manager.markDiscoverable(`exhibit-${era}`, era).ok, true);
  assert.equal(manager.discoverExhibit(`exhibit-${era}`, era).ok, true);
  assert.equal(manager.completeScene().ok, true);
  assert.equal(manager.currentNode().key, 'investigation');
  if (era === '6G') {
    state.evidence.push(...REQUIRED_6G.map(evidenceId => ({ evidenceId, eraId: '6G' })));
    manager.state.evidence.push(...REQUIRED_6G);
  }
  assert.equal(manager.completeInvestigation().ok, true);
  state.evidence.push({ evidenceId: `evidence.${era.toLowerCase()}.investigation`, eraId: era });
  manager.state.evidence.push(`evidence.${era.toLowerCase()}.investigation`);
  if (era !== '6G') {
    state.evidence.push({ evidenceId: 'historical-evidence', eraId: era });
    manager.state.evidence.push('historical-evidence');
  }
  return { state, manager };
}

test('六个时代都只含五个正式节点，技术实验完成后等待用户手动进入归档', () => {
  for (const era of ERAS) {
    const { state, manager } = beginEra(era);
    const record = manager.state.eras[era];
    assert.deepEqual(record.nodes.map(node => node.key), ['entry', 'scene', 'investigation', 'technology', 'archive']);
    assert.equal(record.nodes.some(node => node.key === 'life'), false);
    assert.equal(manager.currentNode().key, 'technology');
    const result = manager.completeTechnology({ holdCurrent: true });
    assert.equal(result.ok, true, `${era}技术实验应可完成：${result.reason || ''}`);
    assert.equal(manager.currentNode().key, 'technology', `${era}仍停留在技术实验室，不能自动跳转`);
    assert.equal(manager.requestNode(era, nodeId(era, 'life')).ok, false);
    if (era === '6G') {
      const readiness = manager.getArchiveReadiness(era);
      assert.equal(readiness.ok, true, '6G研究检查应先于技术实验和档案出口完成');
      assert.deepEqual(readiness.missingEvidence, []);
    }
    assert.equal(manager.getArchiveReadiness(era).ok, true, `${era}已有调查、技术及必要证据`);
    assert.equal(manager.requestNode(era, nodeId(era, 'archive')).ok, true);
    assert.equal(manager.currentNode().key, 'archive');
    assert.equal(manager.completeArchive().ok, true);
    assert.ok(record.nodes.every(node => node.status === 'COMPLETED'));
    state.completed.push(era);
    if (era !== '6G') assert.equal(manager.canEnterEra(ERAS[ERAS.indexOf(era) + 1]).ok, true);
  }
});

test('缺少历史现场、建设调查或技术理解时仍不能归档', () => {
  const state = { visited: [], completed: [], clues: {}, logs: [], tasks: {}, evidence: [] };
  const manager = createProgression(state);
  manager.enterEra('1G');
  manager.completeDialogue('lan.1g.chapter-entry');
  assert.equal(manager.completeArchive().ok, false);
  assert.equal(manager.requestNode('1G', nodeId('1G', 'archive')).ok, false);
  assert.equal(state.completed.length, 0);
});

test('正式入口停止加载六代体验模拟，但源文件和旧日志字段仍存在', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED=true/);
  assert.doesNotMatch(html, /<script[^>]+src="assets\/js\/(?:experience-story|experience-interactions|experience-1g-phone|[56]g-archive-ui)/);
  for (const file of ['experience-story-1g.js', 'experience-story-2g.js', 'experience-story-4g.js', 'experience-story-5g.js', 'experience-story-6g.js', 'experience-interactions.js', 'experience-1g-phone.js']) {
    assert.ok(fs.existsSync(`assets/js/${file}`), `${file}保留以便未来恢复`);
  }
  const source = fs.readFileSync('assets/js/progression-manager.js', 'utf8');
  assert.match(source, /completedExperienceNodes|recordExperience/);
  assert.match(fs.readFileSync('app.js', 'utf8'), /source\.experience\|\|e\.record/);
});
