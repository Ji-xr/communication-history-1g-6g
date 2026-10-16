'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('4G体验线包含视频、分享、直播和社交四个唯一且关联展品的节点', () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync('assets/js/experience-story-4g.js', 'utf8'), { window });
  const story = window.ExperienceStory4G;
  assert.equal(story.era, '4G');
  assert.equal(story.title, '分享的时代');
  assert.deepEqual(Array.from(story.nodes, (node) => node.location), ['移动高清视频', '上传照片', '移动直播', '社交互动']);
  assert.equal(new Set(Array.from(story.nodes, (node) => node.id)).size, 4);
  assert.equal(new Set(Array.from(story.nodes, (node) => node.trigger)).size, 4);
  assert.ok(story.nodes.every((node) => node.exhibit && node.dialogueId && node.reward));
});

test('4G体验节点和澜触发事件命名保持一一对应', () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync('assets/js/experience-story-4g.js', 'utf8'), { window });
  vm.runInNewContext(fs.readFileSync('assets/js/lan-dialogue-4g.js', 'utf8'), { window });
  const nodeTriggers = Array.from(window.ExperienceStory4G.nodes, (node) => node.trigger).sort();
  const eventTriggers = Array.from(window.LanTriggers4G.filter((rule) => rule.event === 'EXPERIENCE_NODE'), (rule) => rule.id).sort();
  assert.deepEqual(nodeTriggers, eventTriggers);
});
