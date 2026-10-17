/* 2G展厅澜对白。用于数字通信与短信调查的项目原创叙事，不替代历史正文。 */
(function (root) {
  'use strict';

  root.LanDialogues2G = [
    { id:'lan_2g_enter_001', era:'2G', location:'entrance', trigger:'first_enter_2g', emotion:'expecting', dialogueType:'story', text:'欢迎来到2G时代。时间是20世纪90年代。\n移动通信开始从模拟语音走向数字服务。\n人们不再只能实时通话，也能把信息留下。\n短短几十个字，有时承载着等待已久的回应。', next:null, unlockCondition:'首次进入2G时代' },
    { id:'lan_2g_observe_001', era:'2G', location:'scene', trigger:'observe_2g_scene', emotion:'nostalgia', dialogueType:'optional', text:'一条短信很短，却能在对方暂时无法接听时，把牵挂先送出去。\n看看这些展品：数字手机、SIM卡，以及负责转发信息的服务中心。', next:null, unlockCondition:'读完2G入口对白并进入历史现场' },
    { id:'lan_2g_phone_001', era:'2G', location:'exhibit', trigger:'view_2g_handset', emotion:'nostalgia', dialogueType:'optional', text:'这是一部GSM时代的数字移动电话。\n终端从模拟语音走向数字处理，也开始承载短信等信息服务。\n它是特定型号的历史见证，不代表所有2G网络与终端完全相同。', next:null, unlockCondition:'查看2G数字移动电话展品' },
    { id:'lan_2g_sim_001', era:'2G', location:'exhibit', trigger:'view_2g_sim', emotion:'thinking', dialogueType:'optional', text:'用户识别并非从2G才开始。GSM中的SIM保存用户身份及鉴权所需信息。\nSIM也可存储部分短信，但负责网络存储转发的是短信服务中心，两者职责不同。', next:null, unlockCondition:'查看SIM卡展品' },
    { id:'lan_2g_sms_001', era:'2G', location:'exhibit', trigger:'view_2g_sms', emotion:'nostalgia', dialogueType:'optional', text:'短信可以先提交，再由网络服务环节暂存和转发。\n发送者与接收者不必同时进行实时通话。\n不过，短信仍依赖无线覆盖、服务中心和正确配置。', next:null, unlockCondition:'查看短信存储转发技术模型' },
    { id:'lan_2g_lab_001', era:'2G', location:'laboratory', trigger:'enter_2g_technology_lab', emotion:'research', dialogueType:'hint', text:'2G的重要变化，是移动通信从模拟走向数字。\n数字语音与短信由终端、无线接入和网络服务共同完成。\n沿着流程图追踪短信：它离开手机后，还要经过服务中心才能送往接收端。', next:null, unlockCondition:'进入2G技术实验室并查看流程图' },
    { id:'lan_2g_task_start_001', era:'2G', location:'task', trigger:'start_2g_task', emotion:'encourage', dialogueType:'hint', text:'本项目的模拟记录里：短信已经提交，却没有送达。\n让我们沿着信息经过的环节逐步排查。\n先收集线索，再判断故障位置。', next:null, unlockCondition:'完成2G现场观察并进入建设调查' },
    { id:'lan_2g_send_sms_001', era:'2G', location:'task', trigger:'choose_send_sms', emotion:'thinking', dialogueType:'hint', text:'短信已从发送终端提交，但接收端仍未收到。\n这说明“提交成功”不等于“已经送达”，我们需要检查后续服务链路。', next:null, unlockCondition:'在情境选择中选择发送短信' },
    { id:'lan_2g_check_terminal_001', era:'2G', location:'task', trigger:'inspect_2g_terminal', emotion:'research', dialogueType:'hint', text:'短信内容和发送操作正常，终端已经成功提交。\n暂时没有发现明显的手机故障。', next:null, unlockCondition:'检查发送终端' },
    { id:'lan_2g_check_network_001', era:'2G', location:'task', trigger:'inspect_2g_network', emotion:'research', dialogueType:'hint', text:'手机信号稳定，设备正常接入网络。\n无线连接目前没有显示异常，我们继续追踪短信进入网络服务后的状态。', next:null, unlockCondition:'检查无线连接' },
    { id:'lan_2g_check_smsc_001', era:'2G', location:'task', trigger:'inspect_2g_smsc', emotion:'thinking', dialogueType:'hint', text:'记录显示短信已经进入服务中心，却没有被正确转发。\n这是关键线索；提交方案前，我们还要核对其他可能的配置因素。', next:null, unlockCondition:'检查短信服务中心' },
    { id:'lan_2g_check_number_001', era:'2G', location:'task', trigger:'inspect_2g_number', emotion:'research', dialogueType:'hint', text:'接收号码与用户配置核对无误。\n这条线索帮助我们排除号码配置问题，并与短信中心的转发记录相互印证。', next:null, unlockCondition:'检查用户号码配置' },
    { id:'lan_2g_reveal_001', era:'2G', location:'task-result', trigger:'reveal_2g_solution', emotion:'thinking', dialogueType:'hint', text:'我们已经核对终端、无线连接、服务中心和用户号码配置。\n多项记录共同指向短信服务中心的转发配置异常。\n现在可以在模拟测试环境中修正配置并重新验证。', next:null, unlockCondition:'整合2G调查线索' },
    { id:'lan_2g_task_complete_001', era:'2G', location:'task-result', trigger:'complete_2g_task', emotion:'success', dialogueType:'story', text:'短信终于送达了。\n你发现了吗？\n通信改变的不只是速度，还有人与人保持联系的方式。\n数字通信让信息能够被记录、暂存和转发。', next:'lan_2g_summary_001', unlockCondition:'完成2G调查并归档' },
    { id:'lan_2g_summary_001', era:'2G', location:'summary', trigger:'archive_2g', emotion:'nostalgia', dialogueType:'story', text:'1G扩展了移动语音。\n2G的数字语音与短信带来更多选择。\n异步传递的文字，让人们不必一直等待接通。\n但人们很快又期待，手机连接的不只是信息，而是整个世界。', next:'lan_2g_unlock_3g_001', unlockCondition:'完成2G任务结果记录' },
    { id:'lan_2g_unlock_3g_001', era:'2G', location:'transition', trigger:'unlock_3g', emotion:'expecting', dialogueType:'story', text:'下一段旅程，我们会观察移动数据承载能力的进一步提升。\n看看手机如何从传递信息，成为通往网络世界的新入口。\n准备好了吗？我们去3G时代。', next:'ENTER_ERA:3G', unlockCondition:'2G档案完成并开放3G' },
    { id:'lan_2g_experience_compose_001', era:'2G', location:'experience', trigger:'experience_2g_compose', emotion:'curious', dialogueType:'optional', storyLine:'experience', text:'短消息已经写好并提交。短信让人们在暂时无法通话时，也能先把牵挂发出去。', next:null, unlockCondition:'完成编辑报平安短信体验' },
    { id:'lan_2g_experience_relay_001', era:'2G', location:'experience', trigger:'experience_2g_relay', emotion:'research', dialogueType:'optional', storyLine:'experience', text:'手机已经接入网络，记录显示短信进入服务中心后没有正确转发。信息的旅程还要经过网络服务环节。', next:null, unlockCondition:'完成追踪短信转发体验' },
    { id:'lan_2g_experience_delivery_001', era:'2G', location:'experience', trigger:'experience_2g_delivery', emotion:'warm', dialogueType:'optional', storyLine:'experience', text:'回复抵达了。几十个字保存下来的不只是内容，也是一段等待回应的时间。', next:null, unlockCondition:'完成确认消息抵达体验' }
  ];

  root.LanTriggers2G = [
    { id:'trigger_2g_enter', event:'ENTER_ERA', dialogueId:'lan_2g_enter_001', condition:{ era:'2G', firstEnter:true }, priority:1 },
    { id:'trigger_2g_scene', event:'SCENE_OBSERVED', dialogueId:'lan_2g_observe_001', condition:{ era:'2G' }, priority:2 },
    { id:'trigger_2g_phone', event:'EXHIBIT_CLICK', dialogueId:'lan_2g_phone_001', condition:{ era:'2G', exhibitId:'exhibit.2g.handset' }, priority:2 },
    { id:'trigger_2g_sim', event:'EXHIBIT_CLICK', dialogueId:'lan_2g_sim_001', condition:{ era:'2G', exhibitId:'exhibit.2g.sim' }, priority:2 },
    { id:'trigger_2g_sms', event:'EXHIBIT_CLICK', dialogueId:'lan_2g_sms_001', condition:{ era:'2G', exhibitId:'exhibit.2g.sms' }, priority:2 },
    { id:'trigger_2g_lab', event:'TECH_START', dialogueId:'lan_2g_lab_001', condition:{ era:'2G' }, priority:2 },
    { id:'trigger_2g_task_start', event:'TASK_START', dialogueId:'lan_2g_task_start_001', condition:{ era:'2G' }, priority:1 },
    { id:'trigger_2g_send_sms', event:'TASK_CLUE', dialogueId:'lan_2g_send_sms_001', condition:{ era:'2G', clue:'send-sms' }, priority:2 },
    { id:'trigger_2g_terminal', event:'TASK_CLUE', dialogueId:'lan_2g_check_terminal_001', condition:{ era:'2G', clue:'terminal' }, priority:2 },
    { id:'trigger_2g_network', event:'TASK_CLUE', dialogueId:'lan_2g_check_network_001', condition:{ era:'2G', clue:'network' }, priority:2 },
    { id:'trigger_2g_smsc', event:'TASK_CLUE', dialogueId:'lan_2g_check_smsc_001', condition:{ era:'2G', clue:'smsc' }, priority:2 },
    { id:'trigger_2g_number', event:'TASK_CLUE', dialogueId:'lan_2g_check_number_001', condition:{ era:'2G', clue:'number-config' }, priority:2 },
    { id:'trigger_2g_reveal', event:'TASK_REVEAL', dialogueId:'lan_2g_reveal_001', condition:{ era:'2G' }, priority:1 },
    { id:'trigger_2g_complete', event:'TASK_COMPLETE', dialogueId:'lan_2g_task_complete_001', condition:{ era:'2G' }, priority:1 },
    { id:'trigger_2g_summary', event:'ERA_ARCHIVE', dialogueId:'lan_2g_summary_001', condition:{ era:'2G' }, priority:1 },
    { id:'trigger_2g_unlock_3g', event:'ERA_UNLOCK', dialogueId:'lan_2g_unlock_3g_001', condition:{ era:'2G', nextEra:'3G' }, priority:1 },
    { id:'trigger_2g_experience_compose', event:'EXPERIENCE_NODE', dialogueId:'lan_2g_experience_compose_001', condition:{ era:'2G', nodeId:'EXPERIENCE_2G_COMPOSE' }, priority:2 },
    { id:'trigger_2g_experience_relay', event:'EXPERIENCE_NODE', dialogueId:'lan_2g_experience_relay_001', condition:{ era:'2G', nodeId:'EXPERIENCE_2G_RELAY' }, priority:2 },
    { id:'trigger_2g_experience_delivery', event:'EXPERIENCE_NODE', dialogueId:'lan_2g_experience_delivery_001', condition:{ era:'2G', nodeId:'EXPERIENCE_2G_DELIVERY' }, priority:2 }
  ];
})(window);
