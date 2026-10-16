/* Three.js gallery renderer for 通信简史. All exhibit meshes are original primitives. */
console.info('ARCHIVE3D_SCRIPT_START', { filename: import.meta.url });
console.info('ARCHIVE3D_LOAD_SUCCESS', { stage: 'module-evaluation' });
const threeUrl = '../../vendor/three/build/three.module.js';
let activeGallery = null;
let nextGalleryInstanceId = 0;
let activeInstanceId = 0;
let selectedIndex = null;
let selectedExhibitId = null;
let runtimeDiagnostics = { stage: 'module-evaluation', frameCount: 0, sceneObjects: 0, reason: null };

function reportRuntimeStage(stage, detail = {}) {
  runtimeDiagnostics = { ...runtimeDiagnostics, ...detail, stage, time: new Date().toISOString() };
  window.CommsArchive3DRuntime = { ...runtimeDiagnostics };
  console.info(`ARCHIVE3D_${stage}`, { ...runtimeDiagnostics });
  window.dispatchEvent(new CustomEvent('comms-archive-gallery-stage', { detail: { ...runtimeDiagnostics } }));
}

window.CommsArchive3DReady = false;
window.CommsArchive3DStatus = { status: 'loading', reason: null, stage: 'three-module-import', scriptLoaded: true, moduleReady: false, apiReady: false };
const threeModulePromise = import(threeUrl).then(THREE => {
  window.CommsArchive3DStatus = { ...window.CommsArchive3DStatus, status: 'ready', reason: null, stage: 'local-three-module', scriptLoaded: true, moduleReady: true, apiReady: true };
  console.info('ARCHIVE3D_THREE_MODULE_READY', { url: threeUrl });
  window.dispatchEvent(new CustomEvent('comms-archive-three-module-ready'));
  return THREE;
}).catch(error => {
  window.CommsArchive3DStatus = { ...window.CommsArchive3DStatus, status: 'failed', reason: error?.message || String(error), stage: 'local-three-module', scriptLoaded: true, moduleReady: true, apiReady: true };
  window.reportArchive3DScriptError?.(error, 'three-module-import', new URL(threeUrl, import.meta.url).href);
  console.error('ARCHIVE3D_THREE_MODULE_FAILED', window.CommsArchive3DStatus);
  window.dispatchEvent(new CustomEvent('comms-archive-three-module-error'));
  throw error;
});
// Mark the preload rejection as observed; mount() still receives and reports the original error.
threeModulePromise.catch(() => {});

window.CommunicationsHistory3D = {
  status: 'loading',
  async mount(options) {
    const instanceId = ++nextGalleryInstanceId;
    activeInstanceId = instanceId;
    console.info('ARCHIVE3D_INIT_START', { stage: 'renderer-create' });
    reportRuntimeStage('INIT_START', { instanceId, reason: null, frameCount: 0, sceneObjects: 0 });
    window.CommsArchive3DStatus = { ...window.CommsArchive3DStatus, status: 'loading', reason: null, stage: 'renderer-create', scriptLoaded: true, moduleReady: true, apiReady: true, instanceId, frameCount: 0, animationRunning: false };
    if (activeGallery) activeGallery.dispose();
    try {
      const THREE = await threeModulePromise;
      if (instanceId !== activeInstanceId) throw new Error(`展厅初始化实例 ${instanceId} 已被更新实例替代。`);
      reportRuntimeStage('THREE_CHECK', { instanceId, threeLoaded: !!THREE?.WebGLRenderer, threeRevision: THREE?.REVISION || null });
      activeGallery = createGallery(THREE, options, instanceId);
      if (!await activeGallery.firstFrameReady) throw new Error(runtimeDiagnostics.reason || 'Three.js 首帧未能完成渲染。');
      this.status = 'ready';
      window.CommsArchive3DStatus = { ...window.CommsArchive3DStatus, status: 'ready', reason: null, stage: 'first-frame-rendered', frameCount: activeGallery.debugSnapshot().frameCount, animationRunning: true };
      console.info('ARCHIVE3D_INIT_SUCCESS', { stage: 'first-frame-rendered', instanceId, frameCount: window.CommsArchive3DStatus.frameCount });
      reportRuntimeStage('READY', activeGallery.debugSnapshot());
      window.dispatchEvent(new CustomEvent('comms-archive-gallery-ready'));
      return activeGallery;
    } catch (error) {
      if (instanceId !== activeInstanceId) throw error;
      if (activeGallery && activeInstanceId === instanceId) {
        activeGallery.dispose();
        activeGallery = null;
      }
      this.status = 'failed';
      window.CommsArchive3DStatus = { ...window.CommsArchive3DStatus, status: 'failed', reason: error?.message || String(error), stage: 'renderer-create', instanceId, animationRunning: false };
      console.error('ARCHIVE3D_INIT_FAILED', window.CommsArchive3DStatus);
      reportRuntimeStage('FAILED', { reason: error?.message || String(error), error: error?.stack || String(error) });
      window.dispatchEvent(new CustomEvent('comms-archive-gallery-error'));
      throw error;
    }
  },
  enterSelected(index) {
    if (activeGallery && Number.isInteger(index)) activeGallery.enter(index);
  },
  debugSnapshot() {
    return activeGallery?.debugSnapshot?.() || { available: false, inputEnabled: false };
  }
};
window.CommsArchive3DReady = true;
window.CommsArchive3DStatus = { ...window.CommsArchive3DStatus, scriptLoaded: true, moduleReady: true, apiReady: true };
console.info('ARCHIVE3D_MODULE_READY', { stage: 'api-registered', apiReady: true });
window.dispatchEvent(new CustomEvent('comms-archive-three-module-registered'));
window.dispatchEvent(new CustomEvent('comms-archive-three-api-ready'));
console.info('ARCHIVE3D_SCRIPT_READY', { filename: import.meta.url, apiReady: typeof window.CommunicationsHistory3D.mount === 'function' });

function createGallery(THREE, { container, eras, onSelect, onEnter, onExhibit = () => {}, onHover = () => {} }, instanceId) {
  if (!container) throw new Error('3D展厅容器 #threeMount 不存在。');
  if (!Array.isArray(eras) || eras.length !== 6) throw new Error(`展厅时代资料应为六代，当前收到 ${eras?.length ?? 0} 项。`);
  const initialRect = container.getBoundingClientRect();
  reportRuntimeStage('CONTAINER_CHECK', { width: Math.round(initialRect.width), height: Math.round(initialRect.height), connected: container.isConnected });
  if (initialRect.width <= 0 || initialRect.height <= 0) throw new Error(`3D展厅容器尺寸无效：${Math.round(initialRect.width)}×${Math.round(initialRect.height)}。`);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  const narrowDevice = window.innerWidth < 700;
  const lowMemory = typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
  const lowPower = narrowDevice || lowMemory;
  const canvas = document.createElement('canvas');
  canvas.className = 'archive3d-canvas';
  canvas.style.display = 'block';
  canvas.style.visibility = 'visible';
  canvas.style.opacity = '1';
  canvas.style.filter = 'none';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '三维展厅。触屏单指拖动旋转、双指缩放、点击地面移动视角；键盘方向键旋转，加号和减号缩放，回车选择视线中央展品或展区。');
  reportRuntimeStage('CANVAS_CREATED', { canvasCreated: true });
  const gl = canvas.getContext('webgl2', { antialias: !lowPower, alpha: false, powerPreference: lowPower ? 'low-power' : 'high-performance' });
  if (!gl) throw new Error('当前浏览器或设备未提供 WebGL 2。请更新浏览器、启用图形加速，或继续使用二维网站。');
  reportRuntimeStage('WEBGL2_CONTEXT_CREATED', { webgl2: true, rendererString: gl.getParameter(gl.RENDERER) || 'unknown' });

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: !lowPower, powerPreference: lowPower ? 'low-power' : 'high-performance' });
  } catch (error) {
    throw new Error(`WebGL 2 初始化失败：${error.message || '图形设备不可用'}`);
  }
  reportRuntimeStage('RENDERER_CREATED', { rendererCreated: !!renderer, canvasMounted: false, width: Math.round(initialRect.width), height: Math.round(initialRect.height) });
  container.replaceChildren(canvas);
  reportRuntimeStage('CANVAS_MOUNTED', { canvasMounted: canvas.isConnected, parentId: canvas.parentElement?.id || null });
  renderer.setPixelRatio(lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  reportRuntimeStage('SCENE_CREATED', { sceneCreated: !!scene });
  scene.background = new THREE.Color('#07101f');
  // Keep enough atmospheric depth to shape the corridor without veiling the exhibits.
  scene.fog = new THREE.FogExp2('#0a1728', 0.0012);
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 260);
  reportRuntimeStage('CAMERA_CREATED', { cameraCreated: !!camera, cameraPosition: camera.position.toArray() });
  const target = new THREE.Vector3(0, 3.1, -31);
  let theta = 0;
  let phi = 1.54;
  let radius = 42;

  const hemi = new THREE.HemisphereLight('#9ccfff', '#101323', 1.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#b9dcff', 2.3);
  key.position.set(-6, 12, 8);
  scene.add(key);
  const floorMat = new THREE.MeshStandardMaterial({ color: '#142741', emissive: '#07182b', emissiveIntensity: 0.38, metalness: 0.38, roughness: 0.55 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#12233a', emissive: '#071528', emissiveIntensity: 0.3, metalness: 0.25, roughness: 0.62 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#4a6887', emissive: '#102840', emissiveIntensity: 0.26, metalness: 0.46, roughness: 0.42 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 92), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -34);
  scene.add(floor);
  const grid = new THREE.GridHelper(92, 46, '#275d7c', '#122b42');
  grid.position.set(0, 0.018, -34);
  grid.material.transparent = true;
  grid.material.opacity = 0.45;
  scene.add(grid);

  addBox(scene, THREE, [0, 10, -34], [14, 0.28, 92], wallMat);
  addBox(scene, THREE, [-7, 5, -34], [0.42, 10, 92], wallMat);
  addBox(scene, THREE, [7, 5, -34], [0.42, 10, 92], wallMat);
  for (const side of [-1, 1]) {
    addBox(scene, THREE, [side * 6.73, 5, -34], [0.08, 9.7, 92], trimMat);
    const guide = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.035, 88), new THREE.MeshBasicMaterial({ color: side < 0 ? '#54d5ed' : '#a98dff' }));
    guide.position.set(side * 1.0, 0.045, -34);
    scene.add(guide);
  }
  for (let z = 8; z >= -76; z -= 8) {
    addBox(scene, THREE, [0, 9.65, z], [13.8, 0.12, 0.16], trimMat);
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 5), new THREE.MeshBasicMaterial({ color: '#5398c8' }));
      strip.position.set(side * 6.05, 9.77, z - 3.8);
      scene.add(strip);
    }
  }
  const entryLight = new THREE.PointLight('#4edcff', 38, 35, 2);
  entryLight.position.set(0, 6, 7);
  scene.add(entryLight);

  const interactive = [];
  const animated = [];
  const labelTextures = [];
  const eraGroups = [];
  const exhibitRoots = [];
  const exhibitObjectRoots = new Map();
  eras.forEach((era, index) => {
    const group = new THREE.Group();
    group.userData.eraIndex = index;
    const x = index % 2 === 0 ? -2.65 : 2.65;
    const z = 2 - index * 13.5;
    const color = new THREE.Color(era.color);
    const lit = new THREE.PointLight(color, 22, 14, 2);
    lit.position.set(x, 4, z - 2.4);
    scene.add(lit);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.62, 0.24, 48), new THREE.MeshStandardMaterial({ color: '#17273c', metalness: 0.78, roughness: 0.3, emissive: color, emissiveIntensity: 0.1 }));
    base.position.set(x, 0.16, z);
    base.userData.eraIndex = index;
    group.add(base);
  const ringMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, metalness: 0.25, roughness: 0.26 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.095, 12, 72), ringMat);
    ring.position.set(x, 3.15, z - 0.75);
    group.add(ring);
    animated.push({ mesh: ring, index });
    const veil = new THREE.Mesh(new THREE.CircleGeometry(1.52, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
    veil.position.set(x, 3.15, z - 0.79);
    group.add(veil);
    const postGeo = new THREE.BoxGeometry(0.16, 4.9, 0.22);
    for (const postX of [x - 1.78, x + 1.78]) {
      const post = new THREE.Mesh(postGeo, new THREE.MeshStandardMaterial({ color: '#17273a', metalness: 0.75, roughness: 0.3, emissive: color, emissiveIntensity: 0.27 }));
      post.position.set(postX, 2.5, z - 0.72);
      group.add(post);
    }
    const header = new THREE.Mesh(new THREE.BoxGeometry(3.78, 0.14, 0.24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.75, metalness: 0.4, roughness: 0.3 }));
    header.position.set(x, 5.02, z - 0.72);
    group.add(header);
    const sign = makeSign(THREE, era, color);
    sign.position.set(x, 6.05, z - 0.66);
    group.add(sign);
    labelTextures.push(sign.material.map);
    const exhibitRoot = new THREE.Group();
    exhibitRoot.userData.eraIndex = index;
    exhibitRoot.userData.exhibitId = era.exhibitIds?.[0] || `exhibit.${era.id.toLowerCase()}.primary`;
    makeArtifact(THREE, exhibitRoot, era, index, x, z, color, animated);
    exhibitRoot.traverse(obj => { if (obj.isMesh) { obj.userData.isExhibit = true; obj.userData.exhibitId = exhibitRoot.userData.exhibitId; } });
    group.add(exhibitRoot);
    exhibitRoots.push(exhibitRoot);
    exhibitObjectRoots.set(exhibitRoot.userData.exhibitId, exhibitRoot);
    for (let slot = 1; slot < 3; slot++) {
      const sideRoot = new THREE.Group();
      const sideX = x + (slot === 1 ? -2.05 : 2.05);
      sideRoot.position.set(sideX, 0, z + 0.28);
      sideRoot.userData.eraIndex = index;
      sideRoot.userData.exhibitId = era.exhibitIds?.[slot] || `exhibit.${era.id.toLowerCase()}.display-${slot}`;
      makeSupplementalArtifact(THREE, sideRoot, index, slot, color, animated);
      sideRoot.traverse(obj => { if (obj.isMesh) { obj.userData.isExhibit = true; obj.userData.eraIndex = index; obj.userData.exhibitId = sideRoot.userData.exhibitId; } });
      group.add(sideRoot);
      exhibitObjectRoots.set(sideRoot.userData.exhibitId, sideRoot);
    }
    group.traverse(obj => { if (obj.isMesh) { obj.userData.eraIndex = index; interactive.push(obj); } });
    scene.add(group);
    eraGroups.push(group);
  });
  reportRuntimeStage('OBJECTS_CREATED', { sceneObjects: scene.children.length, eraGroups: eraGroups.length, interactiveObjects: interactive.length });

  function updateCamera() {
    const sinPhi = Math.sin(phi);
    camera.position.set(target.x + radius * sinPhi * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * sinPhi * Math.cos(theta));
    camera.lookAt(target);
  }
  updateCamera();
  reportRuntimeStage('CAMERA_POSITIONED', { cameraPosition: camera.position.toArray(), cameraAspect: camera.aspect });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const listenerCleanups = [];
  const originalEmissive = new Map();
  let pointerDown = null;
  let frame = 0;
  let disposed = false;
  let instanceFrameCount = 0;
  let lastTap = 0;
  let pinchDistance = 0;
  let hoveredEra = -1;
  let hoveredExhibitId = null;
  let cameraMotion = null;
  let savedView = null;
  const activePointers = new Map();
  const listen = (targetNode, type, handler, opts) => {
    targetNode.addEventListener(type, handler, opts);
    listenerCleanups.push(() => targetNode.removeEventListener(type, handler, opts));
  };
  const selectAt = (x, y) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactive, false).find(item => item.object.userData.eraIndex !== undefined);
    if (hit) {
      selectedIndex = hit.object.userData.eraIndex;
      if (hit.object.userData.isExhibit) {
        selectedExhibitId = hit.object.userData.exhibitId;
        window.InteractionDebugger?.record('EXHIBIT_SELECT', 'archive3d.selectAt', { eraIndex: selectedIndex, exhibitId: hit.object.userData.exhibitId });
        focusExhibit(selectedIndex, hit.object.userData.exhibitId);
        onExhibit(selectedIndex, hit.object.userData.exhibitId);
      } else {
        selectedExhibitId = null;
        window.InteractionDebugger?.record('ERA_CLICK', 'archive3d.selectAt', { eraId: eras[selectedIndex]?.id || null, eraIndex: selectedIndex, inputEnabled: !disposed });
        onSelect(selectedIndex);
        eraGroups.forEach((g, i) => g.scale.setScalar(i === selectedIndex ? 1.025 : 1));
      }
      return;
    }
    const groundHit = raycaster.intersectObject(floor, false)[0];
    if (groundHit) {
      window.InteractionDebugger?.record('GROUND_CLICK', 'archive3d.selectAt', { x, y, inputEnabled: !disposed });
      const point = groundHit.point;
      tweenView({
        target: new THREE.Vector3(THREE.MathUtils.clamp(point.x, -5.2, 5.2), 1.25, THREE.MathUtils.clamp(point.z, -78, 10)),
        theta, phi: 1.28, radius: 12
      }, reducedMotion ? 1 : 650);
    }
  };
  function setHovered(index, exhibitId = null) {
    if (hoveredEra === index && hoveredExhibitId === exhibitId) return;
    const oldRoot = hoveredExhibitId ? exhibitObjectRoots.get(hoveredExhibitId) : null;
    if (oldRoot) oldRoot.traverse(obj => {
      const materials = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
      materials.forEach(mat => { if (originalEmissive.has(mat)) mat.emissiveIntensity = originalEmissive.get(mat); });
    });
    hoveredEra = index;
    hoveredExhibitId = exhibitId;
    const nextRoot = exhibitId ? exhibitObjectRoots.get(exhibitId) : null;
    if (nextRoot) nextRoot.traverse(obj => {
      const materials = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
      materials.forEach(mat => {
        if (mat.emissive && 'emissiveIntensity' in mat) {
          if (!originalEmissive.has(mat)) originalEmissive.set(mat, mat.emissiveIntensity);
          mat.emissiveIntensity = Math.min(1.2, originalEmissive.get(mat) + 0.16);
        }
      });
    });
    onHover(hoveredEra, hoveredExhibitId);
  }
  function hoverAt(x, y) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactive, false).find(item => item.object.userData.isExhibit);
    if (!hit) { setHovered(-1); return; }
    const eraIndex = hit.object.userData.eraIndex;
    const exhibitId = hit.object.userData.exhibitId;
    const exhibitPosition = exhibitObjectRoots.get(exhibitId).getWorldPosition(new THREE.Vector3());
    setHovered(camera.position.distanceTo(exhibitPosition) < 9 ? eraIndex : -1, camera.position.distanceTo(exhibitPosition) < 9 ? exhibitId : null);
  }
  const viewSnapshot = () => ({ target: target.clone(), theta, phi, radius });
  function tweenView(to, duration = reducedMotion ? 1 : 850) {
    cameraMotion = { from: viewSnapshot(), to, start: performance.now(), duration };
  }
  function focusExhibit(index, exhibitId) {
    const root = (exhibitId && exhibitObjectRoots.get(exhibitId)) || exhibitRoots[index];
    if (!root) return;
    selectedIndex = index;
    selectedExhibitId = exhibitId || root.userData.exhibitId || null;
    if (!savedView) savedView = viewSnapshot();
    const position = root.getWorldPosition(new THREE.Vector3());
    tweenView({ target: new THREE.Vector3(position.x, position.y + 1.15, position.z), theta: 0.12, phi: 1.42, radius: 7.8 });
  }
  function returnView() {
    if (!savedView) return;
    const oldView = savedView;
    savedView = null;
    tweenView(oldView);
  }
  function updateViewMotion(ms) {
    if (!cameraMotion) return;
    const motion = cameraMotion;
    const t = THREE.MathUtils.clamp((ms - motion.start) / motion.duration, 0, 1);
    const eased = t * t * (3 - 2 * t);
    target.lerpVectors(motion.from.target, motion.to.target, eased);
    theta = motion.from.theta + (motion.to.theta - motion.from.theta) * eased;
    phi = motion.from.phi + (motion.to.phi - motion.from.phi) * eased;
    radius = motion.from.radius + (motion.to.radius - motion.from.radius) * eased;
    updateCamera();
    if (t >= 1) cameraMotion = null;
  }
  listen(canvas, 'pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 1) pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false };
    else if (pointerDown) pointerDown.moved = true;
    if (activePointers.size === 2) {
      const [a, b] = [...activePointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  listen(canvas, 'pointermove', event => {
    if (!activePointers.has(event.pointerId) || !pointerDown) {
      if (event.pointerType === 'mouse') hoverAt(event.clientX, event.clientY);
      return;
    }
    cameraMotion = null;
    const previous = activePointers.get(event.pointerId);
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size >= 2) {
      if (pointerDown) pointerDown.moved = true;
      const [a, b] = [...activePointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance && d) radius = THREE.MathUtils.clamp(radius + (pinchDistance - d) * 0.055, 6.5, 67);
      pinchDistance = d;
    } else if (event.buttons) {
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 4) pointerDown.moved = true;
      theta -= dx * 0.005;
      phi = THREE.MathUtils.clamp(phi + dy * 0.0045, 0.28, 2.82);
    }
    updateCamera();
  });
  listen(canvas, 'pointerup', event => {
    const wasSingleTap = activePointers.size === 1 && pointerDown && pointerDown.id === event.pointerId && !pointerDown.moved;
    activePointers.delete(event.pointerId);
    if (wasSingleTap) selectAt(event.clientX, event.clientY);
    if (!activePointers.size) { pointerDown = null; pinchDistance = 0; }
  });
  listen(canvas, 'pointercancel', event => { activePointers.delete(event.pointerId); pointerDown = null; pinchDistance = 0; });
  listen(canvas, 'wheel', event => { event.preventDefault(); cameraMotion = null; radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.025, 6.5, 67); updateCamera(); }, { passive: false });
  listen(canvas, 'keydown', event => {
    const step = event.shiftKey ? 0.22 : 0.1;
    if (event.key === 'ArrowLeft') theta -= step;
    else if (event.key === 'ArrowRight') theta += step;
    else if (event.key === 'ArrowUp') phi = THREE.MathUtils.clamp(phi - step, 0.28, 2.82);
    else if (event.key === 'ArrowDown') phi = THREE.MathUtils.clamp(phi + step, 0.28, 2.82);
    else if (event.key === '+' || event.key === '=') radius = THREE.MathUtils.clamp(radius - 2, 6.5, 67);
    else if (event.key === '-' || event.key === '_') radius = THREE.MathUtils.clamp(radius + 2, 6.5, 67);
    else if (event.key === 'Enter') { window.InteractionDebugger?.record('SELECT_ACTION', 'archive3d.canvas.keydown', { key: event.key, inputEnabled: !disposed }); const rect = canvas.getBoundingClientRect(); selectAt(rect.left + rect.width / 2, rect.top + rect.height / 2); event.preventDefault(); return; }
    else return;
    window.InteractionDebugger?.record('MOVE_ACTION', 'archive3d.canvas.keydown', { key: event.key, action: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) ? 'camera-rotate' : 'zoom', inputEnabled: !disposed });
    cameraMotion = null;
    updateCamera();
    event.preventDefault();
  });
  listen(window, 'resize', resize);
  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width <= 0 || height <= 0) {
      reportRuntimeStage('RESIZE_FAILED', { reason: `3D展厅尺寸无效：${width}×${height}。` });
      return;
    }
    renderer.setPixelRatio(lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  function visualDebugSnapshot() {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let meshCount = 0, lightCount = 0, visibleObjectCount = 0, visibleMeshCount = 0, frustumMeshCount = 0;
    const isVisible = object => { for (let current = object; current; current = current.parent) if (!current.visible) return false; return true; };
    scene.traverse(object => {
      const visible = isVisible(object);
      if (visible) visibleObjectCount++;
      if (object.isLight) lightCount++;
      if (object.isMesh) {
        meshCount++;
        if (visible) visibleMeshCount++;
        if (visible && frustum.intersectsObject(object)) frustumMeshCount++;
      }
    });
    return {
      cameraPosition: camera.position.toArray(),
      cameraLookAt: target.toArray(),
      cameraForward: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).toArray(),
      sceneChildren: scene.children.length,
      meshCount,
      lightCount,
      visibleObjectCount,
      visibleMeshCount,
      frustumMeshCount,
      eraGroups: eraGroups.map((group, index) => {
        const groupBounds = new THREE.Box3().setFromObject(group);
        let groupMeshes = 0;
        group.traverse(object => { if (object.isMesh) groupMeshes++; });
        return { era: eras[index]?.id || String(index), visible: group.visible, position: group.getWorldPosition(new THREE.Vector3()).toArray(), meshCount: groupMeshes, boundingBox: { min: groupBounds.min.toArray(), max: groupBounds.max.toArray() } };
      }),
      boundingBox: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray() },
      canvasSize: { width: renderer.domElement.width, height: renderer.domElement.height },
      canvasStyle: { display: getComputedStyle(canvas).display, visibility: getComputedStyle(canvas).visibility, opacity: getComputedStyle(canvas).opacity, zIndex: getComputedStyle(canvas).zIndex }
    };
  }
  reportRuntimeStage('VISUAL_DEBUG', visualDebugSnapshot());
  let resolveFirstFrame;
  const firstFrameReady = new Promise(resolve => { resolveFirstFrame = resolve; });
  let firstFrameRendered = false;
  function animate(ms) {
    if (disposed || instanceId !== activeInstanceId) return;
    frame = requestAnimationFrame(animate);
    const time = ms * 0.001;
    updateViewMotion(ms);
    if (!reducedMotion && !lowPower) animated.forEach(({ mesh, index }) => {
      mesh.scale.setScalar(1 + Math.sin(time * 1.1 + index) * 0.012);
    });
    try {
      renderer.render(scene, camera);
      instanceFrameCount += 1;
      runtimeDiagnostics.frameCount = instanceFrameCount;
      runtimeDiagnostics.instanceId = instanceId;
      runtimeDiagnostics.animationRunning = true;
      window.CommsArchive3DRuntime = { ...runtimeDiagnostics };
      if (window.CommsArchive3DStatus?.instanceId === instanceId) window.CommsArchive3DStatus.frameCount = instanceFrameCount;
      if (!firstFrameRendered) {
        firstFrameRendered = true;
        const canvasStyle = getComputedStyle(canvas);
        const galleryStyle = getComputedStyle(container.parentElement);
        const canvasRect = canvas.getBoundingClientRect();
        reportRuntimeStage('CANVAS_VISIBILITY_CHECK', {
          canvasMounted: canvas.isConnected,
          canvasSize: { width: Math.round(canvasRect.width), height: Math.round(canvasRect.height) },
          canvasVisibility: { display: canvasStyle.display, visibility: canvasStyle.visibility, opacity: canvasStyle.opacity, zIndex: canvasStyle.zIndex },
          galleryVisibility: { display: galleryStyle.display, visibility: galleryStyle.visibility, opacity: galleryStyle.opacity }
        });
        reportRuntimeStage('ANIMATION_STARTED', { instanceId, frameCount: instanceFrameCount, sceneObjects: scene.children.length, canvasMounted: canvas.isConnected });
        console.info('ARCHIVE3D_FRAME_1', { instanceId, frameCount: instanceFrameCount });
        resolveFirstFrame(true);
      }
      if (instanceFrameCount === 60) console.info('ARCHIVE3D_FRAME_60', { instanceId, frameCount: instanceFrameCount });
    } catch (error) {
      cancelAnimationFrame(frame);
      const reason = `渲染失败（第 ${instanceFrameCount + 1} 帧）：${error?.message || String(error)}`;
      runtimeDiagnostics.animationRunning = false;
      window.CommsArchive3DStatus = { ...window.CommsArchive3DStatus, status: 'failed', reason, stage: 'render', frameCount: instanceFrameCount, animationRunning: false };
      console.error('ARCHIVE3D_RENDER_FAILED', { instanceId, frameCount: instanceFrameCount, error: error?.stack || String(error) });
      reportRuntimeStage('FAILED', { instanceId, reason, error: error?.stack || String(error), frameCount: instanceFrameCount });
      resolveFirstFrame(false);
    }
  }
  console.info('ARCHIVE3D_ANIMATION_START', { instanceId, frameCount: instanceFrameCount });
  window.CommsArchive3DStatus = { ...window.CommsArchive3DStatus, instanceId, frameCount: instanceFrameCount, animationRunning: true };
  reportRuntimeStage('ANIMATION_START', { instanceId, frameCount: instanceFrameCount });
  frame = requestAnimationFrame(animate);
  return {
    firstFrameReady,
    enter(index) { if (Number.isInteger(index) && index >= 0 && index < eras.length) onEnter(index); },
    debugSnapshot() {
      const rect = canvas.getBoundingClientRect();
      const style = getComputedStyle(canvas);
      return { available: !disposed, inputEnabled: !disposed && canvas.isConnected, instanceId, canvasFocused: document.activeElement === canvas, cameraMoving: !!cameraMotion, cameraPosition: camera.position.toArray(), cameraRotation: camera.rotation.toArray(), cameraTarget: target.toArray(), playerPosition: null, currentEra: eras[selectedIndex]?.id || null, currentExhibit: selectedExhibitId, hoveredEraIndex: hoveredEra, hoveredExhibitId, activePointers: activePointers.size, sceneObjects: scene.children.length, cameraAspect: camera.aspect, frameCount: instanceFrameCount, animationRunning: !disposed && instanceId === activeInstanceId && !window.CommsArchive3DStatus?.reason, canvasMounted: canvas.isConnected, canvasSize: { width: Math.round(rect.width), height: Math.round(rect.height) }, canvasVisibility: { display: style.display, visibility: style.visibility, opacity: style.opacity, zIndex: style.zIndex } };
    },
    focusExhibit,
    returnView,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      if (window.CommsArchive3DStatus?.instanceId === instanceId) window.CommsArchive3DStatus.animationRunning = false;
      if (window.CommsArchive3DRuntime?.instanceId === instanceId) {
        runtimeDiagnostics.animationRunning = false;
        window.CommsArchive3DRuntime = { ...runtimeDiagnostics, animationRunning: false };
      }
      listenerCleanups.forEach(remove => remove());
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      });
      labelTextures.forEach(texture => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      if (activeGallery?.dispose === this.dispose) activeGallery = null;
    }
  };
}

function addBox(scene, THREE, position, size, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}

function makeSign(THREE, era, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#081226'; ctx.fillRect(0, 0, 768, 256);
  ctx.strokeStyle = `#${color.getHexString()}`; ctx.lineWidth = 5; ctx.strokeRect(8, 8, 752, 240);
  ctx.fillStyle = `#${color.getHexString()}`; ctx.font = '600 34px system-ui, sans-serif'; ctx.fillText(`${era.year}   /   ${era.id}`, 30, 66);
  ctx.fillStyle = '#eef6ff'; ctx.font = '700 66px system-ui, sans-serif'; ctx.fillText(era.title, 30, 156);
  ctx.fillStyle = '#9db4ce'; ctx.font = '26px system-ui, sans-serif'; ctx.fillText(era.id === '6G' ? '研究阶段 / 未来情境设计' : era.theme, 34, 211);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 1.25), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  sign.userData.eraIndex = era.id;
  return sign;
}

function makeSupplementalArtifact(THREE, root, eraIndex, slot, color, animated) {
  const dark = new THREE.MeshStandardMaterial({ color: '#162a42', metalness: 0.62, roughness: 0.34, emissive: color, emissiveIntensity: 0.1 });
  const bright = new THREE.MeshStandardMaterial({ color: '#c5dbe8', metalness: 0.72, roughness: 0.28 });
  const glass = new THREE.MeshStandardMaterial({ color: '#071426', metalness: 0.28, roughness: 0.2, emissive: color, emissiveIntensity: 0.34 });
  const gold = new THREE.MeshStandardMaterial({ color: '#c79e5a', metalness: 0.72, roughness: 0.3 });
  const mesh = (geometry, material, position) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(position[0], position[1], position[2]);
    root.add(object);
    return object;
  };
  mesh(new THREE.CylinderGeometry(0.74, 0.82, 0.16, 32), dark, [0, 0.08, 0]);
  mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.9, 10), bright, [0, 1.12, 0]);
  const accent = mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), glass, [0, 2.15, 0]);

  if (eraIndex === 2 && slot === 2) { // 3G：原创无线接入设备塔架示意，不对应真实基站型号
    mesh(new THREE.BoxGeometry(0.16, 1.58, 0.16), bright, [-0.28, 1.03, 0]);
    mesh(new THREE.BoxGeometry(0.16, 1.58, 0.16), bright, [0.28, 1.03, 0]);
    for (const y of [0.48, 0.92, 1.36, 1.8]) {
      mesh(new THREE.BoxGeometry(0.72, 0.075, 0.11), dark, [0, y, 0]);
      mesh(new THREE.BoxGeometry(0.075, 0.48, 0.11), bright, [-0.17, y, 0]);
      mesh(new THREE.BoxGeometry(0.075, 0.48, 0.11), bright, [0.17, y, 0]);
    }
    mesh(new THREE.BoxGeometry(0.9, 0.12, 0.2), glass, [0, 2.0, 0]);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.56, 10), bright, [0, 2.34, 0]);
    for (const side of [-1, 1]) {
      const dish = mesh(new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass, [side * 0.48, 1.56, 0.08]);
      dish.rotation.z = side * -0.24;
    }
  } else if (eraIndex === 0) {
    for (const y of [1.58, 1.92]) mesh(new THREE.BoxGeometry(0.76, 0.055, 0.08), bright, [0, y, 0]);
    for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(0.055, 0.42, 0.08), bright, [side * 0.34, 1.74, 0]);
  } else if (eraIndex === 1) {
    mesh(new THREE.BoxGeometry(0.86, 0.12, 0.64), gold, [0, 1.18, 0]);
    mesh(new THREE.BoxGeometry(0.62, 0.08, 0.42), dark, [0, 1.27, 0]);
    for (let i = -2; i <= 2; i++) {
      mesh(new THREE.BoxGeometry(0.08, 0.07, 0.12), gold, [i * 0.13, 1.13, 0.37]);
      mesh(new THREE.BoxGeometry(0.08, 0.07, 0.12), gold, [i * 0.13, 1.13, -0.37]);
    }
  } else if (eraIndex === 2 || eraIndex === 3) {
    mesh(new THREE.BoxGeometry(0.98, 1.12, 0.13), dark, [0, 1.36, 0]);
    mesh(new THREE.BoxGeometry(0.82, 0.86, 0.035), glass, [0, 1.38, 0.085]);
    for (let row = 0; row < 3; row++) mesh(new THREE.BoxGeometry(0.61, 0.055, 0.025), row === 1 ? bright : dark, [0, 1.65 - row * 0.18, 0.11]);
    if (eraIndex === 3) {
      const play = mesh(new THREE.ConeGeometry(0.2, 0.35, 3), bright, [0, 1.28, 0.15]);
      play.rotation.z = -Math.PI / 2;
    }
  } else if (eraIndex === 4) {
    mesh(new THREE.BoxGeometry(0.72, 0.2, 0.65), dark, [0, 1.0, 0]);
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 20), bright, [0, 1.2, 0]);
    mesh(new THREE.BoxGeometry(0.24, 0.6, 0.24), dark, [0.12, 1.55, 0]);
    mesh(new THREE.SphereGeometry(0.19, 16, 12), bright, [0.12, 1.9, 0]);
    mesh(new THREE.BoxGeometry(0.48, 0.1, 0.2), dark, [0.37, 2.02, 0]);
  } else {
    const buildings = [[-0.32, 0.78, 0.28], [0.12, 1.08, 0.3], [0.48, 0.62, 0.24]];
    buildings.forEach(([x, h, w], i) => {
      const building = mesh(new THREE.BoxGeometry(w, h, 0.28), i === 1 ? glass : dark, [x, 0.3 + h / 2, 0]);
      building.material.wireframe = true;
    });
    const ring = mesh(new THREE.TorusGeometry(0.68, 0.025, 8, 48), glass, [0, 1.45, 0]);
    ring.rotation.x = Math.PI / 2;
    animated.push({ mesh: ring, index: eraIndex });
  }
  accent.userData.eraIndex = eraIndex;
}

function makeArtifact(THREE, group, era, index, x, z, color, animated) {
  const body = new THREE.MeshStandardMaterial({ color: '#162b43', metalness: 0.68, roughness: 0.29, emissive: color, emissiveIntensity: 0.11 });
  const screen = new THREE.MeshStandardMaterial({ color: '#07101e', metalness: 0.27, roughness: 0.2, emissive: color, emissiveIntensity: 0.72 });
  const pale = new THREE.MeshStandardMaterial({ color: '#bdd7e6', metalness: 0.78, roughness: 0.23 });
  const mesh = (geometry, material, pos, scale) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(pos[0] + x, pos[1], pos[2] + z);
    if (scale) m.scale.set(...scale);
    group.add(m);
    m.userData.eraIndex = index;
    return m;
  };
  const box = (w, h, d, mat, pos, r = 0.04) => mesh(new THREE.BoxGeometry(w, h, d), mat, pos);
  if (index === 0) { // 1G: early portable analog handset with antenna
    box(0.86, 1.62, 0.43, body, [0, 1.12, 0.14]); box(0.58, 0.36, 0.08, screen, [0, 1.47, -0.105]);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12), pale, [(col - 1) * 0.19, 0.93 - row * 0.18, -0.11]);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.86, 10), pale, [0.26, 2.28, 0.18]);
  } else if (index === 1) { // 2G: compact digital handset and message bars
    box(0.76, 1.72, 0.34, body, [0, 1.08, 0.12]); box(0.56, 0.37, 0.055, screen, [0, 1.42, -0.08]);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.045, 10), pale, [(col - 1) * 0.17, 0.93 - row * 0.15, -0.08]);
    for (let i = 0; i < 3; i++) box(0.24 + i * 0.08, 0.035, 0.035, screen, [0.58, 2.08 + i * 0.17, 0.05]);
  } else if (index === 2) { // 3G: web browser handset
    box(0.98, 1.92, 0.3, pale, [0, 1.18, 0.14]); box(0.83, 1.52, 0.06, screen, [0, 1.25, -0.04]);
    box(0.68, 0.13, 0.035, body, [0, 1.83, -0.004]);
    for (let i = 0; i < 4; i++) { box(0.65, 0.07, 0.025, i === 2 ? body : pale, [0, 1.57 - i * 0.19, -0.002]); }
    mesh(new THREE.SphereGeometry(0.09, 16, 12), screen, [0, 0.21, -0.02]);
  } else if (index === 3) { // 4G: smartphone plus streaming screen
    box(0.9, 1.75, 0.25, pale, [0, 1.0, 0.25]); box(0.77, 1.48, 0.04, screen, [0, 1.02, 0.11]);
    const panel = box(1.55, 1.02, 0.13, body, [1.35, 1.45, 0.15]); box(1.34, 0.78, 0.04, screen, [1.35, 1.48, 0.075]);
    mesh(new THREE.ConeGeometry(0.23, 0.35, 3), pale, [1.35, 1.48, 0.035]).rotation.z = -Math.PI / 2;
  } else if (index === 4) { // 5G: industrial arm made of articulated primitives
    box(1.4, 0.28, 1.05, body, [0, 0.39, 0.25]);
    const joint1 = mesh(new THREE.CylinderGeometry(0.33, 0.38, 0.28, 20), pale, [0, 0.68, 0.25]);
    const arm1 = box(0.28, 1.04, 0.31, body, [0, 1.25, 0.25]); arm1.rotation.z = -0.3;
    mesh(new THREE.SphereGeometry(0.24, 20, 14), pale, [0.28, 1.76, 0.25]);
    const arm2 = box(0.23, 0.86, 0.26, body, [0.52, 2.12, 0.25]); arm2.rotation.z = 0.37;
    mesh(new THREE.BoxGeometry(0.54, 0.16, 0.34), pale, [0.78, 2.51, 0.25]);
    animated.push({ mesh: joint1, index, pivot: true });
  } else { // 6G research concept: digital twin city with sensor links
    const buildings = [[-.86,.54,.48,.72],[-.26,.94,.56,1.08],[.42,.62,.45,.8],[.94,1.02,.5,1.28]];
    buildings.forEach(([bx,by,bz,bh], n) => {
      const b = box(0.48, bh, 0.42, n % 2 ? screen : body, [bx, bh / 2 + 0.42, bz]);
      for (let w = 0; w < 3; w++) box(0.055, 0.055, 0.025, pale, [bx - 0.1 + (w % 2) * 0.19, 0.5 + Math.floor(w / 2) * 0.18, bz - 0.22]);
      mesh(new THREE.SphereGeometry(0.085, 12, 8), pale, [bx, bh + 0.57, bz]);
    });
    for (let n = 0; n < 3; n++) {
      const node = mesh(new THREE.IcosahedronGeometry(0.18, 1), screen, [(n - 1) * 0.84, 2.7 + (n % 2) * 0.5, -0.5]);
      animated.push({ mesh: node, index, float: true });
    }
  }
  const bob = group.children.filter(child => child.userData.eraIndex === index);
  bob.forEach(item => { if (item.isMesh && item.geometry.type === 'TorusGeometry') item.userData.portal = true; });
  void era;
}
