/* Long-form research workspace. No data or settings are sent to a server. */
'use strict';
window.LongformWorkspace = function mount(api) {
  const $ = id => document.getElementById(id), esc = api.esc;
  const KEY = 'yt-longform-workspace:v1';
  const root = $('lf-workspace'), gallery = $('lf-gallery'), repro = $('lf-repro');
  const empty = () => ({video:[], channel:[], preset:[], home:null, evidence:{}});
  let db, storageError = false;
  try {db = {...empty(), ...JSON.parse(localStorage.getItem(KEY)||'{}')};} catch {db=empty();}
  for (const k of ['video','channel','preset']) if (!Array.isArray(db[k])) db[k]=[];
  if (!db.evidence || typeof db.evidence !== 'object') db.evidence={};
  const base = {ai:'',grade:'',group:'all',kind:'ad',model:'legacy',country:'',fx:'1400',target:'',metric:'',dir:'desc',one:false,window:false,focus:'',list:''};
  let cfg = {...base}, active = '', library = '', panel = 'board', direct = false;
  const params = new URL(location.href);
  const includesParam = k => params.searchParams.has(k);
  const explicit = ['q','view','pageSize','analysis','panel'].some(includesParam);
  direct = includesParam('q');
  const gradeRank = {A:3,B:2,C:1};
  const blue = 'lf-blue', purple = 'lf-purple', orange = 'lf-orange', gray = 'lf-gray', green = 'lf-green';
  const presets = [
    {id:'steady',name:'1순위 · 지속수익 / AI',about:'최근 1년 · 근거 등급 · 반복 성과 · 편당 직접 시간 · 채널 대표 1개',controls:{days:'365'},cfg:{ai:'yes',focus:'steady',one:true}},
    {id:'new',name:'2순위 · 신규 발견',about:'콘텐츠 시작 7~90일 · 쇼츠 D7과 롱폼 D30을 별개로 비교',controls:{},cfg:{focus:'new',window:true,metric:'d30'}},
    {id:'business',name:'3순위 · 낮은 관여 / 사업 확장',about:'작업시간 · 비용 · 실제/반복 거래 · 시간당 이익',controls:{},cfg:{focus:'business',kind:'profit',metric:'hourly'}}
  ];
  const values = [['','기존 정렬'],['views','누적 조회'],['date','게시일'],['duration','영상 길이'],['daily','게시 후 일평균'],['selected','선택 금액'],['ad','광고수익'],['total','실제 총수익'],['profit','실제 순이익'],['grade','근거 등급'],['repeat','반복 성과 (%)'],['minutes','직접 작업시간'],['cost','실제 비용'],['trades','실제 거래'],['repeatTrades','반복 거래'],['hourly','시간당 이익'],['start','형식 시작 후 경과일'],['d7','쇼츠 D7'],['d30','롱폼 D30']];
  const fields = [
    ['grade','근거 등급','grade'],['source','검증한 출처 URL','url'],['country','확인된 국가','country'],['start','형식 시작일','date'],
    ['d7','관련 쇼츠 D7 조회','number'],['d30','롱폼 D30 조회','number'],['repeat','동일 경과 반복 성과 (%)','number'],['minutes','직접 작업시간 (분)','number'],['cost','실제 편당 제작비 (KRW)','number'],['trades','실제 거래 건수','number'],['repeatTrades','반복 거래 건수','number'],['actualAd','실제 누적 광고수익 (KRW)','number'],['total','실제 누적 총수익 (KRW)','number'],['profit','실제 순이익 (KRW)','signed'],['m1','M1 동일 범위 실측 RPM (KRW)','number'],['m2','M2 동일 범위 비교군 RPM (KRW)','number']
  ];
  const countryOptions=[['','전체 / 미지정'],['KR','한국'],['JP','일본'],['US','미국'],['other','기타 확인 국가']];
  const options = rows=>rows.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');
  const select = (id, title, rows, cls='')=>`<label class="${cls}">${title}<select id="lf-${id}">${options(rows)}</select></label>`;
  const num = v=>typeof v==='number'&&Number.isFinite(v)?v:null;
  function source(v) {try {const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:null;} catch {return null;}}
  function evidence(v) {const e=db.evidence[v.id]??v.workspaceEvidence;return e && source(e.source) ? e : {};}
  const cleanChannel = v=>typeof v.channelId==='string'&&/^UC[\w-]{22}$/.test(v.channelId)?v.channelId:api.terms(v.ch);
  const country = (v,e)=>e.country||v.channelCountry||v.country||(v.b.includes('일본')&&!v.b.includes('한국')?'JP':v.b.includes('한국')&&!v.b.includes('일본')?'KR':'');
  const shortNum = v=>v==null?'미산정':new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1}).format(v);
  const won = v => v==null?'미산정':(v<0?'−':'')+api.money(Math.abs(v));
  function startAge(e){if(!/^\d{4}-\d\d-\d\d$/.test(e.start||''))return null;const d=Math.floor((api.today()-Date.parse(e.start+'T00:00:00Z'))/86400000);return Number.isFinite(d)&&d>=0?d:null;}
  function sector(v){const t=[v.k,...v.b].join(' ');return /정부지원/.test(t)?'grant':/주식|ETF|경제|보험|투자|연금/i.test(t)?'finance':/AI 창업|AI 사업/.test(t)?'ai':/고양이|햄스터|동물/.test(t)?'pets':/교육/.test(t)?'education':/테크|기술/.test(t)?'tech':/음악/.test(t)?'music':/드라마|영화|예능/.test(t)?'drama':'';}
  function metrics(v,r){
    const e=evidence(v), sec=sector(v), c=country(v,e), modelCountry=({KR:.4,JP:.55,US:1})[cfg.country||c], rawViews=num(v.v), m4={ai:3500,finance:5500,grant:4000}, d3={ai:8,education:6,tech:5,pets:3,drama:2.5,music:1.5};
    const rpm={legacy:r*1000,actual:null,m1:num(e.m1),m2:num(e.m2),m3:d3[sec]&&modelCountry&&Number(cfg.fx)>0?d3[sec]*modelCountry*Number(cfg.fx):null,m4:m4[sec]??null,m5:sec==='education'?5000:sec==='finance'?4000:2000}[cfg.model]??null;
    const ad=cfg.model==='actual'?num(e.actualAd):rawViews!=null&&rpm!=null?rawViews*rpm/1000:null;
    const profit=num(e.profit)??(num(e.total)!=null&&num(e.cost)!=null?e.total-e.cost:null);
    const result={ad,total:num(e.total),profit,repeat:num(e.repeat),minutes:num(e.minutes),cost:num(e.cost),trades:num(e.trades),repeatTrades:num(e.repeatTrades),hourly:profit!=null&&num(e.minutes)>0?profit*60/e.minutes:null,start:startAge(e),d7:num(e.d7),d30:num(e.d30),date:Number.isFinite(Date.parse(v.d))?Date.parse(v.d):null,views:rawViews,duration:num(v.s),daily:rawViews==null?null:rawViews/api.age(v),grade:gradeRank[e.grade]??null,country:c,e};
    result.selected=result[cfg.kind];
    result.qualified=!!result.grade&&result.grade>=2&&(cfg.focus==='steady'?result.repeat!=null&&result.minutes!=null&&v.ai:cfg.focus==='new'?result.start!=null&&result.start>=7&&result.start<=90&&result.d30!=null:cfg.focus==='business'?[result.minutes,result.cost,result.trades,result.repeatTrades,result.hourly].every(x=>x!=null):true);
    return result;
  }
  function order(a,b,dir=cfg.dir){if(a==null)return b==null?0:1;if(b==null)return -1;return dir==='asc'?a-b:b-a;}
  function choose(rows,r,fallback){
    if(direct)return rows.slice().sort(fallback);
    const pairs=rows.map(v=>[v,metrics(v,r)]).filter(([v,m])=>{
      if(cfg.list==='video'&&!db.video.some(x=>x.key===v.id)||cfg.list==='channel'&&!db.channel.some(x=>x.key===cleanChannel(v)))return false;
      if(cfg.ai==='yes'&&!v.ai||cfg.ai==='unknown'&&v.ai||cfg.grade==='U'&&m.grade!=null||cfg.grade&&cfg.grade!=='U'&&m.grade!==gradeRank[cfg.grade])return false;
      if(cfg.country&&m.country!==cfg.country||cfg.group==='qualified'&&!m.qualified||cfg.group==='research'&&m.qualified)return false;
      if(cfg.window&&(m.start==null?cfg.group==='qualified':m.start<7||m.start>90))return false;
      if(cfg.target!==''&&!(m.selected!=null&&m.selected>=Number(cfg.target)))return false;
      return true;
    });
    const cmp=([a,x],[b,y])=>{
      if(cfg.metric){const first=order(x[cfg.metric],y[cfg.metric]);if(first)return first;}
      if(cfg.focus==='steady'){const first=order(x.grade,y.grade,'desc')||order(x.repeat,y.repeat,'desc')||order(x.minutes,y.minutes,'asc')||order(x.selected,y.selected,'desc');if(first)return first;}
      if(cfg.focus==='new'){const first=order(x.d30,y.d30,'desc')||order(x.d7,y.d7,'desc');if(first)return first;}
      if(cfg.focus==='business'){const first=order(x.repeatTrades,y.repeatTrades,'desc')||order(x.trades,y.trades,'desc')||order(x.minutes,y.minutes,'asc')||order(x.cost,y.cost,'asc');if(first)return first;}
      return fallback(a,b);
    };
    pairs.sort(cmp);
    const seen=new Set();return pairs.map(p=>p[0]).filter(v=>!cfg.one||!seen.has(cleanChannel(v))&&!!seen.add(cleanChannel(v)));
  }
  const formNode = `
  <div id="lf-presets" class="lf-row" aria-label="추천 조합">${presets.map(p=>`<button type="button" data-lf="preset" data-key="${p.id}" title="${esc(p.about)}" aria-pressed="false">${p.name}</button>`).join('')}</div>
  <p id="lf-hint" class="lf-hint"></p>
  <div class="lf-row" aria-label="저장 관리"><button type="button" data-lf="save">현재 조건 조합 저장</button><button type="button" data-lf="library" data-key="preset">저장 조합</button><button type="button" data-lf="library" data-key="video">영상 즐겨찾기</button><button type="button" data-lf="library" data-key="channel">채널 즐겨찾기</button><button type="button" data-lf="all">전체 검색</button>${select('group','후보 구분',[['all','전체'],['qualified','근거 충족'],['research','조사 후보']],blue)}</div>
  <details id="lf-options"><summary>상세 조건 · 정렬 방향 · 금액 모델</summary><div class="lf-options">
  ${select('ai','AI 제작',[['','전체'],['yes','AI 확인'],['unknown','미확인']],purple)}
  ${select('grade','근거 등급',[['','전체'],['A','A · 직접 근거'],['B','B · 교차 근거'],['C','C · 제한적'],['U','미확인']],blue)}
  ${select('kind','금액 종류',[['ad','광고수익'],['total','실제 총수익'],['profit','실제 순이익']],green)}
  ${select('model','광고 계산 모형',[['legacy','기존 1,000 / 2,000 / 4,000 가정'],['actual','실제 정산액'],['m1','M1 · 동일 채널 실측'],['m2','M2 · 유사 채널 실측'],['m3','M3 · vidIQ 기준 가정'],['m4','M4 · N3 기준 가정'],['m5','M5 · P1 가정']],orange)}
  ${select('country','국가 / M3 시장',countryOptions)}<label>환율 (KRW/USD)<input type="number" id="lf-fx" min="1" step="any"></label><label class="${green}">목표금액 (KRW)<input type="number" id="lf-target" step="any"></label>
  ${select('metric','정렬 항목',values,'lf-red')}${select('dir','정렬 방향',[['desc','내림차순'],['asc','오름차순']],'lf-red')}
  <label class="lf-check"><input type="checkbox" id="lf-one">채널 대표 1개</label><label class="lf-check"><input type="checkbox" id="lf-window">형식 시작 7~90일</label></div>
  <p class="lf-hint">기존 광고수익 표시와 산식은 그대로입니다. 상세 금액의 M3는 시장·환율 가정, M4/M5는 비교용입니다. 국가 미입력 시 한국·일본 분류만 보조 사용하며 영어권을 미국으로 간주하지 않습니다. 미확인 값은 어느 정렬 방향에서도 마지막입니다.</p></details>
  <div id="lf-library" hidden></div><p id="lf-message" role="status" aria-live="polite" class="lf-hint"></p>`;
  root.innerHTML=formNode;
  const controls=['q','days','vdays','sort','rpm','pagesize','cols','vmin','vmax','mmin','mmax','vfrom','vto'];
  const ext=['ai','grade','group','kind','model','country','fx','target','metric','dir','one','window'];
  function message(t){$('lf-message').textContent=t;}
  function store(){try{localStorage.setItem(KEY,JSON.stringify(db));storageError=false;}catch{storageError=true;message('브라우저가 저장을 차단했습니다. 이 탭에서만 유지됩니다.');}}
  function refresh(){
    for(const id of ext){const x=$('lf-'+id);if(x.type==='checkbox')x.checked=!!cfg[id];else x.value=cfg[id];}
    for(const b of root.querySelectorAll('[data-lf=preset]'))b.setAttribute('aria-pressed',String(b.dataset.key===active));
    const hints=presets.find(x=>x.id===active)?.about||'영상·채널·조건을 따로 저장합니다. 근거 미확인은 조사 후보에 남습니다.';
    $('lf-hint').textContent=direct?'직접 링크 검색을 먼저 표시합니다. 추천·저장 조합은 자동으로 적용하지 않습니다.':hints;
    drawLibrary();
  }
  function clearDirect(){if(!direct)return;direct=false;const u=new URL(location.href);u.searchParams.delete('q');history.replaceState(history.state,'',u);}
  function capture(){return {controls:Object.fromEntries(controls.map(id=>[id,$(id).value])),view:api.state.key,min:api.state.min,cfg:{...cfg,list:''}};}
  function apply(saved,{initial=false}={}){
    if(!initial){clearDirect();showPanel('board',panel!=='board');api.resetTrend();}
    if(!initial) $('q').value='';
    for(const [id,value] of Object.entries(saved.controls||{}))if(controls.includes(id))$(id).value=String(value);
    cfg={...base,...saved.cfg};api.clearChannel();api.state.min=Number(saved.min)||0;
    $('customDaysLabel').hidden=$('days').value!=='custom';document.documentElement.style.setProperty('--cols',$('cols').value||'5');
    refresh();api.select(saved.view||'all');
  }
  function defaults(){return {q:'',days:'all',vdays:'27',sort:'views',rpm:'2',pagesize:'100',cols:'5',vmin:'',vmax:'',mmin:'',mmax:'',vfrom:'',vto:''};}
  function applyPreset(p){active=p.id;apply({controls:{...defaults(),...p.controls},cfg:p.cfg});}
  function applyEntry(type,item){active='';if(type==='preset'){apply(item.value);return;}apply({controls:{...defaults(),q:type==='video'?item.key:''},cfg:{list:type==='channel'?'channel':''},view:'all'});if(type==='channel')api.findChannel(item.channel||item.name);}
  function showPanel(name,update=true,section=''){
    panel=name;gallery.hidden=name!=='board';repro.hidden=name!=='reproduction';
    $('lf-repro-link').setAttribute('aria-current',name==='reproduction'?'page':'false');
    if(name==='reproduction'){
      const suffix=section?'#'+encodeURIComponent(section):'';const frame=$('lf-repro-frame');
      if(!frame.getAttribute('src')||section)frame.setAttribute('src','reproduction.html?embed=1'+suffix);
    }
    if(update){const u=new URL(location.href);if(name==='reproduction'){u.searchParams.set('panel','reproduction');u.searchParams.delete('q');direct=false;}else{u.searchParams.delete('panel');u.searchParams.delete('section');}history.pushState(history.state,'',u);}
  }
  function drawLibrary(){
    const box=$('lf-library');box.hidden=!library;if(!library)return;
    const name={preset:'저장 조합',video:'영상 즐겨찾기',channel:'채널 즐겨찾기'}[library];
    box.innerHTML=`<div class="lf-row"><strong>${name}</strong><button type="button" data-lf="browse-library">목록으로 보기</button><button type="button" data-lf="close-library">닫기</button>${db.home?'<button type="button" data-lf="clear-home">첫 화면 해제</button>':''}</div>`+ (db[library].length?db[library].map((x,i)=>`<div class="lf-row lf-entry"><button type="button" data-lf="apply" data-idx="${i}">${esc(x.name)}</button><button type="button" data-lf="rename" data-idx="${i}">이름 변경</button><button type="button" data-lf="up" data-idx="${i}" aria-label="${esc(x.name)} 위로" ${i===0?'disabled':''}>↑</button><button type="button" data-lf="down" data-idx="${i}" aria-label="${esc(x.name)} 아래로" ${i===db[library].length-1?'disabled':''}>↓</button><button type="button" data-lf="home" data-idx="${i}" aria-pressed="${db.home?.type===library&&db.home?.key===x.key}">첫 화면</button><button type="button" data-lf="delete" data-idx="${i}">삭제</button></div>`).join(''):'<p class="lf-hint">저장 항목이 없습니다.</p>');
  }
  function nameDialog(title,initial,fn){
    const d=$('lf-name-dialog'), form=d.querySelector('form'), input=$('lf-name-input');$('lf-name-title').textContent=title;input.value=initial;d.showModal();input.focus();input.select();
    form.onsubmit=e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const n=input.value.trim();if(!n)return;d.close();fn(n);};
  }
  function card(v,r){
    const m=metrics(v,r), ch=cleanChannel(v), button=(kind,key,t,pressed=false)=>`<button type="button" data-lf="${kind}" data-key="${esc(key)}" ${kind==='evidence'?'':`aria-pressed="${pressed}"`}>${t}</button>`;
    const comparisons=cfg.focus==='new'?[['시작 경과',m.start,orange],['쇼츠 D7',m.d7,blue],['롱폼 D30',m.d30,blue]]:cfg.focus==='business'?[['작업 분',m.minutes,purple],['비용',m.cost,green],['실제 거래',m.trades,blue],['반복 거래',m.repeatTrades,blue],['시간당 이익',m.hourly,green]]:cfg.focus==='steady'?[['반복 %',m.repeat,blue],['작업 분',m.minutes,purple]]:[];
    const more=(cfg.focus||cfg.metric||cfg.model!=='legacy'||cfg.kind!=='ad')?`<div class="lf-labels"><span class="${m.selected==null?gray:green}">${cfg.kind==='profit'?'실제 순이익':cfg.kind==='total'?'실제 총수익':cfg.model==='actual'?'실제 광고':'광고 추정'} ${won(m.selected)}</span>${comparisons.map(([k,n,cls])=>`<span class="${n==null?gray:cls}">${k} ${['비용','시간당 이익'].includes(k)?won(n):shortNum(n)}</span>`).join('')}</div>`:'';
    return `<div class="lf-labels"><span class="${m.qualified?blue:orange}">${m.qualified?'근거 충족':'조사 후보'}</span><span class="${m.grade?blue:gray}">${m.e.grade?esc(m.e.grade)+' 근거':'근거 미확인'}</span>${v.ai?'<span class="lf-purple">AI 제작</span>':''}${source(m.e.source)?`<a class="lf-blue" href="${esc(source(m.e.source))}" target="_blank" rel="noopener noreferrer">출처</a>`:''}</div>${more}<div class="lf-actions">${button('fav-video',v.id,'영상 저장',db.video.some(x=>x.key===v.id))}${button('fav-channel',v.id,'채널 저장',db.channel.some(x=>x.key===ch))}${button('evidence',v.id,'검증 근거')}</div>`;
  }
  function evidenceDialog(v){
    const e=evidence(v), d=$('lf-evidence-dialog'), form=d.querySelector('form');$('lf-evidence-title').textContent=v.t;
    $('lf-evidence-fields').innerHTML=fields.map(([k,t,kind])=>kind==='grade'?select('ev-'+k,t,[['','미확인'],['A','A · 직접 근거'],['B','B · 교차 근거'],['C','C · 제한적']],blue):kind==='country'?select('ev-'+k,t,countryOptions):`<label>${t}<input id="lf-ev-${k}" type="${kind==='signed'?'number':kind}" ${kind==='number'?'min="0" ':''}${['number','signed'].includes(kind)?'step="any"':''}></label>`).join('');
    for(const [key] of fields)$('lf-ev-'+key).value=e[key]??'';
    d.showModal();form.onsubmit=ev=>{if(ev.submitter?.value==='cancel')return;ev.preventDefault();const next={};for(const [key,,kind] of fields){const x=$('lf-ev-'+key), raw=x.value.trim();if(raw!=='')next[key]=['number','signed'].includes(kind)?x.valueAsNumber:raw;}
      const msg=$('lf-evidence-status');if(!source(next.source)){msg.textContent='검증에 사용한 http(s) 출처 URL을 입력하세요.';return;}
      if(next.repeat>100||next.repeatTrades>next.trades){msg.textContent='반복 성과는 0~100%, 반복 거래는 실제 거래 건수 이하여야 합니다.';return;}
      msg.textContent='';db.evidence[v.id]=next;store();d.close();api.render();if(!storageError)message('검증 근거를 이 브라우저에 저장했습니다.');};
  }
  root.addEventListener('change',event=>{const id=event.target.id.slice(3);if(!ext.includes(id))return;clearDirect();if(id==='ai')active='';const control=event.target;cfg[id]=control.type==='checkbox'?control.checked:control.value;api.state.pg=1;refresh();api.render();});
  document.addEventListener('click',ev=>{
    const rlink=ev.target.closest('#lf-repro-link');if(rlink&&!ev.ctrlKey&&!ev.metaKey&&!ev.shiftKey&&!ev.altKey){ev.preventDefault();showPanel(panel==='reproduction'?'board':'reproduction');window.scrollTo(0,0);return;}
    if(ev.target.closest('[data-section],#jumpTrend')&&panel==='reproduction')showPanel('board');
    const b=ev.target.closest('[data-lf]');if(!b)return;const action=b.dataset.lf,k=b.dataset.key,index=Number(b.dataset.idx);
    if(action==='preset'){applyPreset(presets.find(p=>p.id===k));return;}
    if(action==='all'){active='';apply({controls:defaults(),cfg:base});return;}
    if(action==='save'){const saved=capture();nameDialog('조건 조합 이름',presets.find(p=>p.id===active)?.name||'내 조건 조합',name=>{db.preset.push({key:crypto.randomUUID?.()||String(Date.now()),name,value:saved});library='preset';store();drawLibrary();});return;}
    if(action==='library'){library=library===k?'':k;drawLibrary();return;}
    if(action==='close-library'){library='';drawLibrary();return;}
    if(action==='browse-library'){if(library==='preset'){message('저장한 이름을 선택하면 조건을 적용합니다.');return;}active='';apply({controls:defaults(),cfg:{list:library}});return;}
    if(action==='clear-home'){db.home=null;store();drawLibrary();return;}
    if(action==='evidence'){const v=api.get(k);if(v)evidenceDialog(v);return;}
    if(action==='fav-video'||action==='fav-channel'){
      const v=api.get(k), type=action==='fav-video'?'video':'channel';if(!v)return;const key=type==='video'?v.id:cleanChannel(v);
      if(!db[type].some(x=>x.key===key)){db[type].push({key,name:type==='video'?v.t:v.ch,channel:v.ch});store();if(!storageError)message(type==='video'?'영상 즐겨찾기에 저장했습니다.':'채널 즐겨찾기에 저장했습니다.');}else{library=type;drawLibrary();return;}
      drawLibrary();api.render();[...$('grid').querySelectorAll('[data-lf]')].find(el=>el.dataset.lf===action&&el.dataset.key===k)?.focus();return;
    }
    const item=db[library]?.[index];if(!item)return;
    if(action==='apply'){applyEntry(library,item);return;}
    if(action==='rename'){nameDialog('저장 이름 변경',item.name,name=>{item.name=name;store();drawLibrary();});return;}
    if(action==='home'){db.home={type:library,key:item.key};store();drawLibrary();return;}
    if(action==='delete'){db[library].splice(index,1);if(db.home?.type===library&&db.home?.key===item.key)db.home=null;}
    else if(action==='up'||action==='down'){const list=db[library],at=index+(action==='up'?-1:1);if(at<0||at>=list.length)return;[list[index],list[at]]=[list[at],list[index]];}
    else return;
    store();drawLibrary();api.render();
  },true);
  $('lf-repro-frame').addEventListener('load',()=>{try{const doc=$('lf-repro-frame').contentDocument;if(!doc)return;for(const a of doc.querySelectorAll('a[href]')){const href=a.getAttribute('href');if(href.startsWith('#'))continue;const u=new URL(href,doc.URL);if(u.origin===location.origin&&u.pathname.endsWith('/index.html'))a.target='_top';else if(u.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer';}}}catch{}});
  window.addEventListener('popstate',()=>{const p=new URL(location.href);showPanel(p.searchParams.get('panel')==='reproduction'?'reproduction':'board',false,p.searchParams.get('section')||'');});
  function prepare(){
    if(direct){$('q').value=params.searchParams.get('q')||'';api.clearChannel();}
    else if(!explicit&&db.home){const {type,key}=db.home;const item=db[type]?.find(x=>x.key===key);if(item)applyEntry(type,item);}
    if(!direct&&params.searchParams.get('panel')==='reproduction')showPanel('reproduction',false,params.searchParams.get('section')||'');
    refresh();
  }
  return {prepare,choose,card,direct:()=>direct,normalSearch(){clearDirect();refresh();},legacyReset(){active='';cfg={...base};clearDirect();refresh();}};
};
