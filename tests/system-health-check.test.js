const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/system-health-check.js', 'utf8');
function makeNode() {
  return { hidden: false, children: [], listeners: {}, classList: { toggle() {} }, setAttribute() {}, addEventListener(type, fn) { this.listeners[type] = fn; }, append(...nodes) { this.children.push(...nodes); }, querySelector() { return makeNode(); } };
}
function runtime({ webgl = true, storageWorks = true, threeStatus = { status: 'ready', stage: 'renderer-created' }, threeApi = true } = {}) {
  const data = new Map(); const body = makeNode(); let webglProbeCount = 0;
  const canvas = { getContext(name) { if (name === 'webgl2') webglProbeCount += 1; return name === 'webgl2' && webgl ? { getExtension() { return { loseContext() {} }; } } : null; } };
  const document = { readyState: 'complete', body, querySelector(selector) { return selector === '#app' ? {} : null; }, createElement(tag) { return tag === 'canvas' ? canvas : makeNode(); } };
  const localStorage = { setItem(key, value) { if (!storageWorks) throw new Error('denied'); data.set(key, String(value)); }, getItem(key) { return data.get(key) ?? null; }, removeItem(key) { data.delete(key); } };
  const ids = ['1G', '2G', '3G', '4G', '5G', '6G'];
  const eras = ids.map(id => ({ id, eraId: id, title: id + ' title', summary: { technicalAchievement: '成就', historicalImpact: '影响' }, taskIds: [id + '.task'] }));
  const tasks = ids.flatMap(id => ['技术理解', '时代问题调查'].map(kind => ({ id: id + '.' + kind, era: id, eraId: id, kind, title: '任务', description: '说明', options: [{ label: '选项' }], feedback: ['反馈'] })));
  const evidenceDefinitions = ids.map(id => ({ era: id, eraId: id }));
  const model = { eras, tasks, exhibits: [], images: [], evidenceDefinitions, getEra(id) { return eras.find(item => item.id === id) || null; }, getTask(id) { return tasks.find(item => item.id === id) || null; }, checkCompleteness() { return { ok: true, errors: [], errorCount: 0 }; } };
  const listeners = {};
  const window = { document, localStorage, render() {}, CommsArchiveApp: { status: 'ready' }, CommsArchiveLan: { trigger() {}, onTaskStart() {} }, CommsArchiveContent: model, CommsArchiveRuntimeContentStatus: { status: 'ready' }, viewerState: { mode: '2d', status: 'ready' }, CommsArchive3DStatus: threeStatus, CommunicationsHistory3D: threeApi ? { mount() {} } : undefined, EraArchive3G: {}, EraArchive4G: {}, EraArchive5G: {}, EraArchive6G: {}, ArchiveEvidence6G: [{ id: 'e1' }], addEventListener(type, fn) { listeners[type] = fn; }, dispatchEvent(event) { listeners[event.type]?.(event); } };
  vm.runInNewContext(source, { window, setTimeout() { return 1; }, Date, String, Boolean, Array, Object });
  return { window, get webglProbeCount() { return webglProbeCount; } };
}

test('启动检查将稳定二维浏览模式显示为正常状态', () => {
  const h = runtime(); const result = h.window.SystemHealthCheck.inspect();
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 6);
  assert.equal(result.checks.every(check => check.status === 'ready'), true);
  assert.equal(result.checks.find(check => check.module === '2D exhibition')?.label, '当前使用稳定二维浏览模式');
  assert.equal(h.webglProbeCount, 0);
});

test('3D/WebGL状态不再影响启动健康结果，存储失败仍单独提示', () => {
  const h = runtime({ webgl: false, storageWorks: false, threeStatus: { status: 'failed', reason: '旧3D诊断状态' }, threeApi: false });
  const result = h.window.SystemHealthCheck.inspect();
  assert.equal(result.ok, false);
  const exhibition = result.checks.find(check => check.module === '2D exhibition');
  assert.equal(exhibition.status, 'ready');
  assert.match(exhibition.label, /稳定二维浏览模式/);
  assert.equal(exhibition.reason, null);
  assert.match(result.checks.find(check => check.module === 'localStorage')?.reason || '', /JSON 备份/);
  assert.equal(h.webglProbeCount, 0);
});

test('缺少统一内容模型时给出具体缺失模块和建议检查路径', () => {
  const h = runtime(); h.window.CommsArchiveContent = null;
  const result = h.window.SystemHealthCheck.inspect();
  const content = result.checks.find(check => check.module === 'content-model.js');
  assert.equal(content.status, 'failed');
  assert.match(content.reason, /window\.CommsArchiveContent/);
  assert.match(content.reason, /runtime-content\.js/);
});

test('稳定二维模式不会订阅或显示Three.js加载失败状态', () => {
  const h = runtime({ threeStatus: { status: 'script-loading', stage: 'archive3d-script' }, threeApi: false });
  h.window.CommsArchive3DStatus = { status: 'failed', reason: '旧版缓存报错' };
  h.window.dispatchEvent({ type: 'comms-archive-three-script-error' });
  h.window.SystemHealthCheck.inspect();
  const item = h.window.SystemHealthCheck.report.find(check => check.module === '2D exhibition');
  assert.equal(item.status, 'ready');
  assert.match(item.detail, /比赛版本不加载/);
});
