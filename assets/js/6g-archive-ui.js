/* 6G研究情境档案接入现有章节、证据和时空日志。 */
(function(root){
  'use strict';
  const originalEndPage=root.endPage;
  const originalArchiveCards=root.eraArchiveCards;
  const originalCompleteEra=root.completeEra;

  function sixGProgress(){return root.CommsArchiveLan?.LanMemory?.eraProgress?.['6G']||{evidenceProgress:{collectedIds:[]},archiveProgress:{completed:false}}}
  function sixGExperienceDone(){const nodes=root.CommsArchiveLan?.getExperienceStory('6G')?.nodes||[],done=new Set(root.CommsArchiveLan?.LanMemory?.completedExperienceNodes||[]);return nodes.length>0&&nodes.every(node=>done.has(node.trigger))}
  function sixGEvidenceDone(){const ids=root.EraArchive6G?.evidenceIds||[],collected=new Set(sixGProgress().evidenceProgress?.collectedIds||[]);return ids.length>0&&ids.every(id=>collected.has(id))}
  function sixGInvestigationDirection(){const era=eras.find(item=>item.id==='6G'),directions=(state.clues['6G']||[]).map(value=>{const index=typeof value==='number'?value:Number(String(value).replace(/^s/,''));return era?.opts?.[index]?.[0]||era?.secondary?.opts?.[index]?.[0]||''}).filter(Boolean);return[...new Set(directions)].join('、')||'综合研究情境调查'}

  root.eraArchivePanel6G=function eraArchivePanel6G(){
    const data=root.EraArchive6G,record=root.CommsArchiveLan?.LanMemory?.eraArchives?.find(item=>item.archiveId==='archive_6g'),progress=sixGProgress(),collected=new Set(progress.evidenceProgress?.collectedIds||[]),task=state.tasks['6G']||{},ready=!!task.completed&&sixGExperienceDone()&&sixGEvidenceDone()&&root.CommsArchiveLan?.LanMemory?.completedTasks?.includes('task.6g.investigation');
    return `<section class="archive-record era-archive-6g"><div class="eyebrow">ERA ARCHIVE / 6G · 研究阶段</div><button class="btn ghost" onclick="playLanArchiveDialogue('6G','lan_6g_archive_entry_001',true)">${task.archiveSummaryViewed?'再次聆听澜的归档总结':'听澜开始归档总结'}</button><h3>${root.escapeHtml(data.title)}</h3><p>${root.escapeHtml(data.summary)}</p><div class="story-grid"><article class="story-card card"><h4>技术研究方向</h4><p>${root.escapeHtml(data.technology)}</p></article><article class="story-card card"><h4>建设者调查</h4><p>${root.escapeHtml(data.construction)}</p></article><article class="story-card card"><h4>体验者记录</h4><p>${root.escapeHtml(data.experience)}</p></article><article class="story-card card"><h4>关键词</h4><p>${data.keywords.map(root.escapeHtml).join(' · ')}</p></article></div><h4>研究情境调查证据</h4><div class="evidence-grid">${data.evidence.map(item=>`<article class="evidence-card"><div class="eyebrow">${root.escapeHtml(item.type)} · ${root.escapeHtml(item.id)}</div><h4>${root.escapeHtml(item.source)}</h4><p>${root.escapeHtml(item.description)}</p><p>关联展品：${root.escapeHtml(item.exhibitId)} · 档案位置：${root.escapeHtml(item.archiveLocation)}</p><span class="status ${collected.has(item.id)?'done':''}">${collected.has(item.id)?'已收集':'待调查'}</span></article>`).join('')}</div><p>体验节点：${(progress.experienceProgress?.completedNodes||[]).length}/${root.ExperienceStory6G.nodes.length} · 调查证据：${collected.size}/${data.evidenceIds.length}</p>${record?.completed?'<span class="status done">6G研究情境档案已封存</span>':`<button class="btn gold" ${ready?'':'disabled'} onclick="complete6GArchive()">${ready?'完成6G档案封存 →':'完成建设者调查、四个体验节点与四类证据后开放归档'}</button>`}<p class="muted">科普说明：6G仍处于研究与发展阶段。本展区属于未来情境设计，不代表相关能力已经普遍商用。</p></section>`;
  };

  root.complete6GArchive=function complete6GArchive(){
    const task=state.tasks['6G']||{};
      if(!task.completed||!sixGExperienceDone()||!sixGEvidenceDone()||!root.CommsArchiveLan?.LanMemory?.completedTasks?.includes('task.6g.investigation')){root.alert('建设者调查、四个体验节点或调查证据尚未完整，暂时不能完成6G归档。');return false}
    const saved=root.CommsArchiveLan.completeEraArchive6G({era:'6G',constructionCompleted:true,experienceCompleted:true});
    if(!saved){root.alert('6G研究情境档案未能写入本地记录，请检查存档后重试。');return false}
    state.tasks['6G']={...task,archiveCompleted:true};
    if(!state.logs.some(item=>item.era==='6G'&&item.archiveId==='archive_6g'))state.logs.push({era:'6G',archiveId:'archive_6g',time:new Date().toLocaleString('zh-CN'),direction:sixGInvestigationDirection(),discovery:eras.find(item=>item.id==='6G').core});
    save();render();return true;
  };

  root.endPage=function endPageWith6GArchive(){
    let html=originalEndPage();
    if(eras[eraIndex]?.id!=='6G')return html;
    const marker='</p>',start=html.indexOf('<p class="lead">'),end=start<0?-1:html.indexOf(marker,start);
    if(end>=0)html=html.slice(0,end+marker.length)+root.eraArchivePanel6G()+html.slice(end+marker.length);
    const archived=!!root.CommsArchiveLan?.LanMemory?.eraArchives?.some(item=>item.archiveId==='archive_6g'&&item.completed);
    if(!archived)html=html.replace('ARCHIVE SEALED / 6G-001','ARCHIVE REVIEW / 6G-001').replace('<h2>通信简史档案已归档</h2>','<h2>6G研究情境档案待封存</h2>');
    if(!archived)html=html.replace('onclick="go(\'final\')">完成穿越之旅 →</button>','disabled title="完成6G档案后开放最终结局">完成6G档案后开放最终结局</button>');
    return html;
  };

  root.eraArchiveCards=function eraArchiveCardsWith6G(){
    const html=originalArchiveCards(),records=root.CommsArchiveLan?.LanMemory?.eraArchives||[];
    if(!state.tasks['6G']?.completed||records.some(item=>item.archiveId==='archive_6g'))return html;
    return html+'<div class="archive-record"><h3>6G研究情境档案待完成</h3><p>建设者调查、体验者节点和研究情境证据完成后，可封存最后一代档案。</p><button class="btn" onclick="resumeEraArchive(\'6G\')">继续完成6G档案 →</button></div>';
  };

  root.completeEra=function completeEraWith6GChecks(){
    if(eras[eraIndex]?.id==='6G'&&!state.completed.includes('6G')){
      if(!sixGExperienceDone()){root.alert('请先完成全部6G体验者故事节点。');return false}
      if(!sixGEvidenceDone()){root.alert('请先完成通信、感知、人工智能和数字孪生四项调查线索。');return false}
      if(!state.tasks['6G']?.understandingCompleted){root.alert('请先完成6G研究方向观察。');return false}
    }
    const before=state.completed.includes('6G'),result=originalCompleteEra();
    if(eras[eraIndex]?.id==='6G'&&!before&&state.completed.includes('6G')){root.CommsArchiveLan?.onTaskComplete('6G',{era:'6G'});render()}
    return result;
  };
})(window);
