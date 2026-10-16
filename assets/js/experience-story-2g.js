/* 《通信简史》2G生活体验：短信内容、网络转发与接收反馈。 */
(function (root) {
  'use strict';
  root.ExperienceStory2G = {
    id: 'experience_story_2g', era: '2G', title: '一条短信的旅程', type: 'experience',
    nodes: [
      { id: 'experience.2g.compose', trigger: 'EXPERIENCE_2G_COMPOSE', location: '编辑报平安短信', exhibit: 'exhibit.2g.handset', reward: '2G短信体验记录', completed: false },
      { id: 'experience.2g.relay', trigger: 'EXPERIENCE_2G_RELAY', location: '追踪短信转发', exhibit: 'exhibit.2g.sms', reward: '2G数字通信体验记录', completed: false },
      { id: 'experience.2g.delivery', trigger: 'EXPERIENCE_2G_DELIVERY', location: '确认消息抵达', exhibit: 'exhibit.2g.sms', reward: '2G短信体验记录', completed: false }
    ]
  };
})(window);
