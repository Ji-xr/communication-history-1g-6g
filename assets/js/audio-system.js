/* 《通信简史》本地程序生成氛围音；不加载外部音频或历史录音。 */
(function (root) {
  'use strict';
  const MEMORY_KEY = 'commsArchive.lanMemory.v1';
  const UI_PREFS_KEY = 'commsArchive.experienceSettings.v1';
  const themes = {
    archive_hall: [110, 164.81, 'sine'],
    era_1g: [98, 146.83, 'triangle'],
    era_2g: [110, 164.81, 'sine'],
    era_3g: [123.47, 185, 'sine'],
    era_4g: [130.81, 196, 'triangle'],
    era_5g: [146.83, 220, 'sine'],
    era_6g: [164.81, 246.94, 'sine']
  };
  let state = readSettings(), uiPrefs = readUiPrefs(), context = null, master = null, voices = [], panel = null, statusNode = null, returnFocus = null;
  let firstClickBound = false, userGestureSeen = false;
  function storageKey(key) { return root.DemoManager?.storageKey?.(key) || key; }
  function storageGet(key) { return localStorage.getItem(storageKey(key)); }
  function storageSet(key, value) { return localStorage.setItem(storageKey(key), value); }

  function readSettings() {
    try {
      const stored = JSON.parse(storageGet(MEMORY_KEY) || '{}');
      const audio = stored?.settings?.audio || {};
      return { enabled: typeof audio.enabled === 'boolean' ? audio.enabled : true,
        volume: Number.isFinite(audio.volume) ? Math.max(0, Math.min(100, audio.volume)) : 70,
        currentTrack: 'archive_hall', era: null };
    } catch (_) { return { enabled: true, volume: 70, currentTrack: 'archive_hall', era: null }; }
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
    try {
      const stored = JSON.parse(storageGet(MEMORY_KEY) || '{}');
      stored.settings = stored.settings && typeof stored.settings === 'object' ? stored.settings : {};
      stored.settings.audio = { enabled: state.enabled, volume: state.volume };
      storageSet(MEMORY_KEY, JSON.stringify(stored));
    } catch (_) { setStatus('声音设置无法保存；可继续探索。'); }
  }
  function setStatus(message) { if (statusNode) statusNode.textContent = message; }
  function createContext() {
    if (!userGestureSeen) return null;
    if (context) return context;
    const Context = root.AudioContext || root.webkitAudioContext;
    if (!Context) { setStatus('此浏览器不支持本地音效；不影响探索。'); return null; }
    try {
      context = new Context(); master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
      const first = context.createOscillator(), second = context.createOscillator();
      const firstGain = context.createGain(), secondGain = context.createGain();
      firstGain.gain.value = .52; secondGain.gain.value = .22;
      first.connect(firstGain); second.connect(secondGain); firstGain.connect(master); secondGain.connect(master);
      first.start(); second.start(); voices = [{ oscillator: first, gain: firstGain }, { oscillator: second, gain: secondGain }];
      applyTheme(); return context;
    } catch (_) { context = null; master = null; voices = []; setStatus('音效不可用，不影响探索。'); return null; }
  }
  function applyTheme() {
    if (!context || voices.length < 2) return;
    const theme = themes[state.currentTrack] || themes.archive_hall;
    const now = context.currentTime;
    voices[0].oscillator.type = theme[2]; voices[1].oscillator.type = 'sine';
    voices[0].oscillator.frequency.setTargetAtTime(theme[0], now, .9);
    voices[1].oscillator.frequency.setTargetAtTime(theme[1], now, 1.2);
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(state.enabled ? state.volume / 100 * .035 : 0, now, .8);
  }
  async function activate() {
    if (!state.enabled || !userGestureSeen) return false;
    const audio = createContext(); if (!audio) return false;
    try { if (audio.state === 'suspended') await audio.resume(); applyTheme(); setStatus('本地程序生成的轻柔氛围音已开启。'); return true; }
    catch (_) { setStatus('音效不可用，不影响探索。'); return false; }
  }
  function setEnabled(enabled) {
    state.enabled = !!enabled; persist();
    if (!state.enabled) { if (context) { applyTheme(); if (context.state === 'running') context.suspend().catch(() => {}); } setStatus('氛围音已关闭。'); }
    else if (userGestureSeen) activate();
    else setStatus('氛围音将在首次点击后启动。');
    syncControls();
  }
  function setVolume(value) {
    const number = Number(value); state.volume = Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 70;
    persist(); if (context) { if (context.state === 'suspended' && state.enabled) context.resume().catch(() => {}); applyTheme(); }
    syncControls();
  }
  function setEra(era) {
    state.era = /^([1-6])G$/.test(String(era || '')) ? String(era).toUpperCase() : null;
    state.currentTrack = state.era ? `era_${state.era.toLowerCase()}` : 'archive_hall';
    if (context && state.enabled) { if (context.state === 'suspended') context.resume().catch(() => {}); applyTheme(); }
  }
  function playEffect(kind = 'click') {
    if (!userGestureSeen || !state.enabled || !createContext() || context.state !== 'running') return false;
    const patterns = { dialogue: [523.25, 659.25], exhibit: [392, 523.25], complete: [523.25, 659.25, 783.99], archive: [659.25, 783.99, 987.77], click: [440] };
    const notes = patterns[kind] || patterns.click;
    try {
      const now = context.currentTime, gain = context.createGain(); gain.gain.value = 1; gain.connect(master);
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator(), noteGain = context.createGain();
        const start = now + index * .095; oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        noteGain.gain.setValueAtTime(0, start); noteGain.gain.linearRampToValueAtTime(.11, start + .018); noteGain.gain.exponentialRampToValueAtTime(.001, start + .25);
        oscillator.connect(noteGain); noteGain.connect(gain); oscillator.start(start); oscillator.stop(start + .27);
      });
      return true;
    } catch (_) { setStatus('提示音不可用；不影响探索。'); return false; }
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
  function openSettings() { if (!panel) return; returnFocus = root.document.activeElement; panel.hidden = false; panel.querySelector('.audio-settings-close')?.focus?.(); if (state.enabled && userGestureSeen) activate(); }
  function closeSettings() { if (panel) panel.hidden = true; returnFocus?.focus?.(); returnFocus=null; }
  function buildSettings() {
    if (panel || !root.document?.body) return;
    panel = root.document.createElement('section'); panel.id = 'audioSettings'; panel.className = 'audio-settings'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'audioSettingsTitle');
    panel.innerHTML = `<div class="audio-settings-card"><button type="button" class="audio-settings-close" aria-label="关闭体验设置">×</button><span class="eyebrow">EXPERIENCE SETTINGS</span><h2 id="audioSettingsTitle">体验设置</h2><section class="settings-group"><h3>声音</h3><label class="audio-toggle"><input id="audioEnabled" type="checkbox"><span>开启展厅氛围音与提示音</span></label><label class="audio-volume-label" for="audioVolume">音量 <output id="audioVolumeValue">70%</output></label><input id="audioVolume" type="range" min="0" max="100" step="1"><p class="audio-note">氛围音和提示音由浏览器实时合成，不是历史现场录音。浏览器需在用户操作后播放声音。</p></section><section class="settings-group"><h3>显示与陪伴</h3><label class="audio-volume-label" for="displayBrightness">网站亮度 <output id="displayBrightnessValue">100%</output></label><input id="displayBrightness" type="range" min="80" max="120" step="1"><label class="setting-select-label" for="lanDisplayMode">澜显示模式</label><select id="lanDisplayMode"><option value="auto">自动</option><option value="always">始终陪伴</option><option value="minimal">简洁模式</option></select><label class="audio-toggle setting-hints-toggle"><input id="operationHints" type="checkbox"><span>显示操作提示</span></label></section><p id="audioStatus" class="audio-status" role="status" aria-live="polite"></p></div>`;
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
  function init() { buildSettings(); applyUiPrefs(); if (state.enabled) setStatus('氛围音将在首次点击后开始播放。'); }
  function reloadSettings() { state = readSettings(); uiPrefs = readUiPrefs(); applyUiPrefs(); if (context) { applyTheme(); if (state.enabled && context.state === 'suspended') context.resume().catch(() => {}); if (!state.enabled && context.state === 'running') context.suspend().catch(() => {}); } return { ...state, ...uiPrefs }; }
  const AudioSystem = { init, openSettings, closeSettings, setEnabled, setVolume, setEra, playEffect, reloadSettings, setBrightness, setLanMode, setOperationHints,
    get state() { return { ...state, ...uiPrefs }; } };
  root.AudioSystem = AudioSystem;
  if (root.document?.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(window);
