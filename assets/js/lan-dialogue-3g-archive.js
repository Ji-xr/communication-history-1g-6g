/* 3G归档节点与4G过渡对白。 */
(function(root){
  'use strict';
  root.LanArchiveDialogues3G=[
    {id:'lan_3g_archive_entry_001',era:'3G',location:'archive',trigger:'enter_3g_archive',emotion:'nostalgia',dialogueType:'story',text:'3G时代的探索，到这里暂时结束。\n我们从技术现场与日常生活两个角度看到了这个时代。\n移动网络开始承载更多数据。\n更多人通过手机接触更丰富的互联网服务。',next:null},
    {id:'lan_3g_archive_technology_001',era:'3G',location:'archive',trigger:'view_3g_technology_archive',emotion:'research',dialogueType:'optional',text:'3G提高了移动数据承载能力。\n声音、文字、图片和视频更容易在移动中传递。\n这延续了此前移动数据服务的发展，而不是手机上网的起点。',next:null},
    {id:'lan_3g_archive_experience_001',era:'3G',location:'archive',trigger:'view_3g_experience_archive',emotion:'warm',dialogueType:'optional',text:'通信的发展，从来不只是技术参数的变化。\n真正重要的是，它改变了人与世界连接的方式。\n手机逐渐成为探索世界的窗口。',next:null},
    {id:'lan_3g_archive_complete_001',era:'3G',location:'archive',trigger:'complete_3g_archive',emotion:'success',dialogueType:'story',text:'3G时代档案记录完成。\n你见证了通信从人与人的连接，走向人与信息的连接。\n下一站，我们将进入一个更高速的时代。',next:'lan_3g_archive_unlock_4g_001'},
    {id:'lan_3g_archive_unlock_4g_001',era:'3G',location:'transition',trigger:'enter_4g_prepare',emotion:'expecting',dialogueType:'story',text:'3G打开了通往世界的窗口。\n但当信息越来越丰富，人们开始期待更快、更流畅的连接。\n下一站，我们去看看高速网络如何改变表达方式。',next:'ENTER_ERA:4G'}
  ];
  root.LanArchiveTriggers3G=[
    {id:'trigger_3g_archive_entry',event:'ENTER_ARCHIVE_3G',dialogueId:'lan_3g_archive_entry_001',condition:{era:'3G'},priority:1},
    {id:'trigger_3g_archive_technology',event:'VIEW_ARCHIVE_SECTION',dialogueId:'lan_3g_archive_technology_001',condition:{era:'3G',section:'technology'},priority:2},
    {id:'trigger_3g_archive_experience',event:'VIEW_ARCHIVE_SECTION',dialogueId:'lan_3g_archive_experience_001',condition:{era:'3G',section:'experience'},priority:2},
    {id:'ARCHIVE_3G_COMPLETE',event:'ARCHIVE_3G_COMPLETE',dialogueId:'lan_3g_archive_complete_001',condition:{era:'3G'},priority:1},
    {id:'trigger_3g_unlock_4g_archive',event:'UNLOCK_4G',dialogueId:'lan_3g_archive_unlock_4g_001',condition:{era:'3G',nextEra:'4G'},priority:1}
  ];
})(window);
