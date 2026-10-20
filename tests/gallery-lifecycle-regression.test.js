const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
function between(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `missing ${start}`);
  return source.slice(first, last);
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

function harness({ delayApi = false } = {}) {
  const frames = [], mounts = [], errors = [], calls = [], listeners = new Map();
  const elements = Object.fromEntries(['archive3d', 'galleryInfo', 'galleryStatus', 'threeMount'].map(id => [`#${id}`, { hidden: true, textContent: '', innerHTML: '' }]));
  const classes = new Set();
  const apiReady = deferred();
  const api = { dispose() { calls.push('api-dispose'); }, mount(options) { const pending = deferred(); mounts.push({ ...pending, options }); return pending.promise; } };
  const eras = ['1G', '2G', '3G', '4G', '5G', '6G'].map(id => ({ id, title: id, year: '2000', color: '#63e8ff' }));
  const window = { CommunicationsHistory3D: api, COMMS_ARCHIVE_3D_DISABLED: false, InteractionDebugger: { record(...args) { calls.push(args); } }, addEventListener(type, callback) { listeners.set(type, callback); } };
  const context = vm.createContext({ window, eras, eraIndex: 0, route: 'home', galleryActive: false, galleryInstance: null, galleryReturn: false,
    reviewGuideActive: false, reviewGuideStage: 0, state: { visited: [], completed: [] },
    hallDeepening: Object.fromEntries(eras.map(era => [era.id, { exhibits: [{ id: `${era.id}-main` }] }])),
    document: { querySelector: selector => elements[selector], body: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } } },
    app: { hidden: false, insertAdjacentHTML(position, html) { errors.push(html); } },
    waitFor3DViewer: () => apiReady.promise, renderReviewTimeline() {}, updateReviewGuide() {}, reviewGuideStep() {},
    showGalleryEra() {}, showExhibitByStableId() {}, showExhibitHint() {}, beginEraTravel() {},
    cancelEraTravel() { calls.push('cancel-travel'); }, render() { calls.push('render'); },
    go(route) { context.route = route; }, requestAnimationFrame: callback => frames.push(callback)
  });
  vm.runInContext(fs.readFileSync('assets/js/viewer-state.js', 'utf8'), context);
  vm.runInContext(between('let galleryRequestId=', 'function continueExploring(') + between('function close3DGallery(', 'function renderReviewTimeline('), context);
  if (!delayApi) apiReady.resolve(api);
  async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
  async function advance() { for (let round = 0; round < 3; round++) { await flush(); frames.splice(0).forEach(callback => callback()); } await flush(); }
  function instance(id) { return { id, disposed: 0, dispose() { this.disposed++; }, debugSnapshot: () => ({ inputEnabled: true }) }; }
  return { context, window, mounts, calls, errors, elements, classes, apiReady, advance, flush, instance, listeners,
    open: () => vm.runInContext('open3DGallery()', context), close: () => vm.runInContext('close3DGallery()', context) };
}

test('等待API期间关闭再重开，只会给最后一次请求挂载展厅', async () => {
  const h = harness({ delayApi: true });
  const first = h.open(); await h.flush(); h.close(); const second = h.open();
  h.apiReady.resolve(h.window.CommunicationsHistory3D); await h.advance();
  assert.equal(h.mounts.length, 1);
  const current = h.instance('latest'); h.mounts[0].resolve(current); await Promise.all([first, second]);
  assert.equal(h.context.galleryInstance, current); assert.equal(h.context.galleryActive, true);
  assert.equal(h.elements['#galleryStatus'].hidden, true); assert.equal(h.window.viewerState.mode, '3d');
  assert.equal(h.errors.length, 0); assert.equal(current.disposed, 0);
});

test('旧mount迟到成功时只销毁旧实例，重开后新实例保持运行', async () => {
  const h = harness(); const first = h.open(); await h.advance();
  assert.equal(h.mounts.length, 1); h.close(); const second = h.open();
  const old = h.instance('old'); h.mounts[0].resolve(old); await h.advance();
  assert.equal(old.disposed, 1); assert.equal(h.mounts.length, 2);
  const current = h.instance('new'); h.mounts[1].resolve(current); await Promise.all([first, second]);
  assert.equal(h.context.galleryInstance, current); assert.equal(current.disposed, 0);
  assert.equal(h.context.app.hidden, true); assert.equal(h.elements['#archive3d'].hidden, false);
  assert.equal(h.errors.length, 0);
});

test('退出后旧初始化失败不会把二维页面重新切入错误提示', async () => {
  const h = harness(); const pending = h.open(); await h.advance(); h.close();
  h.mounts[0].reject(new Error('closed GPU')); await pending;
  assert.equal(h.window.viewerState.mode, '2d'); assert.equal(h.window.viewerState.status, 'ready');
  assert.equal(h.context.galleryActive, false); assert.equal(h.context.app.hidden, false);
  assert.equal(h.errors.length, 0);
});

test('当前展厅运行时错误会释放实例并恢复可见二维入口', async () => {
  const h = harness(); const pending = h.open(); await h.advance();
  const current = h.instance('active'); h.mounts[0].resolve(current); await pending;
  h.window.CommsArchive3DStatus = { reason: 'GPU context lost' };
  h.listeners.get('comms-archive-gallery-error')();
  assert.equal(current.disposed, 1); assert.equal(h.context.galleryInstance, null);
  assert.equal(h.context.galleryActive, false); assert.equal(h.context.app.hidden, false);
  assert.equal(h.window.viewerState.mode, 'fallback'); assert.equal(h.window.viewerState.status, 'failed');
  assert.equal(h.errors.length, 1); assert.equal(h.classes.has('gallery-open'), false);
});

test('时代校验失败时保留3D，成功进入章节后才关闭3D', () => {
  const entrySource = between('function enterSelectedEra(', 'function returnFromChapter(');
  for (const entered of [false, true]) {
    const calls = [];
    const context = vm.createContext({ eras: [{ id: '1G' }], galleryActive: true, window: {},
      enterEra(index) { calls.push(['enterEra', index]); return entered; }, close3DGallery(showPage) { calls.push(['close', showPage]); } });
    vm.runInContext(entrySource, context);
    assert.equal(vm.runInContext('enterSelectedEra(0)', context), entered);
    assert.deepEqual(calls, entered ? [['enterEra', 0], ['close', false]] : [['enterEra', 0]]);
  }
});
