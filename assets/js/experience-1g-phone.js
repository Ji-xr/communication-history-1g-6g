/* 1G移动电话体验：全程为本地教学模拟，不连接电话网络。 */
(function (root) {
  'use strict';
  const BASE = { x: 84, y: 18 };
  const BUILDINGS = [
    { x: 23, y: 15, w: 17, h: 28 },
    { x: 48, y: 8, w: 17, h: 23 },
    { x: 11, y: 51, w: 18, h: 19 },
    { x: 55, y: 62, w: 19, h: 24 }
  ];
  const FAMILY_LINES = [
    '喂？听得到吗？',
    '听到了！你现在在哪里？',
    '我走到信号比较稳定的地方了。过一会儿就回家。'
  ];
  const STORAGE_NAME = 'commsArchive1GPhoneSession.v1';
  let activeKey = '', state = null, stream = null, recorder = null, audioUrl = null, audioContext = null, audioTimer = null, recordingGeneration = 0, recordingPending = false, recordingOwner = null;

  function storageKey() { return root.DemoManager?.storageKey?.(STORAGE_NAME) || STORAGE_NAME; }
  function blank() { return { phase: 'dial', digits: '', x: 15, y: 79, moves: 0, message: '输入屏幕上的虚构教学号码，再尝试拨号。', familyIndex: 0 }; }
  function normalize(value) {
    const fallback = blank();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
    return {
      phase: ['dial', 'locate', 'ready', 'family', 'summary'].includes(value.phase) ? value.phase : fallback.phase,
      digits: typeof value.digits === 'string' ? value.digits.replace(/\D/g, '').slice(0, 7) : '',
      x: Number.isFinite(value.x) ? clamp(value.x, 7, 93) : fallback.x,
      y: Number.isFinite(value.y) ? clamp(value.y, 10, 88) : fallback.y,
      moves: Number.isSafeInteger(value.moves) ? Math.max(0, value.moves) : 0,
      message: typeof value.message === 'string' ? value.message.slice(0, 500) : fallback.message,
      familyIndex: Number.isInteger(value.familyIndex) ? clamp(value.familyIndex, 0, FAMILY_LINES.length) : 0
    };
  }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
  function load() {
    const key = storageKey();
    if (key !== activeKey) {
      if (activeKey) cleanup();
      activeKey = key;
      try { state = normalize(JSON.parse(root.sessionStorage?.getItem(key) || '{}')); }
      catch (_) { state = blank(); }
    }
    return state;
  }
  function save() { try { root.sessionStorage?.setItem(activeKey, JSON.stringify(state)); return true; } catch (_) { return false; } }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function segmentHitsRect(x1, y1, x2, y2, rect) {
    for (let i = 1; i < 20; i++) {
      const t = i / 20, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return true;
    }
    return false;
  }
  function signalAt(x, y) {
    const dx = (BASE.x - x) * 1.08, dy = BASE.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const blocked = BUILDINGS.filter(rect => segmentHitsRect(x, y, BASE.x, BASE.y, rect)).length;
    const openStreet = x >= 42 && x <= 77 && y >= 38 && y <= 68;
    return Math.round(clamp(96 - distance * 0.55 - Math.min(blocked, 2) * 18 + (openStreet ? 9 : 0), 5, 95));
  }
  function doneSet() { return new Set(root.CommsArchiveLan?.LanMemory?.completedExperienceNodes || []); }
  function recoveredPhase() {
    const done = doneSet();
    if (done.has('EXPERIENCE_1G_RECONNECT')) return 'summary';
    if (done.has('EXPERIENCE_1G_COVERAGE')) return 'ready';
    if (done.has('EXPERIENCE_1G_CALL')) return 'locate';
    return 'dial';
  }
  function callAudio() {
    try {
      const AudioContext = root.AudioContext || root.webkitAudioContext;
      if (!AudioContext) return;
      clearTimeout(audioTimer); audioContext?.close?.(); audioContext = new AudioContext();
      audioContext.resume?.();
      const start = audioContext.currentTime;
      [440, 480, 440].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), at = start + index * 0.48;
        oscillator.frequency.value = frequency; oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(0.055, at + 0.025); gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(at); oscillator.stop(at + 0.24);
      });
      const context = audioContext;
      audioTimer = setTimeout(() => { if (audioContext === context) { context.close?.(); audioContext = null; } audioTimer = null; }, 1800);
    } catch (_) { /* 音效不可用时保留画面与通话流程。 */ }
  }
  function statusText(value) { const node = document.getElementById('oneGCallStatus'); if (node) node.textContent = value; }
  function dial() {
    load();
    if (state.digits !== '0000000') { state.message = '号码不匹配。请按屏幕提示输入虚构教学号码 000-0000。'; save(); statusText(state.message); return false; }
    if (state.phase === 'dial') {
      state.phase = 'locate'; state.message = '呼叫未建立：当前模拟位置的无线覆盖不足。移动电话可以发起呼叫，但还需要找到较稳定的连接区域。'; save();
      root.completeEraExperienceNode?.('1G', 'EXPERIENCE_1G_CALL');
      return true;
    }
    if (state.phase === 'ready') {
      const signal = signalAt(state.x, state.y);
      if (signal < 64) { state.message = `当前位置的模拟信号已降至 ${signal}%，请移回覆盖较好的位置后再拨号。`; save(); statusText(state.message); return false; }
      state.phase = 'family'; state.familyIndex = 0; state.message = '信号已达到本次模拟呼叫条件，正在呼叫家人……'; save(); callAudio();
      root.render?.(); return true;
    }
    return false;
  }
  function hangup() { load(); if (state.phase === 'family') return false; state.digits = ''; state.message = state.phase === 'ready' ? '当前呼叫已挂断；覆盖条件仍保留，可以再次拨号。' : '呼叫已结束。你可以继续尝试号码或移动寻找信号。'; save(); root.render?.(); return true; }
  function press(key) {
    load();
    if (state.phase !== 'dial' && state.phase !== 'locate' && state.phase !== 'ready') return false;
    if (key === 'clear') state.digits = '';
    else if (key === 'back') state.digits = state.digits.slice(0, -1);
    else if (/^\d$/.test(String(key)) && state.digits.length < 7) state.digits += String(key);
    save();
    const display = document.getElementById('oneGNumber'); if (display) display.textContent = formatNumber(state.digits);
    return true;
  }
  function formatNumber(digits) { return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits || '— — — —'; }
  function confirmCoverage() {
    load(); if (state.phase !== 'locate' && state.phase !== 'ready') return false;
    const signal = signalAt(state.x, state.y);
    if (signal < 64) { state.message = `当前模拟信号 ${signal}%，还不足以建立本次通话。试试开阔道路，也留意高楼遮挡。`; save(); statusText(state.message); return false; }
    state.phase = 'ready'; state.message = `信号达到本次模拟呼叫条件（${signal}%）。按拨号键再次联系家人。`; save();
    root.completeEraExperienceNode?.('1G', 'EXPERIENCE_1G_COVERAGE');
    return true;
  }
  function nextFamilyLine() { load(); if (state.phase !== 'family') return false; state.familyIndex = Math.min(FAMILY_LINES.length, state.familyIndex + 1); save(); root.render?.(); return true; }
  function finishCall() {
    load(); if (state.phase !== 'family' || state.familyIndex < FAMILY_LINES.length) return false;
    state.phase = 'summary'; state.message = '模拟通话结束。你已完成一次移动通话体验。'; save();
    root.CommsArchive1GPhone.cleanupRecording();
    root.completeEraExperienceNode?.('1G', 'EXPERIENCE_1G_RECONNECT');
    return true;
  }
  async function startRecording() {
    load();
    const status = document.getElementById('oneGRecordingStatus');
    if (recordingPending || recorder?.state === 'recording') { if (status) status.textContent = recordingPending ? '正在等待麦克风权限，请勿重复开始。' : '正在录音，请先停止或清除当前录音。'; return false; }
    if (!root.navigator?.mediaDevices?.getUserMedia || typeof root.MediaRecorder !== 'function') { if (status) status.textContent = '此浏览器或页面环境不支持录音；可以直接跳过，不影响体验完成。'; return false; }
    if (!root.isSecureContext && root.location?.hostname !== 'localhost' && root.location?.hostname !== '127.0.0.1') { if (status) status.textContent = '浏览器仅允许在 localhost 或 HTTPS 中使用麦克风；可以跳过录音。'; return false; }
    cleanupRecording();
    const generation = recordingGeneration, owner = root.document?.querySelector?.('.experience-1g'), scope = activeKey;
    recordingPending = true; recordingOwner = owner;
    root.ExhibitionSoundtrack?.setDucked(true,'recording');
    try {
      if (status) status.textContent = '浏览器将请求麦克风权限。录音只留在本次页面会话，不会上传或写入存档。';
      const nextStream = await root.navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== recordingGeneration || scope !== storageKey() || !owner || owner !== root.document?.querySelector?.('.experience-1g')) { nextStream.getTracks().forEach(track => track.stop()); return false; }
      stream = nextStream; recorder = new root.MediaRecorder(stream);
      const activeRecorder = recorder, chunks = [];
      activeRecorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      activeRecorder.onstop = () => {
        if (generation !== recordingGeneration || activeRecorder !== recorder) return;
        nextStream.getTracks().forEach(track => track.stop()); if (stream === nextStream) stream = null;
        if (!chunks.length) { if (status) status.textContent = '没有收到录音数据；可重新录制或跳过。'; return; }
        if (audioUrl) root.URL.revokeObjectURL(audioUrl);
        audioUrl = root.URL.createObjectURL(new Blob(chunks, { type: activeRecorder.mimeType || 'audio/webm' }));
        const audio = document.getElementById('oneGRecordingPlayback'); if (audio) { audio.src = audioUrl; audio.hidden = false; }
        if (status) status.textContent = '录音已暂存在当前页面会话中，可播放、重录或跳过。';
      };
      activeRecorder.onerror = () => { if (generation === recordingGeneration && activeRecorder === recorder) { cleanupRecording(); if (status) status.textContent = '录音设备出现错误；可以重试或跳过录音。'; } };
      recorder.start(); if (status) status.textContent = '正在录音……再次点击“停止录音”结束。'; return true;
    } catch (error) { if (generation !== recordingGeneration) return false; cleanupRecording(); if (status) status.textContent = error?.name === 'NotAllowedError' ? '未获得麦克风权限；可以跳过录音，继续完成体验。' : `录音不可用（${error?.message || '设备错误'}）；可以跳过录音。`; return false; }
    finally { if (generation === recordingGeneration) recordingPending = false; }
  }
  function stopRecording() { root.ExhibitionSoundtrack?.setDucked(false,'recording'); if (recordingPending) { cleanupRecording(); statusText('已取消等待录音，可以直接继续完成通话。'); return true; } if (recorder?.state === 'recording') { try { recorder.stop(); } finally { if (stream) stream.getTracks().forEach(track => track.stop()); stream = null; } return true; } return false; }
  function cleanupRecording() { root.ExhibitionSoundtrack?.setDucked(false,'recording'); recordingGeneration += 1; recordingPending = false; recordingOwner = null; const activeRecorder = recorder; try { if (activeRecorder?.state === 'recording') activeRecorder.stop(); } catch (_) {} if (stream) stream.getTracks().forEach(track => track.stop()); stream = null; recorder = null; const audio = document.getElementById('oneGRecordingPlayback'); if (audio) { audio.pause?.(); audio.removeAttribute('src'); audio.hidden = true; } if (audioUrl) root.URL.revokeObjectURL(audioUrl); audioUrl = null; }
  function cleanup() { cleanupRecording(); clearTimeout(audioTimer); audioTimer = null; if (audioContext) { audioContext.close?.(); audioContext = null; } }
  function reset() { cleanup(); activeKey = storageKey(); state = blank(); try { root.sessionStorage?.removeItem(activeKey); } catch (_) {} }
  function bind(container = root.document) {
    const map = container.querySelector?.('.experience-1g-map'), phone = container.querySelector?.('.experience-1g-phone');
    if (!map || !phone || phone.dataset.bound === 'true') return;
    load(); phone.dataset.bound = 'true'; let pointer = null;
    const move = event => {
      if (pointer !== event.pointerId) return;
      const rect = map.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0) || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      const x = clamp((event.clientX - rect.left) / rect.width * 100, 7, 93), y = clamp((event.clientY - rect.top) / rect.height * 100, 10, 88);
      state.x = x; state.y = y; state.moves += 1; phone.style.left = `${x}%`; phone.style.top = `${y}%`;
      const signal = signalAt(x, y), meter = container.querySelector('#oneGSignalMeter'), label = container.querySelector('#oneGSignalLabel');
      if (meter) meter.value = signal; if (label) label.textContent = `${signal}% · ${signal >= 64 ? '达到模拟呼叫条件' : '信号不足'}`;
      if (state.moves >= 5 && signal < 64) statusText('提示：信号不仅受距离影响，高楼遮挡和开阔区域也会改变模拟结果。');
    };
    phone.addEventListener('pointerdown', event => { if (pointer !== null || (event.button !== undefined && event.button !== 0)) return; load(); pointer = event.pointerId; phone.setPointerCapture?.(pointer); event.preventDefault(); });
    phone.addEventListener('pointermove', move);
    const end = event => { if (pointer !== event.pointerId) return; pointer = null; state.x = parseFloat(phone.style.left) || state.x; state.y = parseFloat(phone.style.top) || state.y; save(); };
    phone.addEventListener('pointerup', end); phone.addEventListener('pointercancel', end); phone.addEventListener('lostpointercapture', end);
  }
  function render(era, legacyRecorded = false) {
    if (era?.id !== '1G') return '';
    load(); const done = doneSet();
    const recovered = recoveredPhase();
    if (recovered === 'summary') state.phase = 'summary';
    else if (recovered === 'ready' && state.phase !== 'family') state.phase = 'ready';
    else if (recovered === 'locate' && state.phase === 'dial') state.phase = 'locate';
    const signal = signalAt(state.x, state.y), allDone = done.has('EXPERIENCE_1G_CALL') && done.has('EXPERIENCE_1G_COVERAGE') && done.has('EXPERIENCE_1G_RECONNECT');
    const keypad = `<div class="oneg-keypad" aria-label="模拟实体数字键盘">${['1','2','3','4','5','6','7','8','9','clear','0','back'].map(key => `<button type="button" class="oneg-key" onclick="CommsArchive1GPhone.press('${key}')" aria-label="${key==='clear'?'清空号码':key==='back'?'删除一位':`输入${key}`}">${key==='clear'?'清空':key==='back'?'⌫':key}</button>`).join('')}</div>`;
    let interaction = '';
    if (state.phase === 'dial') interaction = `<section class="oneg-dial-panel"><h4>先尝试拨号</h4><p>屏幕上的<strong>000-0000</strong>是展厅虚构教学号码。设备只进行本地模拟，不会连接电话网络，也不会拨打真实号码。</p><div class="oneg-phone-shell"><div class="oneg-phone-screen"><span>模拟拨号</span><strong id="oneGNumber">${formatNumber(state.digits)}</strong><small>信号 ${signal}%</small></div>${keypad}<div class="oneg-phone-actions"><button class="btn" type="button" onclick="CommsArchive1GPhone.dial()">拨号</button><button class="btn secondary" type="button" onclick="CommsArchive1GPhone.hangup()">挂断</button></div></div><p id="oneGCallStatus" class="oneg-live-status" role="status" aria-live="polite">${escapeHtml(state.message)}</p></section>`;
    else if (state.phase === 'locate' || state.phase === 'ready') interaction = `<section class="oneg-coverage-stage"><div class="oneg-coverage-header"><div><h4>寻找稳定信号</h4><p>按住并拖动电话，在街区中比较无线覆盖。高楼遮挡、路径和开阔地都会影响这个简化模拟。</p></div><div class="oneg-meter"><span>模拟信号</span><strong id="oneGSignalLabel">${signal}% · ${signal >= 64 ? '达到模拟呼叫条件' : '信号不足'}</strong><meter id="oneGSignalMeter" min="0" max="100" value="${signal}">${signal}%</meter></div></div><div class="experience-1g-map" aria-label="可拖动电话寻找信号的1980年代街区示意"><div class="oneg-road road-a"></div><div class="oneg-road road-b"></div><div class="oneg-building b1">街区</div><div class="oneg-building b2">楼群</div><div class="oneg-building b3">住宅</div><div class="oneg-building b4">办公楼</div><div class="oneg-open-area">开阔道路</div><div class="oneg-tower" aria-label="基站示意">▴<small>基站</small></div><button type="button" class="experience-1g-phone" style="left:${state.x}%;top:${state.y}%" aria-label="按住并拖动模拟移动电话" title="拖动电话寻找信号">☎</button></div><p id="oneGCallStatus" class="oneg-live-status" role="status" aria-live="polite">${escapeHtml(state.message)}</p>${state.phase==='ready'?'<div class="oneg-redial"><p>在覆盖较好的位置再次拨号联系家人。</p><div class="oneg-phone-screen"><span>模拟拨号 · 号码 000-0000</span><strong id="oneGNumber">'+formatNumber(state.digits)+'</strong></div>'+keypad+'<div class="oneg-phone-actions"><button class="btn" type="button" onclick="CommsArchive1GPhone.dial()">再次拨号</button><button class="btn secondary" type="button" onclick="CommsArchive1GPhone.hangup()">挂断</button></div></div>':'<button class="btn secondary" type="button" onclick="CommsArchive1GPhone.confirmCoverage()">在当前位置测试并确认覆盖</button>'}</section>`;
    else if (state.phase === 'family') interaction = `<section class="oneg-family-call"><span class="eyebrow">模拟通话 · 虚构对白</span><h4>家人接听了</h4><div class="oneg-conversation" role="status" aria-live="polite">${state.familyIndex < FAMILY_LINES.length ? `<p>家人：${FAMILY_LINES[state.familyIndex]}</p>` : '<p>对话结束。你可以选择是否用现代浏览器录下一句话。</p>'}</div>${state.familyIndex < FAMILY_LINES.length ? '<button class="btn" type="button" onclick="CommsArchive1GPhone.nextFamilyLine()">继续通话 →</button>' : `<section class="oneg-recording"><h5>可选：给家人留一句话</h5><p>这是现代浏览器的可选录音互动，不是1G时代的语音留言功能。点击录音时才会请求麦克风权限；音频仅保留在本次页面会话，不上传、不写入存档。也可以直接结束通话。</p><div class="tools"><button class="btn secondary" type="button" onclick="CommsArchive1GPhone.startRecording()">开始录音</button><button class="btn ghost" type="button" onclick="CommsArchive1GPhone.stopRecording()">停止录音</button><button class="btn ghost" type="button" onclick="CommsArchive1GPhone.cleanupRecording()">重录 / 清除</button><button class="btn" type="button" onclick="CommsArchive1GPhone.finishCall()">结束通话并查看总结</button></div><p id="oneGRecordingStatus" class="muted" role="status" aria-live="polite">录音完全可选；不授权或不录音也能完成体验。</p><audio id="oneGRecordingPlayback" controls hidden></audio></section>`}</section>`;
    else interaction = `<section class="oneg-summary"><span class="status done">1G移动通话体验完成</span><h4>从呼叫失败到听见家人的声音</h4><p>你刚才经历的是早期移动通信的一次模拟呼叫。初次呼叫未建立，随后你移动电话、比较信号并在满足本次模拟条件后重新拨号。</p><ul><li>无线信号会受距离、建筑遮挡、传播路径和网络规划等因素影响，不能只用“离基站越近越好”解释。</li><li>早期移动电话体积较大，网络覆盖与可用通话资源有限；稳定移动通话需要终端、无线接入和网络共同工作。</li><li>移动电话让人们有机会摆脱固定电话线路，在外出时联系远方的人。</li></ul><p>这是展厅教学模拟，不复现某一真实街区或历史通话。</p><button class="btn" type="button" onclick="recordGuidedExperience()">记录时代影响，返回本时代调查 →</button></section>`;
    return `<div class="experience-1g"><div class="eyebrow">生活现场 / 1G · 交互模拟</div><h3>寻找能够接通的信号</h3><section class="guided-section oneg-context"><h4>1980年代早期移动通信情境</h4><h5>普通用户的通信场景</h5><p>${escapeHtml(era.moment)}</p><p class="muted">电话外观与街区均为本项目绘制的教学示意，不是历史实物复原。</p></section><div class="oneg-stepper" aria-label="体验阶段"><span class="${state.phase==='dial'?'active':''}">输入号码</span><i>→</i><span class="${['locate','ready'].includes(state.phase)?'active':''}">寻找信号</span><i>→</i><span class="${['family','summary'].includes(state.phase)?'active':''}">联系家人</span></div>${interaction}${legacyRecorded&&!allDone?'<div class="feedback"><strong>旧存档中的时代影响记录已保留。</strong><br>下方模拟可重新体验，不会撤销既有记录。</div>':''}</div>`;
  }
  root.CommsArchive1GPhone = { render, bind, press, dial, hangup, confirmCoverage, nextFamilyLine, finishCall, startRecording, stopRecording, cleanupRecording, cleanup, reset, signalAt, getState: () => ({ ...load() }) };
  const appRoot = root.document?.getElementById('app');
  if (appRoot && typeof root.MutationObserver === 'function') new root.MutationObserver(() => {
    const currentOwner = appRoot.querySelector('.experience-1g');
    if (recordingOwner && recordingOwner !== currentOwner) cleanupRecording();
    if (currentOwner) { if (appRoot.querySelector('.experience-1g-phone')) bind(appRoot); }
    else cleanup();
  }).observe(appRoot, { childList: true, subtree: true });
  root.addEventListener?.('pagehide', cleanup);
})(window);
