'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const {merge} = require('./lf-observations.js');

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
  assert.deepEqual(Object.keys(require('./lf-observations.js')), ['merge']);
  const code = fs.readFileSync(require.resolve('./lf-observations.js'), 'utf8');
  const browser = {};
  vm.runInNewContext(code, browser);
  assert.equal(typeof browser.LFObservations.merge, 'function');
  let amd;
  const define = (_deps, factory) => { amd = factory(); };
  define.amd = true;
  vm.runInNewContext(code, {define});
  assert.equal(typeof amd.merge, 'function');
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
