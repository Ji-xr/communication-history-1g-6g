/* 5G归档展板接入现有页面函数；任务与证据仍使用app.js及LanSystem存档。 */
(function (root) {
  'use strict';
  const originalEndPage = root.endPage;
  const originalArchiveCards = root.eraArchiveCards;
  const originalRecordExperience = root.recordGuidedExperience;
  const originalCompleteEra = root.completeEra;

  root.render5GExperience = function render5GExperience(e) {
    root.dispatchLanEvent('EXPERIENCE_START', { era: '5G' });
    const story = root.CommsArchiveLan?.getExperienceStory('5G') || root.ExperienceStory5G;
    const done = new Set(root.CommsArchiveLan?.LanMemory?.completedExperienceNodes || []);
    const allDone = !!story?.nodes?.length && story.nodes.every(node => done.has(node.trigger));
    return `<div class="eyebrow">生活现场 / 5G</div><h3>${root.escapeHtml(story.title)}</h3>
      <section class="guided-section"><h4>连接协同进入日常</h4><p>${root.escapeHtml(e.moment)}</p><p>${root.escapeHtml(e.record)}</p>
      <p>在交通、家庭、医疗协作与工业情境中读取设备状态、发起协同操作并查看反馈。以下为本地互动模拟，不代表这些应用已在所有地区普遍部署。</p></section>
      <div class="experience-node-list">${story.nodes.map((node, index) => `<article class="experience-node ${done.has(node.trigger) ? 'completed' : ''}"><div><span class="eyebrow">体验节点 0${index + 1}</span><h4>${root.escapeHtml(node.location)}</h4><p>${root.escapeHtml(node.reward)}</p>${root.experienceInteractionMarkup('5G',node,done.has(node.trigger))}</div></article>`).join('')}</div>
      ${allDone ? '<div class="feedback"><strong>设备协同体验记录已完成</strong><br>各项模拟操作与反馈已写入本地时空日志。</div>' : '<p class="muted">完成各项交互后，体验记录会进入年代档案。</p>'}
      <button class="btn" onclick="recordGuidedExperience()">记录设备协同体验，前往档案出口 →</button>`;
  };

  root.eraArchivePanel5G = function eraArchivePanel5G() {
    const data = root.EraArchive5G;
    const record = root.CommsArchiveLan?.LanMemory?.eraArchives?.find(item => item.archiveId === 'archive_5g');
    const pending = !!state.tasks['5G']?.archivePending;
    const complete = !!record?.completed;
    return `<section class="archive-record era-archive-5g">
      <div class="eyebrow">ERA ARCHIVE / 5G</div>
      <button class="btn ghost" onclick="playLanArchiveDialogue('5G','lan_5g_archive_entry_001',true)">${state.tasks['5G']?.archiveSummaryViewed?'再次聆听澜的归档总结':'听澜开始归档总结'}</button><span id="archiveSummaryViewed" class="muted" role="status" aria-live="polite">${state.tasks['5G']?.archiveSummaryViewed?'已听取澜的归档总结。':''}</span>
      <h3>${root.escapeHtml(data.title)}</h3><p>${root.escapeHtml(data.summary)}</p>
      <div class="story-grid">
        <article class="story-card card"><h4>技术方向</h4><p>${root.escapeHtml(data.technology)}</p><button class="btn ghost" onclick="playLanArchiveDialogue('5G','lan_5g_archive_technology_001')">听澜总结技术方向</button></article>
        <article class="story-card card"><h4>技术进展</h4><p>${root.escapeHtml(data.construction)}</p></article>
        <article class="story-card card"><h4>日常影响</h4><p>${root.escapeHtml(data.experience)}</p><button class="btn ghost" onclick="playLanArchiveDialogue('5G','lan_5g_archive_experience_001')">听澜总结日常影响</button></article>
        <article class="story-card card"><h4>关键词</h4><p>${data.keywords.map(root.escapeHtml).join(' · ')}</p></article>
      </div>
      <p>关联证据：${(record?.evidenceUnlocked || state.evidence.filter(item => item.eraId === '5G').map(item => item.evidenceId)).map(root.escapeHtml).join('、')} · 展品 exhibit.5g.factory · 原理 flow.5g.communication</p>
      ${complete ? '<span class="status done">5G时代档案已完成</span>' : `<button class="btn gold" ${pending ? '' : 'disabled'} onclick="complete5GArchive()">${pending ? '完成5G时代归档 →' : '等待调查成果与生活体验完成'}</button>`}
    </section>`;
  };

  root.complete5GArchive = function complete5GArchive() {
    const task = state.tasks['5G'] || {};
    const nodes = root.CommsArchiveLan?.getExperienceStory('5G')?.nodes || [];
    const done = new Set(root.CommsArchiveLan?.LanMemory?.completedExperienceNodes || []);
    const evidenceUnlocked = state.evidence.filter(item => item.eraId === '5G').map(item => item.evidenceId);
    if (!task.archivePending || !task.completed || !nodes.length || !nodes.every(node => done.has(node.trigger)) || !evidenceUnlocked.length) {
      root.alert('5G归档未完成：请完成调查结果、全部生活体验节点，并确认调查证据已收录。');
      return false;
    }
    root.CommsArchiveLan?.ensureCompletedTaskRecord?.('5G');
    const saved = root.CommsArchiveLan.completeEraArchive5G({ era: '5G', constructionCompleted: !!task.completed, experienceCompleted: nodes.every(node => done.has(node.trigger)), evidenceUnlocked });
    if (!saved) { root.alert('5G档案暂未封存。请确认调查结果、生活体验与证据完整后重试。'); return false; }
    if (!state.completed.includes('5G')) state.completed.push('5G');
    state.tasks['5G'] = { ...task, archivePending: false, archiveCompleted: true };
    if (!state.logs.some(log => log.era === '5G' && log.archiveId === 'archive_5g')) {
      const era = eras.find(item => item.id === '5G');
      const directions = (state.clues['5G'] || []).map(value => typeof value === 'number' ? era.opts[value]?.[0] : era.secondary.opts[Number(String(value).slice(1))]?.[0]).filter(Boolean);
      state.logs.push({ era: '5G', archiveId: 'archive_5g', time: new Date().toLocaleString('zh-CN'), direction: directions.join('、') || '综合调查', discovery: era.core });
    }
    progression.state.evidence = state.evidence.map(item => item.evidenceId);
    save(); render();
    return true;
  };

  root.endPage = function endPageWith5GArchive() {
    const html = originalEndPage();
    if (eras[eraIndex]?.id !== '5G') return html;
    const marker = '</p>';
    const start = html.indexOf('<p class="lead">');
    const end = start < 0 ? -1 : html.indexOf(marker, start);
    if (end < 0) return html;
    return html.slice(0, end + marker.length) + root.eraArchivePanel5G() + html.slice(end + marker.length);
  };
  root.eraArchiveCards = function eraArchiveCardsWith5G() {
    const html = originalArchiveCards();
    const records = root.CommsArchiveLan?.LanMemory?.eraArchives || [];
    if (!state.tasks['5G']?.archivePending || records.some(record => record.archiveId === 'archive_5g')) return html;
    return html + '<div class="archive-record"><h3>5G归档待完成</h3><p>调查成果与生活体验已记录，完成归档后开放6G。</p><button class="btn" onclick="resumeEraArchive(\'5G\')">继续完成5G归档 →</button></div>';
  };
  root.recordGuidedExperience = function record5GExperienceSafely() {
    return originalRecordExperience();
  };
  root.completeEra = function completeEraWith5GChecks() {
    if (eras[eraIndex]?.id === '5G' && !state.completed.includes('5G')) {
      const nodes = root.CommsArchiveLan?.getExperienceStory('5G')?.nodes || [];
      const done = new Set(root.CommsArchiveLan?.LanMemory?.completedExperienceNodes || []);
      if (!nodes.length || !nodes.every(node => done.has(node.trigger))) { root.alert('请先完成5G生活体验，再提交时代调查成果。'); return; }
    }
    return originalCompleteEra();
  };
})(window);
