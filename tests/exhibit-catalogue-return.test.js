'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appSource = fs.readFileSync('app.js', 'utf8');

function sourceLine(fragment) {
  const line = appSource.split(/\r?\n/).find((value) => value.includes(fragment));
  assert.ok(line, `Missing app source: ${fragment}`);
  return line;
}

function sourceBetween(start, end) {
  const from = appSource.indexOf(start);
  const to = appSource.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source section: ${start}`);
  return appSource.slice(from, to).trim();
}

const erasSource = sourceBetween('const eras=[', '\nconst questions=');
const hallsSource = sourceBetween('const hallDeepening={', '\nfunction exhibitThumbnail(');
const renderSource = sourceBetween('function render(){', 'window.renderProgression=render;');
const preserveScrollSource = sourceBetween('function preservePagePosition(', '}function render(){') + '}';
const helpers = [
  sourceLine('function exhibitCatalogueStateKey('),
  sourceLine('function setExhibitCatalogueExpanded('),
  sourceLine('function rememberExhibitCataloguePosition('),
  sourceLine('function guidedExhibitCatalogue('),
  sourceLine('function showExhibitDetails(')
];
const closeModalSource = sourceLine('function closeModal()').slice(sourceLine('function closeModal()').indexOf('function closeModal()'));

function runtime({ demo = false } = {}) {
  const frames = [];
  const scrollStyle = new Map();
  const modalRoot = {
    innerHTML: '',
    querySelector(selector) {
      return selector === '.modal' && this.innerHTML.includes('class="modal"') ? { scrollTop: 0 } : null;
    }
  };
  const app = { innerHTML: '' };
  const document = {
    activeElement: null,
    documentElement: { style: {
      getPropertyValue: (key) => scrollStyle.get(key)?.value || '',
      getPropertyPriority: (key) => scrollStyle.get(key)?.priority || '',
      setProperty: (key, value, priority = '') => scrollStyle.set(key, { value, priority }),
      removeProperty: (key) => scrollStyle.delete(key)
    } },
    querySelector(selector) { return selector === '#modalRoot' ? modalRoot : null; }
  };
  const window = {
    scrollY: 0,
    DemoManager: { isActive: () => demo, saveView() {} },
    CommsArchiveLan: { onExhibit() {}, onRoute() {}, checkGuidedDialogueState() {} },
    DemoGuide: { refresh() {} },
    scrollTo(_x, y) { this.scrollY = y; }
  };
  const progression = {
    state: { exhibitProgress: {} },
    currentEra() { return this.era; },
    discoverExhibit(id) {
      const item = this.state.exhibitProgress[id];
      if (item.status === 'DISCOVERABLE') item.status = 'FOUND';
      return { ok: true, exhibit: item };
    }
  };
  const context = vm.createContext({
    window, document, app, modalRoot, progression, route: 'chapter', eraIndex: 0, state: { completed: [] },
    pendingRouteScrollRestore: null, suppressLanAutoDialogueOnce: false, currentExhibitId: null, currentExhibitItemId: null,
    currentExhibitSource: 'chapter', currentExhibitTab: 'history', modalTrigger: null,
    flowStepIndex: 0, reviewGuideActive: false, lastRenderedRouteKey: null,
    scrollRestoreToken: 0, scrollRestoreStyle: null,
    updateProgress() {}, pauseFlow() {}, showExhibitHint() {}, progressionBlock(result) { return !result?.ok; },
    rejectProgress() { throw new Error('unexpected progress rejection'); },
    renderExhibitModal() { modalRoot.innerHTML = '<div class="modal">展品详情</div>'; },
    requestAnimationFrame(callback) { frames.push(callback); },
    escapeHtml(value) { return String(value ?? ''); },
    console
  });
  vm.runInContext(erasSource, context);
  vm.runInContext(hallsSource, context);
  vm.runInContext('const exhibitCatalogueViewState=Object.create(null);', context);
  context.window.CommsArchive3DStatus = undefined;
  context.chapter = function chapter() {
    context.__chapterEra = vm.runInContext('eras[eraIndex]', context);
    return vm.runInContext('guidedExhibitCatalogue(__chapterEra)', context, { timeout: 1000 });
  };
  for (const helper of helpers) vm.runInContext(helper, context);
  vm.runInContext(closeModalSource, context);
  vm.runInContext(preserveScrollSource, context);
  vm.runInContext(renderSource, context);
  return { context, frames, modalRoot, app, progression, window };
}

function setEra(h, eraId) {
  const eras = vm.runInContext('eras', h.context);
  const halls = vm.runInContext('hallDeepening', h.context);
  const index = eras.findIndex((era) => era.id === eraId);
  h.context.eraIndex = index;
  h.progression.era = eraId;
  for (const item of halls[eraId].exhibits) {
    h.progression.state.exhibitProgress[item.id] = { eraId, exhibitId: item.id, status: 'DISCOVERABLE' };
  }
  return halls[eraId].exhibits;
}

function flushFrames(h) {
  while (h.frames.length) h.frames.shift()();
}

test('1G–6G展开馆藏列表后连续查看展品，关闭详情保留展开状态与页面滚动位置', () => {
  for (const eraId of ['1G', '2G', '3G', '4G', '5G', '6G']) {
    const h = runtime();
    const exhibits = setEra(h, eraId);
    assert.ok(exhibits.length >= 3, `${eraId}应有多件展品可连续浏览`);
    let markup = vm.runInContext(`guidedExhibitCatalogue(eras[${h.context.eraIndex}])`, h.context);
    assert.match(markup, /查看其余馆藏展品/);
    assert.match(markup, /ontoggle="setExhibitCatalogueExpanded\(/, '原生details展开事件会保存界面状态');
    assert.doesNotMatch(markup, /<details[^>]*\sopen(?:\s|>)/, `${eraId}初始列表保持收起`);

    vm.runInContext(`setExhibitCatalogueExpanded('${eraId}', true)`, h.context);
    const originalScroll = 360 + h.context.eraIndex * 37;
    h.window.scrollY = originalScroll;

    for (const item of exhibits.slice(1)) {
      vm.runInContext(`showExhibitDetails('${eraId}', 'guided-catalogue', '${item.id}')`, h.context);
      assert.ok(h.modalRoot.innerHTML.includes('展品详情'), `${eraId}/${item.id}应打开详情`);
      h.window.scrollY = 0; // 模拟弹窗滚动锁定背景时读取到的错误坐标。
      vm.runInContext('closeModal()', h.context);
      flushFrames(h);
      assert.equal(h.window.scrollY, originalScroll, `${eraId}/${item.id}返回后恢复页面位置`);
      assert.match(h.app.innerHTML, /<details[^>]*\sopen(?:\s|>)/, `${eraId}/${item.id}返回后列表仍展开`);
      assert.equal(h.progression.state.exhibitProgress[item.id].status, 'FOUND', `${eraId}/${item.id}已查看状态保留`);
    }
  }
});

test('展品目录展开状态按普通探索和比赛演示隔离，并尊重用户主动收起', () => {
  const h = runtime();
  const exhibits = setEra(h, '1G');
  vm.runInContext("setExhibitCatalogueExpanded('1G', true)", h.context);
  let markup = vm.runInContext("guidedExhibitCatalogue(eras[0])", h.context);
  assert.match(markup, /<details[^>]*\sopen(?:\s|>)/, '正式探索中目录已展开');

  h.context.window.DemoManager.isActive = () => true;
  markup = vm.runInContext("guidedExhibitCatalogue(eras[0])", h.context);
  assert.doesNotMatch(markup, /<details[^>]*\sopen(?:\s|>)/, '切到比赛演示时不继承正式探索的界面状态');
  vm.runInContext("setExhibitCatalogueExpanded('1G', true)", h.context);
  markup = vm.runInContext("guidedExhibitCatalogue(eras[0])", h.context);
  assert.match(markup, /<details[^>]*\sopen(?:\s|>)/, '演示模式可以独立展开');

  vm.runInContext("setExhibitCatalogueExpanded('1G', false)", h.context);
  markup = vm.runInContext("guidedExhibitCatalogue(eras[0])", h.context);
  assert.doesNotMatch(markup, /<details[^>]*\sopen(?:\s|>)/, '用户主动收起后保持收起');
  assert.equal(exhibits.length > 0, true);
});

test('从其他展品详情来源关闭时不改写馆藏目录返回状态，也不触发目录滚动恢复', () => {
  const h = runtime();
  const exhibits = setEra(h, '4G');
  vm.runInContext("setExhibitCatalogueExpanded('4G', true)", h.context);
  h.context.currentExhibitId = '4G';
  h.context.currentExhibitSource = 'chapter';
  h.context.lastRenderedRouteKey = 'chapter:4G';
  h.window.scrollY = 925;
  vm.runInContext('closeModal()', h.context);
  flushFrames(h);
  assert.equal(h.window.scrollY, 925, '普通章节详情沿用既有同页滚动规则');
  assert.equal(vm.runInContext("exhibitCatalogueViewState['normal:4G'].expanded", h.context), true);
  assert.ok(exhibits.length > 0);
});
