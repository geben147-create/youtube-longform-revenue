/* V14 opportunity score (MASTER V13 spec): 20 weighted criteria, percentile normalization, evidence coverage.
   Separate from business-fit-v1 (never modified). Unknown inputs stay unknown (excluded from coverage, never 0 or full). */
'use strict';
(function (root) {
  const DAY = 864e5;
  // ---- category classes (initial hypothesis from the brief; adjusted by evidence later) ----
  const CATS = [
    ['fullmovie', '영화·드라마 전편 업로드(저작권 위험)', 'B', /full movie|full film|full episode|풀버전|전편|전체 회차|完整版|全集|全話/i, 0.1, 0.2],
    // key, label, class, regex, business(0-1), purchase(0-1)
    ['ai-invest', 'AI 투자·주식·ETF·코인·경제', 'S', /AI ?(투자|주식|ETF|코인|경제)|주식|주가|증시|폭락|폭등|ETF|코인|비트코인|배당|금리|경제|재테크|부동산|자산|노후 자금|돈 모|연봉|월급|株|投資|NISA|stock|invest|crypto|bitcoin|dividend|econom/i, 1, 1],
    ['ai-biz', 'AI 창업·마케팅·자동화·전자책', 'S', /창업|마케팅|자동화|전자책|SaaS|부업|수익화|사업|副業|起業|marketing|automation|side hustle|ebook|business/i, 1, 0.9],
    ['kukppong', '한일 국뽕·해외반응', 'S', /국뽕|해외반응|외국인|海外の反応|日本人|韓国人|外国人|称賛|絶賛|reaction|korea|japan/i, 0.35, 0.35],
    ['war-doc', '전쟁·전투기·잠수함·산업·재난 다큐', 'S', /전쟁|전투|전투기|잠수함|전함|무기|방산|전란|대전|세계대전|재난|참사|사고|폭발|산업|war|battle|fighter|submarine|navy|disaster|explosion|戦|軍|艦/i, 0.3, 0.45],
    ['science', '건축·과학·공학·지식', 'S', /건축|과학|공학|구조물|우주|기술|원리|물리|engineer|science|architect|physics|space|how it works|建築|科学|技術/i, 0.45, 0.5],
    ['travel', '여행·드론·풍경·세계 문화', 'S', /여행|드론 영상|드론 촬영|풍경|도시 걷기|걷기|walking tour|travel|drone footage|aerial|旅|散歩/i, 0.4, 0.45],
    ['kids-edu', 'AI 어린이 영어 교육', 'A', /어린이|키즈|동요|영어 공부|파닉스|kids|nursery|phonics|子供|童謡/i, 0.6, 0.6],
    ['animal', '동물 이야기·캐릭터', 'A', /동물|고양이|강아지|cat|dog|animal|猫|犬/i, 0.25, 0.35],
    ['history', '역사 복원·과거 문화·야담', 'A', /역사|조선|왕조|고대|중세|야담|history|ancient|medieval|歴史|江戸|昭和/i, 0.35, 0.45],
    ['story', '감동·반전 이야기', 'A', /감동|사연|반전|눈물|실화|story|感動|涙|物語/i, 0.25, 0.35],
    ['sexedu', '성역사·성과학·성문화', 'A', /성(역사|과학|문화)|性の歴史|sex (history|education)/i, 0.3, 0.3],
    ['health', '건강·뷰티·시니어 생활', 'A', /건강|뷰티|노후|시니어|연금|보험|health|beauty|senior|pension|健康|老後|年金/i, 0.75, 0.75],
    ['senior-drama', '시니어 가족 드라마', 'B', /시니어 드라마|며느리|시어머니|가족 드라마|노부부|嫁|姑/i, 0.25, 0.4],
    ['film', '전쟁·액션·SF·좀비·역사 드라마 영화', 'B', /영화|드라마|좀비|외계인|에일리언|SF|생존|사막|movie|film|zombie|alien|survival|drama|映画|ドラマ/i, 0.2, 0.3],
    ['onscreen', '출연·대규모 촬영형', 'C', /MrBeast|challenge|챌린지|예능|vlog|브이로그/i, 0.3, 0.3]
  ];
  const CLASS = { S: { ease: 1, cost: 30000, base: 3, perMin: 0.08 }, A: { ease: 0.75, cost: 40000, base: 5, perMin: 0.12 }, B: { ease: 0.45, cost: 80000, base: 10, perMin: 0.25 }, C: { ease: 0.15, cost: 300000, base: 30, perMin: 0.6 } };
  function category(v) { const t = [v.t, v.ch, v.k, ...(v.ks || []), ...(v.b || [])].join(' '); for (const c of CATS) if (c[3].test(t)) return { key: c[0], label: c[1], cls: c[2], business: c[4], purchase: c[5] }; return null; }
  function market(v) { const t = (v.t || '') + ' ' + (v.ch || ''); if (/[\u3040-\u30ff]/.test(t)) return 'JP'; if (/[가-힣]/.test(t)) return 'KR'; if (/[\u4e00-\u9fff]/.test(t)) return 'CN'; if (/[a-z]/i.test(t)) return 'EN'; return null; }
  const W = [
    ['c1', '지속 월수익', 12], ['c2', '시간당 순이익', 10], ['c3', 'AI 제작 용이성', 9], ['c4', '반복 성공률', 8], ['c5', '상품·사업 확장성', 7],
    ['c6', '빠른 수익화', 7], ['c7', '영상당 수익', 6], ['c8', '저구독 고조회', 5], ['c9', '신생 채널 성공', 5], ['c10', '적은 영상 고성과', 4],
    ['c11', '최신 조회 성장 속도', 4], ['c12', '아웃라이어', 4], ['c13', '중앙값·하위 안정성', 3], ['c14', '최고작 의존 낮음', 3], ['c15', '독립 후발 재현', 3],
    ['c16', '낮은 경쟁', 2], ['c17', '해외·현지화 기회', 2], ['c18', '구매력·구매 의도', 2], ['c19', '길이 대비 제작 효율', 2], ['c20', '최근 게시·최신 성공', 2]
  ];
  const ASSUMED = new Set(['c2', 'c3', 'c5', 'c17', 'c18', 'c19']); // derived from category class assumptions
  const MARKET_OPP = { JP: 0.7, EN: 0.5, KR: 0.45, CN: 0.4 }; // hypothesis: fewer AI-narration competitors in JP long-form (see 국가 탭 근거)
  // ---- raw values ----
  function raw(v, ctx) {
    const c = ctx.channel(v), i = ctx.info(v) || {}, cat = category(v), cls = cat ? CLASS[cat.cls] : null, rpm = 2;
    const age = v.d ? Math.max(1, (ctx.now - Date.parse(v.d)) / DAY) : null;
    const min = Number.isFinite(v.s) ? v.s / 60 : null;
    const hours = cls && min != null ? cls.base + cls.perMin * min : null;
    const perVideo = Number.isFinite(v.v) ? v.v * rpm : null;
    const monthly = c && c.n >= 3 && c.median != null && c.monthly != null ? c.median * c.monthly * rpm : null;
    const ch = i.chAge ?? null;
    return {
      c1: monthly,
      c2: perVideo != null && cls && hours ? (perVideo - cls.cost) / hours : null,
      c3: cls ? Math.min(1, cls.ease + (v.ai ? 0.1 : 0)) : null,
      c4: c && c.n >= 5 ? c.repeat : null,
      c5: cat ? cat.business : null,
      c6: i.subs != null && ch != null ? i.subs / Math.max(ch, 1) : null,
      c7: perVideo,
      c8: i.x ?? null,
      c9: ch == null || !Number.isFinite(v.v) ? null : (ch <= 365 ? Math.log10(1 + v.v) * (1 - ch / 365) : 0),
      c10: i.chViews != null && i.chVideos ? i.chViews / i.chVideos : null,
      c11: age != null && Number.isFinite(v.v) ? v.v / age : null,
      c12: ctx.outlier(v),
      c13: c && c.n >= 5 && c.mean ? c.median / c.mean : null,
      c14: c && c.n >= 5 && c.views.length > 2 ? 1 - (c.views[c.views.length - 1] + c.views[c.views.length - 2]) / c.views.reduce((a, b) => a + b, 0) : null,
      c15: cat ? ctx.catRepro(cat.key) : null,
      c16: cat ? ctx.catCompetition(cat.key) : null, // lower is better (handled by inverse)
      c17: market(v) ? MARKET_OPP[market(v)] ?? null : null,
      c18: cat ? cat.purchase : null,
      c19: perVideo != null && hours ? perVideo / hours / Math.max(min || 1, 1) : null,
      c20: age != null ? Math.max(0, 1 - Math.min(age, 365) / 365) : null
    };
  }
  const LOWER_BETTER = new Set(['c16']);
  // ---- engine ----
  function build(pool, opt) {
    const now = opt.now || Date.now();
    const terms = s => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
    const chMap = opt.channels ? opt.channels() : new Map();
    const channel = v => chMap.get(terms(v.ch)) || null;
    const info = opt.info || (() => ({}));
    const outlier = v => { const c = channel(v); if (!c || !Number.isFinite(v.v)) return null; const o = c.views.slice(), k = o.indexOf(v.v); if (k >= 0) o.splice(k, 1); if (o.length < 3) return null; const m = (o[Math.floor((o.length - 1) / 2)] + o[Math.ceil((o.length - 1) / 2)]) / 2; return m > 0 ? v.v / m : null; };
    // category-level: reproduction K/n (channels joined ≤365d with sample median ≥10k) and competition (distinct channels posting in last 365d)
    const catCh = new Map();
    for (const v of pool) { const cat = category(v); if (!cat) continue; let m = catCh.get(cat.key); if (!m) catCh.set(cat.key, m = { chans: new Map(), recent: new Set() }); const c = channel(v); if (c) m.chans.set(terms(v.ch), { c, chAge: (info(v) || {}).chAge ?? null }); if (v.d && now - Date.parse(v.d) <= 365 * DAY) m.recent.add(terms(v.ch)); }
    const repro = new Map(), comp = new Map();
    for (const [k, m] of catCh) { const young = [...m.chans.values()].filter(x => x.chAge != null && x.chAge <= 365 && x.c.n >= 3); repro.set(k, young.length >= 5 ? { K: young.filter(x => x.c.median >= 1e4).length, n: young.length } : null); comp.set(k, m.recent.size); }
    const ctx = { now, channel, info, outlier, catRepro: k => repro.get(k) ? repro.get(k).K / repro.get(k).n : null, catCompetition: k => comp.get(k) ?? null };
    const rows = pool.map(v => ({ v, r: raw(v, ctx) }));
    // percentile normalization per criterion (ties share rank); values unknown stay unknown
    const sorted = {};
    for (const [k] of W) sorted[k] = rows.map(x => x.r[k]).filter(x => x != null && Number.isFinite(x)).sort((a, b) => a - b);
    const pct = (k, x) => { const a = sorted[k]; if (!a.length) return null; let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; } let up = lo; while (up < a.length && a[up] === x) up++; const p = a.length === 1 ? 1 : ((lo + up - 1) / 2) / (a.length - 1); return LOWER_BETTER.has(k) ? 1 - p : p; };
    const out = new Map();
    for (const { v, r } of rows) {
      let got = 0, cov = 0, parts = {};
      for (const [k, , w] of W) { const x = r[k]; if (x == null || !Number.isFinite(x)) { parts[k] = null; continue; } const n = pct(k, x); parts[k] = { raw: x, norm: n, pts: w * n, assumed: ASSUMED.has(k) }; got += w * n; cov += w; }
      const coverage = cov / 100, scaled = cov ? got / cov * 100 : null;
      const rank = scaled == null ? null : scaled * Math.min(1, coverage / 0.75);
      out.set(v.id, { score: got, coverage, scaled, rank, tentative: coverage < 0.6, parts, cat: category(v), market: market(v) });
    }
    return { scores: out, repro, comp, weights: W, assumed: [...ASSUMED], classes: CLASS, cats: CATS.map(c => ({ key: c[0], label: c[1], cls: c[2], business: c[4], purchase: c[5] })) };
  }
  const API = { build, category, market, weights: W, classes: CLASS, cats: CATS };
  if (typeof module !== 'undefined') module.exports = API; else root.LFOpp = API;
})(typeof window !== 'undefined' ? window : globalThis);
