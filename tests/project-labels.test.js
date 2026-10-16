const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('浏览器元信息、首页入口和项目说明使用统一名称', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const app = fs.readFileSync('app.js', 'utf8');
  const readme = fs.readFileSync('README.md', 'utf8');
  assert.match(html, /<title>通信简史：从1G到6G<\/title>/);
  assert.match(html, /通信简史：从1G到6G/);
  assert.match(html, /rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml/);
  assert.match(app, /<h1>通信简史：从1G到6G<\/h1>/);
  assert.match(html, /data-nav="search"/);
  assert.match(html, />体验设置<\/button>/);
  assert.match(readme, /^# 通信简史：从1G到6G/m);
});

