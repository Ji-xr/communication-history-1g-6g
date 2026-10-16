'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function runtime(){const window={};const localStorage={getItem:()=>null,setItem(){}};const document={getElementById:()=>null,body:{append(){}},createElement:()=>({})};const context={window,localStorage,document,Date,JSON,String,Object,Array,Math,Set,console};for(const file of ['assets/js/era-archive-3g.js','assets/js/era-archive-4g.js','assets/js/era-archive-5g.js','assets/js/lan-dialogue-3g.js','assets/js/lan-dialogue-3g-archive.js','assets/js/lan-dialogue-4g.js','assets/js/lan-dialogue-5g.js','assets/js/experience-story-4g.js','assets/js/experience-story-5g.js','assets/js/lan-system.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);return window;}

test('时代归档查询读取现有3G、4G与5G归档，不改写源对象',()=>{const window=runtime(),archives=window.CommsArchiveLan.getEraArchives();assert.deepEqual(Array.from(archives,item=>item.era),['3G','4G','5G']);assert.equal(window.EraArchive.getByEra('3G'),window.EraArchive3G);assert.deepEqual(Array.from(window.getEraArchives(),item=>item.id),Array.from(window.EraArchive.getAll(),item=>item.id));assert.equal(archives[0].id,'archive_3g');assert.equal(archives[1].id,'archive_4g');assert.equal(archives[1].completed,false);assert.ok(archives[1].keywords.length>0);assert.equal(archives[1].title,'看见世界');assert.equal(archives[2].title,'万物互联')});

test('时代归档查询可随1G—6G数据文件增加而扩展',()=>{const window=runtime();window.EraArchive5G={id:'archive_5g',era:'5G',title:'测试档案'};assert.ok(window.CommsArchiveLan.getEraArchives().some(item=>item.era==='5G'))});
