/* LONGFORM comparison workspace. Catalog reads only; YouTube playback is opt-in. */
(function (window) {
  'use strict';

  const KR = ['단골이슈', '쓸모왕', '위대한언니', '잡식왕'];
  const JP = ['ネットの反応ちゃんねる', '世界が驚く日本の力', '驚愕JAPAN 〜世界が驚いた日本〜'];
  const PURR = ['Purrverse', 'MooMelloKids'];
  const PRESETS = [
    { id: 'purrverse', label: 'Purrverse', names: PURR, note: 'Purrverse와 카탈로그의 인접 사례 MooMelloKids를 비교합니다. 같은 형식·시장 표본은 아닙니다.', evidenceNote: 'Purrverse 대표 흥행작과 확인된 마지막 롱폼을 함께 표시합니다. 같은 경과일(D30) 비교가 아닙니다.' },
    { id: 'korea', label: '한국 채널 4곳', names: KR, note: '한국 해외반응 채널 4곳을 같은 화면에 표시합니다.' },
    { id: 'japan', label: '일본 채널 3곳', names: JP, note: '일본·한일 반응 채널 3곳을 같은 화면에 표시합니다.' }
  ];
  const ALIASES = [
    ['Purrverse', '@purrverse', '@Purrverse-US', 'UC3VL7eziAD94S6_qwdStoMA'], ['MooMelloKids', '@MooMelloKids'],
    [KR[0], '@dangolissue'], [KR[1], '@sslmowang'], [KR[2], '@Wonder_Sister'], [KR[3], '@issueking'],
    [JP[0], '@ネットの反応ちゃんねる'], [JP[1], 'UCX1gBcS1IpiVG4xCkutSohw'],
    [JP[2], '驚愕JAPAN', '@Kyōgaku_Japan', '@Ky%C5%8Dgaku_Japan']
  ];
  const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
  const RPM = [1000, 2000, 4000];
  const MAX = 4;
  const UNKNOWN = '<span class="lfc-unknown">미확인</span>';
  const LETTERS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const defaultEscape = value => String(value ?? '').replace(/[&<>"']/g, c => LETTERS[c]);
  const text = value => typeof value === 'string' ? value.trim() : '';
  const list = value => Array.isArray(value) ? value : [];
  const nf = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
  const count = value => {
    if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())) value = Number(value);
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  };
  const normalize = value => {
    let name = text(value);
    try { name = decodeURIComponent(name); } catch { /* Invalid encoding is left literal. */ }
    return name.normalize('NFKC').toLowerCase().replace(/[\s@._·・~〜～–—-]+/gu, '');
  };
  const vid = row => typeof row?.id === 'string' && VIDEO_ID.test(row.id) ? row.id : '';
  const title = row => text(row?.t ?? row?.title);
  const videoChannel = row => text(row?.ch ?? row?.channel ?? row?.channelName);
  const watch = id => `https://www.youtube.com/watch?v=${id}`;
  const source = value => {
    try {
      const url = new URL(text(value));
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  };
  const groupName = row => typeof row === 'string' ? text(row) : text(row?.name ?? row?.channelName ?? row?.channel ?? row?.ch);
  const handle = value => {
    try {
      const url = new URL(source(value));
      if (!/(?:^|\.)youtube\.com$/i.test(url.hostname)) return '';
      const pieces = url.pathname.split('/').filter(Boolean);
      return pieces[0]?.startsWith('@') ? pieces[0] : pieces[0] === 'channel' ? pieces[1] || '' : '';
    } catch { return ''; }
  };
  const parseGroups = raw => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.channels)) return raw.channels;
    if (Array.isArray(raw?.rows)) return raw.rows;
    if (raw instanceof Map) return Array.from(raw, ([name, item]) => ({ ...(item && typeof item === 'object' && !Array.isArray(item) ? item : {}), name }));
    if (raw && typeof raw === 'object') return Object.entries(raw).map(([name, item]) => ({ ...(item && typeof item === 'object' && !Array.isArray(item) ? item : {}), name }));
    return [];
  };
  const fmtDuration = value => {
    if (value === null) return UNKNOWN;
    const s = Math.floor(value), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s % 60).padStart(2, '0')}`;
  };
  const call = (fn, ...args) => { try { return typeof fn === 'function' ? fn(...args) : undefined; } catch { return undefined; } };
  const dateText = value => /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(text(value)) ? value.trim() : '';
  const viewCount = row => count(row?.v ?? row?.views);
  const compareVideos = (a, b) => ((viewCount(b) ?? -1) - (viewCount(a) ?? -1)) || text(b.d ?? b.date).localeCompare(text(a.d ?? a.date)) || vid(a).localeCompare(vid(b));
  const mounts = new WeakMap();

  const CSS = `
#lf-compare{--lfc-ink:#20354d;--lfc-muted:#506780;--lfc-line:#cbd8e6;--lfc-blue:#184f85;--lfc-pale:#f2f7fc;min-width:0;color:var(--lfc-ink);scroll-margin-top:1rem}
#lf-compare .lfc-shell{background:#fff;border:1px solid var(--lfc-line);border-radius:12px;padding:clamp(12px,2vw,22px)}
#lf-compare h2{font-size:1.3rem;line-height:1.2;margin:0 0 8px;color:var(--lfc-ink)}
#lf-compare .lfc-tip{font-size:.87rem;color:var(--lfc-muted);margin:6px 0;line-height:1.45}
#lf-compare .lfc-tools,#lf-compare .lfc-chips,#lf-compare .lfc-actions,#lf-compare .lfc-finder{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0}
#lf-compare button,.lfc-add{border:1px solid #9db6cf;border-radius:7px;background:#fff;color:#164c7f;cursor:pointer;font:inherit;font-size:.83rem;font-weight:650;padding:5px 9px;line-height:1.25;text-align:center}
#lf-compare button:hover,.lfc-add:hover{background:#e7f1fc}
#lf-compare button[aria-pressed="true"],.lfc-add[aria-pressed="true"]{background:#d9ecfc;border-color:#598cbd}
#lf-compare button:focus-visible,#lf-compare a:focus-visible,#lf-compare input:focus-visible,#lf-compare select:focus-visible,.lfc-add:focus-visible{outline:2px solid #156bb9;outline-offset:2px}
#lf-compare button:disabled{opacity:.55;cursor:not-allowed}
#lf-compare .lfc-finder label{font-size:.84rem;font-weight:650}
#lf-compare .lfc-finder input,#lf-compare .lfc-finder select{min-width:0;max-width:100%;border:1px solid #a0b5ca;border-radius:7px;background:#fff;color:#20354d;padding:6px;font:inherit;font-size:.84rem}
#lf-compare .lfc-chip{max-width:100%;overflow-wrap:anywhere;text-align:left}
#lf-compare .lfc-status{min-height:1.3em;margin:7px 0;color:var(--lfc-blue);font-size:.84rem;font-weight:700}
#lf-compare .lfc-scroll{max-width:100%;overflow:auto;margin-top:10px;border:1px solid var(--lfc-line);border-radius:9px}
#lf-compare table{width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;color:var(--lfc-ink);font-size:.83rem;line-height:1.35}
#lf-compare .lfc-label-col{width:clamp(100px,14vw,165px)}
#lf-compare td,#lf-compare th{padding:7px 9px;border-bottom:1px solid #dce6f0;border-right:1px solid #dce6f0;text-align:left;vertical-align:top;overflow-wrap:anywhere}
#lf-compare th:last-child,#lf-compare td:last-child{border-right:0}
#lf-compare tbody tr:last-child>*{border-bottom:0}
#lf-compare thead th,#lf-compare th[scope="row"]{background:var(--lfc-pale)}
#lf-compare thead th{font-size:.94rem}
#lf-compare .lfc-unknown{color:var(--lfc-muted);font-size:.83em}
#lf-compare .lfc-data-list{margin:0;padding-left:1.1em}
#lf-compare a{color:var(--lfc-blue);text-decoration:underline;text-underline-offset:2px}
#lf-compare .lfc-actions{margin:5px 0 0}
#lf-compare .lfc-player{border:1px solid var(--lfc-line);border-radius:8px;margin-top:10px;padding:8px;max-width:900px}
#lf-compare .lfc-player iframe{display:block;width:100%;height:auto;aspect-ratio:16/9;border:0;background:#101820;border-radius:5px}
@media(max-width:670px){#lf-compare th,#lf-compare td{padding:6px}#lf-compare .lfc-scroll table{min-width:var(--lfc-mobile-min,385px)}#lf-compare th[scope="row"],#lf-compare thead th:first-child{position:sticky;left:0;z-index:1}}
`;

  function mount({ esc: escape = defaultEscape, money, get, all, trend, metrics, groups } = {}) {
    const document = window.document;
    const root = document.getElementById('lf-compare');
    if (!root) return { videoButton: () => '', channelButton: () => '', representative: () => null, refresh: () => {} };
    if (mounts.has(root)) return mounts.get(root);
    if (!document.getElementById('lfc-styles')) {
      const style = document.createElement('style');
      style.id = 'lfc-styles';
      style.textContent = CSS;
      document.head.append(style);
    }
    const esc = value => escape(value ?? '');
    const fmt = value => count(value) === null ? UNKNOWN : esc(nf.format(count(value)));
    const moneyHtml = value => count(value) === null ? UNKNOWN : `${esc(call(money, value) ?? nf.format(value))}원`;
    const anchor = (url, label) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : UNKNOWN;
    let optional = [];
    let aliases = new Map();
    let channels = new Map();
    let videos = new Map();
    let evidenceVideos = new Map();
    let selected = [];
    let preset = '';
    let activePlayer = '';

    function index() {
      aliases = new Map();
      channels = new Map();
      videos = new Map();
      evidenceVideos = new Map();
      const localGroups = parseGroups(call(groups));
      function register(name, aliasesForName) {
        const raw = normalize(name);
        if (!raw) return;
        const key = aliases.get(raw) || raw;
        aliases.set(raw, key);
        for (const alias of aliasesForName) {
          const normalized = normalize(alias);
          if (normalized && !aliases.has(normalized)) aliases.set(normalized, key);
        }
        return key;
      }
      for (const [name, ...alias] of ALIASES) register(name, alias);
      for (const row of [...localGroups, ...optional]) {
        const name = groupName(row);
        const alias = [...list(row?.aliases), text(row?.handle), text(row?.channelId ?? row?.channel_id), handle(row?.url ?? row?.channel_url ?? row?.channelUrl)];
        register(name, alias);
      }
      const channel = name => {
        const key = resolve(name);
        if (!key) return null;
        if (!channels.has(key)) channels.set(key, { key, name, rows: [], group: null, evidence: null });
        return channels.get(key);
      };
      for (const preset of PRESETS) for (const name of preset.names) channel(name);
      for (const row of localGroups) {
        const item = channel(groupName(row));
        if (item && !item.group) item.group = row;
      }
      for (const row of optional) {
        const item = channel(groupName(row));
        if (!item || item.evidence) continue;
        item.evidence = row;
        for (const publicVideo of list(row.videos)) {
          const id = vid(publicVideo);
          if (!id || resolve(videoChannel(publicVideo)) !== item.key || publicVideo.live === true) continue;
          evidenceVideos.set(id, { ...publicVideo, id, t: title(publicVideo), ch: item.name, d: publicVideo.publishedAt, s: publicVideo.durationSeconds, v: publicVideo.views });
        }
      }
      for (const row of list(call(all))) {
        const id = vid(row);
        if (!id || videos.has(id)) continue;
        videos.set(id, row);
        const item = channel(videoChannel(row));
        if (item) item.rows.push(row);
      }
      for (const item of channels.values()) item.rows.sort(compareVideos);
    }

    function resolve(name) {
      const key = normalize(name);
      return aliases.get(key) || key;
    }

    function lookup(id) {
      if (typeof id !== 'string' || !VIDEO_ID.test(id)) return null;
      const row = call(get, id) || videos.get(id) || evidenceVideos.get(id);
      return vid(row) === id ? row : null;
    }

    function representative(name) {
      const item = channels.get(resolve(name));
      if (!item) return null;
      const evidenceId = text(item.evidence?.representative_id ?? item.evidence?.representativeVideoId ?? item.evidence?.representative?.id ?? item.evidence?.topId);
      const override = evidenceId && lookup(evidenceId);
      return override && resolve(videoChannel(override)) === item.key ? override : item.rows[0] ?? null;
    }

    function purrCompanion() {
      const evidence = channels.get(resolve(PURR[0]))?.evidence;
      const row = lookup(text(evidence?.lastLongformId ?? evidence?.lastUploadId));
      return row && resolve(videoChannel(row)) === resolve(PURR[0]) && vid(row) !== vid(representative(PURR[0])) ? { kind: 'v', id: vid(row), name: title(row) } : null;
    }

    function presetEntries(item) {
      const entries = item.names.map(name => ({ kind: 'c', id: resolve(name), name }));
      const companion = item.id === 'purrverse' ? purrCompanion() : null;
      return (companion ? [entries[0], companion] : entries).slice(0, MAX);
    }

    const entryKey = entry => `${entry.kind}:${entry.id}`;
    const isSelected = (kind, id) => selected.some(entry => entry.kind === kind && entry.id === id);
    function videoButton(row) {
      const id = vid(row);
      if (!id) return '';
      return `<button type="button" class="lfc-add" data-lfc-video="${esc(id)}" aria-label="영상 비교: ${esc(title(row) || id)}" aria-pressed="${isSelected('v', id)}">영상 비교</button>`;
    }
    function channelButton(name) {
      name = text(name);
      if (!name || !resolve(name)) return '';
      return `<button type="button" class="lfc-add" data-lfc-channel="${esc(name)}" aria-label="채널 비교: ${esc(name)}" aria-pressed="${isSelected('c', resolve(name))}">채널 비교</button>`;
    }

    const summary = root.querySelector(':scope > summary');
    root.innerHTML = `<div class="lfc-shell"><h2>영상·채널 나란히 비교</h2>
      <p class="lfc-tip">분야와 관계없이 영상 또는 채널을 2~4개 고르세요. 채널은 대표 영상 1편과 확인된 영상 수를 따로 표시합니다.</p>
      <div class="lfc-tools" role="group" aria-label="비교 프리셋">${PRESETS.map(p => `<button type="button" data-lfc-preset="${p.id}" aria-pressed="false">${p.label}</button>`).join('')}<button type="button" data-lfc-clear>선택 비우기</button></div>
      <div class="lfc-finder"><label for="lfc-mode">검색 대상</label><select id="lfc-mode"><option value="v">영상</option><option value="c">채널</option></select>
      <label for="lfc-query">카탈로그 검색</label><input type="search" id="lfc-query" list="lfc-results" placeholder="제목 · 채널 · 분야 · 영상 ID" autocomplete="off"/><datalist id="lfc-results"></datalist><button type="button" data-lfc-find>비교에 추가</button></div>
      <p class="lfc-status" role="status" aria-live="polite"></p><div class="lfc-chips" aria-label="선택한 비교 대상"></div>
      <div class="lfc-board"></div><div class="lfc-play-slot"></div>
      <p class="lfc-tip">낮음·기준·높음은 공개 누적 조회수 ÷ 1,000 × 1,000원 / 2,000원 / 4,000원입니다. 실제 정산액이나 월수익이 아닙니다. D30은 실제 30일차 관측이 있을 때만, 완료월은 확인된 월별 근거만 표시합니다. 서로 다른 표본은 추출 기준과 게시 후 경과일이 다를 수 있습니다.</p></div>`;
    if (summary?.tagName === 'SUMMARY') root.prepend(summary);
    const query = root.querySelector('#lfc-query');
    const mode = root.querySelector('#lfc-mode');
    const suggestions = root.querySelector('#lfc-results');
    const status = root.querySelector('.lfc-status');
    const chips = root.querySelector('.lfc-chips');
    const board = root.querySelector('.lfc-board');
    const player = root.querySelector('.lfc-play-slot');

    function describe(entry) {
      const item = entry.kind === 'c' ? channels.get(entry.id) : null;
      const row = entry.kind === 'v' ? lookup(entry.id) : representative(item?.name || entry.name);
      const ranking = row ? call(metrics, row) ?? {} : {};
      const name = entry.kind === 'v' ? title(row) || entry.name || entry.id : item?.name || entry.name;
      const channelName = item?.name || videoChannel(row);
      const movement = entry.kind === 'c' ? call(trend, channelName) ?? {} : {};
      return { entry, item, row, ranking, name, channelName, movement };
    }

    function months(ranking) {
      const rows = list(ranking.business?.monthly?.months ?? ranking.monthly?.months ?? ranking.completedMonths).filter(row => row && /^\d{4}-\d{2}$/.test(text(row.month)));
      if (!rows.length) return UNKNOWN;
      return `<ul class="lfc-data-list">${rows.map(row => {
        const amount = row.completed === false || row.partial === true || row.verified === false || row.reason ? null : count(row.amount);
        const scope = { ad: '광고', platform: '플랫폼', total: '총수익', external: '외부' }[row.revenue_scope];
        return `<li>${esc(row.month)} · ${moneyHtml(amount)}${amount !== null && scope ? ` (${scope})` : ''}</li>`;
      }).join('')}</ul>`;
    }

    function channelSource(item) {
      const evidence = item?.evidence;
      const group = item?.group;
      return source(evidence?.url ?? evidence?.channel_url ?? evidence?.channelUrl) || source(group?.url ?? group?.channel_url ?? group?.channelUrl);
    }

    function renderBoard(data) {
      if (data.length < 2) {
        board.innerHTML = '<p class="lfc-tip">두 번째 대상을 추가하면 비교표가 표시됩니다.</p>';
        return;
      }
      const known = value => text(value) ? esc(text(value)) : UNKNOWN;
      const cell = (label, format) => `<tr><th scope="row">${label}</th>${data.map(d => `<td>${format(d)}</td>`).join('')}</tr>`;
      const isChannel = d => d.entry.kind === 'c';
      const labels = ['낮음', '기준', '높음'];
      const rows = [
        cell('채널', d => known(d.channelName)),
        cell('분야', d => known(d.row?.k ?? d.row?.category ?? d.item?.group?.topic ?? d.item?.evidence?.topic)),
        cell('비교 영상', d => {
          const id = vid(d.row);
          if (!id) return UNKNOWN;
          return `${isChannel(d) ? '대표 1편 · ' : ''}${known(title(d.row))}<div class="lfc-actions"><button type="button" data-lfc-play="${esc(id)}" aria-expanded="${activePlayer === id}">여기서 재생</button>${anchor(watch(id), 'YouTube 원본')}</div>`;
        }),
        cell('영상 수', d => {
          if (!isChannel(d)) return '선택 1편';
          const catalog = d.item?.rows.length;
          const allUploads = count(d.movement.totalUploads ?? d.item?.evidence?.totalUploads ?? d.item?.evidence?.total_uploads ?? d.item?.group?.totalUploads ?? d.item?.group?.total);
          const recent = count(d.movement.recent?.count ?? d.movement.recentCount);
          const evidenceCount = count(d.item?.evidence?.sampleCount);
          const indexed = count(d.item?.evidence?.displayedPublicCountIndexed);
          return `카탈로그 ${catalog ? `${fmt(catalog)}편` : UNKNOWN}<br>공개 업로드 ${allUploads === null ? UNKNOWN : `${fmt(allUploads)}편`}${indexed === null ? '' : `<br>공개 검색 색인 ${fmt(indexed)}편`}${evidenceCount === null ? '' : `<br>근거 표본 ${fmt(evidenceCount)}편`}${recent === null ? '' : `<br>최근 흐름 표본 ${fmt(recent)}편`}`;
        }),
        cell('게시일 · 길이', d => d.row ? `${known(dateText(d.row.d ?? d.row.date))} · ${fmtDuration(count(d.row.s ?? d.row.durationSeconds ?? d.ranking.duration))}` : UNKNOWN),
        cell('공개 누적 조회', d => {
          const views = viewCount(d.row) ?? count(d.ranking.views);
          return views === null ? UNKNOWN : `${fmt(views)}회${isChannel(d) ? ' · 대표 1편' : ''}`;
        }),
        cell('낮음 / 기준 / 높음', d => {
          const views = viewCount(d.row) ?? count(d.ranking.views);
          if (views === null) return UNKNOWN;
          const evidenceId = text(d.item?.evidence?.representative_id ?? d.item?.evidence?.representativeVideoId ?? d.item?.evidence?.representative?.id ?? d.item?.evidence?.topId);
          const isOverride = isChannel(d) && evidenceId === vid(d.row);
          const basis = isChannel(d) ? `대표 1편만 · 채널 전체 아님<br>${isOverride ? '출처가 지정한 대표 영상' : '카탈로그 누적 조회수 최다'}` : '선택 영상 1편';
          return `<span class="lfc-tip">${basis}</span><ul class="lfc-data-list">${RPM.map((rate, i) => `<li>${labels[i]} ${moneyHtml(views / 1000 * rate)}</li>`).join('')}</ul>`;
        }),
        cell('실측 D30 · D7', d => {
          const d30 = count(d.ranking.d30), d7 = count(d.ranking.d7);
          return `롱폼 D30 ${d30 === null ? UNKNOWN : `${fmt(d30)}회`}<br>관련 쇼츠 D7 ${d7 === null ? UNKNOWN : `${fmt(d7)}회`}`;
        }),
        cell('완료월 수익', d => months(d.ranking)),
        cell('완료월 최저 · 평균', d => d.ranking.monthlyMin == null && d.ranking.monthlyAvg == null ? UNKNOWN : `${moneyHtml(d.ranking.monthlyMin)} · ${moneyHtml(d.ranking.monthlyAvg)}`),
        cell('최근 흐름 표본', d => {
          if (!isChannel(d)) return '채널 지표';
          const recent = d.movement.recent;
          const median = count(recent?.median), pct = count(recent?.hitRate);
          if (median === null && pct === null) return UNKNOWN;
          const direction = { up: '상승', down: '하락', flat: '유사' }[d.movement.trendDirection];
          return `중앙값 ${median === null ? UNKNOWN : `${fmt(median)}회`}<br>목표 달성률 ${pct === null || pct > 1 ? UNKNOWN : `${fmt(pct * 100)}%`}${direction ? `<br>이전 구간 대비 ${direction}` : ''}`;
        }),
        cell('채널 공개 근거 표본', d => {
          if (!isChannel(d)) return '채널 지표';
          const evidence = d.item?.evidence;
          if (!evidence) return UNKNOWN;
          const total = count(evidence.sampleTotal), share = count(evidence.topShare), last = dateText(evidence.lastUpload);
          const lastId = text(evidence.lastLongformId ?? evidence.lastUploadId);
          const latestLink = VIDEO_ID.test(lastId) ? anchor(watch(lastId), '확인한 최근 영상') : UNKNOWN;
          return `표본 누적 합계 ${total === null ? UNKNOWN : `${fmt(total)}회`}<br>표본 내 최고작 비중 ${share === null || share > 1 ? UNKNOWN : `${fmt(share * 100)}%`}<br>마지막 확인 게시 ${last ? esc(last) + ' · ' + latestLink : UNKNOWN}${text(evidence.scope) ? `<br><span class="lfc-tip">${esc(evidence.scope)} · 채널 전체 아님</span>` : ''}`;
        }),
        cell('검증 근거', d => {
          const modelSource = source(d.ranking.model?.evidence_url ?? d.ranking.timing?.evidence_url);
          const evidence = d.item?.evidence || channels.get(resolve(d.channelName))?.evidence;
          const evidenceSource = source(evidence?.evidence_url ?? evidence?.source_url ?? evidence?.source);
          const observed = dateText(d.ranking.timing?.observed_at ?? (d.row?.observations?.v?.verified === true ? d.row.observations.v.observedAt : null) ?? (evidenceVideos.get(vid(d.row)) === d.row ? evidence?.observedTo : null));
          const checked = dateText(d.row?.checked);
          const channelUrl = channelSource(d.item);
          const d30Source = count(d.ranking.d30) !== null ? source(d.ranking.e?.v3?.d30?.evidence_url) : '';
          const links = [channelUrl ? anchor(channelUrl, '채널 원본') : '', evidenceSource ? anchor(evidenceSource, text(evidence?.sourceLabel) || '채널 근거') : '', modelSource ? anchor(modelSource, '수익 근거') : '', d30Source ? anchor(d30Source, 'D30 근거') : ''].filter(Boolean);
          return `${links.length ? links.join(' · ') + '<br>' : ''}${observed ? `조회 관측 ${esc(observed)}` : checked ? `카탈로그 확인 ${esc(checked)} · 관측 시각 미확인` : UNKNOWN}${isChannel(d) && !evidenceSource && !modelSource ? '<br>추가 검증 출처 미확인' : ''}`;
        })
      ];
      board.innerHTML = `<div class="lfc-scroll" tabindex="0" role="region" aria-label="영상·채널 비교표" style="--lfc-mobile-min:${90 + (data.length * 145)}px"><table aria-label="영상·채널 비교"><colgroup><col class="lfc-label-col">${data.map(() => '<col>').join('')}</colgroup><thead><tr><th scope="col">항목</th>${data.map(d => `<th scope="col">${esc(d.name)}<br><span class="lfc-tip">${isChannel(d) ? '채널' : '영상'}</span></th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    }

    function syncButtons() {
      for (const button of document.querySelectorAll('[data-lfc-video],[data-lfc-channel]')) {
        const kind = button.hasAttribute('data-lfc-video') ? 'v' : 'c';
        const id = kind === 'v' ? button.dataset.lfcVideo : resolve(button.dataset.lfcChannel);
        button.setAttribute('aria-pressed', String(isSelected(kind, id)));
      }
    }

    function render(message = '') {
      const data = selected.map(describe);
      if (activePlayer && (data.length < 2 || !data.some(d => vid(d.row) === activePlayer))) closePlayer();
      for (const btn of root.querySelectorAll('[data-lfc-preset]')) btn.setAttribute('aria-pressed', String(btn.dataset.lfcPreset === preset));
      root.querySelector('[data-lfc-clear]').disabled = !selected.length;
      const active = PRESETS.find(p => p.id === preset);
      const note = active?.id === 'purrverse' && purrCompanion() ? active.evidenceNote : active?.note;
      status.textContent = message || `${selected.length} / ${MAX}개 선택${note ? ` · ${note}` : ''}`;
      chips.innerHTML = data.map(d => `<button class="lfc-chip" type="button" data-lfc-remove="${esc(entryKey(d.entry))}" aria-label="비교에서 제거: ${esc(d.name)}">${esc(d.name)} ×</button>`).join('');
      renderBoard(data);
      syncButtons();
    }

    let results = [];
    function search() {
      const q = normalize(query.value);
      if (mode.value === 'c') {
        const direct = resolve(query.value);
        results = Array.from(channels.values()).filter(c => !q || c.key === direct || normalize(c.name).includes(q))
          .sort((a, b) => Number(b.key === direct) - Number(a.key === direct) || b.rows.length - a.rows.length || a.name.localeCompare(b.name, 'ko'))
          .slice(0, 24).map(c => ({ id: c.key, name: c.name, label: c.name, kind: 'c' }));
      } else {
        const exact = text(query.value);
        results = Array.from(videos.values()).filter(v => !q || vid(v) === exact || [title(v), videoChannel(v), v.k, ...list(v.ks)].some(s => normalize(s).includes(q)))
          .sort((a, b) => Number(vid(b) === exact) - Number(vid(a) === exact) || compareVideos(a, b))
          .slice(0, 24).map(v => ({ id: vid(v), name: title(v) || vid(v), label: `${title(v) || vid(v)} · ${videoChannel(v)} · ${vid(v)}`, kind: 'v' }));
      }
      suggestions.innerHTML = results.map(r => `<option value="${esc(r.kind === 'v' ? r.id : r.name)}" label="${esc(r.label)}"></option>`).join('');
    }

    function toggle(entry, { addOnly = false, external = false } = {}) {
      const at = selected.findIndex(x => entryKey(x) === entryKey(entry));
      if (at >= 0) {
        if (addOnly) { render('이미 비교에 추가된 대상입니다.'); return; }
        selected.splice(at, 1);
      } else {
        if (selected.length >= MAX) {
          if (external) openPanel();
          render('최대 4개까지 비교할 수 있습니다. 먼저 현재 선택을 하나 빼세요.');
          return;
        }
        selected.push(entry);
      }
      preset = '';
      if (external && at < 0) openPanel();
      render();
    }

    function openPanel() {
      document.dispatchEvent(new window.CustomEvent('lf-compare-open', { detail: { root } }));
      if (!root.hidden && !root.closest('[hidden]')) root.scrollIntoView?.({ block: 'start' });
    }

    function addFromSearch() {
      const value = text(query.value);
      if (!value) { render('검색어를 입력한 뒤 영상 또는 채널을 고르세요.'); query.focus(); return; }
      const exact = mode.value === 'v'
        ? results.find(r => r.id === value || normalize(r.name) === normalize(value))
        : results.find(r => r.id === resolve(value));
      const match = exact || (results.length === 1 ? results[0] : null);
      if (!match) { render(results.length ? '목록에서 비교할 항목을 하나 고르세요.' : '카탈로그에서 일치하는 항목을 찾지 못했습니다.'); return; }
      toggle(match, { addOnly: true });
    }

    function closePlayer() {
      if (!activePlayer) return;
      activePlayer = '';
      player.replaceChildren();
      for (const button of root.querySelectorAll('[data-lfc-play]')) button.setAttribute('aria-expanded', 'false');
    }

    function showPlayer(id) {
      if (!VIDEO_ID.test(id)) return;
      const d = selected.map(describe).find(d => vid(d.row) === id);
      if (!d) return;
      if (activePlayer === id) { closePlayer(); return; }
      closePlayer();
      activePlayer = id;
      const label = title(d.row) || id;
      player.innerHTML = `<section class="lfc-player" aria-label="YouTube 재생: ${esc(label)}"><div class="lfc-actions"><strong>${esc(label)}</strong>${anchor(watch(id), '삽입이 제한되면 YouTube 원본 보기')}<button type="button" data-lfc-close>재생 닫기</button></div>` +
        `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&amp;playsinline=1" title="${esc(label)}" width="640" height="360" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></section>`;
      for (const button of root.querySelectorAll('[data-lfc-play]')) button.setAttribute('aria-expanded', String(button.dataset.lfcPlay === id));
      player.scrollIntoView?.({ block: 'nearest' });
    }

    function onClick(event) {
      const button = event.target?.closest?.('button');
      if (!button) return;
      const data = button.dataset;
      if ('lfcVideo' in data || 'lfcChannel' in data) {
        const external = !root.contains(button);
        if ('lfcVideo' in data) {
          const row = lookup(data.lfcVideo);
          if (row) toggle({ kind: 'v', id: vid(row), name: title(row) }, { external });
        } else {
          const name = text(data.lfcChannel), id = resolve(name);
          if (id) toggle({ kind: 'c', id, name }, { external });
        }
        return;
      }
      if (!root.contains(button)) return;
      if ('lfcPreset' in data) {
        const next = PRESETS.find(p => p.id === data.lfcPreset);
        if (!next) return;
        closePlayer();
        preset = next.id;
        selected = presetEntries(next);
        render();
      } else if ('lfcClear' in data) {
        closePlayer(); selected = []; preset = ''; render();
      } else if ('lfcRemove' in data) {
        const at = selected.findIndex(x => entryKey(x) === data.lfcRemove);
        if (at < 0) return;
        selected.splice(at, 1); preset = ''; render();
        (chips.children[Math.min(at, chips.children.length - 1)] || query).focus();
      } else if ('lfcPlay' in data) showPlayer(data.lfcPlay);
      else if ('lfcClose' in data) {
        const id = activePlayer;
        closePlayer();
        root.querySelector(`[data-lfc-play="${id}"]`)?.focus();
      } else if ('lfcFind' in data) addFromSearch();
    }

    function refresh() {
      index();
      const active = PRESETS.find(p => p.id === preset);
      if (active) selected = presetEntries(active);
      const unique = new Map();
      for (const item of selected) {
        const entry = item.kind === 'c' ? { ...item, id: resolve(item.name) } : item;
        if (!unique.has(entryKey(entry))) unique.set(entryKey(entry), entry);
      }
      selected = Array.from(unique.values());
      search();
      render();
    }

    document.addEventListener('click', onClick);
    if (root.tagName === 'DETAILS') root.addEventListener('toggle', () => { if (!root.open) closePlayer(); });
    query.addEventListener('input', search);
    query.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); addFromSearch(); }
    });
    mode.addEventListener('change', () => { query.value = ''; search(); });
    const api = { videoButton, channelButton, representative, refresh };
    mounts.set(root, api);
    refresh();
    if (typeof window.fetch === 'function' && /^https?:$/.test(window.location?.protocol ?? '')) {
      window.fetch('lf-channel-evidence.json', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : null).then(payload => {
        optional = parseGroups(payload).filter(row => groupName(row));
        if (optional.length) refresh();
      }).catch(() => { /* Optional evidence missing: built-in catalog and unknown labels remain. */ });
    }
    return api;
  }

  window.LFCompare = Object.freeze({ mount });
})(window);
