'use strict';
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const base=path.resolve(__dirname,'..'), window={}, context=vm.createContext({window});
for(const file of ['lan-dialogue-1g.js','lan-dialogue-2g.js','lan-dialogue-3g.js','lan-dialogue-3g-archive.js','lan-dialogue-4g.js','lan-dialogue-5g.js','lan-dialogue-6g.js'])vm.runInContext(fs.readFileSync(path.join(base,'assets/js',file),'utf8'),context);
const code=fs.readFileSync(path.join(base,'assets/js/lan-system.js'),'utf8');
try{vm.runInContext(code.replace('  const blankMemory=',"  root.__voiceLines=dialogueData;throw new Error('voice-collection-finished');\n  const blankMemory="),context);}catch(e){if(e.message!=='voice-collection-finished')throw e;}
const entries=new Map();
function add(value,emotion='warm'){
 for(const text of (Array.isArray(value)?value:[value]).flatMap(s=>String(s).split(/\n+/)).map(s=>s.trim()).filter(Boolean)){
  if(!entries.has(text))entries.set(text,{text,emotion,file:crypto.createHash('sha256').update(text).digest('hex').slice(0,20)+'.mp3'});
 }
}
for(const entry of window.__voiceLines)add(entry.dialogue,entry.emotion);
for(const file of ['lan-system.js','independent-interactions.js']){
 const text=fs.readFileSync(path.join(base,'assets/js',file),'utf8');
 for(const match of text.matchAll(/'((?:\\.|[^'\\\r\n])*)'|"((?:\\.|[^"\\\r\n])*)"/g)){
  let value;try{value=vm.runInNewContext(match[0]);}catch(_){continue;}
  if(typeof value==='string'&&/[\u4E00-\u9FFF]/u.test(value)&&/[。？！：…]/u.test(value)&&value.length>=5&&value.length<=500&&!/[<>]|\bfunction\b|\breturn\b/.test(value))add(value,/失败|故障|暂停|未完成|无法|限制/.test(value)?'thinking':/成功|回复|送达|完成|抵达/.test(value)?'success':'warm');
 }
}
for(const city of ['北京','上海','广州']){add('已选择'+city+'。现在可以打开天气栏目。');add('已显示'+city+'的预设教学天气，不是实时预报。');}
for(const junction of ['校园路口','车站路口'])add('正在调整'+junction+'。');
for(const result of ['方向已更新','移动一格','碰撞或边界限制：移动未执行'])for(const end of ['；已抵达过目标区域。','；可以继续探索或结束。'])add(result+end);
add('你好，我是澜。咦，这段通话怎么突然断了？先别急，我们一起找找原因。你看，信号在这里变弱了。没错，就是这条线索！来，我们再试一次。','curious');
add('你好，我是澜。听，远方的声音已经传来了。准备好了吗？我们一起去看看！','curious');
const list=[...entries.values()];fs.mkdirSync(path.join(base,'assets/media/voice'),{recursive:true});fs.writeFileSync(path.join(base,'assets/media/voice/lines.json'),JSON.stringify(list,null,2));
console.log(JSON.stringify({lines:list.length,characters:list.reduce((n,e)=>n+e.text.length,0)}));
