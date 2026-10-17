/* 3G展厅澜对白与章节调查。任务场景为模拟调查；不替代原有章节正文。 */
(function (root) {
  'use strict';
  root.LanDialogues3G = [
    {id:'lan_3g_enter_001',era:'3G',location:'entrance',trigger:'first_enter_3g',emotion:'expecting',dialogueType:'story',text:'欢迎来到3G时代，时间来到21世纪初。\n1G让声音移动，2G让信息留下。\nGPRS等早期移动数据服务已让手机能够上网。\n现在，我们看看3G如何提高数据承载能力，推动移动互联网与多媒体应用。',next:null,unlockCondition:'首次进入3G时代'},
    {id:'lan_3g_observe_001',era:'3G',location:'scene',trigger:'observe_3g_scene',emotion:'curious',dialogueType:'optional',text:'2000年代中后期，移动数据、网页和多媒体服务逐渐进入手机。\n不同网络、终端和服务的实际体验并不相同；我们从这个模拟测试现场开始。',next:null,unlockCondition:'读完3G入口对白并进入历史现场'},
    {id:'lan_3g_phone_001',era:'3G',location:'exhibit',trigger:'view_3g_handset',emotion:'thinking',dialogueType:'optional',text:'它已经不只是一个电话。\n人们开始尝试，用一块小小的屏幕接近整个世界。\n这件馆藏用于观察3G时代移动终端形态，不代表所有地区和设备的体验完全相同。',next:null,unlockCondition:'查看3G时代移动终端'},
    {id:'lan_3g_web_001',era:'3G',location:'exhibit',trigger:'view_3g_web',emotion:'nostalgic',dialogueType:'optional',text:'手机网页并非始于3G；更强的数据承载能力让更多移动互联网应用逐步发展。\n文字、图片和服务内容都要经过网络传输，再由终端处理与显示。',next:null,unlockCondition:'查看移动网页与数据链路展品'},
    {id:'lan_3g_nodeb_001',era:'3G',location:'exhibit',trigger:'view_3g_nodeb',emotion:'research',dialogueType:'optional',text:'无线接入设备把移动终端连接到后续网络。\n这件展品是本项目原创程序化示意，不是历史设备照片或精确复原模型。',next:null,unlockCondition:'查看3G无线接入示意展品'},
    {id:'lan_3g_video_001',era:'3G',location:'exhibit',trigger:'view_3g_video',emotion:'expecting',dialogueType:'optional',text:'视频正在进入移动设备。\n虽然当时仍有许多体验限制，但它打开了一种新的可能：人们开始期待随时获取更丰富的内容。',next:null,unlockCondition:'查看移动视频体验资料'},
    {id:'lan_3g_lab_001',era:'3G',location:'laboratory',trigger:'enter_3g_technology_lab',emotion:'research',dialogueType:'hint',text:'3G的重要变化，是移动数据能力进一步发展。\n信息从手机出发，经过无线网络、基站和数据网络，抵达互联网服务。\n数据传得过来、终端能够处理、服务内容完整，三者共同影响网页体验。',next:null,unlockCondition:'进入3G技术实验室并查看流程图'},
    {id:'lan_3g_task_start_001',era:'3G',location:'task',trigger:'start_3g_task',emotion:'encourage',dialogueType:'hint',text:'我们收到了一张无法正常加载的网页记录。\n先确认手机是否接入网络，再检查终端、服务响应和传输状况。\n这些线索需要放在一起分析。',next:null,unlockCondition:'进入3G建设调查'},
    {id:'lan_3g_clue_network_001',era:'3G',location:'task',trigger:'inspect_3g_network',emotion:'research',dialogueType:'hint',text:'测试设备已接入移动网络。\n连接建立并不意味着网页数据一定能及时、完整地到达。',next:null,unlockCondition:'检查手机网络连接'},
    {id:'lan_3g_clue_terminal_001',era:'3G',location:'task',trigger:'inspect_3g_terminal',emotion:'thinking',dialogueType:'hint',text:'终端具备数据服务能力，但浏览器对部分图片格式的处理存在限制。\n设备收到数据后，还需要正确解析和显示。',next:null,unlockCondition:'检查终端能力'},
    {id:'lan_3g_clue_server_001',era:'3G',location:'task',trigger:'inspect_3g_server',emotion:'research',dialogueType:'hint',text:'部分网页服务请求响应较慢，服务器上的测试文件也需要核对完整性。\n服务端状态是端到端体验的一环。',next:null,unlockCondition:'检查网页服务响应'},
    {id:'lan_3g_clue_speed_001',era:'3G',location:'task',trigger:'inspect_3g_speed',emotion:'thinking',dialogueType:'hint',text:'较大的图片文件需要更长时间传输，测试网络的可用速率和稳定性会影响加载。\n这条线索说明数据传输是原因之一，但不能单独解释所有显示异常。',next:null,unlockCondition:'检查网络速度'},
    {id:'lan_3g_reveal_001',era:'3G',location:'task-result',trigger:'reveal_3g_solution',emotion:'thinking',dialogueType:'hint',text:'线索显示，这不是单一故障：移动网络传输、终端处理能力和网页服务适配共同影响体验。\n我们在模拟测试中调整网络条件、使用兼容格式，并核对完整的服务文件后重新验证。',next:null,unlockCondition:'整合3G调查线索'},
    {id:'lan_3g_task_complete_001',era:'3G',location:'task-result',trigger:'complete_3g_task',emotion:'success',dialogueType:'story',text:'网页重新打开了。\n但真正重要的，不只是一次加载成功。\n你刚刚见证的是通信方式的一次改变。\n手机开始成为人们探索世界的新窗口。',next:'lan_3g_archive_entry_001',unlockCondition:'完成3G调查并归档'},
    {id:'lan_3g_summary_001',era:'3G',location:'summary',trigger:'archive_3g',emotion:'nostalgia',dialogueType:'story',text:'1G让声音移动。\n2G让信息留下。\n3G提升了移动数据承载能力。\n手机获取网页与多媒体内容更方便，但早期移动数据服务在此之前已经存在。',next:'lan_3g_unlock_4g_001',unlockCondition:'完成3G任务结果记录'},
    {id:'lan_3g_unlock_4g_001',era:'3G',location:'transition',trigger:'unlock_4g',emotion:'expecting',dialogueType:'story',text:'下一段旅程，人们会发现，当连接越来越快，通信本身也会改变生活的表达方式。\n准备好了吗？我们去看看高速网络如何改变世界。',next:'ENTER_ERA:4G',unlockCondition:'3G档案完成并开放4G'},
    {id:'lan_3g_experience_enter_001',era:'3G',location:'experience',trigger:'enter_experience_3g',emotion:'nostalgic',dialogueType:'optional',text:'刚才我们看到了网络如何运行。\n接下来回看技术进入日常生活的变化。',next:null,unlockCondition:'查看3G时代生活影响资料'},
    {id:'lan_3g_experience_internet_001',era:'3G',location:'experience',trigger:'click_first_mobile_internet',emotion:'curious',dialogueType:'optional',text:'你发现了吗？它已经不只是用来打电话。\n人们开始尝试，用一块小小的屏幕接近整个世界。',next:null,unlockCondition:'体验第一次手机联网'},
    {id:'lan_3g_experience_map_001',era:'3G',location:'experience',trigger:'use_mobile_map',emotion:'thinking',dialogueType:'optional',text:'以前，人们需要提前准备路线。\n而现在，信息开始跟随人的移动。\n通信正在慢慢改变人与城市相处的方式。',next:null,unlockCondition:'体验移动地图'},
    {id:'lan_3g_experience_content_001',era:'3G',location:'experience',trigger:'browse_mobile_content',emotion:'nostalgic',dialogueType:'optional',text:'从文字，到图片。\n手机能够承载的信息越来越丰富。\n人们开始感受到，世界可以随时出现在手中。',next:null,unlockCondition:'浏览新闻和图片'},
    {id:'lan_3g_experience_video_001',era:'3G',location:'experience',trigger:'watch_early_video',emotion:'expecting',dialogueType:'optional',text:'视频正在进入移动设备。\n虽然今天看来还有很多限制，但它打开了一种新的可能。\n未来，人们会希望随时分享自己的生活。',next:null,unlockCondition:'体验移动视频'},
    {id:'lan_3g_merge_001',era:'3G',location:'experience-summary',trigger:'merge_3g_story',emotion:'thinking',dialogueType:'optional',text:'技术条件决定了服务能否抵达。\n而人们如何获取信息、看见彼此，也构成了通信发展的意义。',next:null,unlockCondition:'完成3G时代资料回看'}
  ];
  root.LanTriggers3G = [
    {id:'trigger_3g_enter',event:'ENTER_ERA',dialogueId:'lan_3g_enter_001',condition:{era:'3G',firstEnter:true},priority:1},
    {id:'trigger_3g_scene',event:'SCENE_OBSERVED',dialogueId:'lan_3g_observe_001',condition:{era:'3G'},priority:2},
    {id:'trigger_3g_phone',event:'EXHIBIT_CLICK',dialogueId:'lan_3g_phone_001',condition:{era:'3G',exhibitId:'exhibit.3g.handset'},priority:2},
    {id:'trigger_3g_web',event:'EXHIBIT_CLICK',dialogueId:'lan_3g_web_001',condition:{era:'3G',exhibitId:'exhibit.3g.web'},priority:2},
    {id:'trigger_3g_nodeb',event:'EXHIBIT_CLICK',dialogueId:'lan_3g_nodeb_001',condition:{era:'3G',exhibitId:'exhibit.3g.nodeb'},priority:2},
    {id:'trigger_3g_video',event:'EXHIBIT_CLICK',dialogueId:'lan_3g_video_001',condition:{era:'3G',exhibitId:'exhibit.3g.video'},priority:2},
    {id:'trigger_3g_lab',event:'TECH_START',dialogueId:'lan_3g_lab_001',condition:{era:'3G'},priority:2},
    {id:'trigger_3g_task_start',event:'TASK_START',dialogueId:'lan_3g_task_start_001',condition:{era:'3G'},priority:1},
    {id:'trigger_3g_network',event:'TASK_CLUE',dialogueId:'lan_3g_clue_network_001',condition:{era:'3G',clue:'network'},priority:2},
    {id:'trigger_3g_terminal',event:'TASK_CLUE',dialogueId:'lan_3g_clue_terminal_001',condition:{era:'3G',clue:'terminal'},priority:2},
    {id:'trigger_3g_server',event:'TASK_CLUE',dialogueId:'lan_3g_clue_server_001',condition:{era:'3G',clue:'server'},priority:2},
    {id:'trigger_3g_speed',event:'TASK_CLUE',dialogueId:'lan_3g_clue_speed_001',condition:{era:'3G',clue:'speed'},priority:2},
    {id:'trigger_3g_reveal',event:'TASK_REVEAL',dialogueId:'lan_3g_reveal_001',condition:{era:'3G'},priority:1},
    {id:'trigger_3g_complete',event:'TASK_COMPLETE',dialogueId:'lan_3g_task_complete_001',condition:{era:'3G'},priority:1},
    {id:'trigger_3g_summary',event:'ERA_ARCHIVE',dialogueId:'lan_3g_summary_001',condition:{era:'3G'},priority:1},
    {id:'trigger_3g_unlock_4g',event:'ERA_UNLOCK',dialogueId:'lan_3g_unlock_4g_001',condition:{era:'3G',nextEra:'4G'},priority:1},
    {id:'trigger_3g_experience_enter',event:'EXPERIENCE_NODE',dialogueId:'lan_3g_experience_enter_001',condition:{era:'3G',nodeId:'ENTER_EXPERIENCE_3G'},priority:2},
    {id:'trigger_3g_experience_internet',event:'EXPERIENCE_NODE',dialogueId:'lan_3g_experience_internet_001',condition:{era:'3G',nodeId:'CLICK_FIRST_MOBILE_INTERNET'},priority:2},
    {id:'trigger_3g_experience_map',event:'EXPERIENCE_NODE',dialogueId:'lan_3g_experience_map_001',condition:{era:'3G',nodeId:'USE_MOBILE_MAP'},priority:2},
    {id:'trigger_3g_experience_content',event:'EXPERIENCE_NODE',dialogueId:'lan_3g_experience_content_001',condition:{era:'3G',nodeId:'BROWSE_MOBILE_CONTENT'},priority:2},
    {id:'trigger_3g_experience_video',event:'EXPERIENCE_NODE',dialogueId:'lan_3g_experience_video_001',condition:{era:'3G',nodeId:'WATCH_EARLY_VIDEO'},priority:2},
    {id:'trigger_3g_merge',event:'EXPERIENCE_MERGE',dialogueId:'lan_3g_merge_001',condition:{era:'3G'},priority:1}
  ];
  root.ExperienceStory3G = {
    id:'experience_story_3g',era:'3G',title:'掌上的世界',type:'experience',
    nodes:[
      {id:'experience.3g.enter',trigger:'ENTER_EXPERIENCE_3G',location:'生活影响资料',emotion:'nostalgic',dialogueId:'lan_3g_experience_enter_001',exhibit:null,reward:null,completed:false},
      {id:'experience.3g.internet',trigger:'CLICK_FIRST_MOBILE_INTERNET',location:'早期智能手机',emotion:'curious',dialogueId:'lan_3g_experience_internet_001',exhibit:'exhibit.3g.handset',reward:'3G移动互联网体验记录',completed:false},
      {id:'experience.3g.map',trigger:'USE_MOBILE_MAP',location:'移动地图',emotion:'thinking',dialogueId:'lan_3g_experience_map_001',exhibit:'exhibit.3g.web',reward:'3G移动互联网体验记录',completed:false},
      {id:'experience.3g.content',trigger:'BROWSE_MOBILE_CONTENT',location:'新闻与图片',emotion:'nostalgic',dialogueId:'lan_3g_experience_content_001',exhibit:'exhibit.3g.image',reward:'3G移动互联网体验记录',completed:false},
      {id:'experience.3g.video',trigger:'WATCH_EARLY_VIDEO',location:'早期移动视频',emotion:'expecting',dialogueId:'lan_3g_experience_video_001',exhibit:'exhibit.3g.image',reward:'3G移动互联网体验记录',completed:false}
    ]
  };
})(window);
