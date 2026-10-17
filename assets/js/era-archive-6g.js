/* 《通信简史》6G研究情境档案与调查证据定义。 */
(function(root){
  'use strict';
  root.ArchiveEvidence6G=[
    {id:'evidence_6g_delay',era:'6G',type:'研究情境调查结果',owner:'CHECK_6G_COMMUNICATION',source:'模拟任务：通信链路检查',description:'测试情境中部分状态数据到达较晚；该记录用于讨论传输时效与调度，不代表现实6G部署故障。',exhibitId:'exhibit.6g.scenario',imageId:null,archiveLocation:'archive_6g',collected:false},
    {id:'evidence_6g_sensor',era:'6G',type:'研究情境调查结果',owner:'CHECK_6G_SENSING',source:'模拟任务：环境感知检查',description:'测试情境中的部分感知记录与现场状态存在差异；需校准并重复验证。',exhibitId:'exhibit.6g.sensing',imageId:null,archiveLocation:'archive_6g',collected:false},
    {id:'evidence_6g_ai',era:'6G',type:'研究情境调查结果',owner:'CHECK_6G_AI_MODEL',source:'模拟任务：人工智能分析检查',description:'测试情境中模型状态判断与验证数据不一致；模型输出需要核验。',exhibitId:'exhibit.6g.sensing',imageId:null,archiveLocation:'archive_6g',collected:false},
    {id:'evidence_6g_twin',era:'6G',type:'研究情境调查结果',owner:'CHECK_6G_DIGITAL_TWIN',source:'模拟任务：数字孪生更新检查',description:'测试情境中的数字模型更新滞后；此为未来研究情境，不是已商用系统记录。',exhibitId:'exhibit.6g.twin',imageId:null,archiveLocation:'archive_6g',collected:false}
  ];
  root.EraArchive6G={
    id:'archive_6g',era:'6G',title:'消失的数字世界',
    summary:'本项目虚构的未来城市模拟中，参考状态与数字模型出现不一致。6G仍处于研究与发展阶段，正在推进标准制定与技术验证；这四项证据是教学调查结果，不是现实网络运行档案。',
    technology:'AI、传感器和数字孪生已有应用。IMT-2030提出通信感知融合、AI与通信融合等未来场景；系统集成和能力目标仍需研究验证，不能视作已实现的商用性能。',
    construction:'调查从通信时效、环境感知、智能分析和数字模型更新四个环节检查模拟异常。',
    experience:'数字城市、环境交互、智能分析与现实状态对照，呈现未来研究可能探索的方向；这些能力并非已普遍部署的6G服务。',
    keywords:['6G研究','通信感知融合','人工智能','数字孪生'],
    evidenceIds:['evidence_6g_delay','evidence_6g_sensor','evidence_6g_ai','evidence_6g_twin'],
    evidence:root.ArchiveEvidence6G,
    completed:false
  };
})(window);
