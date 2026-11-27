/* Research lab panel. Reads lf-v5-lab.json only when opened; never changes the gallery data or formulas. */
'use strict';
window.LFLabUI = {
  mount(api) {
    const root = document.getElementById('lf-lab');
    if (!root || root.dataset.ready) return null;
    root.dataset.ready = '1';
    const esc = api.esc, n = x => x == null ? '미확인' : Math.round(x).toLocaleString('ko-KR'), x2 = x => x == null ? '미확인' : 'X' + (Math.trunc(x * 100) / 100);
    const pct = x => x == null ? '미확인' : (Math.trunc(x * 1000) / 10) + '%';
    const TABS = [['status', '⚫ 수집 현황'], ['jp', '🔴 일본 국뽕'], ['kr', '🔴 한국 국뽕'], ['senior', '🟠 시니어'], ['animal', '🟡 고양이·동물'], ['aimovie', '🟣 AI 영화'], ['history', '🟢 일본 역사'], ['hook', '🔵 초반 3분 훅'], ['title', '🟤 제목·썸네일'], ['strategy', '💎 전략 비교']];
    const CAT = { jp: c => c.category.startsWith('일본 국뽕'), kr: c => /^한국 국뽕|^1/.test(c.category), senior: c => c.category.startsWith('2'), animal: c => c.category.startsWith('3'), aimovie: c => c.category.startsWith('4'), history: c => c.category.startsWith('5') };
    const AP = { on_camera: '출연형', narration_only: '나레이션', ai_generated: 'AI 생성(추정)', material_mix: '자료 조합', unknown: '미확인' };
    const SORTS = { medianViews: ['채널 중앙값 조회', c => c.medianViews], xsub: ['구독자 대비 X', c => c.viewsPerSubscriberMedian], repeat: ['반복 성공(최고작 비중 낮은 순)', c => c.topShare == null ? null : -c.topShare], vendor: ['외부 추정 수익(실측 아님)', c => c.revenue?.vendorEstimate?.longformKrw30d] };
    let data = null, tab = 'status', sort = 'medianViews', noHost = false, small = false, openId = null, tag = '', hookOpen = null, loading = false;
    root.innerHTML = '<summary>수익 벤치마킹 연구소 · 국뽕·시니어·동물·AI 영화 (출처·확인 상태 표시)</summary><div data-body><p class="lf-hint">열면 연구 데이터를 불러옵니다. 자막 전문은 이 공개 데이터에 없고, 외부 추정 수익은 실제 정산액이 아닙니다.</p></div>';
    const body = root.querySelector('[data-body]');
    const ratesRow = (label, a, b) => `<tr><th>${label}</th><td>${a}</td><td>${b}</td></tr>`;
    function status() {
      const s = data.status, t = s.transcripts, sn = s.sns;
      return `<div class="lf-card-mini"><strong>수집 현황</strong> <small>${esc(s.asOf)}</small><table><thead><tr><th>항목</th><th>수</th><th>비율/비고</th></tr></thead><tbody>
      ${ratesRow('조사 채널', n(s.channels.total), `일본 ${s.channels.jp} / 한국 ${s.channels.kr}`)}
      ${ratesRow('영상 표본(인기+저성과)', n(s.videos.total), '시장 전체 아님')}
      ${ratesRow('자막 확보 시도', n(t.attempted), `성공 ${t.success} (${pct(t.rate)}) · 자막 없음 ${t.noCaptions} · 실패 ${t.failed}`)}
      ${ratesRow('초반 3분 훅 분석', n(s.hooksAnalyzed), `자막 확보분의 ${pct(s.hooksAnalyzed / t.success)}`)}
      ${ratesRow('비출연 여부 프레임 검증', n(s.channels.appearanceVerified), `전체의 ${pct(s.channels.appearanceVerified / s.channels.total)}`)}
      ${ratesRow('외부 추정 수익 확인(블링)', n(s.channels.vendorRevenueCollected), '실측 수익 0건')}
      ${ratesRow('영상 파일 확보 · OpenCV 분석', `${s.videoFilesAcquired} · ${s.openCvAnalyzed}`, '권한 확인 자료 없음 → 미실행')}
      ${ratesRow('중국 SNS 허브 고유 항목', n(sn.totalUnique), `Bilibili ${n(sn.bilibiliUnique)} · 샤오홍슈 ${n(sn.xhsUnique)} · 더우인 ${n(sn.douyinUnique)} · 중복 제거 ${n(sn.duplicatesRemoved)} (주장 ${esc(sn.claim)})`)}
      ${ratesRow('Google Sheets 저장', n(s.sheetsCreated), '대상 계정 미지정')}</tbody></table></div>
      <div class="lf-card-mini"><strong>미완료·실패</strong><ul>${s.missing.map(m => `<li>${esc(m.item)} — ${esc(m.reason)} <small>재시도: ${esc(m.retry)}</small></li>`).join('')}</ul></div>`;
    }
    function list(key) {
      const rows = data.channels.filter(CAT[key]).filter(c => !noHost || ['narration_only', 'material_mix', 'ai_generated'].includes(c.appearance)).filter(c => !small || (c.subs != null && c.subs <= 50000));
      const f = SORTS[sort][1], sorted = rows.slice().sort((a, b) => { const x = f(a), y = f(b); return x == null ? (y == null ? 0 : 1) : y == null ? -1 : y - x; });
      const controls = `<div class="lf-row"><label>정렬 <select data-lab="sort">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${sort === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label><label><input type="checkbox" data-lab="nohost" ${noHost ? 'checked' : ''}> 비출연형 확인 채널만</label><label><input type="checkbox" data-lab="small" ${small ? 'checked' : ''}> 구독자 5만 이하</label><span>${sorted.length}채널</span></div>`;
      const table = `<div class="lf-table-wrap"><table><thead><tr><th>채널</th><th>제작 방식</th><th>구독자</th><th>중앙값</th><th>구독자 대비</th><th>최고작 비중</th><th>외부 추정(30일, 롱폼)</th></tr></thead><tbody>${sorted.slice(0, 80).map(c => `<tr><th><button type="button" data-lab="channel" data-id="${esc(c.id)}">${esc(c.name)}</button> <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">원본</a></th><td>${AP[c.appearance] || c.appearance}${c.appearanceCheckedAt ? '' : ' (미검증)'}</td><td>${n(c.subs)}</td><td>${n(c.medianViews)}${c.medianBasis.includes('approx') ? ' ≈' : ''}</td><td>${x2(c.viewsPerSubscriberMedian)}</td><td>${pct(c.topShare)}</td><td>${c.revenue.vendorEstimate ? n(c.revenue.vendorEstimate.longformKrw30d) + '원 (추정)' : '미확인'}</td></tr>${openId === c.id ? `<tr><td colspan="7">${channelDetail(c)}</td></tr>` : ''}`).join('')}</tbody></table></div>`;
      return controls + `<p class="lf-hint">중앙값은 채널 최신 업로드 표본 기준이며 ≈는 반올림 표시값입니다. 인기작·저성과작 표본이라 시장 전체 분포가 아닙니다. 실제 수익이 확인된 채널은 0곳입니다.</p>` + table;
    }
    function channelDetail(c) {
      const vs = data.videos.filter(v => v.channelId === c.id).sort((a, b) => b.views - a.views);
      return `<p>${esc(c.appearanceEvidence || '제작 방식 근거 없음')} ${c.riskNotes ? `<br><small>위험: ${esc(c.riskNotes)}</small>` : ''}</p>` + vs.map(v => `<div class="lf-row"><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(v.thumbnail)}" alt="" width="96" height="54" loading="lazy" referrerpolicy="no-referrer"></a><span>${esc(v.title)} · ${n(v.views)}회 · ${esc(v.publishedAt?.slice(0, 10) || '')} · 자막 ${v.transcript.status === 'not_attempted' ? '미시도' : esc(v.transcript.status)}</span></div>`).join('');
    }
    function hook() {
      const st = data.hookStats.stats, hs = data.hooks.filter(h => !tag || h.tags.includes(tag));
      return `<p class="lf-hint">원문 일부와 한국어 번역(어시스턴트 번역)을 연결했습니다. 시청 유지율이 없어 훅이 성공 원인이라는 뜻은 아닙니다. 자동 자막 오류가 있습니다.</p><table><thead><tr><th>훅 유형(관찰)</th><th>영상 수</th><th>중앙값 조회</th><th>없는 영상 수</th><th>없는 영상 중앙값</th></tr></thead><tbody>${Object.entries(st).map(([k, v]) => `<tr><th><button type="button" data-lab="tag" data-tag="${esc(k)}" aria-pressed="${tag === k}">${esc(k)}</button></th><td>${v.count}</td><td>${n(v.median_views)}</td><td>${v.without_tag_n}</td><td>${n(v.without_tag_median_views)}</td></tr>`).join('')}</tbody></table><p>표본 ${hs.length}편${tag ? ` · 필터 ${esc(tag)} <button type="button" data-lab="tag" data-tag="">해제</button>` : ''}</p>` + hs.slice(0, 40).map(h => `<details ${hookOpen === h.id ? 'open' : ''}><summary>${esc(h.title)} · ${n(h.views)}회 · ${esc(h.channel)}</summary><a href="https://www.youtube.com/watch?v=${esc(h.id)}" target="_blank" rel="noopener noreferrer">원본</a>${h.segments.map(s => `<p><b>${esc(s.range)}</b> ${esc(s.original || '(비어 있음)')}${s.korean ? `<br><small>${esc(s.korean)} ${s.koreanKind === 'assistant_translation' ? '(어시스턴트 번역)' : ''}${s.lowConfidence ? ' · 낮은 신뢰' : ''}</small>` : ''}</p>`).join('')}</details>`).join('');
    }
    function titles() {
      const vs = data.videos.filter(v => v.role === 'top').sort((a, b) => b.views - a.views).slice(0, 60);
      return `<p class="lf-hint">썸네일 URL과 제목 구조만 저장했고 이미지 속 표정·글자 분석은 아직 하지 않았습니다.</p><div class="grid" style="--cols:5">${vs.map(v => `<article class="item"><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(v.thumbnail)}" alt="${esc(v.title)}" loading="lazy" referrerpolicy="no-referrer" style="width:100%"></a><div class="cardbody"><strong>${esc(v.title)}</strong><br>${esc(v.channel || '')} · ${n(v.views)}회<br><small>${esc(v.topics.join(' · ') || '주제 미분류')} · 시각 분석 미실행</small></div></article>`).join('')}</div>`;
    }
    function strategy() {
      return `<div class="lf-card-mini"><strong>일본 주제별 표본</strong><table><thead><tr><th>주제</th><th>영상</th><th>채널</th><th>중앙값</th><th>비출연 비중</th></tr></thead><tbody>${data.topicStats.map(t => `<tr><th>${esc(t.topic)}</th><td>${t.videos}</td><td>${t.channels}</td><td>${n(t.medianViews)}</td><td>${pct(t.nonAppearingShare)}</td></tr>`).join('')}</tbody></table><small>키워드 분류이며 영상이 여러 주제에 속할 수 있습니다. 조회수는 누적이고 수익이 아닙니다.</small></div>` + data.strategies.map(s => `<div class="lf-card-mini"><strong>${esc(s.id)}. ${esc(s.name)}</strong><br>재현 가능성: ${esc(s.reproducibility)}<br>수익 근거: ${esc(s.revenueEvidence)}<br>비출연 제작: ${esc(s.faceless)} · 보유 자료: ${esc(s.existingAssets)}<br>차별화 ${esc(s.differentiation)} · 비용 ${esc(s.cost)} · 장기 ${esc(s.longTerm)}<br><small>위험: ${esc(s.risk)} · 신뢰도 ${esc(s.confidence)}</small></div>`).join('') + '<p class="lf-hint">세 전략 모두 실제 수익 증빙이 없어 순위는 보류합니다. 판단은 관찰 자료 기준의 평가이며 성공 보장이 아닙니다.</p>';
    }
    function render() {
      if (!data) return;
      const head = `<div class="lf-row" role="tablist">${TABS.map(([k, t]) => `<button type="button" role="tab" data-lab="tab" data-tab="${k}" aria-selected="${tab === k}" aria-pressed="${tab === k}">${t}</button>`).join('')}</div>`;
      const views = { status, hook, title: titles, strategy };
      body.innerHTML = head + (views[tab] ? views[tab]() : list(tab));
    }
    async function load() {
      if (data || loading) return; loading = true;
      try { const r = await fetch('lf-v5-lab.json'); if (!r.ok) throw Error(r.status); data = await r.json(); render(); }
      catch { body.innerHTML = '<p>연구 데이터를 읽지 못했습니다. 기존 갤러리는 영향을 받지 않습니다.</p>'; loading = false; }
    }
    root.addEventListener('toggle', () => { if (root.open) load(); });
    root.addEventListener('click', e => { const b = e.target.closest('[data-lab]'); if (!b) return; const a = b.dataset.lab; if (a === 'tab') tab = b.dataset.tab; else if (a === 'channel') openId = openId === b.dataset.id ? null : b.dataset.id; else if (a === 'tag') tag = b.dataset.tag; else return; render(); });
    root.addEventListener('change', e => { const a = e.target.dataset?.lab; if (!a) return; if (a === 'sort') sort = e.target.value; else if (a === 'nohost') noHost = e.target.checked; else if (a === 'small') small = e.target.checked; else return; render(); });
    return { open(k) { if (k) tab = k; root.open = true; load(); render(); root.scrollIntoView({ block: 'nearest' }); } };
  }
};
