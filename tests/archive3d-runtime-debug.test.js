const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const viewer = fs.readFileSync('assets/js/archive3d.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('assets/css/gallery3d.css', 'utf8');

test('展厅运行时暴露初始化、WebGL、场景、摄像机、挂载、物件和首帧阶段', () => {
  for (const stage of [
    'INIT_START', 'THREE_CHECK', 'CONTAINER_CHECK', 'WEBGL2_CONTEXT_CREATED',
    'RENDERER_CREATED', 'CANVAS_MOUNTED', 'SCENE_CREATED', 'CAMERA_CREATED',
    'CAMERA_POSITIONED', 'OBJECTS_CREATED', 'CANVAS_VISIBILITY_CHECK', 'ANIMATION_STARTED', 'READY', 'FAILED'
  ]) assert.match(viewer, new RegExp(`reportRuntimeStage\\('${stage}'`), `missing ${stage} diagnostic`);
  assert.match(viewer, /window\.CommsArchive3DRuntime/);
  assert.match(viewer, /window\.dispatchEvent\(new CustomEvent\('comms-archive-gallery-stage'/);
});

test('展厅只有在容器尺寸有效且首帧渲染完成后才标记ready', () => {
  assert.match(viewer, /container\.getBoundingClientRect\(\)/);
  assert.match(viewer, /initialRect\.width <= 0 \|\| initialRect\.height <= 0/);
  assert.match(viewer, /resize\(\);[\s\S]*?let resolveFirstFrame/);
  assert.match(viewer, /if \(!await activeGallery\.firstFrameReady\) throw/);
  assert.match(viewer, /renderer\.render\(scene, camera\)/);
  assert.match(viewer, /frameCount: instanceFrameCount/);
});

test('场景快照包含canvas挂载、尺寸、可见性、摄像机和场景对象数量', () => {
  for (const field of ['canvasMounted', 'canvasSize', 'canvasVisibility', 'cameraPosition', 'cameraAspect', 'sceneObjects', 'frameCount']) {
    assert.match(viewer, new RegExp(`${field}:`), `missing snapshot field ${field}`);
  }
  assert.match(css, /#threeMount,.archive3d-canvas[^}]*width:100%;height:100%/);
  assert.match(css, /#archive3d\[hidden\][^{]*\{display:none!important\}/);
});

test('首页3D入口连接open3DGallery并在挂载成功后记录READY状态', () => {
  assert.match(app, /function open3DGallery\(\)[\s\S]*?CommsArchiveViewerFlow\.initialize/);
  assert.match(app, /viewer\.mount\(options\)/);
  assert.match(app, /galleryInstance=result\.value;status\.hidden=true/);
  assert.match(viewer, /window\.dispatchEvent\(new CustomEvent\('comms-archive-gallery-ready'\)\)/);
});
