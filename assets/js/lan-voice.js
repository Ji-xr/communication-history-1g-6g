/* Lan's bundled voice only. Speech never advances a dialogue or route. */
(function (root) {
  'use strict';
  const catalog = root.LanVoiceCatalog || {}, KEY = 'commsArchive.lanVoice.v1';
  const supported = typeof root.Audio === 'function' && Object.keys(catalog).length > 0;
  const SPEEDS = [.9, 1, 1.25, 1.5, 2], cache = new Map(), overrides = new Map();
  const normalize = v => String(v || '').normalize('NFC').replace(/\s+/gu, '');
  const lookup = new Map(Object.entries(catalog).map(([text, src]) => [normalize(text), src]));
  let generation = 0, media = null, playing = false, paused = false, status = 'idle', ui = null;
  let watchdog = null, retryTimer = null, retries = 0, activeText = '', activeScope = '';
  const scopeKey = () => root.DemoManager?.storageKey?.(KEY) || KEY;
  function prefs() {
    let value = overrides.get(scopeKey());
    if (!value) { try { value = JSON.parse(root.localStorage?.getItem(scopeKey()) || '{}'); } catch (_) {} }
    let speed = Number(value?.speed); if (speed === 1.1) speed = 1.25;
    return { voice: 'lan', speed: SPEEDS.includes(speed) ? speed : 1 };
  }
  const sourceFor = text => catalog[String(text || '').trim()] || lookup.get(normalize(text)) || null;
  function duck(value) { root.ExhibitionSoundtrack?.setDucked(value, 'speech'); }
  function setStatus(value) { status = value; refresh(); }
  function clearTimers() {
    if (watchdog !== null) root.clearTimeout(watchdog);
    if (retryTimer !== null) root.clearTimeout(retryTimer);
    watchdog = retryTimer = null;
  }
  function detach(audio) { if (audio) audio.onended = audio.onerror = audio.onplaying = audio.onwaiting = audio.onstalled = null; }
  function cancel() {
    generation++; clearTimers(); playing = paused = false;
    const previous = media; media = null; detach(previous); try { previous?.pause(); } catch (_) {}
    root.speechSynthesis?.cancel?.(); // Stop speech left by old settings; never start system TTS.
    duck(false); setStatus('idle');
  }
  const valid = (token, audio = media) => token === generation && playing && audio === media && activeScope === scopeKey();
  function finish(value) {
    clearTimers(); playing = paused = false;
    const previous = media; media = null; detach(previous); try { previous?.pause(); } catch (_) {}
    duck(false); setStatus(value);
  }
  function obtain(src) {
    let audio = cache.get(src);
    if (audio?.error) { cache.delete(src); audio = null; }
    if (audio) { cache.delete(src); cache.set(src, audio); return audio; }
    try {
      audio = new root.Audio(src); audio.preload = 'auto'; cache.set(src, audio);
      while (cache.size > 6) {
        const oldest = [...cache.keys()].find(key => key !== src && cache.get(key) !== media);
        if (!oldest) break;
        const old = cache.get(oldest); cache.delete(oldest); detach(old); old.pause?.(); old.removeAttribute?.('src'); old.load?.();
      }
      audio.load?.(); return audio;
    } catch (_) { return null; }
  }
  function prepare(lines) {
    if (!supported || root.document?.visibilityState === 'hidden') return;
    for (const line of (Array.isArray(lines) ? lines : [lines]).slice(0, 3)) {
      const src = sourceFor(typeof line === 'string' ? line : line?.dialogue); if (src) obtain(src);
    }
  }
  function rate(audio) { audio.playbackRate = prefs().speed; audio.preservesPitch = true; }
  function armWatchdog(token, audio) {
    if (watchdog !== null) root.clearTimeout(watchdog);
    watchdog = root.setTimeout(() => { watchdog = null; if (valid(token, audio) && !paused) recover(token, 'timeout'); }, 8000);
  }
  function recover(token, reason) {
    if (!valid(token) || paused) return;
    clearTimers();
    if (retries >= 1) { finish(reason === 'timeout' ? 'timeout' : 'audioerror'); return; }
    retries++; setStatus('retrying');
    const previous = media, position = Number.isFinite(previous?.currentTime) ? previous.currentTime : 0;
    detach(previous); try { previous?.pause(); } catch (_) {}
    const src = sourceFor(activeText); cache.delete(src); media = obtain(src);
    if (!media) { finish('audioerror'); return; }
    if (position > 0) { try { media.currentTime = position; } catch (_) {} }
    bind(token, media);
    retryTimer = root.setTimeout(() => { retryTimer = null; if (valid(token) && !paused) playMedia(token); }, 180);
  }
  function bind(token, audio) {
    rate(audio);
    audio.onplaying = () => { if (valid(token, audio) && !paused) { clearTimers(); setStatus('speaking'); } };
    audio.onended = () => { if (valid(token, audio)) finish('done'); };
    audio.onerror = () => { if (valid(token, audio)) recover(token, 'audioerror'); };
    audio.onwaiting = audio.onstalled = () => { if (valid(token, audio) && !paused) { setStatus('buffering'); armWatchdog(token, audio); } };
  }
  function playMedia(token) {
    const audio = media; if (!valid(token, audio) || paused) return;
    armWatchdog(token, audio);
    const rejected = error => {
      if (!valid(token, audio) || paused) return;
      if (error?.name === 'NotAllowedError') finish('blocked'); else recover(token, 'audioerror');
    };
    try {
      audio.play()?.then?.(() => {
        if (valid(token, audio) && !paused && audio.paused === false) { clearTimers(); setStatus('speaking'); }
      }, rejected);
    } catch (error) { rejected(error); }
  }
  function speak(text) {
    cancel(); if (!supported) { setStatus('unsupported'); return false; }
    if (root.document?.visibilityState === 'hidden') return false;
    const src = sourceFor(text); if (!src) { setStatus('missing'); return false; }
    media = obtain(src); if (!media) { setStatus('audioerror'); return false; }
    activeText = String(text); activeScope = scopeKey(); retries = 0;
    try { media.currentTime = 0; } catch (_) {}
    playing = true; paused = false; duck(true); setStatus('loading'); bind(generation, media); playMedia(generation); return true;
  }
  function visibility() {
    if (!playing) return;
    if (activeScope !== scopeKey()) { cancel(); return; }
    if (root.document?.visibilityState === 'hidden') {
      paused = true; clearTimers(); media?.pause(); duck(false); setStatus('paused');
    } else if (paused) {
      paused = false; duck(true); setStatus('loading');
      if (media?.error) recover(generation, 'audioerror'); else playMedia(generation);
    }
  }
  function setSpeed(value) {
    const speed = Number(value); if (!SPEEDS.includes(speed)) return false;
    const saved = { voice: 'lan', speed }; overrides.set(scopeKey(), saved); let ok = true;
    try { root.localStorage?.setItem(scopeKey(), JSON.stringify(saved)); } catch (_) { ok = false; }
    if (media) rate(media); refresh();
    if (!ok && ui) ui.querySelector('[data-voice-status]').textContent += '；倍速本次生效，但设置未能保存。';
    return true;
  }
  function refresh() {
    if (!ui) return;
    ui.querySelector('[data-voice-speed]').value = String(prefs().speed);
    ui.querySelectorAll('select, button').forEach(el => { el.disabled = !supported; });
    const labels = { idle:'等待朗读', loading:'正在加载人声', speaking:'正在朗读', buffering:'正在缓冲人声', retrying:'加载较慢，正在重试一次', paused:'页面已隐藏，人声暂停', done:'本句朗读完毕', blocked:'浏览器阻止了播放，请点击“朗读本句”重试', timeout:'人声加载超时，请点击“朗读本句”重试', audioerror:'人声音频加载失败，请检查网络或本地服务后重试', missing:'本句暂无澜的录音，字幕仍可阅读；不会播放其他声线', unsupported:'当前浏览器无法播放澜的人声，字幕仍可阅读' };
    ui.querySelector('[data-voice-status]').textContent = labels[status] + '；澜 · 自然人声 · ' + prefs().speed + '倍速';
  }
  function mount(box) {
    if (!box?.querySelector || !root.document?.createElement) return;
    let panel = box.querySelector('.lan-voice-settings');
    if (!panel) {
      panel = root.document.createElement('details'); panel.className = 'lan-voice-settings'; panel.setAttribute('data-lan-no-advance', '');
      panel.innerHTML = '<summary>澜的人声与倍速</summary><p>声线：澜 · 自然神经人声</p><div class="lan-voice-fields"><label>朗读倍速<select data-voice-speed aria-label="澜的朗读倍速"><option value="0.9">0.9倍 · 舒缓</option><option value="1">1.0倍 · 标准</option><option value="1.25">1.25倍 · 轻快</option><option value="1.5">1.5倍</option><option value="2">2.0倍</option></select></label></div><div class="lan-voice-buttons"><button type="button" data-voice-preview>试听澜的人声</button><button type="button" data-voice-retry>重读当前句</button><button type="button" data-voice-stop>停止朗读</button></div><p data-voice-status role="status" aria-live="polite"></p><small>标准1.0倍，轻快1.25倍，保留原音高。切换倍速即时生效，不推进剧情。</small>';
      panel.addEventListener('change', () => setSpeed(panel.querySelector('[data-voice-speed]').value));
      panel.querySelector('[data-voice-preview]').addEventListener('click', () => speak('你好，我是澜。咦，这段通话怎么突然断了？先别急，我们一起找找原因。你看，信号在这里变弱了。没错，就是这条线索！来，我们再试一次。'));
      panel.querySelector('[data-voice-retry]').addEventListener('click', () => root.CommsArchiveLan?.readCurrent?.());
      panel.querySelector('[data-voice-stop]').addEventListener('click', cancel); box.append(panel);
    }
    ui = panel; refresh();
  }
  root.document?.addEventListener?.('visibilitychange', visibility); root.addEventListener?.('pagehide', cancel);
  root.LanVoice = { supported, speak, cancel, mount, refresh, prepare, setSpeed,
    get state() { return { status, playing, paused, preferences:prefs(), cached:cache.size, voice:'lan' }; } };
})(window);
