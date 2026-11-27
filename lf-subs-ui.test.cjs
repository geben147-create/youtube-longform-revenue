'use strict';
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const load = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

function sandbox(extra = {}) {
  const ctx = { TextEncoder, TextDecoder, URL, console, Uint8Array, DataView, Uint32Array, ...extra };
  vm.createContext(ctx);
  vm.runInContext(load('lf-export.js'), ctx);
  vm.runInContext(load('lf-subs-ui.js'), ctx);
  return ctx;
}
const SRT = '1\n00:00:01,000 --> 00:00:02,500\n안녕하세요\n\n2\n00:00:03,000 --> 00:00:04,000\nhello\n';
const VTT = 'WEBVTT\n\n00:01.000 --> 00:02.000\nline\n';
const results = [];
const t = (n, f) => { try { f(); results.push(['ok', n]); } catch (e) { results.push(['FAIL', n, e]); } };
const mk = () => sandbox().LFSubsUI.createCore();
const allow = (c, id) => assert.equal(c.setRights(id, 'allowed', 'license: CC-BY https://x').ok, true);

t('rights default unknown; export refused', () => {
  const c = mk(); c.importText('a', SRT, 'srt');
  assert.equal(c.rightsOf('a').status, 'unknown');
  assert.deepEqual({ ...c.format('a', 'original', 'txt') }, { ok: false, reason: 'rights_unknown' });
  assert.equal(c.zip(['a']).ok, false);
});
t('allowed requires evidence', () => {
  const c = mk();
  assert.equal(c.setRights('a', 'allowed', '  ').reason, 'evidence_required');
  assert.equal(c.rightsOf('a').status, 'unknown');
  allow(c, 'a'); assert.equal(c.canExport('a').ok, true);
  c.setRights('a', 'denied', ''); assert.equal(c.format('a', 'original', 'txt').reason, 'rights_denied');
});
t('denied blocks', () => { const c = mk(); c.importText('a', SRT, 'srt'); c.setRights('a', 'denied'); assert.equal(c.format('a', 'original', 'srt').reason, 'rights_denied'); });
t('SRT roundtrip/VTT/JSON', () => {
  const c = mk(); c.importText('a', SRT, 'srt'); allow(c, 'a');
  assert.equal(c.format('a', 'original', 'srt').body, SRT.replace(/\n$/, '') + '\n');
  assert.match(c.format('a', 'original', 'vtt').body, /^WEBVTT\n\n00:00:01\.000 --> 00:00:02\.500\n안녕하세요/);
  const j = JSON.parse(c.format('a', 'original', 'json').body); assert.equal(j.cues.length, 2); assert.equal(j.timed, true);
  assert.equal(c.format('a', 'original', 'txt').body, '안녕하세요\nhello\n');
  assert.equal(c.format('a', 'original', 'srt').name, 'a.srt');
});
t('VTT import', () => { const c = mk(); c.importText('v', VTT, 'vtt'); allow(c, 'v'); assert.equal(c.format('v', 'original', 'srt').body.includes('00:00:01,000 --> 00:00:02,000'), true); });
t('TXT never gets fabricated timings', () => {
  const c = mk(); const r = c.importText('t', 'plain words\nsecond', 'txt'); allow(c, 't');
  assert.equal(r.timed, false); assert.equal(r.cues.length, 0);
  assert.equal(c.format('t', 'original', 'srt').reason, 'untimed_source_no_cues');
  assert.equal(c.format('t', 'original', 'vtt').reason, 'untimed_source_no_cues');
  assert.equal(c.format('t', 'original', 'txt').body, 'plain words\nsecond');
  assert.equal(JSON.parse(c.format('t', 'original', 'json').body).timed, false);
});
t('invalid timed file rejected', () => { assert.throws(() => mk().importText('a', 'garbage', 'srt'), /no valid timed cues/); });
t('original and ko tracks stay separate', () => {
  const c = mk(); c.importText('a', SRT, 'srt', 'original'); c.importText('a', '1\n00:00:01,000 --> 00:00:02,000\n안녕\n', 'srt', 'ko'); allow(c, 'a');
  assert.equal(c.format('a', 'ko', 'txt').name, 'a.ko.txt');
  assert.equal(c.format('a', 'ko', 'txt').body, '안녕\n'); assert.match(c.format('a', 'original', 'txt').body, /hello/);
  const z = c.zip(['a'], 'txt'); assert.equal(z.count, 2);
});
t('bundle import', () => {
  const c = mk(); const r = c.importBundle({ videos: { a: { original: { format: 'srt', text: SRT }, ko: { format: 'txt', text: '번역' } }, b: { original: { format: 'srt', text: 'bad' } } } });
  assert.equal(r.ok, 2); assert.equal(r.errors.length, 1); assert.equal(c.has('a', 'ko'), true);
  assert.equal(c.importBundle([{ video_id: 'z', format: 'txt', text: 'x' }]).ok, 1);
});
t('stored ZIP is valid with CRC and UTF-8', () => {
  const c = mk(); c.importText('a', SRT, 'srt'); c.importText('b', 'hello', 'txt'); allow(c, 'a'); allow(c, 'b');
  const z = c.zip(['a', 'b', 'x'], 'txt'); assert.equal(z.ok, true);
  const dv = new DataView(z.bytes.buffer, z.bytes.byteOffset, z.bytes.length);
  assert.equal(dv.getUint32(0, true), 0x04034B50); assert.equal(dv.getUint16(8, true), 0); assert.equal(dv.getUint16(6, true) & 0x800, 0x800);
  const n = dv.getUint16(26, true); const name = new TextDecoder().decode(z.bytes.slice(30, 30 + n)); assert.equal(name, 'a.txt');
  const size = dv.getUint32(18, true); const body = z.bytes.slice(30 + n, 30 + n + size);
  assert.equal(new TextDecoder().decode(body), '안녕하세요\nhello\n');
  const { crc32 } = sandbox().LFSubsUI; assert.equal(dv.getUint32(14, true), crc32(body));
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
  assert.equal(dv.getUint32(z.bytes.length - 22, true), 0x06054B50); assert.equal(dv.getUint16(z.bytes.length - 12, true), 2);
  assert.equal(JSON.stringify(z.skipped.map(s => s.reason)), '["no_transcript"]');
});
t('zip skips rights-less items, refuses when none', () => {
  const c = mk(); c.importText('a', SRT, 'srt'); c.importText('b', SRT, 'srt'); allow(c, 'a');
  const z = c.zip(['a', 'b']); assert.equal(z.count, 1); assert.equal(z.skipped[0].reason, 'rights_unknown');
  assert.equal(c.zip(['b']).reason, 'nothing_exportable');
});
t('status counters + filters', () => {
  const c = mk(); c.importText('a', SRT, 'srt'); c.importText('b', 'x', 'txt'); allow(c, 'a'); c.select('a'); c.select('b');
  const s = c.status(5, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual({ total: s.total, w: s.withTranscript, wo: s.withoutTranscript, o: s.original, ko: s.ko, timed: s.timed, ra: s.rightsAllowed, ru: s.rightsUnknown, sel: s.selected, se: s.selectedExportable, p: s.persisted },
    { total: 5, w: 2, wo: 3, o: 2, ko: 0, timed: 1, ra: 1, ru: 1, sel: 2, se: 1, p: false });
  assert.equal(c.matches('a', 'with'), true); assert.equal(c.matches('c', 'without'), true); assert.equal(c.matches('b', 'rights-unknown'), true); assert.equal(c.matches('a', 'rights-allowed'), true);
});
t('sessionStorage OFF by default, opt-in, wiped on off', () => {
  const calls = {}; const mem = new Map();
  const storage = { setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k), getItem: k => mem.get(k) ?? null };
  const c = sandbox().LFSubsUI.createCore({ storage });
  c.importText('a', SRT, 'srt'); assert.equal(mem.size, 0);
  c.persist(true); assert.equal(mem.size, 1); c.persist(false); assert.equal(mem.size, 0); void calls;
});

// ---- Mount with mock DOM ----
function mockDom() {
  const handlers = {}; const cards = [];
  const mkEl = (attrs = {}) => ({ dataset: attrs, checked: false, hidden: false, innerHTML: '', textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, insertAdjacentHTML(_, h) { this.html = (this.html || '') + h; }, querySelector() { return null; }, closest() { return null; } });
  const doc = {
    body: {}, addEventListener(t, f) { handlers[t] = f; }, removeEventListener() {}, createElement: () => mkEl(),
    getElementById: id => id === 'lf-subs' ? null : null, querySelector: () => null,
    querySelectorAll(sel) { return sel === 'article.item[data-id]' ? cards : sel === '[data-subs=sel]' ? cards.map(c => c.cb) : []; }
  };
  for (const id of ['a', 'b']) {
    const links = { html: '', querySelector() { return this.html.includes('data-subs-tools') ? {} : null; }, insertAdjacentHTML(_, h) { this.html += h; }, parentNode: null };
    const card = { dataset: { id }, links, cb: mkEl(), querySelector(s) { return s === '.cardlinks' ? links : null; }, appendChild() {} };
    cards.push(card);
  }
  return { doc, handlers, cards };
}
t('mount: buttons injected additively, delegation works, select all/clear', () => {
  const { doc, handlers, cards } = mockDom(); const downloads = [];
  const ctx = sandbox({ document: doc }); ctx.window = ctx;
  const ui = ctx.LFSubsUI.mount({ esc: s => String(s), get: id => ({ id }), render() {}, download: (n, b) => downloads.push(n) });
  assert.ok(cards[0].links.html.includes('data-subs="open"') && cards[0].links.html.includes('📋') && cards[0].links.html.includes('📊'));
  ui.decorate(); assert.equal((cards[0].links.html.match(/data-subs-tools/g) || []).length, 1);
  handlers.click({ target: { closest: () => ({ dataset: { subs: 'all' }, closest: () => null }) } });
  assert.equal(ui.picked.size, 2);
  handlers.click({ target: { closest: () => ({ dataset: { subs: 'clear' }, closest: () => null }) } });
  assert.equal(ui.picked.size, 0);
  ui.importText('a', SRT, 'srt');
  const btn = { dataset: { subs: 'dl', fmt: 'srt' }, closest: () => cards[0] };
  handlers.click({ target: { closest: () => btn } }); assert.equal(downloads.length, 0); // rights unknown: refused
  ui.setRights('a', 'allowed', 'licence note');
  handlers.click({ target: { closest: () => btn } }); assert.deepEqual(downloads, ['a.srt']);
  assert.equal(ui.filter({ id: 'a' }), true);
});
t('detail hook fires', () => {
  const { doc, handlers, cards } = mockDom(); let got = null;
  const ctx = sandbox({ document: doc }); ctx.window = ctx;
  ctx.LFSubsUI.mount({ esc: String, get: id => ({ id }), render() {}, detail: v => { got = v; } });
  handlers.click({ target: { closest: () => ({ dataset: { subs: 'detail' }, closest: () => cards[1] }) } });
  assert.equal(got.id, 'b');
});

let bad = 0;
for (const [s, n, e] of results) { console.log(s, n); if (s === 'FAIL') { bad++; console.log(e); } }
console.log(`${results.length - bad}/${results.length} passed`);
process.exit(bad ? 1 : 0);

