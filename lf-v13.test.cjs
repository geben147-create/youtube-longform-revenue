'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, 'lf-v13-ui.js'), 'utf8');
const store = {}, els = { rpm: { value: '2' } };
const ctx = { window: {}, document: { querySelector: () => null, getElementById: id => els[id] || null, addEventListener() {}, documentElement: { classList: { toggle() {}, contains: () => false } } }, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, key: () => null, length: 0 }, location: { href: 'https://x.test/index.html', origin: 'https://x.test' }, history: { replaceState() {} }, URL, Date, Math, JSON, Number, String, Object, Array, Map, Set, RegExp, Event: class {}, MutationObserver: class { observe() {} }, setTimeout: f => 0, clearTimeout() {}, requestAnimationFrame() {}, fetch: () => Promise.reject(new Error('x')), console, addEventListener() {} };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const P = ctx.LFV13UI.parseNum;
let n = 0; const t = (name, f) => { f(); n++; console.log('pass', name); };
t('empty is null', () => { assert.strictEqual(P(''), null); assert.strictEqual(P('  '), null); });
t('zero is real zero', () => assert.strictEqual(P('0'), 0));
t('man/eok', () => { assert.strictEqual(P('1만'), 10000); assert.strictEqual(P('3만'), 30000); assert.strictEqual(P('3억 5850만'), 358500000); assert.strictEqual(P('100만 원'), 1000000); });
t('K/M/comma', () => { assert.strictEqual(P('10K'), 10000); assert.strictEqual(P('3.5M'), 3500000); assert.strictEqual(P('1,234,567'), 1234567); });
t('percent', () => assert.strictEqual(P('30%'), 0.3));
t('garbage is NaN', () => assert.ok(Number.isNaN(P('abc'))));
// range filter with stub data
const vids = [{ id: 'a', ch: 'A', v: 15000, d: '2026-11-01' }, { id: 'b', ch: 'B', v: 50000, d: '2026-11-01' }, { id: 'c', ch: 'C', v: 0, d: '2026-11-01' }, { id: 'd', ch: 'D', v: null, d: '2026-11-01' }];
ctx.LFData = { all: () => vids, get: id => vids.find(v => v.id === id) };
const setRows = rows => { store['lf-v13:range:v1'] = JSON.stringify(rows); };
// re-run module to read new storage
const run = () => { const c2 = { ...ctx, window: null }; c2.window = c2; c2.LFData = ctx.LFData; vm.createContext(c2); vm.runInContext(src, c2); return c2; };
t('views 1만~3만', () => { setRows({ views: { min: '1만', max: '3만' } }); const c = run(); assert.deepStrictEqual(vids.filter(v => c.LFRange.ok(v)).map(v => v.id), ['a']); });
t('min only 0 keeps zero, excludes unknown', () => { setRows({ views: { min: '0', max: '' } }); const c = run(); assert.deepStrictEqual(vids.filter(v => c.LFRange.ok(v)).map(v => v.id), ['a', 'b', 'c']); });
t('min > max not applied', () => { setRows({ views: { min: '5만', max: '1만' } }); const c = run(); assert.strictEqual(vids.filter(v => c.LFRange.ok(v)).length, 4); });
t('sort unknown last both directions', () => { store['lf-v13:sort:v1'] = JSON.stringify({ key: 'views', dir: 'asc' }); setRows({}); let c = run(); let s = vids.slice().sort(c.LFSort.cmp).map(v => v.id); assert.deepStrictEqual(s, ['c', 'a', 'b', 'd']); store['lf-v13:sort:v1'] = JSON.stringify({ key: 'views', dir: 'desc' }); c = run(); s = vids.slice().sort(c.LFSort.cmp).map(v => v.id); assert.deepStrictEqual(s, ['b', 'a', 'c', 'd']); });
console.log(n + ' tests passed');
