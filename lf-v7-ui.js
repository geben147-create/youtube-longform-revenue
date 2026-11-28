/* V7 panel: seed channel deep dive, new-channel ranking, sector queries and pilot tracker. Reads lf-v7.json lazily. */
'use strict';
window.LFV7UI = {
  mount(api) {
    const root = document.getElementById('lf-v7');
    if (!root || root.dataset.ready) return null;
    root.dataset.ready = '1';
    const esc = api.esc, n = x => x == null ? '미확인' : Math.round(x).toLocaleString('ko-KR'), pct = x => x == null ? '미확인' : (Math.trunc(x * 1000) / 10) + '%';
    const STORE = 'lf-v7:pilot:v1';
    const TABS = [['seed', '핵심 채널 15편'], ['rank', '신생 채널 순위'], ['sector', '섹터·검색어'], ['pilot', 'A/B 파일럿 비교'], ['top20', 'V8 TOP 20'], ['v8pl', '재생목록 92편'], ['mkt', 'KR·JP·US 비교'], ['v9th', 'V9 일본뽕 썸네일·제목'], ['v9cat', 'V9 5분야 KR·JP·US'], ['notes', '근거·한계']];
    let v9 = null, v8 = null, v8sort = 'net', data = null, tab = 'seed', sort = 'meanEx2', sector = '', loading = false, pilot = {};
    try { pilot = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { pilot = {}; }
    root.innerHTML = '<summary>🔥 V7 신생 고수익 · 일본 국뽕 감동사연·AI 드라마</summary><div data-body><p class="lf-hint">열면 V7 조사 자료를 불러옵니다. 실제 수익이 아니라 공개 조회 기반 관찰과 가정입니다.</p></div>';
    const body = root.querySelector('[data-body]');
    const SORTS = { meanEx2: ['최고 2편 제외 평균', c => c.stats?.meanExTop2], median: ['중앙값', c => c.stats?.median], rate100k: ['10만 조회 달성률', c => c.stats?.rate100k], subsAsc: ['구독자 적은 순', c => c.subs == null ? null : -c.subs], newest: ['개설 최신순', c => c.joined ? Date.parse(c.joined) : null], x: ['구독자 대비 중앙값', c => c.subs > 0 && c.stats?.median != null ? c.stats.median / c.subs : null] };
    const link = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`;
    function seed() {
      const s = data.seed, c = s.channel, st = s.channel.stats || {};
      const vids = s.videos.slice().sort((a, b) => b.views - a.views), top = new Set((s.comparison?.top6 || []).map(x => x.id || x)), low = new Set((s.comparison?.bottom5 || []).map(x => x.id || x));
      return `<div class="lf-card-mini"><strong>${link(c.url, c.name)}</strong> · 구독자 ${n(c.subs)}${c.subsPrecision ? ' ≈' : ''} · 개설 ${esc(c.joined || '미확인')} · 공개 영상 ${n(c.totalVideos)} · 채널 누적 조회 ${n(c.totalViews)}<br>영상 ${n(st.n)}편 · 평균 ${n(st.mean)} · 중앙값 ${n(st.median)} · 최고 2편 제외 평균 ${n(st.meanExTop2)} · 최고 2편 비중 ${pct(st.top2Share)} · 10만↑ ${pct(st.rate100k)} · 20만↑ ${pct(st.rate200k)} · 평균 길이 ${n((st.avgDurationSec || 0) / 60)}분<br><small>최근 7일 증가 조회는 이전 스냅샷이 없어 계산하지 않았습니다. 이 화면의 조회수가 기준 스냅샷(${esc(s.retrievedAt || '')})입니다.</small></div>
      <div class="lf-table-wrap"><table><thead><tr><th></th><th>영상</th><th>조회</th><th>게시</th><th>길이</th><th>자막</th><th>AI·창작 표시</th></tr></thead><tbody>${vids.map(v => `<tr><td>${top.has(v.id) ? '상위' : low.has(v.id) ? '하위' : ''}</td><th><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" width="96" height="54" loading="lazy" referrerpolicy="no-referrer"></a> ${esc(v.title)}${v.titleKo ? `<br><small>${esc(v.titleKo)} (어시스턴트 번역)</small>` : ''}</th><td>${n(v.views)}</td><td>${esc((v.publishedAt || '').slice(0, 10))}</td><td>${n((v.durationSec || 0) / 60)}분</td><td>${esc(v.transcript || '미확인')}</td><td>${esc(v.disclosure || '표시 미확인')}</td></tr>`).join('')}</tbody></table></div>
      ${(s.comparison?.observations || []).length ? `<div class="lf-card-mini"><strong>상위 6편 vs 하위 5편 관찰 (원인 단정 아님)</strong><ul>${s.comparison.observations.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}`;
    }
    function rank() {
      const f = SORTS[sort][1];
      const rows = data.channels.filter(c => !sector || (c.sectors || []).includes(sector)).slice().sort((a, b) => { const x = f(a), y = f(b); return x == null ? (y == null ? 0 : 1) : y == null ? -1 : y - x; });
      return `<div class="lf-row"><label>정렬 <select data-v7="sort">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label><label>섹터 <select data-v7="sector"><option value="">전체</option>${data.sectors.map(s => `<option ${sector === s.name ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label><span>${rows.length}채널 · 신규 ${data.channels.filter(c => !c.known).length}</span></div>
      <p class="lf-hint">저품질 후보로 수량을 채우지 않았습니다. 중앙값·평균은 채널 최신 업로드 표본(최대 30편)이며 시장 전체가 아닙니다. 외부 추정·실제 수익은 구분해 표시합니다.</p><div class="lf-table-wrap"><table><thead><tr><th>채널</th><th>제작 방식</th><th>구독자</th><th>개설</th><th>영상 수</th><th>중앙값</th><th>최고2 제외 평균</th><th>10만↑</th><th>최고2 비중</th><th>길이대</th><th>창작·AI 표시</th></tr></thead><tbody>${rows.map(c => `<tr><th>${link(c.url, c.name)}${c.known ? ' <small>(기존 채널)</small>' : ''}</th><td>${esc(({ on_camera: '출연형', narration: '나레이션', narration_only: '나레이션', ai: 'AI', ai_generated: 'AI', material_mix: '자료 조합' })[c.appearance] || '미확인')}</td><td>${n(c.subs)}</td><td>${esc(c.joined || '미확인')}</td><td>${n(c.totalVideos)}</td><td>${n(c.stats?.median)}</td><td>${n(c.stats?.meanExTop2)}</td><td>${pct(c.stats?.rate100k)}</td><td>${pct(c.stats?.top2Share)}</td><td>${esc(c.lengthBucket || '미확인')}</td><td>${esc(c.disclosure || '표시 미확인')}</td></tr>`).join('')}</tbody></table></div><details><summary>탐색 후보 ${n((data.candidates||[]).length)}곳 · 품질 기준 미달(표본 5편 미만 또는 중앙값 1,000회 미만) — 순위 제외, 참고용</summary><ul>${(data.candidates||[]).map(c=>`<li>${link(c.url||'#',c.name)} · 구독자 ${n(c.subs)} · 표본 ${n(c.sampleN)}편 · 중앙값 ${n(c.median)}</li>`).join('')}</ul></details><p class="lf-hint">신규 순위 대상: 일본어 ${data.marketCounts.JP}곳 · 한국어 ${data.marketCounts.KR}곳 · 영어 ${data.marketCounts.EN}곳. 한국·영어권 후보는 성과 기준을 넘는 채널이 아직 없습니다.</p>`;
    }
    function sectors() {
      return `<div class="lf-table-wrap"><table><thead><tr><th>#</th><th>섹터</th><th>일본어 검색어</th><th>발견 채널</th><th>신규</th></tr></thead><tbody>${data.sectors.map((s, i) => `<tr><td>${i + 1}</td><th>${esc(s.name)}</th><td>${esc(s.query)}</td><td>${n(s.channels)}</td><td>${n(s.newChannels)}</td></tr>`).join('')}</tbody></table></div><p class="lf-hint">검색어는 추가 탐색용입니다. 국뽕 단독 검색으로는 감동 사연·낭독·AI 스토리텔링이 누락될 수 있어 교차 검색했습니다.</p>`;
    }
    function pilotTab() {
      const fields = [['hours', '제작 시간(시간)'], ['cost', '제작비(원)'], ['d7', '7일 조회'], ['d30', '30일 조회'], ['retention', '평균 시청 유지율(%)'], ['rpm', '실제 RPM(원)']];
      const types = [['A', 'A. 기존 사실 기반 국뽕 (50편 아웃라인 유지, 우선 1편)'], ['B', 'B. 신규 AI 감동 드라마 (독창 창작 사연, 30~40분, 우선 3편)']];
      return `<p class="lf-hint">직접 측정한 값만 입력하세요. 이 브라우저에만 저장되고 자동 계산 값은 미입력 시 미산정입니다. 허구는 창작으로 표시하고 실제 해외 반응으로 위장하거나 타 채널 대본을 복제하지 않습니다.</p><table><thead><tr><th>유형</th>${fields.map(([, t]) => `<th>${t}</th>`).join('')}<th>시간당 순이익 (RPM×30일 조회−비용)÷시간</th></tr></thead><tbody>${types.map(([k, t]) => { const p = pilot[k] || {}; const hrs = Number(p.hours), rev = Number(p.d30) * Number(p.rpm) / 1000, net = Number(p.cost) >= 0 && hrs > 0 && Number.isFinite(rev) ? (rev - Number(p.cost)) / hrs : null; return `<tr><th>${esc(t)}</th>${fields.map(([f]) => `<td><input data-v7-pilot="${k}.${f}" type="number" min="0" value="${esc(p[f] ?? '')}" style="width:96px"></td>`).join('')}<td>${p.rpm && p.d30 && p.hours && p.cost !== undefined && p.cost !== '' ? n(net) + '원/시간' : '미산정'}</td></tr>`; }).join('')}</tbody></table>`;
    }
    const W = x => x == null ? '미확인' : Math.trunc(x).toLocaleString('ko-KR');
    const TY = { ai: 'AI 표기', doc: '자료 조합', cam: '출연', unknown: '미확인' };
    function top20() {
      if (!v8) return '<p>V8 자료 불러오는 중…</p>';
      const K = { net: r => r.netMonthlyKRW[1], growth: r => r.growthPerDay, ease: r => r.ease * 1e9 + r.netMonthlyKRW[1] };
      const rows = v8.top20.map(id => v8.rows.find(r => r.id === id)).sort((a, b) => { const x = K[v8sort](a), y = K[v8sort](b); return x == null ? 1 : y == null ? -1 : y - x; });
      return '<div class="lf-row"><label>정렬 <select data-v7="v8sort"><option value="net"' + (v8sort === 'net' ? ' selected' : '') + '>예상 순이익순(중)</option><option value="growth"' + (v8sort === 'growth' ? ' selected' : '') + '>신생 채널 성장률순(일평균 조회)</option><option value="ease"' + (v8sort === 'ease' ? ' selected' : '') + '>제작 용이성순</option></select></label></div><p class="lf-hint">월수익=중앙값×월 8편×RPM 1,000/2,000/4,000원 시나리오(가정). 실제 수익 증빙 없음. 제작비·시간은 가정값. 진입형=신규/소형 채널, 벤치마크=대형 기성(진입 보장 아님).</p><div class="lf-table-wrap"><table><thead><tr><th>#</th><th>채널</th><th>구분</th><th>시장</th><th>구독자</th><th>개설</th><th>중앙값</th><th>편당 하/중/상</th><th>월 순이익 하/중/상(원)</th><th>누적 하/중/상(원)</th><th>일평균 조회</th><th>제작</th><th>제작비·시간</th></tr></thead><tbody>' + rows.map((r, i) => '<tr><td>' + (i + 1) + '</td><th>' + link(r.url, r.name) + '</th><td>' + (r.tier === 'entry' ? '진입형' : '벤치마크') + '</td><td>' + esc(r.market || '미확인') + '</td><td>' + W(r.subs) + '</td><td>' + esc(r.joined || '미확인') + '</td><td>' + W(r.median) + '</td><td>' + r.perVideoKRW.map(W).join('/') + '</td><td>' + r.netMonthlyKRW.map(W).join('/') + '</td><td>' + (r.cumulativeRevenueKRW || []).map(W).join('/') + '</td><td>' + W(r.growthPerDay) + '</td><td>' + TY[r.production] + '</td><td>' + W(r.costPerVideo) + '원·' + r.hoursPerVideo + 'h</td></tr>').join('') + '</tbody></table></div>';
    }
    function v8pl() {
      if (!v8) return '<p>불러오는 중…</p>';
      const p = v8.playlist;
      return '<p>재생목록 ' + esc(p.title) + ' · 표시 ' + p.videosVisible + '편(비공개·삭제 ' + p.hiddenUnavailable + '편 숨김) · 채널 ' + p.channels.length + '곳. 조회수는 목록 표시값(반올림). 월수익은 채널 30일 조회 데이터가 없어 산정하지 않았습니다.</p><div class="lf-table-wrap"><table><thead><tr><th>채널</th><th>편수</th><th>누적 조회</th><th>편당 하/중/상(원)</th><th>누적 하/중/상(원)</th></tr></thead><tbody>' + p.channels.map(c => '<tr><th>' + esc(c.ch) + '</th><td>' + c.n + '</td><td>' + W(c.views) + '</td><td>' + c.perVideoKRW.map(W).join('/') + '</td><td>' + c.cumulativeRevenueKRW.map(W).join('/') + '</td></tr>').join('') + '</tbody></table></div><details><summary>영상 92편</summary><ul>' + p.rows.map(r => '<li><a href="https://www.youtube.com/watch?v=' + esc(r.id) + '" target="_blank" rel="noopener noreferrer">' + esc(r.title) + '</a> · ' + esc(r.ch) + ' · ' + esc(r.viewsText) + '</li>').join('') + '</ul></details>';
    }
    function mkt() {
      if (!v8) return '<p>불러오는 중…</p>';
      return '<div class="lf-table-wrap"><table><thead><tr><th>시장</th><th>RPM 계수(가정)</th><th>조사 채널</th><th>중앙값의 중앙값</th><th>경쟁</th><th>제작비·시간</th><th>저작권 위험</th></tr></thead><tbody>' + v8.markets.map(m => '<tr><th>' + esc(m.name) + '</th><td>' + m.rpmCoefficient + '</td><td>' + m.channels + '</td><td>' + W(m.medianOfMedians) + '</td><td>' + esc(m.competitionNote) + '</td><td>' + esc(m.cost) + '<br>' + esc(m.hours) + '</td><td>' + esc(m.copyrightRisk) + '</td></tr>').join('') + '</tbody></table></div><p class="lf-hint">미국 표본은 3곳뿐이라 비교 신뢰도가 낮습니다. 제목·썸네일·훅 분석은 V7 15편 심층과 설명란 기반 표기만 근거가 있고, V8 신규 채널의 훅·썸네일은 미확인입니다.</p>';
    }
    function v9th() {
      if (!v9) return '<p>불러오는 중…</p>';
      const t = v9.thumbs, ag = JSON.stringify(t.aggregates);
      return '<p class="lf-hint">' + esc((t.caveats || []).join(' · ')) + '</p><div class="lf-card-mini"><strong>집계(18개 기록)</strong><br><small>' + esc(ag) + '</small></div><div class="lf-card-mini"><strong>범용 제작 규칙 (상관관계, 인과 아님)</strong><ol>' + t.rules.map(r => '<li>' + esc(typeof r === 'string' ? r : JSON.stringify(r)) + '</li>').join('') + '</ol></div><div class="lf-table-wrap"><table><thead><tr><th>#</th><th>영상(원문 제목)</th><th>조회</th><th>예상 하/중/상(원, 가정)</th><th>메인 문구 원문 / 번역</th><th>보조 문구 원문 / 번역</th><th>놀란 얼굴</th><th>인물</th><th>배치·표정</th><th>색상</th><th>VS</th><th>충격</th><th>여백</th></tr></thead><tbody>' + t.records.map(r => { const h = r.thumb || {}; return '<tr><td>' + r.rank + '</td><th><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer"><img src="https://i.ytimg.com/vi/' + esc(r.videoId) + '/mqdefault.jpg" alt="" width="96" height="54" loading="lazy" referrerpolicy="no-referrer"></a> ' + esc(r.title) + '<br><small>' + esc(r.channel) + ' · ' + esc((r.viewsRetrievedAt || '').slice(0, 10)) + '</small></th><td>' + W(r.views) + '</td><td>' + [r.est_revenue_KRW_assumed.rpm1000, r.est_revenue_KRW_assumed.rpm2000, r.est_revenue_KRW_assumed.rpm4000].map(W).join('/') + '</td><td>' + esc(h.mainText || '문구 없음') + '<br><small>' + esc(h.mainText_ko_translation || '') + ' (번역)</small></td><td>' + esc((h.subTexts || []).join(' / ') || '없음') + '<br><small>' + esc((h.subTexts_ko_translation || []).join(' / ')) + '</small></td><td>' + esc(h.surprisedFace ?? '미확인') + '</td><td>' + esc(h.peopleCount ?? '미확인') + '</td><td>' + esc((h.layout || '') + ' / ' + (h.expression || '')) + '</td><td>' + esc((h.mainColors || []).join(',')) + '</td><td>' + (h.vsComposition ? 'VS' : '-') + '</td><td>' + esc(h.shockElement || '-') + '</td><td>' + esc(h.whitespace || '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    function v9cat() {
      if (!v9) return '<p>불러오는 중…</p>';
      return '<p class="lf-hint">' + esc(v9.assumptions) + '</p><div class="lf-table-wrap"><table><thead><tr><th>#</th><th>분야</th><th>시장</th><th>채널 중앙값의 중앙값</th><th>월수익 하/중/상(원)</th><th>제작비·시간</th><th>월 순이익 하/중/상(원)</th><th>경쟁(1-5)</th><th>저작권 위험</th><th>채널(중앙값)</th></tr></thead><tbody>' + v9.cells.map((c, i) => '<tr><td>' + (i + 1) + '</td><th>' + esc(c.category) + '</th><td>' + c.market + '</td><td>' + W(c.medianOfMedians) + '</td><td>' + (c.monthlyKRW || []).map(W).join('/') + '</td><td>' + W(c.costPerVideo) + '원·' + c.hoursPerVideo + 'h</td><td>' + (c.netMonthlyKRW || []).map(W).join('/') + '</td><td>' + c.competition + '</td><td>' + esc(c.copyright) + '</td><td>' + c.channels.map(x => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.name) + '</a> ' + W(x.median)).join('<br>') + '</td></tr>').join('') + '</tbody></table></div><p class="lf-hint">신생 채널 성장률: 개설일을 확인하지 못해 모든 칸 미산정. 대형 방송사·언론 채널이 섞여 있어 진입 가능성과 다릅니다.</p>';
    }
    async function loadV9() { if (v9) return; try { v9 = await (await fetch('lf-v9.json')).json(); render(); } catch { /* optional */ } }
    async function loadV8() { if (v8) return; try { v8 = await (await fetch('lf-v8.json')).json(); render(); } catch { /* optional */ } }
    function notes() {
      return `<p>${esc(data.excludedNote || '')} (${n(data.excludedCount)}곳)</p><ul>${(data.limits || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul><p>기존 일본 50편 아웃라인은 변경하지 않았고 이 자료는 별도 사업 유형 비교용입니다.</p>`;
    }
    function render() {
      if (!data) return;
      const head = `<div class="lf-row" role="tablist">${TABS.map(([k, t]) => `<button type="button" role="tab" data-v7="tab" data-tab="${k}" aria-selected="${tab === k}" aria-pressed="${tab === k}">${t}</button>`).join('')}</div><p class="lf-hint">조사 기준 ${esc(data.asOf)} · ${esc(data.scope || '')}</p>`;
      body.innerHTML = head + ({ seed, rank, sector: sectors, pilot: pilotTab, top20, v8pl, mkt, v9th, v9cat, notes })[tab]();
    }
    async function load() {
      if (data || loading) return; loading = true;
      try { const r = await fetch('lf-v7.json'); if (!r.ok) throw Error(r.status); data = await r.json(); render(); }
      catch { loading = false; body.innerHTML = '<p>V7 자료를 읽지 못했습니다. 기존 갤러리는 영향을 받지 않습니다.</p>'; }
    }
    root.addEventListener('toggle', () => { if (root.open) load(); });
    root.addEventListener('click', e => { const b = e.target.closest('[data-v7=tab]'); if (b) { tab = b.dataset.tab; if (/top20|v8pl|mkt/.test(tab)) loadV8(); if (/v9/.test(tab)) loadV9(); render(); } });
    root.addEventListener('change', e => { const t = e.target, v = t.dataset.v7, p = t.dataset.v7Pilot; if (v === 'v8sort') v8sort = t.value; else if (v === 'sort') sort = t.value; else if (v === 'sector') sector = t.value; else if (p) { const [k, f] = p.split('.'); pilot[k] = { ...(pilot[k] || {}), [f]: t.value }; try { localStorage.setItem(STORE, JSON.stringify(pilot)); } catch { /* optional */ } } else return; render(); });
    return { open(k) { if (k) tab = k; if (/v9/.test(tab)) loadV9(); if (/top20|v8pl|mkt/.test(tab)) loadV8(); root.open = true; load(); render(); root.scrollIntoView({ block: 'nearest' }); } };
  }
};
