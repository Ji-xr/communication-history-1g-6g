/* 《通信简史》6G对白与事件映射。所有6G内容均为研究方向构建的未来情境。 */
(function (root) {
  'use strict';
  root.LanDialogues6G = [
    { id:'lan_6g_enter_001', era:'6G', location:'entrance', trigger:'ENTER_6G', emotion:'thinking', dialogueType:'story', storyLine:'main', text:'欢迎来到6G研究情境。这里呈现的是探索方向，不是已经普遍商用的能力。\n从声音，到信息，再到更广泛的连接，通信研究不断提出新的问题。\n研究者正在探索通信、感知与智能系统如何协同。\n我们先从一份未来城市的测试记录开始，看看它提出了什么问题。', next:null, unlockCondition:'完成5G时代归档后进入6G研究情境' },
    { id:'lan_6g_task_start_001', era:'6G', location:'task', trigger:'START_6G_TASK', emotion:'research', dialogueType:'hint', storyLine:'builder', text:'现实中的测试车已经驶过路口，数字模型却还停在原地。\n这是一项未来研究情境中的模拟调查。我们从通信、感知、智能分析和数字模型逐项核对。', next:null, unlockCondition:'进入6G建设调查' },
    { id:'lan_6g_tech_001', era:'6G', location:'laboratory', trigger:'START_6G_TECH', emotion:'research', dialogueType:'hint', storyLine:'builder', text:'这张流程示意把通信、感知、智能分析与数字模型更新放在同一条研究链路中。它是概念说明，不代表已经部署的6G网络架构。', next:null, unlockCondition:'打开6G技术流程资料' },
    { id:'lan_6g_reveal_001', era:'6G', location:'task-result', trigger:'REVEAL_6G_TASK', emotion:'thinking', dialogueType:'hint', storyLine:'builder', text:'先把不同线索放在一起比较，再判断状态不一致发生在哪个环节。单条线索只能说明局部现象，不能代表整座城市的问题都已解决。', next:null, unlockCondition:'整合6G调查线索' },
    { id:'lan_6g_check_communication_001', era:'6G', location:'task', trigger:'CHECK_6G_COMMUNICATION', emotion:'research', dialogueType:'hint', storyLine:'builder', text:'原始位置数据已经生成。接下来对照生成时间、到达时间和更新时间，检查传输与调度是否造成滞后。', next:null, unlockCondition:'检查通信数据' },
    { id:'lan_6g_check_sensing_001', era:'6G', location:'task', trigger:'CHECK_6G_SENSING', emotion:'thinking', dialogueType:'hint', storyLine:'builder', text:'把传感器记录与现场状态对照，并用重复测试确认偏差。感知数据是否可信，是后续分析的基础。', next:null, unlockCondition:'检查环境感知' },
    { id:'lan_6g_check_ai_001', era:'6G', location:'task', trigger:'CHECK_6G_AI_MODEL', emotion:'thinking', dialogueType:'hint', storyLine:'builder', text:'比较原始数据、模型输出与验证结果。模型可以帮助分析，但输出仍需核验，不能直接当成现实本身。', next:null, unlockCondition:'检查人工智能分析' },
    { id:'lan_6g_check_twin_001', era:'6G', location:'task', trigger:'CHECK_6G_DIGITAL_TWIN', emotion:'research', dialogueType:'hint', storyLine:'builder', text:'追踪状态从数据进入平台到模型更新的过程，确认数字模型是否使用了最新且可信的状态。', next:null, unlockCondition:'检查数字孪生更新' },
    { id:'lan_6g_task_complete_001', era:'6G', location:'task-result', trigger:'COMPLETE_6G_TASK', emotion:'success', dialogueType:'story', storyLine:'builder', text:'调查结果已经记录。通信时效、环境感知、智能分析和数字模型更新都可能影响现实与数字世界的一致性；这项模拟结果不代表现实城市或已商用6G系统。', next:null, unlockCondition:'完成6G建设调查' },
    { id:'lan_6g_experience_start_001', era:'6G', location:'experience', trigger:'START_6G_EXPERIENCE', emotion:'warm', dialogueType:'story', storyLine:'experience', text:'现在换一个角度，观察未来通信研究可能怎样帮助数字系统理解环境。这里是概念体验，不是已经普遍部署的能力。', next:null, unlockCondition:'进入6G生活影响资料' },
    { id:'lan_6g_experience_city_001', era:'6G', location:'experience', trigger:'EXPERIENCE_6G_CITY', emotion:'curious', dialogueType:'optional', storyLine:'experience', text:'数字城市模型可以汇集道路与设施状态，用于探索城市管理的新方式。模型是否准确，仍取决于数据和系统验证。', next:null, unlockCondition:'体验数字城市导航情境' },
    { id:'lan_6g_experience_environment_001', era:'6G', location:'experience', trigger:'EXPERIENCE_6G_ENVIRONMENT', emotion:'thinking', dialogueType:'optional', storyLine:'experience', text:'环境感知方向关注系统如何取得周边状态信息。传感器误差与数据质量会影响后续判断。', next:null, unlockCondition:'体验环境交互情境' },
    { id:'lan_6g_experience_ai_001', era:'6G', location:'experience', trigger:'EXPERIENCE_6G_AI', emotion:'research', dialogueType:'optional', storyLine:'experience', text:'智能分析可能帮助处理复杂信息，但结果需要通过可靠数据和独立验证来评估。', next:null, unlockCondition:'体验人工智能协作研究情境' },
    { id:'lan_6g_experience_merge_001', era:'6G', location:'experience', trigger:'EXPERIENCE_6G_MERGE', emotion:'warm', dialogueType:'optional', storyLine:'experience', text:'把现实状态与数字模型并列观察，可以理解两者协同的研究目标；这仍是未来探索方向。', next:null, unlockCondition:'体验现实与数字空间对照情境' },
    { id:'lan_6g_experience_complete_001', era:'6G', location:'experience-summary', trigger:'COMPLETE_6G_EXPERIENCE', emotion:'success', dialogueType:'story', storyLine:'experience', text:'我们从城市、环境、智能分析和现实数字对照几个角度记录了体验。相关能力仍在研究发展，可信的数据与验证同样重要。', next:null, unlockCondition:'完成全部6G体验节点' },
    { id:'lan_6g_archive_entry_001', era:'6G', location:'archive', trigger:'ENTER_6G_ARCHIVE', emotion:'nostalgia', dialogueType:'story', storyLine:'archive', text:'6G研究情境调查进入归档阶段。我们整理通信时效、感知、智能分析与数字模型的线索。请注意：本展区呈现研究探索，不代表相关能力已经普遍商用。', next:null, unlockCondition:'完成6G研究情境调查与技术实验' },
    { id:'lan_6g_archive_complete_001', era:'6G', location:'archive', trigger:'ARCHIVE_6G_COMPLETE', emotion:'success', dialogueType:'story', storyLine:'archive', text:'6G研究情境档案已封存。通信、感知、智能分析与数字系统的协同仍需要持续研究和验证；六代调查也已完成。\n我曾经认为，通信历史记录的是技术进步。但和你一起经历这些时代后，我发现，档案里还需要人的真实体验。\n我们把这份成果命名为《连接的文明：人类通信六代记录》。真正被连接的，是人与人之间想被听见、被看见、被理解的瞬间。', next:'FINAL_STORY_READY', unlockCondition:'完成6G档案' }
  ];
  root.LanTriggers6G = [
    { id:'ENTER_6G', event:'ENTER_ERA', dialogueId:'lan_6g_enter_001', condition:{ era:'6G', firstEnter:true }, priority:1 },
    { id:'START_6G_TASK', event:'TASK_START', dialogueId:'lan_6g_task_start_001', condition:{ era:'6G' }, priority:1 },
    { id:'START_6G_TECH', event:'TECH_START', dialogueId:'lan_6g_tech_001', condition:{ era:'6G' }, priority:1 },
    { id:'REVEAL_6G_TASK', event:'TASK_REVEAL', dialogueId:'lan_6g_reveal_001', condition:{ era:'6G' }, priority:1 },
    ...[['COMMUNICATION','lan_6g_check_communication_001'],['SENSING','lan_6g_check_sensing_001'],['AI_MODEL','lan_6g_check_ai_001'],['DIGITAL_TWIN','lan_6g_check_twin_001']].map(([key,dialogueId])=>({ id:`CHECK_6G_${key}`, event:'TASK_CLUE', dialogueId, condition:{ era:'6G', clue:key.toLowerCase().replace('_model','-model').replace('_','-') }, priority:2 })),
    { id:'COMPLETE_6G_TASK', event:'TASK_COMPLETE', dialogueId:'lan_6g_task_complete_001', condition:{ era:'6G' }, priority:1 },
    { id:'START_6G_EXPERIENCE', event:'EXPERIENCE_START', dialogueId:'lan_6g_experience_start_001', condition:{ era:'6G' }, priority:1 },
    ...[['CITY','lan_6g_experience_city_001'],['ENVIRONMENT','lan_6g_experience_environment_001'],['AI','lan_6g_experience_ai_001'],['MERGE','lan_6g_experience_merge_001']].map(([key,dialogueId])=>({ id:`EXPERIENCE_6G_${key}`, event:'EXPERIENCE_NODE', dialogueId, condition:{ era:'6G', nodeId:`EXPERIENCE_6G_${key}` }, priority:2 })),
    { id:'COMPLETE_6G_EXPERIENCE', event:'EXPERIENCE_MERGE', dialogueId:'lan_6g_experience_complete_001', condition:{ era:'6G' }, priority:1 },
    { id:'ENTER_6G_ARCHIVE', event:'ENTER_ARCHIVE_6G', dialogueId:'lan_6g_archive_entry_001', condition:{ era:'6G' }, priority:1 },
    { id:'ARCHIVE_6G_COMPLETE', event:'ARCHIVE_6G_COMPLETE', dialogueId:'lan_6g_archive_complete_001', condition:{ era:'6G' }, priority:1 }
  ];
  root.BuilderStory6G={id:'builder_6g',era:'6G',title:'消失的数据',taskId:'task.6g.investigation',nodes:[
    {id:'builder.6g.communication',trigger:'CHECK_6G_COMMUNICATION',evidenceId:'evidence_6g_delay',title:'通信链路检查',description:'检查测试数据传输耗时与任务调度。',feedback:'测试记录显示，部分状态数据到达时间晚于预期，需要核查传输耗时与任务调度。',lanFeedback:'把生成、抵达和更新时间放在一起对照，确认数据是否迟到。'},
    {id:'builder.6g.sensing',trigger:'CHECK_6G_SENSING',evidenceId:'evidence_6g_sensor',title:'感知系统检查',description:'对照现实环境与传感器记录。',feedback:'部分传感器记录与现场状态存在差异，需要校准并重复测试。',lanFeedback:'感知结果是否可信，是数字系统理解现实的基础。'},
    {id:'builder.6g.ai',trigger:'CHECK_6G_AI_MODEL',evidenceId:'evidence_6g_ai',title:'AI模型检查',description:'比较原始数据、模型输出和验证结果。',feedback:'部分模型输出与原始数据和验证结果不一致，需要检查分析配置。',lanFeedback:'模型结论必须通过数据和测试验证。'},
    {id:'builder.6g.twin',trigger:'CHECK_6G_DIGITAL_TWIN',evidenceId:'evidence_6g_twin',title:'数字孪生检查',description:'检查数字模型中的状态更新是否及时。',feedback:'平台中的部分过期任务延迟了新状态更新，需要检查模型更新流程。',lanFeedback:'数据抵达后还要及时更新数字模型。'}
  ]};
})(window);
