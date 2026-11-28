/* V14 UI: opportunity rankings (video/channel/category/market), low-sub/new TOP100, revenue bands, TOP20 now-produce, formula audit,
   discovery progress, AI-econ survival, menu recommended order. Reuses v12 table tools (grid/list/compact, sort arrows, GPT medal, money). */
'use strict';
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nf = (x, d = 0) => x == null || !Number.isFinite(x) ? '미확인' : (d ? (Math.trunc(x * 10 ** d) / 10 ** d).toLocaleString('ko-KR') : Math.trunc(x).toLocaleString('ko-KR'));
  const M = (x, f) => window.LFMoney ? window.LFMoney.html(x, f) : nf(x);
  const P = x => x == null ? '미확인' : (Math.trunc(x * 1000) / 10) + '%';
  const terms = s => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  let cache = null, cacheN = -1;
  function engine() {
    const D = window.LFData; if (!D || !window.LFOpp) return null;
    const sz = D.size ? D.size() : -1; if (cache && cacheN === sz) return cache; const pool = D.all();
    const info = v => { try { return window.LFV6?.info ? window.LFV6.info(v) : {}; } catch { return {}; } };
    cache = window.LFOpp.build(pool, { channels: () => window.LFMetric.channels(), info });
    cache.pool = pool; cache.info = info; cacheN = sz; return cache;
  }
  const sc = v => engine()?.scores.get(v.id) || null;
  // register sort keys into v13 SortControl
  function registerSorts() {
    const R = window.LFMetric?.register; if (!R) return;
    R('opp', '⭐ 종합 제작·수익 기회 점수', '점', v => sc(v)?.rank ?? null, ['30', '50', '70']);
    const part = k => v => { const p = sc(v)?.parts[k]; return p ? p.norm * 100 : null; };
    R('o_c1', '지속 월수익 점수', '점', part('c1'), null); R('o_c3', 'AI 제작 용이성 점수', '점', part('c3'), null); R('o_c2', '시간당 순이익 점수', '점', part('c2'), null);
    R('o_c4', '반복 성공 점수', '점', part('c4'), null); R('o_c8', '저구독 고조회 점수', '점', part('c8'), null); R('o_c9', '신생 급성장 점수', '점', v => { const s = sc(v); if (!s) return null; const a = s.parts.c9, b = s.parts.c11; if (!a && !b) return null; return ((a?.norm ?? 0) * 5 + (b?.norm ?? 0) * 4) / ((a ? 5 : 0) + (b ? 4 : 0)) * 100; }, null);
    R('o_c10', '적은 영상 고수익 점수', '점', part('c10'), null); R('o_c12', '아웃라이어 점수', '점', part('c12'), null); R('o_c16', '낮은 경쟁 점수', '점', part('c16'), null);
    R('o_c17', '해외 진출 기회 점수', '점', part('c17'), null); R('o_c5', '사업 전환 가능성 점수', '점', part('c5'), null); R('o_cov', '근거 충족률', '%', v => sc(v) ? sc(v).coverage * 100 : null, null);
  }
  // ---------- card badge ----------
  function decorate() {
    const D = window.LFData; if (!D || !engine()) return;
    for (const a of document.querySelectorAll('.grid article.item[data-id]')) {
      const v = D.get(a.dataset.id); const s = v && sc(v); if (!s) continue;
      let b = a.querySelector('.v14-badge'); const sig = cacheN + '|' + v.id;
      if (b && b.dataset.sig === sig) continue;
      const html = '<div class="v14-badge" data-sig="' + sig + '" title="' + esc(why(s)) + '"><b>⭐ 기회 ' + nf(s.rank, 1) + '</b> · 확인 ' + nf(s.score, 1) + '/100 · 근거 ' + P(s.coverage) + (s.tentative ? ' · <span class="v14-tent">잠정</span>' : '') + (s.cat ? ' · ' + esc(s.cat.cls + '등급 ' + s.cat.label) : '') + '</div>';
      if (b) b.outerHTML = html; else (a.querySelector('.v13-req') || a.querySelector('.pay'))?.insertAdjacentHTML('beforebegin', html);
    }
  }
  function why(s) { return window.LFOpp.weights.map(([k, l, w]) => { const p = s.parts[k]; return l + '(' + w + '): ' + (p ? nf(p.pts, 1) + '점' + (p.assumed ? '[분류 가정]' : '') : '미확인'); }).join(' · '); }
  // ---------- panel ----------
  const TABS = [['groups', '💛 GPT 그룹 확장 1,000편'], ['top20', '🎯 지금 제작 TOP 20'], ['video', '영상 순위'], ['channel', '채널 순위'], ['cat', '분야 순위'], ['market', '국가·언어 순위'], ['young', '저구독·신생·저영상 TOP 100'], ['bands', '수익 금액 구간'], ['survival', 'AI 경제 채널 생존'], ['progress', '신규 발굴 진행률'], ['audit', '계산식·가중치 공개']];
  let tab = 'groups', extra = {};
  const vrow = (v, s, i) => '<tr><td>' + (i + 1) + '</td><th><a href="https://www.youtube.com/watch?v=' + esc(v.id) + '" target="_blank" rel="noopener noreferrer"><img src="https://i.ytimg.com/vi/' + esc(v.id) + '/mqdefault.jpg" width="96" height="54" loading="lazy" referrerpolicy="no-referrer" alt=""></a> ' + esc(v.t) + '<br><small>' + esc(v.ch) + ' · ' + esc(v.d || '') + '</small></th><td data-n="' + (s.rank ?? '') + '" title="' + esc(why(s)) + '">' + nf(s.rank, 1) + (s.tentative ? ' <small class="v14-tent">잠정</small>' : '') + '</td><td data-n="' + s.coverage + '">' + P(s.coverage) + '</td><td>' + esc(s.cat ? s.cat.cls + ' ' + s.cat.label : '미분류') + '</td><td data-n="' + (v.v ?? '') + '">' + nf(v.v) + '</td><td>' + [1, 2, 4].map(k => M(v.v * k, nf(v.v) + '회 × ' + k * 1000 + '원 ÷ 1,000')).join('/') + '</td><td data-n="' + (s.parts.c1?.raw ?? '') + '">' + M(s.parts.c1?.raw, '채널 표본 중앙값 × 월 업로드 × 2,000원 ÷ 1,000') + '</td><td data-n="' + (s.parts.c8?.raw ?? '') + '">' + (s.parts.c8 ? nf(s.parts.c8.raw, 2) + '배' : '미확인') + '</td><td>' + esc(s.market || '미확인') + '</td></tr>';
  const vhead = '<thead><tr><th>#</th><th>영상</th><th>기회 점수</th><th>근거 충족률</th><th>분야·제작 등급</th><th>조회</th><th>영상 추정 하/중/상</th><th>채널 월 추정(중)</th><th>구독자 대비</th><th>언어</th></tr></thead>';
  function chanRows(E) {
    const by = new Map();
    for (const v of E.pool) { const s = E.scores.get(v.id); if (!s || s.rank == null) continue; const k = terms(v.ch); let c = by.get(k); if (!c) by.set(k, c = { ch: v.ch, vids: [], s: [] }); c.vids.push(v); c.s.push(s); }
    return [...by.values()].map(c => { const r = c.s.map(x => x.rank).sort((a, b) => b - a); const top3 = r.slice(0, 3); const i = E.info(c.vids[0]) || {}; const ch = window.LFMetric.channels().get(terms(c.ch)); return { ...c, score: top3.reduce((a, b) => a + b, 0) / top3.length, n: c.vids.length, subs: i.subs ?? null, chAge: i.chAge ?? null, chVideos: i.chVideos ?? null, median: ch?.median ?? null, repeat: ch?.n >= 5 ? ch.repeat : null, monthly: c.s[0].parts.c1?.raw ?? null, cov: c.s.reduce((a, x) => a + x.coverage, 0) / c.s.length, cat: c.s[0].cat }; }).sort((a, b) => b.score - a.score);
  }
  function catRows(E) {
    const m = new Map();
    for (const v of E.pool) { const s = E.scores.get(v.id); if (!s?.cat) continue; let c = m.get(s.cat.key); if (!c) m.set(s.cat.key, c = { cat: s.cat, v: [], s: [] }); c.v.push(v); c.s.push(s); }
    return [...m.values()].map(c => { const r = c.s.map(x => x.rank).filter(x => x != null).sort((a, b) => b - a); const top = r.slice(0, 20); const rp = E.repro.get(c.cat.key); return { ...c, score: top.reduce((a, b) => a + b, 0) / (top.length || 1), n: c.v.length, K: rp?.K ?? null, nYoung: rp?.n ?? null, comp: E.comp.get(c.cat.key) ?? null, chans: new Set(c.v.map(v => terms(v.ch))).size }; }).sort((a, b) => b.score - a.score);
  }
  const STEPS = { S: '① 주제·근거 자료 수집(Claude Code/Codex로 검색·요약) → ② 대본(AI 초안 + 사실 확인) → ③ TTS 내레이션 → ④ 공개·자체 자료 화면/AI 이미지 배치(FFmpeg 자동 편집) → ⑤ 썸네일 2안 → ⑥ 업로드·고정 댓글', A: '① 캐릭터·세계관 고정 프롬프트 → ② 장면 리스트 → ③ AI 이미지/짧은 영상 생성(재생성 2~3회 가정) → ④ TTS·자막 → ⑤ FFmpeg 조립 → ⑥ 썸네일', B: '① 시나리오 → ② 인물 일관성 레퍼런스 → ③ 장면별 영상 생성(재생성 다수) → ④ 음성·립싱크 검수 → ⑤ 편집 → ⑥ 품질 검수', C: '촬영·출연·복잡 연출 필요 — 자동화 비중 낮음' };
  function top20(E) {
    const cats = catRows(E); const combos = [];
    for (const c of cats) { if (c.cat.key === 'fullmovie' || c.cat.cls === 'C') continue; const byM = new Map(); c.v.forEach((v, i) => { const mk = c.s[i].market || '미확인'; let x = byM.get(mk); if (!x) byM.set(mk, x = { v: [], s: [] }); x.v.push(v); x.s.push(c.s[i]); }); for (const [mk, x] of byM) { if (x.v.length < 8) continue; const r = x.s.map(s => s.rank ?? 0).sort((a, b) => b - a).slice(0, 15); combos.push({ c, mk, x, score: r.reduce((a, b) => a + b, 0) / r.length }); } }
    combos.sort((a, b) => b.score - a.score || (a.c.cat.cls < b.c.cat.cls ? -1 : 1));
    return combos.slice(0, 20).map(o => {
      const idx = o.x.v.map((v, i) => i).sort((a, b) => (o.x.s[b].rank ?? 0) - (o.x.s[a].rank ?? 0));
      const refs = idx.slice(0, 8).map(i => o.x.v[i]);
      const chs = []; const seen = new Set(); for (const i of idx) { const k = terms(o.x.v[i].ch); if (seen.has(k)) continue; seen.add(k); chs.push({ ch: o.x.v[i].ch, s: o.x.s[i] }); if (chs.length >= 5) break; }
      const med = a => { a = a.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
      const views = med(refs.map(v => v.v)); const monthly = med(chs.map(c => c.s.parts.c1?.raw).filter(x => x != null)); const repeat = med(chs.map(c => c.s.parts.c4?.raw).filter(x => x != null));
      const cls = window.LFOpp.classes[o.c.cat.cls]; const mins = med(refs.map(v => v.s / 60)); const hours = cls.base + cls.perMin * (mins || 10);
      const cov = o.x.s.reduce((a, s) => a + s.coverage, 0) / o.x.s.length;
      const young = o.c.K != null ? o.c.K + '/' + o.c.nYoung + ' (최근 1년 개설 채널 중 중앙값 1만↑)' : '표본 부족';
      return { cat: o.c.cat, mk: o.mk, score: o.score, refs, chs, views, monthly, repeat, comp: o.c.comp, hours, cost: cls.cost, net: monthly != null ? monthly - cls.cost * 8 : null, cov, young, steps: STEPS[o.c.cat.cls] };
    });
  }
  // ---- GPT group expansion (1A·2A·2B·2C checked by user; 1B unchecked) ----
  const GROUPS = [
    ['1A', '반복 고수익 채널', '채널 표본 5편↑ · 10만↑ 반복률 50%↑ · 채널 월 추정 확인 · 채널당 최대 3편 · 채널 월 추정순', true],
    ['1B', '저구독 대비 폭발적 조회수·고수익', '체크 해제됨 — 이번 확장에서 제외', false],
    ['2A', '편당·월수익 최우수', '영상당 중 추정 100만 원↑ · 채널 월 추정 1,000만 원↑ · 채널당 최대 2편 · 편당×월 추정순', true],
    ['2B', '신생·저구독·고조회·고수익 잠재력', '개설 120일 이내 · 구독자 1만 이하 · 구독자 대비 20배↑ · 채널당 최대 2편 · 조회순', true],
    ['2C', '다양한 채널의 성공 공식 교차 검증', '조회 30만↑ · 채널당 1편 · 분야를 돌아가며 선택(다양성) · 기회 점수순', true]
  ];
  let gptExclude = null, lastGroups = null;
  fetch('lf-gpt42.json').then(r => r.ok ? r.json() : null).then(j => { gptExclude = new Set((j?.videos || []).map(v => v.id)); }).catch(() => { gptExclude = new Set(); });
  function groups(E) {
    const used = new Set(gptExclude || []), out = {};
    const ch = v => window.LFMetric.channels().get(terms(v.ch));
    const pick = (list, perCh, key, cap) => { const per = new Map(), res = []; for (const v of list.sort(key)) { if (used.has(v.id)) continue; const k = terms(v.ch); const n = per.get(k) || 0; if (n >= perCh) continue; per.set(k, n + 1); used.add(v.id); res.push(v); if (res.length >= cap) break; } return res; };
    const long = E.pool.filter(v => v.s > 180 && Number.isFinite(v.v) && E.scores.get(v.id)?.cat?.key !== 'fullmovie');
    const c1 = v => E.scores.get(v.id)?.parts.c1?.raw ?? null;
    out['1A'] = pick(long.filter(v => { const c = ch(v); return c && c.n >= 5 && c.repeat >= 0.5 && c1(v) != null; }), 3, (a, b) => c1(b) - c1(a) || b.v - a.v, 250);
    out['2A'] = pick(long.filter(v => v.v * 2 >= 1e6 && (c1(v) ?? 0) >= 1e7), 2, (a, b) => b.v * c1(b) - a.v * c1(a), 250);
    out['2B'] = pick(long.filter(v => { const i = E.info(v) || {}; return i.chAge != null && i.chAge <= 120 && i.subs != null && i.subs <= 10000 && i.x != null && i.x >= 20; }), 2, (a, b) => b.v - a.v, 250);
    const byCat = new Map(); for (const v of long.filter(v => v.v >= 3e5)) { const k = E.scores.get(v.id)?.cat?.key || 'etc'; (byCat.get(k) || byCat.set(k, []).get(k)).push(v); }
    for (const a of byCat.values()) a.sort((x, y) => (E.scores.get(y.id)?.rank ?? 0) - (E.scores.get(x.id)?.rank ?? 0));
    const res = [], seenCh = new Set(); let progress = true;
    while (res.length < 250 && progress) { progress = false; for (const a of byCat.values()) { while (a.length) { const v = a.shift(); const k = terms(v.ch); if (used.has(v.id) || seenCh.has(k)) continue; seenCh.add(k); used.add(v.id); res.push(v); progress = true; break; } if (res.length >= 250) break; } }
    out['2C'] = res; return out;
  }
  const gtable = (E, list) => '<div class="lf-table-wrap"><table>' + vhead + '<tbody>' + list.map((v, k) => vrow(v, E.scores.get(v.id), k)).join('') + '</tbody></table></div>';
  document.addEventListener('toggle', e => { const d = e.target; if (!d.matches || !d.matches('details.v14-grp') || !d.open || !lastGroups) return; const b = d.querySelector('[data-grp-body]'); if (b && !b.querySelector('table')) b.innerHTML = gtable(engine(), lastGroups[d.dataset.grp]); }, true);
  document.addEventListener('click', e => { const b = e.target.closest('[data-grp-copy]'); if (!b || !lastGroups) return; const k = b.dataset.grpCopy; const L = k === 'all' ? ['1A', '2A', '2B', '2C'].flatMap(g => lastGroups[g] || []) : (lastGroups[k] || []); const txt = L.map(v => 'https://www.youtube.com/watch?v=' + v.id).join('\n'); (navigator.clipboard?.writeText(txt) || Promise.reject()).then(() => { b.textContent = '복사됨 ' + L.length + '개'; }).catch(() => { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); b.textContent = '복사됨 ' + L.length + '개'; }); });
  function groupsTab(E) {
    const G = groups(E); lastGroups = G; const total = ['1A', '2A', '2B', '2C'].reduce((a, g) => a + G[g].length, 0);
    return '<p class="lf-hint">GPT 1·2차 42편은 제외하고, 같은 영상은 한 그룹에만 넣었습니다(1A→2A→2B→2C 순). 목표: 체크한 4개 그룹 × 250편 = 1,000편. 현재 ' + nf(total) + '편 · 부족분은 1분 예약 발굴이 채우며 새 영상이 들어오면 자동으로 다시 나열됩니다. 금액은 추정(실제 정산 아님).</p><p><button type="button" data-grp-copy="all">체크한 4개 그룹 URL 전체 복사</button></p>'
      + GROUPS.map(([g, name, rule, on]) => on ? '<details class="v14-grp" data-grp="' + g + '"' + (g === '1A' ? ' open' : '') + '><summary><b>' + (g[0] === '1' ? '🔴 ' : '🔵 ') + g + ' ' + esc(name) + '</b> · ' + nf(G[g].length) + '/250편 <button type="button" data-grp-copy="' + g + '">URL ' + G[g].length + '개 복사</button></summary><p class="lf-hint">' + esc(rule) + '</p><div data-grp-body>' + (g === '1A' ? gtable(E, G[g]) : '<p class="lf-hint">펼치면 목록이 열립니다.</p>') + '</div></details>' : '<p class="lf-hint">☐ ' + g + ' ' + esc(name) + ' — ' + esc(rule) + '</p>').join('');
  }
  let lastT20 = null;
  const t20table = (E, t) => '<div class="lf-table-wrap"><table>' + vhead + '<tbody>' + t.refs.map((v, k) => vrow(v, E.scores.get(v.id), k)).join('') + '</tbody></table></div>';
  document.addEventListener('toggle', e => { const d = e.target; if (!d.matches || !d.matches('details.v14-t20') || !d.open || !lastT20) return; const b = d.querySelector('[data-t20-body]'); if (b && !b.querySelector('table')) b.innerHTML = t20table(engine(), lastT20[Number(d.dataset.t20)]); }, true);
  function bands(E) {
    const L = [1e6, 3e6, 5e6, 1e7, 3e7, 5e7, 1e8];
    const long = E.pool.filter(v => v.s > 180 && Number.isFinite(v.v));
    const per = L.map(t => [t, [1, 2, 4].map(k => long.filter(v => v.v * k >= t).length)]);
    const chs = chanRows(E);
    const mon = L.map(t => [t, chs.filter(c => c.monthly != null && c.monthly >= t).length]);
    const hit = L.map(t => { const cnt = c => c.vids.filter(v => v.v * 2 >= t).length; return [t, chs.filter(c => cnt(c) === 1).length, chs.filter(c => cnt(c) >= 10).length]; });
    return '<p class="lf-hint">롱폼(181초 이상)만 · 누적 조회 기준 추정(실제 정산 아님) · 누적 조회를 월 조회로 바꾸지 않았습니다. 쇼츠 금액 구간은 쇼츠 사이트 담당(이 저장소 수정 범위 밖).</p><div class="lf-table-wrap"><table><thead><tr><th>영상당 누적 추정</th><th>하(1,000원)</th><th>중(2,000원)</th><th>상(4,000원)</th></tr></thead><tbody>' + per.map(([t, a]) => '<tr><th>' + M(t) + ' 이상</th>' + a.map(x => '<td data-n="' + x + '">' + nf(x) + '편</td>').join('') + '</tr>').join('') + '</tbody></table></div><div class="lf-table-wrap"><table><thead><tr><th>채널 월 추정(중, 표본)</th><th>채널 수</th><th>해당 금액 영상 1편뿐(일회성)</th><th>해당 금액 영상 10편↑(반복)</th></tr></thead><tbody>' + L.map((t, i) => '<tr><th>' + M(t) + ' 이상</th><td data-n="' + mon[i][1] + '">' + nf(mon[i][1]) + '</td><td data-n="' + hit[i][1] + '">' + nf(hit[i][1]) + '</td><td data-n="' + hit[i][2] + '">' + nf(hit[i][2]) + '</td></tr>').join('') + '</tbody></table></div><p class="lf-hint">실제 수익 공개·Studio 증빙 사례: 현재 수집 자료에서 확인된 건 0건(미확인). 신규 발굴 예약에서 계속 찾습니다.</p>';
  }
  function audit(E) {
    const W = window.LFOpp.weights;
    return '<h4>신규 탐색 기회 점수 (business-fit-v1 실측 점수와 별개, 기존 점수는 변경하지 않음)</h4><div class="lf-table-wrap"><table><thead><tr><th>#</th><th>기준</th><th>배점</th><th>원값(raw)</th><th>정규화</th></tr></thead><tbody>' + W.map(([k, l, w], i) => '<tr><td>' + (i + 1) + '</td><th>' + esc(l) + (E.assumed.includes(k) ? ' <small>[분류 가정]</small>' : '') + '</th><td>' + w + '</td><td>' + esc(({ c1: '채널 표본 중앙값 × 월 업로드(최근 90일÷3) × 2,000원/1,000회', c2: '(영상당 중 추정 − 등급별 제작비) ÷ 등급·길이별 제작시간', c3: 'S 1.0 / A 0.75 / B 0.45 / C 0.15 (+AI 표기 0.1)', c4: '채널 표본 10만↑ 비율(표본 5편↑)', c5: '분야별 상품·사업 연결도(투자·AI 창업 1.0 … 영화 0.2)', c6: '구독자 ÷ 채널 개설 경과일', c7: '조회 × 2,000원/1,000회', c8: '조회 ÷ 구독자(X배수)', c9: '개설 365일 이내면 log10(1+조회)×(1−경과일/365), 아니면 0', c10: '채널 누적 조회 ÷ 공개 영상 수', c11: '조회 ÷ 게시 경과일', c12: '조회 ÷ 같은 채널 다른 영상 중앙값(자기 제외, 3편↑)', c13: '채널 표본 중앙값 ÷ 평균', c14: '1 − 최고 2편 비중', c15: '같은 분야 최근 1년 개설 채널 K/n(표본 3편↑ 중 중앙값 1만↑), n≥5', c16: '같은 분야 최근 1년 게시 채널 수(적을수록 높음)', c17: '언어 시장 가설 JP 0.7·EN 0.5·KR 0.45·CN 0.4', c18: '분야별 구매 의도(투자 1.0 … 영화 0.3)', c19: '영상당 수익 ÷ 제작시간 ÷ 영상 길이(분)', c20: '1 − min(게시 경과일,365)/365' })[k]) + '</td><td>전체 표본 백분위(0~1), 동점은 평균 순위</td></tr>').join('') + '</tbody></table></div><p>점수 = Σ(배점 × 백분위), 확인된 기준만 합산. 근거 충족률 = 확인된 기준 배점 합 ÷ 100. 순위용 기회 점수 = (점수 ÷ 충족률) × min(1, 충족률 ÷ 0.75) — 근거가 적은 후보가 확인된 기준만으로 위로 올라가지 않게 75% 미만은 비례 축소. 충족률 60% 미만은 "잠정". 미확인 기준은 0점·만점 처리하지 않습니다. 동점 시 최신 게시·적은 공개 영상·높은 반복률이 우선(기존 정렬 보조 규칙).</p>'
      + '<h4>기존 계산식 재사용 점검 (SOTDA 34 · M1~M5 · lf-metrics · shorts-workspace)</h4><div class="lf-table-wrap"><table><thead><tr><th>식</th><th>이 사이트 적용</th><th>근거·제한</th></tr></thead><tbody>' + [
        ['A-1 z-VPH / B-3b VPH', '부분', 'VPH = 조회÷게시 후 시간(누적 기준). 시점별 관측이 없어 z-VPH는 미확인'], ['D-3b modified_z / D-4a alert', '부분', '채널 표본 MAD 기반 계산 가능, 화면에는 아웃라이어 배수로 표시'], ['CH-2 views_per_subscriber', '적용', '구독자 대비 X배수(c8)'], ['CH-3 outlier_ratio', '적용', '자기 제외 중앙값 기준(c12)'], ['CH-4 content_efficiency', '부분', '30일 조회 없음 → 누적 조회÷공개 영상(c10)으로 대체 표시'], ['CH-5 upload_consistency', '적용', '표본 업로드 간격 중앙값(범위 검색)'], ['CH-1 momentum / D-4b growth_trigger', '미확인', '30일 전 스냅샷 부재'], ['CH-7 channel_health', '미확인', 'engagement·전환 입력 부족'], ['B-2a completion / C-1b avg_view_pct / C-3a satisfaction', '미확인', 'Studio 시청 지속 자료 없음'], ['C-1a like_ratio / B-4a shorts_er', '부분', '좋아요 수집된 영상만(재생목록·GPT 42편)'], ['E-1b competition / E-2a opportunity', '부분', '검색량 없음 → 분야별 최근 1년 채널 수로 경쟁(c16)'], ['D-1a/b/c demand·supply·gap', '미확인', '검색량(외부 키워드 도구) 미연동'], ['E-2b revenue_estimate / B-6 RPM proxy', '부분', 'M5 고정 단가 1,000/2,000/4,000원 · M3 국가계수는 V11/플러스 패널'], ['M1~M5', '유지', 'lf-plus.js 그대로(M1 채널 실측·M2 비교군 실측·M3 vidIQ·M4 N3·M5 P1)'], ['business-fit-v1', '유지', '변경 없음 · 이 점수와 별도 표시'], ['shorts-workspace (쇼츠)', '참고만', '쇼츠 저장소는 읽기 전용, 수정 안 함']
      ].map(r => '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</tbody></table></div><p class="lf-hint">제작비·제작시간은 등급별 가정(S 3만 원·3h+0.08h/분, A 4만 원·5h+0.12h/분, B 8만 원·10h+0.25h/분, C 30만 원·30h+0.6h/분)이며 실측이 아닙니다. 실제 작업 시간을 기록하면 V7 파일럿 표에서 교체할 수 있습니다.</p>';
  }
  function render() {
    const body = document.querySelector('#lf-v14 [data-body]'); if (!body) return;
    const E = engine(); if (!E) { body.innerHTML = '<p>영상 자료를 읽는 중…</p>'; return; }
    const head = '<div class="lf-row" role="tablist">' + TABS.map(([k, t]) => '<button type="button" data-v14-tab="' + k + '" aria-pressed="' + (tab === k) + '">' + t + '</button>').join('') + '</div><p class="lf-hint">평가 풀 ' + nf(E.pool.length) + '편 · 새 영상이 추가되면 자동 재평가 · 모든 금액은 추정(실제 정산 아님)</p>';
    let h = '';
    if (tab === 'video') { const L = E.pool.map(v => [v, E.scores.get(v.id)]).filter(x => x[1]?.rank != null).sort((a, b) => b[1].rank - a[1].rank).slice(0, 100); h = '<div class="lf-table-wrap"><table>' + vhead + '<tbody>' + L.map(([v, s], i) => vrow(v, s, i)).join('') + '</tbody></table></div>'; }
    if (tab === 'channel') { const L = chanRows(E).slice(0, 100); h = '<div class="lf-table-wrap"><table><thead><tr><th>#</th><th>채널</th><th>기회 점수(상위 3편 평균)</th><th>표본</th><th>구독자</th><th>개설 경과</th><th>공개 영상</th><th>표본 중앙값</th><th>반복 성공률</th><th>월 추정(중)</th><th>근거 충족률</th><th>분야</th></tr></thead><tbody>' + L.map((c, i) => '<tr><td>' + (i + 1) + '</td><th>' + esc(c.ch) + '</th><td data-n="' + c.score + '">' + nf(c.score, 1) + '</td><td data-n="' + c.n + '">' + c.n + '</td><td data-n="' + (c.subs ?? '') + '">' + nf(c.subs) + '</td><td data-n="' + (c.chAge ?? '') + '">' + (c.chAge == null ? '미확인' : nf(c.chAge) + '일') + '</td><td data-n="' + (c.chVideos ?? '') + '">' + nf(c.chVideos) + '</td><td data-n="' + (c.median ?? '') + '">' + nf(c.median) + '</td><td data-n="' + (c.repeat ?? '') + '">' + P(c.repeat) + '</td><td>' + M(c.monthly) + '</td><td data-n="' + c.cov + '">' + P(c.cov) + '</td><td>' + esc(c.cat ? c.cat.cls + ' ' + c.cat.label : '미분류') + '</td></tr>').join('') + '</tbody></table></div>'; }
    if (tab === 'cat') { const L = catRows(E); h = '<div class="lf-table-wrap"><table><thead><tr><th>#</th><th>분야</th><th>제작 등급(가설)</th><th>기회 점수(상위 20편)</th><th>영상</th><th>채널</th><th>후발 재현 K/n</th><th>최근 1년 경쟁 채널</th><th>사업 확장</th><th>구매 의도</th></tr></thead><tbody>' + L.map((c, i) => '<tr><td>' + (i + 1) + '</td><th>' + esc(c.cat.label) + '</th><td>' + c.cat.cls + '</td><td data-n="' + c.score + '">' + nf(c.score, 1) + '</td><td data-n="' + c.n + '">' + nf(c.n) + '</td><td data-n="' + c.chans + '">' + nf(c.chans) + '</td><td>' + (c.K != null ? c.K + '/' + c.nYoung : '표본 부족') + '</td><td data-n="' + (c.comp ?? '') + '">' + nf(c.comp) + '</td><td>' + c.cat.business + '</td><td>' + c.cat.purchase + '</td></tr>').join('') + '</tbody></table></div><p class="lf-hint">성공 채널만 세지 않고, 같은 분야 최근 1년 개설 채널 전체 n 중 성공 K를 셉니다(실패 포함).</p>'; }
    if (tab === 'market') { const by = {}; for (const v of E.pool) { const s = E.scores.get(v.id); if (!s?.market || s.rank == null) continue; (by[s.market] ??= []).push(s.rank); } const L = Object.entries(by).map(([k, r]) => { r.sort((a, b) => b - a); const t = r.slice(0, 50); return [k, r.length, t.reduce((a, b) => a + b, 0) / t.length]; }).sort((a, b) => b[2] - a[2]); const C = extra.countries; h = '<p class="lf-hint">언어 시장 = 제목·채널명 문자 기준(채널 운영국·시청국과 다름). 영어 영상에 미국 RPM을 자동 적용하지 않습니다.</p><div class="lf-table-wrap"><table><thead><tr><th>언어 시장</th><th>영상</th><th>상위 50편 기회 점수</th></tr></thead><tbody>' + L.map(r => '<tr><th>' + r[0] + '</th><td data-n="' + r[1] + '">' + nf(r[1]) + '</td><td data-n="' + r[2] + '">' + nf(r[2], 1) + '</td></tr>').join('') + '</tbody></table></div>' + (C ? '<h4>국가별 근거 (' + esc(C.asOf || '') + ')</h4><div class="lf-table-wrap"><table><thead><tr><th>국가</th><th>YouTube 이용자</th><th>RPM·CPM 근거</th><th>주 언어</th><th>AI 현지화</th><th>상거래·제휴</th></tr></thead><tbody>' + C.countries.map(c => '<tr><th>' + esc(c.name) + '</th><td>' + (c.ytUsers?.value != null ? esc(String(c.ytUsers.value)) + ' <small>(' + esc(c.ytUsers.year || '') + ' · ' + (c.ytUsers.source ? '<a href="' + esc(c.ytUsers.source) + '" target="_blank" rel="noopener noreferrer">출처</a>' : '') + ')</small>' : '미확인') + '</td><td>' + ((c.rpm || []).map(r => esc(r.value + ' ' + (r.unit || '') + ' ' + (r.niche || '')) + (r.source ? ' <a href="' + esc(r.source) + '" target="_blank" rel="noopener noreferrer">출처</a>' : '')).join('<br>') || '미확인') + '</td><td>' + esc(c.lang || '') + '</td><td>' + esc((c.aiLocalization?.level || '미확인') + (c.aiLocalization?.basis ? ' · ' + c.aiLocalization.basis : '')) + '</td><td>' + esc(c.commerce?.note || '미확인') + (c.commerce?.source ? ' <a href="' + esc(c.commerce.source) + '" target="_blank" rel="noopener noreferrer">출처</a>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<p>국가별 근거 자료 수집 중(lf-countries.json).</p>'); }
    if (tab === 'young') { const L = E.pool.map(v => [v, E.scores.get(v.id), E.info(v) || {}]).filter(([v, s, i]) => s?.rank != null && i.subs != null && i.subs <= 50000 && i.chAge != null && i.chAge <= 365 && i.chVideos != null && i.chVideos <= 50 && i.x != null && i.x >= 2).sort((a, b) => b[1].rank - a[1].rank).slice(0, 100); h = '<p class="lf-hint">조건: 구독자 ≤5만 · 개설 ≤365일 · 공개 영상 ≤50 · 구독자 대비 2배↑ (범위 검색으로 1·3·7·10·14·30·60·90·180일, 3·5·10·20·30개, 100~1만 명, 2~100배 등 세부 조합 가능). 채널 개설일과 실제 첫 영상 게시일은 V6 카드의 "표본 최초 게시"로 구분.</p><div class="lf-table-wrap"><table>' + vhead + '<tbody>' + L.map(([v, s], i) => vrow(v, s, i)).join('') + '</tbody></table></div>'; }
    if (tab === 'bands') h = bands(E);
    if (tab === 'groups') h = gptExclude ? groupsTab(E) : '<p>GPT 42편 목록을 읽는 중… 다시 눌러 주세요.</p>';
    if (tab === 'audit') h = audit(E);
    if (tab === 'top20') { const L = top20(E); h = '<p class="lf-hint">분야 × 언어 시장 조합 중 상위 15편 기회 점수 평균 순. 참고 영상 8편·추천 채널 최대 5곳 연결. 제작시간·비용은 등급 가정, 순이익 = 채널 월 추정(중) − 제작비 × 월 8편. 근거 충족률이 낮으면 잠정.</p>' + L.map((t, i) => '<details class="v14-t20" data-t20="' + i + '"' + (i < 1 ? ' open' : '') + '><summary><b>' + (i + 1) + '. ' + esc(t.cat.label) + ' · ' + esc(t.mk) + '</b> · 기회 ' + nf(t.score, 1) + ' · 근거 ' + P(t.cov) + (t.cov < 0.6 ? ' <span class="v14-tent">잠정</span>' : '') + ' · 제작 ' + t.cat.cls + '등급</summary><div class="v14-grid"><div><b>영상당 추정(참고 8편 중앙값)</b> ' + (t.views != null ? [1, 2, 4].map(k => M(t.views * k)).join(' / ') : '미확인') + '<br><b>채널 월 추정(중앙값)</b> ' + (t.monthly != null ? [0.5, 1, 2].map(k => M(t.monthly * k)).join(' / ') : '미확인') + '<br><b>반복 성공률(중앙값)</b> ' + P(t.repeat) + '<br><b>신생·저구독 성과</b> ' + esc(t.young) + '<br><b>경쟁(최근 1년 채널 수)</b> ' + nf(t.comp) + '<br><b>AI 제작 시간·비용(가정)</b> ' + nf(t.hours, 1) + '시간 · ' + M(t.cost) + '/편<br><b>예상 순이익(월, 중)</b> ' + M(t.net, '채널 월 추정 − 제작비 × 8편') + '<br><b>사업 확장성</b> ' + t.cat.business + ' · <b>구매 의도</b> ' + t.cat.purchase + '<br><b>추천 국가·언어</b> ' + esc(t.mk) + (t.mk === 'KR' ? ' → 일본어 현지화 검토' : t.mk === 'JP' ? ' → 한국어·영어 역현지화 검토' : '') + '<br><b>제작 단계</b> ' + esc(t.steps) + '<br><b>추천 이유</b> 같은 분야·언어에서 상위 영상 기회 점수가 높고 참고 영상이 8편 이상 있습니다.<br><b>위험</b> 저작권(타사 영상·뉴스 화면), 정치·혐오 표현(국뽕), 반복 템플릿 판정, 실제 정산 미확인' + (t.cat.key === 'kukppong' ? '<br><b>제목·썸네일·대본 구조</b> V9 일본뽕 썸네일 규칙 10개 · V7 핵심 채널 15편 훅 분석 참고' : '') + '</div><div><b>추천 채널</b><ul>' + t.chs.map(c => '<li>' + esc(c.ch) + ' · 기회 ' + nf(c.s.rank, 1) + '</li>').join('') + '</ul></div></div><div data-t20-body>' + (i < 1 ? t20table(E, t) : '<p class="lf-hint">펼치면 참고 영상 8편이 열립니다.</p>') + '</div></details>').join(''); lastT20 = L; }
    if (tab === 'survival') { const S = extra.survival; h = S ? '<p class="lf-hint">' + esc(S.method || '') + '</p><pre class="v14-pre">' + esc(JSON.stringify(S.summary, null, 1)) + '</pre><div class="lf-table-wrap"><table><thead><tr><th>채널</th><th>상태</th><th>최근 업로드</th><th>최근 30일</th><th>최신 10편 중앙값</th><th>AI 표기</th><th>템플릿 반복</th></tr></thead><tbody>' + (S.channels || []).map(c => '<tr><th>' + esc(c.name || c.channel || '') + '</th><td>' + esc(c.status || '미확인') + '</td><td>' + esc(c.lastUpload || c.lastUploadApprox || '미확인') + '</td><td>' + nf(c.uploads30 ?? c.uploads30d) + '</td><td>' + nf(c.median10 ?? c.recentMedian) + '</td><td>' + esc(c.aiDisclosure || c.ai || '') + '</td><td>' + esc(c.templateSimilarity != null ? String(c.templateSimilarity) : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<p>AI 경제·교육 채널 생존 조사 자료 준비 중(lf-ai-econ-survival.json).</p>'; }
    if (tab === 'progress') { const L = catRows(E); const G = extra.discovery; const ms = [35, 100, 300, 500, 1000]; h = '<p class="lf-hint">목표: 세부 분야별 신규 후보 1,000개 · 35 → 100 → 300 → 500 → 1,000 단계 · 영상 ID·채널 ID 기준 중복 제거 · 예약 실행이 매회 기록을 갱신합니다.</p><div class="lf-table-wrap"><table><thead><tr><th>분야</th><th>현재 영상</th><th>채널</th><th>다음 단계</th><th>진행</th></tr></thead><tbody>' + L.map(c => { const nx = ms.find(m => c.n < m) || 1000; return '<tr><th>' + esc(c.cat.label) + '</th><td data-n="' + c.n + '">' + nf(c.n) + '</td><td>' + nf(c.chans) + '</td><td>' + nx + '</td><td>' + Math.min(100, Math.trunc(c.n / 1000 * 100)) + '% / 1,000</td></tr>'; }).join('') + '</tbody></table></div>' + (G ? '<h4>예약 실행 기록</h4><div class="lf-table-wrap"><table><thead><tr><th>실행</th><th>저장 지점</th><th>신규 영상</th><th>신규 채널</th><th>검증 성공/실패</th><th>수익 산정</th><th>커밋</th><th>다음 작업</th></tr></thead><tbody>' + (G.runs || []).slice(-30).reverse().map(r => '<tr><td>' + esc(r.at || '') + '</td><td>' + esc(r.checkpoint || '') + '</td><td>' + nf(r.newVideos) + '</td><td>' + nf(r.newChannels) + '</td><td>' + nf(r.verifyOk) + '/' + nf(r.verifyFail) + '</td><td>' + nf(r.revenue) + '</td><td>' + esc(r.commit || '') + '</td><td>' + esc(r.next || '') + '</td></tr>').join('') + '</tbody></table></div>' : ''); }
    body.innerHTML = head + h;
  }
  // ---------- menu recommended order ----------
  let orig = null;
  function menuScore(m) { const E = engine(); if (!E || typeof m.filter !== 'function') return null; const r = []; for (const v of E.pool) { let ok = false; try { ok = m.filter(v); } catch { ok = false; } if (ok) { const s = E.scores.get(v.id); if (s?.rank != null) r.push(s.rank); } } if (r.length < 3) return null; r.sort((a, b) => b - a); const t = r.slice(0, 10); return t.reduce((a, b) => a + b, 0) / t.length; }
  function recommendOrder(on) {
    const menu = window.LFData?.menu?.() || []; const byKey = new Map(menu.map(m => [m.key, m]));
    const navs = [...document.querySelectorAll('nav.nav, #mainNav, #topicNav, #tagNav, #batchNav, #flowerNav')].filter((n, i, a) => a.indexOf(n) === i);
    if (on) {
      orig = navs.map(n => [n, [...n.children]]);
      for (const n of navs) { const kids = [...n.children]; const scored = kids.map((el, i) => { const b = el.matches('[data-section]') ? el : el.querySelector('[data-section]'); const m = b && byKey.get(b.dataset.section); const s = m && m.key !== 'all' ? menuScore(m) : null; if (b && s != null) { let t = b.querySelector('.v14-ms'); if (!t) { t = document.createElement('small'); t.className = 'v14-ms'; b.appendChild(t); } t.textContent = ' ⭐' + nf(s, 0); } return { el, s, i }; }); const movable = scored.filter(x => x.s != null); if (movable.length < 2) continue; const slots = movable.map(x => x.i).sort((a, b) => a - b); const sortedM = movable.slice().sort((a, b) => b.s - a.s); const res = kids.slice(); slots.forEach((slot, j) => { res[slot] = sortedM[j].el; }); for (const el of res) n.appendChild(el); }
    } else if (orig) { for (const [n, kids] of orig) for (const el of kids) n.appendChild(el); for (const t of document.querySelectorAll('.v14-ms')) t.remove(); orig = null; }
  }
  // ---------- mount ----------
  const css = '.v14-badge{font-size:12px;margin:3px 0;padding:2px 6px;border-radius:5px;background:rgba(255,77,77,.12);border:1px solid rgba(255,77,77,.5)}.v14-badge b{color:#ff6b5b}.v14-tent{color:#ffb347;font-weight:700}.v14-grid{display:grid;grid-template-columns:2fr 1fr;gap:10px;font-size:13px;margin:6px 0}@media(max-width:800px){.v14-grid{grid-template-columns:1fr}}.v14-t20{border:1px solid #2f3747;border-radius:8px;padding:6px 8px;margin:6px 0}.v14-pre{white-space:pre-wrap;font-size:12px;max-height:280px;overflow:auto}.v14-ms{color:#ff8b7b;font-size:10px}#v14-menuorder[aria-pressed=true]{color:#ff4d4d;border-color:#ff4d4d}';
  window.LFV14UI = {
    mount() {
      if (window.__v14) return; window.__v14 = true;
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      registerSorts();
      const root = document.getElementById('lf-v14');
      if (root) { root.innerHTML = '<summary>⭐ V14 제작·수익 기회 종합 평가 · 지금 제작 TOP 20 · 영상/채널/분야/국가 순위</summary><div data-body><p class="lf-hint">열면 계산합니다.</p></div>'; root.addEventListener('toggle', () => { if (root.open) render(); }); root.addEventListener('click', e => { const b = e.target.closest('[data-v14-tab]'); if (b) { tab = b.dataset.v14Tab; render(); } }); }
      const bar = document.querySelector('.lf-menu-editbar');
      if (bar && !document.getElementById('v14-menuorder')) { bar.insertAdjacentHTML('afterbegin', '<button type="button" id="v14-menuorder" aria-pressed="false" title="내가 편집한 순서는 저장된 그대로 두고, 화면에서만 추천순으로 바꿉니다">분야 추천순 보기</button>'); document.getElementById('v14-menuorder').addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? '내 메뉴 순서로 복귀' : '분야 추천순 보기'; recommendOrder(on); }); }
      for (const [k, f] of [['countries', 'lf-countries.json'], ['survival', 'lf-ai-econ-survival.json'], ['discovery', 'lf-discovery-log.json']]) fetch(f).then(r => r.ok ? r.json() : null).then(j => { if (j) { extra[k] = j; if (root?.open) render(); } }).catch(() => {});
      let pend = false; new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; decorate(); }); }).observe(document.getElementById('grid') || document.body, { childList: true, subtree: true });
      decorate();
      return { open(k) { if (k) tab = k; if (root) { root.open = true; render(); root.scrollIntoView({ block: 'start' }); } } };
    },
    engine
  };
})();
