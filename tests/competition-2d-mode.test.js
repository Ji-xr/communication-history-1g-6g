const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const demo = fs.readFileSync('assets/js/demo-app.js', 'utf8');
const manager = fs.readFileSync('assets/js/demo-manager.js', 'utf8');

test('首页保留动态探索主入口，并恢复三维长廊次级入口', () => {
  const home = app.slice(app.indexOf('function home()'), app.indexOf('function startExploration()'));
  assert.match(home, /buttonLabel=hasProgress\?'继续探索':'开始探索'/);
  assert.match(home, /id="homeContinueExplore"[^>]+>✦ \$\{buttonLabel\} →/);
  assert.doesNotMatch(home, /onclick="go\('(archive|eras|search)'\)"|home-timeline/);
  assert.match(html, /id="archiveNavButton" data-nav="archive"/);
  assert.match(html, /id="eraRouteButton" data-nav="eras"/);
  assert.match(home, /onclick="open3DGallery\(\)"/);
  assert.match(app, /function prologue\(\)[\s\S]*?序章结束后将直接进入1G《失联的呼叫》/);
  assert.match(app, /eraAction=firstFlow\?'':/);
});

test('时代航线保留二维时代卡，并提供三维长廊入口', () => {
  const erasPage = app.slice(app.indexOf('function erasPage()'), app.indexOf('let lastEraEntryError'));
  assert.match(erasPage, /onclick="open3DGallery\(\)"/);
  assert.match(erasPage, /eras\.map\(card\)/);
  assert.match(app, /function enterSelectedEra\(i\)/);
});

test('三维展厅停止加载，保留禁用开关与二维路径', () => {
  assert.match(html, /COMMS_ARCHIVE_3D_DISABLED=true/);
  assert.doesNotMatch(html, /<script[^>]+type="module"[^>]+src="assets\/js\/archive3d\.js"/);
  assert.doesNotMatch(html, /<script[^>]+src="[^"]*three\.module\.js"/);
  assert.match(app, /if\(window\.COMMS_ARCHIVE_3D_DISABLED\)/);
  assert.ok(fs.existsSync('assets/js/archive3d.js'));
  assert.ok(fs.existsSync('assets/css/gallery3d.css'));
  assert.ok(fs.existsSync('vendor/three/build/three.module.js'));
});

test('演示欢迎步骤直接进入1G，恢复的旧gallery步骤也不调用3D', () => {
  assert.match(demo, /step === 'welcome'[\s\S]*?enterDemoEra\('1G', 'investigation'\)/);
  assert.match(demo, /step === 'gallery'[\s\S]*?enterDemoEra\('1G', 'investigation'\)/);
  assert.doesNotMatch(demo, /open3DGallery|beginEraTravel\(0, true\)/);
  assert.match(manager, /welcome: \['通信文明档案馆'/);
  assert.match(manager, /进入1G调查/);
});
