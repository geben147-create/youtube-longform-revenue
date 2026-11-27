'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const {merge, provenance} = require('./lf-observations.js');
const exporter = require('./lf-export.js');

const day1 = '2026-11-24T12:00:00.000Z';
const day2 = '2026-11-26T12:00:00.000Z';
const day3 = '2026-11-27T12:00:00.000Z';
const row = (id, fields = {}) => ({id, t: 'Original title', k: '분류', s: 205, v: 100, ...fields});
const verified = observedAt => ({observedAt, verified: true});
const view = (id, v, observedAt) => ({id, v, observations: {v: verified(observedAt)}});
const views = r => r.history.filter(entry => entry.metric === 'v');
const freeze = obj => {
  for (const value of Object.values(obj)) if (value && typeof value === 'object') freeze(value);
  return Object.freeze(obj);
};

test('CommonJS, browser UMD and AMD expose the same pure API', () => {
  assert.deepEqual(Object.keys(require('./lf-observations.js')), ['merge', 'provenance']);
  const code = fs.readFileSync(require.resolve('./lf-observations.js'), 'utf8');
  const browser = {};
  vm.runInNewContext(code, browser);
  assert.equal(typeof browser.LFObservations.merge, 'function');
  assert.equal(typeof browser.LFObservations.provenance, 'function');
  let amd;
  const define = (_deps, factory) => { amd = factory(); };
  define.amd = true;
  vm.runInNewContext(code, {define});
  assert.equal(typeof amd.merge, 'function');
  assert.equal(typeof amd.provenance, 'function');
  assert.deepEqual(merge(undefined, null), {rows: [], conflicts: [], added: 0, updated: 0});
});

test('preserves local metadata and order, appends IDs once, and detaches outputs', () => {
  const first = row('one', {note: '로컬 메모', rights: {licence: 'unknown'}, ks: ['원본'], src: ['직접 조사'], rank: 1});
  const remoteLead = row('three', {t: 'New title'});
  const local = freeze([first, row('two')]);
  const remote = freeze([remoteLead, row('one', {v: 95, t: 'Replace?', k: 'other', ks: ['other'], rights: {licence: 'remote'}, note: 'remote', src: ['other'], ai: true, rank: 8, ...verified(day2)}), row('four'), row('three', {t: 'Duplicate'})]);
  const result = merge(local, remote);
  assert.deepEqual(result.rows.map(r => r.id), ['one', 'two', 'three', 'four']);
  assert.equal(result.added, 2);
  assert.equal(result.updated, 1);
  assert.equal(result.rows[2].t, 'New title');
  const {v, history, observations, ...unchanged} = result.rows[0];
  const {v: old, ...expected} = first;
  assert.deepEqual(unchanged, expected);
  assert.equal(v, 95);
  assert.deepEqual(observations.v, verified(day2));
  assert.deepEqual(history.filter(e => e.metric === 'v').map(e => [e.value, e.observedAt]), [[old, null], [95, day2]]);
  result.rows[0].rights.licence = 'changed';
  result.rows[0].ks.push('added');
  assert.equal(first.rights.licence, 'unknown');
  assert.deepEqual(first.ks, ['원본']);
  assert.notEqual(result.rows[2], remoteLead);
});

test('asOf, publish date, prose, unverified instants and date-only checks never overwrite', () => {
  const local = [row('one', {v: 105, checked: '2026-11-27', note: '영상 출처 확인'})];
  const remote = [
    {id: 'one', v: 1, asOf: '2027-01-01', d: '2027-01-01', note: 'Views verified at 2027-01-01T03:00:00Z'},
    {id: 'one', v: 2, checked: '2027-01-01'},
    {id: 'one', v: 3, observedAt: day3, verified: false},
    {id: 'one', v: 4, observedAt: '2027-01-01', verified: true},
    {id: 'one', v: 5, checked: '2027-01-01T03:00:00Z', verified: true}
  ];
  const {rows, conflicts, updated} = merge(local, remote);
  assert.equal(updated, 0);
  assert.deepEqual(conflicts, []);
  assert.equal(rows[0].v, 105);
  assert.deepEqual(rows[0].observations.v, {observedAt: null, verified: false, checked: '2026-11-27'});
  assert.deepEqual(views(rows[0]).map(e => [e.value, e.observedAt, e.verified, e.checked]), [
    [105, null, false, '2026-11-27'], [1, null, false, undefined], [2, null, false, '2027-01-01'],
    [3, day3, false, undefined], [4, null, false, '2027-01-01'], [5, null, false, undefined]
  ]);
});

test('requires a valid calendar timestamp, a known timezone and boolean verification', () => {
  const bad = ['2026-02-30T00:00:00Z', '2026-11-27T24:00:00Z', '2026-11-27T00:00:00',
    '2026-11-27T00:00:00-00:00', '2026-11-27 00:00:00Z', '2026-11-27T00:00:00.0001Z',
    '2026-11-27T00:00:60Z', Date.parse(day3)];
  const remote = bad.map((t, i) => view('one', i, t));
  remote.push({id: 'one', v: 80, observedAt: day3, verified: 'true'});
  const {rows, updated} = merge([row('one')], remote);
  assert.equal(updated, 0);
  assert.equal(rows[0].v, 100);
  assert.equal(views(rows[0]).length, bad.length + 2);
  assert.ok(views(rows[0]).every(e => !e.verified));
});

test('same audit day is not guaranteed newer; a chronologically later observation refreshes it', () => {
  const local = [row('one', {checked: '2026-11-26', n: 20})];
  assert.equal(merge(local, [view('one', 120, '2026-11-27T11:59:59Z')]).rows[0].v, 100);
  const result = merge(local, [view('one', 112, '2026-11-27T21:00:00+09:00')]);
  assert.equal(result.rows[0].v, 112);
  assert.equal(result.rows[0].checked, '2026-11-26');
  assert.deepEqual(result.rows[0].observations.v, verified(day3));
  assert.deepEqual(result.rows[0].observations.s, {observedAt: null, verified: false, checked: '2026-11-26'});
  assert.equal(result.rows[0].n, 20);
});

test('provenance is metric scoped; stale/undated remote values remain in history', () => {
  const local = [row('one', {v: 123, n: 20, observations: {v: verified(day3), n: verified(day1)}})];
  const remote = [{id: 'one', v: 140, s: 300, n: 30, ...verified(day2), observations: {s: {observedAt: day2}}}, {id: 'one', v: 155}];
  const {rows, updated} = merge(local, remote);
  assert.equal(updated, 1);
  assert.deepEqual([rows[0].v, rows[0].s, rows[0].n], [123, 205, 30]);
  assert.deepEqual(rows[0].observations.v, verified(day3));
  assert.deepEqual(rows[0].observations.n, verified(day2));
  assert.deepEqual(views(rows[0]).map(e => [e.value, e.observedAt]), [[123, day3], [140, day2], [155, null]]);
});

test('same-time different values conflict across timezone offsets and feed order', () => {
  const local = [row('one', {observations: {v: verified(day1)}})];
  const remote = [view('one', 107, day2), view('one', 150, day3), view('one', 160, '2026-11-27T21:00:00+09:00')];
  for (const order of [remote, [...remote].reverse()]) {
    const {rows, conflicts, updated} = merge(local, order);
    assert.equal(rows[0].v, 100);
    assert.equal(updated, 0);
    assert.deepEqual(conflicts, [{id: 'one', metric: 'v', observedAt: day3, values: [150, 160]}]);
    assert.deepEqual(views(rows[0]).map(e => e.value).sort((a, b) => a - b), [100, 107, 150, 160]);
  }
});

test('equal-time conflict with the local incumbent is rejected; equal values are de-duplicated', () => {
  const local = [row('one', {observations: {v: verified(day2)}})];
  assert.equal(merge(local, [view('one', 120, day2)]).rows[0].v, 100);
  assert.deepEqual(merge(local, [view('one', 120, day2)]).conflicts, [{id: 'one', metric: 'v', observedAt: day2, values: [100, 120]}]);
  const same = merge(local, [view('one', 100, '2026-11-26T21:00:00+09:00')]);
  assert.equal(same.updated, 0);
  assert.deepEqual(same.conflicts, []);
  assert.equal(views(same.rows[0]).length, 1);
  assert.equal(merge(local, [view('one', 100, day3)]).updated, 1);
});

test('cached history round-trips idempotently and retains conflicts on retry', () => {
  const local = [row('one', {checked: '2026-11-24'})];
  const accepted = view('one', 111, day2);
  const badOne = view('one', 112, day3), badTwo = view('one', 113, day3);
  const result = merge(local, [accepted, badOne, badTwo]);
  const cache = JSON.parse(JSON.stringify(result.rows));
  assert.deepEqual(merge(cache, [accepted, badOne, badTwo]), {rows: cache, conflicts: result.conflicts, added: 0, updated: 0});
  assert.equal(merge(cache, [badOne]).rows[0].v, 100);
  const recovered = merge(cache, [view('one', 114, '2026-11-28T12:00:00Z')]);
  assert.equal(recovered.rows[0].v, 114);
  assert.deepEqual(recovered.conflicts, result.conflicts);
  const saved = JSON.parse(JSON.stringify(recovered.rows));
  assert.deepEqual(merge(saved, []).rows, saved);
});

test('new rows retain undated baselines but have no arbitrary winner for a verified tie', () => {
  const result = merge([], [row('plain', {v: 12}), row('tied', {v: 25, ...verified(day2)}), view('tied', 30, day2)]);
  assert.equal(result.added, 2);
  assert.equal(result.updated, 0);
  assert.equal(result.rows[0].v, 12);
  assert.equal(Object.hasOwn(result.rows[1], 'v'), false);
  assert.deepEqual(views(result.rows[1]).map(e => e.value), [25, 30]);
  assert.deepEqual(result.conflicts, [{id: 'tied', metric: 'v', observedAt: day2, values: [25, 30]}]);
});

test('history-only claims and invalid metrics cannot be promoted', () => {
  const local = [row('one', {n: 12})];
  const remote = [{id: 'one', history: [{metric: 'v', value: 45, ...verified(day2)}], v: -1, s: 180, n: '13', ...verified(day3)}];
  const {rows, updated} = merge(local, remote);
  assert.equal(updated, 0);
  assert.deepEqual([rows[0].v, rows[0].s, rows[0].n], [100, 205, 12]);
  assert.deepEqual(views(rows[0]).map(e => e.value), [100, 45]);
});


const retrieved1 = '2026-11-24T13:00:00.000Z';
const retrieved2 = '2026-11-26T13:00:00.000Z';
const retrieved3 = '2026-11-27T13:00:00.000Z';
const receipt = (observedAt, retrievedAt) => ({...verified(observedAt), retrievedAt});

test('replacement carries its independent retrieval timestamp without changing manual fields or sibling metrics', () => {
  const local = freeze([row('one', {
    ...receipt(day1, retrieved1), n: 42, checked: '2026-11-24', note: 'manual memo', tags: ['manual']
  })]);
  const result = merge(local, [{id: 'one', v: 125, n: 44, retrievedAt: '2026-11-20T00:00:00Z', note: 'not the local note',
    observations: {v: receipt(day2, '2026-11-26T22:00:00+09:00'), n: verified(day3)}}]);
  assert.equal(result.updated, 1);
  const [selected] = result.rows;
  assert.deepEqual([selected.v, selected.n, selected.note, selected.tags, selected.checked, selected.retrievedAt],
    [125, 44, 'manual memo', ['manual'], '2026-11-24', retrieved1]);
  assert.deepEqual(provenance(selected, 'v'), {observedAt: day2, retrievedAt: retrieved2});
  assert.deepEqual(provenance(selected, 'n'), {observedAt: day3, retrievedAt: null});
  assert.deepEqual(provenance(selected, 's'), {observedAt: day1, retrievedAt: retrieved1});
  assert.deepEqual(views(selected).map(({value, retrievedAt}) => [value, retrievedAt]), [[100, retrieved1], [125, retrieved2]]);
  const rowWide = merge(local, [{id: 'one', v: 125, ...receipt(day2, retrieved2)}], {retrievedAt: retrieved3}).rows[0];
  assert.deepEqual(provenance(rowWide, 'v'), {observedAt: day2, retrievedAt: retrieved2});
  assert.equal(rowWide.retrievedAt, retrieved1);
  assert.deepEqual(provenance(row('unverified', {observedAt: day1, retrievedAt: retrieved1}), 'v'), {observedAt: null, retrievedAt: null});
  assert.deepEqual(provenance(row('bad-scope', {v: 100, ...receipt(day1, retrieved1), observations: {v: null}}), 'v'),
    {observedAt: null, retrievedAt: null});
});

test('a fresh batch retrieval fills only incoming verified active claims and never overrides their receipts', () => {
  const local = [row('one', {retrievedAt: retrieved1, observations: {s: verified(day1)}})];
  const incoming = [
    {id: 'one', v: 125, n: 42, retrievedAt: retrieved1, observations: {v: verified(day2), n: receipt(day2, retrieved2)},
      history: [{metric: 'v', value: 120, ...verified(day1)}]},
    row('new', {observations: {v: verified(day3)}}),
    row('unverified', {retrievedAt: retrieved1, observedAt: day2, verified: false}),
    row('bad-stamp', {observations: {v: receipt(day2, '2026-02-30T13:00:00Z')}})
  ];
  const {rows} = merge(local, incoming, {retrievedAt: '2026-11-27T22:00:00+09:00'});
  assert.deepEqual(provenance(rows[0], 'v'), {observedAt: day2, retrievedAt: retrieved3});
  assert.deepEqual(provenance(rows[0], 'n'), {observedAt: day2, retrievedAt: retrieved2});
  assert.deepEqual(provenance(rows[0], 's'), {observedAt: day1, retrievedAt: null});
  assert.equal(views(rows[0]).find(entry => entry.value === 120).retrievedAt, undefined);
  assert.deepEqual(provenance(rows[1], 'v'), {observedAt: day3, retrievedAt: retrieved3});
  assert.deepEqual(provenance(rows[2], 'v'), {observedAt: null, retrievedAt: null});
  assert.deepEqual(provenance(rows[3], 'v'), {observedAt: day2, retrievedAt: retrieved3});
  assert.equal(provenance(merge([], [incoming[1]], {retrievedAt: 'yesterday'}).rows[0], 'v').retrievedAt, null);
});

test('receipt timestamps do not break conflicts, cache replay, or duplicate observations', () => {
  const local = [row('one', {retrievedAt: retrieved1, observations: {v: receipt(day1, retrieved1)}})];
  const unambiguous = view('one', 125, day2);
  const accepted = merge(local, [unambiguous], {retrievedAt: retrieved2});
  const cache = JSON.parse(JSON.stringify(accepted.rows));
  const replay = merge(local, cache);
  assert.deepEqual(replay.rows, cache);
  assert.deepEqual(merge(cache, [unambiguous], {retrievedAt: retrieved3}), {rows: cache, conflicts: [], added: 0, updated: 0});
  const conflicting = [view('one', 126, day3), {id: 'one', v: 127, observations: {v: receipt(day3, '2026-11-27T14:00:00Z')}}];
  const rejected = merge(cache, conflicting, {retrievedAt: retrieved3});
  assert.equal(rejected.updated, 0);
  assert.deepEqual(rejected.conflicts, [{id: 'one', metric: 'v', observedAt: day3, values: [126, 127]}]);
  assert.deepEqual(provenance(rejected.rows[0], 'v'), {observedAt: day2, retrievedAt: retrieved2});
  assert.deepEqual(views(rejected.rows[0]).slice(-2).map(entry => entry.retrievedAt), [retrieved3, '2026-11-27T14:00:00.000Z']);
  const conflictedCache = JSON.parse(JSON.stringify(rejected.rows));
  assert.deepEqual(merge(conflictedCache, []), {rows: conflictedCache, conflicts: rejected.conflicts, added: 0, updated: 0});
});

test('selection freezes current view provenance and keeps imported captions out of shared outputs', async () => {
  const downloads = [], storage = new Map(), packed = [], clipboard = [];
  const listeners = {}, rootListeners = {}, elements = {};
  const root = {addEventListener: (type, fn) => { rootListeners[type] = fn; }};
  const get = id => elements[id] ??= {
    value: {'lf-project': 'project', 'lf-select-days': '30', 'lf-select-scope': 'similar', 'lf-select-sort': 'views'}[id]
  };
  const blobs = [];
  function BrowserURL(value, base) { return new URL(value, base); }
  BrowserURL.createObjectURL = blob => { blobs.push(blob); return String(blobs.length - 1); };
  BrowserURL.revokeObjectURL = () => {};
  class BrowserBlob {
    constructor(parts) { this.bytes = Buffer.concat(parts.map(part => Buffer.from(part))); }
    async text() { return this.bytes.toString('utf8'); }
  }
  const document = {
    getElementById: id => id === 'lf-selection' ? root : get(id),
    addEventListener: (type, fn) => { listeners[type] = fn; },
    createElement: () => ({click() { if (this.download) downloads.push(blobs[Number(this.href)]); }})
  };
  const now = new Date(day3);
  class BrowserDate extends Date {static now() { return now.getTime(); }}
  let runCount = 0, receiver = true;
  class MockDOMParser { parseFromString() { return { querySelectorAll() { return ['workbench-v3-core.js','workbench-v3-ui.js'].map(x=>({getAttribute:()=>x})); } }; } }
  const fetch = async url => ({url,ok:receiver,text:async()=>url.endsWith('workbench-v3-core.js')?'content-workbench.selection.v1 content-workbench:selection:v1:':url.endsWith('workbench-v3-ui.js')?'selectionKey();localStorage.getItem(request)':'fixture html'});
  const window = {LFObservations: {provenance}, LFExport: {...exporter, pack(run, meta) {
    packed.push(meta); return exporter.pack(run, meta);
  }}};
  vm.runInNewContext(fs.readFileSync(require.resolve('./lf-selection-ui.js'), 'utf8'), {
    window, document, Date: BrowserDate, URL: BrowserURL, Blob: BrowserBlob, DOMParser:MockDOMParser, AbortController, fetch, setTimeout() {}, clearTimeout() {},
    crypto: {randomUUID: () => 'run-' + (++runCount)},
    location: {origin: 'https://geben147-create.github.io'}, localStorage: {setItem: (key, val) => storage.set(key, val)},
    navigator: {clipboard: {writeText: async text => { clipboard.push(text); }}}
  });
  const publishedAt = '2026-11-25T01:00:00Z';
  const initial = Array.from({length: 7}, (_, i) => row('id' + i, {ch: 'channel', publishedAt, ...receipt(day1, retrieved1)}));
  const current = new Map(initial.map(v => [v.id, v]));
  const picker = window.LFSelectionUI({esc: String, age: () => 1, render() {}, get: id => current.get(id), filters: () => ({})});
  const click = (run, id) => listeners.click({target: {closest: () => ({dataset: {run, id}})}});
  picker.pool(initial); click('quick7');
  const replacements = [view('id0', 140, day2), view('id1', 130, day2)];
  replacements[0].observations.v.retrievedAt = retrieved2;
  for (const v of merge(initial, replacements).rows) current.set(v.id, v);
  click('freeze');
  const first = 'id0';
  current.set(first, merge([current.get(first)], [view(first, 150, day3)], {retrievedAt: retrieved3}).rows[0]);
  const fields = {'[data-proof]': {value: 'Private rights proof'}, '[data-analysis]': {checked: true},
    '[data-private]': {checked: false}, '[data-excerpt]': {value: ''}, '[data-caption]': {disabled: true}};
  const panel = {dataset: {vid: first}, querySelector: s => fields[s] ??= {}, querySelectorAll: () => []};
  const input = () => rootListeners.input({target: {closest: () => panel}});
  input();
  const body = 'ONLY-IN-AUTHORIZED-PRIVATE-SRT';
  const file = fields['[data-caption]'];
  Object.assign(file, {matches: () => true, closest: () => panel, files: [{name: 'clip.srt', size: 70,
    text: async () => '1\n00:00:00,000 --> 00:00:02,000\n' + body + '\n'}]});
  await rootListeners.change({target: file});
  click('zip');
  assert.equal(downloads.length, 0);
  fields['[data-private]'].checked = true; input();
  await click('json'); await click('hub'); await click('md'); await click('csv'); await click('copy');
  assert.equal(packed.length, 4); // JSON/HUB never call the caption packer.
  for (const metadata of packed) {
    assert.equal(Object.hasOwn(metadata[first], 'parsed'), false);
    assert.equal(Object.hasOwn(metadata[first], 'cues'), false);
  }
  const [json, markdown, csv] = await Promise.all(downloads.map(blob => blob.text()));
  for (const payload of [json, markdown, csv, clipboard[0], ...storage.values()]) assert.equal(payload.includes(body), false);
  const manifest = JSON.parse(json);
  const one = manifest.selected.find(v => v.video_id === first), two = manifest.selected.find(v => v.video_id === 'id1');
  assert.deepEqual([one.views, one.observed_at, one.retrieved_at, one.rights.evidence], [140, day2, retrieved2, null]);
  assert.deepEqual([two.views, two.observed_at, two.retrieved_at], [130, day2, null]);
  assert.deepEqual(JSON.parse(storage.get('content-workbench:selection:v1:longform:run-1')), manifest);
  click('zip');
  assert.equal(packed.at(-1)[first].cues[0].text, body);
  assert.equal(Object.hasOwn(packed.at(-1)[first], 'parsed'), false);
  assert.match(await downloads.at(-1).text(), /ONLY-IN-AUTHORIZED-PRIVATE-SRT/);
  // Revoking all rights while a second file is being read must not repopulate cues.
  let finish;
  file.files = [{name: 'replace.srt', size: 70, text: () => new Promise(resolve => { finish = resolve; })}];
  const inFlight = rootListeners.change({target: file});
  fields['[data-private]'].checked = false; fields['[data-analysis]'].checked = false; input();
  finish('1\n00:00:00,000 --> 00:00:02,000\n' + body);
  await inFlight;
  fields['[data-private]'].checked = true; input();
  click('zip');
  assert.equal(downloads.length, 4);
  receiver=false; storage.clear(); await click('hub');
  assert.equal(storage.size,0); assert.equal(downloads.length,5); const fallback=JSON.parse(await downloads.at(-1).text()); assert.equal(fallback.run_id,manifest.run_id); assert.equal(fallback.selected.length,7); assert.equal(fallback.selected[0].rights.analysis,'unknown'); assert.equal((await downloads.at(-1).text()).includes(body),false);
});
