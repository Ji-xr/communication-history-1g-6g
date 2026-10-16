const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const helperSource = fs.readFileSync('assets/js/viewer-state.js', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');
const htmlSource = fs.readFileSync('index.html', 'utf8');

function createFlow() {
  const window = {};
  vm.runInNewContext(helperSource, { window, Promise, String });
  return window;
}

test('3D成功进入后状态为3D ready，继续探索沿用当前展厅', async () => {
  const window = createFlow();
  const result = await window.CommsArchiveViewerFlow.initialize(async () => ({ mounted: true }));
  let went3D = false;
  let went2D = false;
  window.CommsArchiveViewerFlow.continueExploring(() => { went3D = true; }, () => { went2D = true; });
  assert.equal(result.ok, true);
  assert.deepEqual({ ...window.viewerState }, { mode: '3d', status: 'ready', error: null });
  assert.equal(went3D, true);
  assert.equal(went2D, false);
});

test('3D初始化失败进入fallback，继续探索调用二维入口', async () => {
  const window = createFlow();
  const result = await window.CommsArchiveViewerFlow.initialize(async () => { throw new Error('WebGL unavailable'); });
  let fallbackState;
  window.CommsArchiveViewerFlow.continueExploring(null, state => { fallbackState = { ...state }; });
  assert.equal(result.ok, false);
  assert.equal(window.viewerState.mode, 'fallback');
  assert.equal(window.viewerState.status, 'failed');
  assert.match(window.viewerState.error, /WebGL unavailable/);
  assert.equal(fallbackState.mode, 'fallback');
});

test('并发点击只执行一次3D初始化，失败后可以回到二维ready', async () => {
  const window = createFlow();
  let starts = 0;
  let release;
  const pending = window.CommsArchiveViewerFlow.initialize(() => {
    starts += 1;
    return new Promise((resolve, reject) => { release = () => reject(new Error('module failed')); });
  });
  const duplicate = window.CommsArchiveViewerFlow.initialize(() => { starts += 1; });
  assert.equal(starts, 0); // initialize schedules start in a microtask
  await Promise.resolve();
  assert.equal(starts, 1);
  release();
  await Promise.all([pending, duplicate]);
  window.CommsArchiveViewerFlow.continueExploring(null, () => window.CommsArchiveViewerFlow.set('2d', 'ready'));
  assert.deepEqual({ ...window.viewerState }, { mode: '2d', status: 'ready', error: null });
});

test('刷新重新加载控制器不会继承失败状态，也不接触存档数据', async () => {
  const window = createFlow();
  await window.CommsArchiveViewerFlow.initialize(() => Promise.reject(new Error('temporary failure')));
  const refreshedWindow = createFlow();
  assert.deepEqual({ ...refreshedWindow.viewerState }, { mode: '2d', status: 'ready', error: null });
  assert.doesNotMatch(helperSource, /localStorage|commsArchive/);
});

test('页面加载viewer状态控制器后，app的继续探索和异常流程已接通', () => {
  assert.ok(htmlSource.indexOf('assets/js/viewer-state.js') < htmlSource.indexOf('src="app.js"'));
  assert.match(appSource, /function waitFor3DViewer\(/);
  assert.match(appSource, /function open3DGallery\(\)[\s\S]*?CommsArchiveViewerFlow\.initialize/);
  assert.match(appSource, /function show3DError\(error\)[\s\S]*?onclick="continueExploring\(\)"/);
  assert.match(appSource, /function continueExploring\(\)[\s\S]*?enterEra\(index\)/);
  assert.match(appSource, /function guidedChapter\(\)[\s\S]*?progress=state\.tasks\[e\.id\]\|\|\{\}[\s\S]*?progress\.repair/);
  assert.match(appSource, /onEnter:i=>beginEraTravel\(i,true\)/);
  assert.match(appSource, /progression\.enterEra\(eras\[i\]\.id\)/);
});
