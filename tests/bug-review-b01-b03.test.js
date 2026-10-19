'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createRequire}=require('node:module');
const app=fs.readFileSync('app.js','utf8');
const Quiz=require('../assets/js/quiz-data.js');
function fn(name){
  const start=app.indexOf(`function ${name}(`);assert.ok(start>=0,name);
  let depth=0,quote='',escaped=false;
  for(let i=app.indexOf('{',start);i<app.length;i++){
    const c=app[i];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';continue}
    if(['"',"'",'`'].includes(c)){quote=c;continue}if(c==='{')depth++;else if(c==='}'&&--depth===0)return app.slice(start,i+1);
  }throw Error('Unclosed '+name);
}
function fixture(file,name){
  const source=fs.readFileSync(file,'utf8'),end=source.indexOf('\ntest(');assert.ok(end>0);
  const context=vm.createContext({require:createRequire(require('node:path').resolve(file)),console,process,Buffer,setTimeout,clearTimeout});
  vm.runInContext(source.slice(0,end),context,{filename:file});return vm.runInContext(name,context);
}
const demoHarness=fixture('tests/demo-route.test.js','createHarness');
const archiveHarness=fixture('tests/exhibit-archive-interaction-audit.test.js','archiveRuntime');
for(const mode of ['free','recommended'])test(`B01 旧feedback会话进出${mode}演示，反馈/题号/记录与推进一致`,()=>{
  const h=demoHarness(),ctx=h.context,storage=h.window.localStorage;
  h.window.CommsArchiveQuiz=Quiz;h.window.CommsArchiveLan.openPrologue=()=>{};
  ctx.quizStore=Quiz.createStore(h.window.DemoManager.storageProxy(storage));
  const old=Quiz.createSession(()=>0.24);Quiz.recordAnswer(old,Quiz.questionFor(old).answer);
  assert.equal('answerSubmitted' in old,false);
  ctx.quizStore.saveSession(old);ctx.quizStore.saveRecord({id:'previous',score:7,total:10,time:'2026-10-01',answers:[]});
  storage.setItem('commsArchive','{"visited":["1G"]}');
  const recordBefore=storage.getItem('commsArchive.quiz.v1.records');
  vm.runInContext(['normalizeQuizSession','quizPersist','quizRender','selectQuizOption','submitQuizAnswer','saveCompletedQuizRecordOnce','scheduleQuizAdvance','advanceQuizQuestion','nextQuizQuestion','revealQuizAnswer'].map(fn).join('\n'),ctx);
  const timers=new Map();let timer=0;ctx.setTimeout=callback=>{timers.set(++timer,callback);return timer};ctx.clearTimeout=id=>timers.delete(id);
  const box={innerHTML:''};ctx.document={querySelector:selector=>selector==='#quizBox'?box:null};ctx.escapeHtml=String;ctx.quizAutoTimer=null;
  h.window.startDemoMode(mode);
  assert.equal(ctx.quizSession,null,'演示不读取正式旧会话');
  h.window.exitDemoMode();
  assert.equal(ctx.quizSession.answerSubmitted,true);assert.equal(ctx.quizSession.feedback.questionId,old.feedback.questionId);
  assert.equal(storage.getItem('commsArchive.quiz.v1.records'),recordBefore);
  ctx.route='quiz';vm.runInContext('quizRender()',ctx);
  assert.match(box.innerHTML,/QUESTION 01 \/ 10/);assert.match(box.innerHTML,/回答正确/);assert.ok(timers.size>0);
  const staleTimer=[...timers.values()][0];
  assert.equal(vm.runInContext('nextQuizQuestion()',ctx),true);assert.equal(vm.runInContext('nextQuizQuestion()',ctx),false);
  staleTimer();
  assert.match(box.innerHTML,/QUESTION 02 \/ 10/);assert.equal(ctx.quizSession.answers.length,1);
  assert.equal(storage.getItem('commsArchive'),'{"visited":["1G"]}');
  assert.equal(storage.getItem('commsArchive.quiz.v1.records'),recordBefore);
});

function searchRuntime(){
  const ctx=archiveHarness();ctx.state={visited:['1G'],completed:[],tasks:{},evidence:[],progression:{currentEra:'1G',currentNode:'1g_entry'}};
  ctx.currentExhibitId=null;ctx.currentExhibitItemId=null;ctx.currentExhibitSource='chapter';ctx.currentExhibitTab='history';
  ctx.reviewGuideActive=true;ctx.galleryActive=false;ctx.galleryInstance=null;
  ctx.progression={currentEra:()=> '1G',state:ctx.state.progression,discoverExhibit(){throw Error('搜索不得写探索进度')}};
  ctx.reviewGuideStep=n=>{ctx.state.guide=n};ctx.dispatchLanEvent=()=>{ctx.state.dialogueTriggered=true};
  ctx.pauseFlow=()=>{};ctx.showExhibitHint=()=>{};ctx.updateReviewGuide=()=>{};
  ctx.window.CommsArchiveLan={onExhibit(){throw Error('搜索不得播放调查对白')}};
  ctx.modal=html=>{ctx.modalHTML=html};ctx.document={querySelector:selector=>selector==='#technicalChallenge1G'?{open:false,scrollIntoView(){}}:null};
  for(const name of ['sourceExhibitNotice','renderExhibitModal','showExhibitDetails','selectExhibitTab','mountExhibitTechnicalChallenge','openTechnicalChallenge','openTechnicalFlowFromSearch'])vm.runInContext(fn(name),ctx);
  ctx.window.openTechnicalFlowFromSearch=(era,id)=>vm.runInContext(`openTechnicalFlowFromSearch(${JSON.stringify(era)},${JSON.stringify(id)})`,ctx);
  const notice={textContent:''};ctx.window.document={querySelector:selector=>selector==='#knowledgeSearchNotice'?notice:null};
  ctx.window.enterEra=()=>{throw Error('技术资料不应调用enterEra')};
  vm.runInContext(fs.readFileSync('assets/js/knowledge-search.js','utf8'),ctx);
  return {ctx,api:ctx.window.CommsArchiveKnowledgeSearch,notice};
}
test('B02 六代流程结果实际打开匹配技术内容，不改变入口/现场/技术节点的进度',()=>{
  const {ctx,api}=searchRuntime();
  for(const node of ['entry','scene','technology'])for(const flow of ctx.window.CommsArchiveContent.flows){
    ctx.state.progression.currentNode='1g_'+node;const before=JSON.stringify(ctx.state);
    const row=api.records(ctx.window.CommsArchiveContent).find(x=>x.flowId===flow.flowId);
    assert.ok(row);assert.equal(api.openResult(row.id,row.eraId),true);
    assert.equal(ctx.currentExhibitId,row.eraId);assert.equal(ctx.currentExhibitTab,'technology');
    assert.ok(ctx.modalHTML.includes(flow.flowId));assert.ok(ctx.modalHTML.includes(row.eraId+'技术流程图'));
    assert.equal(JSON.stringify(ctx.state),before);
  }
});
test('B02 搜索资料切换页签及查看技术难点，不推进首次引导或触发任务',()=>{
  const {ctx,api}=searchRuntime(),row=api.records(ctx.window.CommsArchiveContent).find(x=>x.flowId&&x.eraId==='1G');
  assert.equal(api.openResult(row.id,'1G'),true);const before=JSON.stringify(ctx.state);
  vm.runInContext("selectExhibitTab('history');selectExhibitTab('technology');openTechnicalChallenge('1G')",ctx);
  assert.equal(JSON.stringify(ctx.state),before);
});
test('B02 未知结果、错误时代、缺失流程与无效关联均明确反馈失败',()=>{
  const {ctx,api,notice}=searchRuntime(),row=api.records(ctx.window.CommsArchiveContent).find(x=>x.flowId&&x.eraId==='1G'),before=JSON.stringify(ctx.state);
  for(const [id,era] of [['missing','1G'],[row.id,'2G']]){notice.textContent='';assert.equal(api.openResult(id,era),false);assert.ok(notice.textContent)}
  const getFlow=ctx.window.CommsArchiveContent.getFlow;ctx.window.CommsArchiveContent.getFlow=()=>null;
  notice.textContent='';assert.equal(api.openResult(row.id,'1G'),false);assert.match(notice.textContent,/无法|未找到/);
  ctx.window.CommsArchiveContent.getFlow=getFlow;
  ctx.window.CommsArchiveContent.flows.push({flowId:'flow.invalid.1g',eraId:'1G',steps:[],theme:[],explanation:'无展品关系的测试流程'});
  const invalid=api.records(ctx.window.CommsArchiveContent).find(x=>x.flowId==='flow.invalid.1g');
  notice.textContent='';assert.equal(api.openResult(invalid.id,'1G'),false);assert.ok(notice.textContent);
  assert.equal(JSON.stringify(ctx.state),before);
});

const answerContext=vm.createContext({});vm.runInContext(fn('answerKnowledge'),answerContext);
const answer=q=>vm.runInContext(`answerKnowledge(${JSON.stringify(q)})`,answerContext);
test('B03 五种中文比较表达、英文vs和中文代际名称均返回对应时代比较',()=>{
  for(const word of ['不同','区别','差异','对比','相比']){
    const result=answer(`5G和4G有什么${word}？`);assert.match(result,/4G：/);assert.match(result,/5G：/);
  }
  assert.match(answer('第一代和第二代的区别'),/1G：.*2G：/);
  assert.match(answer('4G vs 5G'),/4G：.*5G：/);
  assert.match(answer('5G和6G相比'),/6G：.*研究/);
});

test('知识搜索可返回搜索前页面并恢复时代与滚动位置',()=>{
  const ctx=vm.createContext({
    state:{completed:[]},route:'chapter',eraIndex:3,knowledgeSearchReturnContext:null,
    archiveReturnContext:null,pendingRouteScrollRestore:null,transitionInProgress:false,
    galleryActive:false,galleryReturn:false,travelTimer:null,reviewGuideActive:false,
    eras:[{id:'4G'}],clearTimeout(){},close3DGallery(){},
    window:{scrollY:845,InteractionDebugger:{record(){}},DemoManager:{saveView(){}},CommsArchiveLan:{dismissRouteDialogue(){}}},
    renderSnapshots:[]
  });
  ctx.render=()=>ctx.renderSnapshots.push({route:ctx.route,eraIndex:ctx.eraIndex,scrollY:ctx.pendingRouteScrollRestore});
  vm.runInContext(`${fn('go')}\n${fn('returnFromKnowledgeSearch')}`,ctx);
  assert.equal(vm.runInContext("go('search')",ctx),true);
  assert.equal(ctx.knowledgeSearchReturnContext.route,'chapter');
  assert.equal(ctx.knowledgeSearchReturnContext.eraIndex,3);
  assert.equal(ctx.knowledgeSearchReturnContext.scrollY,845);
  assert.equal(vm.runInContext("go('ask');go('search')",ctx),true,'在搜索和问答之间切换时保留原始页面');
  assert.equal(ctx.knowledgeSearchReturnContext.route,'chapter');
  assert.equal(vm.runInContext('returnFromKnowledgeSearch()',ctx),true);
  assert.equal(ctx.route,'chapter');
  assert.equal(ctx.eraIndex,3);
  assert.equal(ctx.pendingRouteScrollRestore,845);
  assert.equal(ctx.knowledgeSearchReturnContext,null);
  assert.equal(ctx.renderSnapshots.at(-1).route,'chapter');
  ctx.route='archive';ctx.archiveReturnContext={route:'chapter',eraIndex:3,scrollY:412};
  assert.equal(vm.runInContext("go('search')",ctx),true);
  assert.equal(ctx.archiveReturnContext.route,'chapter','从档案馆进入搜索时保留档案馆自己的返回位置');
  assert.equal(vm.runInContext('returnFromKnowledgeSearch()',ctx),true);
  assert.equal(ctx.route,'archive');
  assert.equal(ctx.archiveReturnContext.scrollY,412);
});
test('B03 单代问题即使带其他主题词，也不能被改答为另一代',()=>{
  assert.match(answer('4G工业应用有什么特点？'),/^4G/);
  assert.match(answer('2G与移动互联网有什么关系？'),/^2G/);
  assert.match(answer('第六代有什么特点？'),/^6G/);
  assert.match(answer('5代有什么特点？'),/^5G/);
  assert.match(answer('什么是LTE？'),/^4G/);
  assert.doesNotMatch(answer('5G有哪些特点？'),/按你提到的时代对比/);
});
