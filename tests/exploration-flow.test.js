'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createProgression, nodeId } = require('../assets/js/progression-manager.js');

function fresh(state = {}) {
  const appState = { visited: [], completed: [], clues: {}, logs: [], tasks: {}, evidence: [], ...state };
  return { state: appState, manager: createProgression(appState, { exhibitsByEra: { '1G': ['phone-1g'], '6G': ['twin-6g'] }, requiredEvidenceByEra: { '6G': ['evidence_6g_delay', 'evidence_6g_sensor', 'evidence_6g_ai', 'evidence_6g_twin'] } }) };
}

test('同一时代的历史现场、调查和技术实验室可以任意顺序打开；归档需满足条件', () => {
  const { manager } = fresh();
  manager.enterEra('1G');
  manager.completeDialogue('lan.1g.chapter-entry');
  for (const key of ['technology', 'investigation', 'scene']) {
    const result = manager.requestNode('1G', nodeId('1G', key));
    assert.equal(result.ok, true, `${key} 应可在前一探索节点未完成时进入`);
  }
  assert.equal(manager.requestNode('1G', nodeId('1G', 'archive')).ok, false, '必做节点尚未完成时归档不能进入');
});

test('页面提示明确说明本时代探索区域可自由选择，不暗示固定顺序', () => {
  const app = fs.readFileSync('app.js', 'utf8');
  assert.match(app, /完成历史现场、建设调查与技术实验室后，即可整理并封存本时代档案/);
  const guided = app.slice(app.indexOf('function guidedChapter('), app.indexOf('\nfunction guidedDiscoverExhibit('));
  assert.doesNotMatch(guided, /用户体验区|进入用户体验区|记录时代影响，前往档案出口/);
  assert.doesNotMatch(app, /先发现这件展品，调查区域才会解锁/);
});

test('并行浏览仍保留时代档案闭环条件', () => {
  const { state, manager } = fresh();
  manager.enterEra('1G'); manager.completeDialogue('lan.1g.chapter-entry');
  state.tasks['1G'] = { selected: 1, step: 1, understandingCompleted: true };
  manager.markDiscoverable('phone-1g', '1G'); manager.discoverExhibit('phone-1g', '1G');
  manager.requestNode('1G', nodeId('1G', 'investigation')); manager.completeInvestigation();
  state.evidence.push({ evidenceId: 'evidence.1g.investigation', eraId: '1G' });
  manager.state.evidence = ['evidence.1g.investigation'];
  manager.requestNode('1G', nodeId('1G', 'technology')); manager.completeTechnology();
  assert.equal(manager.completeArchive().ok, false, '没有完成历史现场观察时不能封存');
  manager.requestNode('1G', nodeId('1G', 'scene')); manager.completeScene();
  manager.requestNode('1G', nodeId('1G', 'archive'));
  assert.equal(manager.completeArchive().ok, true);
});

test('6G研究方案是可选想法，跳过想法仍可完成节点和归档', () => {
  const { state, manager } = fresh({ completed: ['1G', '2G', '3G', '4G', '5G'] });
  state.tasks['6G'] = { selected: 0, step: 1, understandingCompleted: true };
  manager.enterEra('6G'); manager.completeDialogue('lan.6g.chapter-entry');
  manager.markDiscoverable('twin-6g', '6G'); manager.discoverExhibit('twin-6g', '6G');
  manager.requestNode('6G', nodeId('6G', 'scene')); manager.completeScene();
  const ids = ['evidence_6g_delay', 'evidence_6g_sensor', 'evidence_6g_ai', 'evidence_6g_twin'];
  state.evidence.push(...ids.map(evidenceId => ({ evidenceId, eraId: '6G' })), { evidenceId: 'evidence.6g.investigation', eraId: '6G' });
  manager.state.evidence = ids.concat('evidence.6g.investigation');
  manager.requestNode('6G', nodeId('6G', 'investigation')); manager.completeInvestigation();
  manager.requestNode('6G', nodeId('6G', 'technology'));
  assert.equal(manager.completeTechnology().ok, true);
  manager.requestNode('6G', nodeId('6G', 'archive'));
  assert.equal(manager.completeArchive().ok, true);
  assert.equal(state.tasks['6G'].designSubmitted, undefined);
});

test('澜对白结尾不再显示重复的系统式“已读完”提示', () => {
  const source = fs.readFileSync('assets/js/lan-system.js', 'utf8');
  assert.doesNotMatch(source, /这段对白已读完|继续探索时，我会在这里/);
});

test('6G呈现开放式未来猜想，不把研究方案或标准答案设为归档门槛', () => {
  const app = fs.readFileSync('app.js', 'utf8');
  const archive = fs.readFileSync('assets/js/6g-archive-ui.js', 'utf8');
  assert.match(app, /function futureReflectionTask\(\)/);
  assert.match(app, /这里没有标准答案，也不计分/);
  assert.match(app, /function completeResearchVisit\(\)/);
  assert.doesNotMatch(app, /请完成6G研究方案设计后再归档/);
  assert.doesNotMatch(archive, /!state\.tasks\['6G'\]\?\.designSubmitted/);
});

test('节点导航提供统一手动前进与返回，并真正换页回顶、同页更新保留阅读位置', () => {
  const app = fs.readFileSync('app.js', 'utf8');
  assert.match(app, /function openGuidedNode\(id\)/);
  assert.match(app, /function navigateChapterNext\(\)/);
  assert.match(app, /function navigateChapterPrevious\(\)/);
  assert.match(app, /onclick="navigateChapterNext\(\)"/);
  assert.match(app, /onclick="navigateChapterPrevious\(\)"/);
  assert.match(app, /data-prerequisite="\$\{blocked\?'blocked':'ready'\}"/);
  assert.match(app, /keepScroll=renderKey===lastRenderedRouteKey/);
  assert.match(app, /preservePagePosition\(explicitScrollRestore\?\?\(keepScroll\?previousScroll:0\)\)/);
});

test('时代归档总结按钮接入澜对白触发函数', () => {
  const app = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(app, /function archiveExitContent\(/);
  assert.match(app, /function playLanArchiveDialogue\(era,dialogueId,markSummary=false\)/);
  assert.match(app, /本时代总结|时代档案出口/);
  assert.doesNotMatch(html, /src="assets\/js\/[56]g-archive-ui\.js"/);
});
