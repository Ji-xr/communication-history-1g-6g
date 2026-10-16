'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
function between(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source section ${start}`);
  return source.slice(from, to).trim();
}
const implementation = [
  between(app, 'function experienceTask(', '\nfunction experienceInteractionMarkup('),
  between(app, 'function experienceInteractionMarkup(', '\nfunction completeEraExperienceNode('),
  between(app, 'function completeEraExperienceNode(', '\nfunction advanceExperienceInteraction('),
  between(app, 'function advanceExperienceInteraction(', '\nfunction renderExperienceStory(')
].join('\n');

function runtime(era, trigger) {
  const nodes = [{ id: `${era}.${trigger}`, trigger, reward: '互动记录' }], done = [];
  const scenario = { title: `${era}模拟`, prompt: '执行当前操作', actions: ['步骤一', '步骤二'], responses: ['收到第一步', '收到第二步'], result: `${era}模拟结果`, step: 0, feedback: [] };
  const status = new Map();
  const window = {
    CommsArchiveExperience: {
      get(currentEra, currentTrigger) { return currentEra === era && currentTrigger === trigger ? { ...scenario, step: status.get(trigger) || 0, total: 2, feedback: [] } : null; },
      advance(currentEra, currentTrigger) { const step = status.get(currentTrigger) || 0; if (currentEra !== era || currentTrigger !== trigger || step >= 2) return { ok: false }; status.set(trigger, step + 1); return { ok: true, step: step + 1, total: 2, complete: step + 1 === 2, saved: true }; }
    },
    CommsArchiveLan: {
      LanMemory: { completedExperienceNodes: done },
      getExperienceStory() { return { nodes }; },
      completeExperienceNode(id) { if (done.includes(id)) return false; done.push(id); return true; }
    }
  };
  const elements = new Map();
  const context = vm.createContext({
    window, state: { tasks: {}, logs: [] }, console, Date, Math, Number, String, Object, Array, Set,
    document: { getElementById(id) { if (!elements.has(id)) elements.set(id, { textContent: '' }); return elements.get(id); } },
    save() { return true; }, render() { context.renderCount = (context.renderCount || 0) + 1; },
    showInteractionNotice(message) { context.notice = message; },
    progressionBlock(result) { return !result?.ok; },
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  });
  vm.runInContext(implementation, context);
  return { context, done, status, trigger, elements };
}

test('2G多次按键编辑真实短信；延迟后必须检查服务中心并重发才记完成', () => {
  const r = runtime('2G', 'EXPERIENCE_2G_COMPOSE'), c = r.context;
  for (const key of ['6','6','6','5','5']) vm.runInContext(`press2GSmsKey('${key}')`, c);
  vm.runInContext('commit2GSmsCharacter()', c);
  assert.equal(c.state.tasks['2G'].smsDraft, 'OK');
  assert.equal(vm.runInContext(`submit2GSmsDraft('${r.trigger}')`, c), true);
  assert.equal(r.status.get(r.trigger), 1);
  assert.match(vm.runInContext(`experienceInteractionMarkup('2G',{trigger:'${r.trigger}',location:'编辑短信'},false)`, c), /短信服务中心/);
  assert.equal(vm.runInContext(`submit2GSmsDraft('${r.trigger}')`, c), false, '未经服务中心检查不允许直接完成');
  assert.match(c.notice, /服务中心/);
  vm.runInContext('check2GSmsRelay()', c);
  assert.equal(vm.runInContext(`submit2GSmsDraft('${r.trigger}')`, c), true);
  assert.ok(r.done.includes(r.trigger));
});

test('3G先请求文字，再经历较高负荷下的图片等待，并保留无虚构速率的说明', () => {
  const r = runtime('3G', 'CLICK_FIRST_MOBILE_INTERNET'), c = r.context;
  const initial = vm.runInContext(`experienceInteractionMarkup('3G',{trigger:'${r.trigger}',location:'移动网页'},false)`, c);
  assert.match(initial, /有线参考（固定终端）/);
  assert.match(initial, /3G无线接入（手机）/);
  assert.match(initial, /不代表某地区的历史测速/);
  vm.runInContext("set3GNetworkCondition('constrained')", c);
  assert.equal(vm.runInContext(`run3GPageStep('${r.trigger}')`, c), true);
  assert.equal(r.status.get(r.trigger), 1);
  assert.equal(vm.runInContext(`run3GPageStep('${r.trigger}')`, c), true);
  assert.equal(r.status.get(r.trigger), 1, '图片等待反馈不是完成按钮');
  assert.match(c.state.tasks['3G'].imageWaitFeedback, /不使用虚构网速数值/);
  assert.equal(vm.runInContext(`run3GPageStep('${r.trigger}')`, c), true);
  assert.ok(r.done.includes(r.trigger));
});

test('3G有线参考路径可与无线访问并列体验，并标明它不是3G移动接入', () => {
  const r = runtime('3G', 'CLICK_FIRST_MOBILE_INTERNET'), c = r.context;
  assert.equal(vm.runInContext("set3GNetworkPath('wired-reference')", c), true);
  assert.equal(vm.runInContext(`run3GPageStep('${r.trigger}')`, c), true);
  assert.equal(vm.runInContext(`run3GPageStep('${r.trigger}')`, c), true);
  assert.ok(r.done.includes(r.trigger));
  assert.equal(r.status.get(r.trigger), 2);
});

test('4G视频体验在高负荷与高画质组合下显示缓冲，调整条件后才完成播放步骤', () => {
  const r = runtime('4G', 'EXPERIENCE_4G_VIDEO'), c = r.context;
  vm.runInContext("set4GVideoOption('quality','high')", c); vm.runInContext("set4GVideoOption('network','busy')", c);
  assert.equal(vm.runInContext(`run4GVideoStep('${r.trigger}')`, c), true);
  assert.equal(r.status.get(r.trigger), 1, '先选择片段');
  assert.equal(vm.runInContext(`run4GVideoStep('${r.trigger}')`, c), true, '播放尝试显示缓冲反馈');
  assert.equal(r.status.get(r.trigger), 1);
  assert.equal(vm.runInContext(`run4GVideoStep('${r.trigger}')`, c), false, '同一失败条件不能假装播放成功');
  vm.runInContext("set4GVideoOption('quality','standard')", c);
  assert.equal(vm.runInContext(`run4GVideoStep('${r.trigger}')`, c), true);
  assert.ok(r.done.includes(r.trigger));
  assert.match(c.state.tasks['4G'].videoBufferFeedback, /定性体验模拟/);
});

test('5G控制台需要读取状态并执行指令；普通情境等待后可切换模拟配置重试', () => {
  const r = runtime('5G', 'EXPERIENCE_5G_INDUSTRY'), c = r.context;
  vm.runInContext("set5GControlMode('general')", c);
  assert.equal(vm.runInContext(`run5GControlStep('${r.trigger}')`, c), true);
  assert.equal(r.status.get(r.trigger), 1, '第一步读取设备状态');
  assert.equal(vm.runInContext(`run5GControlStep('${r.trigger}')`, c), true, '普通情境先产生等待反馈');
  assert.equal(r.status.get(r.trigger), 1);
  vm.runInContext("set5GControlMode('responsive')", c);
  assert.equal(vm.runInContext(`run5GControlStep('${r.trigger}')`, c), true);
  assert.ok(r.done.includes(r.trigger));
  assert.match(c.state.tasks['5G'].controlFeedback, /实际控制/);
});

test('6G研究模拟先调整权重，再运行情境并记录权衡，不宣称已商用', () => {
  const r = runtime('6G', 'EXPERIENCE_6G_ENVIRONMENT'), c = r.context;
  assert.equal(vm.runInContext(`run6GResearchStep('${r.trigger}')`, c), false, '未调整研究参数不能提交观察');
  assert.match(c.notice, /调整至少一项/);
  vm.runInContext("set6GResearchParameter('sensing',80)", c);
  assert.equal(vm.runInContext(`run6GResearchStep('${r.trigger}')`, c), true);
  assert.equal(r.status.get(r.trigger), 1);
  assert.equal(vm.runInContext(`run6GResearchStep('${r.trigger}')`, c), true);
  assert.ok(r.done.includes(r.trigger));
  assert.equal(c.state.tasks['6G'].researchParameters.sensing, 80);
  assert.match(vm.runInContext('researchTradeoffText(state.tasks[\'6G\'].researchParameters)', c), /研究情境参数/);
});
