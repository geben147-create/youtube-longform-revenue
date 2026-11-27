/* Additive card tools for transcripts. Full text is never in the public catalog:
   it comes only from a user-imported private file and lives in memory
   (sessionStorage is opt-in, default OFF). Needs window.LFExport.caption. */
'use strict';
(function (root) {
  const TRACKS = ['original', 'ko'];
  const FORMATS = ['txt', 'srt', 'vtt', 'json'];
  const MIME = { txt: 'text/plain;charset=utf-8', srt: 'text/plain;charset=utf-8', vtt: 'text/vtt;charset=utf-8', json: 'application/json;charset=utf-8', zip: 'application/zip' };
  const SKEY = 'lf-subs-private-v1';
  const pad = (n, s = 2) => String(n).padStart(s, '0');
  const stamp = (ms, sep) => `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${sep}${pad(ms % 1000, 3)}`;
  const idOf = v => (typeof v === 'string' ? v : v && (v.id || v.video_id)) || null;

  // Small stored (method 0) ZIP writer with CRC32. LFExport.pack only builds rights-gated SRT archives, so it is not reused here.
  const crcTable = Uint32Array.from({ length: 256 }, (_, i) => { for (let k = 0; k < 8; k++) i = (i & 1 ? 0xEDB88320 : 0) ^ (i >>> 1); return i; });
  function crc32(bytes) { let c = 0xFFFFFFFF; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipStored(entries) {
    if (entries.length >= 0xFFFF) throw new RangeError('Too many ZIP entries.');
    const enc = new TextEncoder();
    let local = 0, dir = 0;
    const files = entries.map(([name, content]) => {
      const n = enc.encode(name), b = enc.encode(content), offset = local;
      local += 30 + n.length + b.length; dir += 46 + n.length;
      return { n, b, offset, crc: crc32(b) };
    });
    const out = new Uint8Array(local + dir + 22), dv = new DataView(out.buffer);
    let c = local;
    for (const { n, b, offset, crc } of files) {
      dv.setUint32(offset, 0x04034B50, true); dv.setUint16(offset + 4, 20, true); dv.setUint16(offset + 6, 0x0800, true);
      dv.setUint16(offset + 12, 0x21, true); dv.setUint32(offset + 14, crc, true); dv.setUint32(offset + 18, b.length, true);
      dv.setUint32(offset + 22, b.length, true); dv.setUint16(offset + 26, n.length, true);
      out.set(n, offset + 30); out.set(b, offset + 30 + n.length);
      dv.setUint32(c, 0x02014B50, true); dv.setUint16(c + 4, 20, true); dv.setUint16(c + 6, 20, true); dv.setUint16(c + 8, 0x0800, true);
      dv.setUint16(c + 14, 0x21, true); dv.setUint32(c + 16, crc, true); dv.setUint32(c + 20, b.length, true);
      dv.setUint32(c + 24, b.length, true); dv.setUint16(c + 28, n.length, true); dv.setUint32(c + 42, offset, true);
      out.set(n, c + 46); c += 46 + n.length;
    }
    dv.setUint32(c, 0x06054B50, true); dv.setUint16(c + 8, files.length, true); dv.setUint16(c + 10, files.length, true);
    dv.setUint32(c + 12, dir, true); dv.setUint32(c + 16, local, true);
    return out;
  }

  function createCore(opts = {}) {
    const LF = opts.LFExport || root.LFExport;
    const tx = new Map();      // id -> {original?, ko?}
    const rights = new Map();  // id -> {status, evidence}; absent = unknown
    const picked = new Set();
    let persist = false;
    const store = () => { try { return opts.storage || root.sessionStorage || null; } catch { return null; } };
    const save = () => {
      const s = store(); if (!s) return;
      try {
        if (!persist) { s.removeItem(SKEY); return; }
        s.setItem(SKEY, JSON.stringify({ tx: [...tx], rights: [...rights] }));
      } catch { /* quota or blocked: memory still works */ }
    };
    const core = {
      tx, rights, picked,
      // Parse with LFExport.caption; TXT stays untimed (no invented cues).
      importText(id, text, ext, track = 'original', meta = {}) {
        if (!id) throw new TypeError('video id required');
        if (!TRACKS.includes(track)) throw new RangeError('track must be original or ko');
        if (!LF || typeof LF.caption !== 'function') throw new Error('LFExport.caption unavailable');
        const p = LF.caption(text, ext);
        if (p.format !== 'txt' && !p.cues.length) throw new RangeError('no valid timed cues in file');
        const rec = tx.get(id) || {};
        rec[track] = { format: p.format, timed: p.timed, cues: p.cues, text: p.text, warnings: p.warnings, name: meta.name || null };
        tx.set(id, rec); save();
        return rec[track];
      },
      // JSON bundle: {videos:{id:{original:{format,text},ko:{...}}}} or [{video_id,track,format,text}]
      importBundle(json) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        const list = [];
        if (Array.isArray(data)) data.forEach(r => list.push([r && (r.video_id || r.id), r && r.track, r]));
        else if (data && data.videos) { for (const [id, r] of Object.entries(data.videos)) for (const t of TRACKS) if (r && r[t]) list.push([id, t, r[t]]); }
        else throw new TypeError('unsupported JSON shape');
        let ok = 0; const errors = [];
        for (const [id, t, r] of list) {
          try { core.importText(id, r.text, r.format || 'txt', TRACKS.includes(t) ? t : 'original'); ok++; }
          catch (e) { errors.push({ id: id || null, error: String(e.message || e) }); }
        }
        return { ok, errors };
      },
      has: (id, track) => !!(tx.get(id) && (track ? tx.get(id)[track] : tx.get(id).original || tx.get(id).ko)),
      clearTranscripts() { tx.clear(); save(); },
      setRights(id, status, evidence) {
        if (status === 'unknown' || status == null) { rights.delete(id); save(); return { ok: true }; }
        if (!['allowed', 'denied'].includes(status)) return { ok: false, reason: 'bad_status' };
        const ev = typeof evidence === 'string' ? evidence.trim() : '';
        if (status === 'allowed' && !ev) return { ok: false, reason: 'evidence_required' };
        rights.set(id, { status, evidence: ev || null }); save();
        return { ok: true };
      },
      rightsOf: id => rights.get(id) || { status: 'unknown', evidence: null },
      canExport(id) {
        const r = core.rightsOf(id);
        return r.status === 'allowed' && !!r.evidence ? { ok: true } : { ok: false, reason: r.status === 'denied' ? 'rights_denied' : 'rights_unknown' };
      },
      persist(on) { persist = !!on; save(); return persist; },
      restore() {
        const s = store(); if (!s || !persist) return false;
        try { const d = JSON.parse(s.getItem(SKEY) || 'null'); if (!d) return false; d.tx.forEach(([k, v]) => tx.set(k, v)); d.rights.forEach(([k, v]) => rights.set(k, v)); return true; } catch { return false; }
      },
      // Returns {ok, body, name, mime} or {ok:false, reason}; refuses without rights evidence.
      format(id, track, fmt) {
        const gate = core.canExport(id); if (!gate.ok) return gate;
        const t = tx.get(id) && tx.get(id)[track];
        if (!t) return { ok: false, reason: 'no_transcript' };
        if (!FORMATS.includes(fmt)) return { ok: false, reason: 'bad_format' };
        let body;
        if (fmt === 'json') body = JSON.stringify({ video_id: id, track, source_format: t.format, timed: t.timed, cues: t.cues, text: t.text }, null, 2) + '\n';
        else if (fmt === 'txt') body = t.timed ? t.cues.map(c => c.text).join('\n') + '\n' : t.text;
        else {
          if (!t.timed) return { ok: false, reason: 'untimed_source_no_cues' };
          body = fmt === 'srt'
            ? t.cues.map((c, i) => `${i + 1}\n${stamp(c.start_ms, ',')} --> ${stamp(c.end_ms, ',')}\n${c.text}`).join('\n\n') + '\n'
            : 'WEBVTT\n\n' + t.cues.map(c => `${stamp(c.start_ms, '.')} --> ${stamp(c.end_ms, '.')}\n${c.text}`).join('\n\n') + '\n';
        }
        return { ok: true, body, name: `${id}${track === 'ko' ? '.ko' : ''}.${fmt}`, mime: MIME[fmt] };
      },
      preview(id, track) { const t = tx.get(id) && tx.get(id)[track]; return t ? (t.timed ? t.cues.map(c => `[${stamp(c.start_ms, '.').slice(0, 8)}] ${c.text}`).join('\n') : t.text) : null; },
      // ZIP of selected transcripts. Tracks stay separate files. Skipped items carry reasons.
      zip(ids, fmt = 'txt', tracks = TRACKS) {
        const entries = [], skipped = [], names = new Set();
        for (const id of ids) for (const tr of tracks) {
          if (!core.has(id, tr)) continue;
          const f = core.format(id, tr, fmt);
          if (!f.ok) { skipped.push({ id, track: tr, reason: f.reason }); continue; }
          if (names.has(f.name)) continue; names.add(f.name); entries.push([f.name, f.body]);
        }
        for (const id of ids) if (!core.has(id)) skipped.push({ id, track: null, reason: 'no_transcript' });
        if (!entries.length) return { ok: false, reason: 'nothing_exportable', skipped };
        return { ok: true, bytes: zipStored(entries), count: entries.length, skipped, name: 'longform-transcripts.zip', mime: MIME.zip };
      },
      zipStored,
      select(id, on) { if (on === false) picked.delete(id); else picked.add(id); },
      selectMany(ids) { ids.forEach(id => picked.add(id)); },
      clearSelection() { picked.clear(); },
      // mode: all | with | without | rights-unknown | rights-allowed
      matches(id, mode) {
        const h = core.has(id), r = core.rightsOf(id).status;
        return mode === 'with' ? h : mode === 'without' ? !h : mode === 'rights-unknown' ? r === 'unknown' : mode === 'rights-allowed' ? r === 'allowed' : true;
      },
      status(total, ids) {
        const all = Array.isArray(ids) ? ids : (Array.isArray(total) ? total.map(idOf) : [...tx.keys()]);
        const n = Array.isArray(total) ? total.length : Number.isFinite(total) ? total : all.length;
        const w = all.filter(id => core.has(id));
        const c = (tr, set) => set.filter(id => core.has(id, tr)).length;
        return {
          total: n, withTranscript: w.length, withoutTranscript: Math.max(0, n - w.length),
          original: c('original', w), ko: c('ko', w),
          timed: w.filter(id => ['original', 'ko'].some(t => tx.get(id)[t] && tx.get(id)[t].timed)).length,
          rightsAllowed: w.filter(id => core.canExport(id).ok).length,
          rightsUnknown: w.filter(id => core.rightsOf(id).status === 'unknown').length,
          selected: picked.size, selectedExportable: [...picked].filter(id => core.has(id) && core.canExport(id).ok).length,
          persisted: persist
        };
      }
    };
    return core;
  }

  function mount(api = {}) {
    const doc = root.document;
    if (!doc) return null;
    const esc = api.esc || (s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const core = createCore(api);
    let mode = 'all', track = 'original', fmt = 'txt', zfmt = 'txt';
    const out = api.download || ((name, body, mime) => { const u = URL.createObjectURL(new Blob([body], { type: mime })), a = doc.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 10000); });
    const msg = t => { const n = doc.getElementById('lf-subs-msg'); if (n) n.textContent = t; return t; };
    const cards = () => [...doc.querySelectorAll('article.item[data-id]')];
    const visibleIds = () => cards().map(c => c.dataset.id);
    const why = r => ({ rights_unknown: '권리 미확인(unknown): 근거를 입력해 허용 설정 후 가능', rights_denied: '권리 거부 상태', no_transcript: '자막 파일 없음', untimed_source_no_cues: 'TXT는 시간 정보가 없어 SRT/VTT 불가', nothing_exportable: '내보낼 항목 없음', bad_format: '형식 오류' }[r] || r);

    const buttons = v => {
      const id = idOf(v); if (!id) return '';
      const has = core.has(id), on = core.picked.has(id);
      return `<span class="lf-subs-tools" data-subs-tools="${esc(id)}"><label title="선택"><input type="checkbox" data-subs="sel" ${on ? 'checked' : ''}></label>` +
        `<a data-subs="open" href="https://www.youtube.com/watch?v=${esc(encodeURIComponent(id))}" target="_blank" rel="noopener noreferrer" title="원본 링크">▶</a>` +
        `<button type="button" data-subs="expand" aria-expanded="false" title="자막 펼치기/접기" ${has ? '' : 'disabled'}>▼</button>` +
        `<button type="button" data-subs="copy" title="복사" ${has ? '' : 'disabled'}>📋</button>` +
        FORMATS.map(f => `<button type="button" data-subs="dl" data-fmt="${f}" title="${f.toUpperCase()} 다운로드" ${has ? '' : 'disabled'}>📥${f.toUpperCase()}</button>`).join('') +
        `<button type="button" data-subs="detail" title="상세 패널">📊</button></span>`;
    };
    function decorate() {
      for (const c of cards()) {
        const links = c.querySelector('.cardlinks');
        if (!links || links.querySelector('[data-subs-tools]')) continue;
        links.insertAdjacentHTML('beforeend', buttons(c.dataset.id));
      }
      refresh();
    }
    function refresh() {
      const st = core.status(visibleIds().length, visibleIds());
      const n = doc.getElementById('lf-subs-status');
      if (n) n.textContent = `보이는 ${st.total}편 · 자막 ${st.withTranscript} (원문 ${st.original}/번역 ${st.ko}) · 시간정보 ${st.timed} · 권리허용 ${st.rightsAllowed} · 선택 ${st.selected}${st.persisted ? ' · 세션저장 ON' : ''}`;
    }
    function panel() {
      const host = doc.getElementById('lf-subs'); if (!host || host.dataset.ready) return;
      host.dataset.ready = '1';
      host.innerHTML = '<summary>자막 도구 (비공개 파일 · 메모리 전용)</summary><div class="lf-row">' +
        '<label>가져오기 <input type="file" data-subs="file" multiple accept=".json,.srt,.vtt,.txt"></label>' +
        '<label>트랙 <select data-subs="track"><option value="original">원문</option><option value="ko">한국어 번역</option></select></label>' +
        '<label>필터 <select data-subs="filter"><option value="all">전체</option><option value="with">자막 있음</option><option value="without">자막 없음</option><option value="rights-unknown">권리 미확인</option><option value="rights-allowed">권리 허용</option></select></label>' +
        '<button type="button" data-subs="all">보이는 전체 선택</button><button type="button" data-subs="clear">선택 해제</button></div>' +
        '<div class="lf-row"><label>권리 근거 <input data-subs="evidence" maxlength="300" placeholder="라이선스·허락 출처"></label>' +
        '<button type="button" data-subs="allow">선택 항목 허용</button><button type="button" data-subs="deny">선택 항목 거부</button>' +
        '<label>ZIP 형식 <select data-subs="zfmt">' + FORMATS.map(f => `<option>${f}</option>`).join('') + '</select></label><button type="button" data-subs="zip">선택 ZIP</button>' +
        '<label><input type="checkbox" data-subs="persist"> 세션 저장(기본 OFF)</label><button type="button" data-subs="wipe">자막 메모리 삭제</button></div>' +
        '<p id="lf-subs-status" class="lf-hint"></p><p id="lf-subs-msg" class="lf-hint" role="status"></p>';
    }
    async function onFiles(files) {
      let ok = 0; const bad = [];
      for (const f of files) {
        const ext = (f.name.split('.').pop() || '').toLowerCase(), text = await f.text(), stem = f.name.replace(/(\.ko)?\.[^.]+$/, '');
        try {
          if (ext === 'json') { const r = core.importBundle(text); ok += r.ok; r.errors.forEach(e => bad.push(e.error)); }
          else {
            const known = api.get ? api.get(stem) : null;
            if (!known && !cards().some(c => c.dataset.id === stem)) { bad.push(f.name + ': 파일명이 영상 ID와 불일치'); continue; }
            core.importText(stem, text, ext, /\.ko\.[^.]+$/.test(f.name) ? 'ko' : track, { name: f.name }); ok++;
          }
        } catch (e) { bad.push(f.name + ': ' + (e.message || e)); }
      }
      msg(`가져오기 ${ok}건${bad.length ? ' · 실패 ' + bad.length + ': ' + bad.slice(0, 3).join('; ') : ''}`);
      rerender();
    }
    function rerender() { if (api.render) api.render(); decorate(); }
    function bodyOf(card) { let b = card.querySelector('.lf-subs-body'); if (!b) { b = doc.createElement('div'); b.className = 'lf-subs-body'; b.hidden = true; const l = card.querySelector('.cardlinks'); (l && l.parentNode ? l.parentNode : card).appendChild(b); } return b; }
    async function click(e) {
      const b = e.target.closest && e.target.closest('[data-subs]'); if (!b) return;
      const a = b.dataset.subs, card = b.closest('article.item[data-id]'), id = card && card.dataset.id;
      if (a === 'open' || a === 'sel' || a === 'file' || a === 'track' || a === 'filter' || a === 'zfmt' || a === 'persist' || a === 'evidence') return;
      if (a === 'expand' && id) {
        const body = bodyOf(card), open = body.hidden;
        if (open) { const tr = core.has(id, 'original') ? 'original' : 'ko', parts = TRACKS.filter(t => core.has(id, t)).map(t => `<h4>${t === 'ko' ? '한국어 번역' : '원문'}</h4><pre>${esc(core.preview(id, t))}</pre>`); body.innerHTML = parts.join('') || '자막 없음'; void tr; }
        body.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = open ? '▲' : '▼'; return;
      }
      if (a === 'copy' && id) {
        const f = core.format(id, track === 'ko' && core.has(id, 'ko') ? 'ko' : core.has(id, 'original') ? 'original' : 'ko', 'txt');
        if (!f.ok) return msg(why(f.reason));
        try { await (api.copy ? api.copy(f.body) : root.navigator.clipboard.writeText(f.body)); msg('복사됨: ' + id); } catch { msg('복사 실패(브라우저 권한)'); }
        return;
      }
      if (a === 'dl' && id) {
        const tr = core.has(id, track) ? track : core.has(id, 'original') ? 'original' : 'ko', f = core.format(id, tr, b.dataset.fmt);
        if (!f.ok) return msg(why(f.reason));
        out(f.name, f.body, f.mime); return msg('다운로드: ' + f.name);
      }
      if (a === 'detail' && id) {
        const v = api.get ? api.get(id) : { id };
        if (typeof api.detail === 'function') api.detail(v, core);
        if (root.CustomEvent && doc.dispatchEvent) doc.dispatchEvent(new root.CustomEvent('lf-subs-detail', { detail: { id, video: v, status: core.status(1, [id]) } }));
        return;
      }
      if (a === 'all') { core.selectMany(visibleIds()); doc.querySelectorAll('[data-subs=sel]').forEach(x => { x.checked = true; }); refresh(); return; }
      if (a === 'clear') { core.clearSelection(); doc.querySelectorAll('[data-subs=sel]').forEach(x => { x.checked = false; }); refresh(); return; }
      if (a === 'allow' || a === 'deny') {
        const ev = (doc.querySelector('[data-subs=evidence]') || {}).value || '';
        let ok = 0, fail = 0;
        for (const x of core.picked) { const r = core.setRights(x, a === 'allow' ? 'allowed' : 'denied', ev); r.ok ? ok++ : fail++; }
        msg(fail ? '권리 근거가 필요합니다(허용 설정 실패 ' + fail + ')' : `권리 ${a === 'allow' ? '허용' : '거부'} ${ok}건`); refresh(); return;
      }
      if (a === 'zip') {
        const r = core.zip([...core.picked], zfmt, track === 'ko' ? TRACKS : TRACKS);
        if (!r.ok) return msg(why(r.reason) + (r.skipped.length ? ` (건너뜀 ${r.skipped.length}: ${[...new Set(r.skipped.map(s => why(s.reason)))].join(', ')})` : ''));
        out(r.name, r.bytes, r.mime); return msg(`ZIP ${r.count}개${r.skipped.length ? ' · 건너뜀 ' + r.skipped.length : ''}`);
      }
      if (a === 'wipe') { core.clearTranscripts(); msg('자막 메모리 삭제됨'); rerender(); }
    }
    function change(e) {
      const t = e.target, a = t && t.dataset && t.dataset.subs; if (!a) return;
      if (a === 'sel') { const id = t.closest('article.item[data-id]')?.dataset.id; if (id) { core.select(id, t.checked); refresh(); } }
      else if (a === 'file') onFiles([...(t.files || [])]);
      else if (a === 'track') track = t.value;
      else if (a === 'zfmt') zfmt = t.value;
      else if (a === 'filter') { mode = t.value; rerender(); }
      else if (a === 'persist') { core.persist(t.checked); msg(t.checked ? '세션 저장 ON(탭 종료 시 삭제)' : '세션 저장 OFF'); refresh(); }
    }
    doc.addEventListener('click', click);
    doc.addEventListener('change', change);
    panel(); decorate();
    let obs = null;
    if (root.MutationObserver) { obs = new root.MutationObserver(() => { if (!obs.busy) { obs.busy = true; try { decorate(); } finally { obs.busy = false; } } }); const g = doc.getElementById('grid') || doc.body; if (g) obs.observe(g, { childList: true, subtree: true }); }
    return Object.assign(core, {
      buttons, decorate, refresh, filter: v => core.matches(idOf(v), mode), setMode: m => { mode = m; }, rerender,
      unmount() { doc.removeEventListener('click', click); doc.removeEventListener('change', change); if (obs) obs.disconnect(); }
    });
  }

  root.LFSubsUI = { mount, createCore, zipStored, crc32 };
  if (typeof module === 'object' && module.exports) module.exports = root.LFSubsUI;
}(typeof window === 'object' ? window : globalThis));
