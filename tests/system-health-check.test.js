const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/system-health-check.js', 'utf8');
function makeNode() {
  return { hidden: false, children: [], listeners: {}, classList: { toggle() {} }, setAttribute() {}, addEventListener(type, fn) { this.listeners[type] = fn; }, append(...nodes) { this.children.push(...nodes); }, querySelector() { return makeNode(); } };
}
function runtime({ webgl = true, storageWorks = true, threeStatus = { status: 'ready', stage: 'local-three-module' }, threeApi = true, threeDisabled = false } = {}) {
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
  const window = { document, localStorage, render() {}, CommsArchiveApp: { status: 'ready' }, CommsArchiveLan: { trigger() {}, onTaskStart() {} }, CommsArchiveContent: model, CommsArchiveRuntimeContentStatus: { status: 'ready' }, viewerState: { mode: '2d', status: 'ready' }, COMMS_ARCHIVE_3D_DISABLED: threeDisabled, CommsArchive3DStatus: threeStatus, CommunicationsHistory3D: threeApi ? { mount() {} } : undefined, EraArchive3G: {}, EraArchive4G: {}, EraArchive5G: {}, EraArchive6G: {}, ArchiveEvidence6G: [{ id: 'e1' }], addEventListener(type, fn) { listeners[type] = fn; }, dispatchEvent(event) { listeners[event.type]?.(event); } };
  vm.runInNewContext(source, { window, setTimeout() { return 1; }, Date, String, Boolean, Array, Object });
  return { window, body, get webglProbeCount() { return webglProbeCount; } };
}

test('明确关闭三维时，启动检查将二维浏览显示为正常状态', () => {
  const h = runtime({ threeDisabled: true, threeApi: false, threeStatus: { status: 'failed', reason: '保留的旧状态' } }); const result = h.window.SystemHealthCheck.inspect();
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 6);
  assert.equal(result.checks.every(check => check.status === 'ready'), true);
  assert.equal(result.checks.find(check => check.module === '2D exhibition')?.label, '当前使用稳定二维浏览模式');
  assert.match(result.checks.find(check => check.module === '2D exhibition').detail, /配置关闭/);
  assert.equal(h.webglProbeCount, 0);
});

test('三维失败时保留二维可用状态并展示具体原因，存储失败单独提示', () => {
  const h = runtime({ webgl: false, storageWorks: false, threeStatus: { status: 'failed', reason: 'WebGL上下文丢失' }, threeApi: false });
  const result = h.window.SystemHealthCheck.inspect();
  assert.equal(result.ok, false);
  const exhibition = result.checks.find(check => check.module === '2D exhibition');
  assert.equal(exhibition.status, 'ready');
  assert.match(exhibition.label, /三维长廊暂不可用，二维浏览可用/);
  assert.equal(exhibition.note, true);
  assert.equal(exhibition.reason, 'WebGL上下文丢失');
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

test('等待三维注册时报告pending，模块注册事件自动刷新且不提前声称WebGL成功', () => {
  const h = runtime({ threeStatus: { status: 'script-loading', stage: 'archive3d-script' }, threeApi: false });
  let result = h.window.SystemHealthCheck.inspect();
  assert.equal(result.ok, false);
  assert.equal(result.checks.find(check => check.module === '2D exhibition').status, 'pending');
  h.window.CommunicationsHistory3D = { mount() {} };
  h.window.CommsArchive3DStatus = { status: 'ready', stage: 'local-three-module' };
  h.window.dispatchEvent({ type: 'comms-archive-three-api-ready' });
  const item = h.window.SystemHealthCheck.report.find(check => check.module === '2D exhibition');
  assert.equal(item.status, 'ready');
  assert.equal(item.note, false);
  assert.match(item.detail, /接口已注册/);
  assert.match(item.detail, /将在进入长廊时验证/);
  assert.equal(h.webglProbeCount, 0, '健康检查本身不申请额外WebGL上下文');
});

test('实际首帧事件刷新验证阶段，后续渲染失败立即显示降级原因', () => {
  const h = runtime();
  h.window.SystemHealthCheck.inspect();
  h.window.CommsArchive3DStatus = { status: 'ready', stage: 'first-frame-rendered', frameCount: 1 };
  h.window.dispatchEvent({ type: 'comms-archive-gallery-ready' });
  let item = h.window.SystemHealthCheck.report.find(check => check.module === '2D exhibition');
  assert.equal(item.status, 'ready');
  assert.match(item.detail, /完成首帧渲染/);
  h.window.CommsArchive3DStatus = { status: 'failed', stage: 'render', reason: '<context lost>' };
  h.window.dispatchEvent({ type: 'comms-archive-gallery-error' });
  item = h.window.SystemHealthCheck.report.find(check => check.module === '2D exhibition');
  assert.equal(item.status, 'ready');
  assert.equal(item.note, true);
  assert.equal(item.reason, '<context lost>');
  assert.match(h.body.children[1].innerHTML, /&lt;context lost&gt;/);
  assert.doesNotMatch(h.body.children[1].innerHTML, /<context lost>/);
});

test('模块导入与脚本加载错误事件刷新失败状态，三维故障不阻塞二维内容', () => {
  for (const event of ['comms-archive-three-module-error', 'comms-archive-three-script-error']) {
    const h = runtime({ threeApi: false });
    h.window.CommsArchive3DStatus = { status: 'failed', reason: '模块加载失败' };
    h.window.dispatchEvent({ type: event });
    const item = h.window.SystemHealthCheck.report.find(check => check.module === '2D exhibition');
    assert.equal(item.status, 'ready'); assert.equal(item.note, true); assert.equal(item.reason, '模块加载失败');
    assert.equal(h.window.SystemHealthCheck.inspect().ok, true);
  }
});

test('启用三维后的通用检查说明不再固定宣称二维，非函数接口也不算注册', () => {
  const h = runtime();
  h.window.SystemHealthCheck.inspect();
  assert.doesNotMatch(h.body.children[1].innerHTML, /当前使用稳定二维浏览模式|比赛版本不加载/);
  h.window.CommunicationsHistory3D = { mount: true };
  assert.equal(h.window.SystemHealthCheck.inspect().checks.find(check => check.module === '2D exhibition').status, 'pending');
});
