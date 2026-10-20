const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

// Run the actual gallery with Three.js's real scene graph, raycasting and camera
// math. Only the DOM and GPU renderer are replaced, so these checks work in Node.
async function galleryHarness() {
  const root = path.resolve(__dirname, '..');
  const THREE = await import(pathToFileURL(path.join(root, 'vendor/three/build/three.module.js')).href);
  const events = [];
  const frames = new Map();
  const renderers = [];
  let frameId = 0, now = 0;
  const rect = { left: 0, top: 0, width: 1200, height: 800 };
  class Node {
    constructor() { this.listeners = new Map(); this.style = {}; this.isConnected = false; this.parentElement = null; this.clientWidth = rect.width; this.clientHeight = rect.height; }
    addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    emit(type, data = {}) { for (const listener of this.listeners.get(type) || []) listener({ type, preventDefault() {}, ...data }); }
    getBoundingClientRect() { return rect; }
    setAttribute() {}
    setPointerCapture() {}
    focus() { document.activeElement = this; }
    getContext(type) {
      if (type === 'webgl2') return { RENDERER: 1, getParameter: () => 'test renderer' };
      return { fillRect() {}, strokeRect() {}, fillText() {} };
    }
    replaceChildren(child) { this.child = child; child.parentElement = this; child.isConnected = true; }
    remove() { this.isConnected = false; if (this.parentElement?.child === this) this.parentElement.child = null; }
  }
  const document = { activeElement: null, createElement: () => new Node() };
  const container = new Node(); container.isConnected = true; container.id = 'threeMount'; container.parentElement = new Node();
  const window = new Node();
  Object.assign(window, { innerWidth: rect.width, innerHeight: rect.height, devicePixelRatio: 1, matchMedia: () => ({ matches: false }), dispatchEvent(event) { events.push(event); this.emit(event.type, event); } });
  class Renderer {
    constructor({ canvas }) { this.domElement = canvas; this.failNextFrame = false; renderers.push(this); }
    setPixelRatio() {}
    setSize(w, h) { this.domElement.width = w; this.domElement.height = h; }
    render(scene, camera) { if (this.failNextFrame) throw new Error('GPU failure'); this.scene = scene; this.camera = camera; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
    dispose() { this.disposed = true; }
    forceContextLoss() {}
  }
  const source = fs.readFileSync(path.join(root, 'assets/js/archive3d.js'), 'utf8')
    .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(path.join(root, 'assets/js/archive3d.js')).href))
    .replace('import(threeUrl)', 'Promise.resolve(THREE)');
  const context = vm.createContext({ window, document, navigator: {}, THREE: { ...THREE, WebGLRenderer: Renderer },
    console: { info() {}, error() {} }, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    performance: { now: () => now }, getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', zIndex: '0' }),
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; }, cancelAnimationFrame: id => frames.delete(id)
  });
  vm.runInContext(source, context);
  const eras = Array.from({ length: 6 }, (_, index) => ({ id: `${index + 1}G`, title: '测试展区', year: '2000', theme: '测试', color: '#63e8ff', exhibitIds: [`primary-${index}`, `left-${index}`, `right-${index}`] }));
  const selections = [];
  const options = { container, eras, onSelect: i => selections.push(i), onEnter: i => selections.push(i) };
  async function flush() { for (let i = 0; i < 5; i++) await Promise.resolve(); }
  async function step(time) { now = time; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); await flush(); }
  async function mount() { const pending = window.CommunicationsHistory3D.mount(options); await flush(); await step(now); return pending; }
  return { THREE, window, document, container, events, frames, renderers, options, selections, flush, step, mount };
}

test('六代主展品聚焦到各自展台，返回后还原原视角', async () => {
  const h = await galleryHarness(); const gallery = await h.mount();
  const original = gallery.debugSnapshot();
  for (let index = 0; index < 6; index++) {
    gallery.focusExhibit(index, `primary-${index}`);
    await h.step((index + 1) * 1000);
    const target = Array.from(gallery.debugSnapshot().cameraTarget);
    assert.ok(Math.abs(target[0] - (index % 2 ? 2.65 : -2.65)) < 0.001);
    assert.ok(Math.abs(target[1] - 1.15) < 0.001);
    assert.ok(Math.abs(target[2] - (2 - index * 13.5)) < 0.001, `${index + 1}G must focus on its own display`);
  }
  gallery.returnView(); await h.step(7000);
  assert.deepEqual(Array.from(gallery.debugSnapshot().cameraTarget), Array.from(original.cameraTarget));
  gallery.dispose();
});

test('1G至4G主手机屏幕朝向入口，不再被背面机壳遮挡', async () => {
  const h = await galleryHarness(); const gallery = await h.mount();
  const scene = h.renderers[0].scene;
  for (let index = 0; index < 4; index++) {
    let root;
    scene.traverse(object => { if (object.isGroup && object.userData.exhibitId === `primary-${index}`) root = object; });
    const screen = root.children.find(mesh => mesh.geometry?.type === 'BoxGeometry' && mesh.material.emissiveIntensity === 0.72);
    const center = screen.getWorldPosition(new h.THREE.Vector3());
    const ray = new h.THREE.Raycaster(center.clone().add(new h.THREE.Vector3(0, 0, 5)), new h.THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObjects(root.children, true)[0];
    assert.equal(hit.object.material, screen.material, `${index + 1}G front view reaches its screen before the body`);
  }
  gallery.dispose();
});

test('触屏双指缩放后取消一指，另一指仍可拖动且不会误选；鼠标点击可获得键盘焦点', async () => {
  const h = await galleryHarness(); const gallery = await h.mount(); const canvas = h.container.child;
  const touch = (pointerId, clientX, clientY) => ({ pointerId, clientX, clientY, pointerType: 'touch', button: 0, buttons: 1 });
  canvas.emit('pointerdown', touch(1, 100, 100)); canvas.emit('pointerdown', touch(2, 200, 100));
  canvas.emit('pointermove', touch(2, 240, 100)); canvas.emit('pointercancel', touch(1, 100, 100));
  const before = Array.from(gallery.debugSnapshot().cameraPosition);
  canvas.emit('pointermove', touch(2, 270, 100));
  assert.notDeepEqual(Array.from(gallery.debugSnapshot().cameraPosition), before, 'remaining finger still rotates camera');
  canvas.emit('pointerup', touch(2, 270, 100));
  assert.equal(gallery.debugSnapshot().activePointers, 0); assert.deepEqual(h.selections, []);
  canvas.emit('pointerdown', { ...touch(3, 20, 20), pointerType: 'mouse' });
  assert.equal(h.document.activeElement, canvas);
  canvas.emit('lostpointercapture', { pointerId: 3 });
  assert.equal(gallery.debugSnapshot().activePointers, 0);
  gallery.dispose();
});

test('方向键和缩放不会把摄像机移出封闭长廊而被墙壁或顶棚遮住', async () => {
  const h = await galleryHarness(); const gallery = await h.mount(); const canvas = h.container.child;
  for (const key of ['ArrowRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', '-', '+']) {
    for (let i = 0; i < 70; i++) {
      canvas.emit('keydown', { key });
      const [x, y, z] = gallery.debugSnapshot().cameraPosition;
      assert.ok(x >= -6.3 && x <= 6.3, `${key} must stay inside the side walls`);
      assert.ok(y >= 0.6 && y <= 9.1, `${key} must stay between floor and ceiling`);
      assert.ok(z >= -78 && z <= 10.5, `${key} must stay on the corridor floor`);
    }
  }
  gallery.dispose();
});

test('替换尚未出首帧的实例会结束旧mount，新实例正常就绪且不会继承选择', async () => {
  const h = await galleryHarness();
  const oldMount = h.window.CommunicationsHistory3D.mount(h.options);
  const oldRejected = assert.rejects(oldMount, /首帧|关闭|替代/);
  await h.flush();
  const currentMount = h.window.CommunicationsHistory3D.mount(h.options); await h.flush();
  await h.step(0);
  const gallery = await currentMount; await oldRejected;
  assert.equal(h.renderers[0].disposed, true); assert.equal(gallery.debugSnapshot().frameCount, 1);
  gallery.focusExhibit(4, 'primary-4'); gallery.dispose();
  const reopened = await h.mount();
  assert.equal(reopened.debugSnapshot().currentEra, null); assert.equal(reopened.debugSnapshot().currentExhibit, null);
  reopened.dispose();
});

test('公开dispose可取消首帧前的初始化，关闭后不会重新报告ready', async () => {
  const h = await galleryHarness();
  const pending = h.window.CommunicationsHistory3D.mount(h.options);
  const rejected = assert.rejects(pending, /首帧|关闭|替代/); await h.flush();
  h.window.CommunicationsHistory3D.dispose(); await rejected; await h.step(1000);
  assert.equal(h.frames.size, 0); assert.equal(h.container.child, null);
  assert.equal(h.window.CommsArchive3DStatus.status, 'idle');
  assert.equal(h.events.some(event => event.type === 'comms-archive-gallery-ready'), false);
});

test('GPU运行中渲染失败会停止动画、关闭输入并通知页面降级', async () => {
  const h = await galleryHarness(); const gallery = await h.mount();
  h.renderers[0].failNextFrame = true; await h.step(1000);
  assert.equal(h.window.CommsArchive3DStatus.status, 'failed');
  assert.equal(gallery.debugSnapshot().inputEnabled, false); assert.equal(h.frames.size, 0);
  assert.ok(h.events.some(event => event.type === 'comms-archive-gallery-error'));
  gallery.enter(0); assert.deepEqual(h.selections, []);
  gallery.dispose();
});

test('图形上下文丢失会结束首帧等待并明确失败', async () => {
  const h = await galleryHarness(); const pending = h.window.CommunicationsHistory3D.mount(h.options);
  const rejected = assert.rejects(pending, /图形上下文/); await h.flush();
  h.container.child.emit('webglcontextlost'); await rejected;
  assert.equal(h.frames.size, 0); assert.equal(h.container.child, null);
});
