/* Conversational delivery with system voices; captions and progression stay separate. */
(function (root) {
  'use strict';
  const synth = root.speechSynthesis;
  const systemSupported = !!synth && typeof root.SpeechSynthesisUtterance === 'function';
  const catalog = root.LanVoiceCatalog || {};
  const naturalAvailable = typeof root.Audio === 'function' && Object.keys(catalog).length > 0;
  const supported = systemSupported || naturalAvailable;
  const key = 'commsArchive.lanVoice.v1';
  const profiles = {
    warm: [.97, 1.03], nostalgia: [.93, 1.00], research: [.97, 1.00],
    thinking: [.95, 1.01], curious: [1.02, 1.06], expecting: [1.01, 1.05],
    encourage: [1.00, 1.04], success: [1.03, 1.05], happy: [1.04, 1.06]
  };
  let generation = 0, timer = null, parts = [], cursor = 0, playing = false;
  let paused = false, utteranceActive = false, options = {}, ui = null, status = 'idle', media = null;
  const scopeKey = () => root.DemoManager?.storageKey?.(key) || key;
  function prefs() {
    let value = {};
    try { value = JSON.parse(root.localStorage?.getItem(scopeKey()) || '{}') || {}; } catch (_) {}
    return { voice: typeof value.voice === 'string' ? value.voice : '',
      style: value.style === 'calm' ? 'calm' : 'conversation',
      speed: [.9, 1, 1.1].includes(Number(value.speed)) ? Number(value.speed) : 1 };
  }
  function voices() { try { return systemSupported ? synth.getVoices().filter(v => /^zh(?:[-_]|$)|^cmn(?:[-_]|$)/i.test(v.lang)) : []; } catch (_) { return []; } }
  function chooseVoice(list, preferred) {
    const exact = list.find(v => v.voiceURI === preferred);
    if (exact) return exact;
    return [...list].sort((a, b) => score(b) - score(a))[0] || null;
  }
  function score(v) {
    return (/^zh[-_]CN$/i.test(v.lang) ? 100 : /^cmn/i.test(v.lang) ? 90 : /^zh[-_](TW|HK)$/i.test(v.lang) ? 20 : 40)
      + (/Xiaoxiao|Huihui|Tingting|晓晓|慧慧|婷婷/i.test(v.name) ? 8 : 0)
      + (/Natural|Online|自然/i.test(v.name) ? 4 : 0) + (v.localService ? 2 : 0);
  }
  function pronunciation(text) {
    return String(text || '').normalize('NFC')
      .replace(/\b([1-6])G\b/gi, (_, n) => '一二三四五六'[Number(n) - 1] + '代移动通信')
      .replace(/\bAI\b/gi, '人工智能').replace(/\bWi-Fi\b/gi, '无线网络')
      .replace(/\b([A-Z]{2,5})\b/g, word => word.split('').join(' '))
      .replace(/https?:\/\/\S+/g, '资料链接').trim();
  }
  function segments(text) {
    // Keep clauses together so the engine retains prosody; bound long utterances.
    const result = [];
    for (const sentence of pronunciation(text).match(/[^。！？!?；;\n]+[。！？!?；;]?|\n+/g) || []) {
      if (!sentence.trim()) continue;
      let rest = sentence.trim();
      while (rest.length > 110) {
        let end = Math.max(rest.lastIndexOf('，', 100), rest.lastIndexOf('、', 100), rest.lastIndexOf(' ', 100));
        if (end < 40) end = 95;
        result.push(rest.slice(0, end + 1)); rest = rest.slice(end + 1).trim();
      }
      if (rest) result.push(rest);
    }
    return result;
  }
  function setStatus(value) { status = value; refresh(); }
  function duck(value) { root.ExhibitionSoundtrack?.setDucked(value, 'speech'); }
  function cancel() {
    generation++; if (timer !== null) root.clearTimeout(timer); timer = null;
    parts = []; cursor = 0; playing = false; paused = false; utteranceActive = false;
    if (media) { const previous = media; media = null; previous.onended = previous.onerror = previous.onplaying = null; previous.pause(); }
    if (systemSupported) synth.cancel(); duck(false); setStatus('idle');
  }
  function finish(value = 'idle') {
    playing = false; utteranceActive = false; timer = null; parts = []; media = null; duck(false); setStatus(value);
  }
  function deliver(token) {
    if (token !== generation || !playing || paused) return;
    if (cursor >= parts.length) { finish('done'); return; }
    const preference = prefs(), voice = chooseVoice(voices(), preference.voice);
    const profile = preference.style === 'calm' ? [.93, 1] : (profiles[options.emotion] || profiles.warm);
    const part = parts[cursor++], utterance = new root.SpeechSynthesisUtterance(part);
    utterance.lang = voice?.lang || 'zh-CN'; if (voice) utterance.voice = voice;
    // Demo text speed must not make dialogue rush at 1.7x.
    utterance.rate = Math.min(1.16, Math.max(.82, profile[0] * preference.speed));
    utterance.pitch = /[？?]$/.test(part) ? Math.min(1.1, profile[1] + .02) : profile[1];
    utterance.volume = 1; utteranceActive = true;
    utterance.onstart = () => { if (token === generation) setStatus('speaking'); };
    utterance.onend = () => {
      if (token !== generation || !playing) return;
      utteranceActive = false;
      if (cursor >= parts.length) { finish('done'); return; }
      if (!paused) timer = root.setTimeout(() => { timer = null; deliver(token); }, /[？?！!]$/.test(part) ? 170 : 230);
    };
    utterance.onerror = event => {
      if (token !== generation || !playing) return;
      finish(event.error === 'not-allowed' ? 'blocked' : 'error');
    };
    try { synth.speak(utterance); } catch (_) { finish('error'); }
  }
  function speak(text, meta = {}) {
    cancel(); if (!supported) { setStatus('unsupported'); return false; }
    if (root.document?.visibilityState === 'hidden') return false;
    if (naturalAvailable && !prefs().voice) return speakNatural(text);
    if (!systemSupported) { setStatus('unsupported'); return false; }
    parts = segments(text); if (!parts.length) return false;
    options = meta; playing = true; duck(true); setStatus('loading'); deliver(generation); return playing || status === 'done';
  }
  function playMedia(token) {
    if (token !== generation || !media) return;
    try {
      const promise = media.play();
      promise?.catch?.(error => {
        if (token !== generation || !playing || paused) return;
        finish(error.name === 'NotAllowedError' ? 'blocked' : 'audioerror');
      });
    } catch (_) { finish('audioerror'); }
  }
  function speakNatural(text) {
    const source = catalog[String(text || '').trim()];
    if (!source) { setStatus('missing'); return false; }
    const preference = prefs(), token = generation;
    media = new root.Audio(source); media.preload = 'auto';
    media.playbackRate = Math.min(1.1, Math.max(.85, preference.speed * (preference.style === 'calm' ? .94 : 1)));
    media.preservesPitch = true;
    media.onplaying = () => { if (token === generation && playing && !paused) setStatus('speaking'); };
    media.onended = () => { if (token === generation && playing) finish('done'); };
    media.onerror = () => { if (token === generation && playing) finish('audioerror'); };
    playing = true; duck(true); setStatus('loading'); playMedia(token); return playing;
  }
  function visibility() {
    if (!playing) return;
    if (root.document?.visibilityState === 'hidden') {
      paused = true; if (timer !== null) root.clearTimeout(timer); timer = null;
      if (media) media.pause(); else if (utteranceActive) synth.pause(); duck(false); setStatus('paused');
    } else if (paused) {
      paused = false; duck(true); setStatus('loading');
      if (media) playMedia(generation); else if (utteranceActive) synth.resume(); else deliver(generation);
    }
  }
  function refresh() {
    if (!ui) return;
    const preference = prefs(), list = voices(), select = ui.querySelector('[data-voice-name]');
    const signature = list.map(v => v.voiceURI + v.name).join('|');
    if (select.dataset.signature !== signature) {
      select.replaceChildren();
      const add = (value, label) => { const option = root.document.createElement('option'); option.value = value; option.textContent = label; select.append(option); };
      add('', naturalAvailable ? '澜 · 自然神经人声（内置音频）' : '自动选择中文声线');
      if (naturalAvailable && systemSupported) add('system', '系统中文朗读（备用）');
      list.forEach(v => add(v.voiceURI, v.name + ' · ' + v.lang)); select.dataset.signature = signature;
    }
    select.value = preference.voice === 'system' || list.some(v => v.voiceURI === preference.voice) ? preference.voice : '';
    ui.querySelector('[data-voice-style]').value = preference.style;
    ui.querySelector('[data-voice-speed]').value = String(preference.speed);
    ui.querySelectorAll('select, button').forEach(el => { el.disabled = !supported; });
    const chosen = chooseVoice(list, preference.voice);
    const labels = { idle: '等待朗读', loading: '正在准备人声', speaking: '正在朗读', paused: '页面已隐藏，朗读暂停', done: '本句朗读完毕', blocked: '浏览器阻止了播放，请点击“朗读本句”重试', error: '当前声线播放失败，请更换声线后重试', audioerror: '自然人声音频播放失败，请重试或检查文件是否完整', missing: '这句暂无内置人声，可阅读字幕或选择系统备用声线', unsupported: '此浏览器不支持当前语音方式' };
    ui.querySelector('[data-voice-status]').textContent = !supported ? labels.unsupported : labels[status] + '；' + (naturalAvailable && !preference.voice ? '澜 · 晓晓自然神经人声' : chosen ? chosen.name : '系统中文声线（尚未列出可选声线）');
  }
  function mount(box) {
    if (!box?.querySelector || !root.document?.createElement) return;
    let panel = box.querySelector('.lan-voice-settings');
    if (!panel) {
      panel = root.document.createElement('details'); panel.className = 'lan-voice-settings'; panel.setAttribute('data-lan-no-advance', '');
      panel.innerHTML = '<summary>人声设置与试听</summary><div class="lan-voice-fields"><label>中文声线<select data-voice-name aria-label="中文声线"></select></label><label>表达方式<select data-voice-style aria-label="表达方式"><option value="conversation">自然对话</option><option value="calm">安静讲述</option></select></label><label>朗读速度<select data-voice-speed aria-label="朗读速度"><option value="0.9">舒缓</option><option value="1">标准</option><option value="1.1">轻快</option></select></label></div><div class="lan-voice-buttons"><button type="button" data-voice-preview>试听人声</button><button type="button" data-voice-stop>停止朗读</button></div><p data-voice-status role="status" aria-live="polite"></p><small>默认播放内置自然神经人声，随对白情绪调整表达；系统声线仅供备用。试听不改变剧情进度。</small>';
      panel.addEventListener('change', () => {
        const value = { voice: panel.querySelector('[data-voice-name]').value, style: panel.querySelector('[data-voice-style]').value, speed: Number(panel.querySelector('[data-voice-speed]').value) };
        try { root.localStorage?.setItem(scopeKey(), JSON.stringify(value)); } catch (_) {}
        cancel(); refresh();
      });
      panel.querySelector('[data-voice-preview]').addEventListener('click', () => speak('你好，我是澜。咦，这段通话怎么突然断了？先别急，我们一起找找原因。你看，信号在这里变弱了。没错，就是这条线索！来，我们再试一次。', { emotion: 'curious' }));
      panel.querySelector('[data-voice-stop]').addEventListener('click', cancel);
      box.append(panel);
    }
    ui = panel; refresh();
  }
  synth?.addEventListener?.('voiceschanged', refresh);
  root.document?.addEventListener?.('visibilitychange', visibility);
  root.addEventListener?.('pagehide', cancel);
  root.LanVoice = { supported, speak, cancel, mount, refresh, segments, chooseVoice,
    get state() { return { status, playing, paused, remaining: Math.max(0, parts.length - cursor), preferences: prefs(), voices: voices().map(v => ({ name: v.name, lang: v.lang, uri: v.voiceURI })) }; } };
})(window);
