/* 《通信简史》1G生活体验：围绕真实展厅现场与既有覆盖调查组织互动。 */
(function (root) {
  'use strict';
  root.ExperienceStory1G = {
    id: 'experience_story_1g', era: '1G', title: '第一次移动通话', type: 'experience',
    nodes: [
      { id: 'experience.1g.call', trigger: 'EXPERIENCE_1G_CALL', location: '拨出移动电话', exhibit: 'exhibit.1g.handset', reward: '1G移动通话体验记录', completed: false },
      { id: 'experience.1g.coverage', trigger: 'EXPERIENCE_1G_COVERAGE', location: '寻找稳定信号', exhibit: 'exhibit.1g.network', reward: '1G无线覆盖体验记录', completed: false },
      { id: 'experience.1g.reconnect', trigger: 'EXPERIENCE_1G_RECONNECT', location: '重新联系家人', exhibit: 'exhibit.1g.handset', reward: '1G移动通话体验记录', completed: false }
    ]
  };
})(window);
