/* V13 universal UI: RangeFilter, SortControl, InlineMultiPlayer, ResponsiveGrid, VisibilityControl, EditableSidebar add-ons.
   Reuses: LFV6.info (channel stats), LFMoney (amount format), lf-layout (menu edit/width/collapse), v12 toolbar. */
'use strict';
(function () {
  const DAY = 864e5;
  const LS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* optional */ } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nf = (x, d = 0) => x == null || !Number.isFinite(x) ? '미확인' : (d ? (Math.trunc(x * 10 ** d) / 10 ** d).toLocaleString('ko-KR') : Math.trunc(x).toLocaleString('ko-KR'));
  const money = x => window.LFMoney ? window.LFMoney.fmt(x) : nf(x);
  const terms = s => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  const $ = s => document.querySelector(s);
  const rerender = () => { const s = document.getElementById('sort'); if (s) s.dispatchEvent(new Event('change', { bubbles: true })); };

  // ---------- number parsing: 만·억·천·K·M·B·쉼표·% ----------
  function parseNum(raw) {
    if (raw == null) return null;
    let s = String(raw).trim().replace(/,/g, '').replace(/\s+/g, '').replace(/원|회|명|개|편|일|분|배|시간/g, '');
    if (s === '') return null;
    const pct = /%$/.test(s); s = s.replace(/%$/, '');
    let total = 0, matched = false;
    const re = /(-?\d+(?:\.\d+)?)(억|만|천|[kKmMbB])?/g; let m, used = '';
    while ((m = re.exec(s))) { matched = true; used += m[0]; const n = parseFloat(m[1]); const u = m[2] || ''; total += n * ({ '억': 1e8, '만': 1e4, '천': 1e3, k: 1e3, K: 1e3, m: 1e6, M: 1e6, b: 1e9, B: 1e9 }[u] || 1); }
    if (!matched || used !== s) return NaN;
    return pct ? total / 100 : total;
  }

  // ---------- metrics ----------
  const D = () => window.LFData;
  let chCache = null, chCacheSize = -1;
  function channels() {
    const all = D()?.all() || [];
    if (chCache && chCacheSize === all.length) return chCache;
    const now = Date.now(), m = new Map();
    for (const v of all) { const k = terms(v.ch); if (!k) continue; let c = m.get(k); if (!c) m.set(k, c = { vids: [] }); c.vids.push(v); }
    for (const c of m.values()) {
      const vs = c.vids.map(v => v.v).filter(Number.isFinite).sort((a, b) => a - b); c.views = vs; c.n = vs.length;
      const med = a => a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.ceil((a.length - 1) / 2)]) / 2 : null;
      c.median = med(vs); c.mean = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
      const k = Math.floor(vs.length * 0.1), t = vs.slice(k, vs.length - k); c.trimmed = t.length ? t.reduce((a, b) => a + b, 0) / t.length : null;
      c.repeat = vs.length ? vs.filter(x => x >= 1e5).length / vs.length : null;
      const ds = c.vids.map(v => v.d ? Date.parse(v.d) : null).filter(Number.isFinite).sort((a, b) => b - a);
      const n90 = ds.filter(x => now - x <= 90 * DAY).length; c.monthly = ds.length ? n90 / 3 : null;
      const gaps = []; for (let i = 1; i < Math.min(ds.length, 11); i++) gaps.push((ds[i - 1] - ds[i]) / DAY); c.interval = gaps.length ? med(gaps.sort((a, b) => a - b)) : null;
    }
    chCache = m; chCacheSize = all.length; return m;
  }
  const rpm = () => Number($('#rpm')?.value) || 2;
  function info(v) { try { return window.LFV6?.info ? window.LFV6.info(v) : {}; } catch { return {}; } }
  function outlier(v, c) { if (!c || !Number.isFinite(v.v)) return null; const others = c.views.slice(); const i = others.indexOf(v.v); if (i >= 0) others.splice(i, 1); if (others.length < 3) return null; const m = (others[Math.floor((others.length - 1) / 2)] + others[Math.ceil((others.length - 1) / 2)]) / 2; return m > 0 ? v.v / m : null; }
  const age = v => v.d ? Math.max(0, (Date.now() - Date.parse(v.d)) / DAY) : null;
  const METRICS = [
    ['subs', '구독자 수', '명', v => info(v).subs ?? null, ['1000', '1만', '3만', '10만', '100만']],
    ['views', '조회수', '회', v => Number.isFinite(v.v) ? v.v : null, ['1만', '10만', '100만', '1000만']],
    ['est', '영상 추정 수익(선택 단가)', '원', v => Number.isFinite(v.v) ? v.v * rpm() : null, ['10만', '100만', '500만', '1000만', '1억']],
    ['chMonthly', '채널 월 추정 수익(표본)', '원', v => { const c = channels().get(terms(v.ch)); return c && c.median != null && c.monthly != null ? c.median * c.monthly * rpm() : null; }, ['100만', '300만', '1000만', '3000만']],
    ['x', '구독자 대비 X배수', '배', v => info(v).x ?? null, ['0.5', '1', '3', '10', '30']],
    ['outlier', '채널 평소 대비 아웃라이어', '배', v => outlier(v, channels().get(terms(v.ch))), ['1', '2', '5', '10']],
    ['chAge', '채널 개설 경과일', '일', v => info(v).chAge ?? null, ['7', '30', '90', '365']],
    ['age', '영상 게시 경과일', '일', v => age(v), ['1', '7', '30', '90', '365']],
    ['chVideos', '전체 영상 수', '개', v => info(v).chVideos ?? null, ['10', '30', '100', '500']],
    ['monthly', '월 업로드 수(표본)', '편', v => channels().get(terms(v.ch))?.monthly ?? null, ['1', '4', '8', '30']],
    ['interval', '업로드 간격(표본 중앙값)', '일', v => channels().get(terms(v.ch))?.interval ?? null, ['1', '3', '7', '30']],
    ['dur', '영상 길이', '분', v => Number.isFinite(v.s) ? v.s / 60 : null, ['3', '10', '20', '40', '60']],
    ['chMean', '채널 평균 조회(표본)', '회', v => channels().get(terms(v.ch))?.mean ?? null, ['1만', '10만', '100만']],
    ['chMedian', '채널 중앙값 조회(표본)', '회', v => channels().get(terms(v.ch))?.median ?? null, ['1만', '10만', '100만']],
    ['chTrimmed', '채널 절사평균(표본 10%)', '회', v => channels().get(terms(v.ch))?.trimmed ?? null, ['1만', '10만', '100만']],
    ['likes', '좋아요', '개', v => Number.isFinite(v.likes) ? v.likes : null, ['100', '1000', '1만']],
    ['comments', '댓글', '개', v => Number.isFinite(v.comments) ? v.comments : null, ['10', '100', '1000']],
    ['shares', '공유(확인 가능한 것)', '회', () => null, ['10', '100']],
    ['repeat', '반복 흥행률(10만↑ 비율)', '%', v => channels().get(terms(v.ch))?.repeat ?? null, ['10%', '30%', '50%', '80%']],
    ['vph', 'VPH(시간당 조회)', '회', v => { const a = age(v); return a && Number.isFinite(v.v) ? v.v / (Math.max(a, 1 / 24) * 24) : null; }, ['10', '100', '1000', '1만']],
    ['hours', '제작시간', '시간', v => Number.isFinite(v.hours) ? v.hours : null, ['2', '6', '12', '24']],
    ['cost', '제작비', '원', v => Number.isFinite(v.cost) ? v.cost : null, ['3만', '10만', '50만']],
    ['net', '순이익', '원', v => Number.isFinite(v.cost) && Number.isFinite(v.v) ? v.v * rpm() - v.cost : null, ['0', '100만', '1000만']],
    ['fit', '사업 적합도 점수', '점', v => Number.isFinite(v.fit) ? v.fit : null, ['30', '50', '70', '90']],
    ['date', '게시일(정렬 전용)', '', v => v.d ? Date.parse(v.d) : null, null],
    ['daily', '게시 후 일평균 조회(정렬 전용)', '회', v => { const a = age(v); return a && Number.isFinite(v.v) ? v.v / Math.max(a, 1) : null; }, null]
  ];
  const MET = Object.fromEntries(METRICS.map(m => [m[0], m]));
  window.LFMetric = { get: (k, v) => MET[k] ? MET[k][3](v) : null, list: METRICS.map(m => m[0]), parseNum, channels };

  // ---------- RangeFilter ----------
  const RKEY = 'lf-v13:range:v1';
  let actCache = null;
  const range = { rows: LS(RKEY, {}), unknown: LS('lf-v13:range-unknown', false), errors: {} };
  function rangeFromURL() { const u = new URL(location.href).searchParams.get('rf'); if (!u) return; const out = {}; for (const part of u.split(',')) { const [k, a = '', b = ''] = part.split(/[:~]/); if (MET[k]) out[k] = { min: decodeURIComponent(a), max: decodeURIComponent(b) }; } range.rows = out; SS(RKEY, out); actCache = null; }
  function active() { const out = []; for (const [k, r] of Object.entries(range.rows)) { if (!MET[k] || !MET[k][4]) continue; let a = parseNum(r.min), b = parseNum(r.max); if (k === 'repeat') { if (a != null && a > 1 && !/%/.test(r.min)) a /= 100; if (b != null && b > 1 && !/%/.test(r.max)) b /= 100; } if ((a == null && b == null) || Number.isNaN(a) || Number.isNaN(b)) continue; if (a != null && b != null && a > b) continue; out.push([k, a, b]); } return out; }
  window.LFRange = {
    ok(v) { const act = actCache || (actCache = active()); for (const [k, a, b] of act) { let x = MET[k][3](v); if (k === 'repeat' && x != null) x = x; if (x == null) { if (!range.unknown) return false; continue; } if (a != null && x < a) return false; if (b != null && x > b) return false; } return true; },
    active: () => active(), parseNum
  };
  function syncURL() {
    try {
      const u = new URL(location.href); const rf = Object.entries(range.rows).filter(([, r]) => (r.min || r.max)).map(([k, r]) => k + ':' + encodeURIComponent(r.min || '') + '~' + encodeURIComponent(r.max || '')).join(',');
      if (rf) u.searchParams.set('rf', rf); else u.searchParams.delete('rf');
      if (sort.key) u.searchParams.set('so', sort.key + ':' + sort.dir); else u.searchParams.delete('so');
      history.replaceState(history.state, '', u.href);
    } catch { /* optional */ }
  }
  let rangeTimer = null;
  function applyRange() { actCache = null; clearTimeout(rangeTimer); rangeTimer = setTimeout(() => { actCache = null; SS(RKEY, range.rows); syncURL(); rerender(); chips(); }, 300); }
  function rangeRow([k, label, unit, , quick]) {
    const r = range.rows[k] || {}, opt = (quick || []).map(q => '<option value="' + esc(q) + '">' + esc(q) + '</option>').join('');
    return '<div class="v13-rg" data-k="' + k + '"><span class="v13-rl">' + esc(label) + '</span><input inputmode="decimal" data-side="min" placeholder="최소" value="' + esc(r.min || '') + '"><select data-qside="min" aria-label="최소 빠른 선택"><option value="">▾</option>' + opt + '</select><span>~</span><input inputmode="decimal" data-side="max" placeholder="최대" value="' + esc(r.max || '') + '"><select data-qside="max" aria-label="최대 빠른 선택"><option value="">▾</option>' + opt + '</select><small>' + esc(unit) + '</small><small class="v13-err" hidden></small></div>';
  }
  function validate(row) {
    const k = row.dataset.k, a = row.querySelector('[data-side=min]').value, b = row.querySelector('[data-side=max]').value;
    const pa = parseNum(a), pb = parseNum(b), err = row.querySelector('.v13-err');
    let msg = ''; if (Number.isNaN(pa) || Number.isNaN(pb)) msg = '숫자 형식 오류 (예: 1만, 3.5M, 10,000)'; else if (pa != null && pb != null && pa > pb) msg = '최소값이 최대값보다 큽니다 · 적용 안 함';
    err.hidden = !msg; err.textContent = msg; row.classList.toggle('v13-bad', !!msg);
    for (const [side, p] of [['min', pa], ['max', pb]]) { const i = row.querySelector('[data-side=' + side + ']'); i.title = p == null ? '빈칸 = 제한 없음' : Number.isNaN(p) ? '해석 불가' : '해석값 ' + p.toLocaleString('ko-KR'); }
    range.rows[k] = { min: a, max: b }; if (!a && !b) delete range.rows[k];
  }
  function buildRange() {
    const adv = document.getElementById('v12-adv'); if (!adv || document.getElementById('v13-range')) return;
    const box = document.createElement('details'); box.id = 'v13-range'; box.className = 'v12-adv'; box.open = LS('lf-v13:range-open', true);
    box.innerHTML = '<summary>📏 범위 검색 (최소 ~ 최대 · 만·억·K·M·쉼표 입력 가능 · 빈칸=제한 없음 · 0은 실제 0)</summary><div class="v13-rgrid">' + METRICS.filter(m => m[4]).map(rangeRow).join('') + '</div><label class="v13-unk"><input type="checkbox" id="v13-unknown"' + (range.unknown ? ' checked' : '') + '> 범위 조건이 있을 때 미확인 값 영상도 포함 (기본: 제외, 0으로 취급하지 않음)</label> <button type="button" id="v13-range-clear">범위 조건 모두 지우기</button><p class="lf-hint">채널 지표는 이 사이트에 수집된 같은 채널 표본으로 계산(표본 기반). 아웃라이어 = 영상 조회 ÷ 같은 채널 다른 영상 중앙값(자기 자신 제외, 다른 영상 3편 이상), 동일 경과일 자료가 없어 누적 조회 기준 참고 배수입니다. 제작시간·제작비·순이익·사업 적합도·공유는 수집 값이 있는 영상에서만 계산되고 없으면 미확인입니다.</p>';
    adv.after(box);
    box.addEventListener('toggle', () => SS('lf-v13:range-open', box.open));
    box.addEventListener('input', e => { const row = e.target.closest('.v13-rg'); if (!row || !e.target.dataset.side) return; validate(row); applyRange(); });
    box.addEventListener('change', e => { const row = e.target.closest('.v13-rg'); if (e.target.id === 'v13-unknown') { range.unknown = e.target.checked; SS('lf-v13:range-unknown', range.unknown); applyRange(); return; } if (!row || !e.target.dataset.qside) return; const i = row.querySelector('[data-side=' + e.target.dataset.qside + ']'); i.value = e.target.value; e.target.value = ''; validate(row); applyRange(); });
    box.querySelector('#v13-range-clear').addEventListener('click', () => { range.rows = {}; for (const i of box.querySelectorAll('input[data-side]')) i.value = ''; for (const r of box.querySelectorAll('.v13-rg')) validate(r); applyRange(); });
    for (const r of box.querySelectorAll('.v13-rg')) validate(r);
  }

  // ---------- SortControl ----------
  const SKEY = 'lf-v13:sort:v1';
  const sort = LS(SKEY, { key: '', dir: 'desc' });
  (function () { const u = new URL(location.href).searchParams.get('so'); if (u) { const [k, d] = u.split(':'); if (MET[k]) { sort.key = k; sort.dir = d === 'asc' ? 'asc' : 'desc'; } } })();
  window.LFSort = {
    active: () => !!sort.key,
    cmp(a, b) { if (!sort.key) return 0; const f = MET[sort.key][3]; const x = f(a), y = f(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return sort.dir === 'asc' ? x - y : y - x; },
    state: () => ({ ...sort })
  };
  function buildSort() {
    const s = document.getElementById('sort'); if (!s || document.getElementById('v13-sort')) return;
    const label = s.closest('label');
    const wrap = document.createElement('span'); wrap.className = 'v13-sortctl';
    wrap.innerHTML = '<label>세부 정렬<select id="v13-sort"><option value="">— 기본 정렬 사용 —</option>' + METRICS.map(m => '<option value="' + m[0] + '">' + esc(m[1]) + '</option>').join('') + '</select></label><button type="button" data-v13-dir="desc" title="높은 순">↓</button><button type="button" data-v13-dir="asc" title="낮은 순">↑</button>';
    label.after(wrap);
    // arrows next to the original sort select too
    const sel = wrap.querySelector('#v13-sort'); sel.value = sort.key;
    const paint = () => { wrap.classList.toggle('v13-on', !!sort.key); for (const b of wrap.querySelectorAll('[data-v13-dir]')) b.setAttribute('aria-pressed', String(!!sort.key && b.dataset.v13Dir === sort.dir)); s.classList.toggle('v13-dim', !!sort.key); };
    sel.addEventListener('change', () => { sort.key = sel.value; SS(SKEY, sort); syncURL(); paint(); rerender(); chips(); });
    wrap.addEventListener('click', e => { const b = e.target.closest('[data-v13-dir]'); if (!b) return; if (!sort.key) { sort.key = 'views'; sel.value = 'views'; } sort.dir = b.dataset.v13Dir; SS(SKEY, sort); syncURL(); paint(); rerender(); chips(); });
    // original select: arrows map to existing options (views↔viewsLow) without changing its data
    s.addEventListener('change', e => { if (e.isTrusted && sort.key) { sort.key = ''; sel.value = ''; SS(SKEY, sort); syncURL(); paint(); } });
    paint();
  }

  // ---------- chips (extends v12 chip bar) ----------
  function chips() {
    const box = document.getElementById('v12-chips'); if (!box) return;
    box.querySelectorAll('.v13-chip').forEach(x => x.remove());
    const add = [];
    for (const [k, a, b] of active()) add.push('<button type="button" class="v12-chip v13-chip" data-v13-clear="' + k + '">' + esc(MET[k][1]) + ': ' + (a == null ? '' : nf(a, 2)) + ' ~ ' + (b == null ? '' : nf(b, 2)) + '<b>✕</b></button>');
    if (sort.key) add.push('<button type="button" class="v12-chip v13-chip" data-v13-clear="__sort">정렬: ' + esc(MET[sort.key][1]) + (sort.dir === 'asc' ? ' ↑' : ' ↓') + '<b>✕</b></button>');
    if (add.length) { box.insertAdjacentHTML('afterbegin', add.join('')); for (const h of box.querySelectorAll('.lf-hint')) if (/적용 중인 조건 없음/.test(h.textContent)) h.textContent = '적용 중:'; }
  }
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-v13-clear]'); if (!c) return;
    const k = c.dataset.v13Clear;
    if (k === '__sort') { sort.key = ''; SS(SKEY, sort); const s = document.getElementById('v13-sort'); if (s) { s.value = ''; s.dispatchEvent(new Event('change')); } }
    else { delete range.rows[k]; const row = document.querySelector('.v13-rg[data-k="' + k + '"]'); if (row) { row.querySelectorAll('input').forEach(i => { i.value = ''; }); validate(row); } applyRange(); }
  });
  // v12 rebuilds chips on count change; re-add ours afterwards
  function watchChips() { const box = document.getElementById('v12-chips'); if (!box) return; new MutationObserver(() => { if (!box.querySelector('.v13-chip') && (active().length || sort.key)) chips(); }).observe(box, { childList: true }); }

  // ---------- card required info ----------
  function reqHTML(v) {
    const i = info(v), c = channels().get(terms(v.ch)), r = rpm();
    const x = i.x, ol = outlier(v, c);
    const chM = c && c.median != null && c.monthly != null ? c.median * c.monthly * r : null;
    const est = Number.isFinite(v.v) ? [1, 2, 4].map(k => v.v * k) : null;
    const M = (n, f) => window.LFMoney ? window.LFMoney.html(n, f) : nf(n);
    return '<div class="v13-req" data-v13-for="' + esc(v.id) + '">'
      + '<div><b>① 영상 추정</b> ' + (est ? est.map((n, k) => M(n, nf(v.v) + '회 × ' + [1000, 2000, 4000][k] + '원 ÷ 1,000 (M5 고정 단가, 실제 정산 아님)')).join(' / ') : '미확인') + '</div>'
      + '<div><b>② 채널</b> ' + esc(v.ch || '미확인') + ' · <b>③ 개설</b> ' + esc(i.joined || '미확인') + ' · <b>④ 구독자</b> ' + (i.subs != null ? nf(i.subs) + ' ≈' : '미확인') + '</div>'
      + '<div><b>⑤ 조회</b> ' + nf(v.v) + ' · <span class="v13-red"><b>⑥ X배</b> ' + (x != null ? nf(x, 2) + '배' : '미확인') + ' · <b>⑦</b> ' + (x != null ? nf(x * 100, 1) + '%' : '미확인') + '</span></div>'
      + '<div><b>⑧ 아웃라이어</b> ' + (ol != null ? nf(ol, 2) + '배 <small>(누적 조회 기준 참고 배수 · 자기 제외)</small>' : '미확인 <small>(같은 채널 다른 표본 3편 미만)</small>') + '</div>'
      + '<div><b>⑨ 채널 중앙값</b> ' + (c?.median != null ? nf(c.median) + '회 <small>(표본 ' + c.n + '편)</small>' : '미확인') + ' · <b>⑩ 채널 월 추정</b> ' + (chM != null ? M(chM, '표본 중앙값 ' + nf(c.median) + ' × 월 업로드 ' + nf(c.monthly, 1) + '편(최근 90일÷3) × ' + (r * 1000).toLocaleString('ko-KR') + '원 ÷ 1,000 · 채널 월 추정(영상 수익과 별개)') : '미확인') + '</div>'
      + '</div>';
  }
  function decorateCards() {
    const get = D()?.get; if (!get) return;
    for (const a of document.querySelectorAll('.grid article.item[data-id]')) {
      const v = get(a.dataset.id); if (!v) continue;
      const old = a.querySelector(':scope .v13-req');
      const sig = v.id + '|' + rpm() + '|' + chCacheSize;
      if (old && old.dataset.sig === sig) continue;
      const host = a.querySelector('.cardbody'); if (!host) continue;
      const tmp = document.createElement('div'); tmp.innerHTML = reqHTML(v); const el = tmp.firstChild; el.dataset.sig = sig;
      if (old) old.replaceWith(el); else { const pay = host.querySelector('.pay'); (pay || host.querySelector('.meta:last-of-type') || host.firstChild).after(el); }
    }
  }

  // ---------- VisibilityControl ----------
  const VKEY = 'lf-v13:vis:v1';
  const vis = Object.assign({ desc: true, mode: 'all' }, LS(VKEY, {}));
  function applyVis() {
    const r = document.documentElement.classList;
    r.toggle('v13-no-desc', !vis.desc || vis.mode === 'thumbs');
    r.toggle('v13-mode-numbers', vis.mode === 'numbers');
    r.toggle('v13-mode-mini', vis.mode === 'mini');
    const thumbsOn = !r.contains('v12-no-thumbs');
    const tb = document.getElementById('v13-thumbs'); if (tb) { tb.textContent = thumbsOn ? '썸네일 숨기기' : '썸네일 펼치기'; tb.setAttribute('aria-pressed', String(!thumbsOn)); }
    const db = document.getElementById('v13-desc'); if (db) { db.textContent = vis.desc ? '하단 설명 전체 숨기기' : '하단 설명 전체 펼치기'; db.setAttribute('aria-pressed', String(!vis.desc)); }
    const ms = document.getElementById('v13-mode'); if (ms) ms.value = vis.mode;
  }
  function setThumbs(show) {
    const v12btn = document.querySelector('[data-v12-toggle=thumbs]');
    const now = !document.documentElement.classList.contains('v12-no-thumbs');
    if (v12btn && now !== show) v12btn.click();
    const cb = document.getElementById('lf-layout-thumbs'); if (cb && cb.checked !== show) cb.click();
  }
  function buildVis() {
    const bar = document.querySelector('.lf-layout-tools'); if (!bar || document.getElementById('v13-thumbs')) return;
    bar.insertAdjacentHTML('beforeend', '<span class="v13-visbar"><button type="button" id="v13-thumbs"></button><button type="button" id="v13-desc"></button><label>보기 <select id="v13-mode"><option value="all">① 전체</option><option value="thumbs">② 썸네일만</option><option value="numbers">③ 숫자·설명만</option><option value="mini">④ 초간단 목록</option></select></label><label>열 <select id="v13-cols"><option value="auto">자동</option>' + [1, 2, 3, 4, 5, 6, 7, 8].map(n => '<option>' + n + '</option>').join('') + '</select></label><label title="동시에 재생할 수 있는 최대 플레이어 수">동시 재생 <input type="number" id="v13-maxp" min="1" max="8" step="1" style="width:46px"></label><label>재생 방식 <select id="v13-pmode"><option value="inline">① 카드 내 인라인 멀티</option><option value="compare">② 2~4개 나란히 비교</option><option value="legacy">③ 기존 하단 확장형</option><option value="float">④ 이동 가능한 재생창</option></select></label><button type="button" id="v13-pauseall">⏸ 전체 일시정지</button><label class="v13-local" title="사용권이 있는 내 컴퓨터 영상만 재생합니다. 서버로 업로드하지 않습니다.">⑤ 로컬 영상 <input type="file" id="v13-local" accept="video/*"></label></span>');
    document.getElementById('v13-thumbs').addEventListener('click', () => { const on = !document.documentElement.classList.contains('v12-no-thumbs'); setThumbs(!on); if (vis.mode === 'numbers' && !on) { vis.mode = 'all'; SS(VKEY, vis); } applyVis(); });
    document.getElementById('v13-desc').addEventListener('click', () => { vis.desc = !vis.desc; if (vis.mode === 'thumbs' && vis.desc) vis.mode = 'all'; SS(VKEY, vis); applyVis(); });
    document.getElementById('v13-mode').addEventListener('change', e => { vis.mode = e.target.value; if (vis.mode === 'thumbs') setThumbs(true); if (vis.mode === 'numbers') setThumbs(false); if (vis.mode === 'all') { setThumbs(true); vis.desc = true; } SS(VKEY, vis); applyVis(); });
    // columns
    const cs = document.getElementById('v13-cols'), saved = LS('lf-v13:cols', null);
    const setCols = val => { const r = document.documentElement; r.classList.toggle('v13-auto-cols', val === 'auto'); if (val !== 'auto') { r.style.setProperty('--cols', val); r.style.setProperty('--v13-cols', val); const o = document.getElementById('cols'); if (o && [...o.options].some(x => x.value === val)) o.value = val; } SS('lf-v13:cols', val); cs.value = val; };
    cs.addEventListener('change', () => setCols(cs.value));
    setCols(saved || document.getElementById('cols')?.value || '5');
    document.getElementById('cols')?.addEventListener('change', e => { if (e.isTrusted) setCols(e.target.value); });
    // players
    const mp = document.getElementById('v13-maxp'); mp.value = player.max; mp.addEventListener('change', () => { player.max = Math.min(8, Math.max(1, Number(mp.value) || 3)); mp.value = player.max; SS('lf-v13:maxp', player.max); });
    const pm = document.getElementById('v13-pmode'); pm.value = player.mode; pm.addEventListener('change', () => { player.mode = pm.value; SS('lf-v13:pmode', player.mode); });
    document.getElementById('v13-pauseall').addEventListener('click', () => player.all('pauseVideo'));
    document.getElementById('v13-local').addEventListener('change', e => { const f = e.target.files?.[0]; if (f) player.local(f); e.target.value = ''; });
    applyVis();
  }

  // ---------- InlineMultiPlayer ----------
  const ERR = { 2: '잘못된 영상 ID/매개변수', 5: 'HTML5 플레이어 오류', 100: '영상 없음(삭제·비공개)', 101: '소유자가 외부 삽입 재생을 금지', 150: '소유자가 외부 삽입 재생을 금지', 153: '삽입 요청 출처 정보 부족(브라우저·확장 제한 가능)' };
  let audit = null;
  const player = {
    mode: LS('lf-v13:pmode', 'inline'), max: LS('lf-v13:maxp', 3), list: [],
    count() { this.list = this.list.filter(p => p.el.isConnected); return this.list.length; },
    toast(msg) { let t = document.getElementById('v13-toast'); if (!t) { t = document.createElement('div'); t.id = 'v13-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 4200); },
    frame(id, title) {
      const wrap = document.createElement('div'); wrap.className = 'v13-player'; wrap.dataset.id = id;
      const a = audit && audit[id];
      const pre = a && a.e && a.e !== 'ok' && a.e !== 'unchecked' ? '<div class="v13-perr">사전 점검: ' + esc(({ embed_disabled: '소유자가 삽입 재생 금지(oEmbed 401)', not_found: '영상 없음·비공개(oEmbed 404)', forbidden: '접근 제한(403)', bad: '요청 오류', unknown: '확인 불가' })[a.e] || a.e) + ' → 원본에서 재생하세요.</div>' : '';
      wrap.innerHTML = pre + '<iframe allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="' + esc(title || id) + ' 재생" src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin=' + encodeURIComponent(location.origin) + '"></iframe><div class="v13-pbar"><button type="button" data-p="stop" title="이 플레이어만 정지·닫기">■ 정지</button><button type="button" data-p="pause">⏸</button><button type="button" data-p="play">▶</button><button type="button" data-p="solo" title="이 영상 소리만 켜고 다른 플레이어 음소거">🔊 이 소리만</button><button type="button" data-p="fs">⛶</button><a href="https://www.youtube.com/watch?v=' + encodeURIComponent(id) + '" target="_blank" rel="noopener noreferrer">원본 재생</a><span class="v13-pmsg" aria-live="polite"></span></div>';
      const ifr = wrap.querySelector('iframe');
      ifr.addEventListener('load', () => { try { ifr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: id }), '*'); } catch { /* cross-origin ok */ } });
      const p = { id, el: wrap, ifr }; this.list.push(p); return p;
    },
    cmd(p, func, args = []) { try { p.ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch { /* ignore */ } },
    all(func) { this.count(); for (const p of this.list) this.cmd(p, func); },
    canAdd() { if (this.count() >= this.max) { this.toast('동시 재생 최대 ' + this.max + '개입니다. 기존 플레이어를 ■ 정지로 닫거나 상단 "동시 재생" 수를 늘리세요. (자동으로 닫지 않습니다)'); return false; } return true; },
    inline(btn, id, title) {
      const art = btn.closest('article'); if (!art) return false;
      if (art.querySelector('.v13-player')) { this.toast('이미 이 카드에서 재생 중입니다.'); return true; }
      if (!this.canAdd()) return true;
      const p = this.frame(id, title); btn.hidden = true; btn.before(p.el); p.restore = () => { btn.hidden = false; }; return true;
    },
    dock(id, title) {
      let d = document.getElementById('v13-dock');
      if (!d) { d = document.createElement('section'); d.id = 'v13-dock'; d.setAttribute('aria-label', '나란히 비교 재생'); d.innerHTML = '<div class="v13-dhead"><strong>나란히 비교 (최대 4개)</strong><button type="button" data-dock-close>비교 영역 닫기</button></div><div class="v13-dgrid"></div>'; (document.getElementById('gridTop') || document.body).before(d); d.querySelector('[data-dock-close]').addEventListener('click', () => d.remove()); }
      const g = d.querySelector('.v13-dgrid'); if (g.children.length >= Math.min(4, this.max)) { this.toast('나란히 비교는 최대 ' + Math.min(4, this.max) + '개입니다. 하나를 ■ 정지로 닫으세요.'); return; }
      if (!this.canAdd()) return;
      const p = this.frame(id, title); g.appendChild(p.el); d.scrollIntoView({ block: 'nearest' });
    },
    float(id, title, node) {
      let w = document.getElementById('v13-float');
      if (!w) {
        w = document.createElement('section'); w.id = 'v13-float'; w.setAttribute('aria-label', '이동 가능한 재생창'); w.innerHTML = '<div class="v13-fhead" title="끌어서 이동">⠿ 재생창 <button type="button" data-float-min>접기</button><button type="button" data-float-close>닫기</button></div><div class="v13-fbody"></div>';
        document.body.appendChild(w); const pos = LS('lf-v13:floatpos', { x: 24, y: 120 }); w.style.left = pos.x + 'px'; w.style.top = pos.y + 'px';
        const h = w.querySelector('.v13-fhead'); let sx, sy, ox, oy;
        h.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; sx = e.clientX; sy = e.clientY; ox = w.offsetLeft; oy = w.offsetTop; h.setPointerCapture(e.pointerId); });
        h.addEventListener('pointermove', e => { if (sx == null) return; w.style.left = Math.max(0, ox + e.clientX - sx) + 'px'; w.style.top = Math.max(0, oy + e.clientY - sy) + 'px'; });
        h.addEventListener('pointerup', () => { if (sx == null) return; sx = null; SS('lf-v13:floatpos', { x: w.offsetLeft, y: w.offsetTop }); });
        w.querySelector('[data-float-close]').addEventListener('click', () => w.remove());
        w.querySelector('[data-float-min]').addEventListener('click', e => { const b = w.querySelector('.v13-fbody'); b.hidden = !b.hidden; e.target.textContent = b.hidden ? '펼치기' : '접기'; });
      }
      if (node) { w.querySelector('.v13-fbody').appendChild(node); return; }
      if (!this.canAdd()) return;
      const p = this.frame(id, title); w.querySelector('.v13-fbody').appendChild(p.el);
    },
    local(file) {
      const url = URL.createObjectURL(file); const box = document.createElement('div'); box.className = 'v13-player v13-localp';
      box.innerHTML = '<video controls playsinline src="' + url + '"></video><div class="v13-pbar"><button type="button" data-p="stop">■ 정지</button><span class="v13-pmsg">' + esc(file.name) + ' · 로컬 재생(업로드 없음)</span></div>';
      const p = { id: 'local', el: box, local: true }; p.restore = () => URL.revokeObjectURL(url); this.list.push(p); this.float(null, null, box);
    },
    open(id, title, btn) {
      if (this.mode === 'legacy') return false;
      if (this.mode === 'inline') { if (btn && btn.closest('.grid article')) return this.inline(btn, id, title); this.dock(id, title); return true; }
      if (this.mode === 'compare') { this.dock(id, title); return true; }
      if (this.mode === 'float') { this.float(id, title); return true; }
      return false;
    }
  };
  window.LFPlayer = player;
  document.addEventListener('click', e => {
    const b = e.target.closest('.grid article [data-play]');
    if (b && player.mode !== 'legacy') {
      e.preventDefault(); e.stopImmediatePropagation();
      const art = b.closest('article'); const title = art?.querySelector('.cardtitle')?.textContent?.trim() || '';
      player.open(b.dataset.play, title, b); return;
    }
    const pb = e.target.closest('.v13-pbar [data-p]'); if (!pb) return;
    const el = pb.closest('.v13-player'); const p = player.list.find(x => x.el === el); if (!p) return;
    const k = pb.dataset.p;
    if (k === 'stop') { if (p.ifr) player.cmd(p, 'stopVideo'); el.remove(); p.restore && p.restore(); player.count(); const g = document.querySelector('#v13-dock .v13-dgrid'); if (g && !g.children.length) document.getElementById('v13-dock')?.remove(); const fb = document.querySelector('#v13-float .v13-fbody'); if (fb && !fb.children.length) document.getElementById('v13-float')?.remove(); }
    else if (k === 'pause') player.cmd(p, 'pauseVideo');
    else if (k === 'play') player.cmd(p, 'playVideo');
    else if (k === 'solo') { player.count(); for (const q of player.list) { if (!q.ifr) continue; player.cmd(q, q === p ? 'unMute' : 'mute'); } el.querySelector('.v13-pmsg').textContent = '이 영상 소리만 켬'; }
    else if (k === 'fs') { const t = p.ifr || el.querySelector('video'); (t.requestFullscreen || t.webkitRequestFullscreen)?.call(t); }
  }, true);
  window.addEventListener('message', e => {
    let host = ''; try { host = new URL(e.origin).hostname; } catch { return; } if (!/youtube(-nocookie)?\.com$/.test(host)) return;
    let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (!d || d.event !== 'onError') return;
    const p = player.list.find(x => x.ifr && x.ifr.contentWindow === e.source); if (!p) return;
    const m = p.el.querySelector('.v13-pmsg'); m.textContent = '재생 제한: ' + (ERR[d.info] || ('오류 ' + d.info)) + ' → 원본 재생 버튼을 쓰세요'; m.classList.add('v13-red'); p.el.classList.add('v13-blocked');
  });

  // ---------- thumbnail audit badges ----------
  function decorateAudit() {
    if (!audit) return;
    for (const a of document.querySelectorAll('.grid article.item[data-id]')) {
      const it = audit[a.dataset.id]; if (!it || a.querySelector('.v13-audit')) continue;
      const parts = []; if (it.t && it.t !== 'ok') parts.push(it.tf ? '기본 썸네일 없음 → 대체 썸네일' : '썸네일 없음(' + it.t + ')');
      if (it.e && it.e !== 'ok') parts.push(({ embed_disabled: '삽입 재생 금지', not_found: '영상 없음·비공개', forbidden: '접근 제한', unchecked: '재생 가능 여부 미확인', unknown: '재생 가능 여부 미확인', bad: '점검 오류' })[it.e] || it.e);
      if (!parts.length) continue;
      const host = a.querySelector('.cardbody'); host?.insertAdjacentHTML('afterbegin', '<div class="v13-audit" title="2026-11-28 공개 점검 결과 · 외부 서버 제한은 제한/미확인으로 표시">⚠ ' + esc(parts.join(' · ')) + ' · <a href="https://www.youtube.com/watch?v=' + esc(a.dataset.id) + '" target="_blank" rel="noopener noreferrer">원본 재생</a></div>');
    }
  }

  // ---------- EditableSidebar add-ons: description, undo, cancel ----------
  const DESC_KEY = 'lf-v13:menudesc:v1';
  const desc = LS(DESC_KEY, {});
  const snapLayout = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith('lf-layout:v1:') || k === DESC_KEY)) o[k] = localStorage.getItem(k); } return o; };
  const restoreLayout = o => { const cur = snapLayout(); for (const k of Object.keys(cur)) if (!(k in o)) localStorage.removeItem(k); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); location.reload(); };
  let editStart = null; const mhist = [];
  function paintDesc() { for (const b of document.querySelectorAll('[data-section]')) { const k = b.dataset.section, t = desc[k]; let s = b.querySelector('.v13-mdesc'); if (t) { if (!s) { s = document.createElement('small'); s.className = 'v13-mdesc'; b.appendChild(s); } s.textContent = t; b.title = t; } else if (s) s.remove(); } }
  function buildMenuEdit() {
    const bar = document.querySelector('.lf-menu-editbar'); if (!bar || bar.querySelector('.v13-medit')) return;
    bar.insertAdjacentHTML('beforeend', '<span class="v13-medit" hidden><button type="button" data-m="desc">선택 메뉴 설명 편집</button><button type="button" data-m="undo">되돌리기</button><button type="button" data-m="save">저장(편집 종료)</button><button type="button" data-m="cancel">취소(편집 전으로)</button></span>');
    const box = bar.querySelector('.v13-medit');
    const sync = () => { const on = !!document.querySelector('.lf-menu-editing'); box.hidden = !on; if (on && !editStart) { editStart = snapLayout(); mhist.length = 0; } if (!on) editStart = null; };
    new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    const side = document.querySelector('.lf-layout-side') || document.body;
    new MutationObserver(() => { if (editStart) { const s = snapLayout(); const last = mhist[mhist.length - 1]; if (!last || JSON.stringify(last) !== JSON.stringify(s)) mhist.push(s); } }).observe(side, { subtree: true, childList: true, characterData: true });
    let lastSel = null; side.addEventListener('click', e => { const b = e.target.closest('[data-section]'); if (b) lastSel = b.dataset.section; }, true);
    box.addEventListener('click', e => {
      const k = e.target.dataset.m; if (!k) return;
      if (k === 'desc') { const key = lastSel || document.querySelector('[data-section][aria-pressed=true]')?.dataset.section; if (!key) return; const t = prompt('메뉴 설명 (비우면 삭제). 메뉴 ID·주소는 바뀌지 않습니다.', desc[key] || ''); if (t == null) return; mhist.push(snapLayout()); if (t.trim()) desc[key] = t.trim(); else delete desc[key]; SS(DESC_KEY, desc); paintDesc(); }
      if (k === 'undo') { if (mhist.length < 2) { player.toast('되돌릴 변경이 없습니다.'); return; } mhist.pop(); restoreLayout(mhist[mhist.length - 1]); }
      if (k === 'cancel') { if (editStart) restoreLayout(editStart); }
      if (k === 'save') { editStart = null; document.querySelector('.lf-menu-edit')?.click(); }
    });
    sync(); paintDesc();
  }

  // ---------- styles ----------
  const css = `
.v13-red,.v13-red b{color:#ff4d4d!important;font-weight:700}
.v13-req{font-size:12px;line-height:1.45;margin:4px 0;padding:4px 6px;border-left:3px solid #c0392b;background:rgba(255,255,255,.03);border-radius:4px}.v13-req small{opacity:.75}
.v13-audit{font-size:11px;color:#ffb347;margin:2px 0}
html.v13-no-desc .grid article .cardbody>*:not(.cardtitle):not(.gpt-title):not(.v13-player){display:none!important}
html.v13-no-desc .grid article{contain-intrinsic-size:auto 200px}
html.v13-mode-numbers .grid article .thumb{display:none!important}
html.v13-mode-mini .grid{grid-template-columns:1fr!important;gap:4px}
html.v13-mode-mini .grid article{display:flex;align-items:center;gap:8px;contain-intrinsic-size:auto 60px}
html.v13-mode-mini .grid article .thumb{flex:0 0 112px;width:112px}html.v13-mode-mini .grid article .thumb img{width:112px;height:63px;object-fit:cover}
html.v13-mode-mini .grid article .thumb .play-mark,html.v13-mode-mini .grid article .thumb .length{font-size:10px}
html.v13-mode-mini .grid article .cardbody{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;padding:4px}
html.v13-mode-mini .grid article .cardbody>*:not(.cardtitle):not(.meta):not(.pay):not(.gpt-title):not(.v13-player){display:none!important}
html.v13-mode-mini .grid article .pay{display:flex;gap:8px}
html.v13-auto-cols .grid{grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr))!important}
html:not(.v13-auto-cols) .grid{grid-template-columns:repeat(var(--v13-cols,var(--cols)),minmax(0,1fr))}
@media(max-width:1100px){html:not(.v13-auto-cols) .grid{grid-template-columns:repeat(min(4,var(--v13-cols,var(--cols))),minmax(0,1fr))}}
@media(max-width:850px){html:not(.v13-auto-cols) .grid{grid-template-columns:repeat(min(3,var(--v13-cols,var(--cols))),minmax(0,1fr))}}
@media(max-width:610px){html:not(.v13-auto-cols) .grid{grid-template-columns:repeat(min(2,var(--v13-cols,var(--cols))),minmax(0,1fr))}}
.v13-visbar{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;margin-left:8px}.v13-visbar button,.v13-sortctl button,.v13-medit button{font-size:12px;padding:3px 8px}
.v13-visbar button[aria-pressed=true],.v13-sortctl button[aria-pressed=true]{color:#ff4d4d;border-color:#ff4d4d;font-weight:700}
.v13-sortctl{display:inline-flex;gap:4px;align-items:flex-end}.v13-sortctl.v13-on select{color:#ff4d4d;border-color:#ff4d4d;font-weight:700}select.v13-dim{opacity:.55}
.v13-rgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(430px,100%),1fr));gap:4px 14px;margin:6px 0}
.v13-rg{display:flex;flex-wrap:wrap;align-items:center;gap:4px;font-size:12px}.v13-rl{flex:0 0 150px}.v13-rg input{width:86px}.v13-rg select{width:52px}.v13-rg.v13-bad input{border-color:#ff4d4d;outline:1px solid #ff4d4d}.v13-err{color:#ff4d4d;flex-basis:100%}
.v13-player{position:relative;width:100%;background:#000}.v13-player iframe,.v13-player video{display:block;width:100%;aspect-ratio:16/9;border:0}
.v13-pbar{display:flex;flex-wrap:wrap;gap:3px;align-items:center;padding:3px;background:#111;font-size:11px}.v13-pbar button{font-size:11px;padding:1px 6px}.v13-pbar a{font-size:11px;margin-left:4px}.v13-pmsg{font-size:11px;opacity:.9}
.v13-perr{font-size:11px;color:#ffb347;padding:3px;background:#221}
.v13-blocked iframe{opacity:.35}
#v13-dock{margin:8px 0;padding:6px;border:1px solid #c0392b;border-radius:8px}.v13-dhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}.v13-dgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:8px}
#v13-float{position:fixed;z-index:9000;width:min(480px,92vw);background:#111;border:1px solid #555;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.6);resize:both;overflow:auto;max-height:90vh}.v13-fhead{cursor:move;user-select:none;padding:4px 8px;background:#222;display:flex;gap:6px;align-items:center;font-size:12px}.v13-fbody{display:grid;gap:6px;padding:4px}
#v13-toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9500;background:#222;color:#fff;border:1px solid #c0392b;padding:8px 12px;border-radius:8px;max-width:90vw;font-size:13px}
.v13-mdesc{display:block;font-size:10px;opacity:.7;white-space:normal}
`;

  window.LFV13UI = {
    mount() {
      if (window.__v13) return; window.__v13 = true;
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      rangeFromURL(); buildRange(); buildSort(); buildVis(); buildMenuEdit(); watchChips(); chips();
      fetch('lf-media-audit.json').then(r => r.ok ? r.json() : null).then(j => { if (j) { audit = j.items || {}; decorateAudit(); } }).catch(() => {});
      let pend = false;
      new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; decorateCards(); decorateAudit(); applyVis(); if (!document.getElementById('v13-thumbs')) buildVis(); if (!document.querySelector('.v13-medit')) buildMenuEdit(); }); }).observe(document.getElementById('grid') || document.body, { childList: true, subtree: true });
      document.getElementById('rpm')?.addEventListener('change', () => setTimeout(decorateCards, 60));
      decorateCards(); applyVis();
      actCache = null; if (active().length || sort.key) { rerender(); setTimeout(() => { actCache = null; rerender(); chips(); }, 1500); }
    },
    parseNum
  };
})();
