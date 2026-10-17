/* 《通信简史：从1G到6G》运行时兼容资料注册。
 * 从 app.js 现有章节与展品资料恢复旧页面所需的数据入口，并建立统一查询模型。
 */
(function (root) {
  'use strict';

  const photoSources = {
    '1G': {
      file: '1g-dynatac.jpg', title: 'Motorola DynaTAC 8000X', type: '真实产品照片（后期拍摄）',
      note: '图源将这件DynaTAC 8000X实物描述为1984年产品；照片摄于2008年，不代表型号首次发布于1984年，也不是当年的现场照片。',
      credit: 'Redrum0486', license: 'CC BY-SA 3.0',
      source: 'https://commons.wikimedia.org/wiki/File:DynaTAC8000X.jpg',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    '2G': {
      file: '2g-nokia-2110i.jpg', title: 'Nokia 2110i GSM移动电话', type: '真实产品照片（后期拍摄）',
      note: 'GSM终端产品照片，上传于2010年；照片上传时间不等于型号发布时间。',
      credit: 'Argus fin', license: 'CC BY-SA 3.0',
      source: 'https://commons.wikimedia.org/wiki/File:Nokia_2110i.jpg',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    },
    '3G': {
      file: '3g-nokia-6630.jpg', title: 'Nokia 6630 3G移动终端', type: '真实产品照片（后期拍摄）',
      note: '3G时代移动终端产品照片，拍摄于2006年；不是21世纪初的历史现场照片。',
      credit: 'Steve Gregory', license: '作者声明释放至公有领域（建议复核原页）',
      source: 'https://commons.wikimedia.org/wiki/File:Nokia_6630.jpg',
      licenseUrl: 'https://commons.wikimedia.org/wiki/File:Nokia_6630.jpg'
    },
    '4G': {
      file: '4g-atrix.jpg', title: 'Motorola Atrix 4G（HSPA+，非LTE）', type: '真实产品照片（后期拍摄）',
      note: '2011年产品照片。原版Atrix 4G使用HSPA+，并非LTE终端；名称中的4G反映当时的商业命名，不能用这张照片证明LTE硬件。',
      credit: 'ETC@USC', license: 'CC BY-SA 2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Motorola_Atrix_4G.jpg',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/'
    },
    '5G': {
      file: '5g-factory-robot.jpg', title: '现代工厂机器人作业场景', type: '时代场景图片（不证明5G部署）',
      note: '现代工厂机器人作业照片，仅说明工业环境；不证明画中设备使用5G。',
      credit: 'Nenad Stojković（Commons上传者：Shixart1985）', license: 'CC BY 2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Robot_arm_operates_machine_in_factory_setting.jpg',
      licenseUrl: 'https://creativecommons.org/licenses/by/2.0/'
    }
  };

  const flowDefinitions = {
    '1G': ['移动电话', '无线电波', '蜂窝基站', '电话网络'],
    '2G': ['数字移动电话', 'GSM无线接入', '短信服务中心', '接收终端'],
    '3G': ['手机与浏览器', '3G无线接入', '移动数据网络', '互联网服务'],
    '4G': ['智能手机与视频', 'LTE无线接入', '移动宽带网络', '视频服务'],
    '5G': ['传感器与设备', '5G网络连接', '工业控制系统', '协同设备运行'],
    '6G': ['模拟环境与感知', '通信数据传递', '智能分析验证', '数字模型更新']
  };
  const flowNotes = {
    '1G': '项目原创简化示意：移动终端经无线链路接入蜂窝基站，再连接电话网络；实际网络结构因系统而异。',
    '2G': '项目原创简化示意：数字终端通过移动网络提交短信，由服务中心转发至接收端。',
    '3G': '项目原创简化示意：手机经3G无线接入和移动数据网络访问互联网服务。此前GPRS等已提供移动数据服务；3G进一步提高承载能力，终端与服务也影响体验。',
    '4G': '项目原创简化示意：LTE移动宽带连接终端与视频服务；播放质量还受网络、终端解码和服务响应影响。',
    '5G': '项目原创简化示意：设备状态经通信网络到达控制系统；5G不自动保证工业安全、零时延或正确控制，真实效果取决于网络部署、控制系统及安全设计。',
    '6G': '项目原创未来研究情境示意：6G仍处于研究、标准制定与技术验证阶段。这里展示传感器数据处理链，不等同于无线接口的通信感知融合实现，也不是IMT-2030性能实测。'
  };

  try {
    if (!Array.isArray(eras) || !hallDeepening || typeof root.createCommsContentModel !== 'function') {
      throw new Error('app.js章节资料或内容模型工厂尚未加载。');
    }

    const mediaAssets = {};
    const exhibitLinks = {};
    const technicalNotes = {};
    for (const era of eras) {
      const id = era.id;
      const hall = hallDeepening[id];
      const photo = photoSources[id];
      if (!hall || !Array.isArray(hall.exhibits) || !hall.knowledge) {
        throw new Error(`${id}缺少展品或技术理解资料。`);
      }
      mediaAssets[id] = {
        photo: photo ? `assets/images/photos/${photo.file}` : null,
        photoTitle: photo?.title || '6G数字孪生城市研究情境',
        photoType: photo?.type || '原创未来概念图（非历史照片）',
        photoNote: photo?.note || '项目原创未来情境设计；6G仍处于研究发展阶段，不代表已经商用的设备。',
        photoCredit: photo?.credit || '《通信简史》项目原创CSS概念示意',
        photoLicense: photo?.license || '项目原创概念示意',
        photoLicenseUrl: photo?.licenseUrl || null,
        photoSource: photo?.source || null,
        flow: flowDefinitions[id],
        flowNote: flowNotes[id]
      };
      const key = id.toLowerCase();
      exhibitLinks[id] = {
        taskId: `task.${key}.investigation`,
        understandingTaskId: `task.${key}.understanding`,
        evidenceId: id === '5G' ? 'evidence.5g.result' : `evidence.${key}.investigation`,
        principleEvidenceId: `evidence.${key}.principle`,
        exhibitId: id === '5G' ? 'exhibit.5g.factory' : hall.exhibits[0].id,
        flowId: `flow.${key}.communication`
      };
      technicalNotes[id] = [
        [hall.knowledge.title, hall.knowledge.prompt],
        [era.object, era.objectInfo],
        [hall.problem, hall.transition || era.core]
      ];
    }

    root.mediaAssets = mediaAssets;
    root.exhibitLinks = exhibitLinks;
    root.technicalNotes = technicalNotes;
    root.CommsArchiveContent = root.createCommsContentModel({
      eras,
      hallDeepening,
      technicalNotes,
      mediaAssets,
      exhibitLinks,
      getState: () => state
    });
    root.CommsArchiveRuntimeContentStatus = {
      status: 'ready',
      reason: null,
      eraCount: root.CommsArchiveContent.eras.length,
      exhibitCount: root.CommsArchiveContent.exhibits.length,
      taskCount: root.CommsArchiveContent.tasks.length,
      imageCount: root.CommsArchiveContent.images.length
    };
    root.dispatchEvent?.(new Event('comms-archive-content-ready'));
  } catch (error) {
    root.CommsArchiveRuntimeContentStatus = { status: 'failed', reason: error?.message || String(error) };
    console.error('CONTENT_REGISTRATION_FAILED', error);
    root.dispatchEvent?.(new Event('comms-archive-content-failed'));
  }
})(window);
