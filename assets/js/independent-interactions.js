/* Optional local teaching simulations. Never write main tasks, evidence or storage. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CommsIndependentExperiences = api;
})(typeof window === 'object' ? window : {}, function (root) {
  'use strict';
  const text=root.CommsText || (typeof require==='function'?require('./unicode-text.js'):{limit:(v,n)=>Array.from(String(v??'')).slice(0,n).join(''),dropLast:v=>Array.from(String(v??'')).slice(0,-1).join(''),length:v=>Array.from(String(v??'')).length});
  const titles = {'2G':'迟到的平安短信','3G':'第一次探索移动互联网','4G':'移动视频体验','5G':'远程操控机器人','6G':'未来城市数字孪生实验室'};
  const intros = {
    '2G':'写一句报平安的话。我们一起看看，短信从发送到被阅读，中间还会经历什么。',
    '3G':'出门前查查天气吧。先选城市，再打开天气栏目；方向键和屏幕链接都可以操作。',
    '4G':'试着播放、暂停和拖动这段短片。移动宽带推动了视频应用，但实际体验还受网络、终端和服务影响。',
    '5G':'你来驾驶，我来帮你观察响应。这里的等待时间由程序设定，不是实际4G或5G测速。',
    '6G':'先观察两个路口，再试着调整信号灯。数字孪生已有技术基础；这里是面向未来通信研究的概念模拟。'
  };
  const cities = {
    beijing:{name:'北京',days:[['今天','晴','18–25℃'],['明天','多云','17–24℃'],['后天','小雨','16–22℃']]},
    shanghai:{name:'上海',days:[['今天','多云','21–27℃'],['明天','小雨','20–25℃'],['后天','晴','21–28℃']]},
    guangzhou:{name:'广州',days:[['今天','阵雨','25–30℃'],['明天','多云','24–31℃'],['后天','晴','25–32℃']]}
  };
  const obstacles = [[3,1],[3,2],[3,3],[5,4]], goal = [6,1];
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  function initial(era) {
    const common = {era,ended:false,finished:false,message:intros[era]};
    if (era==='2G') return {...common,scene:'phone',draft:'',attempted:false,config:'paused',tested:false,delivered:false,replyRead:false};
    if (era==='3G') return {...common,page:'home',city:'',focus:0,visited:[]};
    if (era==='4G') return {...common,status:'等待播放',played:false,error:false};
    if (era==='5G') return {...common,x:1,y:4,direction:0,latency:80,logs:[],pending:false,reached:false};
    if (era==='6G') {const junctions=[{name:'校园路口',red:40,green:20,arrivals:18},{name:'车站路口',red:25,green:35,arrivals:14}];return {...common,selected:0,junctions,before:junctions.map(traffic),after:junctions.map(traffic),changes:0,invalid:{red:false,green:false}};}
    return null;
  }
  function traffic(j) {
    // One model minute: fixed arrivals; green share * 30 is service capacity.
    const capacity = Math.round(30*j.green/(j.red+j.green));
    return {capacity,queue:Math.max(0,j.arrivals-capacity),arrivals:j.arrivals};
  }
  function choices(s) {
    if(s.page==='cities') return Object.entries(cities).map(([id,c])=>({action:'city',value:id,label:c.name}));
    if(s.page==='weather') return [{action:'home',label:'门户首页'},{action:'cities',label:'切换城市'}];
    return [{action:'cities',label:s.city?'切换城市':'选择城市'},{action:'weather',label:'天气预报'}];
  }
  function createModel(era) {
    if(!titles[era]) throw Error('未知互动时代');
    let s=initial(era);
    function act(action,value) {
      if(action==='restart'){s=initial(era);return true;}
      if(action==='end') {
        if(era==='5G'&&s.pending)act('stop');
        s.ended=true;
        if(era==='2G')s.finished=s.replyRead;
        if(era==='3G')s.finished=s.visited.length>0;
        if(era==='4G')s.finished=s.played;
        const endings={
          '2G':s.replyRead?'家人的回复已经读到。短信让发送和阅读可以发生在不同时间。':'短信故事尚未完成；草稿保留，可以继续，也可以直接返回调查。',
          '3G':s.visited?.length?'你查到了模拟天气。早期移动数据服务已有发展，3G进一步推动了移动互联网与多媒体应用。':'这次还没有打开天气预报，随时可以继续浏览。',
          '4G':s.played?'短片已经播放。视频体验还取决于内容服务、终端及网络条件。':'这次尚未播放短片，可以重试或返回主线。',
          '5G':s.reached?'机器人到达了目标区。控制仍需要通信、传感和控制系统共同配合。':'体验已结束。没有抵达目标也没关系，下面只记录你实际执行的指令。',
          '6G':s.changes?'调整结果已列出。模型有助于比较方案，但不等于真实城市预测，也不证明6G能力已经实现。':'你观察了初始模型。通信与感知融合等仍是研究方向，城市模型已有的技术基础并非由6G首次发明。'
        };s.message=endings[era];return true;
      }
      if(action==='resume'){s.ended=false;return true;}
      if(s.ended)return false;
      if(era==='2G') {
        if(action==='draft'&&!s.delivered){s.draft=text.limit(value,70);return true;}
        if(action==='send') {
          if(!s.draft.trim()){s.message='先输入一条短信，再点击发送。';return false;}
          if(s.delivered){s.message='这条短信已送达。打开收件箱阅读回复。';return false;}
          s.attempted=true;
          if(!s.tested){s.message='发送延迟：本次模拟的短信服务中心转发队列处于暂停状态。请打开通信控制台，将“转发队列”设为“启用”，然后运行验证。';return true;}
          s.delivered=true;s.message='模拟短信已送达。你收到了一条家人的新短信，请打开收件箱。';return true;
        }
        if(action==='console'&&s.attempted&&!s.delivered){s.scene='console';s.message='故障已定位：服务中心接收了短信，但暂停的转发队列没有将它交付接收端。将转发队列设为“启用”，运行验证。真实短信故障可能有多种原因。';return true;}
        if(action==='config'&&s.scene==='console'&&['paused','enabled'].includes(value)){s.config=value;s.tested=false;return true;}
        if(action==='test'&&s.scene==='console'){s.tested=s.config==='enabled';s.message=s.tested?'验证通过：模拟转发队列已启用。回到手机，重新发送原短信。':'验证失败：转发队列仍暂停。请选择“启用”，再运行验证。';return s.tested;}
        if(action==='phone'){s.scene='phone';s.message=s.tested?'配置验证通过，草稿仍在。请重新发送。':'草稿已保留，尚未修复的转发环节会继续导致延迟。';return true;}
        if(action==='inbox'&&s.delivered){s.scene='inbox';s.replyRead=true;s.finished=true;s.message='收到回复了。短短一条短信，也能让远方的人安心。';return true;}
      }
      if(era==='3G') {
        if(action==='down'||action==='up'){const n=choices(s).length;s.focus=(s.focus+(action==='down'?1:n-1))%n;return true;}
        if(action==='ok'){const c=choices(s)[s.focus];return act(c.action,c.value);}
        if(action==='cities'||action==='home'||action==='back'){s.page=action==='cities'?'cities':'home';s.focus=0;s.message=s.page==='cities'?'请选择要查询的城市。':'回到门户首页，城市选择已保留。';return true;}
        if(action==='city'&&cities[value]){s.city=value;s.page='home';s.focus=1;s.message='已选择'+cities[value].name+'。现在可以打开天气栏目。';return true;}
        if(action==='weather') {if(!s.city){s.message='先选择城市，再打开天气预报。';return false;}s.page='weather';s.focus=0;if(!s.visited.includes(s.city))s.visited.push(s.city);s.finished=true;s.message='已显示'+cities[s.city].name+'的预设教学天气，不是实时预报。';return true;}
      }
      if(era==='4G') {
        if(action==='media'){s.status=String(value);if(value==='播放中'){s.played=true;s.finished=true;s.error=false;}s.message='播放器：'+s.status;return true;}
        if(action==='error'){s.error=true;s.status='视频加载失败';s.message='本地视频无法加载或浏览器不支持此格式。可以重试，也可以返回调查。';return true;}
      }
      if(era==='5G') {
        if(action==='latency'&&[80,500].includes(Number(value))&&!s.pending){s.latency=Number(value);s.message='模拟等待改为'+s.latency+'ms；这不是实际网络测速。';return true;}
        if(action==='command'&&!s.pending&&['forward','backward','left','right'].includes(value)){s.pending=true;s.logs.push({command:({forward:'前进',backward:'后退',left:'左转',right:'右转'})[value],result:'等待模拟执行',response:null,collision:false});s.message='指令已发送，等待模拟响应…';return true;}
        if(action==='stop'){if(s.pending)s.logs.at(-1).result='已取消，未执行';s.pending=false;s.logs.push({command:'停止',result:'取消尚未执行的移动，保持当前位置',response:null,collision:false});s.message='机器人已停止。';return true;}
        if(action==='execute'&&s.pending){
          s.pending=false;const command=value.command, names={forward:'前进',backward:'后退',left:'左转',right:'右转'};
          if(!names[command])return false;
          let collision=false,result='方向已更新';
          if(command==='left'||command==='right')s.direction=(s.direction+(command==='left'?3:1))%4;
          else {const v=[[0,-1],[1,0],[0,1],[-1,0]][s.direction],sign=command==='backward'?-1:1,x=s.x+v[0]*sign,y=s.y+v[1]*sign;collision=x<0||x>=8||y<0||y>=6||obstacles.some(p=>p[0]===x&&p[1]===y);if(collision)result='碰撞或边界限制：移动未执行';else{s.x=x;s.y=y;result='移动一格';}}
          s.reached=s.reached||(s.x===goal[0]&&s.y===goal[1]);Object.assign(s.logs.at(-1),{command:names[command],result,response:Math.max(0,Math.round(Number(value.elapsed)||0)),collision});s.finished=true;s.message=result+(s.reached?'；已抵达过目标区域。':'；可以继续探索或结束。');return true;
        }
      }
      if(era==='6G') {
        if(action==='junction'&&[0,1].includes(Number(value))){s.selected=Number(value);s.invalid={red:false,green:false};s.message='正在调整'+s.junctions[s.selected].name+'。';return true;}
        if(action==='red'||action==='green'){const v=Number(value);s.invalid[action]=!Number.isInteger(v)||v<10||v>60;if(s.invalid[action]){s.message='请输入10至60之间的整数模型秒；无效值不会应用。';return false;}s.junctions[s.selected][action]=v;return true;}
        if(action==='apply'){if(Object.values(s.invalid).some(Boolean)){s.message='参数未应用：请先修正10–60范围外或空白的红绿灯时长。';return false;}s.after[s.selected]=traffic(s.junctions[s.selected]);s.changes++;s.finished=true;s.message='已按所选路口的参数重新计算。绿灯占比越大，本模型单方向通行容量越高；延长这一方向绿灯也会增加交叉方向等待，真实系统还需考虑行人、安全与车流变化。';return true;}
      }
      return false;
    }
    return {act,getState:()=>clone(s),choices:()=>choices(s)};
  }
  let contexts=new Map(),owner=null,timer=null,generation=0,videoToken=0;
  const scope=()=>root.DemoManager?.isActive?.()?'demo':'formal';
  function model(era){const key=scope()+':'+era;if(!contexts.has(key))contexts.set(key,createModel(era));return contexts.get(key);}
  const btn=(action,label,value='',extra='')=>`<button type="button" class="btn secondary" data-ix-action="${action}" data-ix-value="${esc(value)}" ${extra}>${label}</button>`;
  const keyButtons=()=>'<div class="ix-directions" aria-label="手机方向键">'+btn('up','↑ 上移')+btn('ok','确认')+btn('down','↓ 下移')+btn('back','返回')+'</div>';
  function logs(s){return `<details class="ix-logs" ${s.ended?'open':''}><summary>查看操作记录（${s.logs.length}条）</summary><p>指令到执行回调的页面实测等待；由本地模拟计时器产生，受浏览器调度影响，不是网络测试。</p><ol>${s.logs.map(l=>`<li>${esc(l.command)}：${esc(l.result)}；${l.response===null?'未等待执行':l.response+'ms 模拟响应'}${l.collision?'；发生碰撞限制':''}</li>`).join('')||'<li>尚无操作记录。</li>'}</ol><p>抵达目标：${s.reached?'是':'否'}</p></details>`;}
  function robot(s){return `<div class="ix-field" role="img" aria-label="八列六行场地。机器人位置第${s.x+1}列、第${s.y+1}行，朝向${['上','右','下','左'][s.direction]}">${Array.from({length:48},(_,i)=>{const x=i%8,y=Math.floor(i/8),wall=obstacles.some(p=>p[0]===x&&p[1]===y);return `<span class="${wall?'ix-wall':''}">${s.x===x&&s.y===y?['▲','▶','▼','◀'][s.direction]:goal[0]===x&&goal[1]===y?'目标':wall?'障碍':''}</span>`;}).join('')}</div>`;}
  function cityArt(s){return `<svg class="ix-city" viewBox="0 0 480 240" role="img" aria-label="两个独立模型路口及车辆排队示意"><rect width="480" height="240" fill="#183044"/><path d="M0 120H480M120 0V240M360 0V240" stroke="#536979" stroke-width="40"/>${s.junctions.map((j,i)=>{const x=120+i*240,q=s.after[i].queue;return `<g><rect x="${x+25}" y="65" width="18" height="35" rx="5" fill="#17202a"/><circle cx="${x+34}" cy="75" r="5" fill="#db7373"/><circle cx="${x+34}" cy="90" r="5" fill="#87d7a2"/><text x="${x}" y="35" fill="white" text-anchor="middle">${j.name}</text>${Array.from({length:Math.min(q,8)},(_,n)=>`<rect x="${x-35-(n%4)*20}" y="${n<4?109:124}" width="15" height="8" rx="2" fill="#f1cf89"/>`).join('')}<text x="${x}" y="210" fill="white" text-anchor="middle">排队 ${q} 辆（模型）</text></g>`;}).join('')}</svg>`;}
  function body(era) {
    const m=model(era),s=m.getState();
    if(s.ended)return `<h3>${s.finished?'本次体验总结':'本次体验已结束'}</h3><p>${esc(s.message)}</p>${era==='5G'?logs(s):era==='6G'?cityArt(s)+comparison(s):''}<div class="ix-actions">${btn('resume','继续操作')}${btn('restart','重新开始')}${btn('exit','返回原来的调查')}</div>`;
    if(era==='2G'){
      if(s.scene==='console')return `<section class="ix-console"><h3>短信通信控制台</h3><p>发送终端 → 无线接入 → 短信服务中心 → 接收终端</p><p>故障：服务中心转发队列暂停。正确设置：启用。</p><label>转发队列<select data-ix-input="config"><option value="paused" ${s.config==='paused'?'selected':''}>暂停</option><option value="enabled" ${s.config==='enabled'?'selected':''}>启用</option></select></label><p>验证状态：${s.tested?'已通过':'尚未通过'}</p><div class="ix-actions">${btn('test','运行转发验证')}${btn('phone','返回手机')}</div></section>`;
      if(s.scene==='inbox')return `<div class="ix-handset"><h3>收件箱 · 家人</h3><p class="ix-lcd">收到你的短信了，我们放心了。路上注意安全，等你回来吃饭。</p><small>虚构家庭对白 · 本地模拟</small>${btn('phone','返回手机')}</div>`;
      return `<div class="ix-handset"><div class="ix-lcd"><h3>数字手机 · 短信</h3><p>收件人：家人（虚构联系人）</p><label>短信内容<textarea data-ix-input="draft" ${s.delivered?'readonly':''}>${esc(s.draft)}</textarea></label><p>本体验采用70个可见字符的编辑上限，不概括所有短信编码与长短信机制。</p><p>状态：${s.delivered?'✓ 已送达 · 1条新短信':s.attempted?'转发延迟':'待发送'}</p></div><div class="ix-actions">${btn('send','发送短信')}${s.attempted&&!s.delivered?btn('console','查看通信系统'):''}${s.delivered?btn('inbox','打开新短信 / 收件箱'):''}</div></div>`;
    }
    if(era==='3G')return `<div class="ix-handset"><div class="ix-lcd ix-portal" tabindex="0" aria-label="移动门户，使用方向键和回车"><h3>${s.page==='cities'?'选择城市':s.page==='weather'?cities[s.city].name+'天气':'掌上信息门户'}</h3><p>当前城市：${s.city?cities[s.city].name:'尚未选择'}</p>${s.page==='weather'?'<p>预设教学数据，并非实时天气。</p><ul>'+cities[s.city].days.map(d=>`<li>${d.map(esc).join(' · ')}</li>`).join('')+'</ul>':'<p>出门前，为自己查一份天气预报。</p>'}<div class="ix-menu">${m.choices().map((c,i)=>btn(c.action,c.label,c.value,`data-ix-focus="${i}" aria-current="${i===s.focus?'true':'false'}"`)).join('')}</div></div>${keyButtons()}</div>`;
    if(era==='4G')return `<div class="ix-video"><video id="ixVideo" controls playsinline muted preload="metadata" aria-label="花朵短片，MDN CC0示例"><source src="assets/media/video/flower.mp4" type="video/mp4">当前浏览器不支持HTML视频，请返回调查。</video><div class="ix-actions">${btn('play','播放')}${btn('pause','暂停')}${btn('fullscreen','全屏')}${btn('retry','重新加载视频')}</div><label>播放进度 <input data-ix-input="seek" type="range" min="0" max="100" value="0" aria-label="播放进度百分比"></label><label>播放器音量 <input data-ix-input="volume" type="range" min="0" max="100" value="0" aria-label="播放器音量"></label><p data-ix-video-state>等待播放；默认静音，可主动调整音量。</p><p>素材：MDN flower.mp4，CC0。<a href="https://github.com/mdn/interactive-examples/tree/main/live-examples/media/cc0-videos" target="_blank" rel="noopener">原始素材与许可来源</a>。此片只演示播放器操作，不模拟真实4G速率。</p></div>`;
    if(era==='5G')return robot(s)+`<p>朝向：${['上','右','下','左'][s.direction]}；位置：${s.x+1}, ${s.y+1}。每次前后移动一格。</p><label>模拟指令等待<select data-ix-input="latency" ${s.pending?'disabled':''}><option value="80" ${s.latency===80?'selected':''}>80ms（较短）</option><option value="500" ${s.latency===500?'selected':''}>500ms（较长）</option></select></label><div class="ix-actions">${['forward','backward','left','right'].map((a,i)=>btn(a,['前进','后退','左转','右转'][i],'',s.pending?'disabled':'')).join('')}${btn('stop','停止')}</div>${logs(s)}<p>5G不无条件保证低时延、可靠性或工业安全；这里不控制真实机器人。</p>`;
    return cityArt(s)+`<label>选择路口<select data-ix-input="junction">${s.junctions.map((j,i)=>`<option value="${i}" ${s.selected===i?'selected':''}>${j.name}</option>`).join('')}</select></label><p>正在修改：${s.junctions[s.selected].name}</p>${['red','green'].map((f,i)=>`<label>${['红灯','绿灯'][i]}时长（模型秒）<input data-ix-input="${f}" type="number" min="10" max="60" value="${s.junctions[s.selected][f]}"></label>`).join('')}<p>合法范围10–60模型秒。这里只比较一个方向；未实现真实交通信号控制及安全时序。</p>${btn('apply','应用参数并比较')}${comparison(s)}<details><summary>查看模型规则与研究定位</summary><p>每模型分钟固定到达车辆；通行容量 = 四舍五入（30 × 绿灯 / 红绿灯总时长）；排队 = max（0，到达量 − 容量）。两个路口独立计算；不是实时仿真，不预测真实拥堵。</p><p>数字孪生、传感器和AI已有技术基础。IMT-2030提出通信与感知融合等研究方向；6G尚在研究、标准演进与验证中，不代表这些能力已普遍部署。</p><a href="https://www.itu.int/rec/R-REC-M.2160-0-202311-I/en" target="_blank" rel="noopener">ITU-R M.2160框架</a></details>`;
  }
  function comparison(s){return '<div class="ix-comparison">'+s.junctions.map((j,i)=>`<article><h4>${j.name}</h4><p>初始排队 ${s.before[i].queue} → 应用后 ${s.after[i].queue} 辆</p><p>固定到达 ${s.after[i].arrivals}；通行容量 ${s.after[i].capacity} 辆/模型分钟</p></article>`).join('')+'</div>';}
  function render(e){if(!titles[e.id])return '';return `<section class="ix-experience" data-independent-era="${e.id}" aria-label="${e.id}独立互动"><header><span class="eyebrow">可选互动 / ${e.id}</span><h2>${titles[e.id]}</h2><p>${intros[e.id]}</p><p class="muted">本地教学模拟。操作只保留在本次页面会话中，刷新可重新体验；不写入主线任务、证据或答题记录。</p>${e.id==='6G'?'<p class="ix-research">未来研究情境 · 非真实6G网络或实时数字孪生城市</p>':''}</header><div class="ix-body">${body(e.id)}</div><p class="ix-feedback" role="status" aria-live="polite">${esc(model(e.id).getState().message)}</p><div class="ix-actions ix-footer">${btn('end','结束体验 / 查看总结')}${btn('restart','重新开始')}${btn('exit','退出并返回调查')}</div></section>`;}
  function speak(era,event,story=false){const s=model(era).getState();root.CommsArchiveLan?.showInteractionFeedback?.({era,event,text:s.message,story});}
  function refresh(rebuild=true){if(!owner)return;const node=root.document?.querySelector('[data-independent-era]');if(!node||node.dataset.independentEra!==owner.era)return;const s=model(owner.era).getState();if(rebuild){node.querySelector('.ix-body').innerHTML=body(owner.era);bindVideo();}node.querySelector('.ix-feedback').textContent=s.message;}
  function cancelPending(){generation++;videoToken++;if(timer!==null){root.clearTimeout(timer);timer=null;}}
  function leave(){cancelPending();if(owner){const oldModel=contexts.get(owner.scope+':'+owner.era);if(oldModel?.getState().pending)oldModel.act('stop');root.CommsArchiveLan?.dismissInteractionFeedback?.();}const video=root.document?.querySelector('#ixVideo');video?.pause?.();owner=null;}
  function mount(era){if(owner?.era===era&&owner.scope===scope())return;leave();owner={era,scope:scope()};bindVideo();speak(era,'enter',true);}
  function mediaStatus(text){if(!owner||owner.era!=='4G')return;model('4G').act('media',text);const node=root.document?.querySelector('[data-ix-video-state]');if(node)node.textContent=text;refresh(false);}
  function bindVideo(){const video=root.document?.querySelector('#ixVideo');if(!video||video.dataset.bound)return;video.dataset.bound='1';for(const [event,text]of [['play','播放中'],['pause','已暂停'],['ended','短片播放结束'],['waiting','正在缓冲'],['loadedmetadata','视频已就绪']])video.addEventListener(event,()=>{if(root.document?.querySelector('#ixVideo')===video)mediaStatus(text);});const error=()=>{if(root.document?.querySelector('#ixVideo')!==video)return;model('4G').act('error');mediaStatus('视频加载失败：可重试或退出');};video.addEventListener('error',error);video.querySelector('source')?.addEventListener('error',error);video.addEventListener('timeupdate',()=>{const slider=root.document?.querySelector('[data-ix-input="seek"]');if(slider&&video.duration>0)slider.value=String(video.currentTime/video.duration*100);});}
  function action(action,value) {
    if(!owner||owner.scope!==scope()){leave();return false;}const era=owner.era,m=model(era);
    root.DemoGuide?.activity?.();
    if(action==='exit'){const complete=m.getState().finished;leave();const returned=root.closeIndependentExperience?.();if(returned)root.CommsArchiveLan?.showInteractionFeedback?.({era,event:'return',text:complete?'这次模拟的观察先记在心里。原来的调查进度没有改变，我们继续研究时代现场。':'这段模拟先停在这里。原来的调查进度没有改变，可以继续主线，也可以稍后回来。',story:false});return returned;}
    if(action==='restart'||action==='end'||action==='stop'){cancelPending();if(era==='4G')root.document?.querySelector('#ixVideo')?.pause?.();}
    if(era==='5G'&&['forward','backward','left','right'].includes(action)) {
      if(!m.act('command',action))return false;const token=++generation,started=Date.now(),context=owner;refresh();
      timer=root.setTimeout(()=>{timer=null;if(token!==generation||context!==owner||owner.scope!==scope())return;m.act('execute',{command:action,elapsed:Date.now()-started});refresh();speak(era,'response');},m.getState().latency);return true;
    }
    if(era==='4G'&&['play','pause','fullscreen','retry'].includes(action)) {
      const video=root.document?.querySelector('#ixVideo');if(!video)return false;
      if(action==='pause'){videoToken++;video.pause();mediaStatus('已暂停');}
      if(action==='retry'){videoToken++;video.load();mediaStatus('正在重新加载视频');}
      if(action==='play'){const token=++videoToken;try{const p=video.play();p?.catch?.(()=>{if(token===videoToken)mediaStatus('无法开始播放，请重试；也可以返回调查。');});}catch(_){mediaStatus('浏览器无法开始播放，请重试或退出。');}}
      if(action==='fullscreen'){try{const p=video.requestFullscreen?video.requestFullscreen():video.webkitEnterFullscreen?.();if(!video.requestFullscreen&&!video.webkitEnterFullscreen)mediaStatus('当前浏览器不提供全屏接口，请使用播放器原生控件。');p?.catch?.(()=>mediaStatus('全屏未开启，可以继续在页面内观看。'));}catch(_){mediaStatus('全屏未开启，可以继续在页面内观看。');}}
      return true;
    }
    if(action==='restart')root.CommsArchiveLan?.dismissInteractionFeedback?.();
    const result=m.act(action,value);refresh();if(!['up','down','draft','city','junction','red','green','config','latency'].includes(action))speak(era,action,action==='end'||action==='restart');return result;
  }
  function change(field,value){if(!owner)return false;if(owner.era==='4G'&&['seek','volume'].includes(field)){const video=root.document?.querySelector('#ixVideo');if(!video)return false;const n=Math.max(0,Math.min(100,Number(value)||0));if(field==='volume'){video.volume=n/100;video.muted=n===0;mediaStatus('音量 '+n+'%');}else if(Number.isFinite(video.duration)&&video.duration>0){video.currentTime=video.duration*n/100;mediaStatus('已跳转播放进度');}else mediaStatus('视频尚未就绪，暂不能跳转进度。');return true;}const result=model(owner.era).act(field,value);if(field==='draft'){const input=root.document?.querySelector('[data-ix-input="draft"]');const draft=model(owner.era).getState().draft;if(input&&input.value!==draft)input.value=draft;}refresh(field!=='draft'&&field!=='red'&&field!=='green');return result;}
  root.document?.addEventListener?.('click',event=>{const control=event.target.closest?.('[data-ix-action]');if(control&&!control.disabled&&control.closest('[data-independent-era]'))action(control.dataset.ixAction,control.dataset.ixValue);});
  root.document?.addEventListener?.('input',event=>{const field=event.target.dataset?.ixInput;if(event.isComposing)return;if(['draft','seek','volume','red','green'].includes(field))change(field,event.target.value);});
  root.document?.addEventListener?.('change',event=>{const field=event.target.dataset?.ixInput;if(field&&!['draft','seek','volume','red','green'].includes(field))change(field,event.target.value);});
  root.document?.addEventListener?.('compositionend',event=>{if(event.target.dataset?.ixInput==='draft')change('draft',event.target.value);});
  root.document?.addEventListener?.('keydown',event=>{if(owner?.era!=='3G'||!event.target.closest?.('.ix-portal')||event.target.closest?.('input,textarea,select')||event.repeat)return;const a={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'back',Enter:'ok'}[event.key];if(a){event.preventDefault();action(a);root.document.querySelector('.ix-portal')?.focus();}});
  root.document?.addEventListener?.('visibilitychange',()=>{if(root.document.visibilityState==='hidden'){cancelPending();if(owner?.era==='5G'&&model('5G').getState().pending){model('5G').act('stop');refresh();}root.document.querySelector('#ixVideo')?.pause?.();}});
  root.addEventListener?.('pagehide',leave);
  return {createModel,traffic,titles,render,mount,leave,action,change,getState:era=>model(era).getState(),reset(){leave();contexts=new Map();}};
});
