'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('app.js', 'utf8');

test('同一页面和时代的调查更新保留阅读位置，切换时代或页面回到顶部', () => {
  const render = app.match(/function render\(\)\{([\s\S]*?)\}window\.renderProgression=/);
  assert.ok(render, '应找到主页面render实现');
  assert.ok(render[1].includes("const renderKey=route+((route==='chapter'||route==='chapter-end'||route==='experience')?':'+(eras[eraIndex]?.id||''):'');"));
  assert.match(render[1], /const previousScroll=window\.scrollY\|\|0,keepScroll=renderKey===lastRenderedRouteKey/);
  assert.match(render[1], /explicitScrollRestore=pendingRouteScrollRestore;pendingRouteScrollRestore=null/);
  assert.match(render[1], /preservePagePosition\(explicitScrollRestore\?\?\(keepScroll\?previousScroll:0\)\)/);
  assert.match(app, /function preservePagePosition\(targetY\)/);
  assert.match(app, /function pick\(i\)[\s\S]*?render\(\)\}function pickSecond/);
});
