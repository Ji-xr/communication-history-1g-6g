'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const scripts = [
  'assets/js/lan-dialogue-1g.js', 'assets/js/lan-dialogue-2g.js',
  'assets/js/lan-dialogue-3g.js', 'assets/js/lan-dialogue-3g-archive.js',
  'assets/js/lan-dialogue-4g.js', 'assets/js/experience-story-4g.js',
  'assets/js/era-archive-4g.js', 'assets/js/lan-system.js'
].map((path) => fs.readFileSync(path, 'utf8'));
const appSource = fs.readFileSync('app.js', 'utf8');
const htmlSource = fs.readFileSync('index.html', 'utf8');

class Element {
  constructor() { this.id = ''; this.dataset = {}; this.hidden = false; this.nodes = new Map(); this.classList = { toggle() {}, add() {}, remove() {} }; }
  setAttribute() {}
  append() {}
  querySelector(id) { if (!this.nodes.has(id)) this.nodes.set(id, new Element()); return this.nodes.get(id); }
  querySelectorAll() { return []; }
  addEventListener() {}
}
function runtime(storage = new Map()) {
  const nodes = new Map(), body = new Element();
  body.append = (el) => nodes.set(el.id, el);
  const document = { body, getElementById: (id) => nodes.get(id) || null, createElement: () => new Element(), querySelector: () => nodes.get('lanCompanion')?.querySelector('#app') || null };
  const localStorage = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) };
  const events = [], window = { dispatchEvent: (event) => events.push(event) };
  const context = { window, document, localStorage, CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }, Date, JSON, String, Object, Array, Math, Set, console };
  scripts.forEach((source) => vm.runInNewContext(source, context));
  return { lan: window.CommsArchiveLan, dialogues: window.LanDialogues4G, triggers: window.LanTriggers4G, story: window.ExperienceStory4G, archive: window.EraArchive4G, events, storage };
}
function finish(rt, id) {
  const item = rt.dialogues.find((dialogue) => dialogue.id === id);
  assert.ok(item, id);
  for (let i = 0; i < item.text.split('\n').length; i++) rt.lan.next();
}

test('4G入口首次触发并且重入不重复强制播放', () => {
  const store = new Map(), rt = runtime(store);
  assert.equal(rt.lan.dispatchEvent('ENTER_ERA', { era: '4G', firstEnter: true }), true);
  assert.equal(rt.lan.currentDialogue.id, 'lan_4g_enter_001');
  finish(rt, 'lan_4g_enter_001');
  assert.equal(rt.lan.dispatchEvent('ENTER_ERA', { era: '4G', firstEnter: true }), false);
  const reload = runtime(store);
  reload.lan.onRoute('chapter', { era: '4G' });
  assert.notEqual(reload.lan.currentDialogue?.id, 'lan_4g_enter_001');
});

test('4G展品、技术流程、调查开始和四类线索触发独立对白', () => {
  const rt = runtime();
  for (const [exhibitId, dialogueId] of [
    ['exhibit.4g.handset', 'lan_4g_phone_001'], ['exhibit.4g.video', 'lan_4g_video_001'],
    ['exhibit.4g.live', 'lan_4g_live_001'], ['exhibit.4g.lte', 'lan_4g_base_001']
  ]) {
    assert.equal(rt.lan.dispatchEvent('EXHIBIT_CLICK', { era: '4G', exhibitId }), true);
    assert.equal(rt.lan.currentDialogue.id, dialogueId);
    rt.lan.skip();
  }
  for (const [event, context, dialogueId] of [
    ['TECH_START', { era: '4G' }, 'lan_4g_tech_001'], ['TASK_START', { era: '4G' }, 'lan_4g_task_start_001'],
    ['TASK_CLUE', { era: '4G', clue: 'network-capacity' }, 'lan_4g_clue_capacity_001'],
    ['TASK_CLUE', { era: '4G', clue: 'base-load' }, 'lan_4g_clue_load_001'],
    ['TASK_CLUE', { era: '4G', clue: 'data-route' }, 'lan_4g_clue_route_001'],
    ['TASK_CLUE', { era: '4G', clue: 'video-service' }, 'lan_4g_clue_service_001'],
    ['TASK_REVEAL', { era: '4G' }, 'lan_4g_reveal_001']
  ]) {
    assert.equal(rt.lan.dispatchEvent(event, context), true, dialogueId);
    assert.equal(rt.lan.currentDialogue.id, dialogueId);
    rt.lan.skip();
  }
});

test('4G体验节点可逐个完成并在所有节点完成后形成合并触发', () => {
  const rt = runtime();
  assert.equal(rt.lan.dispatchEvent('EXPERIENCE_START', { era: '4G' }), true);
  rt.lan.skip();
  for (const node of rt.story.nodes) {
    assert.equal(rt.lan.completeExperienceNode(node.trigger, '4G'), true, node.id);
    rt.lan.skip();
  }
  assert.deepEqual(Array.from(rt.lan.LanMemory.completedExperienceNodes), Array.from(rt.story.nodes, (node) => node.trigger));
  assert.ok(rt.lan.LanMemory.completedTriggers.includes('COMPLETE_4G_EXPERIENCE'));
  assert.equal(rt.lan.completeExperienceNode(rt.story.nodes[0].trigger, '4G'), false);
});

test('4G任务完成进入归档对白，归档完成后发出5G解锁事件', () => {
  const rt = runtime();
  rt.lan.onTaskComplete('4G');
  assert.equal(rt.lan.currentDialogue.id, 'lan_4g_task_complete_001');
  finish(rt, 'lan_4g_task_complete_001');
  assert.equal(rt.lan.currentDialogue.id, 'lan_4g_archive_entry_001');
  assert.equal(rt.lan.dispatchEvent('VIEW_ARCHIVE_SECTION_4G', { era: '4G', section: 'technology' }), true);
  assert.equal(rt.lan.currentDialogue.id, 'lan_4g_archive_technology_001');
  rt.lan.skip();
  for (const node of rt.story.nodes) { rt.lan.completeExperienceNode(node.trigger, '4G'); rt.lan.skip(); }
  const evidenceUnlocked = ['evidence.4g.investigation'];
  assert.equal(rt.lan.completeEraArchive4G({ era: '4G', constructionCompleted: true, experienceCompleted: true, evidenceUnlocked }), true);
  assert.equal(rt.lan.currentDialogue.id, 'lan_4g_archive_complete_001');
  finish(rt, 'lan_4g_archive_complete_001');
  assert.equal(rt.lan.currentDialogue.id, 'lan_4g_unlock_5g_001');
  finish(rt, 'lan_4g_unlock_5g_001');
  assert.ok(!rt.events.some((event) => event.type === 'comms-archive-lan-next' && event.detail?.era === '5G'));
});

test('4G归档需要建设者任务、全部体验节点和证据，且刷新后只保存一份', () => {
  const store = new Map(), rt = runtime(store), context = { era: '4G', constructionCompleted: true, experienceCompleted: true, evidenceUnlocked: ['evidence.4g.investigation'] };
  assert.equal(rt.lan.completeEraArchive4G(context), false);
  rt.lan.onTaskComplete('4G');
  for (const node of rt.story.nodes) { rt.lan.completeExperienceNode(node.trigger, '4G'); rt.lan.skip(); }
  assert.equal(rt.lan.completeEraArchive4G(context), true);
  assert.equal(rt.lan.completeEraArchive4G(context), false);
  assert.equal(rt.lan.LanMemory.eraArchives.filter((item) => item.archiveId === 'archive_4g').length, 1);
  const reload = runtime(store);
  assert.equal(reload.archive.completed, true);
  assert.equal(reload.lan.LanMemory.eraArchives.length, 1);
  assert.deepEqual(Array.from(reload.lan.LanMemory.eraArchives[0].evidenceUnlocked), ['evidence.4g.investigation']);
});

test('应用页面接入4G技术实验、时代档案出口与可选体验', () => {
  assert.match(htmlSource, /lan-dialogue-4g\.js/);
  assert.match(htmlSource, /era-archive-4g\.js/);
  assert.match(htmlSource, /src="assets\/js\/experience-story-4g\.js"/);
  assert.ok(fs.existsSync('assets/js/experience-story-4g.js'));
  assert.match(htmlSource, /COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED=false/);
  assert.match(appSource, /completeEraArchive4G/);
  assert.match(appSource, /前往时代档案出口/);
  assert.match(appSource, /resumeEraArchive/);
  const guided = appSource.slice(appSource.indexOf('function guidedChapter('), appSource.indexOf('\nfunction guidedDiscoverExhibit('));
  assert.doesNotMatch(guided, /recordGuidedExperience|体验者记录|进入用户体验区/);
  assert.match(guided, /openEraExperience/);
});
