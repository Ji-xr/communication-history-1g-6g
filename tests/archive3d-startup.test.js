const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rootDir = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(rootDir, file), 'utf8');

function extractWaitFunction() {
  const source = read('app.js');
  const start = source.indexOf('function waitFor3DViewer(');
  const end = source.indexOf('\nfunction open3DGallery(', start);
  assert.ok(start >= 0 && end > start, '3D API wait helper remains available');
  const window = { listeners: new Map(), addEventListener(type, listener) { this.listeners.set(type, listener); }, removeEventListener(type) { this.listeners.delete(type); }, dispatchEvent(event) { this.listeners.get(event.type)?.(); } };
  const document = { querySelector() { return { src: 'http://127.0.0.1/assets/js/archive3d.js' }; } };
  const context = vm.createContext({ window, document, console: { info() {}, error() {} }, setTimeout, clearTimeout, Date, Promise });
  vm.runInContext(source.slice(start, end) + '\nglobalThis.waitFor3DViewer = waitFor3DViewer;', context);
  return { wait: context.waitFor3DViewer, window };
}

test('三维源码与依赖保留，正式页面不加载三维模块', () => {
  const html = read('index.html'); const script = read('assets/js/archive3d.js');
  assert.ok(fs.existsSync(path.join(rootDir, 'assets/js/archive3d.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'vendor/three/build/three.module.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'vendor/three/build/three.core.js')));
  assert.doesNotMatch(html, /<script[^>]+type="module"[^>]+src="assets\/js\/archive3d\.js"/);
  assert.match(html, /COMMS_ARCHIVE_3D_DISABLED=true/);
  assert.match(script, /import\(threeUrl\)/);
  assert.match(script, /ARCHIVE3D_SCRIPT_START/);
});

test('API已注册时等待辅助函数立即返回展厅接口', async () => {
  const api = { mount() {} }; const h = extractWaitFunction(); h.window.CommunicationsHistory3D = api;
  assert.equal(await h.wait(20), api);
});

test('等待器可通过模块注册事件取得API并清理监听', async () => {
  const h = extractWaitFunction(); const promise = h.wait(500); const api = { mount() {} }; h.window.CommunicationsHistory3D = api;
  h.window.dispatchEvent({ type: 'comms-archive-three-api-ready' });
  assert.equal(await promise, api); assert.equal(h.window.listeners.size, 0);
});
