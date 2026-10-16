'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sources = [
  'assets/js/lan-character-profile.js',
  ...['1g', '2g', '3g', '4g', '5g', '6g'].map((era) => `assets/js/lan-dialogue-${era}.js`),
  'assets/js/lan-system.js'
];
function loadLan() {
  const window = {};
  const context = {
    window,
    localStorage: { getItem: () => null, setItem() {} },
    Date, JSON, String, Object, Array, Math, Set, console
  };
  for (const file of sources) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return window;
}

const legacyIdentity = /时空记录者|数字记忆|不是来自未来的人|档案系统的时空|身份反转|隐藏真实身份/;

test('澜的公开对白不再包含旧身份、系统人格或身份反转描述', () => {
  const lan = loadLan();
  for (const line of lan.CommsArchiveLan.dialogueData) {
    const text = Array.isArray(line.text) ? line.text.join('\n') : String(line.text || '');
    assert.doesNotMatch(text, legacyIdentity, line.id);
  }
  const app = fs.readFileSync('app.js', 'utf8');
  assert.doesNotMatch(app, /澜 · 通信历史记录者|澜 · 时空记录者/);
});

test('角色规范明确澜是科研人员和科研伙伴，序章将用户定位为探索者', () => {
  const lan = loadLan();
  const profile = lan.LanCharacterProfile;
  assert.equal(profile.identity, '来自未来通信文明档案馆的年轻科研人员。');
  assert.equal(profile.role, '与用户平等协作的科研伙伴');
  const app = fs.readFileSync('app.js', 'utf8');
  assert.match(app, /作为探索者，与澜并肩走过六个时代/);
  const prologue = app.slice(app.indexOf('function prologue()'), app.indexOf('function transitPage()'));
  assert.doesNotMatch(prologue, /普通体验者的视角|进入用户体验区|记录时代影响/);
  const firstVisit = lan.CommsArchiveLan.dialogueData.find((item) => item.trigger === 'first-visit');
  assert.ok(firstVisit);
  const firstVisitText = Array.isArray(firstVisit.text) ? firstVisit.text.join('\n') : firstVisit.text;
  assert.doesNotMatch(firstVisitText, /普通体验者|体验者视角/);
  assert.match(firstVisitText, /档案中缺失的通信生活记录/);
});

test('6G结局完成研究档案，并以人的通信体验收束', () => {
  const lan = loadLan();
  const ending = lan.CommsArchiveLan.dialogueData.find((item) => item.id === 'lan.6g.identity-reveal');
  assert.ok(ending, '保留旧对白 ID，兼容已存的阅读记录');
  const text = Array.isArray(ending.text) ? ending.text.join('\n') : ending.text;
  assert.match(text, /《连接的文明：人类通信六代记录》/);
  assert.match(text, /人的体验/);
  assert.match(text, /和你一起经历这些时代/);
  assert.doesNotMatch(text, legacyIdentity);
});

test('六代建设者任务开始与完成触发保持兼容', () => {
  const lan = loadLan();
  const expected = [
    ['1G', 'start_1g_task', 'complete_1g_task'],
    ['2G', 'start_2g_task', 'complete_2g_task'],
    ['3G', 'start_3g_task', 'complete_3g_task'],
    ['4G', 'START_4G_TASK', 'COMPLETE_4G_TASK'],
    ['5G', 'START_5G_TASK', 'COMPLETE_5G_TASK'],
    ['6G', 'START_6G_TASK', 'COMPLETE_6G_TASK']
  ];
  for (const [era, start, complete] of expected) {
    const dialogues = lan.CommsArchiveLan.dialogueData.filter((item) => item.era === era);
    assert.ok(dialogues.some((item) => item.trigger === start), `${era} start trigger`);
    assert.ok(dialogues.some((item) => item.trigger === complete), `${era} completion trigger`);
  }
});
