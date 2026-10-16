const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const three = fs.readFileSync('assets/js/archive3d.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const lanCss = fs.readFileSync('assets/css/lan.css', 'utf8');

test('长廊雾效已降到轻量空间氛围，摄像机远裁剪面可覆盖展厅', () => {
  assert.match(three, /new THREE\.FogExp2\('#0a1728', 0\.0012\)/);
  assert.match(three, /PerspectiveCamera\(54, 1, 0\.1, 260\)/);
  assert.match(three, /toneMappingExposure = 1\.2/);
});

test('澜剧情层不再对场景使用背景模糊，穿越失败和成功都有明确离场路径', () => {
  assert.match(lanCss, /body\.lan-dialogue-active::before\{[^}]*background:rgba\(2,7,18,\.38\)/);
  const dialogueRule = lanCss.match(/\.lan-companion\[data-mode="dialogue"\]\{[^}]*\}/)?.[0] || '';
  assert.doesNotMatch(dialogueRule, /backdrop-filter/);
  assert.match(app, /close3DGallery\(false\)/);
  assert.match(app, /showTransitFailure\(i,lastEraEntryError/);
});

test('演示路线开启六代入口仅在演示副本生效', () => {
  assert.match(app, /routeMode!=='recommended'/);
  assert.match(app, /function progressionEraAllowed\(era\).*ProgressValidator\.canEnterEra\(era\)/);
  assert.match(app, /function rebindProgression\(\).*create\(state/);
});

