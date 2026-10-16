(function (root, factory) {
  const api = factory(root, root?.document || null);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Object.assign(api, { create: factory });
  }
  if (root) root.InteractionDebugger = api;
})(typeof window !== 'undefined' ? window : globalThis, function createInteractionDebugger(root, doc) {
  const STORAGE_KEY = 'commsArchive.interactionTrace.v1';
  const ENABLE_KEY = 'commsArchive.interactionTrace.enabled';
  const MAX_EVENTS = 400;
  const ACTION_EVENTS = new Set([
    'HOME_START_CLICK', 'START_EXPLORATION_CLICK', 'CONTINUE_INVESTIGATION_CLICK', 'PROLOGUE_READY', 'PROLOGUE_CONTINUE_CLICK', 'GALLERY_ENTRY_CLICK',
    '3D_INIT_START', 'CONTINUE_CLICK', 'ERA_ENTER_REQUEST', 'ERA_PROGRESS_VALIDATION',
    'LAN_CONTINUE_CLICK', 'LAN_DIALOGUE_END', 'LAN_DIALOGUE_SKIP', 'INPUT_ENABLED', 'NEXT_ERA_CLICK', 'NAVIGATION', 'NAVIGATION_SUCCESS',
    'TASK_COMPLETE', 'EXHIBIT_OPEN', 'EXHIBIT_CLOSE', 'ARCHIVE_OPEN', 'DEMO_STEP', 'QUIZ_SUBMIT'
  ]);
  const watchedButton = /继续探索|继续调查|查看时代航线|时代航线|设置|体验设置|继续对白|跳过对白|跳过|下一步|查看详情|关闭详情|完成任务|返回|打开记录|对白记录|查看图片|文明档案|展品档案|开始调查|进入\s*[1-6]G|前往\s*[1-6]G|进入下一时代|下一时代|前往下一代/i;
  const sceneKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', '+', '=', '-', '_']);
  let enabled = requestedByUrl() || safeReadEnabled();
  let panel = null;
  let hiddenPanel = false;
  let trace = loadTrace();
  let clickSequence = 0;
  const pendingButtonHandlers = new Map();

  function requestedByUrl() {
    try { return new URLSearchParams(root?.location?.search || '').get('interactionDebug') === '1'; }
    catch (_) { return false; }
  }

  function safeReadEnabled() {
    try { return root?.sessionStorage?.getItem(ENABLE_KEY) === '1'; }
    catch (_) { return false; }
  }

  function makeId() {
    try { return root.crypto?.randomUUID?.() || `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
    catch (_) { return `trace-${Date.now()}`; }
  }

  function loadTrace() {
    try {
      const saved = JSON.parse(root?.sessionStorage?.getItem(STORAGE_KEY) || 'null');
      if (saved && Array.isArray(saved.events) && saved.states && typeof saved.states === 'object') {
        return { sessionId: saved.sessionId || makeId(), currentStep: saved.currentStep || '', events: saved.events.slice(-MAX_EVENTS), states: saved.states };
      }
    } catch (_) { /* Storage may be disabled. */ }
    return { sessionId: makeId(), currentStep: '', events: [], states: {} };
  }

  function safeValue(value) {
    if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return String(value); }
  }

  function elementName(element) {
    if (!element) return '';
    const tag = String(element.tagName || element.nodeName || '').toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = typeof element.className === 'string' ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(name => `.${name}`).join('') : '';
    return `${tag}${id}${classes}` || String(element.nodeName || 'element');
  }

  function activeCanvas() {
    return doc?.querySelector?.('.archive3d-canvas') || null;
  }

  function overlaySnapshot() {
    if (!doc?.querySelectorAll) return [];
    const selectors = '#galleryStatus, .transit-overlay, .transition-overlay, [data-transition-layer]';
    return [...doc.querySelectorAll(selectors)].map(element => {
      const style = root.getComputedStyle?.(element) || {};
      const rect = element.getBoundingClientRect?.() || {};
      return {
        element: elementName(element), hidden: !!element.hidden,
        display: style.display || '', opacity: Number(style.opacity ?? 1),
        pointerEvents: style.pointerEvents || '', zIndex: style.zIndex || '',
        x: Math.round(rect.x || 0), y: Math.round(rect.y || 0),
        width: Math.round(rect.width || 0), height: Math.round(rect.height || 0)
      };
    }).filter(item => !item.hidden && item.display !== 'none' && item.width > 0 && item.height > 0);
  }

  function layerSnapshot() {
    if (!doc?.querySelector) return [];
    return [
      ['transition', '#galleryStatus'], ['viewer', '#archive3d'], ['canvas', '.archive3d-canvas'],
      ['page', '#app'], ['lan', '#lanCompanion'], ['debug', '#interactionTracePanel']
    ].map(([name, selector]) => {
      const element = doc.querySelector(selector);
      if (!element) return { name, present: false };
      const style = root.getComputedStyle?.(element) || {};
      const rect = element.getBoundingClientRect?.() || {};
      return {
        name, present: true, parent: element.parentElement ? elementName(element.parentElement) : '',
        hidden: !!element.hidden, display: style.display || '',
        opacity: Number(style.opacity ?? 1), pointerEvents: style.pointerEvents || '',
        zIndex: style.zIndex || '', position: style.position || '',
        x: Math.round(rect.x || 0), y: Math.round(rect.y || 0),
        width: Math.round(rect.width || 0), height: Math.round(rect.height || 0)
      };
    });
  }

  function inspect(extra = {}) {
    const canvas = activeCanvas();
    const lan = root?.CommsArchiveLan?.debugSnapshot?.() || null;
    const viewer = root?.CommunicationsHistory3D?.debugSnapshot?.() || null;
    const overlays = overlaySnapshot();
    return {
      scene: doc?.body?.classList?.contains('gallery-open') ? '3d-gallery' : '2d-page',
      currentPage: root?.CommsArchiveApp?.getRoute?.() || root?.CommsArchiveApp?.route || doc?.body?.dataset?.route || '',
      currentState: root?.CommsArchiveApp?.getInteractionState?.() || { scene: doc?.body?.classList?.contains('gallery-open') ? '3d-gallery' : '2d-page', demoMode: !!root?.DemoManager?.isActive?.() },
      input: {
        focusedElement: elementName(doc?.activeElement),
        canvasFocused: !!canvas && doc?.activeElement === canvas,
        canvasPresent: !!canvas,
        enabled: !!canvas && doc?.activeElement === canvas && !doc?.hidden
      },
      dialogue: lan,
      viewer,
      transition: overlays.some(item => item.element.includes('#galleryStatus') || item.element.includes('transition') || item.element.includes('transit')),
      overlays,
      layers: layerSnapshot(),
      buttons: [...(doc?.querySelectorAll?.('#app button, #archive3d button') || [])].filter(button => {
        const label = (button.innerText || button.textContent || '').trim().replace(/\s+/g, ' ');
        return watchedButton.test(label) || /下一代|下一时代/.test(label);
      }).map(button => ({ label: (button.innerText || button.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60), disabled: !!button.disabled, visible: !!button.getClientRects?.().length })),
      demoMode: !!root?.DemoManager?.isActive?.(),
      ...safeValue(extra)
    };
  }

  function persist() {
    try { root?.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(trace)); }
    catch (_) { /* Trace remains available in memory. */ }
  }

  function record(event, source = 'unknown', state = {}) {
    if (!enabled || !event) return null;
    const mergedState = { ...inspect(), ...safeValue(state) };
    const entry = { time: new Date().toISOString(), event: String(event), source: String(source), state: mergedState };
    trace.currentStep = entry.event;
    trace.states = mergedState;
    trace.events.push(entry);
    if (trace.events.length > MAX_EVENTS) trace.events.splice(0, trace.events.length - MAX_EVENTS);
    persist();
    try { root.console?.info?.('[InteractionTrace]', entry.event, entry); } catch (_) { /* Console may be unavailable. */ }
    renderPanel();
    return entry;
  }

  function classify() {
    const events = trace.events;
    const last = events.at(-1);
    if (!last) return { category: '待采集', reason: '尚无交互事件。' };
    const state = last.state || {};
    const overlay = (state.overlays || []).find(item => item.opacity <= 0.03 && item.pointerEvents !== 'none');
    if (last.event === 'TRANSITION_OVERLAY_BLOCK' || overlay) return { category: '转场遮罩拦截', reason: overlay ? `${overlay.element} 近乎透明但仍接收点击。` : '点击命中了转场层。' };
    if (last.event === 'KEY_ACTION_NOT_SEEN') return { category: '键盘事件被拦截', reason: `${state.key || '按键'}到达页面，但场景没有记录对应操作。` };
    if (last.event === 'BUTTON_DISABLED_PRESS') return { category: '按钮状态锁死', reason: '被点击的控件处于 disabled 状态。' };
    if (last.event === 'BUTTON_ACTION_MISSING') {
      const reason = state.reason || '';
      const labels = { locked: '按钮当前被锁定。', waiting_dialogue: '当前对白尚未结束，按钮暂不能继续。', missing_callback: '按钮没有绑定可执行的回调。', overlay_blocked: '点击被透明或覆盖层拦截。' };
      return { category: reason === 'overlay_blocked' ? '转场遮罩拦截' : reason === 'waiting_dialogue' ? '澜对白未释放' : reason === 'locked' ? '按钮状态锁死' : '按钮未响应', reason: labels[reason] || '关键按钮收到点击，但调用链未留下动作记录。' };
    }
    if (last.event === 'BUTTON_ACTION_RESULT' && !state.callbackExecuted) {
      const labels = { locked: '按钮当前被锁定。', waiting_dialogue: '当前对白尚未结束，按钮暂不能继续。', missing_callback: '按钮没有绑定可执行的回调。', overlay_blocked: '点击被透明或覆盖层拦截。', no_observable_change: '回调已登记，但点击后没有观察到状态变化。' };
      return { category: state.reason === 'overlay_blocked' ? '转场遮罩拦截' : state.reason === 'waiting_dialogue' ? '澜对白未释放' : state.reason === 'locked' ? '按钮状态锁死' : '按钮未产生可见动作', reason: labels[state.reason] || '按钮动作未确认。' };
    }
    if (last.event === 'DIALOGUE_OVERLAY_BLOCK') return { category: '澜对白未释放', reason: '澜正在进行剧情对白，点击被剧情层拦截。' };
    if (last.event === 'NEXT_ERA_BLOCKED' || last.event === 'ERA_ENTER_FAILED') return { category: '其他原因', reason: String(state.reason || state.error || '时代进入流程报告失败；查看ProgressValidator结果和错误字段。') };
    if (last.event === 'LAN_DIALOGUE_END' || last.event === 'LAN_DIALOGUE_SKIP') {
      const dialogue = state.dialogue || {};
      if (dialogue.isPlaying || dialogue.persistedCurrentDialogue || dialogue.inputEnabled === false) {
        return { category: '澜对白未释放', reason: '对白结束或跳过后，播放队列、当前对白或输入状态仍未释放。' };
      }
    }
    return { category: '暂未定位', reason: '现有事件没有命中四类阻塞特征；查看最后几条状态快照。' };
  }

  function copyTrace() {
    const text = JSON.stringify(getTrace(), null, 2);
    return root?.navigator?.clipboard?.writeText?.(text).then(() => true).catch(() => false) || Promise.resolve(false);
  }

  function getTrace() { return safeValue(trace); }

  function clear() {
    trace = { sessionId: makeId(), currentStep: '', events: [], states: {} };
    persist();
    renderPanel();
    return getTrace();
  }

  function enable() {
    enabled = true;
    try { root?.sessionStorage?.setItem(ENABLE_KEY, '1'); } catch (_) { /* In-memory enable still works. */ }
    ensurePanel();
    record('DEBUG_ENABLED', 'InteractionDebugger.enable');
    return true;
  }

  function disable() {
    enabled = false;
    try { root?.sessionStorage?.removeItem(ENABLE_KEY); } catch (_) { /* Ignore storage restrictions. */ }
    if (panel) panel.hidden = true;
    return true;
  }

  function ensurePanel() {
    if (!enabled || !doc?.body || !doc.createElement || panel) return;
    const shell = doc.createElement('aside');
    shell.id = 'interactionTracePanel';
    shell.setAttribute('aria-label', '交互诊断日志');
    shell.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;max-width:min(460px,calc(100vw - 24px));font:12px/1.45 system-ui,sans-serif;color:#eef6ff;pointer-events:none';
    shell.innerHTML = '<div style="pointer-events:none;border:1px solid #70cfff88;border-radius:12px;background:#081426ed;box-shadow:0 12px 36px #0008;overflow:hidden"><header style="display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid #ffffff20;pointer-events:none"><b style="flex:1">交互诊断 · <span data-trace-class>等待操作</span></b><button type="button" data-trace-copy style="pointer-events:auto">复制日志</button><button type="button" data-trace-clear style="pointer-events:auto">清空</button><button type="button" data-trace-hide aria-label="收起诊断" style="pointer-events:auto">−</button></header><div data-trace-body style="padding:8px 11px;max-height:190px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;pointer-events:none"></div></div>';
    shell.querySelector('[data-trace-copy]')?.addEventListener('click', () => { copyTrace().then(ok => { const el = shell.querySelector('[data-trace-class]'); if (el) el.textContent = ok ? '日志已复制' : '复制失败'; }); });
    shell.querySelector('[data-trace-clear]')?.addEventListener('click', clear);
    shell.querySelector('[data-trace-hide]')?.addEventListener('click', () => { hiddenPanel = true; renderPanel(); });
    doc.body.append(shell);
    panel = shell;
    renderPanel();
  }

  function renderPanel() {
    if (!enabled) return;
    ensurePanel();
    if (!panel) return;
    panel.hidden = hiddenPanel;
    if (hiddenPanel) return;
    const classification = classify();
    const label = panel.querySelector('[data-trace-class]');
    if (label) label.textContent = classification.category;
    const body = panel.querySelector('[data-trace-body]');
    if (body) body.textContent = trace.events.slice(-9).map(item => `${item.time.slice(11, 23)} ${item.event} · ${item.source}`).join('\n') || '等待关键交互…';
  }

  function buttonDetails(button) {
    const label = (button?.innerText || button?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90);
    const inlineHandler = button?.getAttribute?.('onclick') || '';
    const navigation = button?.getAttribute?.('data-nav') || '';
    const managedBinding = !!(button?.id === 'audioSettingsToggle' || button?.closest?.('#lanCompanion, #demoRoutePicker, #healthPanel') || button?.type === 'submit' || button?.dataset?.debugClick);
    const page = root?.CommsArchiveApp?.getRoute?.() || root?.CommsArchiveApp?.route || doc?.body?.dataset?.route || 'unknown';
    const labelKey = label.toLowerCase().replace(/\s+/g, '_').slice(0, 48);
    return {
      button: elementName(button),
      buttonId: button?.id || button?.getAttribute?.('data-button-id') || (button ? `auto:${page}:${labelKey || elementName(button)}` : ''),
      label,
      buttonDisabled: !!button?.disabled,
      callbackRegistered: !!(inlineHandler || navigation || managedBinding),
      callbackType: inlineHandler ? 'inline' : navigation ? 'navigation' : managedBinding ? 'managed' : 'none',
      callback: inlineHandler || (navigation ? `go(${navigation})` : '')
    };
  }

  function progressSnapshot() {
    const mode = root?.DemoManager?.isActive?.() ? 'demo' : 'normal';
    const progression = root?.CommsArchiveProgressManager?.state || {};
    let saved = {};
    try {
      const key = mode === 'demo' ? '' : root?.localStorage?.getItem?.('commsArchive');
      if (key) saved = JSON.parse(key) || {};
    } catch (_) { saved = {}; }
    return {
      mode,
      visitedCount: Array.isArray(saved.visited) ? saved.visited.length : 0,
      completedCount: Array.isArray(saved.completed) ? saved.completed.length : 0,
      orderCount: Array.isArray(saved.order) ? saved.order.length : 0,
      currentEra: progression.currentEra || root?.DemoManager?.state?.era || null,
      currentNode: progression.currentNode || null,
      dialogueActive: !!progression.dialogueProgress?.activeId
    };
  }

  function onPointerDown(event) {
    if (!enabled || panel?.contains?.(event.target)) return;
    const hit = Number.isFinite(event.clientX) && Number.isFinite(event.clientY) ? doc?.elementFromPoint?.(event.clientX, event.clientY) : null;
    const control = event.target?.closest?.('button, a, [role="button"], [onclick], [data-nav], input[type="submit"], .archive3d-canvas, #lanCompanion') || hit?.closest?.('button, a, [role="button"], [onclick], [data-nav], input[type="submit"], .archive3d-canvas, #lanCompanion');
    if (!control) {
      if (doc?.body?.classList?.contains('lan-dialogue-active') && !event.target?.closest?.('#lanCompanion')) record('DIALOGUE_OVERLAY_BLOCK', 'Lan dialogue backdrop', { reason: 'waiting_dialogue', currentPage: inspect().currentPage, currentState: inspect().currentState, target: elementName(event.target), hitTarget: elementName(hit) });
      return;
    }
    const details = buttonDetails(control);
    const reason = details.buttonDisabled ? 'locked' : '';
    record(details.buttonDisabled ? 'BUTTON_DISABLED_PRESS' : 'UI_POINTER_DOWN', elementName(control), { ...details, reason, currentPage: inspect().currentPage, currentState: inspect().currentState, pointerType: event.pointerType || '', target: elementName(event.target), hitTarget: elementName(hit) });
  }

  function onClick(event) {
    if (!enabled || panel?.contains?.(event.target)) return;
    const button = event.target?.closest?.('button, a, [role="button"], [onclick], [data-nav], input[type="submit"]');
    const lanCard = !button ? event.target?.closest?.('#lanCompanion') : null;
    const control = button || lanCard;
    const label = (button?.innerText || button?.textContent || (lanCard ? '澜卡片继续对白' : '')).trim().replace(/\s+/g, ' ');
    const target = elementName(event.target);
    const details = buttonDetails(button);
    if (lanCard) Object.assign(details, { button: elementName(lanCard), buttonId: 'lan-companion-card', label, callbackRegistered: true, callbackType: 'managed', callback: 'LanSystem card click handler' });
    const hit = Number.isFinite(event.clientX) && Number.isFinite(event.clientY) ? doc?.elementFromPoint?.(event.clientX, event.clientY) : null;
    const overlays = overlaySnapshot();
    const transparentCatcher = overlays.find(item => item.opacity <= 0.03 && item.pointerEvents !== 'none' && Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && event.clientX >= item.x && event.clientY >= item.y && event.clientX <= item.x + item.width && event.clientY <= item.y + item.height);
    const before = clickObservation(control);
    const page = inspect().currentPage;
    const currentState = inspect().currentState;
    const navigationControl = !!(button?.getAttribute?.('data-nav') || /homePrimaryAction|continueInvestigation|startExploration|enterEra|beginEraTravel|go\(/.test(details.callback || '') || /继续探索|继续调查|时代航线|进入\s*[1-6]G|前往\s*[1-6]G|返回首页|进入通信文明档案馆/i.test(label));
    if (transparentCatcher) record('TRANSITION_OVERLAY_BLOCK', target, { ...details, currentPage: page, currentState, reason: 'overlay_blocked', hitTarget: elementName(hit), overlay: transparentCatcher });
    if (!control) { record('UI_CLICK', target, { currentPage: page, currentState, target, hitTarget: elementName(hit), isTrusted: !!event.isTrusted }); return; }
    const eventStart = trace.events.length;
    const clickId = ++clickSequence;
    const buttonContext = { ...details, currentPage: page, currentState, mode: currentState?.demoMode ? 'demo' : 'normal', progressState: progressSnapshot(), target, hitTarget: elementName(hit), topElement: elementName(hit), isTrusted: !!event.isTrusted, clickId };
    pendingButtonHandlers.set(clickId, { ...buttonContext, error: null });
    record('BUTTON_CLICK', target, { ...buttonContext, callbackExecuted: 'pending', reason: transparentCatcher ? 'overlay_blocked' : details.buttonDisabled ? 'locked' : '' });
    record('BUTTON_HANDLER_START', target, { ...buttonContext, handler: details.callback || details.callbackType || 'managed event' });
    if (navigationControl) record('NAVIGATION_START', target, { ...buttonContext, to: details.callback || label });
    root.setTimeout?.(() => {
      if (!enabled) return;
      const after = clickObservation(control);
      const actionEvents = trace.events.slice(eventStart);
      const actionRecorded = actionEvents.some(item => ACTION_EVENTS.has(item.event) && item.event !== 'BUTTON_ACTION_RESULT');
      const navigationBlocked = actionEvents.some(item => ['NAVIGATION_BLOCKED', 'ERA_ENTER_FAILED', 'NEXT_ERA_BLOCKED'].includes(item.event));
      const observableChange = JSON.stringify(before) !== JSON.stringify(after);
      const callbackExecuted = !details.buttonDisabled && (actionRecorded || observableChange) && !(navigationControl && navigationBlocked);
      const dialogue = currentState?.dialogue || root?.CommsArchiveLan?.debugSnapshot?.() || {};
      let reason = '';
      if (transparentCatcher) reason = 'overlay_blocked';
      else if (details.buttonDisabled) reason = 'locked';
      else if (!callbackExecuted && dialogue.isPlaying && !lanCard) reason = 'waiting_dialogue';
      else if (!details.callbackRegistered) reason = 'missing_callback';
      else if (!callbackExecuted) reason = 'no_observable_change';
      const pending = pendingButtonHandlers.get(clickId);
      const error = pending?.error || null;
      const result = { ...buttonContext, currentPage: inspect().currentPage, currentState: inspect().currentState, callbackExecuted, reason: error ? 'handler_exception' : reason, actionRecorded, observableChange, transition: inspect().transition, overlays: overlaySnapshot(), error: error?.message || '', stack: error?.stack || '' };
      record('BUTTON_ACTION_RESULT', target, result);
      if (callbackExecuted && !error) record('BUTTON_HANDLER_SUCCESS', target, result);
      else {
        record('BUTTON_HANDLER_FAILED', target, result);
        if (reason && reason !== 'no_observable_change') record('BUTTON_ACTION_MISSING', target, result);
      }
      if (navigationControl) record(callbackExecuted && !error ? 'NAVIGATION_SUCCESS' : 'NAVIGATION_BLOCKED', target, { ...result, reason: result.reason || reason || 'no_observable_change' });
      pendingButtonHandlers.delete(clickId);
    }, 60);
  }

  function clickObservation(control) {
    const app = root?.CommsArchiveApp;
    const audio = doc?.querySelector?.('.audio-settings');
    const modal = doc?.querySelector?.('#modalRoot');
    const viewer = doc?.querySelector?.('#imageViewerRoot');
    const lan = root?.CommsArchiveLan?.debugSnapshot?.() || null;
    return {
      page: app?.getRoute?.() || app?.route || '',
      state: app?.getInteractionState?.() || null,
      bodyClass: doc?.body?.className || '',
      appLength: doc?.querySelector?.('#app')?.innerHTML?.length || 0,
      modalLength: modal?.innerHTML?.length || 0,
      imageViewerLength: viewer?.innerHTML?.length || 0,
      audioOpen: !!audio && !audio.hidden,
      buttonDisabled: !!control?.disabled,
      ariaExpanded: control?.getAttribute?.('aria-expanded') || '',
      ariaPressed: control?.getAttribute?.('aria-pressed') || '',
      dialogue: lan && { isPlaying: lan.isPlaying, activeDialogueId: lan.activeDialogueId, lineIndex: lan.lineIndex, queueLength: lan.queueLength, displayMode: lan.displayMode }
    };
  }

  function onKeyDown(event) {
    if (!enabled || panel?.contains?.(event.target)) return;
    const key = event.key;
    const canvas = activeCanvas();
    const canvasFocused = !!canvas && (doc.activeElement === canvas || event.target === canvas);
    record('KEYDOWN', elementName(event.target), { key, target: elementName(event.target), canvasFocused, galleryVisible: !!doc?.body?.classList?.contains('gallery-open'), editable: /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || '') });
    if (!sceneKeys.has(key) || !doc?.body?.classList?.contains('gallery-open')) return;
    if (!canvasFocused) {
      record('KEY_ACTION_NOT_SEEN', 'archive3d.canvas.keydown', { key, canvasFocused: false, focusedElement: elementName(doc?.activeElement), inputEnabled: !!canvas?.isConnected, reason: '画布未获得键盘焦点' });
      return;
    }
    const startAt = trace.events.length;
    root.setTimeout?.(() => {
      if (!enabled || trace.events.slice(startAt).some(item => ['MOVE_ACTION', 'SELECT_ACTION'].includes(item.event) && item.state.key === key)) return;
      record('KEY_ACTION_NOT_SEEN', 'archive3d.canvas.keydown', { key, canvasFocused: !!canvas && doc.activeElement === canvas, inputEnabled: !!canvas && canvas.isConnected, scene: '3d-gallery' });
    }, 300);
  }

  function installListeners() {
    if (!doc?.addEventListener) return;
    doc.addEventListener('pointerdown', onPointerDown, true);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('keydown', onKeyDown, true);
    root?.addEventListener?.('error', event => {
      const error = event.error || null;
      const details = { message: event.message || error?.message || '未知错误', filename: event.filename || '', line: event.lineno || 0, column: event.colno || 0, stack: error?.stack || '' };
      record('RUNTIME_ERROR', 'window.error', details);
      const pending = [...pendingButtonHandlers.values()].at(-1);
      if (pending) pending.error = details;
    });
    root?.addEventListener?.('unhandledrejection', event => record('UNHANDLED_REJECTION', 'window.unhandledrejection', { reason: safeValue(event.reason) }));
  }

  installListeners();
  if (enabled) {
    ensurePanel();
    record('TRACE_SESSION_READY', 'InteractionDebugger', { debugUrl: true });
  }

  return { record, snapshot: inspect, classify, getTrace, clear, enable, disable, copyTrace, get enabled() { return enabled; }, get currentStep() { return trace.currentStep; } };
});
