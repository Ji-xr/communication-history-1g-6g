/* 《通信简史：从1G到6G》启动健康检查：核对真实运行接口和异步3D加载阶段。 */
(function (root) {
  'use strict';

  let checks = [];
  let panel = null;
  let badge = null;
  const ERA_IDS = ['1G', '2G', '3G', '4G', '5G', '6G'];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function item(module, status, label, detail, reason = null, note = false) {
    return { module, status, label, detail, reason, note, ok: status !== 'failed' && status !== 'pending' };
  }

  function checkApp() {
    const app = root.CommsArchiveApp;
    if (app?.status === 'ready' && root.document?.querySelector('#app') && typeof root.render === 'function') {
      return item('app.js', 'ready', '页面与交互脚本', '首页已完成首次渲染；页面导航与章节入口已注册。');
    }
    const reason = app?.reason || (!app ? '未找到 app.js 完成首次渲染后登记的 CommsArchiveApp 状态。' : `app.js 状态为 ${app.status || '未知'}。`);
    return item('app.js', 'failed', '页面脚本检查未通过', '页面核心脚本没有报告初始化完成。', reason);
  }

  function checkLan() {
    const lan = root.CommsArchiveLan;
    const missing = [];
    if (!lan) missing.push('window.CommsArchiveLan');
    if (typeof lan?.trigger !== 'function') missing.push('CommsArchiveLan.trigger()');
    if (typeof lan?.onTaskStart !== 'function') missing.push('CommsArchiveLan.onTaskStart()');
    if (missing.length) return item('lan-system.js', 'failed', '澜系统未就绪', '对白和任务提示接口尚不可用。', `缺少：${missing.join('、')}`);
    return item('lan-system.js', 'ready', '澜科研伙伴系统', '对白、时代触发和任务提示接口可用。');
  }

  function checkContent() {
    const model = root.CommsArchiveContent;
    const registration = root.CommsArchiveRuntimeContentStatus;
    if (registration?.status === 'failed') {
      return item('runtime-content.js', 'failed', '时代资料检查未通过', '兼容资料注册脚本执行失败。', registration.reason || '未提供失败原因。');
    }
    if (!model) {
      return item('content-model.js', 'failed', '时代资料检查未通过', '统一内容模型尚未创建。', '未找到 window.CommsArchiveContent；检查 runtime-content.js 是否在 app.js 后加载。');
    }
    const missing = [];
    for (const id of ERA_IDS) {
      const era = model.getEra?.(id);
      if (!era) { missing.push(`${id}时代`); continue; }
      const tasks = (model.tasks || []).filter(task => task.eraId === id || task.era === id);
      for (const kind of ['技术理解', '时代问题调查']) {
        const task = tasks.find(candidate => candidate.kind === kind);
        if (!task) { missing.push(`${id}${kind}`); continue; }
        if (!task.id || !task.title || !task.description || !Array.isArray(task.options) || !task.options.length || !Array.isArray(task.feedback) || !task.feedback.length) {
          missing.push(`${id}${kind}字段`);
        }
      }
    }
    if (missing.length) return item('content-model.js', 'failed', '时代资料检查未通过', '至少一代或一项核心任务未通过实际数据检查。', `缺少或不完整：${missing.join('、')}`);
    const integrity = model.checkCompleteness?.();
    if (integrity && !integrity.ok) return item('content-model.js', 'failed', '时代资料检查未通过', `内容模型发现 ${integrity.errorCount} 项结构问题。`, integrity.errors.slice(0, 6).join('；'));
    return item('runtime-content.js', 'ready', '六代历史与任务资料', `已注册 ${model.eras.length} 个时代、${model.tasks.length} 项任务、${model.exhibits.length} 件展品和 ${model.images.length} 项图像资料。`);
  }

  function checkArchives() {
    const model = root.CommsArchiveContent;
    if (!model) return item('era-archive-data', 'failed', '档案资料检查未通过', '统一内容模型未创建，不能核对证据关联。', '先查看“时代资料检查”的注册错误。');
    const missing = [];
    for (const id of ERA_IDS) {
      const era = model.getEra?.(id);
      const evidence = (model.evidenceDefinitions || []).filter(record => record.eraId === id || record.era === id);
      if (!era?.summary?.technicalAchievement || !era?.summary?.historicalImpact || !evidence.length) missing.push(`${id}年代总结或证据定义`);
    }
    for (const id of ['3G', '4G', '5G', '6G']) if (!root[`EraArchive${id}`]) missing.push(`EraArchive${id}`);
    if (!Array.isArray(root.ArchiveEvidence6G) || root.ArchiveEvidence6G.length === 0) missing.push('ArchiveEvidence6G');
    if (missing.length) return item('era-archive-data', 'failed', '档案资料检查未通过', '时代总结或证据来源尚未完整注册。', `缺少：${missing.join('、')}`);
    return item('era-archive-data', 'ready', '年代档案资料', `六代总结与证据关联可查询；3G—6G档案脚本和 ${root.ArchiveEvidence6G.length} 条6G研究情境证据已注册。`);
  }

  function checkExhibition() {
    if (root.COMMS_ARCHIVE_3D_DISABLED === true) {
      return item('2D exhibition', 'ready', '当前使用稳定二维浏览模式', '三维长廊已由页面配置关闭；二维章节、展品、任务与档案可继续使用。');
    }
    const status = root.CommsArchive3DStatus || {};
    if (status.status === 'failed') {
      return item('2D exhibition', 'ready', '三维长廊暂不可用，二维浏览可用', '三维加载或渲染发生错误；仍可使用时代航线进入二维章节。', status.reason || '三维模块未提供失败原因，请重试进入长廊。', true);
    }
    if (typeof root.CommunicationsHistory3D?.mount === 'function') {
      if (status.stage === 'first-frame-rendered' && status.status === 'ready') {
        return item('2D exhibition', 'ready', '三维时空长廊与二维浏览', '三维模块已注册，当前长廊已完成首帧渲染；二维章节与档案也可使用。');
      }
      return item('2D exhibition', 'ready', '三维长廊接口与二维浏览', '三维模块接口已注册；WebGL与首帧渲染将在进入长廊时验证，二维章节与档案可使用。');
    }
    return item('2D exhibition', 'pending', '三维长廊模块加载中', '正在等待三维模块注册；二维章节与档案可使用。', status.reason || null);
  }

  function checkStorage() {
    const key = `commsArchive.healthProbe.${Date.now()}`;
    try {
      root.localStorage.setItem(key, 'ok');
      const good = root.localStorage.getItem(key) === 'ok';
      root.localStorage.removeItem(key);
      return good
        ? item('localStorage', 'ready', '本地存档', '浏览器本地保存和读回可用。')
        : item('localStorage', 'failed', '本地存档受限', '浏览器未能读回刚写入的检查记录。', '建议检查浏览器存储权限，并导出 JSON 备份。');
    } catch (error) {
      return item('localStorage', 'failed', '本地存档受限', '当前浏览器限制本地存储；可继续浏览。', `${error?.message || '存储访问失败'}。建议保留 JSON 备份。`);
    }
  }

  function inspect() {
    checks = [checkApp(), checkLan(), checkContent(), checkArchives(), checkExhibition(), checkStorage()];
    draw();
    return { ok: checks.every(check => check.ok), checks: checks.map(check => ({ ...check })) };
  }

  function ensureUI() {
    if (!root.document?.body || badge) return;
    badge = root.document.createElement('button');
    badge.type = 'button';
    badge.className = 'health-badge';
    badge.setAttribute('aria-expanded', 'false');
    badge.textContent = '启动检查';
    badge.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      badge.setAttribute('aria-expanded', String(!panel.hidden));
    });
    panel = root.document.createElement('section');
    panel.className = 'health-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', '启动健康检查');
    root.document.body.append(badge, panel);
  }

  function close() {
    if (panel) panel.hidden = true;
    badge?.setAttribute('aria-expanded', 'false');
  }

  function draw() {
    ensureUI();
    if (!panel) return;
    const good = checks.filter(check => check.ok && !check.note).length;
    badge.textContent = `启动检查 · ${good}/${checks.length} 可用`;
    badge.classList.toggle('has-warning', checks.some(check => !check.ok || check.note));
    const allOperational = checks.every(check => check.ok);
    panel.innerHTML = `<div class="health-panel-head"><div><span class="eyebrow">SYSTEM READY CHECK</span><h2>通信简史：从1G到6G启动检查</h2><p>${allOperational ? '核心内容已就绪；展厅状态和三维验证阶段见下方检查。' : '部分模块仍在初始化或检查未通过，详情列出了状态和受影响模块。'}</p></div><button type="button" class="health-close" aria-label="关闭">×</button></div><ul>${checks.map(check => `<li class="${check.ok ? (check.note ? 'note' : 'ready') : 'warning'}"><b>${check.ok ? (check.note ? '!' : '✓') : '!'}</b><span><strong>${escapeHtml(check.label)}</strong><small>${escapeHtml(check.detail)}</small>${check.reason ? `<small class="health-reason">原因：${escapeHtml(check.reason)}</small>` : ''}<small class="health-module">${escapeHtml(check.module)} · ${escapeHtml(check.status)}</small></span></li>`).join('')}</ul><div class="health-actions"><button type="button" class="btn secondary health-retry">重新检查</button><button type="button" class="quiet health-dismiss">关闭</button></div>`;
    panel.querySelector('.health-close')?.addEventListener('click', close);
    panel.querySelector('.health-dismiss')?.addEventListener('click', close);
    panel.querySelector('.health-retry')?.addEventListener('click', inspect);
  }

  const api = { run: inspect, inspect, refresh: inspect, get report() { return checks.map(check => ({ ...check })); } };
  root.SystemHealthCheck = api;
  const refreshOnModuleChange = () => inspect();
  ['comms-archive-app-ready', 'comms-archive-app-failed', 'comms-archive-content-ready', 'comms-archive-content-failed', 'comms-archive-three-api-ready', 'comms-archive-three-module-ready', 'comms-archive-three-script-error', 'comms-archive-three-module-error', 'comms-archive-gallery-ready', 'comms-archive-gallery-error'].forEach(type => root.addEventListener?.(type, refreshOnModuleChange));
  if (root.document?.readyState === 'loading') {
    root.addEventListener?.('load', () => setTimeout(inspect, 0), { once: true });
    root.document.addEventListener('DOMContentLoaded', () => setTimeout(inspect, 0), { once: true });
  } else {
    setTimeout(inspect, 0);
  }
})(window);
