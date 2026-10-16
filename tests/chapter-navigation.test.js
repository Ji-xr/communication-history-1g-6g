'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProgression, nodeId } = require('../assets/js/progression-manager.js');

const appSource = fs.readFileSync('app.js', 'utf8');
const eraIds = ['1G', '2G', '3G', '4G', '5G', '6G'];
const nodeKeys = ['entry', 'scene', 'investigation', 'technology', 'archive'];
const expectedLabels = {
  entry: '进入历史现场',
  scene: '前往建设调查',
  investigation: '进入技术实验室',
  technology: '前往时代档案出口',
  archive: '进入下一时代'
};
const navigationSource = appSource.slice(appSource.indexOf('const guidedNodeOrder='), appSource.indexOf('\nfunction technologyLabActions('));
assert.ok(navigationSource.startsWith('const guidedNodeOrder='), '找到实际章节导航实现');

function makeHarness({ demo = false } = {}) {
  const state = { visited: [], completed: [], order: [], clues: {}, logs: [], tasks: {}, evidence: [] };
  const exhibitsByEra = Object.fromEntries(eraIds.map(era => [era, [`exhibit-${era}`]]));
  const progression = createProgression(state, { exhibitsByEra, requiredEvidenceByEra: {} });
  const notices = [], debugRecords = [];
  const lanEvents = [];
  let lanPlaying = false;
  const ctx = vm.createContext({
    state,
    progression,
    eras: eraIds.map(id => ({ id })),
    hallDeepening: Object.fromEntries(eraIds.map(id => [id, { exhibits: [{ id: `exhibit-${id}` }] }])),
    eraIndex: 0,
    route: 'chapter',
    pendingRouteScrollRestore: null,
    window: {
      DemoManager: { isActive: () => demo },
      InteractionDebugger: { record(...args) { debugRecords.push(args); } },
      CommsArchiveLan: { debugSnapshot: () => ({ isPlaying: lanPlaying }) }
    },
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); },
    showInteractionNotice(message) { notices.push(message); },
    dispatchLanEvent(event, context) { lanEvents.push([event, context]); return true; },
    progressionBlock(result) { throw new Error(result?.reason || '进度阻止'); },
    render() { ctx.renderCount++; },
    renderCount: 0,
    go(target) { ctx.route = target; return true; },
    enterEra(index) {
      const result = progression.enterEra(eraIds[index]);
      if (!result.ok) return false;
      ctx.eraIndex = index;
      ctx.route = 'chapter';
      ctx.render();
      return true;
    },
    completeEra(options = {}) {
      const result = progression.completeArchive();
      if (!result.ok) { notices.push(result.reason); return false; }
      if (!state.completed.includes(eraIds[ctx.eraIndex])) state.completed.push(eraIds[ctx.eraIndex]);
      state.tasks[eraIds[ctx.eraIndex]] = { ...state.tasks[eraIds[ctx.eraIndex]], archiveCompleted: true };
      if (!options.stayOnArchive) ctx.route = 'chapter-end';
      return true;
    }
  });
  ctx.setLanPlaying = value => { lanPlaying = value; };
  vm.runInContext(navigationSource, ctx, { filename: 'app.js:chapter-navigation' });
  return { ctx, state, progression, notices, debugRecords, lanEvents };
}

function currentMarkup(ctx) {
  return vm.runInContext('chapterNavigationMarkup(eras[eraIndex].id, progression.currentNode().key)', ctx);
}

function clickGenerated(markup, ctx, handlerName = 'navigateChapterNext') {
  const button = new RegExp(`onclick="(${handlerName}\\(\\))"`).exec(markup);
  assert.ok(button, `生成的导航按钮绑定 ${handlerName}()`);
  return vm.runInContext(button[1], ctx);
}

function finishEntry(harness, era) {
  const { ctx, progression } = harness;
  ctx.setLanPlaying(true);
  assert.equal(clickGenerated(currentMarkup(ctx), ctx), false, `${era}入口对白进行中不能提前导航`);
  assert.match(harness.notices.at(-1), /读完当前澜剧情/);
  ctx.setLanPlaying(false);
  const activeId = progression.state.dialogueProgress.activeId;
  assert.ok(activeId, `${era}有有效的入口对白状态`);
  assert.equal(progression.completeDialogue(activeId, { holdCurrent: true }).ok, true);
  assert.equal(progression.currentNode().key, 'entry', '对白结束只完成入口，不移动章节指针');
  assert.equal(clickGenerated(currentMarkup(ctx), ctx), true);
  assert.equal(progression.currentNode().key, 'scene');
}

test('1G至6G五节点的实际按钮回调逐步推进，阻断原因清晰，归档后进入下一时代或总结', () => {
  const harness = makeHarness();
  const { ctx, state, progression, notices } = harness;
  assert.equal(progression.enterEra('1G').ok, true);

  for (let index = 0; index < eraIds.length; index++) {
    const era = eraIds[index];
    if (index > 0) assert.equal(progression.currentEra(), era);
    finishEntry(harness, era);

    let markup = currentMarkup(ctx);
    assert.match(markup, new RegExp(expectedLabels.scene));
    assert.match(markup, /返回上一环节/);

    const exhibitId = `exhibit-${era}`;
    assert.equal(progression.markDiscoverable(exhibitId, era).ok, true);
    assert.equal(progression.discoverExhibit(exhibitId, era).ok, true);
    assert.equal(progression.completeScene({ holdCurrent: true }).ok, true);
    assert.equal(progression.currentNode().key, 'scene');

    // A completed earlier node remains revisitable without losing its status.
    assert.equal(clickGenerated(currentMarkup(ctx), ctx, 'navigateChapterPrevious'), true);
    assert.equal(progression.currentNode().key, 'entry');
    assert.equal(progression.state.eras[era].nodes.find(node => node.key === 'scene').status, 'COMPLETED');
    assert.equal(clickGenerated(currentMarkup(ctx), ctx), true);
    assert.equal(progression.currentNode().key, 'scene');

    markup = currentMarkup(ctx);
    assert.match(markup, new RegExp(expectedLabels.scene));
    assert.equal(clickGenerated(markup, ctx), true);
    assert.equal(progression.currentNode().key, 'investigation');
    assert.equal(harness.lanEvents.at(-1)?.[0], 'TASK_START', `${era}进入建设调查后由澜提供任务引导`);
    assert.equal(harness.lanEvents.at(-1)?.[1]?.era, era);
    markup = currentMarkup(ctx);
    assert.match(markup, new RegExp(expectedLabels.investigation));
    assert.match(markup, /至少一条建设调查线索/);
    assert.equal(clickGenerated(markup, ctx), false, '未调查时显示阻断原因');
    assert.match(notices.at(-1), /建设调查线索/);

    state.tasks[era] = { selected: 0, step: 1, understandingCompleted: false };
    assert.equal(progression.completeInvestigation({ holdCurrent: true }).ok, true);
    assert.equal(progression.currentNode().key, 'investigation', '记录调查后仍等待用户手动前进');
    assert.equal(clickGenerated(currentMarkup(ctx), ctx), true);
    assert.equal(progression.currentNode().key, 'technology');
    assert.equal(harness.lanEvents.at(-1)?.[0], 'TECH_START', `${era}进入技术实验室后由澜提供实验引导`);
    assert.equal(harness.lanEvents.at(-1)?.[1]?.era, era);

    markup = currentMarkup(ctx);
    assert.match(markup, /请先完成技术理解任务/);
    assert.equal(clickGenerated(markup, ctx), false, '技术条件未完成时下一步不静默失败');
    assert.match(notices.at(-1), /完成技术理解任务/);
    state.evidence.push({ evidenceId: `evidence.${era.toLowerCase()}.investigation`, eraId: era });
    state.tasks[era].understandingCompleted = true;
    assert.equal(progression.completeTechnology({ holdCurrent: true }).ok, true);
    assert.equal(progression.currentNode().key, 'technology', '技术实验完成后停留本页');
    assert.equal(progression.state.eras[era].nodes.find(node => node.key === 'technology').status, 'COMPLETED');
    assert.equal(clickGenerated(currentMarkup(ctx), ctx), true);
    assert.equal(progression.currentNode().key, 'archive');

    markup = currentMarkup(ctx);
    assert.match(markup, new RegExp(era === '6G' ? '查看通信文明总结' : expectedLabels.archive));
    assert.match(markup, /先点击“封存时代档案”/);
    assert.equal(clickGenerated(markup, ctx), false, '时代档案未封存时不能前进');
    assert.match(notices.at(-1), /封存/);

    assert.equal(ctx.completeEra({ stayOnArchive: true }), true);
    assert.equal(progression.currentNode().key, 'archive');
    assert.equal(clickGenerated(currentMarkup(ctx), ctx), true);
    if (era === '6G') {
      assert.equal(ctx.route, 'final');
    } else {
      assert.equal(progression.currentEra(), eraIds[index + 1]);
      assert.equal(ctx.route, 'chapter');
    }
  }

  assert.deepEqual(state.completed, eraIds);
  assert.equal(progression.state.eras['6G'].nodes.every(node => node.status === 'COMPLETED'), true);
  assert.ok(ctx.pendingRouteScrollRestore === 0, '新节点导航请求滚动到新环节顶部');
});

test('六个节点都显示对应下一步文案；除入口外都有返回按钮', () => {
  const labels = Object.values(expectedLabels);
  assert.equal(labels.length, 5);
  const source = appSource.slice(appSource.indexOf('function chapterNavigationMarkup('), appSource.indexOf('\nfunction guidedNodeRailMarkup('));
  assert.match(source, /navigateChapterNext\(\)/);
  assert.match(source, /navigateChapterPrevious\(\)/);
  assert.match(source, /key==='archive'&&era==='6G'\?'查看通信文明总结'/);
  for (const label of labels) assert.ok(appSource.includes(label), `存在统一按钮文案：${label}`);
});

test('手动节点推进保存状态；刷新恢复完成节点，演示状态与正式状态隔离', () => {
  const formal = makeHarness();
  assert.equal(formal.progression.enterEra('1G').ok, true);
  finishEntry(formal, '1G');
  const formalSnapshot = JSON.parse(JSON.stringify(formal.state));

  const demo = makeHarness({ demo: true });
  assert.equal(demo.progression.enterEra('1G').ok, true);
  finishEntry(demo, '1G');
  assert.equal(formal.state.progression.eras['1G'].nodes.find(node => node.key === 'scene').status, 'ACTIVE');

  const restoredState = JSON.parse(JSON.stringify(formalSnapshot));
  const restored = createProgression(restoredState, { exhibitsByEra: { '1G': ['exhibit-1G'] }, requiredEvidenceByEra: {} });
  assert.equal(restored.currentNode().key, 'scene');
  assert.equal(restored.state.eras['1G'].nodes.find(node => node.key === 'entry').status, 'COMPLETED');
  assert.equal(restored.state.eras['1G'].nodes.find(node => node.key === 'scene').status, 'ACTIVE');
});

