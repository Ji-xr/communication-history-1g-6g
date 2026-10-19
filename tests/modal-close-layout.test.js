'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('style.css','utf8');
const modalSource=source.split(/\r?\n/).find(line=>line.startsWith('function modal(content)'));
test('相关HTML、JS和CSS为有效UTF-8，关闭控件中文没有替换字符',()=>{
  const files=['index.html','app.js','style.css',...fs.readdirSync('assets/js').filter(f=>f.endsWith('.js')).map(f=>'assets/js/'+f),...fs.readdirSync('assets/css').filter(f=>f.endsWith('.css')).map(f=>'assets/css/'+f)];
  const decoder=new TextDecoder('utf-8',{fatal:true});
  for(const file of files){const text=decoder.decode(fs.readFileSync(file));assert.doesNotMatch(text,/锟斤拷|Ã|\uFFFD|ï¿½/,file)}
  assert.match(fs.readFileSync('index.html','utf8'),/<meta charset="utf-8"/i);
  assert.match(modalSource,/>关闭 ×<\/button>/);
});
test('实际弹窗函数保持完整中文与关闭回调，关闭后恢复原触发按钮焦点',()=>{
  let focused=false;const trigger={focus(options){focused=options.preventScroll===true}},root={innerHTML:'',querySelector(){return null}};
  const context=vm.createContext({document:{activeElement:trigger,querySelector:()=>root},modalTrigger:null,currentExhibitSource:'search',currentExhibitId:'1G',route:'search',pauseFlow(){},requestAnimationFrame(fn){fn()}});
  vm.runInContext(modalSource,context);
  vm.runInContext("modal('<h2>1G技术原理</h2><p>覆盖与容量</p>')",context);
  assert.match(root.innerHTML,/<h2>1G技术原理<\/h2>/);assert.match(root.innerHTML,/class="close" onclick="closeModal\(\)">关闭 ×/);
  vm.runInContext('closeModal()',context);assert.equal(root.innerHTML,'');assert.equal(focused,true);
});
test('关闭控件与正文独立分行，窄屏任意换行规则不会让关闭文字竖排',()=>{
  const rules=css.slice(css.indexOf('/* Keep the close control separate'));
  assert.match(rules,/\.modal-head\s*\{[^}]*display:\s*grid/);
  assert.match(rules,/\.modal-head > div\s*\{[^}]*grid-row:\s*2/);
  const close=/\.modal-head > \.close\s*\{([^}]+)\}/.exec(rules)?.[1]||'';
  for(const expected of [/grid-row:\s*1/,/min-width:\s*76px/,/min-height:\s*44px/,/white-space:\s*nowrap/,/writing-mode:\s*horizontal-tb/,/flex-shrink:\s*0/,/overflow-wrap:\s*normal/])assert.match(close,expected);
  assert.match(css,/\.modal\{[^}]*max-height:86vh;overflow:auto/);
  assert.match(fs.readFileSync('assets/css/mobile-reading.css','utf8'),/overflow-y:\s*auto/);
  assert.doesNotMatch(rules,/!important/);
});
