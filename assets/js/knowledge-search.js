/* 《通信简史：从1G到6G》本地知识索引，数据从统一内容模型读取。 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CommsArchiveKnowledgeSearch = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';
  const text=root?.CommsText || (typeof require==='function'?require('./unicode-text.js'):{limit:(v,n)=>Array.from(String(v??'')).slice(0,n).join(''),dropLast:v=>Array.from(String(v??'')).slice(0,-1).join(''),length:v=>Array.from(String(v??'')).length});
  const CATEGORIES = ['全部分类', '技术原理', '设备展品', '历史资料', '应用场景'];
  const PAGE_SIZE = 7;
  const MAX_QUERY_LENGTH = 80;
  const SYNONYM_GROUPS = Object.freeze([
    { id: 'latency', label: '时延', terms: ['延时', '时延', 'latency'] },
    { id: 'sms', label: '短信', terms: ['短信', 'SMS'] },
    { id: 'base-station', label: '基站', terms: ['基站', '蜂窝基站', 'base station'] },
    { id: 'coverage', label: '无线覆盖', terms: ['无线覆盖', '手机信号覆盖', 'wireless coverage'] },
    { id: 'mobile-internet', label: '移动互联网', terms: ['移动互联网', '手机上网', 'mobile internet'] },
    { id: 'ai', label: '人工智能', terms: ['人工智能', 'AI', 'artificial intelligence'] },
    { id: 'digital-twin', label: '数字孪生', terms: ['数字孪生', 'digital twin'] },
    { id: 'low-latency', label: '低时延', terms: ['低时延', '低延迟', 'low latency'] }
  ]);
  const RECOMMENDED_QUESTIONS = Object.freeze([
    { era: '1G', question: '1G为什么容易受到覆盖限制？', query: '1G 覆盖', topic: 'coverage' },
    { era: '2G', question: '2G为什么可以发送短信？', query: '2G 短信', topic: 'sms' },
    { era: '3G', question: '3G与移动互联网有什么关系？', query: '3G 移动互联网', topic: 'mobile-internet' },
    { era: '4G', question: '4G为什么推动视频应用普及？', query: '4G 视频', topic: 'video' },
    { era: '5G', question: '5G的低时延意味着什么？', query: '5G 低时延', topic: 'low-latency' },
    { era: '6G', question: '6G研究中的通信感知融合是什么？', query: '6G 通信感知融合', topic: 'sensing' }
  ]);
  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  const viewState = { query: '', era: '', category: '', page: 1, pageSize: PAGE_SIZE, scrollY: 0, restoreScroll: false };
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
        kind: (era.eraId || era.id) === '6G' ? '未来研究展望' : '历史资料', category: '历史资料', summary: [era.background, era.exhibition?.mainProblem, era.exhibition?.historicalSignificance, era.summary?.historicalImpact].filter(Boolean).join(' '),
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
      id: `flow.${item.flowId}`, flowId: item.flowId, eraId: item.eraId, title: `${item.eraId} 技术流程与原理`, kind: '技术原理', category: '技术原理',
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
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function escapeRegex(value) { return String(value).replace(/[.*+?^$()|[\]\\{}]/g, '\\$&'); }
  function queryGroups(query) {
    let remainder = normalize(text.limit(query, MAX_QUERY_LENGTH));
    const groups = [];
    const aliases = SYNONYM_GROUPS.flatMap(group => group.terms.map(term => ({ group, term }))).sort((a, b) => b.term.length - a.term.length);
    for (const { group, term } of aliases) {
      const ascii = /^[a-z0-9 ]+$/i.test(term);
      const pattern = new RegExp((ascii ? '\\b' : '') + escapeRegex(normalize(term)) + (ascii ? '\\b' : ''), 'gi');
      pattern.lastIndex = 0;
      if (pattern.test(remainder)) {
        pattern.lastIndex = 0;
        remainder = remainder.replace(pattern, ' ');
        if (!groups.some(item => item.id === group.id)) groups.push({ id: group.id, label: group.label, queryTerm: term, variants: group.terms });
      }
    }
    remainder = remainder.replace(/为什么|为何|怎么样|怎么|如何|意味着|有什么|有哪些|是什么|请问|介绍一下|的|与|和|及|吗|呢|在|对|是/gi, ' ')
      .replace(/[？?！!，,。；;：:、（）()【】\[\]{}"“”'‘’]/g, ' ');
    for (const token of (remainder.match(/[a-z0-9]+|[\u3400-\u9fff]+/gi) || []).map(normalize).filter(Boolean)) {
      if (/^[\u3400-\u9fff]+$/u.test(token) && token.length > 2) {
        const chars = [...token], variants = [token];
        for (let size = Math.min(4, chars.length - 1); size >= 2; size--) {
          for (let i = 0; i <= chars.length - size; i++) variants.push(chars.slice(i, i + size).join(''));
        }
        groups.push({ id: 'text:' + token, label: token, queryTerm: token, variants: [...new Set(variants)] });
      } else groups.push({ id: 'text:' + token, label: token, queryTerm: token, variants: [token] });
    }
    return groups;
  }
  function containsTerm(haystack, needle) {
    const text = normalize(haystack), term = normalize(needle);
    if (!term) return false;
    if (/^[a-z0-9 ]+$/i.test(term)) return new RegExp('\\b' + escapeRegex(term).replace(/\s+/g, '\\s+') + '\\b', 'i').test(text);
    return text.includes(term);
  }
  function search(model, { query = '', era = '', category = '' } = {}) {
    const cleanQuery = text.limit(query, MAX_QUERY_LENGTH), groups = queryGroups(cleanQuery), fullQuery = normalize(cleanQuery);
    return records(model).map((item, index) => {
      if ((era && item.eraId !== era) || (category && category !== '全部分类' && item.category !== category)) return null;
      const title = normalize(item.title), summary = normalize(item.summary), all = normalize(item.title + ' ' + item.summary + ' ' + item.searchText);
      let score = fullQuery && title === fullQuery ? 1000 : fullQuery && title.includes(fullQuery) ? 500 : 0;
      const reasons = [], highlightTerms = [];
      for (const group of groups) {
        let match = group.variants.find(term => containsTerm(title, term)), location = 'title';
        if (!match) { match = group.variants.find(term => containsTerm(summary, term)); location = 'summary'; }
        if (!match) { match = group.variants.find(term => containsTerm(all, term)); location = 'body'; }
        if (!match) return null;
        const synonym = normalize(match) !== normalize(group.queryTerm);
        score += location === 'title' ? (synonym ? 34 : 55) : location === 'summary' ? (synonym ? 14 : 25) : (synonym ? 8 : 16);
        if (synonym && !group.id.startsWith('text:')) reasons.push('关联术语：“' + group.queryTerm + '”与资料中的“' + match + '”为同义表达');
        else if (location === 'title') reasons.push('标题匹配“' + match + '”');
        else reasons.push((location === 'summary' ? '摘要' : '正文') + '匹配“' + match + '”');
        highlightTerms.push(match);
      }
      if (groups.length && !reasons.length) reasons.push('关键词匹配');
      return { ...item, relevanceScore: score, matchReasons: [...new Set(reasons)], highlightTerms: [...new Set(highlightTerms)], _order: index };
    }).filter(Boolean).sort((a, b) => b.relevanceScore - a.relevanceScore || a._order - b._order).map(({ _order, ...item }) => item);
  }
  function highlightText(value, terms = []) {
    const text = String(value ?? ''), safeTerms = [...new Set(terms.map(String).filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!safeTerms.length) return escapeHtml(text);
    const pattern = new RegExp(safeTerms.map(escapeRegex).join('|'), 'gi');
    let output = '', cursor = 0;
    for (const match of text.matchAll(pattern)) {
      output += escapeHtml(text.slice(cursor, match.index)) + '<mark>' + escapeHtml(match[0]) + '</mark>';
      cursor = match.index + match[0].length;
    }
    return output + escapeHtml(text.slice(cursor));
  }
  function getRecommendations(query = '', model = root?.CommsArchiveContent) {
    if (!normalize(query)) return [...RECOMMENDED_QUESTIONS];
    const matchedEras = new Set(search(model, { query }).map(row => row.eraId).filter(Boolean));
    const groups = new Set(queryGroups(query).map(group => group.id));
    const related = RECOMMENDED_QUESTIONS.filter(item => matchedEras.has(item.era) || groups.has(item.topic));
    return related.length ? related : [...RECOMMENDED_QUESTIONS];
  }
  function recommendationMarkup(query = '') {
    return getRecommendations(query).map((item, index) => '<button type="button" class="knowledge-suggestion" onclick="CommsArchiveKnowledgeSearch.selectRecommendation(' + index + ')" aria-label="搜索推荐问题：' + escapeHtml(item.question) + '">' + escapeHtml(item.question) + '</button>').join('');
  }
  function renderResult(item) {
    const context = [
      item.technicalKeywords.length ? '<p><b>技术关键词：</b>' + item.technicalKeywords.map(escapeHtml).join(' · ') + '</p>' : '',
      item.relatedExhibits.length ? '<p><b>相关展品：</b>' + item.relatedExhibits.map(escapeHtml).join('、') + '</p>' : '',
      item.relatedArchives.length ? '<p><b>相关档案：</b>' + item.relatedArchives.map(escapeHtml).join('、') + '</p>' : '',
      item.relatedExperience ? '<p><b>时代体验：</b>' + escapeHtml(item.relatedExperience) + '</p>' : '',
      item.lanRecord ? '<p><b>澜的研究记录：</b>' + escapeHtml(Array.isArray(item.lanRecord) ? item.lanRecord.join(' ') : item.lanRecord) + '</p>' : ''
    ].filter(Boolean).join('');
    const reasons = item.matchReasons?.length ? '<p class="knowledge-match-reason"><b>匹配依据：</b>' + item.matchReasons.map(escapeHtml).join('；') + '</p>' : '';
    return '<article class="knowledge-result"><div class="knowledge-result-meta"><span class="status">' + escapeHtml(item.eraId) + '</span><span>' + escapeHtml(item.category) + '</span><span>' + escapeHtml(item.kind) + '</span></div><h3>' + highlightText(item.title, item.highlightTerms) + '</h3><p>' + highlightText(item.summary || '现有资料中未附加更长说明。', item.highlightTerms) + '</p>' + reasons + (context ? '<div class="knowledge-result-context">' + context + '</div>' : '') + '<button class="btn secondary" data-record-id="' + escapeHtml(item.id) + '" data-era-id="' + escapeHtml(item.eraId) + '" onclick="CommsArchiveKnowledgeSearch.openResultFromButton(this)">' + (item.exhibitId ? '查看展品详情' : item.kind === '技术原理' ? '查看技术原理' : '查看' + escapeHtml(item.eraId) + '时代资料') + ' →</button></article>';
  }
  function pageNumbers(total, current) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const values = [1];
    if (current > 3) values.push('…');
    for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page++) values.push(page);
    if (current < total - 2) values.push('…');
    values.push(total);
    return values;
  }
  function paginationMarkup(total, page) {
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) return '';
    return '<nav class="knowledge-pagination" aria-label="搜索结果分页"><button type="button" class="btn ghost" ' + (page <= 1 ? 'disabled' : '') + ' onclick="CommsArchiveKnowledgeSearch.setPage(' + (page - 1) + ')">上一页</button><div class="knowledge-page-list">' + pageNumbers(pages, page).map(value => value === '…' ? '<span aria-hidden="true">…</span>' : '<button type="button" class="quiet" ' + (value === page ? 'aria-current="page"' : '') + ' onclick="CommsArchiveKnowledgeSearch.setPage(' + value + ')" aria-label="第 ' + value + ' 页">' + value + '</button>').join('') + '</div><span class="knowledge-page-status">' + page + ' / ' + pages + '</span><button type="button" class="btn ghost" ' + (page >= pages ? 'disabled' : '') + ' onclick="CommsArchiveKnowledgeSearch.setPage(' + (page + 1) + ')">下一页</button></nav>';
  }
  function resultsMarkup(results, page = 1) {
    if (!results.length) return '<div class="empty card"><h3>没有找到相关通信记录</h3><p>试试“时延”“SMS”“基站”“手机上网”或“数字孪生”，也可以移除筛选条件。</p></div>';
    const start = (page - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE).map(renderResult).join('') + paginationMarkup(results.length, page);
  }
  function renderPage() {
    const eras = root?.CommsArchiveContent?.eras || [], results = search(root?.CommsArchiveContent, viewState);
    viewState.page = Math.min(viewState.page, Math.max(1, Math.ceil(results.length / PAGE_SIZE)));
    const selected = (id, value) => id === value ? ' selected' : '';
    const categories = CATEGORIES.map(item => '<option value="' + escapeHtml(item) + '"' + selected(item, viewState.category) + '>' + escapeHtml(item) + '</option>').join('');
    const eraOptions = eras.map(item => '<option value="' + escapeHtml(item.eraId || item.id) + '"' + selected(item.eraId || item.id, viewState.era) + '>' + escapeHtml(item.eraId || item.id) + ' · ' + escapeHtml(item.title) + '</option>').join('');
    const count = results.length + ' 条资料' + (viewState.query ? ' · 关键词“' + escapeHtml(viewState.query) + '”' : '');
    const markup = '<section class="page knowledge-search-page"><div class="eyebrow">LOCAL ARCHIVE SEARCH</div><h2>通信知识搜索</h2><p class="lead">搜索六代历史资料、展品和技术原理。内容来自现有通信简史资料库，可离线使用。</p><div class="card knowledge-search-panel"><form class="knowledge-search-form" onsubmit="CommsArchiveKnowledgeSearch.submitSearch(event)"><label for="knowledgeSearchInput">关键词</label><div class="knowledge-search-input-row"><input id="knowledgeSearchInput" type="search" value="' + escapeHtml(viewState.query) + '" placeholder="试试：短信、基站、LTE、数字孪生" autocomplete="off" oninput="if(!event.isComposing)CommsArchiveKnowledgeSearch.updateResults()" oncompositionend="CommsArchiveKnowledgeSearch.updateResults()"><button class="btn secondary" type="submit">搜索</button></div></form><div id="knowledgeSuggestions" class="knowledge-suggestions" aria-label="推荐问题">' + recommendationMarkup(viewState.query) + '</div><div class="knowledge-search-filters"><label>时代<select id="knowledgeEraFilter" onchange="CommsArchiveKnowledgeSearch.updateResults()"><option value="">全部时代</option>' + eraOptions + '</select></label><label>分类<select id="knowledgeCategoryFilter" onchange="CommsArchiveKnowledgeSearch.updateResults()">' + categories + '</select></label></div><p id="knowledgeSearchCount" class="muted" role="status">' + count + '</p><div id="knowledgeResults" class="knowledge-results">' + resultsMarkup(results, viewState.page) + '</div><p id="knowledgeSearchNotice" class="knowledge-search-notice" role="status"></p></div><section class="knowledge-challenge-entry"><div><span class="eyebrow">知识巩固</span><h3>知识挑战</h3><p class="muted">完成现有10题问答，查看得分、徽章与历史记录。</p></div><button class="btn secondary" onclick="go(\'quiz\')">进入知识挑战 →</button></section><div class="actions"><button class="btn ghost" onclick="go(\'ask\')">打开离线问答</button><button class="btn ghost" onclick="go(\'eras\')">前往时代航线</button></div></section>';
    if (viewState.restoreScroll) {
      const y = viewState.scrollY; viewState.restoreScroll = false;
      root?.setTimeout?.(() => root.scrollTo?.(0, y), 80);
    }
    return markup.replace('<div class="card knowledge-search-panel">', '<div class="actions knowledge-search-return"><button class="btn ghost" type="button" onclick="returnFromKnowledgeSearch()">← 返回搜索前页面</button></div><div class="card knowledge-search-panel">');
  }
  function updateResults({ focusResults = false } = {}) {
    const document = root?.document, input = document?.querySelector('#knowledgeSearchInput');
    const era = document?.querySelector('#knowledgeEraFilter')?.value || '';
    const category = document?.querySelector('#knowledgeCategoryFilter')?.value || '';
    if (input && input.value.length > MAX_QUERY_LENGTH) input.value = text.limit(input.value, MAX_QUERY_LENGTH);
    const query = input?.value || '';
    if (query !== viewState.query || era !== viewState.era || category !== viewState.category) viewState.page = 1;
    Object.assign(viewState, { query, era, category });
    const results = search(root?.CommsArchiveContent, viewState);
    viewState.page = Math.min(viewState.page, Math.max(1, Math.ceil(results.length / PAGE_SIZE)));
    const target = document?.querySelector('#knowledgeResults'), count = document?.querySelector('#knowledgeSearchCount');
    const notice = document?.querySelector('#knowledgeSearchNotice'), suggestions = document?.querySelector('#knowledgeSuggestions');
    if (count) count.textContent = results.length + ' 条资料' + (query.trim() ? ' · 关键词“' + query.trim() + '”' : '');
    if (notice) notice.textContent = results.length ? '' : '可以换用推荐问题中的术语，或清除时代与分类筛选。';
    if (target) target.innerHTML = resultsMarkup(results, viewState.page);
    if (suggestions) suggestions.innerHTML = recommendationMarkup(query);
    if (focusResults) target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    return results;
  }
  function submitSearch(event) { event?.preventDefault?.(); return updateResults({ focusResults: true }); }
  function selectRecommendation(index) {
    const item = getRecommendations(viewState.query)[index], input = root?.document?.querySelector('#knowledgeSearchInput');
    if (!item || !input) return false;
    input.value = item.query;
    const era = root?.document?.querySelector('#knowledgeEraFilter'), category = root?.document?.querySelector('#knowledgeCategoryFilter');
    if (era) era.value = '';
    if (category) category.value = '';
    Object.assign(viewState, { query: item.query, era: '', category: '', page: 1 });
    updateResults({ focusResults: true }); input.focus?.(); return true;
  }
  function setPage(page) {
    const requested = Number(page);
    if (!Number.isInteger(requested) || requested < 1) return false;
    const input = root?.document?.querySelector('#knowledgeSearchInput');
    viewState.query = input?.value || viewState.query;
    viewState.era = root?.document?.querySelector('#knowledgeEraFilter')?.value || '';
    viewState.category = root?.document?.querySelector('#knowledgeCategoryFilter')?.value || '';
    const totalPages = Math.ceil(search(root?.CommsArchiveContent, viewState).length / PAGE_SIZE);
    if (requested > totalPages || totalPages <= 1) return false;
    viewState.page = requested; updateResults();
    root?.document?.querySelector('#knowledgeResults')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    return true;
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
    if (!row || row.eraId !== eraId) {
      const notice = root?.document?.querySelector('#knowledgeSearchNotice');
      if (notice) notice.textContent = !row ? '未找到这条知识资料，请重新搜索。' : '资料与时代编号不匹配，请重新选择搜索结果。';
      return false;
    }
    if (row.kind === '技术原理') {
      const opened = typeof root.openTechnicalFlowFromSearch === 'function' && root.openTechnicalFlowFromSearch(eraId, row.flowId);
      if (!opened) {
        const notice = root?.document?.querySelector('#knowledgeSearchNotice');
        if (notice) notice.textContent = '无法打开对应技术原理资料，请检查时代与流程编号关联。';
      }
      return !!opened;
    }
    if (row.exhibitId && typeof root.showExhibitDetails === 'function') {
      root.showExhibitDetails(eraId, 'search', row.exhibitId);
      return true;
    }
    if (typeof root.modal !== 'function') {
      const notice = root?.document?.querySelector('#knowledgeSearchNotice');
      if (notice) notice.textContent = '资料已找到，但当前页面无法打开只读详情。请刷新页面后重试。';
      return false;
    }
    const details = [
      row.technicalKeywords?.length ? '<p><b>技术关键词：</b>' + row.technicalKeywords.map(escapeHtml).join(' · ') + '</p>' : '',
      row.relatedExhibits?.length ? '<p><b>相关展品：</b>' + row.relatedExhibits.map(escapeHtml).join('、') + '</p>' : '',
      row.relatedArchives?.length ? '<p><b>相关档案：</b>' + row.relatedArchives.map(escapeHtml).join('、') + '</p>' : '',
      row.relatedExperience ? '<p><b>时代体验：</b>' + escapeHtml(row.relatedExperience) + '</p>' : '',
      row.lanRecord ? '<p><b>澜的研究记录：</b>' + escapeHtml(Array.isArray(row.lanRecord) ? row.lanRecord.join(' ') : row.lanRecord) + '</p>' : ''
    ].filter(Boolean).join('');
    root.modal('<div class="eyebrow">LOCAL ARCHIVE SEARCH · ' + escapeHtml(eraId) + '</div><h2>' + escapeHtml(row.title) + '</h2><p class="muted">' + escapeHtml(row.category) + ' · ' + escapeHtml(row.kind) + '</p><p>' + escapeHtml(row.summary || '现有资料中未附加更长说明。') + '</p>' + details + '<p class="muted">此处为知识搜索中的只读资料，不会改变时代探索进度。</p><div class="exhibit-controls"><button class="btn secondary" onclick="closeModal()">关闭详情</button></div>');
    return true;
  }
  function openResultFromButton(button) {
    if (!button?.dataset) return false;
    return openResult(button.dataset.recordId, button.dataset.eraId);
  }
  return {
    CATEGORIES, PAGE_SIZE, SYNONYM_GROUPS, RECOMMENDED_QUESTIONS,
    records, search, queryGroups, highlightText, getRecommendations, renderPage,
    updateResults, submitSearch, selectRecommendation, setPage, openEra, openResult, openResultFromButton,
    get state() { return { ...viewState }; }
  };
});
