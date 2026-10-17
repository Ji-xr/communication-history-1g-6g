/* 1G展厅澜对白；为原创角色对话，不改变历史正文与任务数据。 */
(function (root) {
  'use strict';
  root.LanDialogues1G = [
    { id:'lan_1g_enter_001', era:'1G', location:'entrance', trigger:'first_enter_1g', emotion:'expecting', dialogueType:'story', text:'欢迎来到通信历史的第一页。时间是20世纪80年代。\n蜂窝移动电话正逐步走向商用；更早已有车载等移动无线电话。\n让一个人在移动中保持联系，是一次大胆的尝试。\n现在的通信看起来如此自然；那时，人们还在探索怎样让声音跟随人移动。', next:null, unlockCondition:'首次进入1G时代' },
    { id:'lan_1g_observe_001', era:'1G', location:'scene', trigger:'observe_1g_scene', emotion:'nostalgia', text:'先不要急着寻找答案。\n每一个通信时代，都从一个简单的问题开始。\n那个时候，人们想知道：\n如果电话不再固定在一个地方，\n人与人之间的距离是不是可以更短？', next:null, unlockCondition:'读完1G入口对白并进入历史现场' },
    { id:'lan_1g_exhibit_001', era:'1G', location:'exhibit', trigger:'click_mobile_phone', emotion:'respect', text:'这就是1G时代的重要见证。\n它和今天的手机相比，可能显得笨重。\n但请不要忘记。\n它让一种可能更接近日常。\n人们可以拿着电话保持联系。', next:null, unlockCondition:'打开1G早期移动电话展品' },
    { id:'lan_1g_antenna_001', era:'1G', location:'exhibit-detail', trigger:'click_antenna', emotion:'thinking', text:'这是移动通信早期的重要设计。\n无线信号需要通过空间传播。\n而天线，就是设备连接世界的入口。', next:null, unlockCondition:'在早期移动电话详情中选择天线线索' },
    { id:'lan_1g_battery_001', era:'1G', location:'exhibit-detail', trigger:'click_battery', emotion:'happy', text:'当然，它也有一个明显的问题。\n想带着它移动，需要先拥有足够强壮的手臂。\n科技的发展，\n就是从“能不能做到”，\n走向“能不能更方便”。', next:null, unlockCondition:'在早期移动电话详情中选择电池线索' },
    { id:'lan_1g_lab_001', era:'1G', location:'laboratory', trigger:'enter_technology_lab', emotion:'research', text:'现在，我们看看1G通信是如何工作的。\n它的核心，是利用无线电信号传递声音。\n麦克风把声音转为电信号，再调制无线电载波；1G的模拟特征主要指语音传输。\n信号通过基站连接通信网络。\n最终到达另一端的人。', next:null, unlockCondition:'打开1G交互技术流程资料' },
    { id:'lan_1g_tech_problem_001', era:'1G', location:'laboratory', trigger:'technology_problem', emotion:'research', text:'不过，真正困难的地方，\n并不是让信号传出去。\n而是让大量移动中的用户，\n都能够稳定连接。', next:null, unlockCondition:'在1G技术原理中打开技术难点说明' },
    { id:'lan_1g_task_start_001', era:'1G', location:'task', trigger:'start_1g_task', emotion:'encourage', dialogueType:'hint', text:'我们在项目模拟中发现了一段异常通信记录。\n一位早期移动通信测试人员，\n在通话过程中突然失去了连接。\n如果想弄清早期移动通信建设面临的问题，\n我们需要找到信号中断的原因。', next:null, unlockCondition:'完成1G现场观察并进入建设调查' },
    { id:'lan_1g_base_station_001', era:'1G', location:'task', trigger:'inspect_base_station', emotion:'thinking', text:'基站是移动通信的重要节点。\n如果它无法正常工作，\n它服务区域内的连接可能受到影响。', next:null, unlockCondition:'选择检查基站调查方向' },
    { id:'lan_1g_signal_area_001', era:'1G', location:'task', trigger:'inspect_signal_area', emotion:'thinking', text:'你发现了吗？\n移动通信并不是简单覆盖整个城市。\n它需要把区域划分成许多通信单元。', next:null, unlockCondition:'选择检查无线信号调查方向' },
    { id:'lan_1g_issue_001', era:'1G', location:'task', trigger:'find_signal_issue', emotion:'thinking', text:'很好。\n问题不是设备完全失效。\n而是在特定环境下，\n信号无法稳定到达用户。', next:null, unlockCondition:'选择调查线索并整合证据' },
    { id:'lan_1g_task_complete_001', era:'1G', location:'task-result', trigger:'complete_1g_task', emotion:'success', text:'通信恢复了。\n但更重要的是，\n我们找到了那个时代真正面对的问题。\n数据告诉我们信号覆盖不足，而你的观察也让我们看见，这个限制怎样影响真实的人。\n移动通信的第一次突破，\n并不是因为技术已经完美。\n而是因为人类愿意不断解决新的困难。', next:null, unlockCondition:'完成1G建设调查并进入技术理解阶段' },
    { id:'lan_1g_summary_001', era:'1G', location:'summary', trigger:'finish_1g', emotion:'nostalgia', text:'你刚刚经历的，\n是我们在通信历史中的第一次远行。\n从固定电话，\n到移动连接。\n蜂窝网络扩大了移动通话的可能。\n但通信的发展，\n从来不会停留在一个答案。', next:'lan_1g_unlock_2g_001', unlockCondition:'完成1G调查并归档' },
    { id:'lan_1g_unlock_2g_001', era:'1G', location:'transition', trigger:'unlock_2g', emotion:'expecting', text:'下一段旅程，\n我们会看到通信发生新的变化。\n声音之后，\n人们开始尝试传递更多信息。\n准备好了吗？\n我们去看看，\n通信如何开始记录人与人的联系。', next:'ENTER_ERA:2G', unlockCondition:'1G档案完成并开放2G' },
    { id:'lan_1g_experience_call_001', era:'1G', location:'experience', trigger:'experience_1g_call', emotion:'curious', dialogueType:'optional', storyLine:'experience', text:'呼叫已经发出。早期移动电话让声音离开固定线路，但信号能否稳定抵达，仍取决于覆盖范围。', next:null, unlockCondition:'完成拨出移动电话体验' },
    { id:'lan_1g_experience_coverage_001', era:'1G', location:'experience', trigger:'experience_1g_coverage', emotion:'research', dialogueType:'optional', storyLine:'experience', text:'本次模拟中，移到覆盖与遮挡条件更合适的位置后，通话改善；距离并不是唯一因素。覆盖不是抽象地图，它会影响一个人能不能联系到家人。', next:null, unlockCondition:'完成寻找稳定信号体验' },
    { id:'lan_1g_experience_reconnect_001', era:'1G', location:'experience', trigger:'experience_1g_reconnect', emotion:'warm', dialogueType:'optional', storyLine:'experience', text:'这一次，电话接通了。技术记录告诉我们信号如何变化，你的体验让我们看见这段距离对生活意味着什么。', next:null, unlockCondition:'完成重新联系家人体验' }
  ];

  root.LanTriggers1G = [
    { id:'trigger_1g_enter', event:'ENTER_ERA', dialogueId:'lan_1g_enter_001', condition:{ era:'1G', firstEnter:true }, priority:1 },
    { id:'trigger_1g_scene', event:'SCENE_OBSERVED', dialogueId:'lan_1g_observe_001', condition:{ era:'1G' }, priority:2 },
    { id:'trigger_1g_phone', event:'EXHIBIT_CLICK', dialogueId:'lan_1g_exhibit_001', condition:{ era:'1G', exhibitId:'exhibit.1g.handset' }, priority:2 },
    { id:'trigger_1g_base_exhibit', event:'EXHIBIT_CLICK', dialogueId:'lan_1g_base_station_001', condition:{ era:'1G', exhibitId:'exhibit.1g.network' }, priority:2 },
    { id:'trigger_1g_antenna', event:'EXHIBIT_DETAIL', dialogueId:'lan_1g_antenna_001', condition:{ era:'1G', detail:'antenna' }, priority:2 },
    { id:'trigger_1g_battery', event:'EXHIBIT_DETAIL', dialogueId:'lan_1g_battery_001', condition:{ era:'1G', detail:'battery' }, priority:2 },
    { id:'trigger_1g_lab', event:'TECH_START', dialogueId:'lan_1g_lab_001', condition:{ era:'1G' }, priority:2 },
    { id:'trigger_1g_tech_problem', event:'TECH_PROBLEM', dialogueId:'lan_1g_tech_problem_001', condition:{ era:'1G' }, priority:2 },
    { id:'trigger_1g_task_start', event:'TASK_START', dialogueId:'lan_1g_task_start_001', condition:{ era:'1G' }, priority:1 },
    { id:'trigger_1g_base', event:'TASK_CLUE', dialogueId:'lan_1g_base_station_001', condition:{ era:'1G', clue:'base-station' }, priority:2 },
    { id:'trigger_1g_coverage', event:'TASK_CLUE', dialogueId:'lan_1g_signal_area_001', condition:{ era:'1G', clue:'signal-area' }, priority:2 },
    { id:'trigger_1g_issue', event:'TASK_REVEAL', dialogueId:'lan_1g_issue_001', condition:{ era:'1G' }, priority:2 },
    { id:'trigger_1g_complete', event:'TASK_COMPLETE', dialogueId:'lan_1g_task_complete_001', condition:{ era:'1G' }, priority:1 },
    { id:'trigger_1g_summary', event:'ERA_ARCHIVE', dialogueId:'lan_1g_summary_001', condition:{ era:'1G' }, priority:1 },
    { id:'trigger_1g_unlock_2g', event:'ERA_UNLOCK', dialogueId:'lan_1g_unlock_2g_001', condition:{ era:'1G', nextEra:'2G' }, priority:1 },
    { id:'trigger_1g_experience_call', event:'EXPERIENCE_NODE', dialogueId:'lan_1g_experience_call_001', condition:{ era:'1G', nodeId:'EXPERIENCE_1G_CALL' }, priority:2 },
    { id:'trigger_1g_experience_coverage', event:'EXPERIENCE_NODE', dialogueId:'lan_1g_experience_coverage_001', condition:{ era:'1G', nodeId:'EXPERIENCE_1G_COVERAGE' }, priority:2 },
    { id:'trigger_1g_experience_reconnect', event:'EXPERIENCE_NODE', dialogueId:'lan_1g_experience_reconnect_001', condition:{ era:'1G', nodeId:'EXPERIENCE_1G_RECONNECT' }, priority:2 }
  ];
})(window);
