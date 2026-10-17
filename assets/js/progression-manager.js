/* 通信简史：渐进式探索与存档门控。纯前端、版本化、兼容既有 commsArchive 存档。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CommsArchiveProgress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ERAS = ['1G', '2G', '3G', '4G', '5G', '6G'];
  const NODES = [
    ['entry', '入口区'], ['scene', '历史现场区'], ['investigation', '建设调查区'],
    ['technology', '技术实验室'], ['archive', '时代档案出口']
  ];
  const EXPLORATION_KEYS = ['scene', 'investigation', 'technology'];
  const NODE_STATUS = ['LOCKED', 'AVAILABLE', 'ACTIVE', 'COMPLETED'];
  const EXHIBIT_STATUS = ['LOCKED', 'DISCOVERABLE', 'FOUND', 'ANALYZED', 'ARCHIVED'];
  const SIX_G_REQUIRED_EVIDENCE = ['evidence_6g_delay', 'evidence_6g_sensor', 'evidence_6g_ai', 'evidence_6g_twin'];
  const SIX_G_EVIDENCE_LABELS = { evidence_6g_delay: '通信链路检查', evidence_6g_sensor: '感知系统检查', evidence_6g_ai: 'AI模型检查', evidence_6g_twin: '数字孪生检查' };
  const stamp = () => new Date().toISOString();
  const nodeId = (era, key) => `${String(era).toLowerCase()}_${key}`;
  const blankEra = (era) => ({ eraId: era, nodes: NODES.map(([key]) => ({ eraId: era, nodeId: nodeId(era, key), key, status: 'LOCKED', unlockedTime: null, completedTime: null })) });

  function createProgression(state, options = {}) {
    const save = options.save || (() => true);
    const notify = options.onChange || (() => {});
    const isDemoMode = typeof options.isDemoMode === 'function' ? options.isDemoMode : () => options.isDemoMode === true;
    const exhibitsByEra = options.exhibitsByEra || {};
    const rawPrior = state.progression && typeof state.progression === 'object' ? state.progression : null;
    const prior = rawPrior?.version === 1 ? rawPrior : null;
    const incompatibleVersion = !!rawPrior && rawPrior.version !== 1;
    const progression = prior || {
      version: 1, travelerProfile: { id: 'local-traveler', name: '时空穿越者' }, currentEra: null, currentNode: null,
      eras: Object.fromEntries(ERAS.map((era) => [era, blankEra(era)])), dialogueProgress: { completedIds: [], activeId: null },
      exhibitProgress: {}, taskProgress: {}, evidence: [], lanMemory: { visitedEras: [], notes: [] }, settings: { reducedMotion: false },
      illegalProgressAttempts: [], repairLog: [], mode: 'guided'
    };
    state.progression = progression;
    progression.travelerProfile ||= { id: 'local-traveler', name: '时空穿越者' };
    if (!progression.eras || typeof progression.eras !== 'object' || Array.isArray(progression.eras)) progression.eras = {};
    for (const era of ERAS) {
      if (!progression.eras?.[era]) progression.eras[era] = blankEra(era);
      if (!Array.isArray(progression.eras[era].nodes)) progression.eras[era] = blankEra(era);
    }
    progression.version = 1;
    progression.mode = 'guided';
    progression.dialogueProgress ||= { completedIds: [], activeId: null };
    progression.dialogueProgress.completedIds = Array.isArray(progression.dialogueProgress.completedIds) ? progression.dialogueProgress.completedIds : [];
    if (progression.dialogueProgress.activeId && progression.dialogueProgress.completedIds.includes(progression.dialogueProgress.activeId)) progression.dialogueProgress.activeId = null;
    progression.exhibitProgress ||= {}; progression.taskProgress ||= {}; if (!Array.isArray(progression.evidence)) progression.evidence = [];
    for (const [era, task] of Object.entries(state.tasks || {})) if (!progression.taskProgress[era]) progression.taskProgress[era] = { ...task };
    if (Array.isArray(state.evidence)) progression.evidence = [...new Set([...progression.evidence, ...state.evidence.map((item) => typeof item === 'string' ? item : item?.evidenceId).filter(Boolean)])];
    if (!Array.isArray(progression.illegalProgressAttempts)) progression.illegalProgressAttempts = [];
    if (!Array.isArray(progression.repairLog)) progression.repairLog = [];
    progression.lanMemory ||= { visitedEras: [], notes: [] }; if (!Array.isArray(progression.lanMemory.visitedEras)) progression.lanMemory.visitedEras = []; if (!Array.isArray(progression.lanMemory.notes)) progression.lanMemory.notes = [];
    progression.settings ||= { reducedMotion: false };
    if (!progression.exhibitProgress || typeof progression.exhibitProgress !== 'object' || Array.isArray(progression.exhibitProgress)) progression.exhibitProgress = {};
    if (!progression.taskProgress || typeof progression.taskProgress !== 'object' || Array.isArray(progression.taskProgress)) progression.taskProgress = {};
    if (!progression.settings || typeof progression.settings !== 'object' || Array.isArray(progression.settings)) progression.settings = { reducedMotion: false };
    const requiredEvidenceByEra = options.requiredEvidenceByEra || {};
    const requiredEvidenceIds = (era) => {
      if (era === '6G') return [...SIX_G_REQUIRED_EVIDENCE];
      const configured = Array.isArray(requiredEvidenceByEra[era]) ? requiredEvidenceByEra[era] : [];
      return [...new Set(configured)];
    };
    const isEraArchived = (era) => (state.completed || []).includes(era) || (state.tasks?.[era]?.archiveCompleted === true && findNode(era, 'archive')?.status === 'COMPLETED');
    function getRequiredEvidenceStatus(era) {
      const required = requiredEvidenceIds(era);
      const stateIds = new Set((state.evidence || []).map((item) => {
        if (typeof item === 'string') return item;
        return item && (!item.eraId || item.eraId === era) ? item.evidenceId : null;
      }).filter(Boolean));
      const progressIds = new Set(progression.evidence || []);
      const collectedEvidence = required.filter((id) => stateIds.has(id) && progressIds.has(id));
      return { era, requiredEvidence: required, collectedEvidence, missingEvidence: required.filter((id) => !collectedEvidence.includes(id)), count: collectedEvidence.length };
    }
    function getInvestigationReadiness(era = progression.currentEra) {
      if (era !== '6G') return { ok: true, era, missingEvidence: [], taskComplete: true, reason: '' };
      const task = state.tasks?.[era] || {};
      const taskComplete = task.selected !== null && task.selected !== undefined && Number(task.step) >= 1;
      const evidence = getRequiredEvidenceStatus(era);
      if (isEraArchived(era) || isDemoMode()) return { ...evidence, ok: true, taskComplete, reason: '' };
      const labels = evidence.missingEvidence.map((id) => SIX_G_EVIDENCE_LABELS[id] || '研究检查');
      const reason = !taskComplete
        ? labels.length ? `请先完成原有建设调查任务，并补齐以下研究检查：${labels.join('、')}。` : '请先选择调查线索并整合调查结果。'
        : labels.length ? `还需完成：${labels.join('、')}。收齐四项研究证据后才能进入技术实验室。` : '';
      return { ...evidence, ok: taskComplete && evidence.missingEvidence.length === 0, taskComplete, reason };
    }
    function canEnterNode(era, idOrKey) {
      const key = NODES.some(([nodeKey]) => nodeKey === idOrKey) ? idOrKey : nodeKey(era, idOrKey);
      if (!key || !ERAS.includes(era)) return { ok: false, reason: '章节节点不存在。' };
      const eraAccess = canEnterEra(era);
      if (!eraAccess.ok) return eraAccess;
      const target = findNode(era, key);
      if (!target || !['AVAILABLE', 'ACTIVE', 'COMPLETED'].includes(target.status)) return { ok: false, reason: '该节点尚未解锁，请先完成前置环节。' };
      if (options.enforceNodeOrder === true && !isEraArchived(era) && !isDemoMode()) {
        const index = NODES.findIndex(([nodeKey]) => nodeKey === key);
        const missing = NODES.slice(0, index).filter(([nodeKey]) => findNode(era, nodeKey)?.status !== 'COMPLETED');
        if (missing.length) return { ok: false, reason: `请先完成${missing.map(([, title]) => title).join('、')}。` };
      }
      if (era === '6G' && key === 'technology' && !isEraArchived(era) && !isDemoMode()) {
        const readiness = getInvestigationReadiness(era);
        if (!readiness.ok) return { ok: false, reason: readiness.reason, ...readiness };
        if (findNode(era, 'investigation')?.status !== 'COMPLETED') return { ok: false, reason: '请先完成建设调查并收集全部四项研究证据。' };
      }
      return { ok: true, reason: '', node: target };
    }
    const migratedFromLife = {};
    let nodeLayoutMigrated = false;
    for (const era of ERAS) {
      const record = progression.eras[era];
      const existing = Array.isArray(record.nodes) ? record.nodes : [];
      const expectedKeys = NODES.map(([key]) => key);
      if (existing.length === expectedKeys.length && existing.every((node, index) => node?.key === expectedKeys[index] && node.nodeId === nodeId(era, expectedKeys[index]))) continue;
      const previousKey = existing.find((node) => node?.nodeId === progression.currentNode)?.key || existing.find((node) => node?.status === 'ACTIVE')?.key || null;
      const priorNodes = new Map(existing.map((node) => [node?.key, node]));
      record.nodes = blankEra(era).nodes.map((node) => {
        const old = priorNodes.get(node.key);
        return old ? { ...node, ...old, eraId: era, nodeId: nodeId(era, node.key) } : node;
      });
      if (previousKey === 'life') migratedFromLife[era] = true;
      if (!(state.completed || []).includes(era)) {
        const archive = record.nodes.find((node) => node.key === 'archive');
        if (archive?.status === 'COMPLETED') {
          archive.status = 'AVAILABLE';
          archive.completedTime = null;
        }
      }
      nodeLayoutMigrated = true;
    }
    if (nodeLayoutMigrated) {
      progression.chapterFlowVersion = 2;
      progression.repairLog.push({ time: stamp(), repairs: ['六节点章节进度已安全迁移到五节点流程；旧体验记录与日志保留'], preservedCompleted: [...(state.completed || [])] });
    }
    for (const [era, ids] of Object.entries(options.exhibitsByEra || {})) for (const exhibitId of ids || []) {
      if (!progression.exhibitProgress[exhibitId]) progression.exhibitProgress[exhibitId] = { exhibitId, eraId: era, status: 'LOCKED', foundTime: null, analysisStatus: null };
    }

    const findNode = (era, key) => progression.eras?.[era]?.nodes?.find((n) => n.nodeId === nodeId(era, key));
    const nodeKey = (era, id) => progression.eras?.[era]?.nodes?.find((n) => n.nodeId === id)?.key || null;
    const currentEra = () => progression.currentEra;
    const currentNode = () => progression.currentEra ? progression.eras?.[progression.currentEra]?.nodes?.find((n) => n.nodeId === progression.currentNode) || null : null;
    function persist() { state.progression = progression; const saved = save(); notify(progression); return saved !== false; }
    function unlockExploration(era) {
      const record = progression.eras[era];
      if (findNode(era, 'entry')?.status !== 'COMPLETED') return;
      for (const key of EXPLORATION_KEYS) {
        const node = findNode(era, key);
        if (node && node.status === 'LOCKED') { node.status = 'AVAILABLE'; node.unlockedTime ||= stamp(); }
      }
      for (const exhibitId of exhibitsByEra[era] || []) {
        const item = progression.exhibitProgress[exhibitId];
        if (item?.status === 'LOCKED') { item.status = 'DISCOVERABLE'; item.unlockedTime ||= stamp(); }
      }
      const archive = findNode(era, 'archive');
      if (archive && archive.status !== 'COMPLETED') {
        const ready = EXPLORATION_KEYS.every((key) => findNode(era, key)?.status === 'COMPLETED') && getArchiveReadiness(era).ok;
        if (ready && archive.status === 'LOCKED') { archive.status = 'AVAILABLE'; archive.unlockedTime ||= stamp(); }
        if (!ready && archive.status !== 'LOCKED') archive.status = 'LOCKED';
      }
      return record;
    }
    function getArchiveReadiness(era = progression.currentEra) {
      if (!ERAS.includes(era)) return { ok: false, era, missingNodes: [], missingEvidence: [], reason: '未知的通信时代。' };
      const missingNodes = EXPLORATION_KEYS.filter((key) => findNode(era, key)?.status !== 'COMPLETED');
      const availableEvidence = new Set([
        ...(state.evidence || []).map((item) => typeof item === 'string' ? item : item?.evidenceId),
        ...(progression.evidence || [])
      ].filter(Boolean));
      const required = requiredEvidenceIds(era);
      const requiredStatus = era === '6G' ? getRequiredEvidenceStatus(era) : null;
      const missingEvidence = requiredStatus ? requiredStatus.missingEvidence : required.filter((id) => !availableEvidence.has(id));
      const hasEraEvidence = (state.evidence || []).some((item) => item && typeof item === 'object' && item.eraId === era);
      const reason = missingNodes.length
        ? `请先完成${missingNodes.map((key) => NODES.find(([nodeKey]) => nodeKey === key)?.[1] || key).join('、')}。`
        : missingEvidence.length ? `还缺少必要研究证据：${missingEvidence.map((id) => SIX_G_EVIDENCE_LABELS[id] || id).join('、')}。`
          : !hasEraEvidence ? '请先完成建设调查并将本时代研究结果写入证据档案。' : '';
      const archived = isEraArchived(era);
      return { ok: archived || missingNodes.length === 0 && missingEvidence.length === 0 && hasEraEvidence, era, missingNodes, missingEvidence, requiredEvidence: [...required], hasEraEvidence, archived, reason: archived ? '' : reason };
    }
    function activateNextAvailable(era) {
      const record = progression.eras[era];
      const next = record.nodes.find((node) => node.status === 'AVAILABLE');
      if (next) { next.status = 'ACTIVE'; next.unlockedTime ||= stamp(); progression.currentNode = next.nodeId; }
      else progression.currentNode = record.nodes.find((node) => node.status === 'ACTIVE')?.nodeId || record.nodes.find((node) => node.key === 'archive')?.nodeId || nodeId(era, 'archive');
      return currentNode();
    }
    function log(action, blockedNode, reason) {
      progression.illegalProgressAttempts.push({ time: stamp(), userAction: String(action), blockedNode: String(blockedNode || ''), reason: String(reason) });
      progression.illegalProgressAttempts = progression.illegalProgressAttempts.slice(-100);
      persist(); return { ok: false, reason };
    }
    function canEnterEra(era) {
      if (!ERAS.includes(era)) return { ok: false, reason: '未知的通信时代。' };
      const i = ERAS.indexOf(era);
      if (i === 0 || (state.completed || []).includes(era)) return { ok: true, reason: '' };
      const missing = ERAS.slice(0, i).filter((priorEra) => !(state.completed || []).includes(priorEra));
      if (!missing.length) return { ok: true, reason: '' };
      return { ok: false, reason: `请先完成${missing[0]}时代调查并归档，再开启${era}。` };
    }
    function enterEra(era) {
      const access = canEnterEra(era);
      if (!access.ok) return log('enter-era', `${era}_entry`, access.reason);
      const record = progression.eras[era];
      if ((state.completed || []).includes(era)) record.nodes.forEach((n) => { n.status = 'COMPLETED'; n.completedTime ||= stamp(); });
      else if (record.nodes.every((n) => n.status === 'LOCKED')) record.nodes[0].status = 'AVAILABLE';
      if (!(state.completed || []).includes(era)) unlockExploration(era);
      progression.currentEra = era;
      let active = record.nodes.find((n) => n.status === 'ACTIVE' && canEnterNode(era, n.key).ok)
        || record.nodes.find((n) => n.status === 'AVAILABLE' && canEnterNode(era, n.key).ok)
        || [...record.nodes].reverse().find((n) => n.status === 'COMPLETED' && canEnterNode(era, n.key).ok)
        || record.nodes.find((n) => n.key === 'entry') || record.nodes[0];
      if (active && active.status !== 'COMPLETED' && active.status !== 'LOCKED') { active.status = 'ACTIVE'; active.unlockedTime ||= stamp(); }
      progression.currentNode = active?.nodeId || nodeId(era, 'archive');
      const entryDialogueId = `lan.${era.toLowerCase()}.chapter-entry`;
      progression.dialogueProgress.activeId = progression.dialogueProgress.completedIds.includes(entryDialogueId) ? null : entryDialogueId;
      if (!progression.lanMemory.visitedEras.includes(era)) progression.lanMemory.visitedEras.push(era);
      persist(); return { ok: true, node: currentNode() };
    }
    function requestNode(era, id) {
      const key = nodeKey(era, id);
      if (!key) return log('enter-node', id, '节点不存在。');
      const access = canEnterNode(era, key);
      if (!access.ok) return log('enter-node', id, access.reason);
      const target = findNode(era, key);
      if (!target || !['AVAILABLE', 'ACTIVE', 'COMPLETED'].includes(target.status)) return log('enter-node', id, '该节点尚未解锁，请完成前置对白、展品或任务。');
      for (const n of progression.eras[era].nodes) if (n.status === 'ACTIVE') n.status = 'AVAILABLE';
      if (target.status !== 'COMPLETED') target.status = 'ACTIVE';
      progression.currentEra = era; progression.currentNode = id; persist(); return { ok: true, node: target };
    }
    function finishNode(key, condition, options = {}) {
      const era = progression.currentEra, active = currentNode();
      if (!era || !active || active.key !== key || active.status !== 'ACTIVE') return log('complete-node', active?.nodeId || key, '当前活动节点与请求不匹配。');
      if (!condition) return log('complete-node', active.nodeId, `完成前置条件未满足：${key}。`);
      if (era === '6G' && key === 'investigation' && !getInvestigationReadiness(era).ok) return log('complete-investigation', active.nodeId, getInvestigationReadiness(era).reason);
      if (key === 'archive' && !EXPLORATION_KEYS.every((required) => findNode(era, required)?.status === 'COMPLETED')) return log('complete-archive', active.nodeId, '请先完成历史现场、建设调查与技术实验室。');
      active.status = 'COMPLETED'; active.completedTime = stamp();
      if (key === 'entry') unlockExploration(era);
      if (EXPLORATION_KEYS.includes(key)) unlockExploration(era);
      // Some educational nodes need an explicit user decision before navigation.
      // Mark the next node available, but keep the completed node as the current view.
      const next = options.holdCurrent ? (() => {
        unlockExploration(era);
        return findNode(era, 'archive') || null;
      })() : activateNextAvailable(era);
      const saved = persist(); return { ok: true, next, saved };
    }
    function completeDialogue(id, options = {}) {
      if (!id || id !== progression.dialogueProgress.activeId) return { ok: false, reason: '这不是当前需要完成的引导对白。' };
      if (!progression.dialogueProgress.completedIds.includes(id)) progression.dialogueProgress.completedIds.push(id);
      const result = finishNode('entry', true, { holdCurrent: options.holdCurrent === true }); if (!result.ok) return result;
      progression.dialogueProgress.activeId = null; persist(); return result;
    }
    function markDiscoverable(exhibitId, era = progression.currentEra) {
      if (!exhibitId || !ERAS.includes(era)) return { ok: false, reason: '展品资料缺少有效编号。' };
      if (era !== progression.currentEra || findNode(era, 'entry')?.status !== 'COMPLETED') return log('reveal-exhibit', exhibitId, '请先完成时代入口引导，再查看本时代展品。');
      const item = progression.exhibitProgress[exhibitId] || { exhibitId, eraId: era, status: 'LOCKED', foundTime: null, analysisStatus: null };
      if (item.status === 'LOCKED') item.status = 'DISCOVERABLE';
      progression.exhibitProgress[exhibitId] = item; persist(); return { ok: true, exhibit: item };
    }
    function discoverExhibit(exhibitId, era = progression.currentEra) {
      if (era !== progression.currentEra || findNode(era, 'entry')?.status !== 'COMPLETED') return log('open-exhibit', exhibitId, '请先完成时代入口引导，再查看本时代展品。');
      const item = progression.exhibitProgress[exhibitId] || { exhibitId, eraId: era, status: 'DISCOVERABLE', foundTime: null, analysisStatus: null };
      if (item.eraId !== era || !['DISCOVERABLE', 'FOUND', 'ANALYZED', 'ARCHIVED'].includes(item.status)) return log('open-exhibit', exhibitId, '展品状态无效，暂时无法打开。');
      progression.exhibitProgress[exhibitId] = item;
      if (item.status === 'DISCOVERABLE') { item.status = 'FOUND'; item.foundTime = stamp(); persist(); }
      return { ok: true, exhibit: item };
    }
    function analyzeExhibits(era = progression.currentEra) {
      const found = Object.values(progression.exhibitProgress).filter((x) => x.eraId === era && ['FOUND', 'ANALYZED'].includes(x.status));
      if (!found.length) return log('analyze-exhibit', `${era}_technology`, '尚未发现可分析展品。');
      found.forEach((x) => { x.status = 'ANALYZED'; x.analysisStatus = 'completed'; }); persist(); return { ok: true, count: found.length };
    }
    function completeInvestigation(options = {}) {
      const task = state.tasks?.[progression.currentEra] || {};
      const era = progression.currentEra;
      const holdCurrent = options.holdCurrent === true;
      if (era === '6G' && !getInvestigationReadiness(era).ok) return log('complete-investigation', `${era}_investigation`, getInvestigationReadiness(era).reason);
      const result = finishNode('investigation', task.selected !== null && task.selected !== undefined && Number(task.step) >= 1, { holdCurrent });
      if (!result.ok) return result;

      // The investigation UI promises to continue into the technical lab.
      // Keep that handoff explicit even when the historical scene is still
      // available, so the generic next-node ordering cannot send the user back.
      if (holdCurrent) return result;
      const technology = findNode(era, 'technology');
      if (technology && technology.status !== 'LOCKED') {
        const opened = requestNode(era, technology.nodeId);
        if (opened.ok) return { ...result, next: opened.node };
      }
      return result;
    }
    function completeScene(options = {}) {
      const era = progression.currentEra;
      const found = Object.values(progression.exhibitProgress).some((x) => x.eraId === era && ['FOUND', 'ANALYZED', 'ARCHIVED'].includes(x.status));
      const result = finishNode('scene', found, { holdCurrent: options.holdCurrent === true });
      if (result.ok) { for (const x of Object.values(progression.exhibitProgress)) if (x.eraId === era && x.status === 'LOCKED') x.status = 'DISCOVERABLE'; persist(); }
      return result;
    }
    function completeTechnology(options = {}) {
      const era = progression.currentEra, task = state.tasks?.[era] || {}, technology = findNode(era, 'technology');
      if (era === '6G' && !canEnterNode(era, 'technology').ok) return log('complete-technology', `${era}_technology`, canEnterNode(era, 'technology').reason);
      if (era !== '6G' && !task.understandingCompleted) return log('complete-technology', `${era}_technology`, '技术理解任务尚未完成。');
      if (technology?.status === 'COMPLETED') {
        progression.taskProgress[era] = { ...(progression.taskProgress[era] || {}), ...task, technologyCompleted: true, technologyCompletedAt: technology.completedTime };
        return { ok: true, node: technology, alreadyCompleted: true, saved: persist() };
      }
      const result = finishNode('technology', true, { holdCurrent: options.holdCurrent === true });
      if (result.ok) {
        const completedNode = findNode(era, 'technology');
        progression.taskProgress[era] = { ...(progression.taskProgress[era] || {}), ...task, technologyCompleted: true, technologyCompletedAt: completedNode?.completedTime || stamp() };
        if (Object.values(progression.exhibitProgress).some((item) => item.eraId === era && ['FOUND', 'ANALYZED'].includes(item.status))) analyzeExhibits();
        result.saved = persist() && result.saved !== false;
      }
      return result;
    }
    function reconcileCompletedTechnology(era) {
      if (!ERAS.includes(era) || !state.tasks?.[era]?.understandingCompleted) return { ok: false, reason: '技术理解任务尚未完成。' };
      const lab = findNode(era, 'technology');
      if (!lab || lab.status === 'LOCKED') return { ok: false, reason: '技术实验室尚未开放。' };
      if (era === '6G' && !isEraArchived(era) && !isDemoMode() && !getInvestigationReadiness(era).ok) return { ok: false, reason: getInvestigationReadiness(era).reason };
      const task = state.tasks[era], alreadyCompleted = lab.status === 'COMPLETED';
      if (alreadyCompleted) lab.completedTime ||= stamp();
      if (!alreadyCompleted) {
        const wasCurrent = progression.currentEra === era && progression.currentNode === lab.nodeId;
        lab.status = 'COMPLETED'; lab.completedTime ||= stamp();
        unlockExploration(era);
        if (wasCurrent) activateNextAvailable(era);
      }
      const completedAt = lab.completedTime || stamp(), priorTaskProgress = progression.taskProgress[era] || {};
      const needsSync = !alreadyCompleted || priorTaskProgress.technologyCompleted !== true || priorTaskProgress.technologyCompletedAt !== completedAt;
      if (needsSync) progression.taskProgress[era] = { ...priorTaskProgress, ...task, technologyCompleted: true, technologyCompletedAt: completedAt };
      const saved = needsSync ? persist() : true;
      return { ok: true, node: lab, alreadyCompleted, reconciled: !alreadyCompleted, saved };
    }
    function syncTaskProgress(era, task = state.tasks?.[era] || {}) {
      if (!ERAS.includes(era) || !task || typeof task !== 'object') return { ok: false, reason: '任务进度数据无效。' };
      progression.taskProgress[era] = { ...task }; persist(); return { ok: true };
    }
    function recordExperience(record = null) {
      const era = progression.currentEra;
      if (record && typeof record === 'object' && record.id && record.era === era) {
        state.logs ||= [];
        if (!state.logs.some((item) => item.id === record.id)) state.logs.push({ ...record });
        persist();
      }
      return { ok: false, deprecated: true, reason: '正式章节已取消独立体验节点；既有体验记录仍保留在时空日志中。' };
    }
    function completeArchive() {
      const era = progression.currentEra;
      const readiness = getArchiveReadiness(era);
      if (!readiness.ok) return log('complete-archive', `${era}_archive`, readiness.reason);
      if (!readiness.hasEraEvidence) return log('complete-archive', `${era}_archive`, '请先将本时代调查结果写入证据档案。');
      const result = finishNode('archive', true);
      if (result.ok) {
        progression.eras[progression.currentEra].nodes.forEach((n) => { n.status = 'COMPLETED'; n.completedTime ||= stamp(); });
        Object.values(progression.exhibitProgress).filter((x) => x.eraId === progression.currentEra && ['FOUND', 'ANALYZED'].includes(x.status)).forEach((x) => x.status = 'ARCHIVED');
        const i = ERAS.indexOf(progression.currentEra), nextEra = ERAS[i + 1];
        if (nextEra) progression.eras[nextEra].nodes[0].status = 'AVAILABLE';
        progression.evidence = (state.evidence || []).map((e) => typeof e === 'string' ? e : e?.evidenceId).filter(Boolean);
        persist();
      }
      return result;
    }
    function requestExhibit(exhibitId, era) { return discoverExhibit(exhibitId, era); }
    function validateAndRepair() {
      const repairs = [];
      for (const era of ERAS) {
        const record = progression.eras[era];
        if (!Array.isArray(record.nodes) || record.nodes.length !== NODES.length) { progression.eras[era] = blankEra(era); repairs.push(`${era}节点结构已重建`); continue; }
        for (let i = 0; i < record.nodes.length; i++) {
          const n = record.nodes[i];
          if (!NODE_STATUS.includes(n.status) || n.nodeId !== nodeId(era, NODES[i][0])) { record.nodes[i] = blankEra(era).nodes[i]; repairs.push(`${era}第${i + 1}节点状态已修复`); }
        }
      }
      for (const [id, x] of Object.entries(progression.exhibitProgress)) if (!EXHIBIT_STATUS.includes(x.status)) { x.status = 'LOCKED'; repairs.push(`展品 ${id} 状态已回退`); }
      for (const era of ERAS) {
        if ((state.completed || []).includes(era)) continue; // 已完成的旧档案按用户既有记录保留。
        const rec = progression.eras[era], task = state.tasks?.[era] || {}, dialogueId = `lan.${era.toLowerCase()}.chapter-entry`;
        const checks = {
          entry: progression.dialogueProgress.completedIds.includes(dialogueId) || progression.legacyImportedEras?.includes(era),
          scene: Object.values(progression.exhibitProgress).some((x) => x.eraId === era && ['FOUND', 'ANALYZED', 'ARCHIVED'].includes(x.status)),
          investigation: task.selected !== null && task.selected !== undefined && Number(task.step) >= 1
            && (era !== '6G' || getInvestigationReadiness(era).ok),
          technology: era === '6G' || !!task.understandingCompleted,
          archive: !!task.archiveCompleted || (state.completed || []).includes(era)
        };
        const legacyImported = progression.legacyImportedEras?.includes(era);
        if (!legacyImported || era === '6G') for (let i = 0; i < NODES.length; i++) {
          const key = NODES[i][0], node = rec.nodes[i];
          if (!checks[key] && node?.status === 'COMPLETED') { node.status = key === 'entry' ? 'AVAILABLE' : 'LOCKED'; node.completedTime = null; repairs.push(`${era}${NODES[i][1]}完成状态与调查记录不符，已回退`); }
        }
        if (rec.nodes[0].status === 'COMPLETED') {
          for (const key of EXPLORATION_KEYS) if (findNode(era, key)?.status === 'LOCKED') findNode(era, key).status = 'AVAILABLE';
        } else {
          rec.nodes.slice(1).forEach((node) => { node.status = 'LOCKED'; node.completedTime = null; });
        }
        unlockExploration(era);
        const archive = findNode(era, 'archive');
        if (archive.status !== 'COMPLETED') archive.status = getArchiveReadiness(era).ok ? (archive.status === 'ACTIVE' ? 'ACTIVE' : 'AVAILABLE') : 'LOCKED';
      }
      const nextSequential = ERAS.find((era, i) => !(state.completed || []).includes(era) && (i === 0 || (state.completed || []).includes(ERAS[i - 1]))) || null;
      const pointedEra = progression.currentEra, pointedNode = pointedEra && progression.eras[pointedEra]?.nodes?.find((n) => n.nodeId === progression.currentNode);
      const pointerLegal = ERAS.includes(pointedEra) && pointedNode && canEnterNode(pointedEra, pointedNode.key).ok;
      if (!pointerLegal || (nextSequential && pointedEra && ERAS.indexOf(pointedEra) > ERAS.indexOf(nextSequential))) {
        progression.currentEra = nextSequential || ERAS.find((e) => !(state.completed || []).includes(e)) || '1G';
        const rec = progression.eras[progression.currentEra];
        let target = rec.nodes.find((n) => n.status === 'ACTIVE' && canEnterNode(progression.currentEra, n.key).ok)
          || rec.nodes.find((n) => n.status === 'AVAILABLE' && canEnterNode(progression.currentEra, n.key).ok)
          || [...rec.nodes].reverse().find((n) => n.status === 'COMPLETED' && canEnterNode(progression.currentEra, n.key).ok)
          || rec.nodes.find((n) => n.key === 'entry') || rec.nodes[0];
        if (!target) { rec.nodes[0].status = 'AVAILABLE'; target = rec.nodes[0]; }
        if (target.status === 'LOCKED') target.status = 'AVAILABLE'; if (target.status !== 'COMPLETED') target.status = 'ACTIVE'; progression.currentNode = target.nodeId;
        repairs.push('非法位置已恢复到最近可继续的时代与节点；已完成档案仍保留');
      }
      for (const era of Object.keys(migratedFromLife)) {
        const rec = progression.eras[era], archive = findNode(era, 'archive'), technology = findNode(era, 'technology');
        if (!rec || progression.currentEra !== era) continue;
        const sixGBlocked = era === '6G' && !isEraArchived(era) && !isDemoMode() && !getInvestigationReadiness(era).ok;
        const target = sixGBlocked ? findNode(era, 'investigation') : technology?.status === 'COMPLETED' && archive?.status !== 'LOCKED' ? archive : technology;
        rec.nodes.forEach((node) => { if (node.status === 'ACTIVE') node.status = 'AVAILABLE'; });
        if (target) { if (target.status !== 'COMPLETED') target.status = 'ACTIVE'; progression.currentNode = target.nodeId; }
        repairs.push(`${era}旧体验节点位置已恢复到${target?.key === 'archive' ? '时代档案出口' : '技术实验室'}`);
      }
      if (repairs.length || nodeLayoutMigrated) { if (!nodeLayoutMigrated) progression.repairLog.push({ time: stamp(), repairs, preservedCompleted: [...(state.completed || [])] }); persist(); }
      return { ok: repairs.length === 0, repairs, currentEra: progression.currentEra, currentNode: progression.currentNode };
    }
    function migration() {
      if (prior) return;
      if (incompatibleVersion) progression.repairLog.push({ time: stamp(), repairs: [`进度子系统版本 ${String(rawPrior.version)} 不受支持，已迁移旧时代完成记录与现有任务、证据数据。`], preservedCompleted: [...(state.completed || [])] });
      // 旧存档只补充新字段；已完成时代原样保留并映射为完成节点。
      for (const era of state.completed || []) if (progression.eras[era]) {
        progression.eras[era].nodes.forEach((n) => { n.status = 'COMPLETED'; n.completedTime = null; });
        for (const x of Object.values(progression.exhibitProgress)) if (x.eraId === era) x.status = 'ARCHIVED';
      }
      progression.legacyImportedEras ||= [];
      for (const era of state.visited || []) if (progression.eras[era] && !(state.completed || []).includes(era)) {
        progression.legacyImportedEras.push(era);
        const rec = progression.eras[era]; rec.nodes[0].status = 'COMPLETED'; rec.nodes[1].status = 'COMPLETED'; rec.nodes[2].status = 'ACTIVE';
        for (const legacyExhibit of Object.values(progression.exhibitProgress)) if (legacyExhibit.eraId === era) legacyExhibit.status = state.tasks?.[era]?.understandingCompleted ? 'ANALYZED' : 'FOUND';
        if (state.tasks?.[era]?.understandingCompleted) { rec.nodes[2].status = 'COMPLETED'; rec.nodes[3].status = 'ACTIVE'; }
        const id = `lan.${era.toLowerCase()}.chapter-entry`; progression.dialogueProgress.completedIds.push(id);
      }
      const firstPending = ERAS.find((e) => !(state.completed || []).includes(e));
      if (firstPending) {
        const prev = ERAS[ERAS.indexOf(firstPending) - 1];
        if (!prev || (state.completed || []).includes(prev) || (state.visited || []).includes(firstPending)) {
          const rec = progression.eras[firstPending], target = rec.nodes.find((n) => n.status === 'ACTIVE') || rec.nodes.find((n) => n.status === 'AVAILABLE') || rec.nodes[0];
          if (target.status === 'LOCKED') target.status = 'AVAILABLE';
          progression.currentEra = firstPending; progression.currentNode = target.nodeId;
        }
      }
    }
    migration();
    const repair = validateAndRepair();
    for (const era of ERAS) {
      if (!state.tasks?.[era]?.understandingCompleted) continue;
      const synced = reconcileCompletedTechnology(era);
      if (synced.ok && synced.reconciled) repair.repairs.push(`${era}已完成的技术理解与实验室节点状态已同步`);
    }
    repair.ok = repair.repairs.length === 0;
    const manager = {
      version: 1, eras: ERAS, nodes: NODES.map(([key, title]) => ({ key, title })), status: { node: NODE_STATUS, exhibit: EXHIBIT_STATUS },
      state: progression, currentEra, currentNode, canEnterEra, canEnterNode, getRequiredEvidenceStatus, getInvestigationReadiness, enterEra, requestNode, completeDialogue,
      markDiscoverable, discoverExhibit, requestExhibit, analyzeExhibits, completeScene, completeInvestigation, completeTechnology,
      reconcileCompletedTechnology, syncTaskProgress, recordExperience, completeArchive, getArchiveReadiness, validateAndRepair, repair,
      get guidedActive() { return progression.mode === 'guided'; },
      get protectsCurrentDialogue() { return progression.mode === 'guided' && !!progression.dialogueProgress.activeId && !progression.dialogueProgress.completedIds.includes(progression.dialogueProgress.activeId); }
    };
    manager.NodeProgressManager = {
      currentEra, currentNode,
      getEraNodes(era) { return progression.eras?.[era]?.nodes?.map((node) => ({ ...node })) || []; },
      enterEra, requestNode, completeScene, completeInvestigation, completeTechnology, recordExperience, completeArchive
    };
    manager.DialogueUnlockManager = {
      completeDialogue,
      isComplete(id) { return progression.dialogueProgress.completedIds.includes(id); },
      get activeDialogueId() { return progression.dialogueProgress.activeId; },
      get isProtected() { return manager.protectsCurrentDialogue; }
    };
    manager.ExhibitUnlockManager = {
      markDiscoverable, discover: discoverExhibit, analyze: analyzeExhibits,
      getStatus(id) { return progression.exhibitProgress[id]?.status || 'LOCKED'; },
      getRecord(id) { return progression.exhibitProgress[id] ? { ...progression.exhibitProgress[id] } : null; }
    };
    manager.ProgressValidator = { canEnterEra, canEnterNode, requestNode, logIllegalAttempt: log };
    manager.ArchiveManager = { validateAndRepair, repair, get state() { return progression; }, get evidence() { return (state.evidence || []).slice(); } };
    return manager;
  }
  return { ERAS, NODES, nodeId, createProgression };
});
