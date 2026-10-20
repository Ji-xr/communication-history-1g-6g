const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(rootDir, file), 'utf8');

class FakeNode {
  constructor() { this.hidden = false; this.children = []; this.listeners = {}; this.classList = { toggle() {} }; }
  setAttribute() {}
  addEventListener(type, listener) { this.listeners[type] = listener; }
  append(...nodes) { this.children.push(...nodes); }
  querySelector() { return new FakeNode(); }
}

function makeExistingContentContext() {
  const document = {
    readyState: 'complete', body: new FakeNode(),
    querySelector(selector) { return selector === '#app' ? {} : null; },
    createElement(tag) {
      if (tag !== 'canvas') return new FakeNode();
      return { getContext(kind) { return kind === 'webgl2' ? { getExtension() { return { loseContext() {} }; } } : null; } };
    }
  };
  const store = new Map();
  const localStorage = { setItem(key, value) { store.set(key, String(value)); }, getItem(key) { return store.get(key) ?? null; }, removeItem(key) { store.delete(key); } };
  const eventListeners = new Map();
  const window = {
    document, localStorage, render() {}, CommsArchiveApp: { status: 'ready', reason: null },
    CommsArchiveLan: { trigger() {}, onTaskStart() {} }, viewerState: { mode: '2d', status: 'ready' },
    CommunicationsHistory3D: { mount() {} }, CommsArchive3DStatus: { status: 'ready', stage: 'local-three-module' },
    addEventListener(type, fn) { eventListeners.set(type, fn); }, dispatchEvent(event) { eventListeners.get(event.type)?.(event); }
  };
  const context = vm.createContext({ window, document, localStorage, console, Event, setTimeout() { return 1; } });

  const appLines = read('app.js').split(/\r?\n/);
  const eraEnd = appLines.findIndex((line, index) => index > 0 && line === '];');
  const hallStart = appLines.findIndex(line => line.startsWith('const hallDeepening='));
  const hallEnd = appLines.findIndex((line, index) => index > hallStart && line === '};');
  assert.ok(eraEnd >= 0 && hallStart > eraEnd && hallEnd > hallStart, 'app.js仍包含原始eras与hallDeepening数据');
  vm.runInContext(`${appLines.slice(0, 12).join('\n')}\nglobalThis.__eraCount=eras.length;`, context);
  vm.runInContext(`${appLines.slice(hallStart, hallEnd + 1).join('\n')}\nglobalThis.__hallCount=Object.keys(hallDeepening).length;`, context);
  vm.runInContext(read('assets/js/content-model.js'), context);
  vm.runInContext(read('assets/js/runtime-content.js'), context);

  for (const file of ['assets/js/era-archive-3g.js', 'assets/js/era-archive-4g.js', 'assets/js/era-archive-5g.js', 'assets/js/era-archive-6g.js']) vm.runInContext(read(file), context);
  vm.runInContext(read('assets/js/system-health-check.js'), context);
  return { window, context };
}

test('从app.js现有六代正文注册旧页面兼容数据与统一内容查询模型', () => {
  const { window, context } = makeExistingContentContext();
  assert.equal(context.__eraCount, 6);
  assert.equal(context.__hallCount, 6);
  assert.equal(window.CommsArchiveRuntimeContentStatus.status, 'ready');
  assert.equal(window.CommsArchiveContent.eras.length, 6);
  assert.equal(window.CommsArchiveContent.checkCompleteness().ok, true, window.CommsArchiveContent.checkCompleteness().errors.join('\n'));
  assert.equal(Object.keys(window.mediaAssets).length, 6);
  assert.equal(Object.keys(window.exhibitLinks).length, 6);
  assert.equal(Object.keys(window.technicalNotes).length, 6);
  assert.equal(window.CommsArchiveContent.getTask('task.3g.investigation').era, '3G');
  assert.equal(window.CommsArchiveContent.getExhibit('exhibit.5g.factory').era, '5G');
  for (const era of ['1G', '2G', '3G', '4G', '5G']) {
    assert.ok(fs.existsSync(path.join(rootDir, window.mediaAssets[era].photo)), `${era}馆藏图像路径有效`);
    assert.match(window.mediaAssets[era].photoSource, /^https:\/\/commons\.wikimedia\.org\//);
  }
  assert.equal(window.mediaAssets['6G'].photo, null, '6G继续使用已标注的CSS未来情境，不伪装成历史照片');
});

test('启动检查定位实际模块状态，区分三维接口就绪与首帧验证', () => {
  const { window } = makeExistingContentContext();
  const lan = window.CommsArchiveLan;
  window.CommsArchiveLan = { ...lan, trigger() {}, onTaskStart() {} };
  window.CommsArchiveApp = { status: 'ready', reason: null };
  window.render = () => {};
  window.ArchiveEvidence6G = [{ id: 'evidence_6g_delay' }];
  const result = window.SystemHealthCheck.inspect();
  assert.equal(result.ok, true, JSON.stringify(result.checks));
  assert.deepEqual(Array.from(result.checks, check => check.module), [
    'app.js', 'lan-system.js', 'runtime-content.js', 'era-archive-data', '2D exhibition', 'localStorage'
  ]);
  assert.equal(result.checks.find(check => check.module === 'runtime-content.js').status, 'ready');
  assert.equal(result.checks.find(check => check.module === '2D exhibition').status, 'ready');
  assert.match(result.checks.find(check => check.module === '2D exhibition').detail, /接口已注册/);
  assert.match(result.checks.find(check => check.module === '2D exhibition').detail, /首帧.*进入长廊时验证/);
});

test('三维启动检查如实报告加载中、模块失败、首帧完成和显式二维配置', () => {
  const { window } = makeExistingContentContext();
  const exhibition = () => window.SystemHealthCheck.inspect().checks.find(check => check.module === '2D exhibition');
  delete window.CommunicationsHistory3D;
  window.CommsArchive3DStatus = { status: 'loading', stage: 'startup' };
  assert.equal(exhibition().status, 'pending');
  window.CommsArchive3DStatus = { status: 'failed', reason: 'module unavailable' };
  const failed = exhibition();
  assert.equal(failed.status, 'ready', '三维失败时二维内容仍可用');
  assert.equal(failed.note, true);
  assert.equal(failed.reason, 'module unavailable');
  window.CommunicationsHistory3D = { mount() {} };
  window.CommsArchive3DStatus = { status: 'ready', stage: 'first-frame-rendered' };
  assert.match(exhibition().detail, /已完成首帧/);
  window.COMMS_ARCHIVE_3D_DISABLED = true;
  assert.equal(exhibition().status, 'ready');
  assert.match(exhibition().detail, /配置关闭/);
});

test('index.html加载独立体验和健康检查，不加载三维模块', () => {
  const html = read('index.html');
  const app = html.indexOf('src="app.js"');
  const runtime = html.indexOf('src="assets/js/runtime-content.js"');
  const health = html.indexOf('src="assets/js/system-health-check.js"');
  assert.ok(app >= 0 && runtime > app && health > runtime);
  assert.match(html, /COMMS_ARCHIVE_3D_DISABLED=true/);
  assert.match(html, /COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED=false/);
  assert.doesNotMatch(html, /<script[^>]+type="module"[^>]+src="assets\/js\/archive3d\.js"/);
  assert.match(html, /<script[^>]+src="assets\/js\/experience-interactions\.js"/);
  assert.match(html, /<script[^>]+src="assets\/js\/experience-1g-phone\.js"/);
  assert.doesNotMatch(html, /<script[^>]+src="assets\/js\/[56]g-archive-ui/);
  assert.ok(fs.existsSync(path.join(rootDir, 'assets/js/experience-story-1g.js')));
});

test('三维默认启动状态为idle，实际模块负责登记加载与错误状态', () => {
  const html = read('index.html');
  assert.match(html, /status:'idle',mode:'2d',stage:'startup'/);
  const source = read('assets/js/archive3d.js');
  assert.match(source, /comms-archive-three-module-error/);
  assert.match(source, /CommsArchive3DStatus/);
});
