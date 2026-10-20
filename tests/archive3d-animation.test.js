const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('assets/js/archive3d.js', 'utf8');
const animateStart = source.indexOf('  function animate(ms) {');
const animateEnd = source.indexOf('\n  console.info(\'ARCHIVE3D_ANIMATION_START\'', animateStart);
const animate = source.slice(animateStart, animateEnd);

test('沿用唯一现有动画循环，初始化时只启动一次RAF链', () => {
  assert.ok(animateStart >= 0 && animateEnd > animateStart);
  assert.equal((source.match(/requestAnimationFrame\(animate\)/g) || []).length, 2, 'one initial schedule plus one per-frame continuation');
  assert.match(source, /console\.info\('ARCHIVE3D_ANIMATION_START'/);
  assert.match(source, /frame = requestAnimationFrame\(animate\);\s*return \{/);
});

test('frameCount属于当前渲染实例，并仅在renderer.render成功后递增', () => {
  assert.match(source, /let instanceFrameCount = 0/);
  assert.match(animate, /renderer\.render\(scene, camera\);\s*instanceFrameCount \+= 1/);
  assert.match(animate, /window\.CommsArchive3DStatus\.frameCount = instanceFrameCount/);
  assert.match(animate, /window\.CommsArchive3DRuntime = \{ \.\.\.runtimeDiagnostics \}/);
  assert.match(source, /frameCount: instanceFrameCount/);
  assert.match(source, /ARCHIVE3D_FRAME_1/);
  assert.match(source, /instanceFrameCount === 60\) console\.info\('ARCHIVE3D_FRAME_60'/);
});

test('当前实例ID阻止过期实例的帧循环运行或覆盖状态', () => {
  assert.match(source, /let activeInstanceId = 0/);
  assert.match(source, /if \(disposed \|\| instanceId !== activeInstanceId\) return/);
  assert.match(source, /if \(instanceId !== activeInstanceId\) throw error/);
  assert.match(source, /activeGallery\.dispose\(\)/);
});

test('dispose会取消当前帧请求并标记动画已停止', () => {
  assert.match(source, /cancelAnimationFrame\(frame\)/);
  assert.match(source, /window\.CommsArchive3DStatus\.animationRunning = false/);
  assert.match(source, /window\.CommsArchive3DRuntime = \{ \.\.\.runtimeDiagnostics, animationRunning: false \}/);
  assert.match(source, /animationRunning: !disposed && instanceId === activeInstanceId/);
});

test('render异常记录实例、失败帧数和具体错误，并停止RAF', () => {
  assert.match(animate, /catch \(error\) \{\s*cancelAnimationFrame\(frame\)/);
  assert.match(animate, /console\.error\('ARCHIVE3D_RENDER_FAILED'/);
  assert.match(animate, /failRender\(reason, error\)/);
  assert.match(source, /stage: 'render', frameCount: instanceFrameCount, animationRunning: false/);
  assert.match(source, /resolveFirstFrame\(false\)/);
  assert.match(source, /if \(!await activeGallery\.firstFrameReady\) throw/);
});
