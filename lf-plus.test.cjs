'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const core = require('./lf-metrics.js'), plus = require('./lf-plus.js');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('country disclosure matches unchanged models: only M3 multiplies; IN is visibly unsupported', () => {
  const m = core.models({ views: 2828415, sector: 'drama', country: 'KR', fx: 1400 });
  const d = Object.fromEntries(plus.allCountryDisclosures('KR').map(x => [x.model_id, x]));
  assert.equal(d.m3.status, 'applied'); assert.equal(d.m3.coefficient, 0.4);
  assert.deepEqual(['legacy', 'm1', 'm4', 'm5'].map(k => d[k].status), Array(4).fill('not_used'));
  assert.equal(d.m2.status, 'filter_only');
  assert.equal(plus.countryDisclosure('m3', 'IN').status, 'missing_supported_country');
  assert.deepEqual(plus.countryDisclosure('m3', 'IN').unsupportedKnown, ['IN']);
  // Example 1: M3 = views/1000 * 2.5 USD * 0.4 * 1400 * [0.6, 1, 1.6]
  [0.6, 1, 1.6].forEach((x, i) => near(m.m3.range[i], 2828415 / 1000 * 2.5 * 0.4 * 1400 * x));
  assert.deepEqual(m.legacy.range, [2828415, 5656830, 11313660]);
});

test('child conservative scenario scales a copy and never changes base ranges', () => {
  const base = core.models({ views: 2828415 }).legacy.range, copy = base.slice();
  const c = plus.childConservative(base);
  assert.deepEqual(base, copy); assert.equal(c.official, false);
  assert.deepEqual(c.scenarios.map(x => x.retention), [1, 0.7, 0.5, 0.3]);
  assert.deepEqual(c.scenarios[0].range, copy); // Example 2: 100% equals the existing range.
  near(c.scenarios[1].range[1], 5656830 * 0.7);
  assert.deepEqual(plus.childConservative(null).scenarios, []);
});

test('mixed countries compose unchanged M3 and do not guess unsupported weights', () => {
  const mixed = plus.mixCountries({ views: 1000000, sector: 'ai', fx: 1400, weights: { KR: 50, US: 50 } });
  assert.equal(mixed.available, true); near(mixed.mixed_country_coefficient, 0.7);
  [0.6, 1, 1.6].forEach((x, i) => near(mixed.range[i], 1000 * 8 * 0.7 * 1400 * x)); // Example 3.
  assert.equal(plus.mixCountries({ views: 1, sector: 'ai', fx: 1400, weights: { IN: 20, KR: 80 } }).reason, 'unsupported_country_weight');
  assert.equal(plus.mixCountries({ views: 1, sector: 'ai', fx: 1400, weights: {} }).reason, 'missing_weights');
  assert.equal(plus.mixCountries({ views: 1, sector: 'finance', fx: 1400, weights: { KR: 100 } }).reason, 'unsupported_sector');
});

test('subscriber helpers remain auxiliary and keep unknown null', () => {
  const a = plus.subscriberAux({ views: 100000, subscribers: 10000, recentViews: [20000, 20000, 30000, 100000] });
  assert.equal(a.viewsPerSubscriber, 10); assert.equal(a.recentMedianViews, 25000); near(a.topShare, 100000 / 170000); assert.equal(a.smallSample, true);
  assert.equal(plus.subscriberAux({ views: 10 }).viewsPerSubscriber, null);
  assert.equal(plus.subscriberAux({ views: 10, subscribers: 0 }).viewsPerSubscriber, null);
});

test('evidence audit holds only the unsupported score and leaves documented inputs intact', () => {
  const month = key => ({ month: key, amount: 4000000, currency: 'KRW', revenue_scope: 'ad', completed: true, source: 'https://example.com/report/' + key });
  const base = { asOf: '2026-11-27', startedAt: '2025-01-01', viewsGoal: 10000, minSample: 12, months: ['2026-08', '2026-09', '2026-10'].map(month),
    snapshots: Array.from({ length: 12 }, (_, i) => ({ video_id: 'v' + i, day: 30, views: 20000, observed_at: '2026-11-01T00:00:00Z', verified: true })),
    pilots: [1, 2, 3].map(i => ({ id: 'p' + i, own: true, measured: true, minutes: 60, source: 'https://example.com/p' + i })),
    comparisons: [], expansion: { paidTradeVerified: true, actor: 'me', source: 'https://example.com/x' } };
  const audit = plus.auditBusiness(base);
  assert.equal(audit.components.months.ok, true); assert.equal(audit.components.snapshots.ok, true);
  const unsupported = plus.auditBusiness({ ...base, months: base.months.map(({ source, ...x }) => x) });
  assert.equal(unsupported.status, 'evidence_insufficient'); assert.deepEqual(unsupported.missing, ['months']);
  const business = core.business(base);
  assert.deepEqual(core.business({ ...base }).components, business.components); // formula untouched
  assert.equal(plus.guardedScore({ score: 91 }, { ok: false }).value, null);
  assert.equal(plus.guardedScore({ score: 91 }, { ok: false }).raw, 91);
  assert.equal(plus.guardedScore({ score: 91 }, { ok: true }).value, 91);
  assert.equal(plus.guardedScore({ score: null }, { ok: true }).status, 'incomplete');
});
