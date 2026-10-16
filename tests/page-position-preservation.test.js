'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const mediaCss = fs.readFileSync('assets/css/history-media.css', 'utf8');

test('页面内容更新后立即及下一帧恢复原阅读位置', () => {
  const source = app.match(/function preservePagePosition\(targetY\)\{[\s\S]*?\}function render\(/)?.[0];
  assert.ok(source, '应找到实际使用的页面位置恢复函数');
  const helper = source.slice(0, source.lastIndexOf('function render('));
  const queued = [];
  const positions = [];
  const style = new Map([['scroll-behavior', { value: 'smooth', priority: '' }]]);
  const root = { style: {
    getPropertyValue: key => style.get(key)?.value || '',
    getPropertyPriority: key => style.get(key)?.priority || '',
    setProperty: (key, value, priority = '') => style.set(key, { value, priority }),
    removeProperty: key => style.delete(key)
  } };
  const context = {
    document: { documentElement: root },
    window: { scrollTo: (x, y) => positions.push({ x, y }) },
    requestAnimationFrame: callback => queued.push(callback)
  };
  vm.runInNewContext('let scrollRestoreToken=0,scrollRestoreStyle=null;' + helper + 'globalThis.restore = preservePagePosition;', context);
  context.restore(520);
  assert.equal(positions.at(-1).y, 520);
  assert.equal(style.get('scroll-behavior').value, 'auto');
  queued.shift()();
  assert.equal(positions.at(-1).y, 520);
  queued.shift()();
  assert.equal(style.get('scroll-behavior').value, 'smooth');
});

test('连续重绘只恢复最新位置并还原原有滚动样式', () => {
  const source = app.match(/function preservePagePosition\(targetY\)\{[\s\S]*?\}function render\(/)?.[0];
  const helper = source.slice(0, source.lastIndexOf('function render('));
  const queued = [];
  const positions = [];
  const style = new Map([['scroll-behavior', { value: 'smooth', priority: '' }]]);
  const root = { style: {
    getPropertyValue: key => style.get(key)?.value || '',
    getPropertyPriority: key => style.get(key)?.priority || '',
    setProperty: (key, value, priority = '') => style.set(key, { value, priority }),
    removeProperty: key => style.delete(key)
  } };
  const context = {
    document: { documentElement: root },
    window: { scrollTo: (x, y) => positions.push({ x, y }) },
    requestAnimationFrame: callback => queued.push(callback),
    scrollRestoreToken: 0,
    scrollRestoreStyle: null
  };
  vm.runInNewContext('let scrollRestoreToken=0,scrollRestoreStyle=null;' + helper + 'globalThis.restore = preservePagePosition;', context);
  context.restore(520);
  context.restore(640);
  queued.shift()();
  queued.shift()();
  queued.shift()();
  assert.equal(positions.at(-1).y, 640);
  assert.equal(style.get('scroll-behavior').value, 'smooth');
});

test('展品详情重新绘制和关闭不会把阅读位置带回顶部', () => {
  assert.match(app, /savedScrollTop=previousModal\?\.scrollTop\|\|0/);
  assert.match(app, /currentModal\.scrollTop=savedScrollTop/);
  assert.match(app, /trigger\?\.focus\?\.\(\{preventScroll:true\}\)/);
  assert.doesNotMatch(app, /onclick="closeModal\(\);document\.querySelector\('#app'\)\.scrollIntoView/);
});

test('技术图下方立即出现播放与重播控件，不再出现单步前进', () => {
  const flow = app.match(/if\(tab==='technology'\)\{([\s\S]*?)\nreturn/);
  assert.ok(flow, '应找到技术原理渲染区');
  assert.match(flow[1], /diagram-wrap[\s\S]*flow-mobile-steps[\s\S]*flow-intro[\s\S]*flow-controls[\s\S]*设备在系统中的作用/);
  assert.match(flow[1], /toggleFlowPlayback\(\)/);
  assert.match(flow[1], /replayFlow\(\)/);
  assert.doesNotMatch(flow[1], /单步前进|stepFlow\(/);
  assert.match(mediaCss, /\.flow-intro\{/);
});

test('时代影响保留原有信息，但隐藏身份标签和重复调查任务结果块', () => {
  const tick = String.fromCharCode(96);
  const impactPattern = new RegExp('return ' + tick + '<div class="exhibit-body"><div class="mono">时代档案：[\\s\\S]*?' + tick + '\\}');
  const impact = app.match(impactPattern)?.[0];
  assert.ok(impact, '应找到时代影响展品详情');
  assert.doesNotMatch(impact, /体验者记录|建设者调查任务|调查结果/);
  assert.match(impact, /日常通信体验/);
  assert.match(impact, /生活影响与技术限制/);
  assert.match(impact, /与下一代的联系/);
  assert.match(impact, /通信条件的变化/);
  assert.match(impact, /\$\{e\.moment\}/);
  assert.match(impact, /\$\{e\.record\}/);
  assert.match(impact, /\$\{e\.achievement\}/);
  assert.match(app, /历史现场 · 日常通信/);
  assert.doesNotMatch(app, /建设者调查 · 体验者记录/);
});
