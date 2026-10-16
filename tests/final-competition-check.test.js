'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('app.js', 'utf8');
const demo = fs.readFileSync('assets/js/demo-app.js', 'utf8');
const guide = fs.readFileSync('assets/js/demo-manager.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const baseCss = fs.readFileSync('style.css', 'utf8');
const lanCss = fs.readFileSync('assets/css/lan.css', 'utf8');
const settings = fs.readFileSync('assets/js/audio-system.js', 'utf8');
const search = fs.readFileSync('assets/js/knowledge-search.js', 'utf8');

test('比赛页面默认启用二维模式且不请求Three.js模块', () => {
  assert.match(html, /COMMS_ARCHIVE_3D_DISABLED=true/);
  assert.doesNotMatch(html, /<script[^>]+src="assets\/js\/archive3d\.js"/);
  assert.match(html, /id="archive3d"/);
  assert.ok(fs.existsSync('assets/js/archive3d.js'));
  assert.match(app, /当前使用稳定二维浏览模式/);
  assert.doesNotMatch(app, /三维展厅暂不可用/);
});

test('演示恢复和重启入口独立保留', () => {
  assert.match(demo, /restore\(\)\s*\{[\s\S]*?root\.location\.reload\(\)/);
  assert.match(guide, /恢复当前展示/);
  assert.match(guide, /重启演示/);
  assert.match(demo, /routeIds\s*\|\|\s*\[\]/);
});

test('最终页从现有探索、证据、日志和归档数据汇总成果', () => {
  assert.match(app, /function finalPage\(\)\{[\s\S]*?state\.visited/);
  assert.match(app, /state\.evidence\|\|\[\]/);
  assert.match(app, /state\.logs\|\|\[\]/);
  assert.match(app, /到访时代/);
  assert.match(app, /调查证据/);
  assert.match(app, /时空日志/);
});

test('站点图标为内嵌资源，避免额外favicon请求', () => {
  assert.match(html, /rel="icon"[^>]+href="data:image\/svg\+xml,/);
});

test('知识搜索卡片包含关联档案信息与清晰空结果提示', () => {
  assert.match(search, /技术关键词/);
  assert.match(search, /相关展品/);
  assert.match(search, /相关档案/);
  assert.match(search, /时代体验/);
  assert.match(search, /澜的研究记录/);
  assert.match(search, /没有找到相关通信记录/);
});

test('桌面与窄屏为澜卡片、最终成果卡和设置面板保留响应式规则', () => {
  assert.match(lanCss, /@media\(max-width:760px\).*?height:120px/s);
  assert.match(baseCss, /@media\(max-width:620px\)\{\.final-achievement-grid\{grid-template-columns:1fr/s);
  assert.match(baseCss, /demo-restore/);
  assert.match(settings, /commsArchive\.experienceSettings\.v1/);
});
