'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('all catalogued neural recordings contain complete MPEG audio frames',()=>{
 const window={};vm.runInNewContext(fs.readFileSync('assets/js/lan-voice-catalog.js','utf8'),{window});
 const lines=JSON.parse(fs.readFileSync('assets/media/voice/lines.json','utf8'));
 assert.equal(Object.keys(window.LanVoiceCatalog).length,lines.length);
 for(const entry of lines){
  const file=window.LanVoiceCatalog[entry.text];assert.equal(file,'assets/media/voice/'+entry.file);
  const bytes=fs.readFileSync(file);let offset=0,frames=0;assert.ok(bytes.length>500,file);
  while(offset<bytes.length){
   assert.ok(offset+4<=bytes.length,file+' truncated header');const h=bytes.readUInt32BE(offset);
   assert.equal((h>>>21)&2047,2047,file+' invalid sync');const version=(h>>>19)&3,layer=(h>>>17)&3;
   assert.ok(version!==1&&layer===1,file+' MPEG Layer III required');
   const bitrates=version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
   const bitrate=bitrates[(h>>>12)&15],sampleIndex=(h>>>10)&3;
   assert.ok(bitrate&&sampleIndex<3,file+' invalid audio configuration');
   const rate=[44100,48000,32000][sampleIndex]/(version===3?1:version===2?2:4);
   const size=Math.floor((version===3?144:72)*bitrate*1000/rate)+((h>>>9)&1);
   assert.ok(offset+size<=bytes.length,file+' truncated frame');offset+=size;frames++;
  }
  assert.ok(frames>=3,file+' too few frames');
 }
});
test('all main dialogue subtitles have a corresponding natural recording',()=>{
 const window={},context=vm.createContext({window});
 for(const file of ['lan-dialogue-1g.js','lan-dialogue-2g.js','lan-dialogue-3g.js','lan-dialogue-3g-archive.js','lan-dialogue-4g.js','lan-dialogue-5g.js','lan-dialogue-6g.js','lan-voice-catalog.js'])vm.runInContext(fs.readFileSync('assets/js/'+file,'utf8'),context);
 const code=fs.readFileSync('assets/js/lan-system.js','utf8');
 try{vm.runInContext(code.replace('  const blankMemory=',"  root.__lines=dialogueData;throw new Error('collected');\n  const blankMemory="),context);}catch(e){if(e.message!=='collected')throw e;}
 const missing=[];for(const entry of window.__lines)for(const line of (Array.isArray(entry.dialogue)?entry.dialogue:[entry.dialogue]).flatMap(v=>v.split(/\n+/))){if(line.trim()&&!window.LanVoiceCatalog[line.trim()])missing.push(entry.id+': '+line);}
 assert.deepEqual(missing,[]);
});
