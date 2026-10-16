'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadExperience() {
  const window = {};
  const context = { window, console, Map, Object, Array, String, Math };
  for (const file of ['assets/js/lan-dialogue-3g.js', 'assets/js/experience-story-5g.js', 'assets/js/experience-interactions.js']) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  return window;
}

test('3G与5G各个生活情境都有两步可操作过程及对应反馈', () => {
  const archive = loadExperience();
  for (const era of ['3G', '5G']) {
    const story = era === '3G' ? archive.ExperienceStory3G : archive.ExperienceStory5G;
    assert.ok(story.nodes.length >= 3, `${era} needs multiple experience nodes`);
    for (const node of story.nodes) {
      const scenario = archive.CommsArchiveExperience.get(era, node.trigger);
      assert.ok(scenario, `${era} scenario missing for ${node.trigger}`);
      assert.equal(scenario.actions.length, 2);
      assert.equal(scenario.responses.length, 2);
      const first = archive.CommsArchiveExperience.advance(era, node.trigger);
      assert.equal(first.ok, true);
      assert.equal(first.complete, false);
      assert.ok(first.action && first.feedback.length === 1);
      const second = archive.CommsArchiveExperience.advance(era, node.trigger);
      assert.equal(second.ok, true);
      assert.equal(second.complete, true);
      assert.ok(second.result.length > 0);
      assert.equal(archive.CommsArchiveExperience.advance(era, node.trigger).ok, false);
    }
    archive.CommsArchiveExperience.reset();
  }
});

test('体验动作完成后接入原有完成函数和本地日志，不另建剧情节点', () => {
  const app = fs.readFileSync('app.js', 'utf8');
  const fiveGUi = fs.readFileSync('assets/js/5g-archive-ui.js', 'utf8');
  assert.match(app, /function advanceExperienceInteraction\(era,nodeId\)/);
  assert.match(app, /complete3GExperience\(nodeId\)/);
  assert.match(app, /complete5GExperience\(nodeId\)/);
  assert.match(app, /type:'时代体验记录'/);
  assert.match(fiveGUi, /experienceInteractionMarkup\('5G',node,done\.has\(node\.trigger\)\)/);
});

test('归档对白可在一次性进入事件已消费后再次主动播放，并进入中央剧情模式', () => {
  class Element {
    constructor() { this.id = ''; this.dataset = {}; this.hidden = false; this.nodes = new Map(); this.classList = { toggle() {}, add() {}, remove() {} }; this.style = { setProperty() {} }; }
    setAttribute() {} append() {} addEventListener() {}
    querySelector(key) { if (!this.nodes.has(key)) this.nodes.set(key, new Element()); return this.nodes.get(key); }
    querySelectorAll() { return []; }
  }
  const body = new Element(), storage = new Map(), elements = new Map();
  body.append = element => { element.parentElement = body; elements.set(element.id, element); };
  const document = { body, getElementById: id => elements.get(id) || null, createElement: () => new Element(), querySelector: () => null, addEventListener() {} };
  const window = { dispatchEvent() {} };
  const context = { window, document, localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) }, CustomEvent: class {}, Date, JSON, String, Object, Array, Math, Set, console };
  const scripts = ['assets/js/lan-dialogue-3g.js', 'assets/js/lan-dialogue-3g-archive.js', 'assets/js/lan-dialogue-4g.js', 'assets/js/experience-story-4g.js', 'assets/js/era-archive-4g.js', 'assets/js/lan-system.js'];
  for (const file of scripts) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  for (const [event, era, dialogueId] of [
    ['ENTER_ARCHIVE_3G', '3G', 'lan_3g_archive_entry_001'],
    ['ENTER_ARCHIVE_4G', '4G', 'lan_4g_archive_entry_001']
  ]) {
    assert.equal(window.CommsArchiveLan.dispatchEvent(event, { era }), true);
    assert.equal(window.CommsArchiveLan.trigger(dialogueId, era), true);
    assert.equal(window.CommsArchiveLan.currentDialogue.id, dialogueId);
    assert.equal(window.CommsArchiveLan.LanDisplayMode.mode, 'dialogue');
    window.CommsArchiveLan.skip();
  }
  const app = fs.readFileSync('app.js', 'utf8');
  assert.match(app, /function playLanArchiveDialogue\(era,dialogueId,markSummary=false\)\{const ok=window\.CommsArchiveLan\?\.trigger\(dialogueId,era\)/);
  assert.match(app, /archiveSummaryViewed:true/);
});

test('3G—6G归档条件保留调查、技术与证据，不再依赖体验节点', () => {
  const app = fs.readFileSync('app.js', 'utf8');
  const lanSystem = fs.readFileSync('assets/js/lan-system.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const start = app.indexOf('function completeEra(options={})');
  const end = app.indexOf('function playLanArchiveDialogue', start);
  assert.ok(start >= 0 && end > start);
  const submit = app.slice(start, end);
  assert.match(submit, /understandingCompleted/);
  assert.match(submit, /getArchiveReadiness/);
  assert.match(submit, /completeArchive/);
  assert.doesNotMatch(submit, /experienceCompleted|recordGuidedExperience|key==='life'|archivePending:true/);
  assert.match(app, /function technologyLabActions\(/);
  assert.match(app, /前往时代档案出口/);
  assert.match(app, /通信对日常生活的影响/);
  assert.doesNotMatch(html, /src="assets\/js\/[56]g-archive-ui\.js"/);
  assert.match(lanSystem, /function completeEraArchive6G\(context=\{\}\)/);
  assert.match(lanSystem, /required\.every\(id=>progress\.evidenceProgress\.collectedIds\.includes\(id\)\)/);
  assert.doesNotMatch(lanSystem.slice(lanSystem.indexOf('function completeEraArchive3G'), lanSystem.indexOf('function ensureCompletedTaskRecord')), /experienceCompleted|completedExperienceNodes/);
});

test('展品馆藏卡与档案收藏共用本地年代图片，并在打开详情时显示发现反馈', () => {
  const app = fs.readFileSync('app.js', 'utf8');
  const styles = fs.readFileSync('assets/css/history-media.css', 'utf8');
  assert.match(app, /function exhibitThumbnail\(eraId,item,source='chapter'\)/);
  assert.match(app, /onclick="\$\{open\}"/);
  assert.match(app, /时代关联图像（非该展品独立实物照片）/);
  assert.match(app, /原创未来概念示意；6G仍处于研究发展阶段/);
  assert.match(app, /function sourceExhibitNotice\(eraId\)/);
  assert.match(app, /已发现通信档案：/);
  assert.match(app, /function archiveExhibitCollection\(\)/);
  assert.match(styles, /\.exhibit-thumbnail/);
});
