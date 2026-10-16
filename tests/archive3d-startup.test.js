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
  assert.ok(start >= 0 && end > start, 'legacy 3D API wait helper remains available for restoration');
  const window = { listeners: new Map(), addEventListener(type, listener) { this.listeners.set(type, listener); }, removeEventListener(type) { this.listeners.delete(type); }, dispatchEvent(event) { this.listeners.get(event.type)?.(); } };
  const document = { querySelector() { return { src: 'http://127.0.0.1/assets/js/archive3d.js' }; } };
  const context = vm.createContext({ window, document, console: { info() {}, error() {} }, setTimeout, clearTimeout, Date, Promise });
  vm.runInContext(source.slice(start, end) + '\nglobalThis.waitFor3DViewer = waitFor3DViewer;', context);
  return { wait: context.waitFor3DViewer, window };
}

test('比赛首页不加载Three.js，原模块与依赖文件仍保留', () => {
  const html = read('index.html'); const script = read('assets/js/archive3d.js');
  assert.ok(fs.existsSync(path.join(rootDir, 'assets/js/archive3d.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'vendor/three/build/three.module.js')));
  assert.ok(fs.existsSync(path.join(rootDir, 'vendor/three/build/three.core.js')));
  assert.doesNotMatch(html, /<script[^>]+type="module"[^>]+archive3d\.js/);
  assert.match(html, /COMMS_ARCHIVE_3D_DISABLED=true/);
  assert.match(script, /import\(threeUrl\)/);
  assert.match(script, /ARCHIVE3D_SCRIPT_START/);
});

test('旧API等待辅助函数仍可用于未来恢复', async () => {
  const api = { mount() {} }; const h = extractWaitFunction(); h.window.CommunicationsHistory3D = api;
  assert.equal(await h.wait(20), api);
});

test('等待器仍可通过旧模块注册事件取得API', async () => {
  const h = extractWaitFunction(); const promise = h.wait(500); const api = { mount() {} }; h.window.CommunicationsHistory3D = api;
  h.window.dispatchEvent({ type: 'comms-archive-three-api-ready' });
  assert.equal(await promise, api); assert.equal(h.window.listeners.size, 0);
});
