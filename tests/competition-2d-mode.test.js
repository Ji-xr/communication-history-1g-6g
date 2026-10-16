const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const demo = fs.readFileSync('assets/js/demo-app.js', 'utf8');
const manager = fs.readFileSync('assets/js/demo-manager.js', 'utf8');

test('首页以动态探索主入口为唯一主按钮，文明档案与时代航线改由导航访问，不出现3D入口', () => {
  const home = app.slice(app.indexOf('function home()'), app.indexOf('function startExploration()'));
  assert.match(home, /buttonLabel=hasProgress\?'继续探索':'开始探索'/);
  assert.match(home, /id="homeContinueExplore"[^>]+>✦ \$\{buttonLabel\} →/);
  assert.doesNotMatch(home, /onclick="go\('(archive|eras|search)'\)"|home-timeline/);
  assert.match(html, /id="archiveNavButton" data-nav="archive"/);
  assert.match(html, /id="eraRouteButton" data-nav="eras"/);
  assert.doesNotMatch(home, /open3DGallery|进入3D时空长廊|启动时空通信入口/);
  assert.match(app, /function prologue\(\)[\s\S]*?序章结束后将直接进入1G《失联的呼叫》/);
  assert.match(app, /eraAction=firstFlow\?'':/);
});

test('时代入口直接调用统一enterEra，页面中不再提供长廊入口', () => {
  const erasPage = app.slice(app.indexOf('function erasPage()'), app.indexOf('let lastEraEntryError'));
  assert.doesNotMatch(erasPage, /open3DGallery|进入3D/);
  assert.match(erasPage, /eras\.map\(card\)/);
  assert.match(app, /function enterSelectedEra\(i\)[\s\S]*?return !!enterEra\(i\)/);
});

test('比赛版不请求Three.js，保留恢复开关、展厅文件和资源目录', () => {
  assert.match(html, /COMMS_ARCHIVE_3D_DISABLED=true/);
  assert.doesNotMatch(html, /<script[^>]+src="assets\/js\/archive3d\.js"/);
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
