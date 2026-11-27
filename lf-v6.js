/* V6 shared card fields, combined filters and sorts. Unknown values stay unknown; nothing is guessed or backfilled. */
'use strict';
window.LFV6 = (function () {
  const DAY = 86400000, STORE = 'lf-v6:view:v1';
  const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[\s·・\-_【】\[\]()（）|｜]+/g, '');
  const num = x => typeof x === 'number' && Number.isFinite(x) ? x : null;
  const dateMs = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? Date.parse(d + 'T00:00:00+09:00') : null;
  const OPTS = {
    subsMax: [[100], [500], [1000], [5000], [10000], [50000], [100000]], chAgeMax: [[1], [3], [7], [14], [30], [60], [90], [180], [365]],
    chVideosMax: [[1], [3], [5], [10], [20], [30], [50], [100]], postAgeMax: [[1, '24시간'], [3], [7], [14], [30], [90]], xMin: [[1], [3], [5], [10], [30], [50], [100]]
  };
  const SORTS = { '': '기존 정렬', estDesc: '추정 수익 높은 순', viewsDesc: '조회수 높은 순', subsAsc: '구독자 수 적은 순', xDesc: '구독자 대비 조회수 높은 순', chNewest: '채널 개설일 최신순', chVideosAsc: '채널 공개 영상 수 적은 순', postNewest: '영상 게시일 최신순', perDayDesc: '게시 후 일평균 높은 순', chEstDesc: '채널당 추정 수익(표본 합계) 높은 순', videoEstAvgDesc: '영상당 평균 추정 수익(표본) 높은 순' };
  const blank = () => ({ subsMax: '', chAgeMax: '', chVideosMax: '', postAgeMax: '', xMin: '', minViews: '', minEst: '', nonhost: false, sort: '', limit: 0, mode: 'video', list: false });
  let st = blank(), stats = new Map(), api = null, sampleCache = { key: '', map: new Map() }, todayMs = Date.now(), r = 2, asOf = null;
  try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); if (s?.mode) { st.mode = s.mode; st.list = !!s.list; } } catch { /* optional */ }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ mode: st.mode, list: st.list })); } catch { /* optional */ } };

  function load(data) {
    asOf = data?.asOf ?? null;
    for (const c of data?.channels || []) { stats.set(norm(c.name), c); if (c.channelId) stats.set('id:' + c.channelId, c); }
  }
  function samples() {
    const all = api.all();
    const key = all.length + ':' + todayMs;
    if (sampleCache.key === key) return sampleCache.map;
    const map = new Map();
    for (const v of all) {
      const k = norm(v.ch), o = map.get(k) || { n: 0, views: 0, earliest: null, est: 0 };
      o.n++; o.views += v.v || 0; o.est += (v.v || 0) * r; if (v.d && (!o.earliest || v.d < o.earliest)) o.earliest = v.d;
      map.set(k, o);
    }
    sampleCache = { key, map };
    return map;
  }
  function info(v) {
    const c = stats.get(v.channelId ? 'id:' + v.channelId : '') || stats.get(norm(v.ch)) || null;
    const s = samples().get(norm(v.ch)) || { n: 0, views: 0, earliest: null, est: 0 };
    const subs = num(c?.subs) > 0 ? c.subs : null;
    const joined = dateMs(c?.joined), vd = dateMs(v.d);
    const instant = typeof v.publishedAt === 'string' && Number.isFinite(Date.parse(v.publishedAt)) ? Date.parse(v.publishedAt) : null;
    const ageDays = vd == null ? null : Math.max(0, Math.floor((todayMs - vd) / DAY));
    const elapsed = instant != null ? Math.max(0, (todayMs - instant) / DAY) : ageDays;
    const views = num(v.v);
    return {
      c, subs, subsReason: c ? (c.subs == null ? (c.reason || '구독자 비공개 또는 미표시') : (c.subs <= 0 ? '0명 표시 → 배수 계산 불가' : null)) : '채널 통계 미수집',
      joined: c?.joined ?? null, chAge: joined == null ? null : Math.max(0, Math.floor((todayMs - joined) / DAY)), chVideos: num(c?.totalVideos), chViews: num(c?.totalViews), checkedAt: c?.checkedAt ?? null, url: c?.url ?? (v.channelId ? 'https://www.youtube.com/channel/' + v.channelId : null),
      ageDays, x: subs && views != null ? views / subs : null, perDay: views != null && elapsed != null && elapsed >= 1 ? views / elapsed : null, perHour: views != null && instant != null && elapsed < 1 && elapsed > 0 ? views / (elapsed * 24) : null,
      est: views != null ? views * r : null, sample: s, chEst: s.n ? s.est : null, avgEst: s.n ? s.est / s.n : null, firstSample: s.earliest,
      oldChannelRecentStart: joined != null && s.earliest && (todayMs - joined) / DAY > 365 && (todayMs - dateMs(s.earliest)) / DAY < 120,
      appearance: c?.appearance ?? 'unknown', status: c?.status ?? 'not_collected'
    };
  }
  const NONHOST = ['narration_only', 'material_mix', 'ai_generated'];
  function active() { return Object.entries(st).some(([k, v]) => !['sort', 'limit', 'mode', 'list'].includes(k) && v !== '' && v !== false); }
  function pass(v, rate) {
    if (rate) r = rate;
    if (!active()) return true;
    const i = info(v), ge = (val, min) => val != null && val >= Number(min), le = (val, max) => val != null && val <= Number(max);
    if (st.subsMax !== '' && !le(i.subs, st.subsMax)) return false;
    if (st.chAgeMax !== '' && !le(i.chAge, st.chAgeMax)) return false;
    if (st.chVideosMax !== '' && !le(i.chVideos, st.chVideosMax)) return false;
    if (st.postAgeMax !== '' && !le(i.ageDays, st.postAgeMax)) return false;
    if (st.xMin !== '' && !ge(i.x, st.xMin)) return false;
    if (st.minViews !== '' && !ge(num(v.v), st.minViews)) return false;
    if (st.minEst !== '' && !ge(i.est, st.minEst)) return false;
    if (st.nonhost && !NONHOST.includes(i.appearance)) return false;
    return true;
  }
  const KEY = { estDesc: [i => i.est, 1], viewsDesc: [(i, v) => num(v.v), 1], subsAsc: [i => i.subs, -1], xDesc: [i => i.x, 1], chNewest: [i => i.joined ? Date.parse(i.joined) : null, 1], chVideosAsc: [i => i.chVideos, -1], postNewest: [(i, v) => dateMs(v.d), 1], perDayDesc: [i => i.perDay, 1], chEstDesc: [i => i.chEst, 1], videoEstAvgDesc: [i => i.avgEst, 1] };
  function compare(a, b, rate) {
    if (rate) r = rate;
    if (!st.sort || !KEY[st.sort]) return 0;
    const [f, dir] = KEY[st.sort], x = f(info(a), a), y = f(info(b), b);
    if (x == null || x === undefined) return y == null ? 0 : 1; if (y == null) return -1;
    return (y - x) * dir;
  }
  const n0 = x => x == null ? null : Math.round(x).toLocaleString('ko-KR');
  function card(v, rate) {
    if (rate) r = rate;
    const i = info(v), esc = api.esc, U = (val, reason) => val == null ? `<span class="lf-gray" title="${esc(reason || '미확인')}">미확인</span>` : val;
    const ch = i.c;
    return `<dl class="v6-card" aria-label="채널·영상 지표">
<div><dt>구독자</dt><dd>${U(i.subs != null ? n0(i.subs) + (ch?.subsPrecision ? ' ≈' : '') : null, i.subsReason)}</dd></div>
<div><dt>채널 개설</dt><dd>${U(i.joined ? esc(i.joined) + ' (' + i.chAge + '일)' : null, ch ? '개설일 미표시' : '채널 통계 미수집')}</dd></div>
<div><dt>표본 최초 게시</dt><dd>${U(i.firstSample ? esc(i.firstSample) : null)} <small>표본 ${i.sample.n}편</small></dd></div>
<div><dt>공개 영상</dt><dd>${U(i.chVideos != null ? n0(i.chVideos) + '개' : null, ch ? '영상 수 미표시' : '채널 통계 미수집')}</dd></div>
<div><dt>채널 누적 조회</dt><dd>${U(i.chViews != null ? n0(i.chViews) : null, ch ? '조회수 미표시' : '채널 통계 미수집')}</dd></div>
<div><dt>영상 게시</dt><dd>${U(v.d ? esc(v.d) + (i.ageDays != null ? ' (' + i.ageDays + '일)' : '') : null)}</dd></div>
<div><dt>구독자 대비</dt><dd class="lf-key">${i.x != null ? 'X' + Math.trunc(i.x * 100) / 100 : '<span class="lf-gray" title="' + esc(i.subsReason || '배수 계산 불가') + '">계산 불가</span>'}</dd></div>
<div><dt>일평균 조회</dt><dd>${i.perDay != null ? n0(i.perDay) : i.perHour != null ? n0(i.perHour) + '/시간' : '<span class="lf-gray" title="게시 후 1일 미만이거나 게시 시각 미확인">미확인</span>'}</dd></div>
<div><dt>표본 평균 추정</dt><dd>${i.avgEst != null ? n0(i.avgEst) + '원' : '미확인'}</dd></div>
<div><dt>제작 방식</dt><dd>${({ on_camera: '출연형', narration_only: '나레이션', ai_generated: 'AI 생성(추정)', material_mix: '자료 조합' })[i.appearance] || '<span class="lf-gray" title="프레임·설명 검증 전">미확인</span>'}</dd></div>
<div><dt>확인일</dt><dd>${ch?.checkedAt ? esc(ch.checkedAt.slice(0, 10)) : (v.checked ? esc(v.checked) : '미확인')}</dd></div>
<div><dt>채널</dt><dd>${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">링크</a>` : '미확인'}</dd></div>
${i.oldChannelRecentStart ? '<div class="v6-wide"><dd class="lf-orange">오래된 채널 · 최근 콘텐츠 시작 가능성(표본 기준)</dd></div>' : ''}</dl>`;
  }
  function channels(rows, rate) {
    if (rate) r = rate;
    const seen = new Set(), esc = api.esc, out = [];
    for (const v of rows) { const k = norm(v.ch); if (seen.has(k)) continue; seen.add(k); out.push(v); if (out.length >= 300) break; }
    return out.map(v => { const i = info(v); return `<article class="item v6-channel" data-id="${v.id}"><a class="thumb" href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener noreferrer"><img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="${esc(v.t)}" loading="lazy" referrerpolicy="no-referrer"></a><div class="cardbody"><strong>${esc(v.ch)}</strong><br><small>대표 영상: ${esc(v.t)}</small>${card(v, rate)}</div></article>`; }).join('') || '<p class="empty">조건에 맞는 채널이 없습니다.</p>';
  }
  function setPreset(key) {
    const P = { new7: { chAgeMax: 7 }, new30: { chAgeMax: 30 }, new90: { chAgeMax: 90 }, few10: { chVideosMax: 10 }, subs1k: { subsMax: 1000, minViews: 100000 }, subs10k: { subsMax: 10000, minEst: 1000000 }, xTop: { xMin: 1, sort: 'xDesc', limit: 100 }, estTop: { minViews: 1, sort: 'estDesc', limit: 100 }, nonhost: { nonhost: true } };
    st = { ...blank(), mode: st.mode, list: st.list, ...(P[key] || {}) };
    sync(); api.render();
  }
  function applyView() { const g = document.getElementById('grid'); if (g) g.classList.toggle('lf-list', st.list); }
  function field(id, label, rows, custom) {
    return `<label>${label}<select data-v6="${id}"><option value="">제한 없음</option>${rows.map(([v, t]) => `<option value="${v}" ${String(st[id]) === String(v) ? 'selected' : ''}>${t || v}</option>`).join('')}${custom ? '<option value="custom">직접 입력</option>' : ''}</select><input data-v6-custom="${id}" type="number" min="0" placeholder="직접 입력" ${rows.some(([v]) => String(v) === String(st[id])) || st[id] === '' ? 'hidden' : ''} value="${rows.some(([v]) => String(v) === String(st[id])) ? '' : st[id]}"></label>`;
  }
  const F = {
    subsMax: ['구독자 수 이하', OPTS.subsMax.map(([v]) => [v, v.toLocaleString('ko-KR') + '명'])], chAgeMax: ['채널 개설 경과 이내', OPTS.chAgeMax.map(([v]) => [v, v === 365 ? '1년' : v + '일'])],
    chVideosMax: ['채널 공개 영상 수 이하', OPTS.chVideosMax.map(([v]) => [v, v + '개'])], postAgeMax: ['영상 게시 경과 이내', OPTS.postAgeMax.map(([v, t]) => [v, t || v + '일'])], xMin: ['구독자 대비 조회수 이상', OPTS.xMin.map(([v]) => [v, v + '배'])]
  };
  function sync() {
    const box = document.getElementById('lf-v6'); if (!box) return;
    const body = box.querySelector('[data-body]');
    body.innerHTML = `<p class="lf-hint">구독자·개설일·영상 수는 수집 완료 채널만 필터됩니다. 미확인 값은 필터를 켜면 제외되며 숫자를 추정하지 않습니다. 추정 수익은 공개 누적 조회 기반 가정입니다.</p><div class="lf-row">${Object.entries(F).map(([k, [label, rows]]) => field(k, label, rows, true)).join('')}<label>최소 조회수<input data-v6-num="minViews" type="number" min="0" value="${st.minViews}"></label><label>최소 추정 수익(KRW)<input data-v6-num="minEst" type="number" min="0" value="${st.minEst}"></label><label><input data-v6-chk="nonhost" type="checkbox" ${st.nonhost ? 'checked' : ''}> 비출연·나레이션·AI 채널만</label><label>정렬<select data-v6="sort">${Object.entries(SORTS).map(([k, t]) => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label><button type="button" data-v6-act="list" aria-pressed="${st.list}">목록 보기</button><button type="button" data-v6-act="mode" aria-pressed="${st.mode === 'channel'}">채널 카드로 보기</button><button type="button" data-v6-act="reset">필터 초기화</button></div><p role="status" data-v6-status></p>`;
    applyView();
  }
  function note(total) {
    const el = document.querySelector('[data-v6-status]'); if (!el) return;
    el.textContent = active() ? `V6 필터 적용 중 · 결과 ${total.toLocaleString('ko-KR')}편 · 채널 통계 수집 ${[...stats.keys()].filter(k => !k.startsWith('id:')).length.toLocaleString('ko-KR')}곳 (${asOf ? asOf.slice(0, 10) : '날짜 미확인'})` : `채널 통계 수집 ${[...stats.keys()].filter(k => !k.startsWith('id:')).length.toLocaleString('ko-KR')}곳 · 필터 없음`;
  }
  function mount(a) {
    api = a; const box = document.getElementById('lf-v6'); if (!box || box.dataset.ready) return null; box.dataset.ready = '1';
    box.innerHTML = '<summary>🚀 신생·저구독·고조회 필터 (구독자·개설일·영상 수·배수)</summary><div data-body></div>';
    sync();
    box.addEventListener('change', e => { const t = e.target, id = t.dataset.v6, nm = t.dataset.v6Num, ck = t.dataset.v6Chk; if (id) { if (t.value === 'custom') { st[id] = ''; box.querySelector(`[data-v6-custom="${id}"]`).hidden = false; return; } st[id] = id === 'sort' ? t.value : t.value; } else if (nm) st[nm] = t.value; else if (ck) st[ck] = t.checked; else return; sync(); api.render(); });
    box.addEventListener('input', e => { const c = e.target.dataset.v6Custom; if (!c) return; st[c] = e.target.value; api.render(); });
    box.addEventListener('click', e => { const b = e.target.closest('[data-v6-act]'); if (!b) return; const a = b.dataset.v6Act; if (a === 'list') { st.list = !st.list; save(); } else if (a === 'mode') { st.mode = st.mode === 'channel' ? 'video' : 'channel'; save(); } else if (a === 'reset') st = { ...blank(), mode: st.mode, list: st.list }; sync(); api.render(); });
    return { setPreset };
  }
  return { mount, load, pass, compare, card, channels, note, setPreset, active, applyView, get limit() { return st.limit; }, get channelMode() { return st.mode === 'channel'; }, get sort() { return st.sort; }, info, SORTS, setNow(ms) { todayMs = ms; } };
})();
