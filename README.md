# 通信简史：从1G到6G

《通信简史：从1G到6G》是一款中文互动科普网站，通过六代通信时代的任务、档案、知识搜索与问答，介绍移动通信的发展历程。网站支持电脑和手机浏览，并在浏览器本地保存探索进度与答题记录。

## 启动

### Windows（推荐）

1. 双击 `启动通讯简史.cmd`。
2. 浏览器会打开 `http://127.0.0.1:8765/`。首页点击“进入3D时空长廊”。
3. 展厅退出按钮或顶部“首页”导航可返回原网站。进入某章节后，章节页左上角可回到长廊。
4. 结束演示时双击 `停止通讯简史.cmd`。

启动脚本使用 Windows 自带 PowerShell，仅在本机 `127.0.0.1` 提供静态文件，不需要安装 Node、npm 或 Python，也不会对外网开放服务。端口 8765 若已被占用，页面可能无法打开；关闭占用该端口的本机服务后重试。

### 直接双击 index.html

二维网站仍可直接用浏览器打开。多数浏览器会限制 `file://` 页面加载 ES 模块，因此 Three.js 展厅应通过上面的本机 HTTP 启动器访问。展厅核心依赖已随项目本地保存，无需联网下载。若浏览器或设备不支持 WebGL 2、图形驱动不可用或场景加载失败，页面会给出提示，可返回二维网站继续使用其他功能。

## 展厅操作

- 鼠标拖动旋转查看，滚轮缩放；手机单指拖动旋转、双指缩放，点击地面会平滑移动视角焦点。双指缩放手势不会误触展品；界面按钮与3D画布分层响应。
- 点击年代门、年代牌或展品会显示该展区介绍，再点“进入章节”复用现有章节。
- 顶部“退出展厅”回到首页。章节中可返回 3D 长廊；页面导航也可随时回到原有网站。
- 当前版本没有 WASD 第一人称移动、鼠标锁定、碰撞或手机摇杆。

## 文件说明

- `index.html`：网页结构、原站导航和3D展厅外壳。
- `style.css`：原网站样式。
- `assets/css/gallery3d.css`：展厅画布、提示面板和移动布局。
- `assets/css/history-media.css`：六代馆藏图片、原创流程图和手机端纵向流程布局。
- `assets/css/lan.css`：澜字幕伙伴的桌面浮窗与手机底部面板样式。
- `assets/css/progression.css`：线性探索的三栏节点界面与窄屏布局。
- `assets/js/content-model.js`：六代内容、展品、任务、图片与对白的统一内容模型。
- `assets/js/runtime-content.js`：从 `app.js` 已有章节资料恢复旧页面运行时数据入口，并在页面脚本之后注册统一内容模型。
- `assets/js/system-health-check.js`：检查页面初始化、六代任务与证据资料、本地 Three.js 依赖和存档状态，并显示可复核的失败原因。
- `assets/js/lan-system.js`：澜角色资料、对白触发、字幕/语音控制与 Image Archive 扩展。
- `assets/js/audio-system.js`：展厅氛围音、音量、亮度、澜卡片模式与操作提示设置；显示设置独立保存在 `commsArchive.experienceSettings.v1`。
- `assets/js/lan-dialogue-1g.js`：1G入口、现场、展品、技术实验室、调查、归档与2G过渡对白，以及对应事件触发条件。
- `assets/images/Lan/lan_portrait_ai.png`：澜的AI生成原创角色概念立绘，用于序章和字幕头像；不属于历史图片或技术证据。
- `assets/js/progression-manager.js`：节点解锁、对白门控、展品状态、进度校验、旧存档迁移与修复。
- `app.js`：保留六章原始正文和调查数据，并提供展厅补充说明、双任务进度、档案、存档、测验和本地知识问答；3D展厅回调复用这里的章节入口。
- `assets/images/photos/`：本地离线展示的五张有来源记录的设备或工厂场景照片。
- `assets/images/SOURCES.md`：图片作者、素材分类、来源和许可记录。
- `assets/images/IMAGE-ARCHIVE.md`：馆藏照片、流程图、代码生成空间视觉的资源索引。
- `assets/images/Lan/ASSET-PLAN.md`：澜角色透明立绘、表情、动作与时代图片的待制作规格。
- `assets/js/archive3d.js`：Three.js真实3D场景、灯光、六个时代区、每区三件不同的程序化展品、鼠标/触控轨道视角及资源清理。
- `vendor/three/build/three.module.js`、`three.core.js`：本地 Three.js ES 模块及其 r180 核心依赖。
- `vendor/three/LICENSE`、`vendor/three/VERSION`：第三方许可和固定版本记录。
- `serve.ps1`、`启动通讯简史.cmd`、`停止通讯简史.cmd`：Windows 本机静态 HTTP 启停脚本。
- `tests/transition-flow.test.js`：穿越入口、序章连接、失败恢复和角色素材标记的自动化回归检查。
- `tests/lan-dialogue-1g.test.js`：1G对白字段、事件绑定、进度门控、归档过渡与刷新恢复检查。

## 章节文案与本地数据

`app.js` 开头的 `eras` 数组保存章节叙事和交互反馈；`questions` 保存测验题。存档仍使用 `commsArchive` localStorage 键与 `comms-archive-v1` JSON 外层格式；探索节点作为可选 progression 子结构追加，旧时代、任务、日志与证据字段原样保留。JSON 可在章节档案页导入导出。

## 3D实现范围与科普说明

展厅使用 Three.js r180 / npm 版本 `0.180.0`，以原生几何体和 Canvas 纹理制作，未使用外部模型、贴图或字体。场景包含真实 WebGL 2 网格、材质、摄像机、灯光、六个不同年代展区和展品。视觉上是程序化原创几何模型，不是扫描或仿真的真实历史设备。6G展区仅为未来情境设计，6G仍处研究发展阶段，不能视为已大规模商用。

移动通信章节仍可单独进入，不依赖3D画布。CSS 字体表中原有 Google Fonts 请求仅影响字体外观，离线时回退到系统字体；Three.js核心场景文件本地可用。

## 第三方许可

Three.js © 2010–2025 three.js authors，采用 MIT License，许可全文随包保存在 `vendor/three/LICENSE`。固定版本来源为 [`three@0.180.0`](https://www.npmjs.com/package/three/v/0.180.0)。项目原创展品和程序代码不使用外部模型素材。

## 历史图片与技术示意

章节正文、互动任务、线索反馈、档案和测验内容仍由 `app.js` 原有 `eras` 与 `questions` 数据提供。本次图片作为额外的图文区块加入章节、展品详情和完成档案，没有以图片替代或删短原有正文。1G–4G使用有出处的终端照片，5G使用明确标注为场景参考的现代工厂照片；6G使用项目原创未来概念图，并注明仍属研究与发展阶段。六代流程图为项目原创简化SVG示意。每张外部图片的作者、文件页与许可记录见 [`assets/images/SOURCES.md`](assets/images/SOURCES.md)，页面也提供来源入口。照片副本在本地，因此核心图像可离线演示；来源链接需联网才能查看原始授权记录。

新增文件 `assets/css/history-media.css` 控制图片、说明和流程图的响应式排版。外部图片按时代保存在 `assets/images/photos/`，没有额外运行时依赖。

## 展品交互与证据闭环

- 3D展品支持鼠标悬停提示、近距离柔和高亮、点击后平滑靠近；详情关闭后镜头留在附近，可在详情操作区返回原视角。鼠标按钮不会把操作传给3D画布。方向键可旋转视角，`+`/`-`缩放，回车选择视线中央对象；尊重系统减少动态效果设置。
- 展品详情以“历史档案 / 技术原理 / 时代影响”三个标签展示原有章节背景、展品说明、任务真相、体验者故事和年代总结。技术流程提供播放、暂停、单步和重播；图片可放大，出错时显示替代说明与来源入口。
- 每个章节的任务页和揭晓页都能打开关联展品资料。关闭面板会回到原任务，不重置线索；任务进度现在保存选择与调查阶段，刷新或切换年代后可恢复。
- 技术理解任务正确完成后记录技术资料证据；问题调查经揭晓并归档后再生成对应任务结果证据。卡片链接到展品、任务、流程编号、来源及体验者记录，并保存在现有浏览器存档和JSON导出中。
- 旧存档继续使用 `comms-archive-v1`。读取时会渐进补充 `progression` 子结构，映射已完成与已访问年代；原有完成标记、章节正文、线索、日志、任务和证据不删除。相机状态不写入存档；展品面板打开期间可回到打开前视角，关闭面板则保留靠近后的视角。

## 后续可扩展

下一阶段可加入受限第一人称漫游、展区碰撞和步行提示；之后再评估真实模型、纹理、性能档位和无障碍替代控制。当前轨道式视角用于检查全场空间，不会被标注为第一人称自由移动。

## 第四阶段：六代展厅调查体验

每代章节在原有正文、剧情、调查选择和档案之上增加展厅入口、核心问题、三件标注素材类型的展项、技术突破与限制卡片，以及原有体验者叙事。展项分别使用既有馆藏设备图片、项目原创流程图/示意和明确标记的模拟或未来研究材料；不同展项详情不把主图冒充为其独立实物照。

新增“任务1：理解技术”与原有“任务2：时代问题调查”相衔接。理解任务和调查线索在 `state.tasks` 中以可选字段保存。任务1成功后生成一张技术资料证据；完成原有调查后生成任务结果证据。6G的任务1区分研究方向与已商用能力，原有数字孪生异常调查全文保留；揭晓后增加开放式未来方案设计，提交后才能归档。已完成的旧章节允许重新查看，不会被新增任务锁回未完成状态。

三维长廊每个年代包含一件原有主展品和两件新程序化展品模型，分别对应展厅补充资料；展品使用稳定ID连接详情和章节数据。6G标牌注明“研究阶段 / 未来情境设计”。所有新增模型均由Three.js基础几何体组合，没有新增外部资源或运行时依赖。5G和6G技术区提供ITU-R在线原始资料入口；离线时说明文字仍可阅读，来源页需要网络。

## 评审快速体验

首次进入首页，选择“开始调查”后进入1G入口。澜的时代引导对白必须逐句读完，之后依次开放历史现场、建设调查、技术实验室、用户体验与时代档案；时代档案完成后才开启下一时代。已完成时代可回看，锁定时代无法通过主页、时间线或3D入口跳入。调查选择、资料查看、技术理解、体验记录及证据归档都保留在原有任务和档案数据之上。

首页的六代时间线显示年代、主题和本地探索状态；未满足前置条件的年代会被进度管理器拦截并记录尝试。首页右侧的长廊图形是进入真实Three.js展厅前的视觉预览；在展厅中可以鼠标拖动或触控旋转查看、滚轮或双指缩放。当前没有WASD第一人称移动或手机摇杆。

本机存储空间不足或浏览器拒绝写入时，页面会提示保存失败，并提供重试与JSON导出备份。WebGL 2或场景脚本不可用时，页面会切换到二维时代选择，并保留章节正文、图片、任务、档案、测验和问答。


## 手机适配与性能

- 页面使用 width=device-width、initial-scale=1 与 viewport-fit=cover；顶部导航在窄屏可横向滑动，正文、图片和技术流程在手机断点下改为单列，流程节点纵向显示。展品详情使用底部抽屉式面板，图片放大层适配安全区。
- 三维画布支持触屏单指旋转、双指缩放和点地面平滑移动视角焦点；点击展品仍触发详情。触屏多指释放不作为单击处理，界面面板与画布控件分别响应。
- 窄屏或系统报告内存不高于4 GB时，3D使用低功耗 WebGL、关闭抗锯齿、像素比为1并暂停展品浮动动画；其他设备像素比最高为1.5。场景不启用阴影贴图。
- 页面中的馆藏图片和Three.js依赖均使用相对本地路径。Google Fonts 仅用于字体外观；网络不可用时会回退到系统字体。图片、任务和存档不依赖部署机器的绝对路径。

## 第二阶段：可扩展内容模型

`app.js` 保留现有 `eras` 与 `hallDeepening` 正文和任务资料；`assets/js/runtime-content.js` 根据这些资料补齐页面仍在使用的 `technicalNotes`、`mediaAssets` 与 `exhibitLinks`，然后调用 `assets/js/content-model.js` 注册 `window.CommsArchiveContent`。它们共同构成只读兼容查询层，不替换章节文案、任务流程、展品详情或 `commsArchive` 存档格式。内容目录版本记录为 `1.0`。启动检查会核对实际接口，不再把不存在的 `renderProgression()` 当作页面启动条件；Three.js状态区分本地依赖已加载和进入展厅后渲染器已创建。

### 通信知识搜索与挑战

主导航“通信知识搜索”从 `CommsArchiveContent` 查询时代、展品、技术流程、任务、证据、澜的研究记录和图片资料，支持关键词、时代与类别筛选，并可打开关联展品或跳到相应技术资料。“知识挑战”作为次级入口保留10题答题、即时颜色反馈、约1秒自动切题、主动查看答案、完成后可选解析、成绩记录与徽章。答题状态独立保存在浏览器的 `localStorage`（键前缀 `commsArchive.quiz.v1`），删除单条答题记录不影响正式探索存档。搜索目录位于 `assets/js/knowledge-search.js`，题目与逻辑位于 `assets/js/quiz-data.js`。

### 比赛演示路线

首页“比赛演示”可选择推荐路线、自由选择1G—6G或三站随机路线。随机路线允许重新抽取或手动调整时代；演示期间可更换路线。演示面板显示本次用时并可重启当前演示路线；重启只清除临时演示进度，不覆盖正式 `commsArchive`。自由演示会在演示副本中预置必要前置条件，正式模式仍由 `ProgressionManager` 按正常规则解锁。

### 体验设置

顶部“体验设置”可以调节音量、网站亮度、澜显示模式与3D操作提示。氛围音为浏览器本地合成音；亮度效果覆盖页面和3D画面，不改变存档。设置保存在浏览器本地，清除浏览器站点数据后需要重新设定。

### CommsArchive 事件依赖图自动化测试

`assets/js/archive-event-graph.js` 是独立的事件依赖图原型，提供 `EraEvent`、`EventDependency`、`HardDependency`、`SoftDependency` 和 `DerivedDependency`，覆盖依赖排序与重放、迁移、冲突、状态校验、证据来源校验、事务写入和离线合并。它使用独立键 `commsArchive.events.v1`，目前**尚未接入**页面的澜角色或既有 `commsArchive` 状态存档；旧网站存档不会被该模块读取或改写。

自动化测试位于 `tests/archive-event-graph.test.js`，夹具位于 `tests/fixtures/archive-event-fixtures.js`。本机若已安装 Node.js，可在项目目录打开终端运行 `node --test tests/archive-event-graph.test.js`；不需要安装 npm 包。覆盖率可用 `node --experimental-test-coverage --test tests/archive-event-graph.test.js` 查看。事件图测试覆盖率是针对独立原型的结果，不代表页面已接入该事件存档系统。

### 5G《万物互联》内容接入

5G建设者线沿用原有《失去响应的智能工厂》任务和证据结构，在同一展厅补充城市设备连接与状态同步的模拟线索；体验者线提供智慧交通、智能家居、远程医疗协作和工业协作四个情境节点。5G与4G的叙事差异是：4G重点呈现移动宽带内容的观看、创作与分享，5G重点呈现设备、环境与系统交换状态并协同响应。城市与工业故障均为模拟任务，不代表具体真实部署。

澜对白、体验节点和年代档案分别位于 `assets/js/lan-dialogue-5g.js`、`assets/js/experience-story-5g.js`、`assets/js/era-archive-5g.js`；归档面板接入位于 `assets/js/5g-archive-ui.js`。只有建设者任务已完成、四个体验节点已记录且证据存在时，才能完成5G档案并开放6G。测试位于 `tests/lan-dialogue-5g.test.js`、`tests/experience-story-5g.test.js` 和 `tests/era-archive-5g.test.js`。

目录包含 Era、Exhibit、Image、技术流程、Task、Dialogue 和 Evidence 定义，关联均使用稳定 ID。可通过 `getEra(id)`、`getExhibit(id)`、`getImage(id)`、`getTask(id)`、`getFlow(id)`、`getDialogue(id)`、`getDialogues({era,location,trigger})`、`getEvidence(id)` 查询；对应的 `queryEra`、`queryExhibit`、`queryImage`、`queryTask`、`queryEvidence` 和 `queryDialogues` 在无匹配时返回明确错误。`checkCompleteness()` 执行六代、展品、任务、对白和证据关联检查；`getCollectedEvidence()` 在调用时从现有本地状态读取已收集证据。图片类型表预留历史照片、真实产品照片、技术示意图、时代场景图片、原创概念图、AI生成素材和三维复原；未实际使用的类型不会虚构素材。

`assets/js/lan-system.js` 将澜接入首页首次访问、序章、时代入口、展品详情、任务开始与完成、档案馆及6G结尾。原有章节对白正文和选项反馈保留，由澜作为唯一伙伴呈现；用户身份是穿越者。澜的数据包含身份、外观设定、性格、六代色彩变化和对白风格。对话组件显示字幕，支持继续、收起、对白记录和浏览器本地系统语音开关；普通对白可跳过，但主线入口对白未逐句完成时会拦截跳过。不加载在线AI或远程配音。语音默认关闭，浏览器不支持系统语音时字幕仍可用。对白历史和语音偏好使用独立 localStorage 键，不改变既有探索存档结构。

## 第三阶段：线性探索与条件解锁

`assets/js/progression-manager.js` 在原有 `commsArchive` 存档里增补 `progression` 子结构，不改变 `visited`、`completed`、`tasks`、`evidence` 等既有字段。管理器提供 `NodeProgressManager`、`DialogueUnlockManager`、`ExhibitUnlockManager`、`ProgressValidator` 与 `ArchiveManager` 接口；`window.CommsArchiveContent.progression` 暴露当前统一进度管理器。

每个时代按入口对白、历史现场、建设调查、技术理解、体验记录、时代归档逐步推进。展品状态采用 LOCKED、DISCOVERABLE、FOUND、ANALYZED、ARCHIVED；未读完澜的入口对白不能进入下一节点，跨越未完成时代会被阻止并写入 `illegalProgressAttempts`。用户在展品详情和任务之间往返时，原任务选择继续保留；技术资料证据仍由正确完成技术理解任务发放，时代结果证据仍由原归档逻辑发放。

首次读取旧存档时会保留已完成年代、日志、线索、任务和证据，并把已探索内容映射到新节点；损坏节点会回退到最近可继续的位置，记录在 `progression.repairLog`，不会删掉旧的完成记录。进度只保存在当前浏览器的 localStorage，不提供跨设备同步。

自动化测试位于 `tests/progression-manager.test.js`，覆盖锁定展品、对白门控、损坏/伪造节点修复、任务解锁、刷新恢复、跨时代跳转与存档兼容。测试需在已安装 Node.js 的环境运行 `node --test tests/progression-manager.test.js tests/archive-event-graph.test.js`；测试通过不等同于已在真实浏览器完成全交互验收。

内容模型现有图片注册项通过 `CommsArchiveContent.imageArchive` 补齐素材类型、来源、许可、真实性与呈现方式等字段；当前资源索引见 `assets/images/IMAGE-ARCHIVE.md`。澜的立绘、8种表情、6种动作以及首页/序章/六代节点的补充图片规范列在 `assets/images/Lan/ASSET-PLAN.md`。这些 PNG 尚未生成：当前工具环境没有可用的内置图像生成工具，且项目未获准调用需要 API 密钥的生成 CLI。网站目前使用文字头像，不会把占位图或未来概念误称为正式立绘或历史照片。流程动画仍是原有节点高亮模拟，不是通信网络仿真。

## 交互中断诊断

需要复现“首页开始 → 澜序章 → 启动时空入口 → 进入1G → 澜对白 → 下一时代”时，在本地网址后追加 `?interactionDebug=1`。页面左下会显示诊断日志；可点击“复制日志”将事件和状态快照发回。记录包含按钮点击/禁用状态、时代校验与转场、澜对白开始/结束/跳过、画布键盘焦点以及可疑转场遮罩。日志单独保存在当前标签页的 `sessionStorage`，不写入正式探索存档。自动化检查位于 `tests/interaction-reproduce.test.js`；它验证日志字段、分类与最小路线顺序，不代替真实浏览器复现。
