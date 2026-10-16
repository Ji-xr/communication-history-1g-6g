/* 《通信简史：从1G到6G》澜角色统一设定。此文件只定义角色规范，不承载剧情对白。 */
(function (root) {
  'use strict';

  const profile = {
    id: 'lan',
    name: '澜',
    identity: '来自未来通信文明档案馆的年轻科研人员。',
    profession: '通信科研人员',
    role: '与用户平等协作的科研伙伴',
    responsibilities: [
      '研究和维护1G—6G通信文明档案。',
      '与用户穿越不同通信时代，调查通信历史中的异常记录。',
      '分析技术问题并核对历史资料，不替用户决定生活体验的意义。'
    ],
    relationship: {
      type: '科研伙伴',
      lan: '负责技术分析、历史资料与科研判断。',
      user: '负责体验时代生活、发现人的故事，并补充技术记录之外的体验。',
      sharedPurpose: '澜理解技术，用户理解生活，两者共同完成通信文明档案。'
    },
    coreRegret: '她曾经只记录通信技术的发展，却忽略了技术背后人的感受。',
    pastFocus: ['网络速度', '设备性能', '数据规模', '系统能力'],
    missingHumanStories: [
      '第一次听见远方声音的人',
      '第一次发送短信的人',
      '第一次打开移动互联网的人',
      '第一次分享视频的人',
      '第一次体验万物互联的人'
    ],
    personality: ['理性', '好奇', '温和'],
    personalityGuidance: {
      rational: '遇到问题先分析证据，不急于判断。',
      curious: '她并非全知；亲历历史现场时，也会从新发现中修正理解。',
      gentle: '尊重用户观察，承认人的体验能补充技术资料。'
    },
    weakness: '前期容易过度依赖数据，以为数据足以解释全部问题。',
    growthStages: {
      '1G': '探索', '2G': '探索', '3G': '观察',
      '4G': '观察', '5G': '连接', '6G': '理解'
    },
    growthArc: {
      '1G—2G': '关注技术证据，保持好奇，学习理解早期通信能力。',
      '3G—4G': '开始观察通信技术如何改变普通人的生活方式。',
      '5G': '理解连接对象延伸到环境、城市和系统。',
      '6G': '认识通信发展的核心是人与世界如何建立联系。'
    },
    visual: {
      concept: '未来通信科研人员与人文观察者；自然、可信、温暖，有真实人物感。',
      perceivedAge: '25—28岁',
      face: '自然真实，不追求过度完美，保留真实皮肤质感。',
      eyes: ['深灰蓝', '浅琥珀'],
      hair: '深色中长发，简洁，适合科研环境。',
      clothing: {
        type: '轻量未来科研工作服，不采用传统白大褂造型。',
        inner: '简洁科技衬衣',
        outer: '轻量科研外套',
        colors: { primary: '蓝绿色', secondary: '暖白', accent: '金色' },
        motifs: ['通信波纹', '档案馆标识', '数据纹理']
      },
      avoid: ['AI机器人感', '过强赛博朋克感', '机械化外观', '大量发光灯条'],
      consistency: '1G—6G保持同一个角色与主体形象，只增加对应时代的辅助设备和轻量色彩变化。'
    },
    chibi: {
      purpose: ['等待页面', '任务完成', '答题奖励', '提示反馈'],
      proportions: '2.5—3头身',
      consistency: '与主立绘保持发型、科研外套和蓝绿色元素一致。',
      expressions: ['普通微笑', '思考', '惊讶发现', '鼓励', '完成任务开心'],
      status: '待制作'
    },
    eraAccessories: {
      '1G': '信号检测设备', '2G': '数据记录终端', '3G': '移动网络分析设备',
      '4G': '内容传播分析设备', '5G': '城市网络终端', '6G': '数字孪生观察设备'
    },
    endingDirection: '完成她补记人的通信体验这一研究遗憾；结局强调通信记录的不只是技术进步，也是人与人、人与世界建立联系的过程。',
    dialogueGuidance: {
      voice: ['理性', '好奇', '温和'],
      avoid: ['客服口吻', '全知讲解者口吻', '把用户当作学生或游客'],
      preserveExistingDialogue: true
    },
    assets: {
      portrait: {
        path: 'assets/images/Lan/lan_portrait_ai.png',
        type: 'AI生成原创角色概念图',
        note: '仅用于虚构角色视觉表达，不是历史人物影像或通信史资料。'
      },
      chibi: { status: '待制作' },
      expressions: { status: '待制作' },
      actions: { status: '待制作' }
    },
    // Legacy aliases keep current consumers working while the profile remains the source of truth.
    appearance: '深色中长发、深灰蓝或浅琥珀眼睛，穿蓝绿色与暖白配色的轻量未来科研外套。',
    timelineRole: '作为平等科研伙伴，与用户共同补全技术记录背后的人的通信历史。',
    visualStyle: '未来通信科研人员与人文观察者；主体形象在1G—6G保持一致。',
    colorTheme: { base: ['蓝绿色', '暖白', '金色'] },
    dialogueStyle: '理性、好奇、温和；尊重用户观察，不以客服或老师口吻交流。',
    firstAppearance: '首页与序章',
    finalAppearance: '6G最终结局中的共同研究总结'
  };

  function freezeProfile(value) {
    Object.values(value).forEach((item) => {
      if (item && typeof item === 'object' && !Object.isFrozen(item)) freezeProfile(item);
    });
    return Object.freeze(value);
  }

  root.LanCharacterProfile = freezeProfile(profile);
})(window);
