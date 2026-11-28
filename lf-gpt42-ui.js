'use strict';
(async function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nf = x => x == null || !Number.isFinite(x) ? '미확인' : Math.trunc(x).toLocaleString('ko-KR');
  const money = x => { if (x == null || !Number.isFinite(x)) return '미확인'; const v = Math.floor(Math.abs(x)); if (v < 1e4) return v.toLocaleString('ko-KR') + '원'; const e = Math.floor(v / 1e8), m = Math.floor(v % 1e8 / 1e4); return [e ? e + '억' : '', m ? m + '만' : ''].filter(Boolean).join(' ') + ' 원'; };
  const dur = s => s == null ? '미확인' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const MEDAL = '<img class="gptm" alt="★ GPT" width="52" height="18" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="52" height="18"><rect x="0.5" y="0.5" width="51" height="17" rx="4" fill="#FFEB00" stroke="#E00000"/><text x="26" y="13.2" text-anchor="middle" font-family="Arial" font-size="11.5" font-weight="900" fill="#E00000">★ GPT</text></svg>') + '">';
  const GC = { A: '#ff6b6b', B: '#ffd36b', C: '#7dff7a' };
  // Charts: numbers exactly as written in each GPT report
  const VIZ = {
    1: [
      ['🔴 A그룹 채널별 월 추정 수익 (GPT 1차 원문 값, 단위 만 원)', [['일본 응원단', 12869], ['경제상담소', 4353], ['즌다 탐험대', 3015], ['이슈한바퀴', 1670], ['たのしみTV', 1193], ['한류왕', 1047], ['日本びっくり速報', 935]], x => nf(x) + '만'],
      ['🟡 B그룹 구독자 대비 조회수 배율 (GPT 1차 원문 값)', [['B1. 日本旅のおすそわけ', 1268], ['B2. 脱帽ジャパン', 326], ['B3. 脱帽ニッポン', 93], ['B4. 匠の国ニッポン', 11.1], ['B5. 海外の反応ニッポン堂', 456], ['B6. 訪日客から一声', 285], ['B7. ニッポンのトリコ', 4.5]], x => x + '배'],
      ['🟢 C그룹 성공 영상 조회수 (GPT 1차 원문 값, 만 회)', [['생선', 172.7], ['감자', 142.8], ['식당', 36.6], ['무', 35], ['료칸', 21.7], ['주유소', 20.9], ['엄마', 17.5]], x => x + '만 회'],
      ['4. 전체 21편 일평균 조회 (GPT 1차 원문 값)', [['🔴 A1', 222124], ['🔴 A2', 83892], ['🔴 A3', 34142], ['🔴 A4', 287763], ['🔴 A5', 24880], ['🔴 A6', 23160], ['🔴 A7', 20387], ['🟡 B1', 32958], ['🟡 B2', 46032], ['🟡 B3', 8299], ['🟡 B4', 1284], ['🟡 B5', 1108], ['🟡 B6', 3854], ['🟡 B7', 168], ['🟢 C1', 115118], ['🟢 C2', 49246], ['🟢 C3', 19259], ['🟢 C4', 15918], ['🟢 C5', 12755], ['🟢 C6', 8709], ['🟢 C7', 19418]], x => nf(x) + '회']
    ],
    2: [
      ['🔴 A그룹 채널 월 추정 수익 (GPT 2차 원문 값 · 블링 최근 30일 롱폼 추정치, 만 원)', [['일본 응원단', 12869], ['경제상담소', 4353], ['JUJUWORLD', 4290], ['즌다 탐험대', 3015], ['이슈한바퀴', 1670], ['たのしみTV', 1193], ['한류왕', 1047]], x => nf(x) + '만 원'],
      ['🟡 B그룹 일평균 조회수 (GPT 2차 원문 값)', [['鳥肌ジャパン', 79445], ['世界朝刊', 64654], ['核心のジャパン', 38571], ['개묘한세상', 36377], ['日本旅のおすそわけ', 15539], ['Japan魂', 10667], ['ここ、日本', 8377]], x => nf(x) + '회'],
      ['🟢 C그룹 영상별 누적 추정 수익 (GPT 2차 원문 값, 만 원)', [['한국 소고기', 806], ['한국 고속도로', 540], ['일본 치안', 357], ['일본 일상', 319], ['한국 관광', 287], ['일본 공구 기술', 282], ['뉴욕 김밥', 195]], x => nf(x) + '만 원']
    ]
  };
  const bars = (title, rows, f) => { const max = Math.max(...rows.map(r => r[1])); return '<div class="chart"><b>' + esc(title) + '</b>' + rows.map(([n, v]) => '<div class="bar"><span>' + esc(n) + '</span><i style="width:' + Math.max(1, v / max * 100).toFixed(1) + '%"></i><b>' + esc(f(v)) + '</b></div>').join('') + '</div>'; };
  let D;
  try { D = await (await fetch('lf-gpt42.json', { cache: 'no-cache' })).json(); } catch { document.querySelector('main').insertAdjacentHTML('afterbegin', '<p class="red">수집 자료(lf-gpt42.json)를 읽지 못했습니다.</p>'); return; }
  $('#asof').textContent = '수집 기준 ' + D.asOf.slice(0, 16).replace('T', ' ') + ' UTC';
  const card = v => '<article class="card" data-id="' + v.id + '"><a class="th" href="' + v.url + '" data-play="' + v.id + '"><img loading="lazy" referrerpolicy="no-referrer" src="https://i.ytimg.com/vi/' + v.id + '/maxresdefault.jpg" onerror="this.onerror=null;this.src=\'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg\'" alt=""><span class="code" style="background:' + GC[v.group] + ';color:#111">' + v.round + '차 ' + v.code + '</span><span class="gptm">' + MEDAL + '</span><span class="pl">▶ 여기서 재생</span></a>'
    + '<div class="cb"><div class="t"><a href="' + v.url + '" target="_blank" rel="noopener noreferrer">' + esc(v.title || v.id) + '</a></div><div class="m">' + esc(v.channel || '채널 미확인') + ' · 게시 ' + esc(v.publishDate || '미확인') + ' · ' + dur(v.lengthSeconds) + '</div>'
    + '<div>조회 <b>' + nf(v.views) + '</b> <span class="m">(' + esc((v.viewsRetrievedAt || '').slice(0, 10)) + ')</span> · 좋아요 ' + nf(v.likes) + '</div>'
    + '<div>예상 수익 하/중/상 <span class="money" title="조회수 × 1,000/2,000/4,000원 ÷ 1,000 · 추정">' + (v.est ? v.est.map(money).join(' / ') : '미확인') + '</span></div>'
    + '<div class="detail"><div class="tt">🖼 메인 문구: <b>' + esc(v.thumb?.mainText ?? '읽기 실패/없음') + '</b>' + (v.thumb?.mainTextKo ? '<br><span class="m">번역: ' + esc(v.thumb.mainTextKo) + '</span>' : '') + '<br>🔹 보조 문구: ' + esc((v.thumb?.subTexts || []).join(' / ') || '없음') + (v.thumb?.subTextsKo?.length ? '<br><span class="m">번역: ' + esc(v.thumb.subTextsKo.join(' / ')) + '</span>' : '') + '</div>'
    + '<div class="m">자막: ' + (v.captions ? (v.captions.origCues ? '원문 ' + esc(v.captions.origLang) + (v.captions.origKind === 'asr' ? '(자동)' : '') + ' ' + v.captions.origCues + '줄' + (v.captions.origSource === 'existing' ? ' · 기존 보유분 재사용' : '') : '원문 없음') + (v.captions.koCues ? ' · 한국어 번역 ' + v.captions.koCues + '줄(YouTube 기계 번역)' : (v.captions.origLang && v.captions.origLang !== 'ko' ? ' · 한국어 번역 없음' : '')) + (v.captions.reason ? ' · ' + esc(v.captions.reason) : '') : '미수집') + '</div>'
    + (v.hook?.length ? '<details><summary>첫 3분 훅 (타임코드 · 원문 · 한국어)</summary><div class="hook">' + v.hook.map(h => '<div><span class="tc">' + esc(h.t) + '</span><span>' + esc(h.o) + '</span><span>' + esc(h.k || (v.captions?.origLang === 'ko' ? '(원문 한국어)' : '번역 없음')) + '</span></div>').join('') + '</div></details>' : '')
    + '</div></div></article>';
  for (const r of [1, 2]) {
    const vids = D.videos.filter(v => v.round === r);
    const actual = vids.filter(v => v.views != null);
    const calc = '<div class="chart"><b>💰 ' + r + '차 21편 수익 계산기 (수집 조회수 × RPM)</b><div class="calc">' + [1000, 2000, 4000].map(x => '<button type="button" data-rpm="' + x + '" data-r="' + r + '" aria-pressed="' + (x === 2000) + '">' + x.toLocaleString('ko-KR') + '원</button>').join('') + '<span id="sum' + r + '"></span></div><p class="note">서로 다른 게시 기간의 누적 추정액 합계 · 월수익·보장 수익 아님' + (r === 2 ? ' · GPT 2차 원문 표기 합계(RPM 2,000원): 63,383,172원' : '') + '</p></div>';
    const actualChart = actual.length ? bars(r + '차 21편 실제 수집 조회수 (YouTube 공개값)', actual.map(v => [v.code + ' ' + (v.channel || ''), v.views]), x => nf(x) + '회') : '';
    $('#viz' + r).innerHTML = '<h3>📊 그래프 (GPT 원문 수치 + 실제 수집값)</h3>' + VIZ[r].map(c => bars(...c)).join('') + actualChart + calc;
    $('#cards' + r).innerHTML = ['A', 'B', 'C'].map(g => '<h3 style="color:' + GC[g] + '">' + r + '차 ' + ({ A: '🔴 A그룹', B: '🟡 B그룹', C: '🟢 C그룹' })[g] + ' 영상 7편 · 미리보기</h3><div class="cards">' + vids.filter(v => v.group === g).map(card).join('') + '</div>').join('');
    const paint = rpm => { const s = actual.reduce((a, v) => a + v.views * rpm / 1000, 0); const by = g => actual.filter(v => v.group === g).reduce((a, v) => a + v.views * rpm / 1000, 0); $('#sum' + r).innerHTML = '합계 <span class="money">' + money(s) + '</span> (A ' + money(by('A')) + ' · B ' + money(by('B')) + ' · C ' + money(by('C')) + ') · 조회 확인 ' + actual.length + '/21편'; };
    paint(2000);
    $('#viz' + r).addEventListener('click', e => { const b = e.target.closest('[data-rpm]'); if (!b) return; for (const x of $('#viz' + r).querySelectorAll('[data-rpm]')) x.setAttribute('aria-pressed', String(x === b)); paint(Number(b.dataset.rpm)); });
  }
  // inline multi player (no auto-start; up to 3 by default; does not close others)
  const MAX = 3;
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-play]'); if (a) {
      e.preventDefault(); const card = a.closest('.card');
      if (document.querySelectorAll('.player').length >= MAX) { alert('동시 재생은 최대 ' + MAX + '개입니다. 기존 플레이어를 정지한 뒤 여세요.'); return; }
      const id = a.dataset.play; const p = document.createElement('div'); p.className = 'player';
      p.innerHTML = '<iframe allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0"></iframe><div class="pb"><button type="button" data-stop>■ 정지</button><a href="https://www.youtube.com/watch?v=' + id + '" target="_blank" rel="noopener noreferrer">원본 재생 (삽입 제한 시)</a></div>';
      a.hidden = true; a.after(p); return;
    }
    const s = e.target.closest('[data-stop]'); if (s) { const p = s.closest('.player'); p.previousElementSibling.hidden = false; p.remove(); return; }
    const go = e.target.closest('[data-go]'); if (go) { document.getElementById(go.dataset.go).scrollIntoView({ block: 'start' }); for (const b of document.querySelectorAll('[data-go]')) b.setAttribute('aria-pressed', String(b === go)); }
  });
  const pref = JSON.parse(localStorage.getItem('gpt42:view') || '{}');
  const apply = () => { document.body.classList.toggle('hide-thumb', !!pref.noThumb); document.body.classList.toggle('hide-desc', !!pref.noDesc); $('#tThumb').textContent = pref.noThumb ? '썸네일 펼치기' : '썸네일 숨기기'; $('#tDesc').textContent = pref.noDesc ? '하단 설명 펼치기' : '하단 설명 숨기기'; localStorage.setItem('gpt42:view', JSON.stringify(pref)); };
  $('#tThumb').addEventListener('click', () => { pref.noThumb = !pref.noThumb; apply(); });
  $('#tDesc').addEventListener('click', () => { pref.noDesc = !pref.noDesc; apply(); });
  apply();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ block: 'start' });
})();
