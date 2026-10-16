/* 《通信简史》比赛演示会话。演示主存档与澜/测验设置均使用独立命名空间。 */
(function (root) {
  'use strict';
  const KEY = 'demoArchive';
  const PREFIX = 'demoArchive::';
  const EMPTY = () => ({ mode: 'demo', active: false, currentStep: 'welcome', completedSteps: [], demoProgress: 0, dialogueSpeed: 1.7, appState: null, currentRoute: 'home', eraIndex: 0, routeMode: 'recommended', routeIds: [], routePosition: 0, startedAt: null, updatedAt: null });
  let archive = read();
  function read() { try { const value = JSON.parse(root.localStorage.getItem(KEY) || 'null'); return value && value.mode === 'demo' ? { ...EMPTY(), ...value } : EMPTY(); } catch (_) { return EMPTY(); } }
  function persist() { archive.updatedAt = new Date().toISOString(); try { root.localStorage.setItem(KEY, JSON.stringify(archive)); return true; } catch (_) { return false; } }
  function storageKey(key) { return archive.active ? `${PREFIX}${String(key)}` : String(key); }
  function storageProxy(storage) { return { getItem(key) { return storage.getItem(storageKey(key)); }, setItem(key, value) { return storage.setItem(storageKey(key), value); }, removeItem(key) { return storage.removeItem(storageKey(key)); }, key(index) { return storage.key(index); }, get length() { return storage.length; } }; }
  function namespacedGet(key) { return root.localStorage.getItem(storageKey(key)); }
  function namespacedSet(key, value) { return root.localStorage.setItem(storageKey(key), value); }
  function clearNamespaced() { try { for (let i = root.localStorage.length - 1; i >= 0; i--) { const key = root.localStorage.key(i); if (key?.startsWith(PREFIX)) root.localStorage.removeItem(key); } } catch (_) {} }
  function start(appState, route = 'prologue', config = {}) { clearNamespaced(); guideMessage = ''; archive = { ...EMPTY(), active: true, currentStep: config.routeMode === 'recommended' || !config.routeMode ? 'welcome' : 'free', routeMode: config.routeMode || 'recommended', routeIds: Array.isArray(config.routeIds) ? [...new Set(config.routeIds)] : [], currentRoute: route, startedAt: Date.now(), appState: structuredCloneSafe(appState) }; persist(); refresh(); return snapshot(); }
  function reset(appState, route = 'prologue', config = {}) { return start(appState, route, config); }
  function exit() { archive.active = false; clearTimeout(idleTimer); if (elapsedTimer && root.clearInterval) root.clearInterval(elapsedTimer); elapsedTimer = null; persist(); refresh(); }
  function structuredCloneSafe(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function saveAppState(state) { archive.appState = structuredCloneSafe(state); return persist(); }
  function loadAppState(fallback) { return archive.active && archive.appState ? structuredCloneSafe(archive.appState) : fallback; }
  function saveView(route, eraIndex) { if (!archive.active) return; archive.currentRoute = route; archive.eraIndex = Number.isInteger(eraIndex) ? eraIndex : 0; persist(); }
  function setStep(step) { if (!archive.active) return; if (archive.currentStep && !archive.completedSteps.includes(archive.currentStep)) archive.completedSteps.push(archive.currentStep); archive.currentStep = step; guideMessage = ''; archive.demoProgress = Math.min(100, Math.round(archive.completedSteps.length / 6 * 100)); persist(); root.DemoGuide?.refresh(); }
  function setRoute(mode, routeIds = [], position = 0) { if (!archive.active) return false; archive.routeMode = mode === 'random' ? 'random' : mode === 'free' ? 'free' : 'recommended'; archive.routeIds = Array.isArray(routeIds) ? [...new Set(routeIds)] : []; archive.routePosition = Math.max(0, Math.min(archive.routeIds.length - 1, Number(position) || 0)); persist(); refresh(); return true; }
  function snapshot() { return structuredCloneSafe(archive); }
  function shouldResume() { return !!archive.active; }
  function isActive() { return !!archive.active; }
  const DemoManager = { start, reset, exit, saveAppState, loadAppState, saveView, setStep, setRoute, snapshot, shouldResume, isActive, storageKey, storageProxy, namespacedGet, namespacedSet, get dialogueSpeed() { return archive.active ? archive.dialogueSpeed : 1; }, get state() { return snapshot(); } };
  root.DemoManager = DemoManager;

  const STEP_COPY = {
    welcome: ['通信文明档案馆', '从1G调查开始，沿着历史展品、技术原理和任务记录探索六代通信。', '进入1G调查'],
    free: ['自由选择展示时代', '演示档案独立保存。你可以从1G—6G中任意选择，也可以调整下方的短路线。', '打开时代航线'],
    gallery: ['调查1G失联呼叫', '演示记录已恢复。直接进入1G异常调查；演示存档与日常进度分开保存。', '进入1G调查'],
    oneg: ['查看1G调查线索', '选择无线信号线索并查看反馈，再整合调查结果。', '准备1G调查现场'],
    fourg: ['理解4G移动宽带', '为控制展示时长，2G与3G前序进度会在演示存档中预置；现在完成4G技术实验并阅读结论。', '进入4G技术实验室'],
    fiveg: ['观察5G智能互联', '进入智能工厂展区，查看设备、网络与控制系统的协同。', '进入5G展区'],
    sixg: ['查看6G时代档案', '6G仍处于研究发展阶段；演示存档会准备调查与技术证据，供你查看并封存档案。', '打开6G档案出口'],
    complete: ['展示路线完成', '已进入通信文明档案馆，并完成1G调查、4G体验、5G连接和6G研究档案。', '查看最终结局']
  };
  let idleTimer = null, elapsedTimer = null, lastActivity = Date.now(), idleNotified = false, guideRoot = null, guideMessage = '';
  function elapsedLabel() { const seconds = Math.max(0, Math.floor((Date.now() - Number(archive.startedAt || Date.now())) / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  function updateElapsed() { const node = root.document?.getElementById?.('demoElapsedTime'); if (node) node.textContent = elapsedLabel(); }
  function startElapsedClock() { if (!root.setInterval) return; if (elapsedTimer) root.clearInterval?.(elapsedTimer); updateElapsed(); elapsedTimer = root.setInterval(updateElapsed, 1000); }
  function mountGuide() {
    if (!root.document?.body) return null;
    if (!guideRoot) { guideRoot = root.document.createElement('aside'); guideRoot.id = 'demoGuide'; guideRoot.className = 'demo-guide'; guideRoot.hidden = true; guideRoot.setAttribute('aria-live', 'polite'); root.document.body.append(guideRoot); }
    refresh();
    return guideRoot;
  }
  function refresh() {
    if (!guideRoot && root.document?.body) mountGuide();
    if (!guideRoot) return;
    guideRoot.hidden = !archive.active;
    if (!archive.active) return;
    const [title, detail, action] = STEP_COPY[archive.currentStep] || STEP_COPY.welcome;
    const labels = ['welcome', 'oneg', 'fourg', 'fiveg', 'sixg', 'complete'];
    const index = archive.currentStep === 'free' ? -1 : Math.max(0, labels.indexOf(archive.currentStep));
    const routeLinks = archive.routeMode === 'recommended' ? '' : `<div class="demo-route-links"><span>${archive.routeMode === 'random' ? '本次随机短路线' : '自由路线'}</span>${(archive.routeIds || []).map((era, position) => `<button type="button" class="quiet" onclick="DemoAppActions.enterRouteEra('${era}')">${position + 1}. ${era}</button>`).join('')}</div>`;
    guideRoot.innerHTML = `<div class="demo-guide-top"><span class="eyebrow">比赛演示 · ${index < 0 ? '自由路线' : `${index + 1} / ${labels.length}`}</span><button type="button" class="demo-close" onclick="exitDemoMode()">退出演示 ×</button></div><strong>${title}</strong><p>${detail}</p>${guideMessage?`<p class="demo-guide-message" role="status">${guideMessage}</p>`:''}${routeLinks}<div class="demo-guide-actions"><button type="button" class="btn" onclick="DemoAppActions.advance()">${action} →</button><button type="button" class="btn secondary" onclick="DemoAppActions.lanHint()">听澜提示</button><button type="button" class="btn ghost" onclick="openDemoRoutePicker()">更换路线</button><button type="button" class="btn ghost demo-restore" onclick="DemoAppActions.restore()" title="从已保存的演示步骤恢复当前展示">恢复当前展示</button><button type="button" class="btn ghost demo-restart" onclick="DemoAppActions.restart()" title="仅重置临时演示进度，不影响日常探索">重启演示</button></div><small class="demo-guide-meta">本次用时 <b id="demoElapsedTime">${elapsedLabel()}</b> · 当前步骤已自动保存 · 对白语音 ${Math.round(archive.dialogueSpeed * 100)}%</small>`;
  }
  function activity() { if (!archive.active) return; lastActivity = Date.now(); idleNotified = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (archive.active && Date.now() - lastActivity >= 30000 && !idleNotified) { idleNotified = true; root.DemoAppActions?.onIdle?.(); } }, 30000); }
  function startGuide() { mountGuide(); startElapsedClock(); activity(); }
  if (root.document?.addEventListener) { root.document.addEventListener('pointerdown', activity, { passive: true }); root.document.addEventListener('keydown', activity); }
  function setMessage(message) { guideMessage = String(message || ''); refresh(); }
  root.DemoGuide = { mount: mountGuide, start: startGuide, refresh, activity, setMessage, get idleNotified() { return idleNotified; } };
})(window);
