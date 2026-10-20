'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),report={syntax:[],utf8:[],css:[],resources:[],failures:[]};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function walk(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=['app.js','index.html','style.css',...walk('assets'),...walk('tests/browser')];
for(const p of files){
 if(/\.(js|cjs)$/.test(p)){const r=spawnSync(process.execPath,['--check',path.join(root,p)],{encoding:'utf8'});report.syntax.push(p);if(r.status!==0)report.failures.push({path:p,error:r.stderr});}
 if(/\.(html|js|cjs|css)$/.test(p)){try{new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(path.join(root,p)));report.utf8.push(p);}catch(e){report.failures.push({path:p,error:e.message});}}
 if(p.endsWith('.css')){
  const s=read(p).replace(/\/\*[\s\S]*?\*\//g,'').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,'');let depth=0;for(const char of s){if(char==='{')depth++;if(char==='}')depth--;if(depth<0)break;}report.css.push(p);if(depth!==0)report.failures.push({path:p,error:'CSS括号不配对'});
  for(const m of read(p).matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g))resource(m[1],path.dirname(p));
 }
}
function resource(url,dir=''){if(/^(https?:|data:|#|\/\/)/.test(url)||url.includes('${'))return;const rel=path.normalize(path.join(dir,url.split(/[?#]/)[0]));report.resources.push(rel);if(!fs.existsSync(path.join(root,rel)))report.failures.push({path:rel,error:'本地资源缺失'});}
for(const m of read('index.html').matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g))resource(m[1]);
resource('assets/media/video/flower.mp4');resource('assets/css/independent-interactions.css');resource('assets/js/independent-interactions.js');
for(const m of read('tests/browser/independent-interactions.html').matchAll(/<script>([\s\S]*?)<\/script>/g)){try{new(require('node:vm').Script)(m[1]);}catch(e){report.failures.push({path:'tests/browser/independent-interactions.html',error:e.message});}}
const summary={syntaxFiles:report.syntax.length,utf8Files:report.utf8.length,cssFiles:report.css.length,resourceReferences:report.resources.length,failures:report.failures};
const destination=path.join(root,'verification/independent-interactions');fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'static-checks.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(report.failures.length)process.exitCode=1;
