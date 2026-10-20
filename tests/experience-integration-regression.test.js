'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProgression } = require('../assets/js/progression-manager.js');

const appSource = fs.readFileSync('app.js', 'utf8');
const eraIds = ['1G', '2G', '3G', '4G', '5G', '6G'];
const storyScripts = ['experience-story-1g.js', 'experience-story-2g.js', 'lan-dialogue-3g.js',
  'experience-story-4g.js', 'experience-story-5g.js', 'experience-story-6g.js'];

function between(start, end) {
  const from = appSource.indexOf(start);
  const to = appSource.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing app source segment: ${start}`);
  return appSource.slice(from, to).trim();
}

function makeRuntime(era = '2G') {
  const values = new Map();
  const localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
  const prior = eraIds.slice(0, eraIds.indexOf(era));
  const state = { visited: [era], completed: prior, order: [era], tasks: {}, logs: [], evidence: [], clues: {} };
  const progression = createProgression(state, { save: () => true });
  const memory = { completedExperienceNodes: [] };
  const window = { localStorage, InteractionDebugger: { record() {} } };
  const context = vm.createContext({
    window, localStorage, state, progression, memory, route: 'experience', eraIndex: eraIds.indexOf(era),
    saveAllowed: true, memorySaveAllowed: true, savedState: null, saves: 0, renders: 0, notices: [], events: [],
    document: { getElementById() { return null; } },
    save() { context.saves++; if (!context.saveAllowed) return false; context.savedState = JSON.parse(JSON.stringify(state)); return true; },
    render() { context.renders++; },
    go(route) { context.route = route; return true; },
    showInteractionNotice(message) { context.notices.push(message); },
    dispatchLanEvent(event, detail) { context.events.push({ event, detail }); },
    progressionEraAllowed(id) { return progression.canEnterEra(id); },
    enterEra(index) { const result = progression.enterEra(eraIds[index]); if (!result.ok) return false; context.eraIndex = index; context.route = 'chapter'; return true; },
    progressionBlock(result) { if (result?.ok) return false; context.notices.push(result?.reason); return true; },
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); },
    console, Date, JSON, String, Number, Set, Map, Object, Array, Math
  });
  vm.runInContext(between('const eras=[', "\neras.find(item=>item.id==='2G')"), context);
  for (const filename of storyScripts) vm.runInContext(fs.readFileSync(`assets/js/${filename}`, 'utf8'), context, { filename });
  vm.runInContext(fs.readFileSync('assets/js/experience-interactions.js', 'utf8'), context);
  window.CommsArchiveLan = {
    getExperienceStory(id) { return window[`ExperienceStory${id}`]; },
    get LanMemory() { return memory; },
    completeExperienceNode(id, explicitEra) {
      if (!context.memorySaveAllowed || !this.getExperienceStory(explicitEra)?.nodes.some(node => node.trigger === id)) return false;
      if (!memory.completedExperienceNodes.includes(id)) memory.completedExperienceNodes.push(id);
      return true;
    }
  };
  vm.runInContext([
    between('function experienceTask(', '\nfunction renderExperienceStory('),
    between('function openEraExperience(', '\nfunction experiencePage('),
    between('function recordGuidedExperience(', '\nfunction flowDiagram(')
  ].join('\n'), context, { filename: 'app.js:experience-integration' });
  return { context, window, state, progression, memory, values };
}

function smsText(context) {
  const html = context.experienceInteractionMarkup('2G', { trigger: 'EXPERIENCE_2G_COMPOSE' }, false);
  const output = html.match(/<output\b[^>]*id="smsDraft2G"[^>]*>([\s\S]*?)<\/output>/);
  assert.ok(output, '短信草稿输出已渲染');
  return output[1].replace(/<[^>]*>/g, '');
}

test('短信待定字符只显示一次，切换按键和确认字符不丢失已输入内容', () => {
  const { context, state } = makeRuntime('2G');
  context.press2GSmsKey('2');
  assert.equal(smsText(context), 'A');
  context.press2GSmsKey('2');
  assert.equal(smsText(context), 'B');
  context.press2GSmsKey('3');
  assert.equal(smsText(context), 'BD');
  context.commit2GSmsCharacter();
  assert.equal(smsText(context), 'BD');
  assert.equal(state.tasks['2G'].smsDraft, 'BD');
});

test('互动模拟先完成而登记失败时，可以重试补登且不产生重复日志', () => {
  const { context, window, state, memory } = makeRuntime('2G');
  const trigger = 'EXPERIENCE_2G_RELAY';
  assert.equal(context.advanceExperienceInteraction('2G', trigger), true);
  context.memorySaveAllowed = false;
  assert.equal(context.advanceExperienceInteraction('2G', trigger), false);
  assert.equal(window.CommsArchiveExperience.get('2G', trigger).complete, true);
  assert.equal(memory.completedExperienceNodes.length, 0);
  context.memorySaveAllowed = true;
  assert.equal(context.advanceExperienceInteraction('2G', trigger), true);
  assert.deepEqual(memory.completedExperienceNodes, [trigger]);
  assert.equal(state.logs.length, 1);
  assert.equal(context.advanceExperienceInteraction('2G', trigger), true);
  assert.equal(state.logs.length, 1);
});

test('六代可选体验必须全部完成才记录时代影响，并保持五节点主线位置', () => {
  for (const era of eraIds) {
    const { context, window, state, progression, memory } = makeRuntime(era);
    const story = window.CommsArchiveLan.getExperienceStory(era);
    assert.ok(story?.nodes.length, `${era}体验故事存在`);
    memory.completedExperienceNodes.push(...story.nodes.slice(0, -1).map(node => node.trigger));
    const previousProgress = JSON.stringify(progression.state);
    assert.equal(context.recordGuidedExperience(), false, `${era}缺少最后一项时不能登记`);
    assert.equal(context.route, 'experience');
    assert.equal(state.logs.length, 0);
    memory.completedExperienceNodes.push(story.nodes.at(-1).trigger);
    assert.equal(context.recordGuidedExperience(), true);
    assert.equal(context.route, 'chapter');
    const impactId = `era-impact-${era.toLowerCase()}`;
    assert.equal(state.logs.filter(item => item.id === impactId).length, 1);
    context.route = 'experience';
    assert.equal(context.recordGuidedExperience(), true);
    assert.equal(state.logs.filter(item => item.id === impactId).length, 1, `${era}重复登记保持幂等`);
    assert.equal(JSON.stringify(progression.state), previousProgress, `${era}体验不改写主线节点`);
  }
});

test('时代影响保存失败时留在体验页，恢复存储后可重试保存并返回调查', () => {
  const { context, window, state, memory } = makeRuntime('3G');
  memory.completedExperienceNodes.push(...window.CommsArchiveLan.getExperienceStory('3G').nodes.map(node => node.trigger));
  context.saveAllowed = false;
  assert.equal(context.recordGuidedExperience(), false);
  assert.equal(context.route, 'experience');
  assert.equal(context.savedState, null);
  assert.match(context.notices.at(-1), /存档|保存/);
  context.saveAllowed = true;
  assert.equal(context.recordGuidedExperience(), true);
  assert.equal(context.route, 'chapter');
  assert.equal(state.logs.filter(item => item.id === 'era-impact-3g').length, 1);
  assert.equal(context.savedState.logs.filter(item => item.id === 'era-impact-3g').length, 1);
});

test('可选体验入口遵守时代解锁与显式禁用开关', () => {
  const { context, state, progression } = makeRuntime('1G');
  const before = JSON.stringify({ state, progression: progression.state });
  assert.equal(context.openEraExperience('3G'), false);
  assert.equal(context.openEraExperience('unknown'), false);
  assert.equal(JSON.stringify({ state, progression: progression.state }), before);
  context.window.COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED = true;
  assert.equal(context.openEraExperience('1G'), false);
  context.window.COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED = false;
  assert.equal(context.openEraExperience('1G'), true);
  assert.equal(context.route, 'experience');
});

test('从当前时代打开交互体验保留主线位置，不重复进入章节或重播开场',()=>{
 const {context,progression}=makeRuntime('1G');
 progression.enterEra('1G');context.route='chapter';
 const before=JSON.stringify(progression.state);let entries=0;
 context.enterEra=()=>{entries++;return true;};
 assert.equal(context.openEraExperience('1G'),true);
 assert.equal(context.route,'experience');assert.equal(entries,0);
 assert.equal(JSON.stringify(progression.state),before);
});
