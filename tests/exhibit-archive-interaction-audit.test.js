'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
function between(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source section: ${start}`);
  return source.slice(from, to).trim();
}
const eras = between(app, 'const eras=[', '\nconst questions=');
const halls = between(app, 'const hallDeepening={', '\nfunction exhibitThumbnail(');
const renderBody = between(app, 'function renderExhibitBody(', '\nfunction technicalChallengeSection(');
const challenge = between(app, 'function technicalChallengeSection(', '\nfunction mountExhibitTechnicalChallenge(');
const tabs = ['history', 'technology', 'impact'];

function archiveRuntime() {
  const window = { createCommsContentModel: null };
  const context = vm.createContext({ window, state: {}, currentExhibitItemId: '', flowStepIndex: 0, flowTimer: null,
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
    flowDiagram(era) { return `<svg aria-label="${era.id}流程"></svg>`; },
    dispatchLanEvent() {}, openImageViewer() {}, imageLoadFallback() {}, toggleFlowPlayback() {},
    openTechnicalChallenge() {}, replayFlow() {}, closeModal() {}, selectExhibitTab() {}
  });
  vm.runInContext(eras, context);
  vm.runInContext(halls, context);
  vm.runInContext(fs.readFileSync('assets/js/content-model.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('assets/js/runtime-content.js', 'utf8'), context);
  context.mediaAssets = window.mediaAssets;
  context.exhibitLinks = window.exhibitLinks;
  vm.runInContext(renderBody, context);
  vm.runInContext(challenge, context);
  return context;
}

test('六代每件展品的历史、技术原理和时代影响页签都有真实内容，按钮回调均存在', () => {
  const context = archiveRuntime();
  for (const era of vm.runInContext('eras', context)) {
    for (const item of vm.runInContext(`hallDeepening['${era.id}'].exhibits`, context)) {
      context.currentExhibitItemId = item.id;
      for (const tab of tabs) {
        const html = vm.runInContext(`renderExhibitBody(eras.find(item=>item.id==='${era.id}'),'${tab}')`, context);
        assert.ok(html.length > 100, `${era.id}/${item.id}/${tab}应有展示内容`);
        assert.match(html, /<h3>|<h4>/, `${era.id}/${item.id}/${tab}应有标题`);
        assert.doesNotMatch(html, /<p>\s*<\/p>/, `${era.id}/${item.id}/${tab}不应有空说明`);
        const handlers = [...html.matchAll(/onclick="([A-Za-z_$][\w$]*)\(/g)].map(match => match[1]);
        for (const name of handlers) assert.equal(typeof context[name], 'function', `${era.id}/${item.id}/${tab}的${name}回调存在`);
      }
    }
  }
});

test('1G技术难点入口展开有问题、难点成因、工程办法、影响和可靠来源；其他时代不显示空入口', () => {
  const context = archiveRuntime();
  const oneG = vm.runInContext("technicalChallengeSection(eras.find(item=>item.id==='1G'))", context);
  for (const phrase of ['遇到了什么问题', '为什么难', '采用的办法', '带来的变化', 'Bell System Technical Journal', '频率复用']) assert.ok(oneG.includes(phrase), `1G技术难点说明包含${phrase}`);
  assert.match(oneG, /nokia\.com\/bell-labs/);
  for (const era of ['2G', '3G', '4G', '5G', '6G']) assert.equal(vm.runInContext(`technicalChallengeSection(eras.find(item=>item.id==='${era}'))`, context), '', `${era}没有虚构或空的技术难点入口`);
  assert.ok(app.includes("openTechnicalChallenge(\\'1G\\')"), '展品按钮打开可阅读的技术难点资料');
});
