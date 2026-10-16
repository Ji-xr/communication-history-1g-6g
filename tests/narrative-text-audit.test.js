'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const erasExpected = ['1G', '2G', '3G', '4G', '5G', '6G'];

function loadNarrativeData() {
  const source = fs.readFileSync('app.js', 'utf8');
  const erasEnd = source.indexOf('\n];') + 3;
  const hallStart = source.indexOf('const hallDeepening=');
  const hallEnd = source.indexOf('\n};', hallStart) + 3;
  assert.ok(erasEnd > 3 && hallStart > erasEnd && hallEnd > hallStart, 'era and transition data are present');
  const context = {};
  vm.runInNewContext(`${source.slice(0, erasEnd)}\n${source.slice(hallStart, hallEnd)}\nglobalThis.result={eras,hallDeepening};`, context);
  return { source, eras: context.result.eras, hallDeepening: context.result.hallDeepening };
}

function loadLanDialogues() {
  const context = { window: {}, console, Date, Math, JSON, String, Object, Array, Set };
  for (const era of ['1g', '2g', '3g', '4g', '5g', '6g']) {
    const file = `assets/js/lan-dialogue-${era}.js`;
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  return context.window;
}

function functionSource(source, name, nextMarker) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(nextMarker, start + 1);
  assert.ok(start >= 0 && end > start, `${name} source is present`);
  return source.slice(start, end);
}

test('六代入口、线索和收束文字语气一致，且时代过渡有承接内容', () => {
  const { eras, hallDeepening } = loadNarrativeData();
  assert.deepEqual(Array.from(eras, era => era.id), erasExpected);
  for (const era of eras) {
    const allCopy = JSON.stringify({ open: era.open, intro: era.intro, opts: era.opts, secondary: era.secondary, truth: era.truth, reveal: era.reveal, moment: era.moment, record: era.record, core: era.core, end: era.end });
    assert.doesNotMatch(allCopy, /搭档|建设者|体验者/, `${era.id}非人物叙述不得冒用称呼或身份标签`);
    assert.ok(era.open?.trim() && era.intro?.length >= 2 && era.end?.trim(), `${era.id}入口、调查引导和收束文字完整`);
    assert.ok(hallDeepening[era.id]?.transition?.trim(), `${era.id}到下一阶段的技术脉络已说明`);
    assert.doesNotMatch(era.end, /恭喜完成|下一关/);
  }
  assert.match(eras[0].end, /移动通话|覆盖/);
  assert.match(eras[1].end, /数字|短信|数据/);
  assert.match(eras[2].end, /移动网页|多媒体|服务/);
  assert.match(eras[3].end, /设备|协同/);
  assert.match(eras[4].end, /感知|数字系统/);
  assert.match(eras[5].end, /通信|感知|智能系统/);
});

test('“搭档”仅出现在澜的对白系统中，旁白和页面提示不使用人物专属称呼', () => {
  const { source } = loadNarrativeData();
  assert.doesNotMatch(source, /搭档/);
  for (const file of ['assets/js/demo-app.js', 'index.html']) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /澜：搭档|你好，搭档/);
  const lan = loadLanDialogues();
  for (const era of erasExpected) {
    const dialogues = lan[`LanDialogues${era}`];
    assert.ok(Array.isArray(dialogues), `${era} Lan dialogue data is loaded`);
    for (const line of dialogues) {
      assert.ok(line.id && line.trigger && line.text, `${era} dialogue has id, trigger, and copy`);
      const text = Array.isArray(line.text) ? line.text.join('\n') : line.text;
      assert.doesNotMatch(text, /普通体验者的视角|建设者调查|体验者记录/);
    }
  }
});

test('正式五节点页面没有旧体验区入口，调查对白由澜对白系统负责', () => {
  const { source } = loadNarrativeData();
  const guided = functionSource(source, 'guidedChapter', '\nfunction guidedDiscoverExhibit');
  assert.doesNotMatch(guided, /用户体验区|体验者记录|记录时代影响|进入用户体验区/);
  assert.doesNotMatch(guided, /澜[：“]|clue\[2\]|opts\[secondSelected\]\[2\]/);
  assert.doesNotMatch(source, /阅读右侧澜的引导对白|点击澜卡片即可逐句继续/);
  assert.match(source, /前往时代档案出口/);
  assert.match(source, /情境示例：<\/b>\$\{escapeHtml\(e\.moment\)\}/);
  assert.match(source, /dispatchLanEvent\('TASK_CLUE'/);
  assert.match(source, /dispatchLanEvent\('TASK_REVEAL'/);
  const progression = require('../assets/js/progression-manager.js').createProgression({ visited: [], completed: [], clues: {}, logs: [], tasks: {}, evidence: [] });
  assert.deepEqual(Array.from(progression.nodes, node => node.key), ['entry', 'scene', 'investigation', 'technology', 'archive']);
});

test('3G—6G档案用调查与日常影响叙述，不给用户贴建设者或体验者身份', () => {
  const context = { window: {} };
  for (const era of ['3g', '4g', '5g', '6g']) {
    const file = `assets/js/era-archive-${era}.js`;
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    const record = context.window[`EraArchive${era.toUpperCase()}`];
    assert.ok(record?.summary && record?.construction && record?.experience, `${era.toUpperCase()} archive summary fields exist`);
    assert.doesNotMatch(`${record.summary} ${record.construction} ${record.experience}`, /建设者|体验者/);
  }
  assert.match(context.window.EraArchive6G.summary, /研究与发展阶段/);
  assert.match(context.window.EraArchive6G.technology, /仍需研究验证/);
});

