/* 《通信简史》可选短提示音；不创建持续播放的背景振荡器。 */
(function (root) {
  'use strict';
  const LEGACY_MEMORY_KEY = 'commsArchive.lanMemory.v1';
  const AUDIO_PREFS_KEY = 'commsArchive.audioPreferences.v2';
  const UI_PREFS_KEY = 'commsArchive.experienceSettings.v1';
  const AUDIO_PREFS_VERSION = 2;
  const COOLDOWN_MS = { archive: 1800, complete: 450, dialogue: 180, exhibit: 220, click: 120 };
  let state = readSettings(), uiPrefs = readUiPrefs(), context = null, master = null, panel = null, statusNode = null, returnFocus = null;
  let firstClickBound = false, userGestureSeen = false;
  const activeSources = new Set(), lastEffectAt = new Map(), playedKeys = new Set();
  function storageKey(key) { return root.DemoManager?.storageKey?.(key) || key; }
  function storageGet(key) { return root.localStorage.getItem(storageKey(key)); }
  function storageSet(key, value) { return root.localStorage.setItem(storageKey(key), value); }
  function clamp(value, fallback = 70) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : fallback; }

  function readSettings() {
    try {
      const current = JSON.parse(storageGet(AUDIO_PREFS_KEY) || 'null');
      if (current?.version === AUDIO_PREFS_VERSION) return { enabled: current.enabled === true, volume: clamp(current.volume), currentTrack: 'archive_hall', era: null };
      // Legacy enabled=true also enabled an ambient bed. Do not silently turn that into effects.
      // Keep the user's former volume, but require an explicit opt-in to the new short effects.
      const legacy = JSON.parse(storageGet(LEGACY_MEMORY_KEY) || '{}')?.settings?.audio || {};
      return { enabled: false, volume: clamp(legacy.volume), currentTrack: 'archive_hall', era: null };
    } catch (_) { return { enabled: false, volume: 70, currentTrack: 'archive_hall', era: null }; }
  }
  function readUiPrefs() {
    const defaults = { brightness: 100, lanMode: 'auto', operationHints: true };
    try {
      const saved = JSON.parse(root.localStorage.getItem(UI_PREFS_KEY) || '{}');
      return { brightness: Number.isFinite(saved.brightness) ? Math.max(80, Math.min(120, saved.brightness)) : defaults.brightness,
        lanMode: ['auto', 'always', 'minimal'].includes(saved.lanMode) ? saved.lanMode : defaults.lanMode,
        operationHints: typeof saved.operationHints === 'boolean' ? saved.operationHints : defaults.operationHints };
    } catch (_) { return defaults; }
  }
  function persistUiPrefs() {
    try { root.localStorage.setItem(UI_PREFS_KEY, JSON.stringify(uiPrefs)); return true; }
    catch (_) { setStatus('体验设置无法保存；本次浏览仍可使用。'); return false; }
  }
  function applyBrightness() {
    const level = uiPrefs.brightness, style = root.document?.body?.style;
    if (!style?.setProperty) return;
    style.setProperty('--brightness-overlay-color', level < 100 ? '#000' : '#fff');
    style.setProperty('--brightness-overlay-blend', level < 100 ? 'multiply' : 'screen');
    style.setProperty('--brightness-overlay-opacity', String(Number(Math.min(.14, Math.abs(level - 100) / 20 * .14).toFixed(3))));
  }
  function applyUiPrefs() {
    applyBrightness();
    if (root.document?.documentElement) root.document.documentElement.dataset.operationHints = uiPrefs.operationHints ? 'on' : 'off';
    root.CommsArchiveLan?.setDisplayPreference?.(uiPrefs.lanMode);
    syncControls();
  }
  function setBrightness(value) {
    const number = Number(value); uiPrefs.brightness = Number.isFinite(number) ? Math.max(80, Math.min(120, number)) : 100;
    persistUiPrefs(); applyBrightness(); syncControls();
  }
  function setLanMode(value) {
    uiPrefs.lanMode = ['auto', 'always', 'minimal'].includes(value) ? value : 'auto';
    persistUiPrefs(); root.CommsArchiveLan?.setDisplayPreference?.(uiPrefs.lanMode); syncControls();
  }
  function setOperationHints(enabled) {
    uiPrefs.operationHints = !!enabled; persistUiPrefs(); applyUiPrefs();
  }
  function persist() {
    try { storageSet(AUDIO_PREFS_KEY, JSON.stringify({ version: AUDIO_PREFS_VERSION, enabled: state.enabled, volume: state.volume })); return true; }
    catch (_) { setStatus('声音设置无法保存；可继续探索。'); return false; }
  }
  function setStatus(message) { if (statusNode) statusNode.textContent = message; }
  function audioIsHidden() { return root.document?.visibilityState === 'hidden'; }
  function applyMasterLevel() { if (master && context) master.gain.setTargetAtTime(state.enabled ? state.volume / 100 : 0, context.currentTime, .015); }
  function createContext() {
    if (!userGestureSeen || !state.enabled || audioIsHidden()) return null;
    if (context) return context;
    const Context = root.AudioContext || root.webkitAudioContext;
    if (!Context) { setStatus('此浏览器不支持本地提示音；不影响探索。'); return null; }
    try {
      context = new Context(); master = context.createGain(); master.gain.value = state.volume / 100; master.connect(context.destination);
      return context;
    } catch (_) { context = null; master = null; setStatus('提示音不可用，不影响探索。'); return null; }
  }
  async function activate() {
    if (!state.enabled || !userGestureSeen || audioIsHidden()) return false;
    const audio = createContext(); if (!audio) return false;
    try { if (audio.state === 'suspended') await audio.resume(); applyMasterLevel(); setStatus('短提示音已开启。'); return true; }
    catch (_) { setStatus('提示音不可用，不影响探索。'); return false; }
  }
  function stopActiveEffects() {
    for (const source of [...activeSources]) {
      try { source.stop(); } catch (_) {}
      try { source.disconnect(); } catch (_) {}
    }
    activeSources.clear();
  }
  function suspendForBackground() {
    stopActiveEffects();
    if (context?.state === 'running') context.suspend().catch(() => {});
  }
  function setEnabled(enabled) {
    state.enabled = !!enabled; persist();
    if (!state.enabled) { stopActiveEffects(); applyMasterLevel(); if (context?.state === 'running') context.suspend().catch(() => {}); setStatus('提示音已关闭。'); }
    else if (userGestureSeen) activate();
    else setStatus('提示音已开启；首次点击后播放。');
    syncControls();
  }
  function setVolume(value) {
    state.volume = clamp(value); persist(); applyMasterLevel(); syncControls();
  }
  function setEra(era) {
    state.era = /^([1-6])G$/.test(String(era || '')) ? String(era).toUpperCase() : null;
    state.currentTrack = state.era ? `era_${state.era.toLowerCase()}` : 'archive_hall';
  }
  function emitEffect(audio, notes) {
    if (audio !== context || !state.enabled || audioIsHidden() || audio.state !== 'running') return false;
    applyMasterLevel();
    const now = audio.currentTime;
    try {
      notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator(), noteGain = audio.createGain();
        const start = now + index * .075, end = start + .2;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        noteGain.gain.setValueAtTime(0, start); noteGain.gain.linearRampToValueAtTime(.13, start + .016); noteGain.gain.exponentialRampToValueAtTime(.001, end);
        oscillator.connect(noteGain); noteGain.connect(master); activeSources.add(oscillator);
        oscillator.onended = () => { activeSources.delete(oscillator); try { oscillator.disconnect(); noteGain.disconnect(); } catch (_) {} };
        oscillator.start(start); oscillator.stop(end + .01);
      });
      return true;
    } catch (_) { stopActiveEffects(); setStatus('提示音不可用；不影响探索。'); return false; }
  }
  function playEffect(kind = 'click', options = {}) {
    if (!userGestureSeen || !state.enabled || audioIsHidden()) return false;
    const patterns = { dialogue: [523.25, 659.25], exhibit: [392, 523.25], complete: [523.25, 659.25, 783.99], archive: [659.25, 783.99, 987.77], click: [440] };
    const name = patterns[kind] ? kind : 'click', now = Date.now(), key = typeof options?.key === 'string' ? options.key : '';
    if (key && playedKeys.has(key)) return false;
    if (now - (lastEffectAt.get(name) || 0) < (COOLDOWN_MS[name] || 180)) return false;
    if (key) { playedKeys.add(key); if (playedKeys.size > 500) playedKeys.clear(); }
    lastEffectAt.set(name, now);
    const audio = createContext(); if (!audio) return false;
    if (audio.state === 'running') return emitEffect(audio, patterns[name]);
    audio.resume().then(() => emitEffect(audio, patterns[name])).catch(() => setStatus('提示音不可用；不影响探索。'));
    return true;
  }
  function syncControls() {
    if (!panel) return;
    const enabled = panel.querySelector('#audioEnabled'), volume = panel.querySelector('#audioVolume'), value = panel.querySelector('#audioVolumeValue');
    if (enabled) { enabled.checked = state.enabled; enabled.setAttribute('aria-checked', String(state.enabled)); }
    if (volume) volume.value = String(state.volume);
    if (value) value.textContent = `${state.volume}%`;
    const brightness = panel.querySelector('#displayBrightness'), brightnessValue = panel.querySelector('#displayBrightnessValue'), lanMode = panel.querySelector('#lanDisplayMode'), hints = panel.querySelector('#operationHints');
    if (brightness) brightness.value = String(uiPrefs.brightness);
    if (brightnessValue) brightnessValue.textContent = `${uiPrefs.brightness}%`;
    if (lanMode) lanMode.value = uiPrefs.lanMode;
    if (hints) { hints.checked = uiPrefs.operationHints; hints.setAttribute('aria-checked', String(uiPrefs.operationHints)); }
  }
  function openSettings() { if (!panel) return; returnFocus = root.document.activeElement; panel.hidden = false; panel.querySelector('.audio-settings-close')?.focus?.(); }
  function closeSettings() { if (panel) panel.hidden = true; returnFocus?.focus?.(); returnFocus=null; }
  function buildSettings() {
    if (panel || !root.document?.body) return;
    panel = root.document.createElement('section'); panel.id = 'audioSettings'; panel.className = 'audio-settings'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'audioSettingsTitle');
    panel.innerHTML = `<div class="audio-settings-card"><button type="button" class="audio-settings-close" aria-label="关闭体验设置">×</button><span class="eyebrow">EXPERIENCE SETTINGS</span><h2 id="audioSettingsTitle">体验设置</h2><section class="settings-group"><h3>声音</h3><label class="audio-toggle"><input id="audioEnabled" type="checkbox"><span>开启短提示音</span></label><label class="audio-volume-label" for="audioVolume">音量 <output id="audioVolumeValue">70%</output></label><input id="audioVolume" type="range" min="0" max="100" step="1"><p class="audio-note">首次访问默认静音。提示音由浏览器实时合成，不是历史现场录音；只在启用后播放短音效。</p></section><section class="settings-group"><h3>显示与陪伴</h3><label class="audio-volume-label" for="displayBrightness">网站亮度 <output id="displayBrightnessValue">100%</output></label><input id="displayBrightness" type="range" min="80" max="120" step="1"><label class="setting-select-label" for="lanDisplayMode">澜显示模式</label><select id="lanDisplayMode"><option value="auto">自动</option><option value="always">始终陪伴</option><option value="minimal">简洁模式</option></select><label class="audio-toggle setting-hints-toggle"><input id="operationHints" type="checkbox"><span>显示操作提示</span></label></section><p id="audioStatus" class="audio-status" role="status" aria-live="polite"></p></div>`;
    root.document.body.append(panel); statusNode = panel.querySelector('#audioStatus');
    panel.querySelector('.audio-settings-close').addEventListener('click', closeSettings);
    panel.addEventListener('click', event => { if (event.target === panel) closeSettings(); });
    panel.querySelector('#audioEnabled').addEventListener('change', event => setEnabled(event.target.checked));
    panel.querySelector('#audioVolume').addEventListener('input', event => setVolume(event.target.value));
    panel.querySelector('#displayBrightness').addEventListener('input', event => setBrightness(event.target.value));
    panel.querySelector('#lanDisplayMode').addEventListener('change', event => setLanMode(event.target.value));
    panel.querySelector('#operationHints').addEventListener('change', event => setOperationHints(event.target.checked));
    root.document.querySelector('#audioSettingsToggle')?.addEventListener('click', openSettings);
    root.document.addEventListener('keydown', event => { if(event.key==='Escape'&&panel&&!panel.hidden)closeSettings(); });
    syncControls();
    if (!firstClickBound) {
      firstClickBound = true;
      const unlock = event => {
        if (!event?.isTrusted) return;
        userGestureSeen = true;
        root.document.removeEventListener('click', unlock, true);
        if (state.enabled) activate();
      };
      root.document.addEventListener('click', unlock, true);
    }
  }
  function init() {
    buildSettings(); applyUiPrefs();
    if (root.document?.addEventListener) root.document.addEventListener('visibilitychange', () => { if (audioIsHidden()) suspendForBackground(); });
    root.addEventListener?.('pagehide', suspendForBackground);
  }
  function reloadSettings() {
    state = readSettings(); uiPrefs = readUiPrefs(); applyUiPrefs();
    if (!state.enabled) { stopActiveEffects(); if (context?.state === 'running') context.suspend().catch(() => {}); }
    else if (context && userGestureSeen && !audioIsHidden() && context.state === 'suspended') context.resume().then(applyMasterLevel).catch(() => {});
    else applyMasterLevel();
    return { ...state, ...uiPrefs };
  }
  const AudioSystem = { init, openSettings, closeSettings, setEnabled, setVolume, setEra, playEffect, reloadSettings, setBrightness, setLanMode, setOperationHints,
    get state() { return { ...state, ...uiPrefs }; } };
  root.AudioSystem = AudioSystem;
  if (root.document?.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(window);
