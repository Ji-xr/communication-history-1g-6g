/* Era-specific teaching simulations. No real messages, sensors, cameras or network requests. */
(function(root){
 'use strict';
 const text=root.CommsText || {limit:(v,n)=>Array.from(String(v??'')).slice(0,n).join(''),dropLast:v=>Array.from(String(v??'')).slice(0,-1).join(''),length:v=>Array.from(String(v??'')).length};
 const KEY='commsArchive.eraWorkbench.v1';
 const eras={
  '2G':{title:'一条短信的旅程',device:'数字移动电话',accent:'#a5cd85',intro:'编辑一条消息，追踪它停留的环节，再等待家人的回复。',steps:['编辑短信','检查转发','等待回复']},
  '3G':{title:'把互联网装进口袋',device:'移动上网终端',accent:'#83c9f0',intro:'接入移动数据，打开网页、地图和视频，观察内容大小带来的不同体验。',steps:['接入网络','打开网页','查询地图','浏览新闻','播放视频']},
  '4G':{title:'记录、观看与分享',device:'移动内容工作台',accent:'#b6a0ff',intro:'调整画质、分享照片、准备直播，把一次观看变成一次参与。',steps:['观看视频','分享照片','准备直播','参与讨论']},
  '5G':{title:'让设备协同起来',device:'多设备协同控制台',accent:'#7bdab5',intro:'读取设备状态，排查连接与控制环节，再观察整套系统如何响应。',steps:['交通协同','家居联动','资料协作','工业协同']},
  '6G':{title:'让数字世界接近现场',device:'未来研究终端',accent:'#edcc8a',intro:'在虚构研究情境里，对照参考状态、传感数据与模型输出，寻找偏差。',steps:['城市导航','环境校准','核对AI','更新模型']}
 };
 const options={network:['busy','clear'],quality:['high','standard','low'],image:['original','small'],destination:['','library','station','park'],photo:['','sunrise','night','family'],mode:['','reading','away'],appliedMode:['','reading','away'],channel:['unverified','verified'],offset:['-5','0','5']};
 let scope='',cache={},pending=null,sequence=0;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const storageKey=()=>root.DemoManager?.storageKey?.(KEY)||KEY;
 function blank(){return {step:0,flags:{},choices:{network:'busy',quality:'high',image:'original',destination:'',photo:'',mode:'',channel:'unverified',offset:'0'},draft:'',comment:'',pendingKey:'',tapAt:0,cycle:0,message:'请选择操作，观察终端中的变化。',tone:'info',busy:false,replaying:false};}
 function normalize(value,era){const s=blank();if(!value||typeof value!=='object')return s;s.step=Number.isInteger(value.step)?Math.max(0,Math.min(eras[era].steps.length-1,value.step)):0;for(const [k,allowed]of Object.entries(options))if(allowed.includes(value.choices?.[k]))s.choices[k]=value.choices[k];for(const[k,v]of Object.entries(value.flags||{}))if(/^[a-zA-Z0-9_]{1,35}$/.test(k)&&v===true)s.flags[k]=true;for(const field of ['draft','comment'])if(typeof value[field]==='string')s[field]=text.limit(value[field],70);s.replaying=value.replaying===true;if(typeof value.message==='string')s.message=text.limit(value.message,400);if(['info','success','warning','error'].includes(value.tone))s.tone=value.tone;if(value.busy){s.message='上次操作未完成，可以重新尝试。';s.tone='info';}return s;}
 function ensure(){const next=storageKey();if(next===scope)return;cancel();scope=next;cache={};try{const data=JSON.parse(root.localStorage?.getItem(scope)||'{}');for(const era of Object.keys(eras))if(data?.[era])cache[era]=normalize(data[era],era);}catch(_){} }
 function state(era){ensure();if(!eras[era])return null;return cache[era]||(cache[era]=blank());}
 function persist(){try{if(!root.localStorage)return false;root.localStorage.setItem(scope,JSON.stringify(cache));return true;}catch(_){return false;}}
 function story(era){return root.CommsArchiveLan?.getExperienceStory?.(era)||root['ExperienceStory'+era];}
 function recorded(era,index){return (root.CommsArchiveLan?.LanMemory?.completedExperienceNodes||[]).includes(story(era)?.nodes?.[index]?.trigger);}
 function refresh(focus){root.renderProgression?.();if(focus)root.requestAnimationFrame?.(()=>root.document?.querySelector('[data-action-key="'+focus+'"]')?.focus?.({preventScroll:true}));}
 function feedback(era,message,tone='info',focus){root.DemoGuide?.activity?.();const s=state(era);s.message=message;s.tone=tone;const saved=persist();if(!saved)s.message+=' 本地存储暂不可用；本次操作仍可继续，请尽快导出已记录的档案。';root.AudioSystem?.playEffect(tone==='success'?'complete':'click');refresh(focus);return tone!=='error';}
 function checkpoint(era,message){const s=state(era),pendingKey='recordPending'+s.step;s.flags['step'+s.step]=true;s.flags[pendingKey]=true;s.busy=false;s.message=message;s.tone='success';persist();const trigger=story(era)?.nodes?.[s.step]?.trigger;const ok=trigger&&root.completeEraExperienceNode?.(era,trigger);if(!ok){s.message='操作已完成，但体验记录尚未登记。点击“保存本步记录”重试。';s.tone='warning';}else delete s.flags[pendingKey];persist();refresh();return !!ok;}
 function wait(era,label,finish){const s=state(era);if(!s||s.busy||pending)return false;s.busy=true;s.message=label;s.tone='working';persist();refresh();const id=++sequence,owner=scope,index=s.step;pending={era,id,timer:root.setTimeout(()=>{pending=null;if(id!==sequence||storageKey()!==owner)return;const node=root.document?.querySelector?.('[data-era-workbench]');s.busy=false;if(!node||node.dataset.eraWorkbench!==era){persist();return;}if(s.step!==index)return;finish();},720)};return true;}
 function cancel(){++sequence;if(pending){root.clearTimeout(pending.timer);const s=cache[pending.era];if(s){s.busy=false;s.message='操作已暂停，返回后可重新尝试。';}pending=null;try{root.localStorage?.setItem(scope,JSON.stringify(cache));}catch(_){}}}
 function reset(){ensure();cancel();cache={};try{root.localStorage?.removeItem(scope);}catch(_){} }
 function select(era,field,value){const s=state(era);if(!s||s.busy||field==='appliedMode'||!options[field]?.includes(value))return false;if(field==='photo'&&s.choices.photo!==value){delete s.flags.uploaded;delete s.flags.shared;}s.choices[field]=value;return feedback(era,'设置已更新。请再次执行操作，比较结果。','info','select'+field);}
 function edit(era,field,value){const s=state(era);if(!s||s.busy||!['draft','comment'].includes(field))return false;s[field]=text.limit(value,70);s.pendingKey='';persist();const input=root.document?.querySelector(field==='draft'?'#wbDraft':'#wbComment');if(input&&input.value!==s[field])input.value=s[field];const counter=root.document?.querySelector('[data-text-count]');if(counter)counter.textContent=text.length(s[field])+' / 70';return true;}
 function key(era,key){const s=state(era);if(era!=='2G'||s.step!==0||s.busy)return false;const letters={1:'.?!',2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ'},now=Date.now();if(key==='clear'){s.draft='';s.pendingKey='';}else if(key==='back'){s.draft=text.dropLast(s.draft);s.pendingKey='';}else if(key==='0'){s.draft=text.limit(s.draft+' ',70);s.pendingKey='';}else if(letters[key]){if(s.pendingKey===key&&now-s.tapAt<900){s.cycle=(s.cycle+1)%letters[key].length;s.draft=text.dropLast(s.draft)+letters[key][s.cycle];}else if(text.length(s.draft)<70){s.cycle=0;s.draft+=letters[key][0];}s.pendingKey=key;s.tapAt=now;}else return false;persist();refresh('key'+key);return true;}
 function act(era,action,value){const s=state(era);if(!s||s.busy)return false;const f=s.flags,c=s.choices,n=s.step;
  root.DemoGuide?.activity?.();root.InteractionDebugger?.record('EXPERIENCE_ACTION','CommsEraExperience.act',{era,action,step:n});
  if(action==='previous'){if(n===0)return false;s.step--;s.message='回看上一项操作，已保存的体验记录会保留。';s.tone='info';persist();refresh();return true;}
  if(action==='replay'){cache[era]=blank();cache[era].replaying=true;persist();refresh();return true;}
  if(action==='next'){if(!f['step'+n])return feedback(era,'请先完成当前操作。','error');if((!recorded(era,n)||f['recordPending'+n])&&!checkpoint(era,'本步记录已保存。'))return false;if(n<eras[era].steps.length-1){s.step++;s.message='开始下一项操作，先观察终端状态。';s.tone='info';persist();refresh();return true;}s.replaying=false;persist();refresh();return true;}
  if(action==='save'){return checkpoint(era,'本步记录已保存。');}
  s.replaying=true;
  if(era==='2G'){
   if(n===0&&action==='phrase'){s.draft='我已平安到达，不用担心。';return feedback(era,'示例短信已填入，也可以直接编辑。');}
   if(n===0&&action==='send'){if(!s.draft.trim())return feedback(era,'短信还是空的。先输入内容，再提交发送。','error');return wait(era,'终端正在提交短信…',()=>checkpoint(era,'短信已提交给网络，接收端尚未显示。下一步追踪转发路径。'));}
   if(n===1&&action==='inspect'){if(!['terminal','wireless','center'].includes(value))return false;f[value]=true;return feedback(era,value==='center'?'找到异常：短信已到服务中心，转发配置需要核对。':'这个环节正常。继续检查短信服务中心。',value==='center'?'warning':'info');}
   if(n===1&&action==='repair'){if(!f.center)return feedback(era,'先点击路径中的服务中心，查看它的状态。','error');return wait(era,'正在重新建立模拟转发路径…',()=>{f.relayFixed=true;checkpoint(era,'转发配置已修正。终端、无线接入和服务中心形成完整路径。');});}
   if(n===2&&action==='retry'){if(!f.relayFixed)return feedback(era,'请先完成转发检查。','error');return wait(era,'消息正在经过网络服务中心…',()=>{f.delivered=true;feedback(era,'接收端已显示这条模拟短信。点“阅读回复”查看家人的回应。','success');});}
   if(n===2&&action==='reply'){if(!f.delivered)return feedback(era,'消息还未送达，先重新发送。','error');return wait(era,'正在打开接收端回复…',()=>{f.reply=true;checkpoint(era,'家人回复：“收到，路上注意安全。”短信让发送与阅读可以发生在不同时间。');});}
  }
  if(era==='3G'){
   if(n===0&&action==='power'){f.power=true;return feedback(era,'屏幕已点亮，还需要接入移动数据。');}
   if(n===0&&action==='connect'){if(!f.power)return feedback(era,'先按电源键点亮手机。','error');return wait(era,'正在接入模拟移动数据网络…',()=>{f.online=true;checkpoint(era,'网络已连接。接下来试着打开网页；连接成功并不保证每种内容都立即显示。');});}
   if(n===1&&action==='page'){f.text=true;return feedback(era,'文字先显示出来。图片仍在等待，试着请求图片。');}
   if(n===1&&action==='image'){if(!f.text)return feedback(era,'先打开文字网页。','error');return wait(era,'正在传输网页图片…',()=>{if(c.network==='busy'&&c.image==='original'){f.stalled=true;feedback(era,'图片仍在等待。可以改用小图，或切换较好的模拟网络后重新请求。','warning');}else{f.image=true;checkpoint(era,'图片已显示。内容大小、网络条件、终端和网页服务共同影响体验。');}});}
   if(n===2&&action==='locate'){f.located=true;return feedback(era,'模拟位置：校园入口。选择目的地后查询路线。');}
   if(n===2&&action==='route'){if(!f.located||!c.destination)return feedback(era,'先读取位置，再选择一个目的地。','error');return wait(era,'正在请求路线信息…',()=>{f.route=true;checkpoint(era,'路线已显示，地图信息开始伴随人的移动。这里使用虚构位置，不读取设备定位。');});}
   if(n===3&&action==='news'){f.news=true;return feedback(era,'新闻文字已经打开，插图尚未下载。');}
   if(n===3&&action==='newsImage'){if(!f.news)return feedback(era,'先打开这条新闻。','error');return wait(era,'正在请求新闻插图…',()=>{f.newsImage=true;checkpoint(era,'文字与插图都已显示。手机开始成为获取互联网信息的入口。');});}
   if(n===4&&action==='video'){return wait(era,'视频请求已发出，正在缓冲…',()=>{if(c.network==='busy'&&c.quality==='high'){f.videoStalled=true;feedback(era,'片段还不能连续播放。试着降低画质或改善网络条件再播放。','warning');}else{f.video=true;checkpoint(era,'模拟片段开始播放。早期移动视频仍受到当时网络、终端和服务能力的限制。');}});}
  }
  if(era==='4G'){
   if(n===0&&action==='play'){return wait(era,'正在建立播放缓冲…',()=>{if(c.network==='busy'&&c.quality==='high'){f.buffering=true;feedback(era,'高画质内容无法连续到达，画面暂停。降低画质或改善模拟网络，再试一次。','warning');}else{f.playing=true;checkpoint(era,'画面连续播放。更合适的画质与网络条件改善了这次模拟体验。');}});}
   if(n===1&&action==='upload'){if(!c.photo)return feedback(era,'先选择一张展厅示例照片。','error');return wait(era,'照片正在进行模拟上传…',()=>{f.uploaded=true;feedback(era,'照片上传完成。还没有分享，点击发布把它发送给朋友。','success');});}
   if(n===1&&action==='share'){if(!f.uploaded)return feedback(era,'先上传选中的照片。','error');return wait(era,'正在发布模拟分享记录…',()=>{f.shared=true;checkpoint(era,'照片已出现在朋友的模拟信息流里。观看者也可以成为内容的记录者。');});}
   if(n===2&&action==='preview'){f.preview=true;return feedback(era,'本地绘制的模拟预览已打开，不会调用摄像头。');}
   if(n===2&&action==='live'){if(!f.preview)return feedback(era,'先检查预览画面。','error');if(c.network==='busy')return feedback(era,'当前上行条件紧张。切换到较稳定的模拟网络再开播。','warning');return wait(era,'正在向模拟观众传送画面…',()=>{f.live=true;checkpoint(era,'模拟直播已开始。真实直播还需要终端、上行网络与服务协同。');});}
   if(n===3&&action==='publish'){if(!s.comment.trim())return feedback(era,'先写下一句想分享的话。','error');return wait(era,'正在发布到本地模拟讨论区…',()=>{f.published=true;feedback(era,'动态已发布。点“查看回应”观察双向交流。','success');});}
   if(n===3&&action==='reactions'){if(!f.published)return feedback(era,'先发布一条动态。','error');f.reactions=true;return checkpoint(era,'收到模拟回应：“这个角度真不错！”信息交流从观看扩展到参与。');}
  }
  if(era==='5G'){
   if(n===0&&action==='sense'){f.sense=true;return feedback(era,'路口传感状态已读取：行人正在通过。先等待通行完成，再协调车辆信息。');}
   if(n===0&&action==='waitCross'){if(!f.sense)return feedback(era,'先读取路口状态。','error');return wait(era,'正在等待模拟行人通过…',()=>{f.crossClear=true;feedback(era,'模拟通道已空闲，可以发起协同更新。','success');});}
   if(n===0&&action==='coordinate'){if(!f.sense||!f.crossClear)return feedback(era,'当前状态不足以开始协同。先读取状态并等待行人通行完成。','error');return wait(era,'信号与车辆正在交换状态…',()=>{f.traffic=true;checkpoint(era,'设备完成一次模拟协同。通信传递状态，决策还需要完整系统与安全机制。');});}
   if(n===1&&action==='homeSense'){f.homeSense=true;return feedback(era,'环境已读取：傍晚、室内光线较暗；模拟网关当前离线。');}
   if(n===1&&action==='gateway'){f.gateway=true;return feedback(era,'模拟网关已连接，设备状态可以交换。','success');}
   if(n===1&&action==='link'){if(!f.homeSense||!c.mode)return feedback(era,'先读取环境，并选择一个联动场景。','error');if(!f.gateway)return feedback(era,'网关离线，指令没有抵达设备。先恢复连接再试。','warning');return wait(era,'正在执行模拟设备联动…',()=>{f.home=true;c.appliedMode=c.mode;checkpoint(era,c.mode==='reading'?'阅读灯已亮起，设备状态已返回控制台。':'离家场景已执行，模拟照明已关闭并返回确认。');});}
   if(n===2&&action==='review'){f.review=true;return feedback(era,'测试资料完整，使用的是展厅虚构图像与数据。请选择已验证的模拟协作通道。');}
   if(n===2&&action==='transfer'){if(!f.review||c.channel!=='verified')return feedback(era,'资料和通道尚未核对。先检查测试资料并选择已验证通道。','error');return wait(era,'正在传递虚构教学资料…',()=>{f.transferred=true;feedback(era,'传递完成，还需等待远端确认。','success');});}
   if(n===2&&action==='ack'){if(!f.transferred)return feedback(era,'先完成资料传递。','error');f.medical=true;return checkpoint(era,'远端已确认收到测试资料。这是通信协作演示，不提供诊疗服务。');}
   if(n===3&&action==='fix'){if(!['networkFix','sensorFix','queueFix'].includes(value))return false;f[value]=true;return feedback(era,({networkFix:'模拟通信通路已恢复。',sensorFix:'模拟传感反馈已校准。',queueFix:'模拟控制队列已整理。'})[value]);}
   if(n===3&&action==='robot'){if(!f.networkFix||!f.sensorFix||!f.queueFix)return feedback(era,'设备尚未就绪。分别检查通信、传感与控制队列。','warning');return wait(era,'正在执行一次模拟协同测试…',()=>{f.robot=true;checkpoint(era,'机械臂完成模拟动作。通信、传感和控制共同影响结果；这不是工业安全认证。');});}
  }
  if(era==='6G'){
   if(n===0&&action==='reference'){f.reference=true;return feedback(era,'参考状态：车辆已到路口B；旧模型仍停在A。请读取新数据。');}
   if(n===0&&action==='cityUpdate'){if(!f.reference)return feedback(era,'先查看参考状态，确认哪里不一致。','error');return wait(era,'正在读取新状态并更新模拟路线…',()=>{f.city=true;checkpoint(era,'模型中的车辆更新到B。数据及时性影响导航信息，本演示不代表现有6G商用能力。');});}
   if(n===1&&action==='compare'){f.compared=true;return feedback(era,'参考值20，模拟传感读数25。请选择校正量，再核对读数。');}
   if(n===1&&action==='calibrate'){if(!f.compared)return feedback(era,'先对照传感读数与参考值。','error');if(c.offset!=='-5')return feedback(era,'校正后仍与参考值不符。25需要怎样修正才能与20一致？','warning');return wait(era,'正在验证校正后的模拟数据…',()=>{f.environment=true;checkpoint(era,'校正后读数为20，与本次参考值一致。真实传感数据仍需校准和独立验证。');});}
   if(n===2&&action==='raw'){f.raw=true;return feedback(era,'原始记录显示道路被占用，AI建议“直接通行”与输入证据不一致。');}
   if(n===2&&action==='trust')return feedback(era,'建议与原始记录存在冲突。先核对数据，再决定是否采用。','warning');
   if(n===2&&action==='reject'){if(!f.raw)return feedback(era,'先打开原始数据，给判断找到证据。','error');f.ai=true;return checkpoint(era,'已标记这条建议需要重新分析。模型输出不能直接替代现场证据。');}
   if(n===3&&action==='pipeline'){const order=['collect','transmit','validate','update'],index=order.findIndex(k=>!f[k]);if(value!==order[index])return feedback(era,'按“读取→传输→核验→更新”的顺序进行，先完成当前亮起的环节。','error');return wait(era,'正在处理模拟更新环节…',()=>{f[value]=true;if(value==='update')checkpoint(era,'数字模型已按本次已核验数据更新。系统仍可能有延迟与误差，不代表现实与数字世界完全同步。');else feedback(era,'这一环节已完成，继续下一环节。','success');});}
  }
  return feedback(era,'此操作不适用于当前阶段，请使用当前面板中的控件。','error');
 }
 const button=(era,action,label,value='',disabled=false)=>`<button type="button" class="wb-button" data-action-key="${esc(action+value)}" ${disabled?'disabled':''} onclick="CommsEraExperience.act('${era}','${action}','${value}')">${esc(label)}</button>`;
 function chooser(era,field,label,items){const s=state(era);return `<label class="wb-field">${label}<select data-action-key="select${field}" ${s.busy?'disabled':''} onchange="CommsEraExperience.select('${era}','${field}',this.value)">${items.map(([value,text])=>`<option value="${value}" ${s.choices[field]===value?'selected':''}>${text}</option>`).join('')}</select></label>`;}
 const network=era=>chooser(era,'network','模拟网络条件',[['busy','资源较紧张'],['clear','较稳定']]);
 const quality=era=>chooser(era,'quality','内容画质',[['high','高画质'],['standard','标准'],['low','低画质 / 短片']]);
 function art(kind,on=false){return `<div class="wb-scene wb-scene-${kind} ${on?'is-active':''}" aria-hidden="true"><i></i><i></i><i></i><b>${({video:'▶',photo:'◉',map:'⌖',city:'◈',robot:'⚙',home:'⌂',traffic:'⇄',medical:'✚'})[kind]||'◈'}</b><span></span></div>`;}
 function content(era){const s=state(era),f=s.flags,c=s.choices,n=s.step,b=(a,l,v,d)=>button(era,a,l,v,d||s.busy);let screen='',controls='';
  if(era==='2G'){
   if(n===0){screen=`<div class="wb-lcd"><span>收件人：家人（虚构联系人）</span><label for="wbDraft">短信内容</label><textarea id="wbDraft" ${s.busy?'disabled':''}  placeholder="写一句报平安的话" oninput="if(!event.isComposing)CommsEraExperience.edit('2G','draft',this.value)" oncompositionend="CommsEraExperience.edit('2G','draft',this.value)">${esc(s.draft)}</textarea><small data-text-count>${text.length(s.draft)} / 70</small></div><div class="wb-keypad">${['1','2','3','4','5','6','7','8','9','clear','0','back'].map(k=>`<button type="button" data-action-key="key${k}" ${s.busy?'disabled':''} onclick="CommsEraExperience.key('2G','${k}')">${({clear:'清空',back:'⌫',2:'2 ABC',3:'3 DEF',4:'4 GHI',5:'5 JKL',6:'6 MNO',7:'7 PQRS',8:'8 TUV',9:'9 WXYZ'})[k]||k}</button>`).join('')}</div>`;controls=b('phrase','填入报平安示例')+b('send','提交短信 →');}
   if(n===1){screen=`<div class="wb-message">“${esc(s.draft)}”<small>终端已提交 · 接收端等待</small></div><div class="wb-network-path">${[['terminal','发送终端'],['wireless','无线接入'],['center','服务中心']].map(([id,title])=>`<div class="${f[id]?'is-checked':''}">${b('inspect',title,id)}<small>${f[id]?(id==='center'&&!f.relayFixed?'转发异常':'已核对'):'点击检查'}</small></div>`).join('<span aria-hidden="true">→</span>')}</div>`;controls=b('repair','修正模拟转发配置');}
   if(n===2){screen=`<div class="wb-messages"><p>发送给家人<br><strong>${esc(s.draft)}</strong><small>${f.delivered?'✓ 已送达（模拟）':'等待重新发送'}</small></p>${f.reply?'<p class="incoming">家人：收到，路上注意安全。<small>模拟回复 · 不发送真实短信</small></p>':''}</div>`;controls=b('retry',f.delivered?'重新查看送达过程':'重新发送')+b('reply','阅读回复');}
  }
  if(era==='3G'){
   if(n===0){screen=`<div class="wb-handset-screen ${f.power?'is-on':''}"><span>${f.power?'3G · 移动数据':'按电源键开始'}</span>${f.online?'<strong>数据已连接</strong>':'<strong>◉</strong>'}<div class="wb-apps"><span>网页</span><span>地图</span><span>视频</span></div></div>`;controls=b('power','点亮屏幕')+b('connect','接入移动数据 →');}
   if(n===1){screen=`<div class="wb-browser"><div class="wb-address">展厅移动网页 / 本地模拟</div>${f.text?'<h4>世界，开始进入手机</h4><p>网页文字已经显示，图片需要更多数据。</p>':'<p class="wb-placeholder">先打开文字网页</p>'}${f.image?art('photo',true):'<div class="wb-image-placeholder">'+(s.busy?'图片传输中…':f.stalled?'图片仍在等待':'图片区域')+'</div>'}</div>`;controls=network(era)+chooser(era,'image','图片大小',[['original','原图'],['small','小图']])+b('page','打开文字网页')+b('image','请求图片');}
   if(n===2){screen=art('map',f.route)+`<div class="wb-map-labels"><span>${f.located?'● 校园入口':'位置尚未读取'}</span><span>${f.route?'路线 → '+({library:'图书馆',station:'车站',park:'公园'})[c.destination]:'请选择目的地'}</span></div>`;controls=b('locate','读取模拟位置')+chooser(era,'destination','目的地',[['','请选择'],['library','图书馆'],['station','车站'],['park','公园']])+b('route','查询路线 →');}
   if(n===3){screen=`<div class="wb-browser"><h4>移动新闻</h4>${f.news?'<p>本地模拟新闻：越来越多的信息可以在出行时随手查看。</p>':'<p class="wb-placeholder">点击打开新闻</p>'}${f.newsImage?art('photo',true):'<div class="wb-image-placeholder">新闻插图尚未加载</div>'}</div>`;controls=b('news','打开新闻')+b('newsImage','加载新闻插图');}
   if(n===4){screen=art('video',f.video)+`<p>${f.video?'模拟片段正在播放':f.videoStalled?'缓冲未完成，请调整条件':'早期移动视频 · 展厅示意'}</p>`;controls=network(era)+quality(era)+b('video','请求并播放片段');}
  }
  if(era==='4G'){
   if(n===0){screen=art('video',f.playing)+`<p>${f.playing?'画面连续播放':f.buffering?'播放暂停 · 缓冲不足':'等待播放'}</p>`;controls=network(era)+quality(era)+b('play',f.buffering?'调整后重新播放':'播放视频 →');}
   if(n===1){screen=`<div class="wb-photo-grid">${[['sunrise','日出'],['night','夜色'],['family','团聚']].map(([id,label])=>`<button type="button" class="wb-photo ${id} ${c.photo===id?'is-selected':''}" aria-pressed="${c.photo===id}" ${s.busy?'disabled':''} onclick="CommsEraExperience.select('4G','photo','${id}')"><span>${label}</span></button>`).join('')}</div><p>${f.shared?'✓ 已发布到模拟信息流':f.uploaded?'✓ 上传完成 · 等待发布':'选择一张本地绘制的示例照片'}</p>`;controls=b('upload','上传照片')+b('share','发布给朋友 →');}
   if(n===2){screen=art('video',f.live)+`<div class="wb-device-status"><span>${f.preview?'✓ 模拟预览已检查':'○ 预览未检查'}</span><span>${f.live?'● 模拟直播中':'○ 尚未开播'}</span></div>`;controls=network(era)+b('preview','检查模拟预览')+b('live','开始模拟直播');}
   if(n===3){screen=`<div class="wb-social"><span>本地讨论区</span>${f.published?'<p class="wb-message">'+esc(s.comment)+'</p>':'<p class="wb-placeholder">你的生活记录会出现在这里</p>'}${f.reactions?'<p class="wb-message incoming">朋友：这个角度真不错！</p>':''}</div>`;controls=`<label class="wb-field" for="wbComment">写一句生活记录<textarea id="wbComment"  ${s.busy?'disabled':''} oninput="if(!event.isComposing)CommsEraExperience.edit('4G','comment',this.value)" oncompositionend="CommsEraExperience.edit('4G','comment',this.value)">${esc(s.comment)}</textarea></label>`+b('publish','发布动态')+b('reactions','查看回应');}
  }
  if(era==='5G'){
   if(n===0){screen=art('traffic',f.traffic)+`<div class="wb-device-status"><span>路口传感：${f.sense?'已读取':'未读取'}</span><span>模拟通道：${f.crossClear?'空闲':'行人通行中'}</span><span>协同更新：${f.traffic?'已完成':'等待'}</span></div>`;controls=b('sense','读取路口状态')+b('waitCross','等待行人通行完成')+b('coordinate','协调信号与车辆 →');}
   if(n===1){screen=art('home',f.home&&c.appliedMode==='reading')+`<div class="wb-device-status"><span>网关：${f.gateway?'已连接':'离线'}</span><span>环境：${f.homeSense?'傍晚 · 光线较暗':'未读取'}</span><span>灯光：${f.home&&c.appliedMode==='reading'?'已亮起':'关闭'}</span></div>`;controls=b('homeSense','读取环境状态')+b('gateway','恢复模拟网关')+chooser(era,'mode','联动场景',[['','请选择'],['reading','阅读场景'],['away','离家场景']])+b('link','执行设备联动 →');}
   if(n===2){screen=art('medical',f.medical)+`<div class="wb-document"><strong>虚构教学资料 / SAMPLE</strong><span>检查：${f.review?'完整':'未核对'}</span><span>传递：${f.transferred?'完成':'未发送'}</span><span>远端：${f.medical?'已确认':'等待'}</span></div>`;controls=b('review','核对测试资料')+chooser(era,'channel','模拟协作通道',[['unverified','尚未验证'],['verified','已验证通道']])+b('transfer','传递测试资料')+b('ack','查看远端确认');}
   if(n===3){screen=art('robot',f.robot)+`<div class="wb-checks">${[['networkFix','通信通路'],['sensorFix','传感反馈'],['queueFix','控制队列']].map(([id,title])=>`<div>${b('fix',(f[id]?'✓ ':'○ ')+title,id)}<small>${f[id]?'本环节已检查':'点击排查'}</small></div>`).join('')}</div>`;controls=b('robot','运行一次协同测试 →');}
  }
  if(era==='6G'){
   if(n===0){screen=art('city',f.city)+`<div class="wb-twin"><div><small>参考场景</small><strong>车辆在 B</strong></div><div><small>数字模型</small><strong>车辆在 ${f.city?'B':'A'}</strong></div></div>`;controls=b('reference','对照参考状态')+b('cityUpdate','读取新数据并更新路线');}
   if(n===1){screen=`<div class="wb-twin"><div><small>参考值</small><strong>20</strong></div><div><small>模拟传感读数</small><strong>${f.environment?'20':'25'}</strong></div></div><p>数值仅用于校准教学，不对应真实传感测量。</p>`;controls=b('compare','核对读数')+chooser(era,'offset','模拟校正量',[['0','不修正'],['-5','减去5'],['5','增加5']])+b('calibrate','校正并验证 →');}
   if(n===2){screen=`<div class="wb-ai"><span>模拟AI建议</span><blockquote>道路畅通，可以直接通行。</blockquote>${f.raw?'<div class="wb-evidence">原始记录：道路被占用。<br>建议与证据不一致。</div>':'<p>原始输入尚未核对</p>'}${f.ai?'<strong>✓ 已标记需重新分析</strong>':''}</div>`;controls=b('trust','直接采用建议')+b('raw','打开原始数据')+b('reject','标记冲突，要求重新分析');}
   if(n===3){screen=`<div class="wb-pipeline">${[['collect','读取'],['transmit','传输'],['validate','核验'],['update','更新']].map(([id,title])=>`<div class="${f[id]?'is-checked':''}">${b('pipeline',(f[id]?'✓ ':'')+title,id)}</div>`).join('<span aria-hidden="true">→</span>')}</div>`+art('city',f.update);controls='<p>每个环节都会影响模型能否正确更新。按顺序处理本次模拟数据。</p>';}
  }
  return {screen,controls};
 }
 function render(e){const era=e.id,meta=eras[era],s=state(era);if(!meta||!s)return '';const source=story(era);if(source?.nodes?.length!==meta.steps.length)return '<p role="alert">时代体验资料尚未就绪，请返回时代航线后重试。</p>';const complete=source.nodes.every((_,i)=>recorded(era,i)&&!s.flags['recordPending'+i]),currentDone=!!s.flags['step'+s.step],view=content(era);return `<section class="era-workbench era-${era.toLowerCase()}" data-era-workbench="${era}" style="--wb-accent:${meta.accent}" aria-label="${era}交互体验"><header class="wb-heading"><span class="eyebrow">${era} / HANDS-ON EXPERIENCE</span><h2>${meta.title}</h2><p>${meta.intro}</p><details class="wb-context"><summary>这个时代的生活现场</summary><p>${esc(e.moment||e.record||meta.intro)}</p></details>${era==='6G'?'<p class="wb-research">未来研究情境 · 非商用6G实测</p>':''}</header><ol class="wb-stepper" aria-label="体验步骤">${meta.steps.map((title,i)=>`<li class="${i===s.step?'is-current':''} ${recorded(era,i)?'is-done':''}" ${i===s.step?'aria-current="step"':''}><span>${recorded(era,i)?'✓':String(i+1).padStart(2,'0')}</span>${title}</li>`).join('')}</ol>${complete&&!s.replaying?`<section class="wb-summary"><span class="wb-success-mark">✓</span><h3>${era}体验记录已完成</h3><p>${esc(e.record)}</p><p>${era==='6G'?'本次记录说明数据、模型和验证如何共同影响结果；未来能力仍需研究。':'设备操作与时代生活的联系已经保存在本地记录中。'}</p><div class="wb-actions"><button type="button" class="btn" onclick="recordGuidedExperience()">记录时代影响，返回本时代调查 →</button>${button(era,'replay','重新体验')}</div></section>`:`<div class="wb-layout"><section class="wb-device" aria-label="${meta.device}" aria-busy="${s.busy}"><div class="wb-device-bar"><span>${meta.device}</span><span>${era} · 教学模拟</span></div><div class="wb-screen">${view.screen}</div>${s.busy?'<div class="wb-busy-track" role="progressbar" aria-label="模拟操作进行中"><span></span></div>':''}</section><aside class="wb-controls"><span class="eyebrow">当前操作 / ${s.step+1}</span><h3>${meta.steps[s.step]}</h3>${s.step>0?button(era,'previous','← 回看上一项','',s.busy):''}<div class="wb-control-grid">${view.controls}</div><div class="wb-feedback tone-${s.tone}" role="${s.tone==='error'?'alert':'status'}" aria-live="polite"><b>${({success:'✓ 操作完成',warning:'需要调整',error:'操作未完成',working:'正在处理',info:'操作提示'})[s.tone]}</b><p>${esc(s.message)}</p></div>${currentDone?`<div class="wb-next">${button(era,recorded(era,s.step)&&!s.flags['recordPending'+s.step]?'next':'save',recorded(era,s.step)&&!s.flags['recordPending'+s.step]?(s.step===meta.steps.length-1?'查看体验总结 →':'下一项体验 →'):'保存本步记录', '',s.busy)}</div>`:''}</aside></div>`}<p class="wb-footnote">本地教学模拟，不发送真实消息、不调用摄像头或设备定位。等待动画用于表现操作过程，不表示真实网络速度。</p></section>`;}
 root.CommsEraExperience={render,act,select,edit,key,reset,cancel,getState:era=>JSON.parse(JSON.stringify(state(era))),eras};
 root.addEventListener?.('pagehide',cancel);
 const app=root.document?.getElementById?.('app');if(app&&root.MutationObserver)new root.MutationObserver(()=>{if(pending&&app.querySelector('[data-era-workbench]')?.dataset.eraWorkbench!==pending.era)cancel();}).observe(app,{childList:true});
})(window);
