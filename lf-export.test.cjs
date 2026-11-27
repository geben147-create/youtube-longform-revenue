'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const {createRun, caption, pack} = require('./lf-export.js');

const input = selected => ({project_id: 'longform-project', run_id: 'run-20261127',
  published_within_days: 30, filters_snapshot: {sort: 'views', tags: ['AI'], unavailable: undefined}, selected});
const cues = [{start_ms: 1234, end_ms: 2500, text: '비공개 자막 🐱\nPrivate cue'}];
const granted = {private_export: 'full', evidence: 'Permission record 2026-11-27'};

test('createRun emits the fixed longform contract and keeps known zero and null distinct', () => {
  const original = input([
    {video_id: 'a', source_url: 'https://www.youtube.com/watch?v=a', title_original: '한국어', channel: '채널',
      published_at: '2026-11-26T15:00:00Z', published_date: '2026-11-26', views: 0,
      duration_seconds: 183.5, retrieved_at: '2026-11-27T03:00:00+09:00',
      language: 'ko', model_version: 'legacy', format: 'longform', selection_reason: 'Chosen'},
    {video_id: 'b', published_date: '2026-11-25', observed_at: '2026-11-26', views: NaN,
      source_url: 'javascript:alert(1)', duration_seconds: -1},
    {video_id: 'a', title_original: 'duplicate'}
  ]);
  const run = createRun(original);
  assert.deepEqual(Object.keys(run), ['schema', 'schema_version', 'format', 'mode', 'project_id', 'run_id',
    'timezone', 'published_within_days', 'filters_snapshot', 'selected']);
  assert.equal(run.schema, 'content-workbench.selection.v1');
  assert.equal(run.schema_version, 1);
  assert.equal(run.format, 'longform');
  assert.equal(run.mode, 'reference_batch');
  assert.equal(run.timezone, 'Asia/Seoul');
  assert.equal(run.selected.length, 2);
  assert.equal(run.selected[0].published_date, '2026-11-27');
  assert.equal(run.selected[0].published_at, '2026-11-26T15:00:00Z');
  assert.equal(run.selected[0].retrieved_at, '2026-11-27T03:00:00+09:00');
  assert.equal(run.selected[0].views, 0);
  assert.equal(run.selected[0].duration_seconds, 183.5);
  assert.deepEqual(run.selected[1], {
    video_id: 'b', source_url: null, title_original: null, channel: null, published_at: null,
    published_date: '2026-11-25', views: null, observed_at: null, retrieved_at: null,
    duration_seconds: null, language: null, format: null, model_version: null, selection_reason: null, rights: null
  });
  original.filters_snapshot.tags.push('mutable');
  assert.deepEqual(run.filters_snapshot, {sort: 'views', tags: ['AI'], unavailable: null});
  assert.equal(createRun({...input([]), published_within_days: 60}).published_within_days, 60);
  assert.throws(() => createRun({...input([]), published_within_days: 31}), RangeError);
  assert.throws(() => createRun(input([{format: 'shorts'}])), RangeError);
  assert.throws(() => createRun({...input([]), run_id: ''}), TypeError);
  assert.equal(createRun(input([{published_at: '2026-02-29T15:00:00Z', published_date: '2026-02-29'}])).selected[0].published_date, null);
});

test('caption keeps untimed TXT byte-for-byte at the string level', () => {
  const text = '\uFEFF00:00:01.500 --> 00:00:02.000\r\nNo synthetic timings';
  assert.deepEqual(caption(text, '.TXT'), {format: 'txt', timed: false, cues: [], text, warnings: []});
  assert.throws(() => caption('sample', '.json'), RangeError);
  assert.throws(() => caption(null, '.srt'), TypeError);
});

test('SRT reads BOM, CRLF and integer timing; malformed ranges are reported rather than fabricated', () => {
  const result = caption('\uFEFF1\r\n00:00:01,234 --> 00:00:02,500\r\n한국어\r\nEnglish\r\n\r\n' +
    '2\r\n00:00:05,000 --> 00:00:04,000\r\nBackward\r\n\r\n3\r\n00:00:08,000 --> 00:00:09,000\r\n', 'srt');
  assert.equal(result.timed, true);
  assert.deepEqual(result.cues, [{start_ms: 1234, end_ms: 2500, text: '한국어\nEnglish'}]);
  assert.deepEqual(result.warnings, [{code: 'invalid_timing', block: 2}, {code: 'empty_cue', block: 3}]);
  assert.equal(caption('1\n00:99:01,000 --> 00:99:02,000\nInvalid', 'srt').timed, false);
});

test('WebVTT recognizes cue identifiers, timestamp settings and ignores metadata blocks', () => {
  const text = 'WEBVTT title\nKind: captions\n\nNOTE this is not a cue\n\nSTYLE\n::cue { color: lime }\n\n' +
    'identifier\n00:01.001 --> 00:02.003 align:start position:5%\n<v Speaker>첫 번째\n\n' +
    '01:00:02.050 --> 01:00:04.500\nSecond\n';
  const result = caption(text, 'vtt');
  assert.equal(result.timed, true);
  assert.deepEqual(result.cues, [{start_ms: 1001, end_ms: 2003, text: '<v Speaker>첫 번째'},
    {start_ms: 3602050, end_ms: 3604500, text: 'Second'}]);
  assert.deepEqual(result.warnings, []);
});

// Independent ZIP verifier: checks stored entries, local and central CRC/size, offsets, and EOCD.
function unzipStored(zip) {
  assert.ok(zip instanceof Uint8Array);
  const bytes = Buffer.from(zip);
  const end = bytes.length - 22;
  assert.equal(bytes.readUInt32LE(end), 0x06054B50);
  const start = bytes.readUInt32LE(end + 16), length = bytes.readUInt32LE(end + 12);
  assert.equal(start + length, end);
  const result = new Map();
  let central = start;
  while (central < end) {
    assert.equal(bytes.readUInt32LE(central), 0x02014B50);
    assert.equal(bytes.readUInt16LE(central + 10), 0);
    const size = bytes.readUInt32LE(central + 20), nameSize = bytes.readUInt16LE(central + 28);
    const at = bytes.readUInt32LE(central + 42);
    assert.equal(size, bytes.readUInt32LE(central + 24));
    assert.equal(bytes.readUInt32LE(at), 0x04034B50);
    assert.equal(bytes.readUInt16LE(at + 8), 0);
    assert.equal(bytes.readUInt32LE(at + 18), size);
    assert.equal(bytes.readUInt32LE(at + 22), size);
    assert.equal(bytes.readUInt16LE(at + 26), nameSize);
    const name = bytes.subarray(at + 30, at + 30 + nameSize).toString('utf8');
    assert.equal(bytes.subarray(central + 46, central + 46 + nameSize).toString('utf8'), name);
    const body = bytes.subarray(at + 30 + nameSize, at + 30 + nameSize + size);
    let crc = -1;
    for (const byte of body) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
    assert.equal((~crc >>> 0), bytes.readUInt32LE(at + 14));
    assert.equal((~crc >>> 0), bytes.readUInt32LE(central + 16));
    result.set(name, body.toString('utf8'));
    central += 46 + nameSize;
  }
  assert.equal(central, end);
  assert.equal(result.size, bytes.readUInt16LE(end + 10));
  return result;
}

test('pack generates a separate stored UTF-8 ZIP with only authorized timed SRTs', () => {
  const run = createRun(input(['good', 'bad', 'no-evidence', 'untimed', 'malformed', '../x', '..\\x', 'CON']
    .map(video_id => ({video_id, format: 'longform'}))));
  const result = pack(run, {
    good: {rights: {...granted, store_full: false, publish: false, analysis: true}, cues, analysis: 'Derived summary'},
    bad: {rights: {private_export: true, store_full: true, publish: 'full', evidence: 'Record'}, cues},
    'no-evidence': {rights: {private_export: 'full', evidence: {}}, cues},
    untimed: {rights: granted, cues: caption('raw TXT', 'txt').cues},
    malformed: {rights: granted, cues: [...cues, {start_ms: 12, end_ms: 3, text: 'bad'}]},
    '../x': {rights: granted, cues}, '..\\x': {rights: granted, cues}, CON: {rights: granted, cues},
    unselected: {rights: granted, cues}
  });
  const zip = unzipStored(result.zip);
  assert.deepEqual([...zip.keys()], ['good.srt', '_x.srt', '_x-2.srt', '_CON.srt']);
  assert.equal(zip.get('good.srt'), '1\n00:00:01,234 --> 00:00:02,500\n비공개 자막 🐱\nPrivate cue\n');
  assert.deepEqual(result.omissions, [
    {video_id: 'bad', field: 'srt', reason: 'private_export_requires_full'},
    {video_id: 'no-evidence', field: 'srt', reason: 'rights_evidence_missing'},
    {video_id: 'untimed', field: 'srt', reason: 'no_timed_cues'},
    {video_id: 'malformed', field: 'srt', reason: 'invalid_timed_cues'}
  ]);
  for (const report of [result.markdown, result.csv, result.json]) assert.doesNotMatch(report, /Private cue|비공개 자막|raw TXT/);
  assert.equal(JSON.parse(result.json).selected[0].rights.store_full, false);
  assert.equal(run.selected[0].rights, null);
});

test('supplemental report gates do not inherit run rights or leak rejected metadata', () => {
  const run = createRun(input(['yes', 'no', 'long', 'no-proof', 'stale'].map(video_id => ({video_id,
    rights: granted, title_original: video_id === 'yes' ? '=SUM(1,2) <img src=x> "quote"' : video_id}))));
  const result = pack(run, {
    yes: {rights: {analysis: 'derived_only', publish: 'excerpt', evidence: {reference: 'License 1'}},
      excerpt: 'Allowed quote', analysis: {summary: 'Allowed analysis'}},
    no: {rights: {analysis: 'denied', publish: false}, excerpt: 'PRIVATE QUOTE', analysis: 'PRIVATE ANALYSIS'},
    long: {rights: {publish: 'full', evidence: 'License 2'}, excerpt: 'x'.repeat(301)},
    'no-proof': {rights: {publish: true, evidence: '  '}, excerpt: 'NO PROOF'},
    stale: {cues, excerpt: 'STALE QUOTE', analysis: 'STALE ANALYSIS'}
  });
  assert.equal(result.zip, null);
  assert.match(result.markdown, /Allowed quote/);
  assert.match(result.markdown, /Allowed analysis/);
  assert.match(result.markdown, /&lt;img src=x&gt;/);
  assert.match(result.csv, /"'=SUM\(1,2\) <img src=x> ""quote"""/);
  assert.match(result.csv, /Allowed analysis/);
  for (const report of [result.markdown, result.csv, result.json]) {
    assert.doesNotMatch(report, /PRIVATE QUOTE|PRIVATE ANALYSIS|STALE QUOTE|STALE ANALYSIS|NO PROOF|x{301}|Private cue/);
  }
  assert.doesNotMatch(result.json, /Allowed quote|Allowed analysis/);
  assert.equal(JSON.parse(result.json).schema, run.schema);
  assert.ok(result.omissions.some(x => x.reason === 'excerpt_length_limit'));
  assert.ok(result.omissions.some(x => x.video_id === 'stale' && x.field === 'srt'));
  assert.throws(() => pack({...run, mode: 'shorts'}, {}), TypeError);
});

test('browser UMD initializes on window and parses and exports in memory without network/storage', () => {
  let external = 0;
  const forbidden = () => { external++; throw new Error('external side effect'); };
  const browser = {window: {}, URL, TextEncoder, fetch: forbidden, XMLHttpRequest: forbidden, localStorage: {setItem: forbidden, getItem: forbidden}};
  Object.assign(browser.window, {fetch: forbidden, XMLHttpRequest: forbidden, localStorage: browser.localStorage});
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'lf-export.js'), 'utf8'), browser);
  assert.deepEqual(Object.keys(browser.window.LFExport), ['createRun', 'caption', 'pack']);
  const lf = browser.window.LFExport;
  const browserRun = lf.createRun(input([{video_id: 'browser'}]));
  const parsed = lf.caption('1\n00:00:00,000 --> 00:00:01,000\nLocal', 'srt');
  const result = lf.pack(browserRun, {browser: {rights: granted, cues: parsed.cues}});
  assert.equal(result.zip[0], 0x50);
  assert.equal(external, 0);
});
