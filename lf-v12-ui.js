/* V12: common money format, view toggles, panel fold, table grid/list/compact, sortable headers, preview player, search debounce, filter chips, playlist research panel. */
'use strict';
(function () {
  const LS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* optional */ } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nf = x => Math.trunc(x).toLocaleString('ko-KR');
  // 1) Money: 억·만 원, truncate below 만; <1만 shows 원 units. Raw number kept in data-n/title.
  function fmt(x) {
    if (x == null || x === '' || !Number.isFinite(Number(x))) return '미확인';
    const n = Number(x), neg = n < 0, v = Math.floor(Math.abs(n));
    if (v < 10000) return (neg ? '-' : '') + v.toLocaleString('ko-KR') + '원';
    const e = Math.floor(v / 1e8), m = Math.floor(v % 1e8 / 1e4);
    return (neg ? '-' : '') + [e ? e + '억' : '', m ? m + '만' : ''].filter(Boolean).join(' ') + ' 원';
  }
  function html(x, formula) {
    if (x == null || !Number.isFinite(Number(x))) return '<span class="krw" data-n="">미확인</span>';
    return '<span class="krw" data-n="' + Number(x) + '" title="정확 ' + esc(Number(x).toLocaleString('ko-KR')) + '원' + (formula ? ' · 계산식: ' + esc(formula) : ' · 계산식은 표 위 설명 참조') + '">' + fmt(x) + '</span>';
  }
  window.LFMoney = { fmt, html };
  // GPT research medal + filter
  const GPT_KEY = 'lf-v12:gpt:v1';
  const LFGPT = window.LFGPT = { mode: LS(GPT_KEY, 'all'), ids: null, has(v) { return !!v && (((v.src || []).includes('GPT 조사')) || !!(this.ids && this.ids.has(v.id))); }, ok(v) { return this.mode === 'all' ? true : this.mode === 'only' ? this.has(v) : !this.has(v); } };
  const MEDAL_SVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="52" height="18" viewBox="0 0 52 18"><rect x="0.5" y="0.5" width="51" height="17" rx="4" fill="#FFEB00" stroke="#E00000"/><text x="26" y="13.2" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="11.5" font-weight="900" fill="#E00000">★ GPT</text></svg>');
  const MEDAL = '<span class="gpt-medal" title="어시스턴트(GPT)가 직접 조사·추가한 영상"><img src="' + MEDAL_SVG + '" alt="★ GPT" width="52" height="18" style="display:block;width:52px;height:18px;border:0;filter:none"></span>';
  function rowId(tr) { const s = new Set([...tr.querySelectorAll('a[href*="watch?v="],a[href*="/shorts/"]')].map(a => (a.getAttribute('href').match(/(?:v=|shorts\/)([\w-]{11})/) || [])[1]).filter(Boolean)); return s.size === 1 ? [...s][0] : null; }
  function mark(thumb, titleHost, on, after) {
    for (const m of [thumb && thumb.querySelector(':scope>.gpt-medal'), titleHost && titleHost.querySelector('.gpt-title')]) if (m && !on) m.remove();
    if (!on) return;
    if (thumb && !thumb.querySelector(':scope>.gpt-medal')) { thumb.classList.add('gpt-thumb'); thumb.insertAdjacentHTML('beforeend', MEDAL); }
    let tm = titleHost && titleHost.querySelector('.gpt-title');
    if (titleHost && !tm) { const s = document.createElement('span'); s.className = 'gpt-title'; s.innerHTML = MEDAL; if (after) after.after(s); else titleHost.appendChild(s); tm = s; }
    if (tm) { const r = document.documentElement.classList; const off = r.contains('v12-no-thumbs') || r.contains('v13-mode-numbers') || !!document.querySelector('.lf-layout-no-thumbs'); const vis = !!thumb && !off && !thumb.hidden; if (tm.hidden !== vis) tm.hidden = vis; }
  }
  function decorate() {
    if (!LFGPT.ids) return;
    for (const a of document.querySelectorAll('.grid article[data-id]')) { const ttl = a.querySelector('.cardtitle'); mark(a.querySelector('.thumb'), ttl ? ttl.parentElement : null, LFGPT.ids.has(a.dataset.id), ttl); }
    for (const tr of document.querySelectorAll('.lf-panel tbody tr')) { const id = rowId(tr); if (!id) continue; const on = LFGPT.ids.has(id); const th = tr.querySelector('a.v12-th,a:has(>img[src*="ytimg"])'); const cell = (th && th.closest('td,th')) || tr.querySelector('th') || tr.cells[1]; mark(th, cell, on, null); tr.hidden = LFGPT.mode !== 'all' && !LFGPT.ok({ id }); }
  }
  window.LFGPTDecorate = decorate;

  // 2) View toggles (independent, persisted)
  const UI_KEY = 'lf-v12:ui:v1', ui = Object.assign({ thumbs: true, analysis: true, metrics: true }, LS(UI_KEY, {}));
  const applyUI = () => { const r = document.documentElement.classList; r.toggle('v12-no-thumbs', !ui.thumbs); r.toggle('v12-no-analysis', !ui.analysis); r.toggle('v12-no-metrics', !ui.metrics); for (const b of document.querySelectorAll('[data-v12-toggle]')) { const k = b.dataset.v12Toggle; b.setAttribute('aria-pressed', String(ui[k])); b.textContent = ({ thumbs: '썸네일', analysis: '분석글', metrics: '상세 지표' })[k] + (ui[k] ? ' 숨기기' : ' 표시'); } };
  const css = `
html.v12-no-thumbs .grid article .thumb,html.v12-no-thumbs .lf-panel img[src*="ytimg"],html.v12-no-thumbs .v12-th{display:none!important}
html.v12-no-analysis .grid article .lf-labels,html.v12-no-analysis .grid article small.lf-gray,html.v12-no-analysis .lf-panel .lf-hint,html.v12-no-analysis .lf-panel .lf-card-mini{display:none!important}
html.v12-no-metrics .grid article .v6-card{display:none!important}
#v12-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}#v12-bar button,.v12-tools button,.v12-chip{font-size:12px;padding:3px 8px;border-radius:6px;border:1px solid #3a4256;background:#1b2130;color:inherit;cursor:pointer}
#v12-bar button[aria-pressed=false]{opacity:.75}.v12-chips{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}.v12-chip{border-color:#c0392b}.v12-chip b{margin-left:4px}
.v12-adv{margin:4px 0}.v12-adv>summary{cursor:pointer;font-size:13px;color:#9fb0d0}.v12-adv .controls{margin-top:6px}
.gpt-medal{display:inline-block;line-height:0;padding:0;border:0;background:none;box-shadow:0 1px 3px rgba(0,0,0,.6);border-radius:4px}.gpt-medal img{display:block;width:52px!important;height:18px!important;aspect-ratio:auto!important;object-fit:fill!important;border-radius:4px}.gpt-thumb{position:relative}.gpt-thumb>.gpt-medal{position:absolute;top:4px;right:4px;z-index:3;pointer-events:none}.gpt-title{margin-left:4px;vertical-align:middle}.gpt-title[hidden]{display:none!important}
.v12-sum{margin-left:8px;color:#8a93a6;font-weight:400;font-size:12px}
.v12-tools{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:4px 0;font-size:12px}.v12-tools [aria-pressed=true]{border-color:#e74c3c;color:#ff8b7b}
.v12-sortable{cursor:pointer;white-space:nowrap}.v12-sortable .v12-ar{font-size:10px;color:#6c7891;margin-left:2px}.v12-sortable[data-dir=desc] .v12-ar{color:#ff6b5b}.v12-sortable[data-dir=asc] .v12-ar{color:#ff6b5b}
.v12-mode-grid table{display:block;border:0}.v12-mode-grid thead{display:none}.v12-mode-grid tbody{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr));gap:10px}
.v12-mode-grid tr{display:flex;flex-direction:column;border:1px solid #2f3747;border-radius:8px;padding:8px;background:rgba(255,255,255,.03);min-width:0}
.v12-mode-grid td,.v12-mode-grid tbody th{display:block;border:0!important;padding:2px 0!important;text-align:left;white-space:normal;overflow-wrap:anywhere}
.v12-mode-grid td[data-label]::before{content:attr(data-label) " · ";color:#8a93a6;font-size:11px}
.v12-mode-grid img[src*="ytimg"]{width:100%!important;height:auto!important;aspect-ratio:16/9;object-fit:cover;display:block;border-radius:6px}
.v12-mode-compact td,.v12-mode-compact th{padding:2px 4px!important;font-size:12px;line-height:1.3}.v12-mode-compact img[src*="ytimg"]{width:64px!important;height:36px!important;object-fit:cover;vertical-align:middle}.v12-mode-compact small{font-size:10px}.v12-mode-compact tbody th{min-width:300px;max-width:420px}.v12-mode-compact tbody th a.v12-th,.v12-mode-compact tbody th>a:first-child{float:left;margin-right:6px}.v12-mode-compact td{white-space:nowrap}
.v12-th{display:inline-block;position:relative;vertical-align:middle;margin-right:4px}.v12-th img{width:96px;height:54px;object-fit:cover;border-radius:4px}
.lf-panel a:has(>img[src*="ytimg"]),.v12-th{position:relative;display:inline-block}.lf-panel a:has(>img[src*="ytimg"])::after,.v12-th::after{content:"▶";position:absolute;left:4px;bottom:4px;font-size:10px;background:rgba(0,0,0,.7);color:#fff;border-radius:3px;padding:0 4px}
#v12-player{max-width:min(960px,96vw);width:96vw;background:#111;color:#eee;border:1px solid #444;border-radius:10px;padding:8px}#v12-player iframe{width:100%;aspect-ratio:16/9;border:0}#v12-player .row{display:flex;justify-content:space-between;gap:8px;margin-top:6px}
`;
  // 3) Player
  function play(id, title) {
    if (window.LFPlayer && window.LFPlayer.mode !== 'legacy') { window.LFPlayer.open(id, title); return; }
    let d = document.getElementById('v12-player');
    if (!d) { d = document.createElement('dialog'); d.id = 'v12-player'; document.body.appendChild(d); d.addEventListener('close', () => { d.innerHTML = ''; }); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
    if (!d.showModal) { window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener'); return; }
    d.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="' + esc(title || id) + '"></iframe><div class="row"><span>' + esc(title || '') + ' <small>재생이 막히면 원본에서 여세요</small></span><span><a href="https://www.youtube.com/watch?v=' + encodeURIComponent(id) + '" target="_blank" rel="noopener noreferrer">원본 영상 열기</a> <button type="button" data-v12-close>닫기</button></span></div>';
    d.showModal();
  }
  // 4) Table enhancement: sorting + views
  const TV_KEY = 'lf-v12:tview:v1';
  let tview = LS(TV_KEY, 'table');
  const vidOf = el => { const a = el.querySelector('a[href*="watch?v="],a[href*="/shorts/"],img[src*="/vi/"]'); if (!a) return null; const s = a.getAttribute('href') || a.getAttribute('src'); const m = s.match(/(?:v=|shorts\/|\/vi\/)([\w-]{11})/); return m ? m[1] : null; };
  function cellValue(c) {
    if (!c) return null;
    const k = c.querySelectorAll('.krw[data-n]');
    if (k.length) { const vals = [...k].map(x => x.dataset.n === '' ? null : Number(x.dataset.n)); const pick = vals.length === 3 ? vals[1] : vals[0]; return pick == null ? null : pick; }
    if (c.dataset.n !== undefined) return c.dataset.n === '' ? null : Number(c.dataset.n);
    const t = (c.textContent || '').trim();
    if (!t || /^(미확인|미산정|미분석|-|없음|null)$/.test(t) || /^(미확인|미산정)/.test(t)) return null;
    let m = t.match(/^(\d{4}-\d{2}-\d{2})/); if (m) return Date.parse(m[1]);
    m = t.match(/^(-?)(?:(\d+)억)?\s*(?:(\d[\d,]*)만)?\s*(?:(\d[\d,]*)원?)?/);
    if (m && (m[2] || m[3])) return (m[1] ? -1 : 1) * ((+m[2] || 0) * 1e8 + (+String(m[3] || '0').replace(/,/g, '')) * 1e4);
    m = t.match(/^-?[\d,]+(?:\.\d+)?/); if (m) return Number(m[0].replace(/,/g, ''));
    return t.toLowerCase();
  }
  function sortTable(tb, col, dir) {
    const body = tb.tBodies[0]; if (!body) return;
    const rows = [...body.rows];
    rows.sort((a, b) => { const x = cellValue(a.cells[col]), y = cellValue(b.cells[col]); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; const r = typeof x === 'string' || typeof y === 'string' ? String(x).localeCompare(String(y), 'ko') : x - y; return dir === 'asc' ? r : -r; });
    for (const r of rows) body.appendChild(r);
    for (const th of tb.querySelectorAll('thead th')) { th.dataset.dir = th.cellIndex === col ? dir : ''; }
    const sel = tb._tools?.querySelector('[data-v12-sortcol]'); if (sel) sel.value = String(col);
  }
  function enhance(tb) {
    if (tb.dataset.v12) return; tb.dataset.v12 = '1';
    const heads = [...tb.querySelectorAll('thead th')].map(th => th.textContent.trim());
    if (!tb.tBodies[0] || !heads.length) return;
    tb.querySelectorAll('thead th').forEach((th, i) => { if (!heads[i]) return; th.classList.add('v12-sortable'); th.title = '클릭: 높은 순 ▼ / 다시 클릭: 낮은 순 ▲ · 미확인은 항상 맨 뒤'; th.insertAdjacentHTML('beforeend', '<span class="v12-ar">▲▼</span>'); th.addEventListener('click', () => sortTable(tb, i, th.dataset.dir === 'desc' ? 'asc' : 'desc')); });
    const rows = [...tb.tBodies[0].rows];
    for (const r of rows) for (const c of r.cells) if (c.tagName === 'TD' && heads[c.cellIndex]) c.dataset.label = heads[c.cellIndex];
    // video table? rows with exactly one distinct video id
    let vids = 0;
    for (const r of rows) { const ids = new Set([...r.querySelectorAll('a[href*="watch?v="],a[href*="/shorts/"]')].map(a => (a.getAttribute('href').match(/(?:v=|shorts\/)([\w-]{11})/) || [])[1]).filter(Boolean)); if (ids.size === 1) { vids++; if (!r.querySelector('img[src*="ytimg"]')) { const id = [...ids][0], a = r.querySelector('a[href*="' + id + '"]'), cell = a.closest('td,th'); cell.insertAdjacentHTML('afterbegin', '<a class="v12-th" href="https://www.youtube.com/watch?v=' + id + '" data-v12-play="' + id + '"><img src="https://i.ytimg.com/vi/' + id + '/mqdefault.jpg" alt="" width="96" height="54" loading="lazy" referrerpolicy="no-referrer"></a>'); } } }
    const host = tb.closest('.lf-table-wrap') || tb;
    host.classList.add('v12-host');
    const isVideo = rows.length && vids / rows.length >= 0.5;
    const tools = document.createElement('div'); tools.className = 'v12-tools';
    tools.innerHTML = (isVideo ? '<span>보기</span><button type="button" data-v12-view="grid">① 바둑판</button><button type="button" data-v12-view="table">② 표</button><button type="button" data-v12-view="compact">③ 압축 목록</button>' : '') + '<label>정렬 <select data-v12-sortcol>' + heads.map((h, i) => h ? '<option value="' + i + '">' + esc(h) + '</option>' : '').join('') + '</select></label><button type="button" data-v12-sortdir="desc">높은 순 ▼</button><button type="button" data-v12-sortdir="asc">낮은 순 ▲</button><small>' + rows.length + '행</small>';
    host.parentNode.insertBefore(tools, host);
    tools._tb = tb; tools._host = host; tb._tools = tools;
    if (isVideo) { host.dataset.v12video = '1'; setMode(host, tview); }
    syncTools();
  }
  function setMode(host, m) { host.classList.remove('v12-mode-grid', 'v12-mode-table', 'v12-mode-compact'); host.classList.add('v12-mode-' + m); }
  function syncTools() { for (const b of document.querySelectorAll('[data-v12-view]')) b.setAttribute('aria-pressed', String(b.dataset.v12View === tview)); }
  function scan(root) { for (const tb of (root || document).querySelectorAll('.lf-panel table, #lf-v12 table')) enhance(tb); for (const h of document.querySelectorAll('[data-v12video]')) if (!h.classList.contains('v12-mode-' + tview)) setMode(h, tview); }
  // 5) Text money normalizer for modules that print raw "123,456,789원"
  const MONEY_RE = /(-?\d{1,3}(?:,\d{3}){1,}|-?\d{5,})\s?원(?![가-힣])/g;
  const MONEY_T = /(\d{1,3}(?:,\d{3})+|\d{5,})\s?원(?![가-힣])/;
  function normalizeMoney(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement && !n.parentElement.closest('script,style,textarea,input,.krw,code,select,option') && MONEY_T.test(n.nodeValue)) ? 1 : 2 });
    const list = []; let n; while ((n = w.nextNode())) list.push(n);
    for (const t of list) { MONEY_RE.lastIndex = 0; const s = t.nodeValue; const span = document.createElement('span'); span.innerHTML = esc(s).replace(MONEY_RE, (all, num) => html(Number(num.replace(/,/g, '')))); t.replaceWith(...span.childNodes); }
  }
  // 6) Panels: fold all + summary badges
  const SUM_KEY = 'lf-v12:sum:v1', sums = LS(SUM_KEY, {});
  function panels() { return [...document.querySelectorAll('details.lf-panel, details#ranges')]; }
  function badge(d) { const s = d.querySelector(':scope>summary'); if (!s) return; let b = s.querySelector('.v12-sum'); if (!b) { b = document.createElement('small'); b.className = 'v12-sum'; s.appendChild(b); } const tb = d.querySelectorAll('table'), rows = [...tb].reduce((a, t) => a + (t.tBodies[0]?.rows.length || 0), 0); if (d.open && tb.length) { sums[d.id] = '표 ' + tb.length + '개 · ' + rows.toLocaleString('ko-KR') + '행'; SS(SUM_KEY, sums); } b.textContent = sums[d.id] ? '· ' + sums[d.id] : (d.open ? '' : '· 접힘'); }
  // 7) Filters: core visible, advanced folded, chips
  const DEF = { gptf: 'all', q: '', days: 'all', sort: 'views', rpm: '2', pagesize: '100', cols: '5', vmin: '', vmax: '', mmin: '', mmax: '', vfrom: '', vto: '' };
  const LABEL = { gptf: 'GPT 조사', q: '검색', days: '게시 기간', sort: '정렬', rpm: '추정 단가', pagesize: '한 화면', cols: '열 수', vmin: '조회 최소', vmax: '조회 최대', mmin: '추정액 최소', mmax: '추정액 최대', vfrom: '게시 시작', vto: '게시 끝' };
  function chips() {
    const box = document.getElementById('v12-chips'); if (!box) return;
    const out = [];
    for (const [id, dv] of Object.entries(DEF)) { const el = document.getElementById(id); if (!el || el.value === dv) continue; const txt = el.tagName === 'SELECT' ? el.selectedOptions[0]?.textContent : el.value; out.push('<button type="button" class="v12-chip" data-v12-clear="' + id + '" title="이 조건만 해제">' + esc(LABEL[id]) + ': ' + esc(txt) + '<b>✕</b></button>'); }
    const st = document.getElementById('sectionTitle')?.textContent.trim(); if (st && st !== '전체 영상') out.push('<button type="button" class="v12-chip" data-v12-clear="section" title="전체 영상으로">분야: ' + esc(st) + '<b>✕</b></button>');
    const cnt = document.getElementById('count')?.textContent || '';
    box.innerHTML = (out.length ? '<span class="lf-hint">적용 중:</span> ' + out.join('') : '<span class="lf-hint">적용 중인 조건 없음</span>') + ' <span class="lf-hint">· ' + esc(cnt) + '</span>';
  }
  function fire(el) { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
  function setupFilters() {
    const c = document.getElementById('controls'); if (!c || document.getElementById('v12-bar')) return;
    const q = document.getElementById('q');
    q.closest('label').insertAdjacentHTML('afterend', '<button type="button" id="v12-search" title="Enter 키와 같음">🔍 검색</button>');
    const rpmL = document.getElementById('rpm')?.closest('label'); (rpmL || q.closest('label')).insertAdjacentHTML('afterend', '<label title="★ GPT 메달: 어시스턴트가 직접 조사·추가한 영상">GPT 조사<select id="gptf"><option value="all">기존 전체 영상</option><option value="only">★ GPT 조사만</option><option value="exclude">GPT 제외</option></select></label>');
    const gs = document.getElementById('gptf'); gs.value = LFGPT.mode;
    gs.addEventListener('change', () => { LFGPT.mode = gs.value; SS(GPT_KEY, gs.value); document.getElementById('sort')?.dispatchEvent(new Event('change', { bubbles: true })); decorate(); setTimeout(chips, 50); });
    const reset = document.getElementById('reset'); if (reset) { reset.textContent = '모든 조건 초기화'; reset.title = '검색·필터·정렬만 초기화 (즐겨찾기·저장 조합·메뉴 편집·화면 설정은 유지)'; }
    const adv = document.createElement('details'); adv.className = 'v12-adv'; adv.id = 'v12-adv'; adv.open = LS('lf-v12:adv', false);
    adv.innerHTML = '<summary>⚙ 고급 필터·화면 설정 (한 화면 편수·열 수·조회수·추정액·게시일 범위)</summary><div class="controls" data-v12-advbox></div>';
    c.after(adv);
    const box = adv.querySelector('[data-v12advbox],[data-v12-advbox]');
    for (const id of ['pagesize', 'cols']) { const l = document.getElementById(id)?.closest('label'); if (l) box.appendChild(l); }
    const ranges = document.getElementById('ranges'); if (ranges) { ranges.open = true; box.appendChild(ranges); }
    adv.addEventListener('toggle', () => SS('lf-v12:adv', adv.open));
    adv.insertAdjacentHTML('afterend', '<div id="v12-bar" role="toolbar" aria-label="화면 표시 설정"><button type="button" data-v12-toggle="thumbs"></button><button type="button" data-v12-toggle="analysis"></button><button type="button" data-v12-toggle="metrics"></button><button type="button" data-v12-fold="open">전체 패널 펼치기</button><button type="button" data-v12-fold="close">전체 패널 접기</button><span class="lf-hint">입력 0.3초 뒤 자동 검색 · Enter·검색 버튼 즉시 · 기존 자료만 필터(외부 수집 요청 없음)</span></div><div id="v12-chips" class="v12-chips" aria-live="polite"></div>');
    // debounce search
    let timer = null;
    document.addEventListener('input', e => { if (e.target !== q || e.v12) return; e.stopImmediatePropagation(); clearTimeout(timer); timer = setTimeout(() => runSearch(), 300); }, true);
    const runSearch = () => { clearTimeout(timer); const ev = new Event('input', { bubbles: true }); ev.v12 = true; q.dispatchEvent(ev); setTimeout(chips, 50); };
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });
    document.getElementById('v12-search').addEventListener('click', runSearch);
    const cnt = document.getElementById('count'); if (cnt) new MutationObserver(chips).observe(cnt, { childList: true, characterData: true, subtree: true });
    document.addEventListener('change', e => { if (e.target.closest && e.target.closest('#controls,#v12-adv')) setTimeout(chips, 30); });
    chips(); applyUI();
  }
  // Events
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-v12-toggle],[data-v12-fold],[data-v12-view],[data-v12-sortdir],[data-v12-clear],[data-v12-close],[data-v12-play],.lf-panel a:has(>img[src*="ytimg"]),#lf-v12 a:has(>img[src*="ytimg"])');
    if (!t) return;
    if (t.dataset.v12Toggle) { ui[t.dataset.v12Toggle] = !ui[t.dataset.v12Toggle]; SS(UI_KEY, ui); applyUI(); setTimeout(decorate, 30); return; }
    if (t.dataset.v12Fold) { const open = t.dataset.v12Fold === 'open'; for (const d of panels()) d.open = open; return; }
    if (t.dataset.v12View) { tview = t.dataset.v12View; SS(TV_KEY, tview); scan(); syncTools(); return; }
    if (t.dataset.v12Sortdir) { const tools = t.closest('.v12-tools'); sortTable(tools._tb, Number(tools.querySelector('[data-v12-sortcol]').value), t.dataset.v12Sortdir); return; }
    if (t.dataset.v12Clear) { const id = t.dataset.v12Clear; if (id === 'section') { document.querySelector('[data-section="all"]')?.click(); } else { const el = document.getElementById(id); if (el) { el.value = DEF[id]; if (id === 'days') { const l = document.getElementById('customDaysLabel'); if (l) l.hidden = true; } if (id === 'cols') document.documentElement.style.setProperty('--cols', DEF.cols); fire(el); } } setTimeout(chips, 60); return; }
    if (t.dataset.v12Close !== undefined) { document.getElementById('v12-player')?.close(); return; }
    const id = t.dataset.v12Play || vidOf(t); if (!id) return;
    e.preventDefault(); e.stopPropagation();
    const row = t.closest('tr'); play(id, row ? (row.querySelector('th,td a')?.textContent || '').trim().slice(0, 80) : '');
  }, true);

  // 8) Playlist panel
  const PL_SRC = '💎 내 재생목록 집중 연구';
  window.LFV12UI = {
    PL_SRC,
    mount() {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      setupFilters(); applyUI();
      const root = document.getElementById('lf-v12');
      if (root && !root.dataset.ready) {
        root.dataset.ready = '1';
        root.innerHTML = '<summary>💎 내 재생목록 집중 연구 · PLc_MeVdtCAQU</summary><div data-body><p class="lf-hint">열면 재생목록 자료를 불러옵니다.</p></div>';
        let D = null, tab = 'videos', loading = false;
        const body = root.querySelector('[data-body]'), W = x => x == null ? '미확인' : nf(x), P = x => x == null ? '미확인' : (Math.trunc(x * 1000) / 10) + '%', M = (x, f) => html(x, f);
        const render = () => {
          if (!D) return;
          const c = D.counts;
          const head = '<p><b>전체 ' + W(c.headerCount ?? c.total) + '편</b> (재생목록 표시값) · 확인 완료 ' + W(c.ok) + '편 · 접근 실패 ' + W(c.failed) + '편 (숨김 ' + W(c.hidden) + '편 중) · 메타데이터만 확인·재생 불가 ' + W(c.unplayable) + '편 · 롱폼 ' + W(c.long) + ' / 쇼츠 ' + W(c.shorts) + ' · 고유 채널 ' + W(c.channels) + '곳 · 기존 데이터와 겹침 ' + W(c.overlap) + '편(출처 태그 추가) · 바둑판 신규 ' + W(c.newToGallery) + '편 (쇼츠·게시일 없는 영상 제외)</p><p class="lf-hint">' + esc(D.method) + '</p><div class="lf-row">' + [['videos', '영상 ' + D.videos.length], ['channels', '채널 ' + D.channels.length], ['failed', '실패·숨김 ' + D.failed.length]].map(([k, t]) => '<button type="button" data-v12-tab="' + k + '" aria-pressed="' + (tab === k) + '">' + t + '</button>').join('') + ' <button type="button" data-v12-gallery>전체 바둑판에서 이 재생목록만 보기</button></div>';
          let tb = '';
          if (tab === 'videos') tb = '<div class="lf-table-wrap"><table><thead><tr><th>#</th><th>영상</th><th>유형</th><th>조회수</th><th>게시일</th><th>길이</th><th>좋아요</th><th>댓글</th><th>누적 추정 하/중/상</th><th>일평균 조회</th><th>채널</th><th>구독자</th><th>채널 개설</th><th>공개 영상</th><th>채널 월 추정(중)</th><th>반복 성공률</th><th>채널 중앙값</th><th>경쟁도(휴리스틱)</th><th>AI 제작 가능성</th><th>제작 난이도</th></tr></thead><tbody>' + D.videos.map(v => '<tr><td>' + v.pos + '</td><th><a href="https://www.youtube.com/watch?v=' + esc(v.id) + '" target="_blank" rel="noopener noreferrer"><img src="https://i.ytimg.com/vi/' + esc(v.id) + '/mqdefault.jpg" alt="" width="96" height="54" loading="lazy" referrerpolicy="no-referrer"></a> ' + esc(v.title) + '</th><td>' + (v.shorts ? '쇼츠' : '롱폼') + '</td><td data-n="' + (v.views ?? '') + '">' + W(v.views) + '</td><td>' + esc(v.date || '미확인') + '</td><td data-n="' + (v.sec ?? '') + '">' + (v.sec == null ? '미확인' : Math.floor(v.sec / 60) + ':' + String(v.sec % 60).padStart(2, '0')) + '</td><td data-n="' + (v.likes ?? '') + '">' + W(v.likes) + '</td><td data-n="' + (v.comments ?? '') + '">' + W(v.comments) + (v.commentsApprox ? ' ≈' : '') + '</td><td>' + (v.est ? v.est.map((x, i) => M(x, W(v.views) + '회 × ' + v.rpm[i] + '원 ÷ 1,000 (' + v.model + ')')).join('/') : '미확인') + '</td><td data-n="' + (v.daily ?? '') + '">' + W(v.daily) + '</td><td>' + esc(v.ch) + '</td><td data-n="' + (v.subs ?? '') + '">' + W(v.subs) + (v.subs != null ? ' ≈' : '') + '</td><td>' + esc(v.joined || '미확인') + '</td><td data-n="' + (v.totalVideos ?? '') + '">' + W(v.totalVideos) + '</td><td>' + M(v.chMonthly?.[1], v.chMonthlyFormula) + '</td><td data-n="' + (v.repeat100k ?? '') + '">' + P(v.repeat100k) + '</td><td data-n="' + (v.chMedian ?? '') + '">' + W(v.chMedian) + '</td><td data-n="' + (v.competition ?? '') + '">' + (v.competition ?? '미확인') + '</td><td>' + esc(v.aiPossible || '미확인') + '</td><td data-n="' + (v.difficulty ?? '') + '">' + (v.difficulty ?? '미확인') + '</td></tr>').join('') + '</tbody></table></div>';
          if (tab === 'channels') tb = '<div class="lf-table-wrap"><table><thead><tr><th>채널</th><th>재생목록 내 영상</th><th>구독자</th><th>개설</th><th>공개 영상</th><th>누적 조회</th><th>최신 표본 중앙값</th><th>반복 성공률(10만↑)</th><th>최근 30일 업로드(근사)</th><th>월 추정 하/중/상</th><th>재생목록 영상 누적 추정(중)</th><th>상태</th></tr></thead><tbody>' + D.channels.map(c => '<tr><th>' + (c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' + esc(c.name) + '</a>' : esc(c.name)) + '</th><td data-n="' + c.inPlaylist + '">' + c.inPlaylist + '</td><td data-n="' + (c.subs ?? '') + '">' + W(c.subs) + '</td><td>' + esc(c.joined || '미확인') + '</td><td data-n="' + (c.totalVideos ?? '') + '">' + W(c.totalVideos) + '</td><td data-n="' + (c.totalViews ?? '') + '">' + W(c.totalViews) + '</td><td data-n="' + (c.median ?? '') + '">' + W(c.median) + '</td><td data-n="' + (c.repeat100k ?? '') + '">' + P(c.repeat100k) + '</td><td data-n="' + (c.uploads30 ?? '') + '">' + W(c.uploads30) + '</td><td>' + (c.monthly ? c.monthly.map((x, i) => M(x, '중앙값 ' + W(c.median) + ' × 30일 업로드 ' + c.uploads30 + ' × ' + [1000, 2000, 4000][i] + '원 ÷ 1,000')).join('/') : '미산정') + '</td><td>' + M(c.plEst) + '</td><td>' + esc(c.status || '') + '</td></tr>').join('') + '</tbody></table></div>';
          if (tab === 'failed') tb = '<div class="lf-table-wrap"><table><thead><tr><th>순서</th><th>영상 ID</th><th>상태</th><th>사유</th></tr></thead><tbody>' + (D.failed.length ? D.failed.map(f => '<tr><td>' + (f.pos ?? '') + '</td><td>' + esc(f.id || '미확인') + '</td><td>' + esc(f.status || '') + '</td><td>' + esc(f.error || '') + '</td></tr>').join('') : '<tr><td colspan="4">없음</td></tr>') + '</tbody></table></div>';
          body.innerHTML = head + tb;
        };
        const load = async () => { if (D || loading) return; loading = true; try { D = await (await fetch('lf-v12.json')).json(); render(); } catch { loading = false; body.innerHTML = '<p>재생목록 자료를 읽지 못했습니다.</p>'; } };
        root.addEventListener('toggle', () => { if (root.open) load(); });
        root.addEventListener('click', e => { const b = e.target.closest('[data-v12-tab],[data-v12-gallery]'); if (!b) return; if (b.dataset.v12Tab) { tab = b.dataset.v12Tab; render(); } else window.dispatchEvent(new CustomEvent('lf-v12-gallery')); });
        this.panel = { open(k) { if (k) tab = k; root.open = true; load(); render(); root.scrollIntoView({ block: 'start' }); } };
      }
      // observers
      let pend = false;
      const run = () => { pend = false; scan(); decorate(); normalizeMoney(document.querySelector('main') || document.body); for (const d of panels()) badge(d); };
      new MutationObserver(() => { if (!pend) { pend = true; requestAnimationFrame(run); } }).observe(document.body, { childList: true, subtree: true });
      document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details.lf-panel,details#ranges')) badge(e.target); }, true);
      run();
      fetch('lf-gpt-ids.json').then(r => r.ok ? r.json() : null).then(j => { if (!j) return; LFGPT.ids = new Set(j.ids); decorate(); if (LFGPT.mode !== 'all') document.getElementById('sort')?.dispatchEvent(new Event('change', { bubbles: true })); }).catch(() => {});
      document.addEventListener('change', () => setTimeout(decorate, 30));
      return this.panel;
    }
  };
})();
