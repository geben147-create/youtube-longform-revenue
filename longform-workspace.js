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
  const base = {ai:'',grade:'',group:'all',kind:'ad',model:'legacy',country:'',fx:'1400',target:'',metric:'',dir:'desc',one:false,window:false,focus:'',list:'',d30goal:'10000',sample:'12',scenario:'1',monthlyGoal:'3000000',hitGoal:'70',q25Goal:'50',shareLimit:'35'};
  const core=window.LFMetrics; if(!core)return null; let qualifiedCount=0,researchCount=0; let cfg = {...base}, active = '', library = '', panel = 'board', direct = false;
  const params = new URL(location.href);
  const includesParam = k => params.searchParams.has(k);
  const explicit = ['q','view','pageSize','analysis','panel','lf'].some(includesParam);
  direct = includesParam('q');
  const gradeRank = {A:3,B:2,C:1};
  const blue = 'lf-blue', purple = 'lf-purple', orange = 'lf-orange', gray = 'lf-gray', green = 'lf-green';
  const presets = [
    {id:'steady',name:'1순위 · 지속수익 / AI',about:'최근 1년 · 근거 등급 · 반복 성과 · 편당 직접 시간 · 채널 대표 1개',controls:{days:'365'},cfg:{ai:'yes',focus:'steady',one:true}},
    {id:'new',name:'2순위 · 신규 발견',about:'콘텐츠 시작 7~90일 · 쇼츠 D7과 롱폼 D30을 별개로 비교',controls:{},cfg:{focus:'new',window:true,metric:'d30'}},
    {id:'business',name:'3순위 · 낮은 관여 / 사업 확장',about:'작업시간 · 비용 · 실제/반복 거래 · 시간당 이익',controls:{},cfg:{focus:'business',kind:'profit',metric:'hourly'}}
  ];
  const values = [['','기존 정렬'],['views','누적 조회'],['date','게시일'],['duration','영상 길이'],['daily','게시 후 일평균'],['selected','선택 금액'],['ad','광고수익'],['total','실제 총수익'],['profit','실제 순이익'],['grade','근거 등급'],['repeat','반복 성과 (%)'],['minutes','직접 작업시간'],['cost','실제 비용'],['trades','실제 거래'],['repeatTrades','반복 거래'],['hourly','시간당 이익'],['start','형식 시작 후 경과일'],['d7','쇼츠 D7'],['d30','롱폼 D30'],['median','동일 D30 중앙값'],['p25','동일 D30 하위 25%'],['hitRate','동일 D30 달성률'],['monthlyMin','완료월 최저'],['monthlyAvg','완료월 평균'],['score','사업 적합도'],['expansion','사업 확장 단계'],['pilotRevenue','내 예상 광고수익'],['pilotCash','내 현금 이익'],['pilotLabor','내 노동비 포함 이익']];
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
  const modelMeta=v=>({views_basis:'public',revenue_scope:'ad',observed_at:v.observations?.v?.verified===true?v.observations.v.observedAt:null,retrieved_at:v.retrievedAt||null});
  function metrics(v,r){
    const e=evidence(v), c=country(v,e), rawViews=num(v.v), extra=e.v3||{}, timing=modelMeta(v), asOf=new Date(Date.now()+32400000).toISOString().slice(0,10);
    const assumptions={sector:sector(v),country:cfg.country||c,fx:Number(cfg.fx),channel_id:cleanChannel(v)};const cal=core.models({...assumptions,...timing,views:rawViews});const basis=extra.revenueBasis||{};if(extra.rpmEvidence&&basis.verified===true&&basis.period_start&&basis.period_end&&basis.views_basis&&basis.revenue_scope&&source(basis.evidence_url)){const verified=core.models({...assumptions,...basis,views:num(basis.views),evidence:extra.rpmEvidence});cal.m1=verified.m1;cal.m2=verified.m2;}
    const act=extra.actual||{}, saneDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x, settle=act.verified===true&&act.kind==='settlement'&&act.currency==='KRW'&&saneDate(act.period_start)&&saneDate(act.period_end)&&act.period_start<=act.period_end&&source(act.evidence_url)&&['public','engaged','eligible_engaged'].includes(act.views_basis)&&num(act.amount)>=0&&num(act.amount)!=null&&['ad','platform','total'].includes(act.revenue_scope);
    const model=cfg.model==='actual'?{...timing,currency:'KRW',model_id:'actual',model_version:core.MODEL_VERSION,status:settle?'settlement':'unknown',...(settle?act:{})}:cal[cfg.model]||cal.legacy, idx=({1:0,2:1,4:2})[r]??1;
    const ad=cfg.model==='actual'?(settle&&act.revenue_scope==='ad'?act.amount:null):(!['m1','m2'].includes(cfg.model)||model.revenue_scope==='ad')?model.range?.[cfg.model==='legacy'?idx:Number(cfg.scenario)]??model.amount??null:null;
    const proofGrade=settle||cal.m1.grade==='A'?'A':cal.m2.grade==='B'?'B':cfg.model==='actual'?'U':model.grade, business=core.business({...extra.business,asOf,startedAt:extra.business?.startedAt||e.start,viewsGoal:Number(cfg.d30goal)||10000,minSample:Number(cfg.sample)||12,targetMoney:Number(cfg.monthlyGoal)||3000000,hitThreshold:Number(cfg.hitGoal)/100,q25Threshold:Number(cfg.q25Goal)/100,concentrationThreshold:Number(cfg.shareLimit)/100}), pilot=core.pilotProfit(extra.pilot||{});
    const hasTime=x=>typeof x==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x))&&Date.parse(x)<=Date.now();
    const valid=(a,d)=>a?.day===d&&a?.verified===true&&hasTime(a?.observed_at)&&source(a.evidence_url)&&Number.isInteger(a.views)&&a.views>=0?a.views:null;
    const d30=valid(extra.d30,30),d7=valid(extra.d7,7), start=startAge({start:extra.business?.startedAt||e.start});
    const profit=extra.pilot?.own===true&&source(extra.pilot?.evidence_url)?pilot.cashProfit??null:null,minutes=business.pilot?.medianMinutes??null;
    const result={ad,total:settle&&['total','platform'].includes(act.revenue_scope)?act.amount:null,profit,repeat:business.hitRate==null?null:business.hitRate*100,minutes,cost:extra.pilot?.own===true&&num(extra.pilot?.variableCost)!=null&&num(extra.pilot?.fixedCost)!=null?extra.pilot.variableCost+extra.pilot.fixedCost:null,trades:extra.business?.expansion?.paidTradeVerified===true?num(extra.business?.expansion?.trades):null,repeatTrades:extra.business?.expansion?.procedureVerified===true?num(extra.business?.expansion?.repeatTrades):null,hourly:profit==null?null:pilot.hourlyCashProfit??null,start,d7,d30,date:Number.isFinite(Date.parse(v.d))?Date.parse(v.d):null,views:rawViews,duration:num(v.s),daily:rawViews==null?null:rawViews/api.age(v),grade:gradeRank[proofGrade]??null,e:{...e,grade:proofGrade==='U'?null:proofGrade},country:c,model,business,score:business.score,median:business.median,p25:business.p25,hitRate:business.hitRate,monthlyMin:business.monthlyMin,monthlyAvg:business.monthlyAvg,expansion:business.components?.X??null,pilotRevenue:extra.pilot?.own===true?pilot.estimatedAdRevenue??null:null,pilotCash:profit,pilotLabor:profit==null?null:pilot.laborAdjustedProfit??null,timing,d30Waiting:d30==null&&api.age(v)<=30};
    result.selected=result[cfg.kind];
    const gradeOK=result.grade>=2;
    result.qualified=cfg.focus==='new'?start!=null&&start>=7&&start<=90&&d30!=null&&(business.repeat?.count??0)>=4:
      cfg.focus==='business'?gradeOK&&(business.pilot?.count??0)>=3&&[profit,result.hourly,result.cost,result.trades,result.repeatTrades,result.expansion].every(x=>x!=null):
      gradeOK&&result.score!=null&&business.steady===true&&(result.monthlyMin??0)>0&&(!cfg.focus||v.ai===true);
    result.qualified=result.qualified&&(cfg.focus==='new'||(business.repeat?.count??0)>=Math.max(12,Number(cfg.sample)||12)||cfg.focus==='business');
    return result;
  }
  function order(a,b,dir=cfg.dir){if(a==null)return b==null?0:1;if(b==null)return -1;return dir==='asc'?a-b:b-a;}
  function choose(rows,r,fallback){
    if(direct){qualifiedCount=0;researchCount=rows.length;picker?.pool(rows);return rows.slice().sort(fallback);}
    const pairs=rows.map(v=>[v,metrics(v,r)]).filter(([v,m])=>{
      if(cfg.list==='video'&&!db.video.some(x=>x.key===v.id)||cfg.list==='channel'&&!db.channel.some(x=>x.key===cleanChannel(v)))return false;
      if(cfg.ai==='yes'&&!v.ai||cfg.ai==='unknown'&&v.ai||cfg.grade==='U'&&m.grade!=null||cfg.grade&&cfg.grade!=='U'&&m.grade!==gradeRank[cfg.grade])return false;
      if(cfg.country&&m.country!==cfg.country)return false;
      if(cfg.window&&(m.start==null?cfg.group==='qualified':m.start<7||m.start>90))return false;
      if(cfg.target!==''&&!(m.selected!=null&&m.selected>=Number(cfg.target)))return false;
      return true;
    });
    const cmp=([a,x],[b,y])=>{
      if(cfg.metric){const first=order(x[cfg.metric],y[cfg.metric]);if(first)return first;}
      if(cfg.focus==='steady'){const first=Number(y.qualified)-Number(x.qualified)||order(x.grade,y.grade,'desc')||order(x.score,y.score,'desc')||order(x.monthlyMin,y.monthlyMin,'desc')||order(x.monthlyAvg,y.monthlyAvg,'desc')||order(x.start,y.start,'asc');if(first)return first;return a.id.localeCompare(b.id);}
      if(cfg.focus==='new'){const first=order(x.d30,y.d30,'desc');if(first)return first;}
      if(cfg.focus==='business'){const first=order(x.repeatTrades,y.repeatTrades,'desc')||order(x.trades,y.trades,'desc')||order(x.minutes,y.minutes,'asc')||order(x.cost,y.cost,'asc');if(first)return first;}
      return fallback(a,b);
    };
    pairs.sort(cmp);
    const seen=new Set();const picked=pairs.filter(([v])=>!cfg.one||!seen.has(cleanChannel(v))&&!!seen.add(cleanChannel(v)));qualifiedCount=picked.filter(p=>p[1].qualified).length;researchCount=picked.length-qualifiedCount;picker?.pool(pairs.filter(p=>cfg.group==='all'||p[1].qualified===(cfg.group==='qualified')).map(p=>p[0]));return picked.filter(p=>cfg.group==='all'||p[1].qualified===(cfg.group==='qualified')).map(p=>p[0]);
  }
  const formNode = `
  <div id="lf-presets" class="lf-row" aria-label="추천 조합">${presets.map(p=>`<button type="button" data-lf="preset" data-key="${p.id}" title="${esc(p.about)}" aria-pressed="false">${p.name}</button>`).join('')}</div>
  <p id="lf-hint" class="lf-hint"></p><p id="lf-counts" class="lf-hint" role="status"></p>
  <div class="lf-row" aria-label="저장 관리"><button type="button" data-lf="save">현재 조건 조합 저장</button><button type="button" data-lf="library" data-key="preset">저장 조합</button><button type="button" data-lf="library" data-key="video">영상 즐겨찾기</button><button type="button" data-lf="library" data-key="channel">채널 즐겨찾기</button><button type="button" data-lf="all">전체 검색</button><button type="button" data-lf="default">기본 조합으로</button><button type="button" data-lf="share">조건 링크 복사</button><button type="button" data-lf="shrink" aria-label="카드 축소" title="Ctrl+-">−</button><button type="button" data-lf="grow" aria-label="카드 확대" title="Ctrl++">+</button>${select('group','후보 구분',[['all','전체'],['qualified','근거 충족'],['research','조사 후보']],blue)}</div>
  <details id="lf-options"><summary>상세 조건 · 정렬 방향 · 금액 모델</summary><div class="lf-options">
  ${select('ai','AI 제작',[['','전체'],['yes','AI 확인'],['unknown','미확인']],purple)}
  ${select('grade','근거 등급',[['','전체'],['A','A · 직접 근거'],['B','B · 교차 근거'],['C','C · 제한적'],['U','미확인']],blue)}
  ${select('kind','금액 종류',[['ad','광고수익'],['total','실제 총수익'],['profit','실제 순이익']],green)}
  ${select('model','광고 계산 모형',[['legacy','기존 1,000 / 2,000 / 4,000 가정'],['actual','실제 정산액'],['m1','M1 · 동일 채널 실측'],['m2','M2 · 유사 채널 실측'],['m3','M3 · vidIQ 기준 가정'],['m4','M4 · N3 기준 가정'],['m5','M5 · P1 가정']],orange)}
  ${select('country','국가 / M3 시장',countryOptions)}<label>환율 (KRW/USD)<input type="number" id="lf-fx" min="1" step="any"></label><label class="${green}">목표금액 (KRW)<input type="number" id="lf-target" step="any"></label>
  ${select('metric','정렬 항목',values,'lf-red')}${select('dir','정렬 방향',[['desc','내림차순'],['asc','오름차순']],'lf-red')}
  ${select('scenario','모형 가정 범위',[['0','낮음'],['1','기준'],['2','높음']],orange)}<label>반복 D30 목표<input id="lf-d30goal" type="number" min="1"></label><label>반복 표본 최소 (12+) <input id="lf-sample" type="number" min="12"></label><label>목표 월수익 (KRW)<input id="lf-monthlyGoal" type="number" min="1"></label><label>목표 달성률 (%)<input id="lf-hitGoal" type="number" min="0" max="100"></label><label>하위25 / 중앙값 (%)<input id="lf-q25Goal" type="number" min="0" max="100"></label><label>최고작 비중 경고 (%)<input id="lf-shareLimit" type="number" min="0" max="100"></label><label class="lf-check"><input type="checkbox" id="lf-one">채널 대표 1개</label><label class="lf-check"><input type="checkbox" id="lf-window">형식 시작 7~90일</label></div>
  <p class="lf-hint">기존 광고수익 표시와 산식은 그대로입니다. 상세 금액의 M3는 시장·환율 가정, M4/M5는 비교용입니다. 국가 미입력 시 한국·일본 분류만 보조 사용하며 영어권을 미국으로 간주하지 않습니다. 미확인 값은 어느 정렬 방향에서도 마지막입니다.</p></details>
  <div id="lf-library" hidden></div><p id="lf-message" role="status" aria-live="polite" class="lf-hint"></p>`;
  root.innerHTML=formNode+'<details id="lf-selection"></details>';
  const picker=window.LFSelectionUI?.({...api,filters:()=>capture()});
  const controls=['q','days','vdays','sort','rpm','pagesize','cols','vmin','vmax','mmin','mmax','vfrom','vto'];
  const ext=['ai','grade','group','kind','model','country','fx','target','metric','dir','one','window','d30goal','sample','scenario','monthlyGoal','hitGoal','q25Goal','shareLimit'];
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
  function capture(){return {format:'longform',profile_id:'business-fit-v1',display:'grid',controls:Object.fromEntries(controls.map(id=>[id,$(id).value])),view:api.state.key,min:api.state.min,cfg:{...cfg}};}
  function apply(saved,{initial=false}={}){
    if(!initial){clearDirect();showPanel('board',panel!=='board');api.resetTrend();}
    if(!initial) $('q').value='';
    for(const [id,value] of Object.entries(saved.controls||{}))if(controls.includes(id))$(id).value=String(value);
    cfg={...base,...saved.cfg};api.clearChannel();api.state.min=Number(saved.min)||0;
    $('customDaysLabel').hidden=$('days').value!=='custom';document.documentElement.style.setProperty('--cols',$('cols').value||'5');
    refresh();api.select(saved.view||'all');
  }
  function readShare(raw){try{const x=JSON.parse(raw);if(x?.format==='longform'&&x.controls&&x.cfg)return x;}catch{}return null;}
  function applyDefault(){const item=db.home&&db[db.home.type]?.find(x=>x.key===db.home.key);if(item)applyEntry(db.home.type,item);else applyPreset(presets[0]);}
  function defaults(){return {q:'',days:'all',vdays:'27',sort:'views',rpm:'2',pagesize:'100',cols:'5',vmin:'',vmax:'',mmin:'',mmax:'',vfrom:'',vto:''};}
  function applyPreset(p){active=p.id;apply({controls:{...defaults(),...p.controls},cfg:p.cfg});}
  function applyEntry(type,item){active='';if(type==='preset'){active=item.value?.cfg?.focus||'';apply(item.value);return;}apply({controls:{...defaults(),q:type==='video'?item.key:''},cfg:{list:type==='channel'?'channel':''},view:'all'});if(type==='channel')api.findChannel(item.channel||item.name);}
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
    const comparisons=cfg.focus==='new'?[['시작 경과',m.start,orange],['쇼츠 D7',m.d7,blue],['롱폼 D30',m.d30,blue]]:cfg.focus==='business'?[['작업 분',m.minutes,purple],['비용',m.cost,green],['실제 거래',m.trades,blue],['반복 거래',m.repeatTrades,blue],['내 예상 광고',m.pilotRevenue,green],['내 현금 이익',m.pilotCash,green],['내 노동비 포함',m.pilotLabor,green],['시간당 이익',m.hourly,green]]:cfg.focus==='steady'?[['반복 %',m.repeat,blue],['작업 분',m.minutes,purple]]:[];
    if(cfg.focus==='steady')comparisons.push(['D30 중앙값',m.median,blue],['D30 하위 25%',m.p25,blue],['동일 D30 표본',m.business.repeat.count,blue]);
    if(m.business.concentrationWarning&&cfg.focus==='steady')comparisons.push(['최고작 비중',m.business.concentration*100,orange]);
    const more=(cfg.focus||cfg.metric||cfg.model!=='legacy'||cfg.kind!=='ad')?`<div class="lf-labels"><span class="${m.selected==null?gray:green}">${cfg.kind==='profit'?'실제 순이익':cfg.kind==='total'?'실제 총수익':cfg.model==='actual'?'실제 광고':'광고 추정'} ${won(m.selected)}</span>${comparisons.map(([k,n,cls])=>`<span class="${n==null?gray:cls}">${k} ${['비용','시간당 이익'].includes(k)?won(n):shortNum(n)}</span>`).join('')}</div>`:'';
    return `<div class="lf-labels"><span class="${m.qualified?blue:orange}">${m.qualified?'근거 충족':'조사 후보'}</span><span class="${m.grade?blue:gray}" title="${esc(m.model?.status||'')}">${m.e.grade?esc(m.e.grade)+' 근거':'U · 근거 미확인'}</span>${v.ai?'<span class="lf-purple">AI 제작</span>':''}${source(m.e.source)?`<a class="lf-blue" href="${esc(source(m.e.source))}" target="_blank" rel="noopener noreferrer">출처</a>`:''}</div>${cfg.focus==='new'?'<span class="lf-orange">장기 검증 전</span>':''}${more}${cfg.focus==='steady'?`<small class="lf-gray">근거 ${m.business.confirmed}/6 · ${m.monthlyMin===0?'최저 월 0 · 지속 수익 미충족':m.business.score==null?'점수 미산정':''}</small>`:''}<div class="lf-actions">${button('fav-video',v.id,'영상 저장',db.video.some(x=>x.key===v.id))}${button('fav-channel',v.id,'채널 저장',db.channel.some(x=>x.key===ch))}${button('evidence',v.id,'검증 근거')}${cfg.one?button('channel-more',v.id,'이 채널 더보기'):''}${picker?.button(v)||''}</div>`;
  }
  function evidenceDialog(v){
    const e=evidence(v), d=$('lf-evidence-dialog'), form=d.querySelector('form');$('lf-evidence-title').textContent=v.t;
    $('lf-evidence-fields').innerHTML=fields.map(([k,t,kind])=>kind==='grade'?select('ev-'+k,t,[['','미확인'],['A','A · 직접 근거'],['B','B · 교차 근거'],['C','C · 제한적']],blue):kind==='country'?select('ev-'+k,t,countryOptions):`<label>${t}<input id="lf-ev-${k}" type="${kind==='signed'?'number':kind}" ${kind==='number'?'min="0" ':''}${['number','signed'].includes(kind)?'step="any"':''}></label>`).join('');
    const info=metrics(v,Number($('rpm').value));const metaModel=info.model||{};const metadata=Object.fromEntries(['currency','revenue_scope','period_start','period_end','views_basis','model_id','model_version','country_assumption','fx_assumption','evidence_url','observed_at','retrieved_at','sample_size','selection_rule','dispersion','status','reason'].map(k=>[k,metaModel[k]??null]));
    $('lf-evidence-fields').insertAdjacentHTML('beforeend','<details style="grid-column:1/-1"><summary>선택한 수익 모형 · 기간 · 출처</summary><pre style="white-space:pre-wrap">'+esc(JSON.stringify(metadata,null,2))+'</pre></details>');
    $('lf-evidence-fields').insertAdjacentHTML('beforeend', '<label style="grid-column:1/-1">검증 자료 JSON (모형·완료월·D30·직접 파일럿·독립 비교군·거래)<textarea id="lf-v3-input" rows="6" spellcheck="false" placeholder="빈칸 = 미확인"></textarea></label><p class="lf-hint" style="grid-column:1/-1"><a href="workspace-handoff.md" target="_blank" rel="noopener">입력 계약</a> · 사용자 입력 근거만 사용. 기존 V2 점수와 별개이며 성공확률이 아닙니다.</p><output id="lf-v3-result" style="grid-column:1/-1"></output>');
    const box=$('lf-v3-input');box.value=e.v3?JSON.stringify(e.v3,null,2):'';const preview=()=>{try{const v3=box.value.trim()?JSON.parse(box.value):{};const b=core.business({...v3.business,asOf:new Date(Date.now()+32400000).toISOString().slice(0,10),startedAt:v3.business?.startedAt||$('lf-ev-start').value,viewsGoal:Number(cfg.d30goal)||10000,minSample:Number(cfg.sample)||12,targetMoney:Number(cfg.monthlyGoal)||3000000,hitThreshold:Number(cfg.hitGoal)/100,q25Threshold:Number(cfg.q25Goal)/100,concentrationThreshold:Number(cfg.shareLimit)/100});$('lf-v3-result').textContent='business-fit-v1: '+(b.score==null?'미산정 · '+(b.missing||[]).join(', '):shortNum(b.score)+'점')+' · 완료월 최저 '+won(b.monthlyMin)+' · 월평균 '+won(b.monthlyAvg);}catch{$('lf-v3-result').textContent='JSON 형식을 확인하세요.';}};box.addEventListener('input',preview);
    for(const [key] of fields)$('lf-ev-'+key).value=e[key]??'';preview();
    d.showModal();form.onsubmit=ev=>{if(ev.submitter?.value==='cancel')return;ev.preventDefault();const next={};for(const [key,,kind] of fields){const x=$('lf-ev-'+key), raw=x.value.trim();if(raw!=='')next[key]=['number','signed'].includes(kind)?x.valueAsNumber:raw;}
      const msg=$('lf-evidence-status');if(!source(next.source)){msg.textContent='검증에 사용한 http(s) 출처 URL을 입력하세요.';return;}
      if(next.repeat>100||next.repeatTrades>next.trades){msg.textContent='반복 성과는 0~100%, 반복 거래는 실제 거래 건수 이하여야 합니다.';return;}
      try{if(box.value.trim()){const obj=JSON.parse(box.value);if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error();next.v3=obj;}}catch{msg.textContent='검증 자료는 JSON 객체로 입력하세요.';return;}
      msg.textContent='';db.evidence[v.id]=next;store();d.close();api.render();if(!storageError)message('검증 근거를 이 브라우저에 저장했습니다.');};
  }
  function density(delta){const cols=$('cols');const n=Math.min(6,Math.max(3,Number(cols.value||5)+delta));cols.value=String(n);cols.dispatchEvent(new Event('change'));}
  document.addEventListener('keydown',e=>{if(panel!=='board'||!(e.ctrlKey||e.metaKey)||e.altKey||e.target.closest?.('input,textarea,select,[contenteditable],dialog'))return;if(['-','_','+','='].includes(e.key)){e.preventDefault();density(e.key==='-'||e.key==='_'?1:-1);}});
  root.addEventListener('change',event=>{const id=event.target.id.slice(3);if(!ext.includes(id))return;clearDirect();if(id==='ai')active='';const control=event.target;cfg[id]=control.type==='checkbox'?control.checked:control.value;api.state.pg=1;refresh();api.render();});
  document.addEventListener('click',ev=>{
    const rlink=ev.target.closest('#lf-repro-link');if(rlink&&!ev.ctrlKey&&!ev.metaKey&&!ev.shiftKey&&!ev.altKey){ev.preventDefault();showPanel(panel==='reproduction'?'board':'reproduction');window.scrollTo(0,0);return;}
    if(ev.target.closest('[data-section],#jumpTrend')&&panel==='reproduction')showPanel('board');
    const b=ev.target.closest('[data-lf]');if(!b)return;const action=b.dataset.lf,k=b.dataset.key,index=Number(b.dataset.idx);
    if(action==='preset'){applyPreset(presets.find(p=>p.id===k));return;}
    if(action==='all'){active='';apply({controls:defaults(),cfg:base});return;}
    if(action==='default'){applyDefault();return;}
    if(action==='share'){const scope=capture();if(scope.cfg.list){message('즐겨찾기 목록은 기기 간 공유되지 않습니다.');return;}const u=new URL(location.href);u.search='';u.searchParams.set('lf',JSON.stringify(scope));if(scope.controls.q&&!scope.cfg.focus&&/^[\w-]{11}$/.test(scope.controls.q))u.searchParams.set('q',scope.controls.q);navigator.clipboard?.writeText(u.href).then(()=>message('조건 링크를 복사했습니다.'),()=>nameDialog('조건 링크',u.href,()=>{}));return;}
    if(action==='shrink'||action==='grow'){density(action==='shrink'?1:-1);return;}
    if(action==='save'){const saved=capture();nameDialog('조건 조합 이름',presets.find(p=>p.id===active)?.name||'내 조건 조합',name=>{db.preset.push({key:crypto.randomUUID?.()||String(Date.now()),name,value:saved});library='preset';store();drawLibrary();});return;}
    if(action==='library'){library=library===k?'':k;drawLibrary();return;}
    if(action==='close-library'){library='';drawLibrary();return;}
    if(action==='browse-library'){if(library==='preset'){message('저장한 이름을 선택하면 조건을 적용합니다.');return;}active='';apply({controls:defaults(),cfg:{list:library}});return;}
    if(action==='clear-home'){db.home=null;store();drawLibrary();return;}
    if(action==='channel-more'){const v=api.get(k);if(v){active='';apply({controls:defaults(),cfg:{}});api.findChannel(v.ch);message('채널의 전체 조사 영상을 표시합니다.');}return;}
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
    else if(!direct&&includesParam('lf')){const shared=readShare(params.searchParams.get('lf'));if(shared){apply(shared,{initial:true});message('공유 주소 조건 적용 중입니다.');}}
    else if(!explicit)applyDefault();
    if(!direct&&params.searchParams.get('panel')==='reproduction')showPanel('reproduction',false,params.searchParams.get('section')||'');
    refresh();
  }
  return {prepare,choose,card,counts(all){$('lf-counts').textContent='전체 '+all.toLocaleString('ko-KR')+'편 · 근거 충족 '+qualifiedCount.toLocaleString('ko-KR')+'편 · 조사 후보 '+researchCount.toLocaleString('ko-KR')+'편';},direct:()=>direct,normalSearch(){clearDirect();refresh();},legacyReset(){active='';cfg={...base};clearDirect();refresh();}};
};
