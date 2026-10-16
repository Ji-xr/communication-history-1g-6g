'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProgression } = require('../assets/js/progression-manager.js');

const appSource = fs.readFileSync('app.js', 'utf8');
const eraIds = ['1G', '2G', '3G', '4G', '5G', '6G'];
const storyScripts = [
  'experience-story-1g.js', 'experience-story-2g.js', 'lan-dialogue-3g.js',
  'experience-story-4g.js', 'experience-story-5g.js', 'experience-story-6g.js'
];

function between(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source segment: ${start}`);
  return source.slice(from, to).trim();
}

function fnLine(name) {
  const line = appSource.split(/\r?\n/).find(value => value.startsWith(`function ${name}(`));
  assert.ok(line, `Missing function ${name}`);
  return line;
}

const eraData = between(appSource, 'const eras=[', "\neras.find(item=>item.id==='2G')");
const hallData = between(appSource, 'const hallDeepening={', '\nfunction exhibitThumbnail(');
const experienceFunctions = [
  between(appSource, 'function experienceTask(', '\nfunction experienceInteractionMarkup('),
  between(appSource, 'function experienceInteractionMarkup(', '\nfunction recordGuidedExperience('),
  between(appSource, 'function completeEraExperienceNode(', '\nfunction advanceExperienceInteraction('),
  between(appSource, 'function advanceExperienceInteraction(', '\nfunction renderExperienceStory('),
  between(appSource, 'function recordGuidedExperience(', '\nfunction flowDiagram('),
  fnLine('render4GExperience'), fnLine('complete4GExperience'),
  fnLine('render5GExperience'), fnLine('complete5GExperience'),
  fnLine('render6GExperience'), fnLine('complete6GExperience')
].join('\n');

function makeExperienceRuntime(era) {
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  let demoMode = false;
  const DemoManager = { isActive: () => demoMode, storageKey: key => demoMode ? `demo:${key}` : key };
  const window = { localStorage, DemoManager, InteractionDebugger: { record() {} } };
  const memory = { completedExperienceNodes: [] };
  window.CommsArchiveLan = {
    get LanMemory() { return memory; },
    getExperienceStory(id) { return window[`ExperienceStory${id}`] || null; },
    completeExperienceNode(id, explicitEra) {
      const story = this.getExperienceStory(explicitEra);
      if (!story?.nodes.some(node => node.trigger === id) || memory.completedExperienceNodes.includes(id)) return false;
      memory.completedExperienceNodes.push(id);
      return true;
    }
  };

  const prior = eraIds.slice(0, eraIds.indexOf(era));
  const state = { visited: [era], completed: prior, order: [era], clues: {}, logs: [], tasks: {}, evidence: [] };
  const progression = createProgression(state, { save: () => true });
  const record = progression.state.eras[era];
  for (const node of record.nodes) node.status = node.key === 'life' ? 'ACTIVE' : (['entry', 'scene', 'investigation', 'technology'].includes(node.key) ? 'COMPLETED' : 'LOCKED');
  progression.state.currentEra = era;
  progression.state.currentNode = `${era.toLowerCase()}_life`;
  const context = vm.createContext({
    window, localStorage, state, progression, eraIndex: eraIds.indexOf(era), route: 'chapter',
    eras: [], save() { return true; }, render() {}, dispatchLanEvent() {},
    showInteractionNotice(message) { context.lastNotice = message; },
    progressionBlock(result) { if (!result?.ok) { context.lastNotice = result?.reason; return true; } return false; },
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); },
    console, Date, Math, Object, Array, Set, String, Number
  });
  vm.runInContext(eraData, context);
  vm.runInContext(hallData, context);
  for (const file of storyScripts) vm.runInContext(fs.readFileSync(`assets/js/${file}`, 'utf8'), context, { filename: file });
  vm.runInContext(fs.readFileSync('assets/js/experience-interactions.js', 'utf8'), context, { filename: 'experience-interactions.js' });
  vm.runInContext(fs.readFileSync('assets/js/experience-1g-phone.js', 'utf8'), context, { filename: 'experience-1g-phone.js' });
  context.eras = context.eras || vm.runInContext('eras', context);
  vm.runInContext(experienceFunctions, context, { filename: 'app.js:experience-runtime' });
  context.setDemoMode = value => { demoMode = value; };
  return { context, state, progression, memory, storage, window };
}

test('正式流程已移除六代体验入口；体验源文件和旧数据仍保留', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED=true/);
  assert.doesNotMatch(html, /<script[^>]+src="assets\/js\/(experience-story|experience-interactions|experience-1g-phone)/);
  const guided = appSource.slice(appSource.indexOf('function guidedChapter('), appSource.indexOf('\nfunction guidedDiscoverExhibit('));
  assert.doesNotMatch(guided, /renderExperienceStory|render[1-6]GExperience|recordGuidedExperience|体验者记录|进入用户体验区|记录时代影响/);
  for (const script of storyScripts.filter(file => !file.startsWith('lan-dialogue-'))) {
    assert.ok(fs.existsSync(`assets/js/${script}`), `${script}保留供未来恢复`);
  }
  assert.match(appSource, /通信对日常生活的影响/);
});

test('六代用户体验节点不会再进入正式进度；旧体验日志不被清除', () => {
  const { state, progression, context } = makeExperienceRuntime('1G');
  state.logs.push({ id: 'era-impact-1g', era: '1G', title: '已有体验影响记录' });
  const legacyMemory = ['EXPERIENCE_1G_CALL'];
  context.window.COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED = true;
  const lanWindow={...context.window,LanDialogues1G:[{id:'lan.1g.experience.legacy',era:'1G',location:'experience',trigger:'EXPERIENCE_1G_CALL',emotion:'warm',dialogueType:'story',storyLine:'experience',text:'保留的旧体验对白'}],LanTriggers1G:[{id:'EXPERIENCE_1G_CALL',event:'EXPERIENCE_NODE',dialogueId:'lan.1g.experience.legacy',condition:{era:'1G'}}]};
  const lanContext = vm.createContext({ window: lanWindow, document: {}, localStorage: { getItem: () => null, setItem() {} }, CustomEvent: class {}, console, Date, JSON, String, Object, Array, Math, Set });
  vm.runInContext(fs.readFileSync('assets/js/lan-system.js', 'utf8'), lanContext);
  assert.equal(lanContext.window.CommsArchiveLan.getExperienceStory('1G'), null);
  assert.equal(lanContext.window.CommsArchiveLan.completeExperienceNode('EXPERIENCE_1G_CALL', '1G'), false);
  assert.equal(lanContext.window.CommsArchiveLan.dialogueData.some(item=>item.id==='lan.1g.experience.legacy'),true,'旧对白仍保留供历史兼容');
  assert.equal(lanContext.window.CommsArchiveLan.triggers.some(item=>item.dialogueId==='lan.1g.experience.legacy'),false,'旧体验对白触发器不再进入正式运行表');
  assert.equal(lanContext.window.CommsArchiveLan.trigger('lan.1g.experience.legacy','1G'),false,'正式运行中不能直接启动已停用的体验对白');
  assert.equal(lanContext.window.CommsArchiveLan.dispatchEvent('EXPERIENCE_NODE',{era:'1G',nodeId:'EXPERIENCE_1G_CALL'}),false,'停用的体验事件不会播放对白');
  assert.equal(progression.state.eras['1G'].nodes.some(node => node.key === 'life'), false);
  assert.equal(state.logs.find(item => item.id === 'era-impact-1g').title, '已有体验影响记录');
  assert.deepEqual(legacyMemory, ['EXPERIENCE_1G_CALL']);
});

test('体验模拟分步状态在刷新后恢复，并与比赛演示存档隔离', () => {
  const runtime = makeExperienceRuntime('1G'), { context, window, storage } = runtime;
  assert.equal(window.CommsArchiveExperience.get('1G', 'EXPERIENCE_1G_CALL').step, 0);
  vm.runInContext("advanceExperienceInteraction('1G','EXPERIENCE_1G_CALL')", context);
  assert.equal(window.CommsArchiveExperience.get('1G', 'EXPERIENCE_1G_CALL').step, 1);
  assert.ok(storage.has('commsArchiveExperienceProgress.v1'));
  context.setDemoMode(true);
  assert.equal(window.CommsArchiveExperience.get('1G', 'EXPERIENCE_1G_CALL').step, 0, '比赛演示不会读取普通探索的半步状态');
  vm.runInContext("advanceExperienceInteraction('1G','EXPERIENCE_1G_CALL')", context);
  context.setDemoMode(false);
  assert.equal(window.CommsArchiveExperience.get('1G', 'EXPERIENCE_1G_CALL').step, 1, '返回普通模式后恢复普通探索状态');
});
