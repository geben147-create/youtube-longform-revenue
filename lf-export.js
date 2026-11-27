/* Local-only LONGFORM selection and caption exports. No I/O or persistence. */
(function (root, make) {
  if (typeof module === 'object' && module.exports) module.exports = make();
  else if (typeof define === 'function' && define.amd) define([], make);
  else root.LFExport = make();
}(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const SCHEMA = 'content-workbench.selection.v1';
  const ZONE = 'Asia/Seoul';
  const columns = ['video_id', 'source_url', 'title_original', 'channel', 'published_at',
    'published_date', 'views', 'observed_at', 'retrieved_at', 'duration_seconds',
    'language', 'format', 'model_version', 'selection_reason', 'rights'];
  const own = (value, key) => value != null && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
  const record = value => value !== null && Object.prototype.toString.call(value) === '[object Object]';
  const str = value => typeof value === 'string' && value.trim() !== '' ? value : null;
  const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const lines = text => text.replace(/\r\n?/g, '\n');
  function copy(value, trail = new Set()) {
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if ((!Array.isArray(value) && !record(value)) || trail.has(value)) return null;
    trail.add(value);
    const out = Array.isArray(value) ? Array.from(value, item => copy(item, trail))
      : Object.fromEntries(Object.keys(value).map(key => [key, copy(value[key], trail)]));
    trail.delete(value);
    return out;
  }
  function date(value) {
    if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const stamp = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? value : null;
  }
  function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) return null;
    return date(value.slice(0, 10)) && Number.isFinite(Date.parse(value)) ? value : null;
  }
  const seoul = new Intl.DateTimeFormat('en', {timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', era: 'short'});
  function seoulDate(stamp) {
    if (!stamp) return null;
    const parts = Object.fromEntries(seoul.formatToParts(Date.parse(stamp)).map(({type, value}) => [type, value]));
    return parts.era === 'AD' ? date(`${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`) : null;
  }
  function source(value) {
    if (!str(value)) return null;
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function evidence(value) {
    if (str(value)) return value;
    if (Array.isArray(value)) {
      const refs = value.map(item => str(item) || evidenceRef(item)).filter(Boolean);
      return refs.length ? refs : null;
    }
    return evidenceRef(value);
  }
  function evidenceRef(value) {
    if (!record(value)) return null;
    const keys = ['source', 'url', 'ref', 'reference', 'license', 'basis', 'note', 'details', 'date', 'type'];
    const refs = Object.fromEntries(keys.map(key => [key, str(own(value, key))]).filter(([, ref]) => ref !== null));
    return Object.keys(refs).some(key => key !== 'date' && key !== 'type') ? refs : null;
  }
  function rights(value) {
    if (!record(value)) return null;
    const flag = (key, allowed) => {
      const entry = own(value, key);
      return typeof entry === 'boolean' || allowed.includes(entry) ? entry : null;
    };
    return {
      analysis: flag('analysis', ['allowed', 'derived_only', 'denied', 'none']),
      store_full: flag('store_full', ['allowed', 'full', 'denied', 'none']),
      publish: flag('publish', ['allowed', 'excerpt', 'full', 'denied', 'none']),
      private_export: flag('private_export', ['full', 'excerpt', 'denied', 'none']),
      evidence: evidence(own(value, 'evidence'))
    };
  }

  // Input is canonical metadata; no retrieval, ranking, time-of-day guess, or fabricated IDs.
  function createRun(input) {
    if (!record(input)) throw new TypeError('Selection input must be an object.');
    const project_id = str(own(input, 'project_id'));
    const run_id = str(own(input, 'run_id'));
    if (!project_id || !run_id) throw new TypeError('project_id and run_id are required.');
    const days = own(input, 'published_within_days');
    if (days !== 30 && days !== 60) throw new RangeError('published_within_days must be 30 or 60.');
    const rows = own(input, 'selected');
    if (!Array.isArray(rows)) throw new TypeError('selected must be an array.');
    const snapshot = own(input, 'filters_snapshot');
    const seen = new Set();
    const selected = [];
    for (const row of rows) {
      if (!record(row)) throw new TypeError('Each selected item must be an object.');
      const format = str(own(row, 'format'));
      if (format && format !== 'longform') throw new RangeError('Only longform selections are supported.');
      const video_id = str(own(row, 'video_id'))?.trim() ?? null;
      if (video_id && seen.has(video_id)) continue;
      if (video_id) seen.add(video_id);
      const published_at = timestamp(own(row, 'published_at'));
      const views = nonnegative(own(row, 'views'));
      selected.push({
        video_id,
        source_url: source(own(row, 'source_url')),
        title_original: str(own(row, 'title_original')),
        channel: str(own(row, 'channel')),
        published_at,
        published_date: seoulDate(published_at) ?? date(own(row, 'published_date')),
        views: Number.isSafeInteger(views) ? views : null,
        observed_at: timestamp(own(row, 'observed_at')),
        retrieved_at: timestamp(own(row, 'retrieved_at')),
        duration_seconds: nonnegative(own(row, 'duration_seconds')),
        language: str(own(row, 'language')),
        format,
        model_version: str(own(row, 'model_version')),
        selection_reason: str(own(row, 'selection_reason')),
        rights: rights(own(row, 'rights'))
      });
    }
    return {schema: SCHEMA, schema_version: 1, format: 'longform', mode: 'reference_batch',
      project_id, run_id, timezone: ZONE, published_within_days: days,
      filters_snapshot: record(snapshot) ? copy(snapshot) : null, selected};
  }

  function cueTime(value, format) {
    const match = format === 'srt' ? /^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(value)
      : /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(value);
    if (!match) return null;
    const ms = ((Number(match[1] || 0) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000 + Number(match[4]);
    return Number.isSafeInteger(ms) ? ms : null;
  }
  // TXT retains the original input but never generates timestamps or cues.
  function caption(text, ext) {
    if (typeof text !== 'string') throw new TypeError('Caption content must be text.');
    const format = typeof ext === 'string' ? ext.trim().toLowerCase().replace(/^\./, '') : '';
    if (!['srt', 'vtt', 'txt'].includes(format)) throw new RangeError('Use SRT, VTT, or TXT captions.');
    const cues = [], warnings = [];
    if (format === 'txt') return {format, timed: false, cues, text, warnings};
    const sourceText = lines(text.replace(/^\uFEFF/, '')).trim();
    const blocks = sourceText ? sourceText.split(/\n(?:[\t ]*\n)+/) : [];
    if (format === 'vtt') {
      if (/^WEBVTT(?:[\t ][^\n]*)?(?:\n|$)/.test(blocks[0] || '')) blocks.shift();
      else warnings.push({code: 'missing_webvtt_header', block: null});
    }
    blocks.forEach((block, i) => {
      const rows = block.split('\n');
      if (format === 'vtt' && /^(?:NOTE(?:[\t ]|$)|STYLE[\t ]*$|REGION[\t ]*$)/.test(rows[0])) return;
      const timeRow = rows[0].includes('-->') ? 0 : 1;
      const timing = rows[timeRow]?.trim().match(/^(\S+)[\t ]+-->[\t ]+(\S+)([\t ].*)?$/);
      const start_ms = timing ? cueTime(timing[1], format) : null;
      const end_ms = timing ? cueTime(timing[2], format) : null;
      if (start_ms === null || end_ms === null || end_ms <= start_ms || (format === 'srt' && timing[3])) {
        warnings.push({code: 'invalid_timing', block: i + 1});
        return;
      }
      const body = rows.slice(timeRow + 1).join('\n');
      if (!str(body)) {
        warnings.push({code: 'empty_cue', block: i + 1});
        return;
      }
      cues.push({start_ms, end_ms, text: body});
    });
    if (!cues.length) warnings.push({code: 'no_timed_cues', block: null});
    return {format, timed: cues.length > 0, cues, text, warnings};
  }

  const allowedAnalysis = right => right === true || right === 'allowed' || right === 'derived_only';
  const allowedExcerpt = right => right === true || right === 'allowed' || right === 'excerpt' || right === 'full';
  const excerptLimit = 300; // Unicode code points. Larger supplied quotes are not silently truncated.
  const allowedEvidence = policy => policy.evidence !== null;
  const csvCell = value => {
    if (value == null) return '';
    const string = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const safe = typeof value === 'string' && /^(?:[\t\r\n]|[\s\u200B-\u200F\u202A-\u202E\u2060-\u206F]*[=+@-])/.test(string) ? "'" + string : string;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  function md(value) {
    return String(value).replace(/[\r\n\t]+/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+.!|~]/g, '\\$&');
  }
  function srtTime(ms) {
    const pad = (n, size = 2) => String(n).padStart(size, '0');
    return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
  }
  function srt(cues) {
    if (!cues.length) return null;
    const blocks = [];
    for (const cue of cues) {
      if (!record(cue)) return null;
      const start = own(cue, 'start_ms'), end = own(cue, 'end_ms');
      const text = str(own(cue, 'text'));
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || !text) return null;
      const body = lines(text);
      if (body.split('\n').some(line => !line.trim()) || body.includes('\0')) return null;
      blocks.push(`${blocks.length + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${body}`);
    }
    return blocks.join('\n\n') + '\n';
  }
  function filename(id, used) {
    let stem = id.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 96) || 'caption';
    if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(stem)) stem = '_' + stem;
    let name = `${stem}.srt`, num = 2;
    while (used.has(name.toLowerCase())) name = `${stem}-${num++}.srt`;
    used.add(name.toLowerCase());
    return name;
  }

  // Reports do not receive cue bodies. The JSON stays a portable selection manifest.
  // Only the per-video metadata grants rights for this export; run rights alone do not.
  // store_full does not grant export, and does not control this explicit private download.
  function pack(run, metadata) {
    if (own(run, 'schema') !== SCHEMA || own(run, 'schema_version') !== 1 || own(run, 'format') !== 'longform' || own(run, 'mode') !== 'reference_batch') {
      throw new TypeError('Use a LONGFORM selection v1 run.');
    }
    const manifest = createRun(run);
    const omissions = [], entries = [], used = new Set();
    const omit = (video_id, field, reason) => omissions.push({video_id, field, reason});
    const markdown = ['# LONGFORM reference batch', '', `- Project: ${md(manifest.project_id)}`,
      `- Run: ${md(manifest.run_id)}`, `- Published within: ${manifest.published_within_days} days (${ZONE})`, ''];
    const csv = [[...columns, 'excerpt', 'analysis'].join(',')];
    for (const row of manifest.selected) {
      const id = row.video_id;
      const meta = id ? own(metadata, id) : null;
      const policy = rights(own(meta, 'rights'));
      if (policy) row.rights = policy;
      let excerpt = null, analysis = null;
      const quote = str(own(meta, 'excerpt'));
      const note = own(meta, 'analysis');
      const cues = own(meta, 'cues');
      if (quote) {
        if (!policy || !allowedExcerpt(policy.publish)) omit(id, 'excerpt', 'publish_not_allowed');
        else if (!allowedEvidence(policy)) omit(id, 'excerpt', 'rights_evidence_missing');
        else if (Array.from(quote).length > excerptLimit) omit(id, 'excerpt', 'excerpt_length_limit');
        else excerpt = quote;
      }
      if (str(note) || record(note) || Array.isArray(note)) {
        if (!policy || !allowedAnalysis(policy.analysis)) omit(id, 'analysis', 'analysis_not_allowed');
        else analysis = copy(note);
      }
      if (cues != null || policy?.private_export === 'full') {
        if (policy?.private_export !== 'full') omit(id, 'srt', 'private_export_requires_full');
        else if (!allowedEvidence(policy)) omit(id, 'srt', 'rights_evidence_missing');
        else if (!Array.isArray(cues) || !cues.length) omit(id, 'srt', 'no_timed_cues');
        else {
          const content = srt(cues);
          if (content) entries.push([filename(id, used), content]);
          else omit(id, 'srt', 'invalid_timed_cues');
        }
      }
      markdown.push(`## ${md(row.title_original ?? id ?? 'Unknown video')}`, '');
      for (const [label, value] of [['Video ID', id], ['Source', row.source_url], ['Channel', row.channel],
        ['Published (KST date)', row.published_date], ['Published at', row.published_at], ['Views', row.views],
        ['Observed at', row.observed_at], ['Retrieved at', row.retrieved_at], ['Duration (seconds)', row.duration_seconds],
        ['Language', row.language], ['Model version', row.model_version], ['Selection reason', row.selection_reason]]) {
        markdown.push(`- ${label}: ${value === null ? 'Unknown' : md(value)}`);
      }
      if (excerpt !== null) markdown.push(`- Authorized excerpt: ${md(excerpt)}`);
      if (analysis !== null) markdown.push(`- Analysis: ${md(typeof analysis === 'string' ? analysis : JSON.stringify(analysis))}`);
      markdown.push('');
      csv.push([...columns.map(key => row[key]), excerpt, analysis].map(csvCell).join(','));
    }
    if (omissions.length) {
      markdown.push('## Omissions', '');
      for (const item of omissions) markdown.push(`- ${md(item.video_id ?? 'Unknown video')}: ${md(item.field)} (${md(item.reason)})`);
      markdown.push('');
    }
    return {markdown: markdown.join('\n'), json: JSON.stringify(manifest, null, 2) + '\n',
      csv: csv.join('\r\n') + '\r\n', omissions, zip: entries.length ? zipStored(entries) : null};
  }

  const crcTable = Uint32Array.from({length: 256}, (_, i) => {
    for (let k = 0; k < 8; k++) i = (i & 1 ? 0xEDB88320 : 0) ^ (i >>> 1);
    return i;
  });
  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStored(entries) {
    if (entries.length >= 0xFFFF) throw new RangeError('Too many entries for a ZIP32 export.');
    const utf8 = new TextEncoder();
    let localSize = 0, directorySize = 0;
    const files = entries.map(([name, content]) => {
      const filename = utf8.encode(name), bytes = utf8.encode(content);
      const offset = localSize;
      localSize += 30 + filename.length + bytes.length;
      directorySize += 46 + filename.length;
      return {filename, bytes, offset, crc: crc32(bytes)};
    });
    const size = localSize + directorySize + 22;
    if (size >= 0xFFFFFFFF) throw new RangeError('Archive exceeds ZIP32 limits.');
    const archive = new Uint8Array(size), view = new DataView(archive.buffer);
    const put16 = (p, n) => view.setUint16(p, n, true);
    const put32 = (p, n) => view.setUint32(p, n, true);
    let central = localSize;
    for (const {filename, bytes, offset, crc} of files) {
      put32(offset, 0x04034B50);
      put16(offset + 4, 20); put16(offset + 6, 0x0800); put16(offset + 12, 0x21);
      put32(offset + 14, crc); put32(offset + 18, bytes.length); put32(offset + 22, bytes.length);
      put16(offset + 26, filename.length);
      archive.set(filename, offset + 30); archive.set(bytes, offset + 30 + filename.length);
      put32(central, 0x02014B50);
      put16(central + 4, 20); put16(central + 6, 20); put16(central + 8, 0x0800); put16(central + 14, 0x21);
      put32(central + 16, crc); put32(central + 20, bytes.length); put32(central + 24, bytes.length);
      put16(central + 28, filename.length); put32(central + 42, offset);
      archive.set(filename, central + 46);
      central += 46 + filename.length;
    }
    put32(central, 0x06054B50); put16(central + 8, files.length); put16(central + 10, files.length);
    put32(central + 12, directorySize); put32(central + 16, localSize);
    return archive;
  }

  return Object.freeze({createRun, caption, pack});
}));
