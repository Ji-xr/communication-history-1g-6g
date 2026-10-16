/* 通信简史——从1G到6G：可扩展内容模型。
 * 此文件只把既有章节数据整理为统一查询视图，不改写或替代原有内容与交互。
 */
(function (root) {
  'use strict';

  const imageTypes = Object.freeze([
    '历史照片', '真实产品照片', '技术示意图', '时代场景图片',
    '原创概念图', 'AI生成素材', '三维复原'
  ]);

  function createCommsContentModel(source) {
    const { eras, hallDeepening, technicalNotes, mediaAssets, exhibitLinks, getState } = source || {};
    if (!Array.isArray(eras) || !hallDeepening || !technicalNotes || !mediaAssets || !exhibitLinks || typeof getState !== 'function') {
      throw new TypeError('通信简史内容模型缺少既有章节数据。');
    }

    const tasks = [];
    const exhibits = [];
    const images = [];
    const flows = [];
    const dialogues = [];
    const evidenceDefinitions = [];
    const eraRecords = eras.map((era) => {
      const id = era.id;
      const key = id.toLowerCase();
      const detail = hallDeepening[id];
      const media = mediaAssets[id];
      const links = exhibitLinks[id];
      if (!detail || !media || !links) throw new Error(`年代 ${id} 缺少现有展厅资料。`);

      const exhibitRecords = detail.exhibits.map((item, index) => {
        const taskIds = [`task.${key}.understanding`, links.taskId];
        const imageIds = [`image.${key}.flow`];
        if (index === 0) imageIds.unshift(`image.${key}.primary`);
        const record = {
          id: item.id,
          exhibitId: item.id,
          era: id,
          eraId: id,
          name: item.name,
          type: item.type,
          description: item.detail,
          historicalIntroduction: item.detail,
          technicalExplanation: era.objectInfo,
          eraImpact: era.record,
          associatedImageIds: imageIds,
          linkedTaskIds: taskIds,
          imageIds,
          taskIds,
          technicalFlowId: links.flowId,
          details: { history: true, technology: true, impact: true },
          sourceData: item
        };
        exhibits.push(record);
        return record;
      });

      const understandingId = `task.${key}.understanding`;
      const investigationId = links.taskId;
      const evidenceResultId = links.evidenceId;
      const evidencePrincipleId = `evidence.${key}.principle`;
      const knowledge = detail.knowledge;
      tasks.push({
        id: understandingId,
        taskId: understandingId,
        era: id,
        eraId: id,
        title: knowledge.title,
        name: knowledge.title,
        description: knowledge.prompt,
        kind: '技术理解',
        background: knowledge.prompt,
        objective: knowledge.prompt,
        clues: [],
        options: knowledge.options.map((option, index) => ({
          optionId: `${understandingId}.option-${index + 1}`,
          label: option.label,
          feedback: option.feedback,
          correct: !!option.correct,
          evidenceId: option.correct ? evidencePrincipleId : null
        })),
        feedback: knowledge.options.map((option) => option.feedback),
        evidenceIds: [evidencePrincipleId],
        exhibitIds: [exhibitRecords[0]?.exhibitId, exhibitRecords[1]?.exhibitId].filter(Boolean),
        flowId: links.flowId,
        sourceData: knowledge
      });

      const investigationOptions = (era.opts || []).map((option, index) => ({
        optionId: `${investigationId}.option-${index + 1}`,
        label: option[0],
        feedback: option[1],
        dialogueId: `dialogue.${key}.investigation.option-${index + 1}`
      }));
      tasks.push({
        id: investigationId,
        taskId: investigationId,
        era: id,
        eraId: id,
        title: era.question,
        name: era.question,
        description: era.open,
        kind: '时代问题调查',
        background: era.open,
        objective: era.question,
        clues: investigationOptions.map(({ optionId, label, feedback }) => ({ clueId: optionId, label, content: feedback })),
        options: investigationOptions,
        feedback: investigationOptions.map((option) => option.feedback),
        secondaryInvestigation: era.secondary ? {
          title: era.secondary.title,
          options: era.secondary.opts.map((option, index) => ({
            optionId: `${investigationId}.followup-${index + 1}`,
            label: option[0], feedback: option[1], dialogueContent: option[2]
          }))
        } : null,
        evidenceIds: [evidenceResultId],
        prerequisites: [`task.${key}.understanding`],
        exhibitIds: exhibitRecords.map((item) => item.exhibitId),
        flowId: links.flowId,
        sourceData: era
      });

      if (detail.openTask) {
        const designId = `task.${key}.research-design`;
        tasks.push({
          id: designId,
          taskId: designId,
          era: id,
          eraId: id,
          title: detail.openTask.title,
          name: detail.openTask.title,
          description: detail.openTask.prompt,
          kind: '开放式研究方案',
          background: detail.openTask.prompt,
          objective: detail.openTask.prompt,
          clues: [], options: [], feedback: [], evidenceIds: [evidenceResultId],
          prerequisites: [investigationId], exhibitIds: exhibitRecords.map((item) => item.exhibitId),
          flowId: links.flowId, sourceData: detail.openTask
        });
      }

      const photoId = `image.${key}.primary`;
      const flowImageId = `image.${key}.flow`;
      images.push({
        id: photoId,
        imageId: photoId,
        era: id,
        eraId: id,
        exhibitIds: [exhibitRecords[0]?.exhibitId].filter(Boolean),
        technicalFlowIds: [],
        taskIds: [investigationId],
        evidenceIds: [evidenceResultId],
        name: media.photoTitle,
        type: media.photo ? (id === '5G' ? '时代场景图片' : '真实产品照片') : '原创概念图',
        imageType: media.photo ? (id === '5G' ? '时代场景图片' : '真实产品照片') : '原创概念图',
        sourceType: media.photo ? (id === '5G' ? 'HISTORICAL_SCENE_REFERENCE' : 'PRODUCT_PHOTOGRAPH') : 'ORIGINAL_CONCEPT',
        path: media.photo || null,
        source: media.photoSource || null,
        credit: media.photoCredit || null,
        license: media.photoLicense || null,
        licenseUrl: media.photoLicenseUrl || null,
        authenticity: media.photoNote,
        available: !!media.photo,
        sourceData: media
      });
      images.push({
        id: flowImageId,
        imageId: flowImageId,
        era: id,
        eraId: id,
        exhibitIds: exhibitRecords.map((item) => item.exhibitId),
        technicalFlowIds: [links.flowId],
        taskIds: [understandingId, investigationId],
        evidenceIds: [evidencePrincipleId, evidenceResultId],
        name: `${id}技术流程示意`, type: '技术示意图', path: null,
        imageType: '技术示意图', sourceType: 'PROJECT_ORIGINAL_DIAGRAM',
        source: '项目原创：app.js 内联 SVG', credit: '《通信简史》项目', license: '项目原创示意图',
        authenticity: media.flowNote,
        available: true,
        sourceData: media
      });

      const flow = {
        flowId: links.flowId,
        eraId: id,
        theme: technicalNotes[id].map((item) => item[0]),
        steps: media.flow.map((label, index) => ({ stepId: `${links.flowId}.step-${index + 1}`, order: index + 1, label })),
        explanation: media.flowNote,
        animation: { kind: 'step-highlight', isSimulation: true, controls: ['play', 'pause', 'step', 'replay'] },
        sourceData: media
      };
      flows.push(flow);

      const addDialogue = (suffix, location, trigger, content, nextAction) => {
        dialogues.push({
          id: `dialogue.${key}.${suffix}`,
          dialogueId: `dialogue.${key}.${suffix}`,
          era: id,
          characterId: 'lan',
          speaker: '澜',
          location, trigger, emotion: null,
          text: Array.isArray(content) ? content.slice() : content,
          content: Array.isArray(content) ? content.slice() : content,
          nextAction: nextAction || null
        });
      };
      addDialogue('chapter-opening', 'chapter', 'enter-era', era.intro, investigationId);
      investigationOptions.forEach((option, index) => {
        addDialogue(`investigation.option-${index + 1}`, 'task', `select:${option.optionId}`, era.opts[index][2], investigationId);
      });
      addDialogue('reveal', 'task-reveal', 'reveal-truth', era.reveal, `archive.${key}`);
      addDialogue('chapter-ending', 'chapter-end', 'complete-era', era.end, id === '6G' ? 'journey.complete' : `era.${eras[(eras.indexOf(era) + 1) % eras.length]?.id}`);

      evidenceDefinitions.push({
        id: evidencePrincipleId,
        evidenceId: evidencePrincipleId, eraId: id, sourceTaskId: understandingId,
        era: id, taskId: understandingId,
        type: id === '6G' ? '研究方向记录' : '技术资料',
        name: `${id}技术理解任务记录`, description: null,
        imageIds: [flowImageId], exhibitIds: [exhibitRecords[1]?.exhibitId].filter(Boolean),
        archiveLocation: `archive#${evidencePrincipleId}`
      }, {
        id: evidenceResultId,
        evidenceId: evidenceResultId, eraId: id, sourceTaskId: investigationId,
        era: id, taskId: investigationId,
        type: '任务结果', name: `${id}调查结果档案`, description: era.achievement,
        imageIds: media.photo ? [photoId] : [flowImageId],
        exhibitIds: [links.exhibitId], archiveLocation: `archive#${evidenceResultId}`
      });

      return {
        id,
        eraId: id, generation: id, timeRange: era.year, theme: era.theme, color: era.color,
        title: era.title,
        spatialStyle: { kind: 'threejs-programmatic-zone', visualKeywords: era.keys, palette: era.color },
        exhibition: {
          background: era.open, mainProblem: detail.problem,
          technicalBreakthroughs: technicalNotes[id].map(([title, explanation]) => ({ title, explanation })),
          historicalSignificance: era.core
        },
        background: era.open,
        exhibitIds: exhibitRecords.map((item) => item.exhibitId),
        imageIds: [photoId, flowImageId], flowIds: [links.flowId],
        taskIds: tasks.filter((task) => task.eraId === id).map((task) => task.taskId),
        dialogueIds: dialogues.filter((item) => item.dialogueId.startsWith(`dialogue.${key}.`)).map((item) => item.dialogueId),
        evidenceIds: evidenceDefinitions.filter((item) => item.eraId === id).map((item) => item.evidenceId),
        experience: { person: null, scene: era.moment, communicationExperience: era.record, eraChange: era.core },
        summary: { technicalAchievement: era.achievement, historicalImpact: era.core, nextGenerationQuestion: detail.transition || era.end },
        sourceData: era
      };
    });

    const lanCharacter = root.LanCharacterProfile || {
      id: 'lan', name: '澜', identity: '来自未来通信文明档案馆的年轻科研人员。',
      role: '与用户平等协作的科研伙伴', personality: ['理性', '好奇', '温和'],
      coreRegret: '曾经只记录通信技术的发展，却忽略了技术背后人的感受。',
      growthStages: { '1G': '探索', '2G': '探索', '3G': '观察', '4G': '观察', '5G': '连接', '6G': '理解' },
      timelineRole: '作为平等科研伙伴，与用户共同补全技术记录背后的人的通信历史。'
    };
    const lanDialogueSchema = Object.freeze({
      id: 'string', era: 'string|null', location: 'string', trigger: 'string',
      emotion: 'string|null', dialogue: 'string|string[]', text: 'string|string[]', image: 'string|null', voice: 'string|null',
      relatedTask: 'string|null', relatedExhibit: 'string|null'
    });
    const lanDialogues = dialogues.map((item) => ({
      id: item.id.replace(/^dialogue\./, 'lan.'), era: item.era, location: item.location,
      trigger: item.trigger, emotion: item.emotion || 'companion', dialogue: item.text, text: item.text,
      image: null, voice: null, relatedTask: item.nextAction && item.nextAction.startsWith('task.') ? item.nextAction : null,
      relatedExhibit: hallDeepening[item.era]?.exhibits?.[0]?.id || null
    }));
    const addLanDialogue = (id, era, location, trigger, emotion, dialogue, relatedTask = null, relatedExhibit = null) => {
      lanDialogues.push({ id, era, location, trigger, emotion, dialogue, text: dialogue, image: null, voice: null, relatedTask, relatedExhibit });
    };
    addLanDialogue('lan.home.first-visit', null, 'home', 'first-visit', 'happy', ['你好，我是澜，来自未来通信文明档案馆的年轻科研人员。', '我正在调查通信文明档案中缺失的生活记录。技术资料写下了通信如何发展，却很少告诉我们它怎样进入日常。', '愿意和我一起走进这些时代，看看通信如何改变人与人的联系吗？']);
    addLanDialogue('lan.prologue.first-travel', null, 'prologue', 'open', 'curious', '第一次穿越，总会有点紧张——放心，我也会边走边核对档案。');
    addLanDialogue('lan.gallery.select-era', null, 'gallery', 'select-era', 'curious', '选好下一站了吗？我会把这个时代的已知资料和不确定之处都标出来。');
    addLanDialogue('lan.exhibit.open', null, 'exhibit', 'open-details', 'thinking', '先看实物留下的线索，再顺着原理图追一遍信号。图片说明和来源也在档案里。');
    addLanDialogue('lan.task.start', null, 'task', 'start-investigation', 'thinking', '先别急着下结论。挑一条线索，我们一起看看它能说明什么。');
    addLanDialogue('lan.task.complete', null, 'task', 'complete-investigation', 'happy', '记录完成了。你找到的不只是答案，还有它为什么成立的证据。');
    addLanDialogue('lan.archive.open', null, 'archive', 'open', 'companion', '每张证据卡都连着一次调查。想回去复核展品或流程图，点关联资料就能继续。');
    addLanDialogue('lan.6g.identity-reveal', '6G', 'ending', 'journey-complete', 'nostalgic', ['六代调查已经完成，技术线索和人的体验都补进了档案。', '我曾经认为，通信历史记录的是技术进步。但和你一起经历这些时代后，我发现……', '真正被连接的，是人与人之间想被听见、被看见、被理解的瞬间。我们把这份档案命名为《连接的文明：人类通信六代记录》。']);
    const eraGreetings = {
      '1G': ['欢迎来到通信历史的第一页。', '这里的人们第一次尝试，把声音带离固定电话线。'],
      '2G': ['你发现了吗？', '通信开始不只是传递声音，也开始记录人与人的关系。'],
      '3G': ['手机第一次不只是电话。', '它开始变成一个通往世界的小窗口。'],
      '4G': ['速度提升以后，人们开始分享生活。', '通信也改变了每个人表达自己的方式。'],
      '5G': ['这一次，被连接的不只是人。', '机器、城市和产业也开始加入更多通信应用场景。'],
      '6G': ['欢迎来到未来通信研究情境。这里展示的是探索方向，不是已经普遍商用的能力。']
    };
    Object.entries(eraGreetings).forEach(([era, text]) => addLanDialogue(`lan.${era.toLowerCase()}.entrance`, era, 'entrance', 'enter-era', era === '6G' ? 'thinking' : 'happy', text));
    addLanDialogue('lan.3g.relationship-insight', '3G', 'task-reveal', 'reveal-truth', 'thinking', '以前我们记录网络速度，现在我开始理解，手机连接互联网也改变了人们获取信息、看见彼此的方式。');
    addLanDialogue('lan.5g.connection-insight', '5G', 'task-reveal', 'reveal-truth', 'curious', '连接越来越多，但我们不能忘记，连接最终要服务于人。设备与系统可靠协作，才能让技术真正回应生活中的需要。');
    const contentVersion = Object.freeze({ version: '1.0', description: '六代通信基础内容模型建立' });
    const maps = {
      eras: new Map(eraRecords.map((item) => [item.eraId, item])),
      exhibits: new Map(exhibits.map((item) => [item.exhibitId, item])),
      tasks: new Map(tasks.map((item) => [item.taskId, item])),
      images: new Map(images.map((item) => [item.imageId, item])),
      flows: new Map(flows.map((item) => [item.flowId, item])),
      dialogues: new Map(dialogues.map((item) => [item.dialogueId, item])),
      lanDialogues: new Map(lanDialogues.map((item) => [item.id, item]))
    };

    const result = {
      schemaVersion: 1,
      contentVersion,
      imageTypes,
      eras: eraRecords,
      exhibits, images, flows, tasks, dialogues,
      lanDialogueSchema,
      lanCharacter,
      lanDialogues,
      lanRole: { characterId: lanCharacter.id, displayName: lanCharacter.name, status: 'reserved', dialogues: lanDialogues },
      evidenceDefinitions,
      getEra(id) { return maps.eras.get(id) || null; },
      getExhibit(id) { return maps.exhibits.get(id) || null; },
      getTask(id) { return maps.tasks.get(id) || null; },
      getImage(id) { return maps.images.get(id) || null; },
      getFlow(id) { return maps.flows.get(id) || null; },
      getDialogue(id) { return maps.dialogues.get(id) || null; },
      getDialogues({ era = null, location = null, trigger = null } = {}) {
        return dialogues.filter((item) => (!era || item.era === era) && (!location || item.location === location) && (!trigger || item.trigger === trigger));
      },
      getLanDialogue(id) { return lanDialogues.find((item) => item.id === id) || null; },
      getLanDialogues({ era = null, location = null, trigger = null } = {}) {
        return lanDialogues.filter((item) => (!era || item.era === era || item.era === null) && (!location || item.location === location) && (!trigger || item.trigger === trigger));
      },
      getEvidence(id) { return evidenceDefinitions.find((item) => item.id === id) || null; },
      getCollectedEvidenceById(id) { return this.getCollectedEvidence().find((item) => item.evidenceId === id) || null; },
      queryEra(id) { return queryById('Era', id, this.getEra(id)); },
      queryExhibit(id) { return queryById('Exhibit', id, this.getExhibit(id)); },
      queryImage(id) { return queryById('Image', id, this.getImage(id)); },
      queryTask(id) { return queryById('Task', id, this.getTask(id)); },
      queryEvidence(id) { return queryById('Evidence', id, this.getEvidence(id)); },
      queryDialogues(filters = {}) {
        const items = this.getDialogues(filters);
        return items.length
          ? { ok: true, items, error: null }
          : { ok: false, items: [], error: '没有符合年代、位置和触发条件的对白。' };
      },
      checkCompleteness() {
        const errors = [];
        const warnings = [];
        const expectedEras = ['1G', '2G', '3G', '4G', '5G', '6G'];
        const required = (object, keys, label) => {
          for (const key of keys) {
            const value = object?.[key];
            if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) errors.push(`${label} 缺少字段 ${key}`);
          }
        };
        for (const id of expectedEras) {
          const era = maps.eras.get(id);
          if (!era) { errors.push(`缺少时代 ${id}`); continue; }
          required(era, ['id', 'title', 'theme', 'background', 'summary'], `Era ${id}`);
          if (!era.summary?.technicalAchievement || !era.summary?.historicalImpact || !era.summary?.nextGenerationQuestion) errors.push(`Era ${id} 年代总结字段不完整`);
          const eraExhibits = exhibits.filter((item) => item.era === id);
          if (!eraExhibits.length) errors.push(`Era ${id} 没有展品`);
          for (const exhibit of eraExhibits) {
            required(exhibit, ['id', 'era', 'type', 'description'], `Exhibit ${exhibit.id}`);
            if (!exhibit.imageIds.length || exhibit.imageIds.some((imageId) => !maps.images.has(imageId))) errors.push(`Exhibit ${exhibit.id} 的图片关联缺失或无效`);
            if (!exhibit.taskIds.length || exhibit.taskIds.some((taskId) => !maps.tasks.has(taskId))) errors.push(`Exhibit ${exhibit.id} 的任务关联缺失或无效`);
          }
          for (const kind of ['技术理解', '时代问题调查']) {
            const task = tasks.find((item) => item.era === id && item.kind === kind);
            if (!task) { errors.push(`Era ${id} 缺少${kind}任务`); continue; }
            required(task, ['id', 'era', 'title', 'description', 'options', 'feedback'], `Task ${task.id}`);
            if (!task.options.length && kind !== '开放式研究方案') errors.push(`Task ${task.id} 没有可选方案`);
            if (task.options.some((option) => !option.label || !option.feedback)) errors.push(`Task ${task.id} 存在缺少反馈的选项`);
            if (task.feedback.some((feedback) => !feedback)) errors.push(`Task ${task.id} 存在空反馈`);
          }
        }
        for (const dialogue of dialogues) {
          required(dialogue, ['id', 'speaker', 'era', 'location', 'trigger', 'text'], `Dialogue ${dialogue.id}`);
        }
        for (const evidence of evidenceDefinitions) {
          required(evidence, ['id', 'era', 'taskId', 'type', 'name', 'exhibitIds', 'imageIds', 'archiveLocation'], `Evidence ${evidence.id}`);
          if (!maps.eras.has(evidence.era)) errors.push(`Evidence ${evidence.id} 关联的年代不存在`);
          if (!maps.tasks.has(evidence.taskId)) errors.push(`Evidence ${evidence.id} 关联的任务不存在`);
          if (evidence.exhibitIds.some((id) => !maps.exhibits.has(id))) errors.push(`Evidence ${evidence.id} 关联的展品不存在`);
          if (evidence.imageIds.some((id) => !maps.images.has(id))) errors.push(`Evidence ${evidence.id} 关联的图片不存在`);
        }
        if (Object.values(lanCharacter).some((value) => value === '')) warnings.push('澜的角色设定字段目前为空，等待后续阶段确认。');
        if (lanDialogues.length === 0) warnings.push('当前没有澜对白；本阶段按要求只预留结构。');
        return { ok: errors.length === 0, errorCount: errors.length, warningCount: warnings.length, errors, warnings, summary: { eras: eraRecords.length, exhibits: exhibits.length, tasks: tasks.length, dialogues: dialogues.length, evidenceDefinitions: evidenceDefinitions.length } };
      },
      getCollectedEvidence() {
        const stored = getState()?.evidence;
        if (!Array.isArray(stored)) return [];
        return stored.map((record) => {
          const definition = evidenceDefinitions.find((item) => item.evidenceId === record.evidenceId) || null;
          return {
            ...record,
            eraId: record.eraId || definition?.eraId || null,
            sourceTaskId: record.taskId || definition?.sourceTaskId || null,
            evidenceType: record.type || definition?.type || null,
            description: record.content || definition?.description || null,
            imageIds: definition?.imageIds || [],
            archiveLocation: definition?.archiveLocation || (record.evidenceId ? `archive#${record.evidenceId}` : null)
          };
        });
      }
    };
    return result;
  }

  function queryById(type, id, data) {
    return data
      ? { ok: true, id, data, error: null }
      : { ok: false, id: id ?? null, data: null, error: `${type} 未找到：${String(id)}` };
  }

  root.createCommsContentModel = createCommsContentModel;
})(window);
