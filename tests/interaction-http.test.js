'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net'),{spawn}=require('node:child_process');
test('本地服务器真实HTTP提供MP4、字节范围、HEAD与越界反馈',{skip:process.platform!=='win32',timeout:20000},async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'comms-interaction-http-'));
 const launcher=path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
 fs.copyFileSync('serve.ps1',path.join(directory,'serve.ps1'));const video=Buffer.alloc(100,42);fs.writeFileSync(path.join(directory,'test.mp4'),video);fs.writeFileSync(path.join(directory,'test.mp3'),video);fs.writeFileSync(path.join(directory,'index.html'),'<meta charset="utf-8">测试中文😀');
 const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const child=spawn(launcher,['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(directory,'serve.ps1'),'-Port',String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']});let errors='';child.stderr.on('data',b=>errors+=b);child.on('error',e=>errors+=e.message);
 try{
  const url='http://127.0.0.1:'+port+'/test.mp4';let ready=false;
  for(let i=0;i<70;i++){try{const r=await fetch(url);await r.arrayBuffer();ready=true;break;}catch(_){await new Promise(resolve=>setTimeout(resolve,100));}}
  assert.ok(ready,errors||'服务器未启动');
  const full=await fetch(url);assert.equal(full.status,200);assert.equal(full.headers.get('content-type'),'video/mp4');assert.equal((await full.arrayBuffer()).byteLength,100);
  const audio=await fetch(url.replace('test.mp4','test.mp3'));assert.equal(audio.headers.get('content-type'),'audio/mpeg');assert.equal((await audio.arrayBuffer()).byteLength,100);
  const html=await fetch(url.replace('test.mp4','index.html'));assert.match(html.headers.get('content-type'),/charset=utf-8/);assert.match(await html.text(),/测试中文😀/u);
  const partial=await fetch(url,{headers:{Range:'bytes=10-19'}});assert.equal(partial.status,206);assert.equal(partial.headers.get('content-range'),'bytes 10-19/100');assert.equal((await partial.arrayBuffer()).byteLength,10);
  const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'100');assert.equal((await head.arrayBuffer()).byteLength,0);
  const invalid=await fetch(url,{headers:{Range:'bytes=1000-'}});assert.equal(invalid.status,416);assert.equal(invalid.headers.get('content-range'),'bytes */100');await invalid.arrayBuffer();
  const missing=await fetch('http://127.0.0.1:'+port+'/missing.mp4');assert.equal(missing.status,404);await missing.arrayBuffer();
 }finally{
  fs.writeFileSync(path.join(directory,'.stop-server'),'stop');
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(()=>{child.kill();resolve();},1500))]);
  const resolved=path.resolve(directory);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep+'comms-interaction-http-'));fs.rmSync(resolved,{recursive:true,force:true});
 }
});
