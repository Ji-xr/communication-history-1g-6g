/* 《通信简史》比赛演示路线：复用现有页面与任务，演示准备数据只进入 demoArchive。 */
(function (root) {
  'use strict';

  const ERA_IDS = ['1G', '2G', '3G', '4G', '5G', '6G'];
  const originalEnterEra = root.enterEra;
  let pendingRouteIds = [];
  function active() { return root.DemoManager?.isActive?.() === true; }
  function say(message) { root.DemoGuide?.setMessage(message); }
  function addCompletedThrough(era) {
    const ids = ['1G', '2G', '3G', '4G', '5G', '6G'];
    const end = ids.indexOf(era);
    ids.slice(0, Math.max(0, end)).forEach(id => { if (!state.completed.includes(id)) state.completed.push(id); });
  }
  function prepareEraNode(era, key) {
    const record = progression.state.eras[era];
    if (!record) return false;
    const nodeIndex = record.nodes.findIndex(node => node.key === key);
    if (nodeIndex < 0) return false;
    record.nodes.forEach((node, index) => {
      node.status = index < nodeIndex ? 'COMPLETED' : index === nodeIndex ? 'ACTIVE' : 'LOCKED';
      if (index < nodeIndex) node.completedTime ||= new Date().toISOString();
    });
    progression.state.currentEra = era;
    progression.state.currentNode = record.nodes[nodeIndex].nodeId;
    const entryDialogueId=`lan.${era.toLowerCase()}.chapter-entry`;
    progression.state.dialogueProgress.completedIds ||= [];
    progression.state.dialogueProgress.activeId = nodeIndex === 0 ? entryDialogueId : null;
    if (nodeIndex > 0 && !progression.state.dialogueProgress.completedIds.includes(entryDialogueId)) progression.state.dialogueProgress.completedIds.push(entryDialogueId);
    if (key === 'investigation' || key === 'technology' || key === 'archive') {
      const first = hallDeepening[era]?.exhibits?.[0];
      if (first && progression.state.exhibitProgress[first.id]) progression.state.exhibitProgress[first.id].status = 'FOUND';
    }
    if (key === 'scene') {
      const first = hallDeepening[era]?.exhibits?.[0];
      if (first && progression.state.exhibitProgress[first.id]) progression.state.exhibitProgress[first.id].status = 'DISCOVERABLE';
    }
    progression.persist?.();
    save();
    if (key === 'technology') root.ensureEraInvestigationEvidence?.(era);
    return true;
  }
  function enterDemoEra(era, key) {
    const index = eras.findIndex(item => item.id === era);
    if (index < 0) return false;
    addCompletedThrough(era);
    rebindProgression();
    if (!originalEnterEra(index)) return false;
    eraIndex = index;
    prepareEraNode(era, key);
    const demo = root.DemoManager.state;
    const routePosition = (demo.routeIds || []).indexOf(era);
    if (routePosition >= 0) root.DemoManager.setRoute(demo.routeMode, demo.routeIds, routePosition);
    render();
    return true;
  }
  function finishOneGInvestigation() {
    if (selected === null || taskStep < 1) {
      say('先在1G调查卡中选择一条线索，再点击“整合线索，揭晓调查结果”。');
      return false;
    }
    prepareEraNode('1G', 'archive');
    state.tasks['1G'] = { ...(state.tasks['1G'] || {}), understandingCompleted: true, step: 1, selected, completed: true };
    save();
    root.completeEra();
    if (!state.completed.includes('1G')) { say('完成调查整合后，这里会生成1G结果证据卡。'); return false; }
    root.DemoManager.setStep('fourg');
    say('1G调查档案已封存。下一步进入4G技术实验室。');
    return true;
  }
  function enterFourGTechnology() {
    state.tasks['4G'] = { ...(state.tasks['4G'] || {}), understandingCompleted: false, technologyLabCompleted: false, step: 1, selected: 0, completed: true };
    state.clues['4G'] = [0];
    return enterDemoEra('4G', 'technology');
  }
  function enterFiveGScene() {
    if (!state.completed.includes('4G')) state.completed.push('4G');
    state.tasks['4G'] = { ...(state.tasks['4G'] || {}), archiveCompleted: true };
    return enterDemoEra('5G', 'scene');
  }
  function buildSixGArchive() {
    addCompletedThrough('6G');
    if (!state.completed.includes('5G')) state.completed.push('5G');
    state.tasks['6G'] = { ...(state.tasks['6G'] || {}), understandingCompleted: true, designSubmitted: true, completed: true, selected: 0, step: 1 };
    state.clues['6G'] = [0, 's0', 's1', 's2', 's3'];
    state.visited = [...new Set([...state.visited, '6G'])];
    if (!state.order.includes('6G')) state.order.push('6G');
    eraIndex = 5;
    rebindProgression();
    prepareEraNode('6G', 'archive');
    progression.state.dialogueProgress.activeId = null;
    root.CommsArchiveLan?.onTaskComplete('6G', { era: '6G', demo: true });
    (root.EraArchive6G?.evidenceIds || []).forEach(id => {
      root.CommsArchiveLan?.collectBuilderEvidence6G(id);
      root.collect6GEvidenceCard(id);
    });
    root.ensureEraInvestigationEvidence?.('6G');
    route = 'chapter';
    save();
    render();
    root.DemoManager.setStep('sixg');
    say('6G研究证据已准备。请阅读时代档案出口，确认研究发现后主动封存。相关方向仍处于研究发展阶段。');
    return true;
  }

  function startDemoMode(mode = 'recommended', routeIds = []) {
    closeDemoRoutePicker();
    if (typeof galleryActive !== 'undefined' && galleryActive) root.close3DGallery?.(false);
    const clean = typeof defaultState === 'function' ? defaultState() : { visited: [], completed: [], clues: {}, logs: [], order: [], tasks: {}, evidence: [] };
    clean.reviewGuideActive = false; clean.reviewGuideDismissed = true;
    const isRecommended = mode === 'recommended';
    root.DemoManager.start(clean, isRecommended ? 'prologue' : 'eras', { routeMode: isRecommended ? 'recommended' : mode, routeIds });
    state = clean; route = isRecommended ? 'prologue' : 'eras'; eraIndex = 0; taskStep = 0; selected = null; secondSelected = null; understandingSelected = null; designResponse = '';
    reviewGuideActive = false; reviewGuideStage = 0;
    rebindProgression(); root.CommsArchiveLan?.reloadStorageContext?.(); root.AudioSystem?.reloadSettings?.();
    try { quizSession = quizStore?.loadSession?.() || null; } catch (_) { quizSession = null; quizStorageOk = false; }
    render(); root.DemoGuide.start(); if (isRecommended) root.CommsArchiveLan?.openPrologue();
    else root.DemoGuide.setMessage(mode === 'random' ? '随机短路线已准备好。可点击下方路线时代直接进入，也可在时代航线中改选任意一代。' : '演示模式已开放1G—6G所有时代入口，可直接选择任意展厅。');
    return true;
  }
  function shuffledRoute() { const ids = ERA_IDS.slice(); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } return ids.slice(0, 3); }
  function renderRoutePicker() {
    const host = root.document?.querySelector('#demoRoutePicker'); if (!host) return;
    const routeRows = ERA_IDS.map(id => `<label class="demo-route-choice"><input type="checkbox" value="${id}" ${pendingRouteIds.includes(id) ? 'checked' : ''} onchange="DemoAppActions.toggleRouteEra('${id}',this.checked)"><span><b>${id}</b><small>${escapeHtml(eras.find(item => item.id === id)?.title || '')}</small></span></label>`).join('');
    host.innerHTML = `<div class="demo-route-backdrop" onclick="if(event.target===this)closeDemoRoutePicker()"><section class="demo-route-modal" role="dialog" aria-modal="true" aria-labelledby="demoRouteTitle"><button class="close demo-route-close" onclick="closeDemoRoutePicker()" aria-label="关闭">×</button><div class="eyebrow">DEMO ROUTE SELECTOR</div><h2 id="demoRouteTitle">选择比赛展示路线</h2><p>推荐路线适合3—5分钟完整演示；自由选择可直接进入任意时代；随机路线提供三站短路线，并可手动调整。</p><div class="demo-route-mode-grid"><button class="btn" onclick="startDemoMode('recommended')">推荐路线<span>序章 → 1G → 4G → 5G → 6G → 最终档案</span></button><button class="btn secondary" onclick="startFreeDemo()">自由选择时代<span>打开时代航线，现场任选1G—6G</span></button></div><div class="demo-route-editor"><div class="section-head"><div><h3>随机展示路线</h3><p class="muted">当前选择 ${pendingRouteIds.length} 个时代，可勾选或重新随机。</p></div><button class="btn ghost" onclick="DemoAppActions.randomizeRoute()">重新随机 ⟳</button></div><div class="demo-route-choices">${routeRows}</div><button class="btn gold" onclick="DemoAppActions.startSelectedRoute()" ${pendingRouteIds.length ? '' : 'disabled'}>开始这条短路线 →</button></div></section></div>`;
  }
  function openDemoRoutePicker() { if (!pendingRouteIds.length) pendingRouteIds = active() && root.DemoManager.state.routeIds?.length ? [...root.DemoManager.state.routeIds] : shuffledRoute(); let host = root.document.querySelector('#demoRoutePicker'); if (!host) { host = root.document.createElement('div'); host.id = 'demoRoutePicker'; root.document.body.append(host); } renderRoutePicker(); }
  function closeDemoRoutePicker() { root.document?.querySelector?.('#demoRoutePicker')?.remove?.(); }
  function startFreeDemo() { closeDemoRoutePicker(); if (active()) { root.DemoManager.setRoute('free', []); if (root.DemoManager.state.currentStep !== 'free') root.DemoManager.setStep('free'); route = 'eras'; render(); root.DemoGuide.setMessage('自由展示路线已启用。1G—6G入口均可直接进入。'); return true; } return startDemoMode('free'); }
  function startSelectedRoute() { const ids = pendingRouteIds.filter(id => ERA_IDS.includes(id)); if (!ids.length) { say('至少选择一个时代，才能开始展示路线。'); renderRoutePicker(); return false; } closeDemoRoutePicker(); if (active()) { root.DemoManager.setRoute('random', ids); if (root.DemoManager.state.currentStep !== 'free') root.DemoManager.setStep('free'); route = 'eras'; render(); root.DemoGuide.setMessage('短路线已更新；已完成的演示进度保留。'); return true; } return startDemoMode('random', ids); }
  function exitDemoMode() {
    root.DemoManager.exit();
    state = loadState(); route = 'home'; eraIndex = 0; taskStep = 0; selected = null; secondSelected = null;
    rebindProgression(); root.CommsArchiveLan?.reloadStorageContext?.(); root.AudioSystem?.reloadSettings?.();
    quizSession = quizStore?.loadSession?.() || null;
    render(); return true;
  }

  const DemoAppActions = {
    advance() {
      if (!active()) return false;
      const step = root.DemoManager.state.currentStep;
      if (step === 'free') { root.go('eras'); say('时代航线已开放，点击任意时代入口即可开始展示。'); return true; }
      if (step === 'welcome') { const entered = enterDemoEra('1G', 'investigation'); if (entered) { root.DemoManager.setStep('oneg'); say('已抵达1G时代入口。先阅读澜的开场介绍，再按页面按钮进入历史现场。'); } return entered; }
      if (step === 'gallery') {
        const entered = enterDemoEra('1G', 'investigation'); if (entered && root.DemoManager.state.currentStep !== 'oneg') root.DemoManager.setStep('oneg'); if (entered) say('已抵达1G时代入口。先阅读澜的开场介绍，再按页面按钮进入历史现场。'); return entered;
      }
      if (step === 'oneg') return finishOneGInvestigation();
      if (step === 'fourg') { const entered = enterFourGTechnology(); if (entered) say('完成4G技术理解，阅读实验结论后可主动前往档案出口。'); return entered; }
      if (step === 'fiveg') { const entered = enterFiveGScene(); if (entered) say('查看5G代表展品，观察通信网络、传感器和控制系统的协作。'); return entered; }
      if (step === 'sixg') return buildSixGArchive();
      if (step === 'complete') { root.go('final'); return true; }
      return false;
    },
    lanHint() {
      if (!active()) return false;
      const step = root.DemoManager.state.currentStep;
      if (step === 'welcome') root.CommsArchiveLan?.openPrologue();
      else root.CommsArchiveLan?.onTaskStart(step === 'fourg' ? '4G' : step === 'fiveg' ? '5G' : step === 'sixg' ? '6G' : '1G');
      say(step === 'oneg' ? '提示：先比较信号较强和较弱的位置，再根据证据判断呼叫失败的原因。' : '提示：沿着展品、调查证据和技术资料，整理这一时代的发现。');
      return true;
    },
    restore() {
      if (!active() || typeof root.location?.reload !== 'function') return false;
      root.location.reload(); return true;
    },
    restart() {
      if (!active()) return false;
      const session = root.DemoManager.state;
      const mode = ['recommended', 'random', 'free'].includes(session.routeMode) ? session.routeMode : 'recommended';
      return startDemoMode(mode, session.routeIds || []);
    },
    onIdle() { this.lanHint(); say('如果演示停滞，可点“重启演示”从本次路线开头重新开始；日常探索记录不会受影响。'); },
    enterDemoEra,
    enterRouteEra(id) { if (!ERA_IDS.includes(id)) return false; const result = enterDemoEra(id, 'entry'); if (result) say(`已抵达${id}时代入口。先阅读澜的开场介绍，再使用页面按钮继续。演示存档与普通进度隔离。`); return result; },
    toggleRouteEra(id, enabled) { if (!ERA_IDS.includes(id)) return; pendingRouteIds = enabled ? [...new Set([...pendingRouteIds, id])] : pendingRouteIds.filter(item => item !== id); renderRoutePicker(); },
    randomizeRoute() { pendingRouteIds = shuffledRoute(); renderRoutePicker(); },
    startSelectedRoute
  };
  root.DemoAppActions = DemoAppActions;
  root.startDemoMode = startDemoMode;
  root.openDemoRoutePicker = openDemoRoutePicker;
  root.closeDemoRoutePicker = closeDemoRoutePicker;
  root.startFreeDemo = startFreeDemo;
  root.exitDemoMode = exitDemoMode;

  // 演示模式使用二维时代入口；进入时代后将节点定位到目标步骤。
  root.enterEra = function (index) {
    if (active() && root.DemoManager.state.routeMode !== 'recommended') return enterDemoEra(eras[index]?.id, 'entry');
    const result = originalEnterEra(index);
    if (result && active() && root.DemoManager.state.currentStep === 'gallery' && index === 0) {
      prepareEraNode('1G', 'investigation'); root.DemoManager.setStep('oneg'); render();
    }
    return result;
  };
  const originalCompleteEra = root.completeEra;
  if (originalCompleteEra) root.completeEra = function () {
    const era=eras[eraIndex]?.id,result=originalCompleteEra();
    if(result&&active()){
      if(era==='1G'&&root.DemoManager.state.currentStep==='oneg'){root.DemoManager.setStep('fourg');say('1G档案已封存。下一步进入4G技术实验室。')}
      else if(era==='4G'&&root.DemoManager.state.currentStep==='fourg'){root.DemoManager.setStep('fiveg');say('4G档案已封存。下一步查看5G协同通信展品。')}
      else if(era==='6G'&&root.DemoManager.state.currentStep==='sixg'){root.DemoManager.setStep('complete');say('六代研究档案已封存，演示路线完成。')}
    }
    return result;
  };
  const originalGuidedDiscoverExhibit = root.guidedDiscoverExhibit;
  if (originalGuidedDiscoverExhibit) root.guidedDiscoverExhibit = function (era, id) {
    const before = progression.state.exhibitProgress[id]?.status;
    const result = originalGuidedDiscoverExhibit(era, id);
    if (active() && root.DemoManager.state.currentStep === 'fiveg' && before !== 'FOUND' && progression.state.exhibitProgress[id]?.status === 'FOUND') root.DemoManager.setStep('sixg');
    return result;
  };
  const originalRender = root.render;
  root.render = function () {
    const result = originalRender();
    if (active() && route === 'final') app.insertAdjacentHTML('afterbegin', '<aside class="demo-final-note"><b>演示路线说明</b><span>本次实际交互展示1G调查、4G技术实验、5G展区观察与6G研究档案；未展示的前序任务只在独立演示存档中预置。</span></aside>');
    return result;
  };

  if (active()) { root.DemoGuide?.mount(); root.DemoGuide?.start(); }
})(window);
