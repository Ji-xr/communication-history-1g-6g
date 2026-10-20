'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const extensions = new Set(['.py','.js','.cjs','.html','.css','.json','.svg','.md','.txt','.ps1','.vtt']);
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules','.git','verification'].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? files(target) : extensions.has(path.extname(entry.name)) ? [target] : [];
  });
}
test('all source text is strict UTF-8 without replacement characters or invalid controls', () => {
  const errors = [];
  for (const file of files(root)) {
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file)); }
    catch (_) { errors.push(path.relative(root,file)+': invalid UTF-8'); continue; }
    if (/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text)) errors.push(path.relative(root,file)+': replacement or control character');
  }
  assert.deepEqual(errors, []);
});
test('HTML entry declares UTF-8 before loading source code', () => {
  const text = fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(text.slice(0,250), /<meta charset="utf-8">/i);
  assert.ok(text.indexOf('lan-voice.js') < text.indexOf('lan-system.js'));
});
