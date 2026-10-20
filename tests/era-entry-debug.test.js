'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createProgression } = require('../assets/js/progression-manager.js');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const viewer = fs.readFileSync(path.join(root, 'assets/js/archive3d.js'), 'utf8');
const demo = fs.readFileSync(path.join(root, 'assets/js/demo-app.js'), 'utf8');
const galleryCss = fs.readFileSync(path.join(root, 'assets/css/gallery3d.css'), 'utf8');

function freshProgression(extra = {}) {
  const state = { visited: [], completed: [], clues: {}, logs: [], tasks: {}, evidence: [], ...extra };
  const manager = createProgression(state);
  return { state, manager };
}

test('1G is enterable on a new normal save; validator records the era and enters it', () => {
  const { manager } = freshProgression();
  assert.deepEqual(manager.ProgressValidator.canEnterEra('1G'), { ok: true, reason: '' });
  assert.equal(manager.enterEra('1G').ok, true);
  assert.equal(manager.currentEra(), '1G');
});

test('normal exploration keeps 6G locked until all five prior eras are archived', () => {
  const { state, manager } = freshProgression();
  const blocked = manager.ProgressValidator.canEnterEra('6G');
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /1G/);
  assert.deepEqual(state.completed, [], 'validation must not mutate normal progress');

  state.completed.push('1G', '2G', '3G', '4G', '5G');
  assert.equal(manager.ProgressValidator.canEnterEra('6G').ok, true);
  assert.equal(manager.enterEra('6G').ok, true);
  assert.equal(manager.currentEra(), '6G');
});

test('the 3D transit calls the active global era entry wrapper so demo isolation is honored', () => {
  assert.match(app, /const entryPoint=typeof window\.enterEra==='function'\?window\.enterEra:enterEra;const ok=entryPoint\.call\(window,i\)/);
  assert.match(demo, /root\.enterEra = function \(index\)[\s\S]*?routeMode !== 'recommended'\) return enterDemoEra\(eras\[index\]\?\.id, 'entry'\)/);
  assert.match(demo, /function enterDemoEra\(era, key\)[\s\S]*?addCompletedThrough\(era\);\s*rebindProgression\(\);\s*if \(!originalEnterEra\(index\)\) return false/);
  assert.match(app, /window\.DemoManager\?\.isActive\?\.\(\)&&window\.DemoManager\.state\.routeMode!=='recommended'/);
});

test('all six era IDs use the same canonical form in the page and ProgressionManager', () => {
  for (const era of ['1G', '2G', '3G', '4G', '5G', '6G']) {
    assert.match(app, new RegExp(`id:'${era}'`));
    assert.ok(require('../assets/js/progression-manager.js').ERAS.includes(era));
  }
  assert.doesNotMatch(app, /id:'(?:1g|2g|3g|4g|5g|6g|era[1-6]|G[1-6])'/);
});

test('timeline and 3D portal clicks reach the era-selection/entry chain and emit diagnostic events', () => {
  for (const event of ['ERA_CLICK', 'ERA_ID_RECEIVED', 'ERA_ENTER_REQUEST', 'ERA_VALIDATION_START', 'ERA_VALIDATION_RESULT', 'ERA_CONTENT_LOAD', 'ERA_ENTER_SUCCESS', 'ERA_ENTER_FAILED']) {
    assert.ok(app.includes(event) || viewer.includes(event), `missing ${event}`);
  }
  assert.match(app, /onclick="selectGalleryEra\('\+i\+?'\)/);
  assert.match(app, /function selectGalleryEra\(i,source='timeline'\)[\s\S]*?showGalleryEra\(i\)/);
  assert.match(viewer, /window\.InteractionDebugger\?\.record\('ERA_CLICK', 'archive3d\.selectAt'/);
  assert.match(app, /onclick="enterSelectedEra\(\$\{i\}\)"/);
});

test('locked era information gives a visible reason and disables the entry action', () => {
  assert.match(app, /access\.ok\?`<button class="btn" onclick="enterSelectedEra/);
  assert.match(app, /<p class="era-entry-lock" role="status">\$\{escapeHtml\(access\.reason/);
  assert.match(app, /type="button" disabled title="\$\{escapeHtml\(access\.reason/);
  assert.match(galleryCss, /\.gallery-info \.era-entry-lock/);
});

test('gallery canvas clicks are not intercepted by hidden status panels; UI layers remain above the canvas', () => {
  assert.match(galleryCss, /#galleryStatus\[hidden\],#galleryInfo\[hidden\]\{display:none!important\}/);
  assert.match(galleryCss, /\.gallery-info\{position:absolute;z-index:2/);
  assert.match(galleryCss, /\.review-timeline\{position:absolute;z-index:3/);
  assert.match(galleryCss, /\.gallery-status\{position:absolute;z-index:3/);
  assert.match(app, /status\.hidden=false;status\.innerHTML='<div class="transit-message"/);
  assert.match(app, /status\.hidden=true;\s*window\.InteractionDebugger\?\.record\('GALLERY_READY'/);
});

test('debug snapshots expose the current era access table in the browser console', () => {
  assert.match(app, /getEraStatus\(\)\{return eras\.map\(\(era,index\)=>\{const access=progressionEraAllowed\(era\.id\)/);
  assert.match(app, /record\('ERA_STATUS','app\.init',\{eras:eraStatus\}\)/);
});
