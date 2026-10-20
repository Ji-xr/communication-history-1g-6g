/* 六代通信生活体验模拟；进度按普通/演示存档分别保存。 */
(function (root) {
  'use strict';
  const scenarios = {
    '1G': {
      EXPERIENCE_1G_CALL: { title: '拨出移动电话', prompt: '拿起早期移动电话，尝试联系远方的家人。', actions: ['拨出测试号码', '确认听筒中的通话状态'], responses: ['呼叫已发出，但城市边缘的无线信号较弱。', '通话断续，移动电话可以发起呼叫，连接仍受覆盖范围限制。'], result: '早期移动电话让通话摆脱固定线路，但稳定连接仍依赖无线覆盖。' },
      EXPERIENCE_1G_COVERAGE: { title: '寻找稳定信号', prompt: '在简化模拟中比较不同位置的覆盖与建筑遮挡条件。', actions: ['查看城市边缘信号', '移到覆盖条件较好处重试'], responses: ['边缘区域的信号明显减弱。', '本次模拟中，新位置的覆盖与遮挡条件更合适，通话改善；信号不只取决于距离。'], result: '用户需要在覆盖有限的网络中寻找更稳定的通话位置。' },
      EXPERIENCE_1G_RECONNECT: { title: '重新联系家人', prompt: '回到信号较强的位置，再拨一次电话。', actions: ['重新发起呼叫', '确认家人接听'], responses: ['电话重新接通。', '听到了家人的回应；一次位置调整改变了真实的通信体验。'], result: '移动通信带来自由联系的可能，也让网络覆盖成为日常生活中的重要条件。' }
    },
    '2G': {
      EXPERIENCE_2G_COMPOSE: { title: '编辑报平安短信', prompt: '对方暂时无法接听电话，写下一条简短消息。', actions: ['输入短信内容', '提交发送请求'], responses: ['短信内容已编辑完成。', '手机已将短信交给移动网络；对方不必同时接听电话。'], result: '数字移动通信让文字信息可以先发送，再等待接收者阅读。' },
      EXPERIENCE_2G_RELAY: { title: '追踪短信转发', prompt: '沿着短信的传递路径查看服务中心状态。', actions: ['检查无线连接状态', '检查短信服务中心转发'], responses: ['手机已接入网络，发送端工作正常。', '短信进入服务中心后等待转发，服务中心配置影响信息能否抵达。'], result: '短信通过网络服务中心转发，数字信息拥有了自己的传递路径。' },
      EXPERIENCE_2G_DELIVERY: { title: '确认消息抵达', prompt: '修正模拟转发配置后，再次提交消息。', actions: ['重新发送短信', '查看接收端回复'], responses: ['短信已重新提交。', '接收端显示家人的回复：“我已经平安到达，不用担心。”'], result: '短信让重要信息能够跨越时间传递，丰富了实时通话之外的沟通方式。' }
    },
    '3G': {
      ENTER_EXPERIENCE_3G: { title: '准备移动终端', prompt: '进入掌上的世界，准备一部能够连接移动数据的手机。', actions: ['点亮手机屏幕', '接入移动数据网络'], responses: ['屏幕亮起，终端已经可以进行操作。', '手机接入了展厅模拟网络；接入网络只是开始，后续内容体验仍要看数据、终端和服务。'], result: '早期移动数据服务已经存在；3G让更多用户通过手机访问更丰富的互联网内容。' },
      CLICK_FIRST_MOBILE_INTERNET: { title: '打开移动网页', prompt: '试着从文字页面开始，再请求页面图片。', actions: ['打开新闻文字页', '请求页面图片'], responses: ['文字内容先显示出来。', '图片仍需通过网络传输；等待时间也影响浏览体验。'], result: '移动互联网体验同时依赖传输、终端和网页服务。' },
      USE_MOBILE_MAP: { title: '查询移动地图', prompt: '查看当前位置，再选择一条路线。', actions: ['读取模拟位置', '展开路线信息'], responses: ['地图定位信息已显示。', '路线随用户移动而更新，信息开始伴随日常出行。'], result: '移动数据让信息能够跟随人的移动。' },
      BROWSE_MOBILE_CONTENT: { title: '浏览新闻与图片', prompt: '打开一条新闻，再查看其中的图片。', actions: ['打开新闻内容', '加载新闻图片'], responses: ['新闻文字已打开。', '图片内容完成加载；不同内容需要传输和处理不同的数据。'], result: '手机能够承载比语音和短信更丰富的信息。' },
      WATCH_EARLY_VIDEO: { title: '体验早期移动视频', prompt: '发起视频请求，观察移动网络中的等待过程。', actions: ['请求视频片段', '等待缓冲并播放'], responses: ['视频请求已发出。', '测试片段开始播放；早期移动视频仍受网络和终端能力限制。'], result: '移动视频打开了新的可能，也显露出当时的体验边界。' }
    },
    '4G': {
      EXPERIENCE_4G_VIDEO: { title: '移动高清视频', prompt: '选择视频内容，并观察画面如何通过移动宽带抵达手机。', actions: ['选择视频片段', '播放并检查连续性'], responses: ['视频请求已提交。', '画面开始连续播放；实际体验仍受网络、终端和服务影响。'], result: '4G移动宽带让高清视频等内容更自然地进入日常生活。' },
      EXPERIENCE_4G_SHARE: { title: '上传生活照片', prompt: '选择一张照片，再将它分享给远方的朋友。', actions: ['选择照片并准备上传', '发送分享链接'], responses: ['照片已准备好，终端正在处理内容。', '照片已进入模拟分享记录，接收者可以稍后查看。'], result: '移动网络让记录生活和分享生活之间的距离缩短。' },
      EXPERIENCE_4G_LIVE: { title: '开启移动直播', prompt: '打开摄像头预览，并开始向观众传送实时画面。', actions: ['检查直播画面', '开始传送实时内容'], responses: ['直播画面已准备。', '模拟直播已开始；画面质量会随带宽和服务状态变化。'], result: '每个人都能尝试成为内容的记录者与分享者。' },
      EXPERIENCE_4G_SOCIAL: { title: '参与社交互动', prompt: '发布一条生活记录，并查看他人的回应。', actions: ['发布生活动态', '查看评论与回应'], responses: ['动态已发布到模拟页面。', '新的回应出现在页面中，交流从单向接收扩展为互动。'], result: '高速移动连接改变了人们表达和参与信息传播的方式。' }
    },
    '5G': {
      EXPERIENCE_5G_TRAFFIC: { title: '智慧交通协同', prompt: '先读取路口状态，再让相关设备交换状态。', actions: ['读取路口传感状态', '协调信号与车辆信息'], responses: ['路口状态已汇总到模拟控制台。', '设备状态完成一次协同更新；实际效果取决于系统设计与部署。'], result: '多设备连接能够支持交通协同方向的应用探索。' },
      EXPERIENCE_5G_HOME: { title: '智能家居联动', prompt: '检查环境传感器，再选择联动设备。', actions: ['查看环境传感器', '执行设备联动'], responses: ['温度与设备状态已显示。', '联动指令已在模拟场景中执行，连接仍需可靠设备与系统配合。'], result: '连接扩展到人与设备、设备与设备之间。' },
      EXPERIENCE_5G_MEDICAL: { title: '远程医疗协作', prompt: '发起资料传递，并确认远端收到状态。', actions: ['发送模拟影像资料', '确认远端接收状态'], responses: ['资料传递请求已建立。', '远端确认收到测试资料；这只是交互情境，不代表真实诊疗服务。'], result: '通信可以支持跨地点的信息协作，应用仍需满足专业与安全要求。' },
      EXPERIENCE_5G_INDUSTRY: { title: '工业设备协作', prompt: '查看机械臂状态，再提交协同控制请求。', actions: ['读取机械臂与传感器状态', '提交协同控制指令'], responses: ['设备状态已汇入模拟控制面板。', '控制请求完成模拟响应；工业系统还需要控制逻辑、安全保护和现场验证。'], result: '5G支持工业互联网等方向发展，场景能力不能脱离整体系统单独承诺。' }
    },
    '6G': {
      EXPERIENCE_6G_CITY: { title: '数字城市导航', prompt: '对照项目模拟路口与数字模型中的道路状态。', actions: ['读取模拟道路状态', '在数字模型中查看路线'], responses: ['模拟路口的参考状态进入模拟终端。', '数字模型显示了对应路线；结果依赖数据及时性与模型准确性。'], result: '数字城市导航是通信与数字系统协同的研究情境，不代表普遍部署能力。' },
      EXPERIENCE_6G_ENVIRONMENT: { title: '环境实时交互', prompt: '查看环境传感数据，并与现场描述进行核对。', actions: ['读取模拟环境数据', '对照现场并标记偏差'], responses: ['传感器数据已进入模拟界面。', '对照后发现数据质量会影响系统判断，感知结果需要验证。'], result: '通信感知融合仍是研究方向，数据质量和验证同样重要。' },
      EXPERIENCE_6G_AI: { title: 'AI协作体验', prompt: '读取一条状态建议，再核对生成建议的基础数据。', actions: ['查看AI分析建议', '对照输入数据并确认'], responses: ['模拟分析给出了一条状态建议。', '核对后保留了可验证的信息；模型输出不能直接替代现实判断。'], result: '智能分析需要可信数据、可解释检查和人工验证。' },
      EXPERIENCE_6G_MERGE: { title: '现实与数字空间对照', prompt: '并排查看模拟参考状态与数字模型，找出不同步之处。', actions: ['查看模拟参考状态', '查看数字模型更新时间'], responses: ['模拟参考状态已显示。', '模型更新时间较晚；通信、感知和更新环节都会影响两侧一致性。'], result: '现实与数字协同是未来探索情境，6G仍处于研究发展阶段。' }
    }
  };
  const storageName = 'commsArchiveExperienceProgress.v1';
  let activeStorageKey = '', progress = new Map();
  function currentStorageKey() { return root.DemoManager?.storageKey?.(storageName) || storageName; }
  function normalizeProgress(id, item) {
    const separator = id.indexOf(':'), scenario = scenarios[id.slice(0, separator)]?.[id.slice(separator + 1)];
    if (!scenario || !item || !Number.isInteger(item.step) || !Array.isArray(item.feedback)) return null;
    const step = Math.max(0, Math.min(scenario.actions.length, item.step));
    // Recover interrupted/older writes from the action count, rather than trusting a
    // stale completion flag that could leave a finished scenario impossible to resume.
    return { step, feedback: scenario.responses.slice(0, step), complete: step === scenario.actions.length };
  }
  function readProgress(key) {
    try {
      const value = JSON.parse(root.localStorage?.getItem(key) || '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) return new Map();
      return new Map(Object.entries(value).map(([id, item]) => [id, normalizeProgress(id, item)]).filter(([, item]) => item));
    } catch (_) { return new Map(); }
  }
  function ensureScope() {
    const key = currentStorageKey();
    if (key !== activeStorageKey) { activeStorageKey = key; progress = readProgress(key); }
  }
  function persist() {
    try { root.localStorage?.setItem(activeStorageKey, JSON.stringify(Object.fromEntries(progress))); return !!root.localStorage; }
    catch (_) { return false; }
  }
  function key(era, trigger) { return `${era}:${trigger}`; }
  function get(era, trigger) {
    ensureScope();
    const scenario = scenarios[era]?.[trigger];
    if (!scenario) return null;
    const current = progress.get(key(era, trigger)) || { step: 0, feedback: [], complete: false };
    return { ...scenario, responses: [...scenario.responses], actions: [...scenario.actions], feedback: [...current.feedback], step: current.step, complete: current.complete, total: scenario.actions.length };
  }
  function advance(era, trigger) {
    ensureScope();
    const scenario = scenarios[era]?.[trigger];
    if (!scenario) return { ok: false, reason: '找不到对应的体验交互。' };
    const id = key(era, trigger), current = progress.get(id) || { step: 0, feedback: [], complete: false };
    if (current.complete || current.step >= scenario.actions.length) return { ok: false, reason: '这项体验已完成。', ...get(era, trigger) };
    current.feedback.push(scenario.responses[current.step]);
    current.step += 1;
    current.complete = current.step === scenario.actions.length;
    progress.set(id, current);
    const saved = persist();
    return { ok: true, ...get(era, trigger), action: scenario.actions[current.step - 1], result: current.complete ? scenario.result : '', saved };
  }
  function reset() { ensureScope(); progress.clear(); try { root.localStorage?.removeItem(activeStorageKey); } catch (_) {} }
  root.CommsArchiveExperience = { scenarios, get, advance, reset };
})(window);
