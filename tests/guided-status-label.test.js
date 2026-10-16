const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');

test('guidedChapter调用的guidedStatusLabel已定义，覆盖所有节点状态', () => {
  const start = app.indexOf('function guidedStatusLabel(');
  const end = app.indexOf('\n', start);
  assert.ok(start >= 0, 'guidedStatusLabel must be defined');
  assert.ok(app.indexOf('function guidedStatusLabel(') < app.indexOf('function guidedChapter('), 'helper is declared before guidedChapter');
  assert.match(app.slice(app.indexOf('function guidedNodeRailMarkup('), app.indexOf('\nfunction technologyLabActions(')), /guidedStatusLabel\(node\.status\)/);

  const context = vm.createContext({});
  vm.runInContext(`${app.slice(start, end)}\nglobalThis.label = guidedStatusLabel;`, context);
  assert.equal(context.label('LOCKED'), '未开放');
  assert.equal(context.label('AVAILABLE'), '可探索');
  assert.equal(context.label('ACTIVE'), '探索中');
  assert.equal(context.label('COMPLETED'), '已完成');
  assert.equal(context.label('UNKNOWN'), '状态待更新');
});

test('章节渲染不再依赖缺失DOM变量guidedStatusLabel', () => {
  assert.doesNotMatch(app, /document\.getElementById\(['"]guidedStatusLabel['"]\)/);
  assert.match(app, /function guidedStatusLabel\(status\)/);
  assert.match(app, /guidedStatusLabel\(node\.status\)/);
});
