const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/knowledge-search.js', 'utf8');
const model = {
  eras: [{ id: '1G', title: '模拟移动通信', background: '早期移动电话与无线覆盖' }, { id: '2G', title: '数字通信与短信', background: '数字移动通信让短信传递信息' }, { id: '5G', title: '多场景连接', background: '工业互联网与大规模连接' }],
  exhibits: [{ id: '2g-phone', eraId: '2G', name: '数字移动电话', type: '终端设备', description: '可编辑并发送短信。', technicalExplanation: '数字蜂窝网络' }],
  flows: [{ flowId: 'flow.5g', eraId: '5G', theme: ['基站', '传感器'], explanation: '通信网络连接设备与控制系统。', steps: [{ label: '5G基站' }] }],
  tasks: [], images: [], evidenceDefinitions: [{ evidenceId: 'evidence.2g.task', eraId: '2G', name: '短信调查结果档案', type: '任务结果', description: '短信转发记录' }], dialogues: []
};

test('本地知识索引支持关键词、时代和类别筛选', () => {
  const api = require('../assets/js/knowledge-search.js');
  assert.ok(api.search(model, { query: '短信' }).some(row => row.eraId === '2G'));
  assert.ok(api.search(model, { query: '短信调查结果档案', category: '历史资料' }).some(row => row.kind === '任务结果'));
  assert.ok(api.search(model, { query: '基站', era: '5G', category: '技术原理' }).some(row => row.eraId === '5G'));
  assert.equal(api.search(model, { query: '短信', era: '1G' }).length, 0);
});

test('搜索页提供知识挑战入口，展品结果可直接打开详情', () => {
  const scrolled = { scrollIntoView() {} };
  const document = { querySelector(selector) { return selector === '.history-media' ? scrolled : null; } };
  let entered = '', exhibit = '';
  const window = { CommsArchiveContent: model, document, enterEra(index) { entered = index; return true; }, showExhibitDetails(era, context, id) { exhibit = `${era}:${context}:${id}`; } };
  vm.runInNewContext(source, { window, module: undefined, setTimeout, console, Map, Set, String, Array });
  const api = window.CommsArchiveKnowledgeSearch;
  assert.match(api.renderPage(), /知识挑战/);
  assert.equal(api.openResult('exhibit.2g-phone', '2G'), true);
  assert.equal(entered, '', '直接打开搜索命中的展品详情不应切换时代或覆盖当前调查页面');
  assert.equal(exhibit, '2G:search:2g-phone');
});

test('结果补充现有技术关键词、展品、档案、体验与澜记录关联', () => {
  const richModel = { ...model, dialogues: [{ dialogueId: 'lan.2g.text', eraId: '2G', text: '短信让重要消息跨越时间传递。' }] };
  const window = {
    CommsArchiveContent: richModel,
    CommsArchiveLan: { getExperienceStory: era => era === '2G' ? { title: '短信交流' } : null }
  };
  vm.runInNewContext(source, { window, module: undefined, setTimeout, console, Map, Set, String, Array });
  const row = window.CommsArchiveKnowledgeSearch.records(richModel).find(item => item.id === 'exhibit.2g-phone');
  assert.ok(row.relatedExhibits.includes('数字移动电话'));
  assert.ok(row.relatedArchives.includes('短信调查结果档案'));
  assert.equal(row.relatedExperience, '短信交流');
  assert.match(row.lanRecord, /短信/);
  assert.ok(window.CommsArchiveKnowledgeSearch.records(richModel).find(item => item.eraId === '5G' && item.kind === '技术原理').technicalKeywords.includes('传感器'));
});
