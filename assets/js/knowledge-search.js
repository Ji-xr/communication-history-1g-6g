/* 《通信简史：从1G到6G》本地知识索引，数据从统一内容模型读取。 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CommsArchiveKnowledgeSearch = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';
  const CATEGORIES = ['全部分类', '技术原理', '设备展品', '历史资料', '应用场景'];
  const normalize = value => String(value || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  function records(model) {
    if (!model) return [];
    const eras = new Map((model.eras || []).map(item => [item.eraId || item.id, item]));
    const eraLabel = (id, record) => {
      const era = eras.get(id);
      return `${id || ''} ${era?.title || record?.eraTitle || ''}`.trim();
    };
    const rows = [];
    (model.eras || []).forEach(era => {
      rows.push({
        id: `era.${era.eraId || era.id}`, eraId: era.eraId || era.id, title: `${era.eraId || era.id} · ${era.title}`,
        kind: '历史资料', category: '历史资料', summary: [era.background, era.exhibition?.mainProblem, era.exhibition?.historicalSignificance, era.summary?.historicalImpact].filter(Boolean).join(' '),
        searchText: [era.eraId, era.title, era.theme, era.timeRange, era.background, era.exhibition?.mainProblem, era.exhibition?.historicalSignificance, era.summary?.technicalAchievement].join(' ')
      });
    });
    (model.exhibits || []).forEach(item => {
      const equipment = /设备|终端|手机|电话|基站|SIM|机械臂|传感器/i.test(`${item.type} ${item.name}`);
      rows.push({
        id: `exhibit.${item.exhibitId || item.id}`, eraId: item.eraId || item.era, exhibitId: item.exhibitId || item.id,
        title: item.name, kind: item.type || '展品', category: equipment ? '设备展品' : '历史资料',
        summary: [item.description, item.technicalExplanation, item.eraImpact].filter(Boolean).join(' '),
        searchText: [item.name, item.type, item.description, item.technicalExplanation, item.eraImpact, eraLabel(item.eraId || item.era, item)].join(' ')
      });
    });
    (model.flows || []).forEach(item => rows.push({
      id: `flow.${item.flowId}`, eraId: item.eraId, title: `${item.eraId} 技术流程与原理`, kind: '技术原理', category: '技术原理',
      summary: item.explanation || (item.theme || []).join(' · '),
      searchText: [item.eraId, (item.theme || []).join(' '), (item.steps || []).map(step => step.label).join(' '), item.explanation].join(' ')
    }));
    (model.tasks || []).forEach(item => rows.push({
      id: `task.${item.taskId || item.id}`, eraId: item.eraId || item.era, title: item.title, kind: item.kind || '调查任务', category: '应用场景',
      summary: item.description || item.objective || '',
      searchText: [item.eraId, item.title, item.kind, item.description, item.objective, ...(item.options || []).map(option => `${option.label} ${option.feedback}`)].join(' ')
    }));
    (model.images || []).forEach(item => rows.push({
      id: `image.${item.imageId || item.id}`, eraId: item.eraId || item.era, title: item.name, kind: item.type || '图片资料', category: item.type === '技术示意图' ? '技术原理' : '历史资料',
      summary: [item.authenticity, item.source, item.license].filter(Boolean).join(' '),
      searchText: [item.eraId, item.name, item.type, item.authenticity, item.source, item.credit].join(' ')
    }));
    (model.evidenceDefinitions || []).forEach(item => rows.push({
      id: `evidence.${item.evidenceId || item.id}`, eraId: item.eraId || item.era, title: item.name,
      kind: item.type || '调查证据', category: '历史资料', summary: item.description || '',
      exhibitIds: item.exhibitIds || [], imageIds: item.imageIds || [], taskIds: [item.taskId || item.sourceTaskId].filter(Boolean),
      searchText: [item.eraId, item.name, item.type, item.description, item.archiveLocation].join(' ')
    }));
    (model.dialogues || []).forEach(item => rows.push({
      id: `dialogue.${item.dialogueId || item.id}`, eraId: item.eraId || item.era, title: `${item.eraId || item.era} · 澜的研究记录`,
      kind: '剧情与研究记录', category: '历史资料', summary: Array.isArray(item.text) ? item.text.join(' ') : (item.text || item.content || ''),
      searchText: [item.eraId, item.location, item.trigger, item.text, item.content].join(' ')
    }));
    const exhibitsByEra = new Map();
    for (const exhibit of model.exhibits || []) {
      const id = exhibit.eraId || exhibit.era;
      if (!id) continue;
      const list = exhibitsByEra.get(id) || [];
      list.push(exhibit);
      exhibitsByEra.set(id, list);
    }
    const evidenceByEra = new Map();
    for (const evidence of model.evidenceDefinitions || []) {
      const id = evidence.eraId || evidence.era;
      if (!id) continue;
      const list = evidenceByEra.get(id) || [];
      list.push(evidence);
      evidenceByEra.set(id, list);
    }
    return rows.map(row => {
      const era = eras.get(row.eraId);
      const flow = (model.flows || []).find(item => item.eraId === row.eraId);
      const linkedIds = new Set(row.exhibitIds || (row.exhibitId ? [row.exhibitId] : []));
      const relatedExhibits = (exhibitsByEra.get(row.eraId) || [])
        .filter(item => !linkedIds.size || linkedIds.has(item.exhibitId || item.id))
        .slice(0, 3).map(item => item.name).filter(Boolean);
      const linkedEvidence = (evidenceByEra.get(row.eraId) || []).filter(item =>
        !linkedIds.size || !(item.exhibitIds || []).length || (item.exhibitIds || []).some(id => linkedIds.has(id))
      ).slice(0, 2).map(item => item.name).filter(Boolean);
      const experience = root?.CommsArchiveLan?.getExperienceStory?.(row.eraId)
        || root?.[`ExperienceStory${String(row.eraId || '')}`]
        || null;
      return {
        ...row,
        technicalKeywords: [...new Set([
          ...(Array.isArray(row.technicalKeywords) ? row.technicalKeywords : []),
          ...(Array.isArray(flow?.theme) ? flow.theme : []),
          ...(Array.isArray(era?.theme) ? era.theme : typeof era?.theme === 'string' ? [era.theme] : [])
        ].filter(Boolean))].slice(0, 6),
        relatedExhibits,
        relatedArchives: linkedEvidence,
        relatedExperience: experience?.title || era?.experience?.title || era?.experienceTitle || '',
        lanRecord: (model.dialogues || []).find(item => (item.eraId || item.era) === row.eraId
          && (item.text || item.content))?.text || ''
      };
    });
  }
  function search(model, { query = '', era = '', category = '' } = {}) {
    const terms = normalize(query).split(' ').filter(Boolean);
    return records(model).filter(item => (!era || item.eraId === era) && (!category || category === '全部分类' || item.category === category) && terms.every(term => normalize(`${item.title} ${item.summary} ${item.searchText}`).includes(term)));
  }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function renderPage() {
    const eras = root?.CommsArchiveContent?.eras || [];
    return `<section class="page knowledge-search-page"><div class="eyebrow">LOCAL ARCHIVE SEARCH</div><h2>通信知识搜索</h2><p class="lead">搜索六代历史资料、展品和技术原理。内容来自现有通信简史资料库，可离线使用。</p><div class="card knowledge-search-panel"><label for="knowledgeSearchInput">关键词</label><input id="knowledgeSearchInput" type="search" placeholder="试试：短信、基站、LTE、数字孪生" autocomplete="off" oninput="CommsArchiveKnowledgeSearch.updateResults()"><div class="knowledge-search-filters"><label>时代<select id="knowledgeEraFilter" onchange="CommsArchiveKnowledgeSearch.updateResults()"><option value="">全部时代</option>${eras.map(item => `<option value="${escapeHtml(item.eraId || item.id)}">${escapeHtml(item.eraId || item.id)} · ${escapeHtml(item.title)}</option>`).join('')}</select></label><label>分类<select id="knowledgeCategoryFilter" onchange="CommsArchiveKnowledgeSearch.updateResults()">${CATEGORIES.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')}</select></label></div><p id="knowledgeSearchCount" class="muted" role="status">输入关键词，或选择时代与分类浏览。</p><div id="knowledgeResults" class="knowledge-results"></div><p id="knowledgeSearchNotice" class="knowledge-search-notice" role="status"></p></div><section class="knowledge-challenge-entry"><div><span class="eyebrow">知识巩固</span><h3>知识挑战</h3><p class="muted">完成现有10题问答，查看得分、徽章与历史记录。</p></div><button class="btn secondary" onclick="go('quiz')">进入知识挑战 →</button></section><div class="actions"><button class="btn ghost" onclick="go('ask')">打开离线问答</button><button class="btn ghost" onclick="go('eras')">前往时代航线</button></div></section>`;
  }
  function updateResults() {
    const input = root?.document?.querySelector('#knowledgeSearchInput');
    const era = root.document.querySelector('#knowledgeEraFilter')?.value || '';
    const category = root.document.querySelector('#knowledgeCategoryFilter')?.value || '';
    const query = input?.value || '';
    const results = search(root.CommsArchiveContent, { query, era, category });
    const target = root.document.querySelector('#knowledgeResults');
    const count = root.document.querySelector('#knowledgeSearchCount');
    const notice = root.document.querySelector('#knowledgeSearchNotice');
    if (!target) return results;
    if (count) count.textContent = `${results.length} 条资料${query.trim() ? ` · 关键词“${query.trim()}”` : ''}`;
    if (notice) notice.textContent = '';
    target.innerHTML = results.length ? results.slice(0, 60).map(item => {
      const context = [
        item.technicalKeywords.length ? `<p><b>技术关键词：</b>${item.technicalKeywords.map(escapeHtml).join(' · ')}</p>` : '',
        item.relatedExhibits.length ? `<p><b>相关展品：</b>${item.relatedExhibits.map(escapeHtml).join('、')}</p>` : '',
        item.relatedArchives.length ? `<p><b>相关档案：</b>${item.relatedArchives.map(escapeHtml).join('、')}</p>` : '',
        item.relatedExperience ? `<p><b>时代体验：</b>${escapeHtml(item.relatedExperience)}</p>` : '',
        item.lanRecord ? `<p><b>澜的研究记录：</b>${escapeHtml(Array.isArray(item.lanRecord) ? item.lanRecord.join(' ') : item.lanRecord)}</p>` : ''
      ].filter(Boolean).join('');
      return `<article class="knowledge-result"><div class="knowledge-result-meta"><span class="status">${escapeHtml(item.eraId)}</span><span>${escapeHtml(item.category)}</span><span>${escapeHtml(item.kind)}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || '现有资料中未附加更长说明。')}</p>${context ? `<div class="knowledge-result-context">${context}</div>` : ''}<button class="btn secondary" onclick="CommsArchiveKnowledgeSearch.openResult('${escapeHtml(item.id)}','${escapeHtml(item.eraId)}')">${item.exhibitId ? '查看展品详情' : item.kind === '技术原理' ? '查看技术原理' : `查看${escapeHtml(item.eraId)}时代资料`} →</button></article>`;
    }).join('') : '<div class="empty card"><h3>没有找到相关通信记录</h3><p>试试“5G”“短信”“移动电话”“基站”或“人工智能”，也可以更换时代和分类。</p></div>';
    return results;
  }
  function openEra(eraId) {
    const notice = root?.document?.querySelector('#knowledgeSearchNotice');
    const eras = root.CommsArchiveContent?.eras || [];
    const index = eras.findIndex(item => (item.eraId || item.id) === eraId);
    if (index < 0) { if (notice) notice.textContent = '没有找到对应时代。'; return false; }
    const entered = root.enterEra?.(index);
    if (!entered && notice) notice.textContent = '该时代尚未开放。完成前序时代档案后即可进入。';
    return !!entered;
  }
  function openResult(recordId, eraId) {
    const row = records(root?.CommsArchiveContent).find(item => item.id === recordId);
    if (!row || !openEra(eraId)) return false;
    if (row.exhibitId && typeof root.showExhibitDetails === 'function') { root.showExhibitDetails(eraId, 'search', row.exhibitId); return true; }
    root.setTimeout?.(() => {
      const target = row.kind === '技术原理' ? root.document.querySelector('.history-diagram,.diagram-wrap') : row.kind === '时代问题调查' ? root.document.querySelector('.task-panel') : root.document.querySelector('.history-media');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return true;
  }
  return { CATEGORIES, records, search, renderPage, updateResults, openEra, openResult };
});
