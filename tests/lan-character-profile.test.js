'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const profileSource = fs.readFileSync('assets/js/lan-character-profile.js', 'utf8');
const systemSource = fs.readFileSync('assets/js/lan-system.js', 'utf8');
const modelSource = fs.readFileSync('assets/js/content-model.js', 'utf8');
const htmlSource = fs.readFileSync('index.html', 'utf8');

function loadProfileAndLanSystem() {
  const window = {};
  const context = { window, localStorage: { getItem: () => null, setItem() {} }, Date, JSON, String, Object, Array, Math, Set, console };
  vm.runInNewContext(profileSource, context, { filename: 'lan-character-profile.js' });
  vm.runInNewContext(systemSource, context, { filename: 'lan-system.js' });
  return window;
}

test('LanCharacterProfile正式注册，lan-system沿用同一份角色设定', () => {
  const window = loadProfileAndLanSystem();
  assert.equal(window.LanCharacterProfile.id, 'lan');
  assert.equal(window.CommsArchiveLan.character, window.LanCharacterProfile);
  assert.equal(window.CommsArchiveLan.LanCharacter, window.LanCharacterProfile);
});

test('规范包含科研伙伴分工、核心遗憾与六代成长路线', () => {
  const { LanCharacterProfile: lan } = loadProfileAndLanSystem();
  assert.equal(lan.identity, '来自未来通信文明档案馆的年轻科研人员。');
  assert.equal(lan.relationship.type, '科研伙伴');
  assert.match(lan.coreRegret, /忽略了技术背后人的感受/);
  assert.deepEqual({ ...lan.growthStages }, { '1G': '探索', '2G': '探索', '3G': '观察', '4G': '观察', '5G': '连接', '6G': '理解' });
  assert.equal(lan.endingDirection.includes('身份'), false);
});

test('规范记录视觉、Q版、年代辅助设备和现有AI素材标注', () => {
  const { LanCharacterProfile: lan } = loadProfileAndLanSystem();
  assert.equal(lan.visual.perceivedAge, '25—28岁');
  assert.equal(lan.chibi.proportions, '2.5—3头身');
  assert.equal(Object.keys(lan.eraAccessories).length, 6);
  assert.equal(lan.assets.portrait.type, 'AI生成原创角色概念图');
  assert.match(lan.assets.portrait.note, /不是历史人物影像/);
});

test('入口在内容模型和LanSystem之前加载角色规范，内容模型优先读取规范对象', () => {
  const profileIndex = htmlSource.indexOf('assets/js/lan-character-profile.js');
  const modelIndex = htmlSource.indexOf('assets/js/content-model.js');
  const systemIndex = htmlSource.indexOf('assets/js/lan-system.js');
  assert.ok(profileIndex >= 0 && profileIndex < modelIndex && modelIndex < systemIndex);
  assert.match(modelSource, /const lanCharacter = root\.LanCharacterProfile \|\|/);
});
