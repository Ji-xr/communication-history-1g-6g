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
].map((file) => fs.readFileSync(file, 'utf8'));
class Element {
  constructor() { this.id = ''; this.dataset = {}; this.hidden = false; this.nodes = new Map(); this.classList = { toggle() {}, add() {}, remove() {} }; }
  setAttribute() {} append() {}
  querySelector(id) { if (!this.nodes.has(id)) this.nodes.set(id, new Element()); return this.nodes.get(id); }
  querySelectorAll() { return []; } addEventListener() {}
}
function load(storage = new Map()) {
  const nodes = new Map(), body = new Element(); body.append = (node) => nodes.set(node.id, node);
  const document = { body, getElementById: (id) => nodes.get(id) || null, createElement: () => new Element(), querySelector: () => null };
  const localStorage = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) };
  const window = { dispatchEvent() {} };
  const context = { window, document, localStorage, CustomEvent: class {}, Date, JSON, String, Object, Array, Math, Set, console };
  scripts.forEach((source) => vm.runInNewContext(source, context));
  return { ...window, storage };
}

test('4G归档结构明确记录技术突破、建设成果、体验变化和关键词', () => {
  const { EraArchive4G: archive } = load();
  assert.equal(archive.id, 'archive_4g');
  assert.equal(archive.era, '4G');
  assert.equal(archive.title, '看见世界');
  assert.match(archive.technology, /LTE/);
  assert.match(archive.construction, /网络容量/);
  assert.match(archive.experience, /分享/);
  assert.ok(archive.keywords.length >= 3);
  assert.equal(archive.completed, false);
});

test('4G仍要求建设调查任务与证据；不再要求体验者节点', () => {
  const runtime = load(), archive = runtime.CommsArchiveLan;
  const context = { era: '4G', constructionCompleted: true, evidenceUnlocked: ['evidence.4g'] };
  assert.equal(archive.completeEraArchive4G(context), false);
  archive.onTaskComplete('4G');
  assert.equal(archive.completeEraArchive4G({ ...context, evidenceUnlocked: [] }), false);
  assert.equal(archive.completeEraArchive4G(context), true, '任务和证据满足后可直接归档');
});

test('已完成的4G任务可静默补齐旧存档的任务记录，不重复触发对白', () => {
  const storage = new Map(), runtime = load(storage), archive = runtime.CommsArchiveLan;
  assert.equal(archive.currentDialogue, null);
  assert.equal(archive.ensureCompletedTaskRecord('4G'), true);
  assert.ok(archive.LanMemory.completedTasks.includes('task.4g.investigation'));
  assert.equal(archive.currentDialogue, null);
  assert.equal(archive.ensureCompletedTaskRecord('bad-era'), false);
  for (const node of archive.getExperienceStory('4G').nodes) archive.completeExperienceNode(node.trigger, '4G');
  assert.equal(archive.completeEraArchive4G({ era: '4G', constructionCompleted: true, experienceCompleted: true, evidenceUnlocked: ['evidence.4g.legacy'] }), true);
});

test('满足双线与证据条件后保存一份档案，刷新可恢复且旧存档结构仍有效', () => {
  const storage = new Map();
  storage.set('commsArchive.lanMemory.v1', JSON.stringify({ completedTasks: ['task.1g.investigation'], completedEras: ['1G'] }));
  let runtime = load(storage), archive = runtime.CommsArchiveLan;
  archive.onTaskComplete('4G');
  for (const node of archive.getExperienceStory('4G').nodes) archive.completeExperienceNode(node.trigger, '4G');
  const context = { era: '4G', constructionCompleted: true, experienceCompleted: true, evidenceUnlocked: ['evidence.4g.investigation'] };
  assert.equal(archive.completeEraArchive4G(context), true);
  assert.equal(archive.completeEraArchive4G(context), false);
  runtime = load(storage); archive = runtime.CommsArchiveLan;
  assert.equal(runtime.EraArchive4G.completed, true);
  assert.ok(archive.LanMemory.completedEras.includes('1G'));
  assert.ok(archive.LanMemory.completedEras.includes('4G'));
  assert.equal(archive.LanMemory.eraArchives.filter((item) => item.archiveId === 'archive_4g').length, 1);
});
