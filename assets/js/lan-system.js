/* 《通信简史》澜角色对白、字幕组件与图像档案桥接。无需联网或第三方依赖。 */
(function (root) {
  'use strict';
  const PREF_KEY = 'commsArchive.lanPrefs.v1';
  const HISTORY_KEY = 'commsArchive.lanHistory.v1';
  const MEMORY_KEY = 'commsArchive.lanMemory.v1';
  const character = root.LanCharacterProfile || {
    id: 'lan', name: '澜', identity: '来自未来通信文明档案馆的年轻科研人员。',
    profession: '通信科研人员', role: '与用户平等协作的科研伙伴',
    relationship: { type: '科研伙伴' }, personality: ['理性', '好奇', '温和'],
    coreRegret: '曾经只记录通信技术的发展，却忽略了技术背后人的感受。',
    growthStages: { '1G': '探索', '2G': '探索', '3G': '观察', '4G': '观察', '5G': '连接', '6G': '理解' },
    appearance: '深色中长发、深灰蓝或浅琥珀眼睛，穿蓝绿色与暖白配色的轻量未来科研外套。',
    timelineRole: '作为平等科研伙伴，与用户共同补全技术记录背后的人的通信历史。'
  };
  const journeyLines = {
    firstVisit: ['你好，我是澜，来自未来通信文明档案馆的年轻科研人员。', '我正在调查档案中缺失的通信生活记录。现有资料写下了技术如何发展，却很少说明它怎样进入日常。', '愿意和我一起走进这些时代，看看通信如何改变人与人的联系吗？', '准备好了吗，搭档？第一站交给你来决定。'],
    prologue: ['第一次穿越总会有点紧张——放心，我也会边走边核对档案。', '每次选择都可能找到新线索。第一站，由你决定。'],
    gallery: ['选好下一站了吗？我会把已知资料和仍待验证的地方都标清楚。'],
    exhibit: ['先看实物留下的线索，再顺着原理图追一遍信号。图片说明与来源也在档案里。'],
    taskStart: ['先别急着下结论。选一条线索，我们一起看看它能说明什么。'],
    taskComplete: ['记录完成了。你找到的不只是答案，还有它为什么成立的证据。'],
    archive: ['每张证据卡都连着一次调查。想复核展品或流程图，点关联资料就能继续。'],
    era: {
      // Keep the legacy entrance ID for saved dialogue history, but do not
      // replay the formal arrival greeting when returning to the 1G chapter.
      '1G': ['欢迎回来。早期移动通话的线索还在这里，我们可以继续探索。'],
      '2G': ['你发现了吗？通信开始不只是传递声音，也开始记录人与人的关系。'],
      '3G': ['手机逐渐不只是电话，也成为通往互联网信息的小窗口。'],
      '4G': ['移动宽带发展以后，人们更方便地分享生活。通信也改变了每个人表达自己的方式。'],
      '5G': ['这一次，被连接的不只是人。机器、城市和产业也开始加入更多通信应用场景。'],
      '6G': ['欢迎来到未来通信研究情境。这里展示的是探索方向，不是已经普遍商用的能力。']
    },
    progress: {
      '3G': ['以前我们记录网络速度，现在我开始理解，手机连接互联网也改变了人们获取信息、看见彼此的方式。'],
      '5G': ['连接越来越多，但我们不能忘记，连接最终要服务于人。设备与系统可靠协作，才能让技术真正回应生活中的需要。']
    },
    ending: ['从1G—5G的历史回顾到6G的未来研究展望，我们把模拟调查与人的体验一同整理入档。', '我曾经认为，通信历史记录的是技术进步。但和你一起经历这些时代后，我发现……', '真正被连接的，是人与人之间想被听见、被看见、被理解的瞬间。我们把这份档案命名为《连接的文明：人类通信六代记录》。']
  };
  const DIALOGUE_TYPES = ['story', 'hint', 'optional', 'choice'];
  const STORY_LINES = ['main', 'builder', 'experience', 'archive'];
  const EMOTIONS = ['expecting', 'research', 'thinking', 'nostalgia', 'warm', 'encourage', 'success', 'happy', 'curious'];
  function normalizeEmotion(value) {
    const aliases = { nostalgic: 'nostalgia', respect: 'thinking', serious: 'research', warning: 'thinking', companion: 'warm', proud: 'success' };
    const normalized = aliases[String(value || '').trim().toLowerCase()] || String(value || '').trim().toLowerCase();
    return EMOTIONS.includes(normalized) ? normalized : 'thinking';
  }
  function normalizeTrigger(value, era = '') {
    const trigger = String(value || '').trim();
    if (era === '4G' && /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i.test(trigger)) return trigger.toUpperCase();
    return trigger;
  }
  function normalizeDialogue(item = {}) {
    const declaredType=item.dialogueType||item.presentation||item.type;
    const dialogueType = DIALOGUE_TYPES.includes(declaredType) ? declaredType : 'optional';
    const storyLine = STORY_LINES.includes(item.storyLine) ? item.storyLine : 'main';
    const text = item.text ?? item.dialogue ?? '';
    return { ...item, id: String(item.id || ''), era: item.era || null, location: String(item.location || 'companion'), trigger: normalizeTrigger(item.trigger, item.era), emotion: normalizeEmotion(item.emotion), dialogueType, storyLine, text, dialogue: item.dialogue ?? text, next: item.next ?? null, unlockCondition: item.unlockCondition ?? '' };
  }
  const dialogueData = [];
  function add(id, era, location, trigger, emotion, text, relatedTask = null, relatedExhibit = null) {
    dialogueData.push({ id, era, location, trigger, emotion, dialogue: text, text, image: null, voice: null, relatedTask, relatedExhibit });
  }
  add('lan.home.first-visit', null, 'home', 'first-visit', 'happy', journeyLines.firstVisit);
  add('lan.prologue.first-travel', null, 'prologue', 'open', 'curious', journeyLines.prologue);
  add('lan.gallery.select-era', null, 'gallery', 'select-era', 'curious', journeyLines.gallery);
  add('lan.exhibit.open', null, 'exhibit', 'open-details', 'thinking', journeyLines.exhibit);
  add('lan.task.start', null, 'task', 'start-investigation', 'thinking', journeyLines.taskStart);
  add('lan.task.complete', null, 'task', 'complete-investigation', 'happy', journeyLines.taskComplete);
  add('lan.archive.open', null, 'archive', 'open', 'companion', journeyLines.archive);
  Object.entries(journeyLines.era).forEach(([era, text]) => add(`lan.${era.toLowerCase()}.entrance`, era, 'entrance', 'enter-era', era === '6G' ? 'thinking' : 'happy', text));
  add('lan.3g.relationship-insight', '3G', 'task-reveal', 'reveal-truth', 'thinking', journeyLines.progress['3G']);
  add('lan.5g.connection-insight', '5G', 'task-reveal', 'reveal-truth', 'curious', journeyLines.progress['5G']);
  // 保留旧对白 ID，避免已保存的历史记录失效；内容已改为研究完成总结，不再包含身份反转。
  // 保留旧对白 ID，避免已保存的阅读记录失效；其对白内容已改为研究完成总结。
  add('lan.6g.identity-reveal', '6G', 'ending', 'journey-complete', 'nostalgic', journeyLines.ending);
  [...(root.LanDialogues1G || []), ...(root.LanDialogues2G || []), ...(root.LanDialogues3G || []), ...(root.LanArchiveDialogues3G || []), ...(root.LanDialogues4G || []), ...(root.LanDialogues5G || []), ...(root.LanDialogues6G || [])].forEach((item) => dialogueData.push(normalizeDialogue(item)));
  for (let index = 0; index < dialogueData.length; index++) dialogueData[index] = normalizeDialogue(dialogueData[index]);

  const blankMemory=()=>({completedEras:[],completedTasks:[],collectedEvidence:[],quizRecords:[],eraArchives:[],viewedDialogues:[],skippedDialogues:[],completedEvents:[],completedTriggers:[],completedExperienceNodes:[],dialogueHistory:[],currentDialogue:'',currentDialogueLine:0,lastDialogue:'',dialogueVersion:'1.0',eraProgress:{},lanUI:{position:'bottom-right',x:0,y:0},settings:{audio:{enabled:false,volume:70},display:{lanMode:'auto'}}});
  const JOURNEY_ARRAY_FIELDS=['completedEras','completedTasks','collectedEvidence','quizRecords','eraArchives','viewedDialogues','skippedDialogues','completedEvents','completedTriggers','completedExperienceNodes','dialogueHistory'];
  const JOURNEY_STRING_FIELDS=['currentDialogue','lastDialogue','dialogueVersion'];
  const JOURNEY_SCALAR_FIELDS=['currentDialogueLine'];
  const LanDisplayMode={mode:'companion',preference:'auto'};
  root.LanDisplayMode=LanDisplayMode;
  const lanDialoguePhase={phase:'exit',sequenceId:null};
  root.lanDialoguePhase=lanDialoguePhase;
  const LAN_CORNERS=['bottom-right','bottom-left','top-left','top-right'];
  let mounted = false, queue = [], queueIndex = 0, queueDisplayMode = 'companion', collapsed = false, collapseAfterDialogue = false, lastRoute = '', historyCursor = -1, historyLines = [], historyReturnMode='companion', continueDialoguePresentation=false, lastAdvanceInputAt=0, pausedSpeechIdentity=null, settings = readPrefs(), history = readHistory(), memory = readMemory(), model = null;
  LanDisplayMode.preference=memory.settings.display.lanMode;
  function storageKey(key) { return root.DemoManager?.storageKey?.(key) || key; }
  function storageGet(key) { return localStorage.getItem(storageKey(key)); }
  function storageSet(key, value) { return localStorage.setItem(storageKey(key), value); }
  function readPrefs() { try { return { voice: JSON.parse(storageGet(PREF_KEY) || '{}')?.voice === true }; } catch (_) { return { voice: false }; } }
  function readHistory() { try { const value = JSON.parse(storageGet(HISTORY_KEY) || '[]'); return Array.isArray(value) ? value.slice(-80) : []; } catch (_) { return []; } }
  function persistHistory(entry) { history.push(entry); history = history.slice(-80); try { storageSet(HISTORY_KEY, JSON.stringify(history)); } catch (_) {} }
  function readMemory(){try{const stored=JSON.parse(storageGet(MEMORY_KEY)||'{}'),base=blankMemory();for(const key of Object.keys(base)){if(key==='lanUI'||key==='settings')continue;if(Array.isArray(base[key]))base[key]=Array.isArray(stored[key])?stored[key]:[];else if(typeof base[key]==='string')base[key]=typeof stored[key]==='string'?stored[key]:(key==='dialogueVersion'?base[key]:'');else if(typeof base[key]==='number')base[key]=Number.isInteger(stored[key])&&stored[key]>=0?stored[key]:0}base.eraProgress=stored.eraProgress&&typeof stored.eraProgress==='object'&&!Array.isArray(stored.eraProgress)?stored.eraProgress:{};const ui=stored.lanUI&&typeof stored.lanUI==='object'&&!Array.isArray(stored.lanUI)?stored.lanUI:{};base.lanUI={position:LAN_CORNERS.includes(ui.position)||ui.position==='custom'?ui.position:'bottom-right',x:Number.isFinite(ui.x)?ui.x:0,y:Number.isFinite(ui.y)?ui.y:0};const savedSettings=stored.settings&&typeof stored.settings==='object'?stored.settings:{},audio=savedSettings.audio&&typeof savedSettings.audio==='object'?savedSettings.audio:{},display=savedSettings.display&&typeof savedSettings.display==='object'?savedSettings.display:{};base.settings={audio:{enabled:typeof audio.enabled==='boolean'?audio.enabled:false,volume:Number.isFinite(audio.volume)?Math.max(0,Math.min(100,audio.volume)):70},display:{lanMode:['auto','always','minimal'].includes(display.lanMode)?display.lanMode:'auto'}};if(!base.completedTriggers.length&&base.completedEvents.length)base.completedTriggers=base.completedEvents.filter(id=>String(id).startsWith('trigger_'));if(!base.currentDialogue&&base.lastDialogue)base.currentDialogue=base.lastDialogue;if(!base.lastDialogue&&base.currentDialogue)base.lastDialogue=base.currentDialogue;return base}catch(_){return blankMemory()}}
  function saveMemory(){try{storageSet(MEMORY_KEY,JSON.stringify(memory))}catch(_){}}
  function createEmptyJourneyData(){const data={};for(const key of JOURNEY_ARRAY_FIELDS)data[key]=[];for(const key of JOURNEY_STRING_FIELDS)data[key]=key==='dialogueVersion'?'1.0':'';for(const key of JOURNEY_SCALAR_FIELDS)data[key]=0;data.eraProgress={};return{version:1,memory:data,history:[]}}
  function exportJourneyData(){const data={};for(const key of JOURNEY_ARRAY_FIELDS)data[key]=JSON.parse(JSON.stringify(memory[key]||[]));for(const key of JOURNEY_STRING_FIELDS)data[key]=String(memory[key]||'');for(const key of JOURNEY_SCALAR_FIELDS)data[key]=Math.max(0,Number(memory[key])||0);data.eraProgress=JSON.parse(JSON.stringify(memory.eraProgress||{}));return{version:1,memory:data,history:JSON.parse(JSON.stringify(history||[]))}}
  function validateJourneyData(data){if(!data||data.version!==1||!data.memory||typeof data.memory!=='object'||Array.isArray(data.memory)||!Array.isArray(data.history))return false;for(const key of JOURNEY_ARRAY_FIELDS){if(!Array.isArray(data.memory[key]))return false;const objectList=['quizRecords','eraArchives','dialogueHistory'].includes(key);if(objectList&&data.memory[key].some(item=>!item||typeof item!=='object'||Array.isArray(item)))return false;if(!objectList&&data.memory[key].some(item=>typeof item!=='string'))return false}for(const key of JOURNEY_STRING_FIELDS)if(typeof data.memory[key]!=='string')return false;for(const key of JOURNEY_SCALAR_FIELDS)if(!Number.isInteger(data.memory[key])||data.memory[key]<0)return false;if(!data.memory.eraProgress||typeof data.memory.eraProgress!=='object'||Array.isArray(data.memory.eraProgress))return false;return data.history.every(item=>item&&typeof item==='object'&&!Array.isArray(item))}
  function importJourneyData(data){if(root.DemoManager?.isActive?.()&&typeof root.DemoManager.storageKey!=='function')return false;if(!validateJourneyData(data))return false;const nextMemory=blankMemory();nextMemory.settings=JSON.parse(JSON.stringify(memory.settings||nextMemory.settings));nextMemory.lanUI={...(memory.lanUI||nextMemory.lanUI)};for(const key of JOURNEY_ARRAY_FIELDS)nextMemory[key]=JSON.parse(JSON.stringify(data.memory[key]));for(const key of JOURNEY_STRING_FIELDS)nextMemory[key]=data.memory[key];for(const key of JOURNEY_SCALAR_FIELDS)nextMemory[key]=data.memory[key];nextMemory.eraProgress=JSON.parse(JSON.stringify(data.memory.eraProgress));const nextHistory=JSON.parse(JSON.stringify(data.history.slice(-80))),memoryKey=storageKey(MEMORY_KEY),historyKey=storageKey(HISTORY_KEY);let previousMemory=null,previousHistory=null;try{previousMemory=localStorage.getItem(memoryKey);previousHistory=localStorage.getItem(historyKey);localStorage.setItem(memoryKey,JSON.stringify(nextMemory));localStorage.setItem(historyKey,JSON.stringify(nextHistory))}catch(error){try{if(previousMemory===null)localStorage.removeItem(memoryKey);else localStorage.setItem(memoryKey,previousMemory)}catch(_){}try{if(previousHistory===null)localStorage.removeItem(historyKey);else localStorage.setItem(historyKey,previousHistory)}catch(_){}root.InteractionDebugger?.record('LAN_JOURNEY_IMPORT_FAILED','CommsArchiveLan.importJourneyData',{reason:error?.message||String(error)});return false}const active=queue[queueIndex];stopSpeechForPageHide();queue=[];queueIndex=0;queueDisplayMode='companion';collapsed=false;collapseAfterDialogue=false;continueDialoguePresentation=false;lastAdvanceInputAt=0;historyLines=[];historyCursor=-1;historyReturnMode='companion';history=nextHistory;memory=nextMemory;LanDisplayMode.preference=memory.settings.display.lanMode;lastRoute='';pausedSpeechIdentity=null;setDialoguePhase('exit',active?.id||null);setDisplayMode(LanDisplayMode.preference==='minimal'?'hidden':'companion');const box=makeRoot(),caption=box.querySelector('#lanCaption');if(caption)caption.textContent='';syncCardPrompt(box,null);syncCollapseControl(box);refreshHistory();return true}
  function resetJourneyState(){
    if(root.DemoManager?.isActive?.())return false;
    const nextMemory=blankMemory();
    nextMemory.settings=JSON.parse(JSON.stringify(memory.settings||nextMemory.settings));
    nextMemory.lanUI={...(memory.lanUI||nextMemory.lanUI)};
    const memoryKey=storageKey(MEMORY_KEY),historyKey=storageKey(HISTORY_KEY);
    let previousMemory=null,previousHistory=null;
    try{
      previousMemory=localStorage.getItem(memoryKey);
      previousHistory=localStorage.getItem(historyKey);
      localStorage.setItem(memoryKey,JSON.stringify(nextMemory));
      localStorage.setItem(historyKey,'[]');
    }catch(error){
      try{if(previousMemory===null)localStorage.removeItem(memoryKey);else localStorage.setItem(memoryKey,previousMemory)}catch(_){}
      try{if(previousHistory===null)localStorage.removeItem(historyKey);else localStorage.setItem(historyKey,previousHistory)}catch(_){}
      root.InteractionDebugger?.record('LAN_JOURNEY_RESET_FAILED','CommsArchiveLan.resetJourneyState',{reason:error?.message||String(error)});
      return false;
    }
    const active=queue[queueIndex];
    stopSpeechForPageHide();pausedSpeechIdentity=null;
    queue=[];queueIndex=0;queueDisplayMode='companion';collapsed=false;collapseAfterDialogue=false;
    continueDialoguePresentation=false;lastAdvanceInputAt=0;historyLines=[];historyCursor=-1;historyReturnMode='companion';
    history=[];memory=nextMemory;LanDisplayMode.preference=memory.settings.display.lanMode;lastRoute='';
    setDialoguePhase('exit',active?.id||null);
    setDisplayMode(LanDisplayMode.preference==='minimal'?'hidden':'companion');
    const box=makeRoot(),caption=box.querySelector('#lanCaption');if(caption)caption.textContent='';
    syncCardPrompt(box,null);syncCollapseControl(box);refreshHistory();
    root.InteractionDebugger?.record('LAN_JOURNEY_RESET','CommsArchiveLan.resetJourneyState',{cancelledDialogueId:active?.id||'',queueLength:queue.length,lanControlsReleased:true,preservedSettings:true,preservedDemoStorage:true});
    return true;
  }
  function recordDialogueAction(id,action,meta={}){if(!id)return;if(action==='view'&&!memory.viewedDialogues.includes(id))memory.viewedDialogues.push(id);if(action==='skip'&&!memory.skippedDialogues.includes(id))memory.skippedDialogues.push(id);const source=find(id)||history.slice().reverse().find(item=>item.id===id),timestamp=new Date().toISOString();memory.dialogueHistory.push({id,action,time:timestamp,dialogueId:id,era:meta.era||source?.era||null,index:Number.isInteger(meta.index)?meta.index:0,viewed:action==='view',timestamp});memory.dialogueHistory=memory.dialogueHistory.slice(-200);saveMemory()}
  const allEraTriggers=[...(root.LanTriggers1G||[]),...(root.LanTriggers2G||[]),...(root.LanTriggers3G||[]),...(root.LanArchiveTriggers3G||[]),...(root.LanTriggers4G||[]),...(root.LanTriggers5G||[]),...(root.LanTriggers6G||[])];
  const experienceZonesDisabled=root.COMMS_ARCHIVE_EXPERIENCE_ZONES_DISABLED===true;
  const isExperienceDialogue=item=>String(item?.storyLine||'').toLowerCase()==='experience'||/experience/i.test(String(item?.location||''))||/experience/i.test(String(item?.id||''))||/^EXPERIENCE_/i.test(String(item?.trigger||''));
  const hiddenExperienceDialogueIds=new Set(experienceZonesDisabled?dialogueData.filter(isExperienceDialogue).map(item=>item.id):[]);
  const eraTriggers=experienceZonesDisabled?allEraTriggers.filter(item=>!/^EXPERIENCE_/i.test(String(item.event||''))&&!/experience/i.test(String(item.id||''))&&!hiddenExperienceDialogueIds.has(item.dialogueId)):allEraTriggers;
  const experienceStories = experienceZonesDisabled ? {} : Object.fromEntries(['1G','2G','3G','4G','5G','6G'].map((era) => [era, root[`ExperienceStory${era}`] || (era === '3G' ? root.ExperienceStory3G : null)]).filter(([, story]) => !!story));
  root.ExperienceStory = experienceStories;
  function getExperienceStory(era) { return experienceZonesDisabled ? null : experienceStories[era] || root[`ExperienceStory${era}`] || (era === '3G' ? root.ExperienceStory3G : null) || null; }
  function getEraArchives() { return ['1G','2G','3G','4G','5G','6G'].map((era) => root[`EraArchive${era}`]).filter(Boolean); }
  root.getEraArchives = getEraArchives;
  root.EraArchive = { getAll: getEraArchives, getByEra: era => getEraArchives().find(item => item.era === era) || null };
  const activeEraTriggers=eraTriggers;
  const activeDialogueData=experienceZonesDisabled?dialogueData.filter(item=>!isExperienceDialogue(item)):dialogueData;
  const LanTrigger=[...activeDialogueData.map(item=>({id:'trigger.'+item.id,page:item.location,condition:item.trigger,priority:item.location==='entrance'?'high':'normal',dialogueId:item.id})),...activeEraTriggers];
  const isEraLine=id=>/^lan_[1-6]g_/.test(String(id||''));
  function progressionEntryId(dialogue){const match=String(dialogue?.id||'').match(/^lan_([1-6])g_enter_001$/);return match?`lan.${match[1]}g.chapter-entry`:dialogue?.id||null}
  function triggerAt(page,condition,era=null){const rule=LanTrigger.find(item=>item.page===page&&item.condition===condition&&(!era||activeDialogueData.find(d=>d.id===item.dialogueId)?.era===era));return rule?trigger(rule.dialogueId,era):false}
  function matchingEventRule(event,context={}){return activeEraTriggers.filter(item=>item.event===event).sort((a,b)=>(a.priority||9)-(b.priority||9)).find(item=>Object.entries(item.condition||{}).every(([key,value])=>context[key]===value))||null}
  function dispatchEvent(event,context={}){const rule=matchingEventRule(event,context);if(!rule||memory.completedTriggers.includes(rule.id)||memory.completedEvents.includes(rule.id))return false;const fired=trigger(rule.dialogueId,context.era,{trigger:event});if(!fired)return false;if(!memory.completedTriggers.includes(rule.id))memory.completedTriggers.push(rule.id);if(!memory.completedEvents.includes(rule.id))memory.completedEvents.push(rule.id);saveMemory();if(/ARCHIVE|UNLOCK/i.test(event))window.AudioSystem?.playEffect('archive');else if(/TASK_COMPLETE|EXPERIENCE_MERGE/i.test(event))window.AudioSystem?.playEffect('complete');else if(/EXHIBIT/i.test(event))window.AudioSystem?.playEffect('exhibit');return true}
  function emotionLabel(emotion){return ({expecting:'期待',thinking:'思考',happy:'惊喜',encourage:'鼓励',success:'欣慰',nostalgia:'怀念',research:'研究中',curious:'好奇',warm:'温暖'})[normalizeEmotion(emotion)]||'思考'}
  const CENTRAL_DIALOGUE_LOCATIONS=new Set(['prologue','ending','entrance','scene','summary','transition','chapter-end','chapter-entry','task','task-result','task-clue','task-reveal','task-analysis','investigation','node-unlock','laboratory','technology-lab','technical-lab','research-lab','archive','experience','experience-summary']);
  function isFullExhibitExplanation(entry){
    const location=String(entry?.location||'').trim().toLowerCase();
    const match=String(entry?.id||'').match(/^lan_([1-6])g_/i);
    if(!match||!['exhibit','exhibit-detail'].includes(location))return false;
    return !entry.era||String(entry.era).toUpperCase()===`${match[1]}G`;
  }
  function priorityDialogue(entry){
    const location=String(entry?.location||'').trim().toLowerCase(),trigger=String(entry?.trigger||'').trim(),storyLine=String(entry?.storyLine||'').trim().toLowerCase();
    if(entry?.presentationMode==='dialogue'||isFullExhibitExplanation(entry))return true;
    if([entry?.dialogueType,entry?.presentation,entry?.type].includes('story')||entry?.isStory===true)return true;
    if(entry?.next||storyLine==='experience'||storyLine==='archive')return true;
    // Explicit companion metadata describes short operational hints and must
    // override broad node-location/storyline fallbacks. Formal story above
    // remains central even when a caller requests the companion presentation.
    if(entry?.presentationMode==='companion')return false;
    if(CENTRAL_DIALOGUE_LOCATIONS.has(location))return true;
    if(location==='home'&&/first-visit|welcome|prologue/i.test(`${entry?.id||''} ${trigger}`))return true;
    // Linked lines and research/investigation storylines stay in the central
    // presentation even when legacy dialogue records omit their type metadata.
    if(storyLine==='builder')return true;
    const triggerTokens=trigger.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if(triggerTokens.some(token=>['enter','entrance','start','complete','reveal','discover','analysis','research','archive','unlock','ending','transition','final','task','check','clue','investigation','technology','tech','laboratory','lab'].includes(token)))return true;
    return entry?.dialogueType==='hint'&&triggerTokens.some(token=>['enter','start','complete','reveal','archive','unlock','ending'].includes(token));
  }
  function setDisplayMode(mode) {
    LanDisplayMode.mode = ['dialogue', 'companion', 'hidden', 'history'].includes(mode) ? mode : 'companion';
    const activeLine=queue[queueIndex];
    if(queue.length&&(queueDisplayMode==='dialogue'||priorityDialogue(activeLine))){queueDisplayMode='dialogue';LanDisplayMode.mode='dialogue'}
    if (LanDisplayMode.mode === 'companion' && LanDisplayMode.preference === 'minimal') LanDisplayMode.mode = 'hidden';
    if (LanDisplayMode.mode === 'hidden') stopSpeechForPageHide();
    const box = makeRoot();
    const centered = ['dialogue', 'history'].includes(LanDisplayMode.mode);
    const modalOpen=!!document.getElementById('modalRoot')?.innerHTML;
    if(centered&&activeLine&&modalOpen)box.dataset.dialogueSurface='modal';
    else if(centered&&isFullExhibitExplanation(activeLine))box.dataset.dialogueSurface='exhibit';
    else delete box.dataset.dialogueSurface;
    if(box.dataset.mode!==LanDisplayMode.mode)box.dataset.mode = LanDisplayMode.mode;
    box.classList.toggle('lan-dialogue-center', centered);
    box.classList.toggle('lan-companion-card', LanDisplayMode.mode === 'companion');
    box.hidden = false;
    const slot = document.getElementById('progressLanSlot');
    if (centered) {
      if(box.style){box.style.left='';box.style.top='';box.style.right='';box.style.bottom=''}
      if (box.parentElement !== document.body) document.body?.append(box);
    } else {
      applySavedLanPosition(box);
      if (slot) { if (box.parentElement !== slot) slot.append(box); }
      else if (document.body && box.parentElement !== document.body) document.body.append(box);
    }
    if (document.body?.classList) document.body.classList.toggle('lan-dialogue-active', centered);
    root.ExhibitionSoundtrack?.setDucked(centered,'dialogue');
    const expand = box.querySelector('.lan-open');
    if (expand) expand.setAttribute('aria-expanded', String(centered));
    return LanDisplayMode.mode;
  }
  function syncActivePresentation(){
    const active=queue[queueIndex];
    if(active&&(queueDisplayMode==='dialogue'||priorityDialogue(active)))queueDisplayMode='dialogue';
    return setDisplayMode(queue.length?queueDisplayMode:LanDisplayMode.mode);
  }
  function setDialoguePhase(phase,sequenceId=lanDialoguePhase.sequenceId){
    lanDialoguePhase.phase=['enter','talking','exit'].includes(phase)?phase:'talking';
    lanDialoguePhase.sequenceId=sequenceId||null;
    const box=document.getElementById('lanCompanion');
    if(box&&box.dataset.dialoguePhase!==lanDialoguePhase.phase)box.dataset.dialoguePhase=lanDialoguePhase.phase;
    return lanDialoguePhase.phase;
  }
  function setDisplayPreference(preference) {
    LanDisplayMode.preference = ['auto', 'always', 'minimal'].includes(preference) ? preference : 'auto';
    memory.settings.display = { ...(memory.settings.display || {}), lanMode: LanDisplayMode.preference };
    saveMemory();
    if (!queue.length) setDisplayMode(LanDisplayMode.preference === 'minimal' ? 'hidden' : 'companion');
    return LanDisplayMode.preference;
  }
  function saveLanPosition(position=memory.lanUI.position,x=memory.lanUI.x,y=memory.lanUI.y){memory.lanUI={position,x,y};saveMemory();const box=document.getElementById('lanCompanion');if(box){box.dataset.position=position;if(position==='custom'&&box.style){box.style.left=`${x}px`;box.style.top=`${y}px`;box.style.right='auto';box.style.bottom='auto'}else if(box.style){box.style.left='';box.style.top='';box.style.right='';box.style.bottom=''}}}
  function moveCardToNextCorner(){const index=LAN_CORNERS.indexOf(memory.lanUI.position);saveLanPosition(LAN_CORNERS[(index+1+LAN_CORNERS.length)%LAN_CORNERS.length],0,0)}
  function expandDialogue(){collapsed=false;if(queue.length)queueDisplayMode='dialogue';setDisplayMode('dialogue')}
  function hideDialogue(){if(queue.length&&(queueDisplayMode==='dialogue'||priorityDialogue(queue[queueIndex])))return false;setDialoguePhase('exit',lanDialoguePhase.sequenceId);setDisplayMode('hidden');return true}
  function beginLanDrag(box,handle){if(!handle?.addEventListener||!document.addEventListener)return;handle.addEventListener('pointerdown',event=>{if(LanDisplayMode.mode==='dialogue'||event.target?.closest?.('button'))return;const rect=box.getBoundingClientRect(),startX=event.clientX,startY=event.clientY;let left=rect.left,top=rect.top,moved=false;const move=moveEvent=>{const dx=moveEvent.clientX-startX,dy=moveEvent.clientY-startY;if(!moved&&Math.hypot(dx,dy)<=6)return;moved=true;moveEvent.preventDefault?.();left=Math.max(8,Math.min((window.innerWidth||rect.width)-rect.width-8,rect.left+dx));top=Math.max(8,Math.min((window.innerHeight||rect.height)-rect.height-8,rect.top+dy));box.dataset.position='custom';if(box.style){box.style.left=`${left}px`;box.style.top=`${top}px`;box.style.right='auto';box.style.bottom='auto'}};const end=()=>{document.removeEventListener?.('pointermove',move);document.removeEventListener?.('pointerup',end);document.removeEventListener?.('pointercancel',end);if(moved){box.dataset.ignoreCardActivationUntil=String(Date.now()+350);saveLanPosition('custom',left,top)}};document.addEventListener('pointermove',move);document.addEventListener('pointerup',end,{once:true});document.addEventListener('pointercancel',end,{once:true})})}
  function syncCardPrompt(box,entry=queue[queueIndex]||null){const hasDialogue=!!entry,choiceRequired=!!entry&&(entry.dialogueType==='choice'||entry.requiresChoice===true);box.dataset.hasDialogue=String(hasDialogue);box.dataset.choiceRequired=String(choiceRequired);box.dataset.clickAdvance=String(hasDialogue&&!choiceRequired);const hint=box.querySelector('#lanCardHint');if(hint)hint.textContent=hasDialogue?(choiceRequired?'请先完成下方选择':'点击卡片继续'):'点击卡片查看澜提示';const continueButton=box.querySelector('#lanContinueButton');if(continueButton){continueButton.hidden=!hasDialogue||choiceRequired;continueButton.textContent=queueIndex===queue.length-1&&!entry?.next?'结束对白':'继续对白'}}
  function syncCollapseControl(box=makeRoot()){const button=box.querySelector('.lan-collapse');if(!button)return;button.textContent=collapseAfterDialogue?'结束后收起':'收为卡片';button.setAttribute('aria-label',collapseAfterDialogue?'取消对白结束后收起':'对白结束后收起为澜陪伴卡片');button.setAttribute('aria-pressed',String(collapseAfterDialogue))}
  const emotionColors={curious:'#6fdced',thinking:'#9bb8ef',research:'#7fc8ff',expecting:'#b09bff',nostalgia:'#d6bd83',warm:'#f0c98d',encourage:'#78ddb8',success:'#82e0b5',happy:'#83dfc9'};
  const LanEmotionController={set(emotion,box=makeRoot()){const normalized=normalizeEmotion(emotion);box.dataset.emotion=normalized;const portrait=box.querySelector('.lan-portrait');if(portrait){portrait.dataset.emotion=normalized;portrait.style?.setProperty?.('--lan-emotion-color',emotionColors[normalized]||'#9bb8ef')}const label=box.querySelector('#lanEmotion');if(label)label.textContent=emotionLabel(normalized);return normalized}};
  root.LanEmotionController=LanEmotionController;
  function setEmotion(emotion){return LanEmotionController.set(emotion)}
  function safe(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function makeRoot() {
    let box = document.getElementById('lanCompanion');
    if (box) {
      const duplicates=Array.from(document.querySelectorAll?.('#lanCompanion')||[]).filter(candidate=>candidate!==box);
      duplicates.forEach(candidate=>candidate.remove?.());
      return box;
    }
    box = document.createElement('aside'); box.id = 'lanCompanion'; box.className = 'lan-companion lan-companion-card';
    box.setAttribute('aria-label', '澜：时空通信伙伴'); box.setAttribute('role','group'); box.tabIndex=0; box.dataset.mode=LanDisplayMode.mode; box.dataset.dialoguePhase=lanDialoguePhase.phase; box.dataset.position=memory.lanUI.position;
    box.innerHTML = `<div class="lan-head"><div class="lan-drag-area" aria-label="拖动澜陪伴卡片" title="拖动以调整位置"><div class="lan-portrait lan-avatar"><img src="assets/images/Lan/lan_portrait_ai.png" alt="澜的原创AI概念形象；非历史资料" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>澜</span><i></i></div><div class="lan-ident"><strong>澜 <small>通信科研人员</small></strong><span id="lanEmotion">陪伴中</span></div></div><button class="lan-history-open" type="button" aria-label="浏览已看过的澜对白" onclick="CommsArchiveLan.toggleHistory()">对白记录</button><button class="lan-collapse" type="button" aria-label="收起为澜陪伴卡片" onclick="CommsArchiveLan.toggleCollapse()">收为卡片</button><button class="lan-open" type="button" onclick="CommsArchiveLan.expandDialogue()">查看澜提示</button><button class="lan-position-toggle" type="button" aria-label="切换澜卡片角落位置" onclick="CommsArchiveLan.moveCardToNextCorner()">换角落</button><button class="lan-hide" type="button" aria-label="暂时隐藏澜卡片" onclick="CommsArchiveLan.hideDialogue()">隐藏 ×</button></div><div class="lan-caption" id="lanCaption" role="status" aria-live="polite" aria-atomic="true">你好，穿越者。需要查看资料时，我就在这里。</div><div class="lan-actions"><span class="lan-card-hint" id="lanCardHint" aria-live="polite">点击卡片查看澜提示</span><button type="button" id="lanContinueButton" onclick="CommsArchiveLan.continueDialogue()" hidden>继续对白</button><button type="button" class="lan-skip" onclick="CommsArchiveLan.skip()">跳过</button><button type="button" id="lanRevisitButton" onclick="CommsArchiveLan.replayLastSkipped()" hidden>重看已跳过提示</button><button type="button" id="lanVoiceToggle" onclick="CommsArchiveLan.toggleVoice()">语音：关</button><button type="button" onclick="CommsArchiveLan.readCurrent()">朗读本句</button><button type="button" onclick="CommsArchiveLan.toggleHistory()">对白记录</button></div><div id="lanHistory" class="lan-history" hidden></div><div class="lan-footnote" id="lanVoiceNote">字幕始终显示；默认使用自然神经人声，可在下方试听。</div>`;
    applySavedLanPosition(box); beginLanDrag(box,box.querySelector('.lan-drag-area'));
    box.addEventListener?.('animationend',event=>{if(event.target===box&&lanDialoguePhase.phase==='enter')setDialoguePhase('talking',lanDialoguePhase.sequenceId)});
    box.addEventListener?.('click',event=>{if(['hidden','history'].includes(LanDisplayMode.mode)||event.target?.closest?.('button,a,input,select,textarea,[data-lan-no-advance]'))return;if(Date.now()<Number(box.dataset.ignoreCardActivationUntil||0))return;const active=queue[queueIndex];if(active){if(active.dialogueType==='choice'||active.requiresChoice===true)return;advanceFromUser();return}const routeParts=lastRoute.split(':');if(checkGuidedDialogueState({route:routeParts[0],era:routeParts[1]}).ok)return;if(LanDisplayMode.mode==='companion')expandDialogue()});
    box.addEventListener?.('keydown',event=>{if(!['Enter',' '].includes(event.key)||event.repeat||event.target?.closest?.('button,a,input,select,textarea,[data-lan-no-advance]'))return;if(['hidden','history'].includes(LanDisplayMode.mode))return;const active=queue[queueIndex];if(active){if(active.dialogueType==='choice'||active.requiresChoice===true)return;advanceFromUser()}else{const routeParts=lastRoute.split(':');if(checkGuidedDialogueState({route:routeParts[0],era:routeParts[1]}).ok){event.preventDefault?.();return}if(LanDisplayMode.mode==='companion')expandDialogue()}event.preventDefault?.()});
    document.body.append(box); root.LanVoice?.mount(box); return box;
  }
  function applySavedLanPosition(box){const ui=memory.lanUI||{position:'bottom-right',x:0,y:0};box.dataset.position=ui.position;if(ui.position==='custom'&&box.style){box.style.left=`${ui.x}px`;box.style.top=`${ui.y}px`;box.style.right='auto';box.style.bottom='auto'}}
  function updateWidget(entry, shouldSpeak = false) {
    const box = makeRoot(); box.classList.toggle('is-collapsed', collapsed);
    syncActivePresentation();
    syncCardPrompt(box,queue[queueIndex]||null);
    const caption = box.querySelector('#lanCaption');
    const revisit = box.querySelector('#lanRevisitButton'); if (revisit) revisit.hidden = memory.skippedDialogues.length === 0 || queue.length > 0;
    syncCollapseControl(box);
    const line = Array.isArray(entry.dialogue) ? entry.dialogue[0] : entry.dialogue;
    const nextCaption=line || '澜暂时没有新的对白。';
    if(caption.textContent!==nextCaption){caption.classList?.remove?.('lan-text-changing');caption.textContent=nextCaption;void caption.offsetWidth;caption.classList?.add?.('lan-text-changing')}
    box.dataset.era = entry.era || 'archive'; LanEmotionController.set(entry.emotion,box);
    const voiceButton = box.querySelector('#lanVoiceToggle'); voiceButton.textContent = `语音：${settings.voice ? '开' : '关'}`; voiceButton.setAttribute('aria-pressed', String(settings.voice));
    const note = box.querySelector('#lanVoiceNote');
    note.textContent = root.LanVoice?.supported ? '字幕始终显示；只使用澜的自然人声，可在下方试听、调整倍速或重读当前句。' : '字幕始终显示；澜的人声暂不可用，请检查浏览器的音频播放支持。';
    root.LanVoice?.mount(box);
    root.LanVoice?.prepare?.(queue.slice(queueIndex,queueIndex+3));
    if (shouldSpeak) { stopSpeechForPageHide(); if (settings.voice) speak(line, entry); }
  }
  function speak(text, meta = queue[queueIndex] || {}) {
    pausedSpeechIdentity=null;return root.LanVoice?.speak?.(text, meta) === true;
  }
  function handleSpeechVisibility(){if(!('speechSynthesis'in window))return;if(root.document?.visibilityState==='hidden'){const active=queue[queueIndex];pausedSpeechIdentity=active?`${active.id}:${active.lineIndex||0}`:null;if(pausedSpeechIdentity)window.speechSynthesis.pause();else window.speechSynthesis.cancel();return}const active=queue[queueIndex],identity=active?`${active.id}:${active.lineIndex||0}`:null;if(pausedSpeechIdentity&&settings.voice&&identity===pausedSpeechIdentity)window.speechSynthesis.resume();else if(pausedSpeechIdentity)window.speechSynthesis.cancel();pausedSpeechIdentity=null}
  function stopSpeechForPageHide(){pausedSpeechIdentity=null;if(root.LanVoice)root.LanVoice.cancel();else if('speechSynthesis'in window)window.speechSynthesis.cancel()}
  if(!root.LanVoice)root.document?.addEventListener?.('visibilitychange',handleSpeechVisibility);root.addEventListener?.('pagehide',stopSpeechForPageHide);
  function show(dialogue, meta = {}, displayModeOverride = null, options = {}) {
    const entry = { ...normalizeDialogue({ ...dialogue, ...meta, id: dialogue.id || meta.id || 'lan.free', era: dialogue.era || meta.era || null, location: dialogue.location || meta.location || 'companion', trigger: dialogue.trigger || meta.trigger || 'interaction', dialogue: dialogue.dialogue ?? dialogue.text ?? '' }), time: new Date().toISOString() };
    const lines = Array.isArray(entry.dialogue) ? entry.dialogue : String(entry.dialogue||'').split(/\n+/).map((line)=>line.trim()).filter(Boolean);
    if (!lines.length) return false;
    const activeLine=queue[queueIndex];
    const activeFormalDialogue=queue.length>0&&(queueDisplayMode==='dialogue'||priorityDialogue(activeLine));
    const incomingExhibitDialogue=['exhibit','exhibit-detail'].includes(String(entry.location||'').trim().toLowerCase())||entry.id==='lan.exhibit.open';
    if(activeFormalDialogue&&incomingExhibitDialogue&&activeLine?.id!==entry.id){
      root.InteractionDebugger?.record('LAN_DIALOGUE_SUPPRESSED','CommsArchiveLan.show',{dialogueId:entry.id,era:entry.era,reason:'formal-dialogue-active',activeDialogueId:activeLine?.id||'',activeDisplayMode:queueDisplayMode});
      return false;
    }
    if(activeFormalDialogue&&!priorityDialogue(entry)){
      root.InteractionDebugger?.record('LAN_DIALOGUE_SUPPRESSED','CommsArchiveLan.show',{dialogueId:entry.id,era:entry.era,reason:'formal-dialogue-active',activeDialogueId:activeLine?.id||'',activeDisplayMode:queueDisplayMode});
      return false;
    }
    queue = lines.map((line, index) => ({ ...entry, dialogue: line, lineIndex: index }));
    root.LanVoice?.prepare?.(queue.slice(0,3));
    const preservePresentation=options.preservePresentation===true||continueDialoguePresentation||(queue.length>0&&queueDisplayMode==='dialogue'&&LanDisplayMode.mode==='dialogue');
    continueDialoguePresentation=false;
    if(!preservePresentation)collapseAfterDialogue=false;
    const criticalDialogue=priorityDialogue(entry);
    const requestedMode=['dialogue','companion'].includes(displayModeOverride)?displayModeOverride:null;
    queueDisplayMode=criticalDialogue?'dialogue':(preservePresentation&&LanDisplayMode.mode==='dialogue'?'dialogue':requestedMode||'companion');
    const resumable = isEraLine(entry.id);
    queueIndex = resumable && memory.currentDialogue === entry.id && Number.isInteger(memory.currentDialogueLine) ? Math.max(0, Math.min(memory.currentDialogueLine, queue.length - 1)) : 0;root.InteractionDebugger?.record('LAN_DIALOGUE_START','CommsArchiveLan.show',{dialogueId:entry.id,era:entry.era,isPlaying:queue.length>0,currentLine:queueIndex+1,lineCount:queue.length,dialogueType:entry.dialogueType,location:entry.location,trigger:entry.trigger,presentationMode:queueDisplayMode,presentationReason:priorityDialogue(entry)?'formal-story':'companion'});
    if (resumable) { memory.currentDialogue = entry.id; memory.currentDialogueLine = queueIndex; memory.lastDialogue=entry.id; saveMemory(); }
    collapsed = false;setDialoguePhase(preservePresentation&&queueDisplayMode===LanDisplayMode.mode?'talking':'enter',entry.id);
    if(!entry.independentInteraction)persistHistory(entry); updateWidget(queue[queueIndex], true); refreshHistory();window.AudioSystem?.playEffect('dialogue');return true;
  }
  // Transient interaction speech shares the existing panel, never main progression memory.
  function dismissInteractionFeedback(){const active=queue[queueIndex];if(!active?.independentInteraction)return false;queue=[];queueIndex=0;stopSpeechForPageHide();returnToCompanion(active.id);return true;}
  function showInteractionFeedback({era,event,text,story=false}){const active=queue[queueIndex];if(active?.independentInteraction&&queueDisplayMode==='companion')dismissInteractionFeedback();else if(active)return false;return show({id:'lan.independent.'+era.toLowerCase()+'.'+event,era,location:'independent-experience',trigger:'interactive-feedback',dialogueType:story?'story':'hint',dialogue:text,independentInteraction:true}, {},story?'dialogue':'companion');}
  function find(id) { const entry=activeDialogueData.find((item) => item.id === id) || model?.getLanDialogue?.(id) || null;return experienceZonesDisabled&&isExperienceDialogue(entry)?null:entry; }
  function advanceFromUser(){const now=Date.now();if(now-lastAdvanceInputAt<160)return false;lastAdvanceInputAt=now;return next()}
  function trigger(id, era = null, extra = {}) {
    const entry = find(id); if (!entry) return false;
    return show({ ...entry, era: entry.era || era, ...extra })===true;
  }
  function freshCustom(id, era, location, triggerName, emotion, text, refs = {}) { return show({ id, era, location, trigger: triggerName, emotion, dialogueType: location === 'entrance' ? 'story' : location === 'task' ? 'hint' : 'optional', dialogue: text, ...refs })===true; }
  function eraArrivalDialogue(era){return activeDialogueData.find(item=>item.id===`lan_${String(era||'').toLowerCase()}_enter_001`)||null}
  function eraArrivalResolved(era){const entry=eraArrivalDialogue(era);return !entry||memory.completedEvents.includes(entry.id)||memory.viewedDialogues.includes(entry.id)||memory.skippedDialogues.includes(entry.id)}
  function playEraArrival(era){const entry=eraArrivalDialogue(era);if(!entry||eraArrivalResolved(era))return false;if(memory.currentDialogue===entry.id)return trigger(entry.id,era);const rule=eraTriggers.find(item=>item.event==='ENTER_ERA'&&item.dialogueId===entry.id&&item.condition?.era===era);if(rule&&!memory.completedTriggers.includes(rule.id)&&!memory.completedEvents.includes(rule.id)){if(dispatchEvent('ENTER_ERA',{era,firstEnter:true}))return true}return trigger(entry.id,era)}
  function pendingEraDialogue(era){if(memory.currentDialogue){const active=find(memory.currentDialogue);if(active?.era===era)return active}const ids=new Set(eraTriggers.filter(rule=>memory.completedTriggers.includes(rule.id)||memory.completedEvents.includes(rule.id)).map(rule=>rule.dialogueId));return [...activeDialogueData].reverse().find(item=>item.era===era&&ids.has(item.id)&&!memory.completedEvents.includes(item.id)&&!memory.skippedDialogues.includes(item.id))||null}
  function restoreActiveChapterGuide(era){const activeId=root.CommsArchiveProgressManager?.state?.dialogueProgress?.activeId;if(!activeId)return false;const entry=activeDialogueData.find(item=>item.era===era&&progressionEntryId(item)===activeId)||model?.getLanDialogue?.(activeId);if(entry?.era===era&&!isExperienceDialogue(entry)){const rule=eraTriggers.find(item=>item.event==='ENTER_ERA'&&item.dialogueId===entry.id);if(rule&&!memory.completedTriggers.includes(rule.id)&&!memory.completedEvents.includes(rule.id))return dispatchEvent('ENTER_ERA',{era,firstEnter:true});return trigger(entry.id,era)}return false}
  function checkGuidedDialogueState(context={}){
    if(context.route&&context.route!=='chapter')return {ok:false,reason:'当前不在时代章节中。'};
    if(queue.length)return {ok:false,reason:'澜对白仍在播放。'};
    const activeId=root.CommsArchiveProgressManager?.state?.dialogueProgress?.activeId;
    const match=String(activeId||'').match(/^lan\.([1-6])g\.chapter-entry$/);
    if(!match)return {ok:false,reason:'没有待恢复的时代引导。'};
    const era=`${match[1]}G`;
    if(context.era&&context.era!==era)return {ok:false,reason:'当前时代与待恢复引导不一致。'};
    const manager=root.CommsArchiveProgressManager;
    if(typeof manager?.completeDialogue!=='function')return {ok:false,reason:'进度管理器暂不可用。'};
    const result=manager.completeDialogue(activeId,{holdCurrent:true});
    if(!result?.ok){root.InteractionDebugger?.record('LAN_GUIDE_RECOVERY_FAILED','CommsArchiveLan.checkGuidedDialogueState',{era,activeId,reason:result?.reason||'引导进度未能完成'});return result||{ok:false,reason:'引导进度未能完成。'}}
    const entryId=`lan_${match[1]}g_enter_001`,entryRule=eraTriggers.find(item=>item.event==='ENTER_ERA'&&item.condition?.era===era);
    if(!memory.completedEvents.includes(entryId))memory.completedEvents.push(entryId);
    if(entryRule){if(!memory.completedEvents.includes(entryRule.id))memory.completedEvents.push(entryRule.id);if(!memory.completedTriggers.includes(entryRule.id))memory.completedTriggers.push(entryRule.id)}
    memory.currentDialogue='';memory.currentDialogueLine=0;memory.lastDialogue='';saveMemory();
    if(!queue.length){const box=makeRoot();setDialoguePhase('exit',activeId);setDisplayMode('companion');syncCardPrompt(box,null);const caption=box.querySelector('#lanCaption');if(caption)caption.textContent=''}
    root.InteractionDebugger?.record('LAN_GUIDE_RECOVERED','CommsArchiveLan.checkGuidedDialogueState',{era,activeId,nextNode:result.next?.nodeId||result.node?.nodeId||'',queueRestored:queue.length>0});
    const app=document.querySelector('#app');if(app&&!app.hidden)root.renderProgression?.();else root.dispatchEvent(new CustomEvent('comms-archive-progress',{detail:result}));
    return {...result,recovered:true,era,activeId};
  }
  function pending1GDialogue(){return pendingEraDialogue('1G')}
  for(const era of ['3G','4G','5G','6G']){const source=root[`EraArchive${era}`];if(source?.id&&memory.eraArchives.some(item=>item.archiveId===source.id&&item.completed))source.completed=true;}
  function onRoute(route, context = {}) {
    const box=makeRoot();
    // Each page render replaces the chapter slot. Reconcile mode, DOM state,
    // backdrop and parent through the LanSystem owner after the redraw.
    syncActivePresentation();
    const era = context.era || null, key = `${route}:${era || ''}`;
    window.AudioSystem?.setEra(['chapter','chapter-end','experience'].includes(route)?era:null);
    if(context.completed?.length)memory.completedEras=[...new Set([...memory.completedEras,...context.completed])];saveMemory();
    if (key === lastRoute) {
      if (queue[queueIndex]) updateWidget(queue[queueIndex],false);
      else if (route === 'chapter' && era && root.CommsArchiveProgressManager?.state?.dialogueProgress?.activeId) restoreActiveChapterGuide(era);
      else syncCardPrompt(box,null);
      if(route==='chapter'&&era&&!queue.length)checkGuidedDialogueState({route,era});
      return;
    }
    lastRoute = key;
    if(context.suppressAutoDialogue){if(queue[queueIndex])updateWidget(queue[queueIndex],false);else syncCardPrompt(box,null);return}
    if (route === 'home') {
      let welcomed = false; try { welcomed = storageGet('commsArchive.lan.firstVisit') === '1'; } catch (_) {}
      if (!welcomed) { trigger('lan.home.first-visit'); try { storageSet('commsArchive.lan.firstVisit', '1'); } catch (_) {} }
    } else if (route === 'chapter' && era) {
      if (era === '1G') {
        if(!eraArrivalResolved('1G')){playEraArrival('1G');return}
        const pending=pending1GDialogue();
        if (pending) trigger(pending.id,'1G');
        else if (!memory.completedEvents.includes('lan_1g_enter_001')) {
          if (!memory.completedEvents.includes('trigger_1g_enter')) dispatchEvent('ENTER_ERA', { era:'1G', firstEnter:true });
          else trigger('lan_1g_enter_001','1G');
        }
        else {
          const entrance = dialogueData.find((item) => item.id === 'lan.1g.entrance');
          freshCustom('lan.1g.return-entry', '1G', 'entrance', 'return-era', 'happy', entrance?.dialogue || '欢迎回来。我们继续检查这个时代留下的通信线索。');
        }
        return;
      }
      if (era === '2G') {
        if(!eraArrivalResolved('2G')){playEraArrival('2G');return}
        const pending=pendingEraDialogue('2G');
        if (pending) trigger(pending.id,'2G');
        else if (!memory.completedTriggers.includes('trigger_2g_enter') && !memory.completedEvents.includes('trigger_2g_enter')) dispatchEvent('ENTER_ERA',{era:'2G',firstEnter:true});
        else freshCustom('lan.2g.return-entry','2G','entrance','return-era','happy','欢迎回来。短信的旅程还留在这里，我们可以继续查看数字通信与信息转发的线索。');
        return;
      }
      if (era === '3G') {
        if(!eraArrivalResolved('3G')){playEraArrival('3G');return}
        const pending=pendingEraDialogue('3G');
        if (pending) trigger(pending.id,'3G');
        else if (!memory.completedTriggers.includes('trigger_3g_enter') && !memory.completedEvents.includes('trigger_3g_enter')) dispatchEvent('ENTER_ERA',{era:'3G',firstEnter:true});
        else freshCustom('lan.3g.return-entry','3G','entrance','return-era','happy','欢迎回来。网页、图片和移动服务的线索还在这里，我们可以继续探索手机如何连接信息世界。');
        return;
      }
      if (era === '4G') {
        if(!eraArrivalResolved('4G')){playEraArrival('4G');return}
        const pending=pendingEraDialogue('4G');
        if (pending) trigger(pending.id,'4G');
        else if (!memory.completedTriggers.includes('ENTER_4G')) dispatchEvent('ENTER_ERA',{era:'4G',firstEnter:true});
        else freshCustom('lan.4g.return-entry','4G','entrance','return-era','happy','欢迎回来。直播体验与内容分享的线索还在这里，我们继续看看高速移动网络如何融入日常。');
        return;
      }
      if (era === '5G') {
        if(!eraArrivalResolved('5G')){playEraArrival('5G');return}
        const pending=pendingEraDialogue('5G');
        if (pending) trigger(pending.id,'5G');
        else if (!memory.completedTriggers.includes('ENTER_5G')) dispatchEvent('ENTER_ERA',{era:'5G',firstEnter:true});
        else freshCustom('lan.5g.return-entry','5G','entrance','return-era','happy','欢迎回来。我们继续观察设备、环境与系统如何协同连接。');
        return;
      }
      if (era === '6G') {
        const fiveGArchived=memory.completedEras.includes('5G')||memory.eraArchives.some(item=>item.archiveId==='archive_5g'&&item.completed);
        if(!fiveGArchived){lastRoute='';freshCustom('lan.6g.locked','6G','entrance','locked-era','thinking','需要完成5G时代归档，才能进入6G研究情境。');return}
        ensure6GProgress();saveMemory();
        if(!eraArrivalResolved('6G')){playEraArrival('6G');return}
        const pending=pendingEraDialogue('6G');
        if(pending){trigger(pending.id,'6G');return}
        if(!memory.completedTriggers.includes('ENTER_6G'))dispatchEvent('ENTER_ERA',{era:'6G',firstEnter:true});
        else freshCustom('lan.6g.return-entry','6G','entrance','return-era','thinking','欢迎回来。这里呈现的是6G研究方向构建的未来情境；我们可以继续核对通信、感知、智能分析与数字模型的线索。');
        return;
      }
      const entrance = dialogueData.find((item) => item.era === era && item.location === 'entrance');
      const original = model?.getDialogues?.({ era, location: 'chapter', trigger: 'enter-era' })?.[0];
      const lines = [...(Array.isArray(entrance?.dialogue) ? entrance.dialogue : entrance ? [entrance.dialogue] : []), ...(Array.isArray(original?.text) ? original.text : original ? [original.text] : []), '先从展品和技术资料开始吧，找到线索后再作判断。', ...((era === '6G') ? ['这是研究与未来情境，不是已经普遍商用的现实能力。'] : [])];
      freshCustom(`lan.${era.toLowerCase()}.chapter-entry`, era, 'entrance', 'enter-era', era === '6G' ? 'thinking' : 'happy', lines, { relatedTask: `task.${era.toLowerCase()}.investigation` });
    } else if (route === 'archive') { if(queue[queueIndex])updateWidget(queue[queueIndex],false);else trigger('lan.archive.open'); }
    else if (route === 'final') {
      if ((context.completed || []).length === 6) trigger('lan.6g.identity-reveal', '6G');
      else freshCustom('lan.6g.not-yet', '6G', 'ending', 'journey-incomplete', 'thinking', '这次走到了6G研究展区。其他时代的调查档案还可以继续补齐；6G本身仍处于研究发展阶段。');
    } else if (route === 'chapter-end' && era === '3G' && memory.completedTasks.includes('task.3g.investigation') && !memory.completedTriggers.includes('ARCHIVE_3G_COMPLETE')) {
      const pending=memory.currentDialogue&&find(memory.currentDialogue);
      if(pending?.era==='3G'&&pending.location==='archive')trigger(pending.id,'3G');
      else if(!memory.completedTriggers.includes('trigger_3g_archive_entry'))dispatchEvent('ENTER_ARCHIVE_3G',{era:'3G'});
    } else if (route === 'chapter-end' && era === '4G' && memory.completedTasks.includes('task.4g.investigation') && !memory.completedTriggers.includes('ARCHIVE_4G_COMPLETE')) {
      const pending=memory.currentDialogue&&find(memory.currentDialogue);
      if(pending?.era==='4G')trigger(pending.id,'4G');
      else if(!memory.completedTriggers.includes('ENTER_4G_ARCHIVE'))dispatchEvent('ENTER_ARCHIVE_4G',{era:'4G'});
    } else if (route === 'chapter-end' && era === '5G' && memory.completedTasks.includes('task.5g.investigation') && !memory.completedTriggers.includes('ARCHIVE_5G_COMPLETE')) {
      const pending=memory.currentDialogue&&find(memory.currentDialogue);
      if(pending?.era==='5G'&&pending.location==='archive')trigger(pending.id,'5G');
      else if(!memory.completedTriggers.includes('ENTER_5G_ARCHIVE'))dispatchEvent('ENTER_ARCHIVE_5G',{era:'5G'});
    } else if (route === 'chapter-end' && era === '1G') {
      dispatchEvent('ERA_ARCHIVE', { era:'1G' });
    } else if (route === 'chapter-end' && era === '6G') {
      freshCustom('lan.6g.closing-before-final', '6G', 'chapter-end', 'complete-era', 'nostalgic', '现实与数字模型重新同步了。我们已经走到通信研究的新边界，但答案仍需要继续验证。');
    }
  }
  function refreshHistory() {
    const box = makeRoot().querySelector('#lanHistory');
    historyLines=buildViewedDialogueLines();
    if(historyCursor<0&&historyLines.length)historyCursor=historyLines.length-1;
    if(historyCursor>=historyLines.length)historyCursor=historyLines.length-1;
    const current=historyLines[historyCursor];
    box.hidden=LanDisplayMode.mode!=='history';
    if(!current){box.innerHTML='<div class="lan-history-empty"><strong>澜对话记录</strong><p>完整看过的对白会保存在这里。尚未解锁的对白不会提前显示。</p><button type="button" onclick="CommsArchiveLan.closeHistory()">返回探索</button></div>';return}
    box.innerHTML=`<div class="lan-history-reader"><div><strong>澜对话记录</strong><span>${safe(current.era||'序章')} · ${safe(current.location||'记录')} · 第 ${historyCursor+1} / ${historyLines.length} 句</span></div><blockquote>${safe(current.text)}</blockquote><nav class="lan-history-controls" aria-label="对白记录翻页"><button type="button" onclick="window.LanDialogueNavigator.previous()" ${historyCursor<=0?'disabled':''}>上一句</button><button type="button" onclick="window.LanDialogueNavigator.next()" ${historyCursor>=historyLines.length-1?'disabled':''}>下一句</button><button type="button" onclick="window.LanDialogueNavigator.close()">返回探索</button></nav><div class="lan-history-index"><span>已读对白</span>${[...new Map(historyLines.map((line,index)=>[line.id,{id:line.id,era:line.era,location:line.location,index}])).values()].map(item=>`<button type="button" onclick="window.LanDialogueNavigator.jumpTo('${safe(item.id)}',0)">${safe(item.era||'序章')} · ${safe(item.location||'记录')}</button>`).join('')}</div></div>`;
  }
  function buildViewedDialogueLines(){
    const viewed=new Set(memory.viewedDialogues||[]);
    for(const item of memory.dialogueHistory||[])if(item.action==='view'||item.viewed)viewed.add(item.dialogueId||item.id);
    const records=new Map();for(const entry of history)if(viewed.has(entry.id))records.set(entry.id,entry);
    const order=[];for(const item of memory.dialogueHistory||[]){const id=item.dialogueId||item.id;if(viewed.has(id)&&!order.includes(id))order.push(id)}
    for(const entry of history)if(viewed.has(entry.id)&&!order.includes(entry.id))order.push(entry.id);
    for(const id of viewed)if(!order.includes(id))order.push(id);
    return order.flatMap(id=>{const source=find(id)||records.get(id);if(!source)return[];const raw=source.dialogue??source.text??'',lines=Array.isArray(raw)?raw:String(raw).split(/\n+/).map(line=>line.trim()).filter(Boolean);return lines.map((text,index)=>({id,era:source.era||null,location:source.location||null,text:String(text),lineIndex:index}))});
  }
  function previousHistoryLine(){stopSpeechForPageHide();if(!historyLines.length)historyLines=buildViewedDialogueLines();historyCursor=Math.max(0,historyCursor-1);refreshHistory();return historyLines[historyCursor]||null}
  function nextHistoryLine(){stopSpeechForPageHide();if(!historyLines.length)historyLines=buildViewedDialogueLines();historyCursor=Math.min(historyLines.length-1,historyCursor+1);refreshHistory();return historyLines[historyCursor]||null}
  function jumpToHistory(target,lineIndex=0){stopSpeechForPageHide();if(!historyLines.length)historyLines=buildViewedDialogueLines();const index=typeof target==='number'?target:historyLines.findIndex(line=>line.id===target&&line.lineIndex===lineIndex);if(index<0||index>=historyLines.length)return false;historyCursor=index;refreshHistory();return historyLines[index]}
  function toggleHistory(){stopSpeechForPageHide();if(LanDisplayMode.mode==='history'){closeHistory();return}if(queue.length&&(queueDisplayMode==='dialogue'||priorityDialogue(queue[queueIndex])))return false;historyReturnMode=LanDisplayMode.mode;historyLines=buildViewedDialogueLines();historyCursor=historyLines.length-1;setDisplayMode('history');refreshHistory();return true}
  function closeHistory(){stopSpeechForPageHide();setDisplayMode(historyReturnMode)}
  const LanDialogueNavigator={previous:previousHistoryLine,next:nextHistoryLine,jumpTo:jumpToHistory,close:closeHistory,get current(){return historyLines[historyCursor]||null},get lines(){return historyLines.slice()}};
  root.LanDialogueNavigator=LanDialogueNavigator;
  function attach(contentModel) {
    model = contentModel || null;
    if (!model) return;
    model.lanCharacter = character;
    const old = Array.isArray(model.lanDialogues) ? model.lanDialogues : [];
    const ids = new Set(old.map((item) => item.id));
    old.push(...dialogueData.filter((item) => !ids.has(item.id)).map((item) => ({ ...item, text: item.dialogue })));
    model.lanDialogues = old;
    model.lanRole = { characterId: character.id, displayName: character.name, status: 'active', dialogues: model.lanDialogues };
    model.dialogues?.forEach((item) => { item.characterId = character.id; item.speaker = character.name; });
    model.imageArchive = (model.images || []).map((item) => ({
      ...item,
      imageType: item.imageType || item.type,
      sourceType: item.sourceType || (item.type === '技术示意图' ? 'PROJECT_ORIGINAL_DIAGRAM' : 'UNCLASSIFIED'),
      creator: item.credit || null,
      sourceUrl: item.source || null,
      rightsStatus: item.license ? '已记录许可信息' : (/PROJECT_ORIGINAL|ORIGINAL_CONCEPT/.test(item.sourceType || '') ? '项目原创，无外部授权' : '待核实'),
      provenance: item.authenticity || null,
      representation: item.path ? 'local-image' : (item.type === '技术示意图' ? 'inline-svg' : 'concept-placeholder')
    }));
    const codeVisuals = [
      { id: 'image.site.home-corridor', name: '首页时空长廊视觉', location: 'home', eraId: null, kind: 'css-scene', note: '原创CSS空间示意，不是历史图片或真实3D场景。' },
      { id: 'image.site.archive-hall', name: 'Three.js通信长廊', location: 'gallery', eraId: null, kind: 'threejs-scene', note: '程序化Three.js网格场景与展品，不是扫描模型或历史实物复原。' },
      ...['1G', '2G', '3G', '4G', '5G', '6G'].map((eraId) => ({ id: `image.site.${eraId.toLowerCase()}.zone`, name: `${eraId}程序化展区视觉`, location: 'gallery', eraId, kind: 'threejs-scene', note: eraId === '6G' ? '项目原创未来研究情境视觉；6G仍处研究阶段，不代表已经商用。' : '项目原创程序化年代展区与几何展品，不是该年代实物照片。' }))
    ].map((item) => ({
      imageId: item.id, id: item.id, name: item.name, era: item.eraId, eraId: item.eraId,
      type: '原创概念图', imageType: '原创概念图', sourceType: 'PROJECT_ORIGINAL_CODE_RENDER',
      path: null, source: null, sourceUrl: null, credit: '《通信简史》项目', creator: '《通信简史》项目',
      license: '项目原创程序化视觉', rightsStatus: '项目原创，无外部授权', authenticity: item.note,
      provenance: item.note, representation: item.kind, location: item.location, available: true,
      exhibitIds: item.eraId ? (model.eras.find((entry) => entry.eraId === item.eraId)?.exhibitIds || []) : [],
      taskIds: [], evidenceIds: []
    }));
    model.imageArchive.push(...codeVisuals, {
      id: 'image.lan.ui-avatar-placeholder', imageId: 'image.lan.ui-avatar-placeholder', name: '澜字幕组件文字头像',
      era: null, eraId: null, type: '界面占位标记', imageType: '界面占位标记', sourceType: 'UI_TEXT_PLACEHOLDER',
      path: null, source: null, sourceUrl: null, creator: '《通信简史》项目', rightsStatus: '程序化界面元素，不是角色立绘',
      license: '项目原创界面元素', authenticity: '以“澜”字和色环标识角色；不代表正式人物插画。',
      representation: 'ui-text-avatar', available: true, exhibitIds: [], taskIds: [], evidenceIds: []
    });
    model.imageArchive.push({id:'image.lan.portrait-ai',imageId:'image.lan.portrait-ai',name:'澜 · 原创角色概念立绘',era:null,eraId:null,type:'AI生成素材',imageType:'AI生成素材',sourceType:'AI_GENERATED',path:'assets/images/Lan/lan_portrait_ai.png',source:null,sourceUrl:null,creator:'OpenAI 图像生成工具（项目原创角色概念）',rightsStatus:'AI生成；按服务条款与竞赛规则核实公开使用要求',license:'AI生成素材；不得作为历史资料或真实人物影像',authenticity:'澜为项目原创虚构角色。图片仅用于角色视觉表达，不代表历史人物、通信设备或史料。',provenance:'项目角色概念图，AI生成。',representation:'transparent-character-concept',available:true,exhibitIds:[],taskIds:[],evidenceIds:[]});
    model.lanAssetRequirements = [
      { id: 'lan.front', path: 'assets/images/Lan/lan_front.png', kind: 'transparent-character-art', status: '待正式素材' },
      { id: 'lan.side', path: 'assets/images/Lan/lan_side.png', kind: 'transparent-character-art', status: '待正式素材' },
      ...['default', 'happy', 'think', 'warning', 'nostalgic', 'sad', 'teasing', 'final'].map((name) => ({ id: `lan.expression.${name}`, path: `assets/images/Lan/lan_${name}.png`, kind: 'transparent-expression', status: '待正式素材' })),
      ...['standing', 'pointing', 'observing', 'thinking', 'encouraging', 'looking-back'].map((name) => ({ id: `lan.action.${name}`, path: `assets/images/Lan/lan_action_${name}.png`, kind: 'transparent-action', status: '待正式素材' }))
    ];
    model.lanAssetRequirements[0].status='已生成AI概念图；非历史资料';
    model.imageArchiveStatus = '项目图片与原理图已登记；澜已有一张AI概念立绘，其余表情与动作素材待制作';
    mounted = true; makeRoot(); refreshHistory();
  }
  function next() {
    stopSpeechForPageHide();
    if (!queue.length) { const caption=document.querySelector('#lanCaption'); if(caption)caption.textContent=''; setDisplayMode('companion'); syncCardPrompt(makeRoot(),null); return; }
    const activeDialogue = queue[queueIndex];
    if(activeDialogue?.independentInteraction){if(queueIndex<queue.length-1){queueIndex++;setDialoguePhase('talking',activeDialogue.id);updateWidget(queue[queueIndex],true);}else dismissInteractionFeedback();return;}
    const finalLine = queueIndex === queue.length - 1;
    root.InteractionDebugger?.record('LAN_CONTINUE_CLICK','CommsArchiveLan.next',{dialogueId:activeDialogue?.id||'',era:activeDialogue?.era||null,lineIndex:activeDialogue?.lineIndex??0,isPlaying:true});
    if(activeDialogue?.id==='lan.prologue.first-travel')root.InteractionDebugger?.record('PROLOGUE_CONTINUE_CLICK','CommsArchiveLan.next',{dialogueId:activeDialogue.id,lineIndex:activeDialogue?.lineIndex??0,dialoguePlaying:true,transition:false,buttonDisabled:false});
    if(finalLine&&activeDialogue?.next?.startsWith('ENTER_ERA:'))root.InteractionDebugger?.record('NEXT_ERA_CLICK','CommsArchiveLan.next',{fromEra:activeDialogue.era||null,toEra:activeDialogue.next.split(':')[1],dialoguePlaying:true});
    queueIndex++;
    if (queueIndex >= queue.length) {
      const completedSequenceMode = queueDisplayMode;
      const following=activeDialogue?.next&&!activeDialogue.next.startsWith('ENTER_ERA:')?find(activeDialogue.next):null;
      const followingMode=following?(completedSequenceMode==='dialogue'||priorityDialogue(following)?'dialogue':'companion'):null;
      const keepPresentation=!!following&&followingMode===completedSequenceMode;
      const continuationId=following?.id||activeDialogue?.id||null;
      queue=[];queueIndex=0;
      if(keepPresentation){queueDisplayMode=completedSequenceMode;setDialoguePhase('talking',continuationId);continueDialoguePresentation=true}
      else{returnToCompanion(activeDialogue?.id||null)}
      if(activeDialogue?.id&&!memory.completedEvents.includes(activeDialogue.id))memory.completedEvents.push(activeDialogue.id);
      if(activeDialogue?.id)recordDialogueAction(activeDialogue.id,'view',{era:activeDialogue.era,index:activeDialogue.lineIndex??0});
      memory.currentDialogue='';memory.currentDialogueLine=0;memory.lastDialogue='';saveMemory();
      root.InteractionDebugger?.record('LAN_DIALOGUE_END','CommsArchiveLan.next',{dialogueId:activeDialogue?.id||'',era:activeDialogue?.era||null,isPlaying:keepPresentation,persistedCurrentDialogue:memory.currentDialogue,lanControlsReleased:!keepPresentation,inputLock:false,continues:keepPresentation,displayMode:LanDisplayMode.mode});
      if(!keepPresentation)root.InteractionDebugger?.record('INPUT_ENABLED','CommsArchiveLan.next',{inputEnabled:true,lanControlsReleased:true,dialogueId:activeDialogue?.id||'',reason:'lan-dialogue-ended'});
      if (activeDialogue?.id === 'lan.prologue.first-travel') { if (!memory.completedEvents.includes(activeDialogue.id)) { memory.completedEvents.push(activeDialogue.id); saveMemory(); } window.dispatchEvent(new CustomEvent('comms-archive-prologue-read')); }
      const chapterEntryId = progressionEntryId(activeDialogue);
      if (chapterEntryId === root.CommsArchiveProgressManager?.state?.dialogueProgress?.activeId) {
        const result = root.CommsArchiveProgressManager?.completeDialogue(chapterEntryId,{holdCurrent:true});
      }
      continueDialogueAfter(activeDialogue,completedSequenceMode,keepPresentation,following);
      if(continueDialoguePresentation&&!queue.length){returnToCompanion(activeDialogue?.id||null);root.InteractionDebugger?.record('INPUT_ENABLED','CommsArchiveLan.next',{inputEnabled:true,lanControlsReleased:true,dialogueId:activeDialogue?.id||'',reason:'lan-dialogue-ended'})}
      if(!queue.length){const app=document.querySelector('#app');if(app&&!app.hidden)root.renderProgression?.()}
      return;
    }
    setDialoguePhase('talking',activeDialogue?.id||null);
    if (isEraLine(activeDialogue?.id)) { memory.currentDialogue=activeDialogue.id; memory.currentDialogueLine=queueIndex; memory.lastDialogue=activeDialogue.id; saveMemory(); }
    root.LanVoice?.prepare?.(queue.slice(queueIndex,queueIndex+3));
    updateWidget(queue[queueIndex], true);
  }
  function continueDialogueAfter(activeDialogue,completedSequenceMode='companion',keepPresentation=false,following=null){
    if(activeDialogue?.next?.startsWith('ENTER_ERA:')){root.InteractionDebugger?.record('LAN_NAVIGATION_DEFERRED','CommsArchiveLan.continueDialogueAfter',{fromEra:activeDialogue.era||null,toEra:activeDialogue.next.split(':')[1],reason:'chapter-navigation-button-required'});return true}
    if(activeDialogue?.id==='lan_1g_issue_001'){dispatchEvent('TASK_COMPLETE',{era:'1G'});return true}
    if(!activeDialogue?.next)return false;
    const nextEntry=following||find(activeDialogue.next);
    if(/^lan_[1-6]g_summary_001$/.test(nextEntry?.id||''))dispatchEvent('ERA_ARCHIVE',{era:nextEntry.era});
    else if(/^lan_[1-6]g_unlock_[2-6]g_001$/.test(nextEntry?.id||'')&&nextEntry?.id!=='lan_4g_unlock_5g_001'&&nextEntry?.id!=='lan_5g_unlock_6g_001')dispatchEvent('ERA_UNLOCK',{era:nextEntry.era,nextEra:nextEntry.id.match(/unlock_([2-6]g)_001$/)?.[1]?.toUpperCase()});
    else if(nextEntry?.id==='lan_3g_archive_entry_001')dispatchEvent('ENTER_ARCHIVE_3G',{era:'3G'});
    else if(nextEntry?.id==='lan_3g_archive_unlock_4g_001')dispatchEvent('UNLOCK_4G',{era:'3G',nextEra:'4G'});
    else if(nextEntry?.id==='lan_4g_archive_entry_001')dispatchEvent('ENTER_ARCHIVE_4G',{era:'4G'});
    else if(nextEntry?.id==='lan_4g_unlock_5g_001')dispatchEvent('UNLOCK_5G',{era:'4G',nextEra:'5G'});
    else if(nextEntry?.id==='lan_5g_archive_entry_001')dispatchEvent('ENTER_ARCHIVE_5G',{era:'5G'});
    else if(nextEntry?.id==='lan_5g_unlock_6g_001')dispatchEvent('UNLOCK_6G',{era:'5G',nextEra:'6G'});
    else if(nextEntry?.id==='lan_1g_unlock_2g_001')dispatchEvent('ERA_UNLOCK',{era:'1G',nextEra:'2G'});
    else if(nextEntry)show(nextEntry,{},completedSequenceMode==='dialogue'?'dialogue':null,{preservePresentation:keepPresentation});
    return true;
  }
  function returnToCompanion(sequenceId=null){
    stopSpeechForPageHide();
    continueDialoguePresentation=false;queueDisplayMode='companion';setDialoguePhase('exit',sequenceId);collapsed=collapseAfterDialogue;collapseAfterDialogue=false;
    const box=makeRoot();box.classList.toggle('is-collapsed',collapsed);const caption=box.querySelector('#lanCaption');if(caption)caption.textContent='';const revisit=box.querySelector('#lanRevisitButton');if(revisit)revisit.hidden=memory.skippedDialogues.length===0;setDisplayMode('companion');syncCardPrompt(box,null);syncCollapseControl(box);
  }
  function dismissRouteDialogue(location){const active=queue[queueIndex];if(!active||active.location!==location)return false;queue=[];queueIndex=0;queueDisplayMode='companion';continueDialoguePresentation=false;collapseAfterDialogue=false;if(memory.currentDialogue===active.id){memory.currentDialogue='';memory.currentDialogueLine=0}if(memory.lastDialogue===active.id)memory.lastDialogue='';saveMemory();returnToCompanion(active.id);return true}
  function isNavigationBlocking(){return queue.length>0&&(queueDisplayMode==='dialogue'||priorityDialogue(queue[queueIndex]))}
  function releaseNonBlockingDialogue(){const active=queue[queueIndex];if(!active||isNavigationBlocking())return false;if(!memory.completedEvents.includes(active.id))memory.completedEvents.push(active.id);return dismissRouteDialogue(active.location)}
  function skip() {
    if(dismissInteractionFeedback())return;
    if (!queue.length) return;
    const active = queue[queueIndex];
    const skipped = active?.id;
    const sequenceMode=queueDisplayMode;
    const skippedLines=queue.slice(queueIndex);
    const following=active?.next&&!active.next.startsWith('ENTER_ERA:')?find(active.next):null;
    const keepPresentation=!!following&&(sequenceMode==='dialogue'||priorityDialogue(following));
    for(const line of skippedLines)if(line?.id)recordDialogueAction(line.id,'skip',{era:line.era,index:line.lineIndex??0});
    if (skipped && !memory.completedEvents.includes(skipped)) memory.completedEvents.push(skipped);
    memory.currentDialogue = ''; memory.currentDialogueLine = 0; memory.lastDialogue=''; saveMemory();
    queue = []; queueIndex = 0; collapsed = false;collapseAfterDialogue=false;
    if(keepPresentation){queueDisplayMode='dialogue';continueDialoguePresentation=true;setDialoguePhase('talking',following.id);setDisplayMode('dialogue')}
    else returnToCompanion(skipped||null);
    root.InteractionDebugger?.record('LAN_DIALOGUE_SKIP','CommsArchiveLan.skip',{dialogueId:skipped||'',era:active?.era||null,isPlaying:keepPresentation,persistedCurrentDialogue:memory.currentDialogue,lanControlsReleased:!keepPresentation,inputLock:false,displayMode:LanDisplayMode.mode});
    if(!keepPresentation)root.InteractionDebugger?.record('INPUT_ENABLED','CommsArchiveLan.skip',{inputEnabled:true,lanControlsReleased:true,dialogueId:skipped||'',reason:'lan-dialogue-skipped'});
    stopSpeechForPageHide();
    const entryId=progressionEntryId(active);
    if (entryId && entryId === root.CommsArchiveProgressManager?.state?.dialogueProgress?.activeId) {
      root.CommsArchiveProgressManager?.completeDialogue(entryId,{holdCurrent:true});
    }
    if(active?.id==='lan.prologue.first-travel')window.dispatchEvent(new CustomEvent('comms-archive-prologue-read'));
    continueDialogueAfter(active,sequenceMode,keepPresentation,following);
    if(continueDialoguePresentation&&!queue.length)returnToCompanion(skipped||null);
    if(!queue.length){const app=document.querySelector('#app');if(app&&!app.hidden)root.renderProgression?.()}
  }
  function replayLastSkipped() { const id=memory.skippedDialogues[memory.skippedDialogues.length-1];return id?trigger(id):false; }
  function toggleCollapse() {
    if(LanDisplayMode.mode==='dialogue'&&queue.length&&queueDisplayMode==='dialogue'){
      collapseAfterDialogue=!collapseAfterDialogue;syncCollapseControl();return collapseAfterDialogue;
    }
    if(LanDisplayMode.mode==='dialogue'){setDialoguePhase('exit',lanDialoguePhase.sequenceId);setDisplayMode('companion')}
    else if(LanDisplayMode.mode==='companion'){setDialoguePhase('exit',lanDialoguePhase.sequenceId);setDisplayMode('hidden')}
    else expandDialogue();
    return true;
  }
  function toggleVoice() { settings.voice = !settings.voice; if(!settings.voice)stopSpeechForPageHide(); try { storageSet(PREF_KEY, JSON.stringify(settings)); } catch (_) {} const active=queue[queueIndex];updateWidget(active || { dialogue: '语音设置已更新。' }, false);if(settings.voice&&active)speak(active.dialogue,active); }
  function readCurrent() { const text = LanDisplayMode.mode==='history' ? historyLines[historyCursor]?.text : queue[queueIndex]?.dialogue || document.querySelector('#lanCaption')?.textContent; if (!root.LanVoice?.supported) { const note=document.querySelector('#lanVoiceNote');if(note)note.textContent = '澜的人声暂不可用，字幕仍可阅读。'; return; } speak(text); }
  function openPrologue() { trigger('lan.prologue.first-travel'); }
  function onExhibit(era, exhibitId) { window.AudioSystem?.playEffect('exhibit');const context={era,exhibitId},rule=matchingEventRule('EXHIBIT_CLICK',context);if(rule)return dispatchEvent('EXHIBIT_CLICK',context);return freshCustom('lan.exhibit.open', era, 'exhibit', 'open-details', 'thinking', journeyLines.exhibit, { relatedExhibit: exhibitId, presentationMode:'companion' }); }
  function onTaskStart(era) { if((era==='2G'||era==='3G'||era==='4G'||era==='5G')&&matchingEventRule('TASK_START',{era})){dispatchEvent('TASK_START',{era});return}freshCustom('lan.task.start', era, 'task', 'start-investigation', 'thinking', journeyLines.taskStart, { relatedTask: `task.${String(era).toLowerCase()}.investigation` }); }
  function completeExperienceNode(nodeId, era = null){if(experienceZonesDisabled)return false;const story=era?getExperienceStory(era):Object.values(experienceStories).find(item=>item.nodes?.some(node=>node.trigger===nodeId));const node=story?.nodes?.find(item=>item.trigger===nodeId);if(!node)return false;const done=memory.completedExperienceNodes||(memory.completedExperienceNodes=[]);if(done.includes(nodeId))return false;done.push(nodeId);if(story.era==='6G'){const progress=ensure6GProgress(),nodes=progress.experienceProgress.completedNodes||(progress.experienceProgress.completedNodes=[]);if(!nodes.includes(nodeId))nodes.push(nodeId)}saveMemory();dispatchEvent('EXPERIENCE_NODE',{era:story.era,nodeId});if(story.nodes.length&&story.nodes.every(item=>done.includes(item.trigger))){if(story.era==='6G')ensure6GProgress().experienceProgress.status='completed';saveMemory();dispatchEvent('EXPERIENCE_MERGE',{era:story.era})}return true}
  function completeEraArchive3G(context={}){
    const source=root.EraArchive3G,taskId='task.3g.investigation';
    if(!source||context.era!=='3G'||context.constructionCompleted!==true||!memory.completedTasks.includes(taskId))return false;
    let archive=memory.eraArchives.find(item=>item.archiveId===source.id);
    if(archive?.completed)return false;
    archive={era:'3G',archiveId:source.id,completed:true,constructionCompleted:true,evidenceUnlocked:Array.isArray(context.evidenceUnlocked)?[...new Set(context.evidenceUnlocked)]:[],completedAt:new Date().toISOString(),title:source.title,summary:source.summary,technology:source.technology,construction:source.construction,experience:source.experience,keywords:[...source.keywords]};
    if(!archive.evidenceUnlocked.length)return false;
    memory.eraArchives=memory.eraArchives.filter(item=>item.archiveId!==source.id);memory.eraArchives.push(archive);
    if(!memory.completedEras.includes('3G'))memory.completedEras.push('3G');
    saveMemory();source.completed=true;
    dispatchEvent('ARCHIVE_3G_COMPLETE',{era:'3G'});return true;
  }
  function completeEraArchive4G(context={}){
    const source=root.EraArchive4G,taskId='task.4g.investigation';
    if(!source||context.era!=='4G'||context.constructionCompleted!==true||!memory.completedTasks.includes(taskId))return false;
    if(memory.eraArchives.some(item=>item.archiveId===source.id&&item.completed))return false;
    const evidenceUnlocked=Array.isArray(context.evidenceUnlocked)?[...new Set(context.evidenceUnlocked)]:[];
    if(!evidenceUnlocked.length)return false;
    const archive={era:'4G',archiveId:source.id,completed:true,constructionCompleted:true,evidenceUnlocked,completedAt:new Date().toISOString(),title:source.title,summary:source.summary,technology:source.technology,construction:source.construction,experience:source.experience,keywords:[...source.keywords]};
    memory.eraArchives=memory.eraArchives.filter(item=>item.archiveId!==source.id);memory.eraArchives.push(archive);
    if(!memory.completedEras.includes('4G'))memory.completedEras.push('4G');
    saveMemory();source.completed=true;
    dispatchEvent('ARCHIVE_4G_COMPLETE',{era:'4G'});return true;
  }
  function completeEraArchive5G(context={}){
    const source=root.EraArchive5G,taskId='task.5g.investigation';
    if(!source||context.era!=='5G'||context.constructionCompleted!==true||!memory.completedTasks.includes(taskId))return false;
    if(memory.eraArchives.some(item=>item.archiveId===source.id&&item.completed))return false;
    const evidenceUnlocked=Array.isArray(context.evidenceUnlocked)?[...new Set(context.evidenceUnlocked)]:[];
    if(!evidenceUnlocked.length)return false;
    const archive={era:'5G',archiveId:source.id,completed:true,constructionCompleted:true,evidenceUnlocked,completedAt:new Date().toISOString(),title:source.title,summary:source.summary,technology:source.technology,construction:source.construction,experience:source.experience,keywords:[...source.keywords]};
    memory.eraArchives=memory.eraArchives.filter(item=>item.archiveId!==source.id);memory.eraArchives.push(archive);
    if(!memory.completedEras.includes('5G'))memory.completedEras.push('5G');
    saveMemory();source.completed=true;
    dispatchEvent('ARCHIVE_5G_COMPLETE',{era:'5G'});return true;
  }
  function ensure6GProgress(){const progress=memory.eraProgress||(memory.eraProgress={});return progress['6G']||(progress['6G']={builderProgress:{taskId:'task.6g.investigation',status:'in-progress',nodes:{}},experienceProgress:{completedNodes:[]},evidenceProgress:{collectedIds:[]},archiveProgress:{completed:false}})}
  function collectBuilderEvidence6G(evidenceId){const source=(root.ArchiveEvidence6G||[]).find(item=>item.id===evidenceId);if(!source)return false;const progress=ensure6GProgress(),ids=progress.evidenceProgress.collectedIds||(progress.evidenceProgress.collectedIds=[]);if(ids.includes(evidenceId))return false;ids.push(evidenceId);progress.builderProgress.nodes[source.owner]=true;if(!memory.collectedEvidence.includes(evidenceId))memory.collectedEvidence.push(evidenceId);saveMemory();return true}
  function completeEraArchive6G(context={}){
    const source=root.EraArchive6G,progress=ensure6GProgress(),required=source?.evidenceIds||[];
    if(!source||context.era!=='6G'||context.constructionCompleted!==true||!memory.completedTasks.includes('task.6g.investigation')||!required.length||!required.every(id=>progress.evidenceProgress.collectedIds.includes(id)))return false;
    if(memory.eraArchives.some(item=>item.archiveId===source.id&&item.completed))return false;
    const archive={era:'6G',archiveId:source.id,completed:true,constructionCompleted:true,evidenceUnlocked:[...required],completedAt:new Date().toISOString(),title:source.title,summary:source.summary,technology:source.technology,construction:source.construction,experience:source.experience,keywords:[...source.keywords]};
    memory.eraArchives=memory.eraArchives.filter(item=>item.archiveId!==source.id);memory.eraArchives.push(archive);if(!memory.completedEras.includes('6G'))memory.completedEras.push('6G');progress.builderProgress.status='completed';progress.archiveProgress={completed:true,archiveId:source.id,completedAt:archive.completedAt};saveMemory();source.completed=true;dispatchEvent('ARCHIVE_6G_COMPLETE',{era:'6G'});if(!memory.completedTriggers.includes('FINAL_STORY_READY'))memory.completedTriggers.push('FINAL_STORY_READY');if(!memory.completedEvents.includes('FINAL_STORY_READY'))memory.completedEvents.push('FINAL_STORY_READY');saveMemory();if(typeof root.dispatchEvent==='function'&&typeof root.CustomEvent==='function')root.dispatchEvent(new root.CustomEvent('comms-archive-final-ready',{detail:{era:'6G',archiveId:source.id}}));return true;
  }
  function ensureCompletedTaskRecord(era) {
    if(!['1G','2G','3G','4G','5G','6G'].includes(era))return false;
    const taskId=`task.${String(era).toLowerCase()}.investigation`;
    if(!memory.completedTasks.includes(taskId)){memory.completedTasks.push(taskId);saveMemory()}
    return true;
  }
  function onTaskComplete(era, completionContext={}) {
    const taskId=`task.${String(era).toLowerCase()}.investigation`;if(!memory.completedTasks.includes(taskId)){memory.completedTasks.push(taskId);window.AudioSystem?.playEffect('complete')}saveMemory();
    if (era === '1G') return;
    if (era === '2G') { dispatchEvent('TASK_COMPLETE',{era}); return; }
    if (era === '3G') { dispatchEvent('TASK_COMPLETE',{era}); return; }
    if (era === '4G') { dispatchEvent('TASK_COMPLETE',{era}); return; }
    if (era === '5G' || era === '6G') { const progress=era==='6G'?ensure6GProgress():null;if(progress)progress.builderProgress.status='completed';saveMemory();dispatchEvent('TASK_COMPLETE',{era});return; }
    trigger('lan.task.complete', era);
  }
  function onGallerySelect(era) { window.AudioSystem?.setEra(era);freshCustom('lan.gallery.select-era', era, 'gallery', 'select-era', 'curious', `${era}这站选得好。查看展品、原理资料，再决定从哪条线索开始。`); }
  function onQuizRecord(record) { if(record?.id&&!memory.quizRecords.some(item=>item.id===record.id)){memory.quizRecords.unshift({id:record.id,time:record.time,score:record.score,total:record.total,era:record.era});memory.quizRecords=memory.quizRecords.slice(0,100);saveMemory()} }
  function onEvidenceCollected(id) { if(id&&!memory.collectedEvidence.includes(id)){memory.collectedEvidence.push(id);saveMemory();window.AudioSystem?.playEffect('archive')} }
  function onTransitFailure(reason) { freshCustom('lan.transit.failure',null,'transition','failure','warning',['等等，时空通道出现了一点偏差。','你的探索记录没有损坏，我们重新校准一次。',String(reason||'展厅暂时无法打开。')]); }
  function onQuizPerfect() { freshCustom('lan.quiz.perfect', null, 'quiz', 'perfect-score', 'proud', '完美回答！看来你已经真正理解这一代通信技术的发展。'); }
  function presentationDiagnostics(){
    const box=document.getElementById('lanCompanion');
    const rect=box?.getBoundingClientRect?.();
    const style=box&&typeof window.getComputedStyle==='function'?window.getComputedStyle(box):null;
    const duplicateCount=typeof document.querySelectorAll==='function'?document.querySelectorAll('#lanCompanion').length:(box?1:0);
    return {queueDisplayMode,domMode:box?.dataset?.mode||'',dialogueSurface:box?.dataset?.dialogueSurface||'',domParent:box?.parentElement===document.body?'body':box?.parentElement?.id||'',duplicateCount,layout:rect?{left:rect.left,top:rect.top,width:rect.width,height:rect.height,position:style?.position||'',transform:style?.transform||'',zIndex:style?.zIndex||''}:null};
  }
  function install() {
    mounted = true; makeRoot(); refreshHistory();
    const currentRoute = document.querySelector('#app')?.dataset?.route || 'home';
    onRoute(currentRoute, { era: null, completed: [] });
  }
  function reloadStorageContext() { stopSpeechForPageHide(); root.LanVoice?.refresh(); settings = readPrefs(); history = readHistory(); memory = readMemory(); LanDisplayMode.preference=memory.settings.display.lanMode; queue = []; queueIndex = 0; queueDisplayMode='companion';continueDialoguePresentation=false;collapseAfterDialogue=false;historyLines = []; historyCursor = -1; setDialoguePhase('exit',lanDialoguePhase.sequenceId);setDisplayMode(LanDisplayMode.preference==='minimal'?'hidden':'companion');refreshHistory(); return true; }
  root.CommsArchiveLan = { showInteractionFeedback, dismissInteractionFeedback, character, dialogueData, LanDisplayMode, LanEmotionController, dialogueNavigator:LanDialogueNavigator, expandDialogue, hideDialogue, moveCardToNextCorner, setDisplayMode, setDisplayPreference, normalizeDialogue, normalizeEmotion, normalizeTrigger, getExperienceStory, getEraArchives, attach, trigger, dispatchEvent, setEmotion, checkGuidedDialogueState, resetJourneyState, createEmptyJourneyData, exportJourneyData, validateJourneyData, importJourneyData, completeExperienceNode, collectBuilderEvidence6G, completeEraArchive3G, completeEraArchive4G, completeEraArchive5G, completeEraArchive6G, ensureCompletedTaskRecord, experienceStories, experienceZonesDisabled, experienceStory3G:experienceZonesDisabled?null:root.ExperienceStory3G, onRoute, dismissRouteDialogue, releaseNonBlockingDialogue, onExhibit, onTaskStart, onTaskComplete, onGallerySelect, onQuizPerfect, onQuizRecord, onEvidenceCollected, onTransitFailure, triggerAt, triggers:LanTrigger, LanCharacter:character, LanDialogue:dialogueData, reloadStorageContext, get LanMemory(){return JSON.parse(JSON.stringify(memory))}, get currentDialogue(){return queue[queueIndex]||null}, debugSnapshot(){const active=queue[queueIndex]||null;return {isPlaying:queue.length>0,isBlocking:isNavigationBlocking(),activeDialogueId:active?.id||'',persistedCurrentDialogue:memory.currentDialogue||'',lineIndex:queueIndex,queueLength:queue.length,displayMode:LanDisplayMode.mode,...presentationDiagnostics(),lanControlsReleased:!isNavigationBlocking(),inputLock:isNavigationBlocking()}}, openPrologue, continueDialogue:advanceFromUser, next, skip, replayLastSkipped, toggleCollapse, toggleVoice, readCurrent, toggleHistory, closeHistory, previousHistoryLine, nextHistoryLine, jumpToHistory, install, get history() { return history.slice() }, get mounted() { return mounted } };
  root.LanSystem = root.CommsArchiveLan;
})(window);

