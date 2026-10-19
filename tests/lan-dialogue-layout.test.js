'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const lanSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const lanCss = fs.readFileSync('assets/css/lan.css', 'utf8');
const progressionCss = fs.readFileSync('assets/css/progression.css', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');

function between(text, start, end) {
  const from = text.indexOf(start), to = text.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source segment: ${start}`);
  return text.slice(from, to).trim();
}

const displayModeSource = between(lanSource, '  function setDisplayMode(', '\n  function setDialoguePhase(');

const classifierSource = [
  between(lanSource, '  const CENTRAL_DIALOGUE_LOCATIONS=', '\n  function setDisplayMode(')
].join('\n');
const classifierContext = vm.createContext({ Set, String, RegExp });
vm.runInContext(classifierSource, classifierContext);

function allEraDialogue() {
  const names = [
    'lan-dialogue-1g.js', 'lan-dialogue-2g.js', 'lan-dialogue-3g.js',
    'lan-dialogue-3g-archive.js', 'lan-dialogue-4g.js', 'lan-dialogue-5g.js', 'lan-dialogue-6g.js'
  ];
  const dataWindow = {};
  for (const name of names) {
    vm.runInNewContext(fs.readFileSync(path.join('assets/js', name), 'utf8'), { window: dataWindow }, { filename: name });
  }
  const rows = [];
  for (const era of ['1G', '2G', '3G', '4G', '5G', '6G']) {
    rows.push(...(dataWindow[`LanDialogues${era}`] || []));
    if (era === '3G') rows.push(...(dataWindow.LanArchiveDialogues3G || []));
  }
  return rows;
}

test('中央模式有高于自身暗幕的稳定层级，并可接收点击', () => {
  const central = lanCss.match(/#lanCompanion\[data-mode="dialogue"\]\{([^}]*)\}/)?.[1] || '';
  const backdrop = lanCss.match(/body\.lan-dialogue-active::before\{([^}]*)\}/)?.[1] || '';
  assert.match(central, /position:fixed/);
  assert.match(central, /left:50%/);
  assert.match(central, /top:50%/);
  assert.match(central, /transform:translate\(-50%,-50%\)/);
  assert.match(central, /z-index:90/);
  assert.match(central, /pointer-events:auto/);
  assert.match(backdrop, /z-index:89/);
  assert.doesNotMatch(central, /!important/);
  assert.match(lanCss, /#lanCompanion\[data-mode="dialogue"\]\[data-dialogue-surface="exhibit"\]\{z-index:120\}/);
  assert.match(displayModeSource, /if\s*\(centered\)\s*\{\s*if\s*\(box\.style\)\s*\{box\.style\.left='';box\.style\.top='';box\.style\.right='';box\.style\.bottom=''\}/);
  assert.match(displayModeSource, /if \(box\.parentElement !== document\.body\) document\.body\?\.append\(box\)/);
});

test('陪伴卡片保留横向尺寸，手机端中央剧情框有独立适配', () => {
  assert.match(lanCss, /\.lan-companion\[data-mode="companion"\]\{[^}]*width:min\(420px/);
  assert.match(lanCss, /\.lan-companion\[data-mode="companion"\]\{[^}]*height:140px/);
  assert.match(lanCss, /@media\(max-width:760px\)\{\.lan-companion\[data-mode="companion"\]\{[^}]*height:120px/);
  assert.match(lanCss, /@media\(max-width:760px\)\{#lanCompanion\[data-mode="dialogue"\]\{width:calc\(100vw - 24px\)/);
  assert.match(lanCss, /\.lan-companion\[data-mode="dialogue"\] \.lan-caption\{[^}]*font-size:1\.04rem/);
});

test('中央对白挂到body，章节澜槽只定位普通陪伴卡片，页面路由保留当前模式', () => {
  assert.match(progressionCss, /\.guided-lan-slot \.lan-companion:not\(\[data-mode="dialogue"\]\):not\(\[data-mode="history"\]\)\{position:static/);
  assert.match(lanSource, /function onRoute\(route, context = \{\}\)[\s\S]*?syncActivePresentation\(\)/);
  assert.match(lanSource, /function syncActivePresentation\(\)[\s\S]*?return setDisplayMode\(queue\.length\?queueDisplayMode:LanDisplayMode\.mode\)/);
  assert.match(lanSource, /const duplicates=Array\.from\(document\.querySelectorAll\?\.\('#lanCompanion'\)\|\|\[\]\)\.filter\(candidate=>candidate!==box\)/);
  assert.match(lanSource, /duplicates\.forEach\(candidate=>candidate\.remove\?\.\(\)\)/);
  assert.match(appSource, /CommsArchiveLan\?\.onRoute\(route/);
  assert.match(indexSource, /assets\/css\/lan\.css[\s\S]*assets\/css\/progression\.css/);
  assert.equal((lanSource.match(/box\.innerHTML = `<div class="lan-head"/g) || []).length, 1, '只有澜系统创建根卡片DOM');
  assert.equal((lanSource.match(/function advanceFromUser\(/g) || []).length, 1, '卡片点击推进只有一个事件处理入口');
});

test('剧情模式优先级从对白语义推导，旧type字段与关联对白不会降级为角落卡片', () => {
  const legacyStory = { id: 'legacy-story', location: 'exhibit', type: 'story', trigger: 'view-record', text: '研究发现。' };
  const linkedLine = { id: 'linked-story', location: 'exhibit', dialogueType: 'optional', trigger: 'continue-record', next: 'linked-story-next', text: '连续剧情。' };
  const ordinaryHint = { id: 'ordinary-exhibit', location: 'exhibit', dialogueType: 'optional', trigger: 'view-phone', text: '展品提示。' };
  const exhibitLecture = { id: 'lan_2g_phone_001', era: '2G', location: 'exhibit', dialogueType: 'optional', trigger: 'EXHIBIT_CLICK', text: '展品的完整技术讲解。' };
  const exhibitDetail = { id: 'lan_1g_antenna_001', era: '1G', location: 'exhibit-detail', trigger: 'EXHIBIT_DETAIL', text: '展品部件的详细说明。' };
  const genericExhibitPrompt = { id: 'lan.exhibit.open', era: '2G', location: 'exhibit', presentationMode: 'companion', trigger: 'open-details', text: '先查看展品，再继续探索。' };
  assert.equal(classifierContext.priorityDialogue(legacyStory), true);
  assert.equal(classifierContext.priorityDialogue(linkedLine), true);
  assert.equal(classifierContext.priorityDialogue(ordinaryHint), false);
  assert.equal(classifierContext.priorityDialogue(exhibitLecture), true, '时代数据中的完整展品讲解不因optional类型降为陪伴卡片');
  assert.equal(classifierContext.priorityDialogue(exhibitDetail), true, '展品部件讲解使用中央模式');
  assert.equal(classifierContext.priorityDialogue(genericExhibitPrompt), false, '通用单句操作提示保持陪伴模式');
});

test('手动章节导航不直接操纵澜的显示位置或模式', () => {
  const navigation = between(appSource, 'function navigateChapterNext(', '\nfunction chapterNavigationMarkup(');
  const blocking = between(appSource, 'function chapterDialogueBlocking(', '\nfunction releaseChapterHint(');
  assert.doesNotMatch(navigation, /CommsArchiveLan\.(?:setDisplayMode|expandDialogue|hideDialogue)/);
  assert.match(blocking, /debugSnapshot\?\.\(\)/);
  assert.match(blocking, /status\.isBlocking==='boolean'\?status\.isBlocking:!!status\.isPlaying/);
});

test('六代数据中的入口、任务关键节点、体验和归档由同一个中央分类器判定', () => {
  const rows = allEraDialogue();
  assert.ok(rows.length >= 120, `Expected full era dialogue inventory, got ${rows.length}`);
  for (const era of ['1G', '2G', '3G', '4G', '5G', '6G']) {
    const eraRows = rows.filter(item => item.era === era);
    assert.ok(eraRows.some(item => item.location === 'entrance' && classifierContext.priorityDialogue(item)), `${era}入口应居中`);
    assert.ok(eraRows.some(item => item.location === 'experience' && classifierContext.priorityDialogue(item)), `${era}体验区重要对白应居中`);
    const archiveRows = eraRows.filter(item => item.location === 'archive' || item.storyLine === 'archive');
    for (const item of archiveRows) assert.equal(classifierContext.priorityDialogue(item), true, `${item.id}归档对白应居中`);
    assert.ok(eraRows.some(item => ['summary', 'transition', 'ending'].includes(item.location) && classifierContext.priorityDialogue(item)) || archiveRows.length > 0, `${era}应有中央总结、过渡或归档对白`);
  }
  for (const item of rows) {
    if (['laboratory', 'technology-lab', 'technical-lab', 'research-lab', 'experience', 'experience-summary', 'archive', 'summary', 'transition', 'ending'].includes(String(item.location || '').toLowerCase())) {
      assert.equal(classifierContext.priorityDialogue(item), true, `${item.id} (${item.location}) 应居中`);
    }
  }
});

