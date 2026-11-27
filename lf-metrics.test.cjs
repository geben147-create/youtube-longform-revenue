const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const test = require('node:test');
const metrics = require('./lf-metrics.js');
const { models, business, monthlyIncome, pilotProfit, compareNullable, quantile } = metrics;

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const sampleModel = {
  views: 100000, sector: 'ai', country: 'JP', fx: 1400, channel_id: 'own',
  period_start: '2026-10-01', period_end: '2026-10-31', views_basis: 'public', revenue_scope: 'ad',
  observed_at: '2026-11-02T00:00:00Z', retrieved_at: '2026-11-06'
};
const commonEvidence = {
  ...Object.fromEntries(['period_start', 'period_end', 'views_basis', 'revenue_scope'].map(key => [key, sampleModel[key]])),
  verified: true, evidence_url: 'https://example.com/source', format: 'longform', currency: 'KRW'
};
const ownEvidence = { ...commonEvidence, channel_id: 'own', revenue_kind: 'studio_estimate', revenue: 240000, views: 80000 };
const peerEvidence = {
  ...commonEvidence, sector: 'ai', country: 'JP', selection_rule: 'Matched format, audience, dates and subject',
  samples: [{ channel_id: 'b', rpm: 2000 }, { channel_id: 'c', rpm: 5000 }, { channel_id: 'own', rpm: 99999 }]
};
const snapshots = (values, prefix = 'v') => values.map((views, i) => ({ video_id: `${prefix}${i}`, day: 30, views }));
const constantSnapshots = (views, n = 12) => snapshots(Array(n).fill(views));
const monthRows = [1500000, 3000000, 4500000].map((amount, i) => ({ month: `2026-${String(i + 8).padStart(2, '0')}`, amount, revenue_scope: 'ad', currency: 'KRW', completed: true }));
const peerRows = [15000, 14000, 12000, 3000, 1000].map((views, i) => ({ channel_id: `c${i}`, operator_id: `o${i}`, independent: true, selected: true, snapshots: constantSnapshots(views) }));
const businessFixture = {
  asOf: '2026-11-27', startedAt: '2025-11-27', months: monthRows,
  snapshots: snapshots(Array.from({ length: 12 }, (_, i) => (i + 7) * 1000)),
  pilots: [180, 60, 120].map((minutes, i) => ({ id: `p${i}`, own: true, measured: true, minutes })),
  comparisons: peerRows, selectionRule: 'All comparable channels in frozen cohort',
  expansion: { paidTradeVerified: true, actor: 'peer', own: false }
};

test('works as CommonJS and a browser window script; reads no implicit clock', () => {
  const window = {};
  runInNewContext(readFileSync(require.resolve('./lf-metrics.js'), 'utf8'), { window });
  assert.equal(window.LFMetrics.MODEL_VERSION, metrics.MODEL_VERSION);
  assert.equal(window.LFMetrics.models({ views: 1000 }).legacy.amount, 2000);
  assert.equal(business().score, null);
  assert.deepEqual(business().missing, ['P', 'C', 'H', 'T', 'X', 'N']);
});

test('preserves published legacy low/reference/high example and precisely typed scenario metadata', () => {
  const { legacy } = models({ ...sampleModel, views: 2828415 });
  assert.deepEqual(legacy.range, [2828415, 5656830, 11313660]);
  assert.equal(legacy.amount, 5656830);
  assert.equal(legacy.grade, 'C');
  assert.equal(legacy.range_kind, 'assumption');
  assert.equal(legacy.period_start, '2026-10-01');
  assert.equal(legacy.observed_at, '2026-11-02T00:00:00Z');
  assert.equal(legacy.retrieved_at, '2026-11-06');
  assert.equal(legacy.amount_kind, 'scenario');
});

test('V2 M3 preserves all six supported sectors, never assigns finance or grant RPM, and preserves N3/P1 tables', () => {
  for (const [sector, unit] of Object.entries({ ai: 8, education: 6, tech: 5, pets: 3, drama: 2.5, music: 1.5 })) {
    const { m3 } = models({ ...sampleModel, sector });
    near(m3.amount, 100 * unit * 0.55 * 1400);
    [0.6, 1, 1.6].forEach((multiple, i) => near(m3.range[i], m3.amount * multiple));
  }
  for (const [sector, rates, m5] of [['ai', [2000, 3500, 6000], 2000], ['finance', [3000, 5500, 8000], 4000], ['grant', [2500, 4000, 7000], 2000]]) {
    const result = models({ ...sampleModel, sector });
    assert.deepEqual(result.m4.range, rates.map(unit => unit * 100));
    assert.equal(result.m5.amount, m5 * 100);
    if (sector !== 'ai') assert.equal(result.m3.status, 'not_applicable');
  }
  const { m4, m5 } = models({ ...sampleModel, sector: 'education' });
  assert.equal(m4.status, 'not_applicable');
  assert.equal(m5.amount, 500000);
  assert.equal(models({ ...sampleModel, sector: 'toString' }).m3.amount, null);
});

test('scenarios never guess FX or an English-speaking market, and view basis matters', () => {
  assert.equal(models({ ...sampleModel, country: 'EN' }).m3.amount, null);
  assert.equal(models({ ...sampleModel, fx: 0 }).m3.amount, null);
  assert.equal(models({ ...sampleModel, views_basis: 'engaged' }).legacy.amount, null);
  assert.equal(models({ ...sampleModel, revenue_scope: 'platform' }).m5.amount, null);
  assert.equal(models({ ...sampleModel, views: 0 }).m3.amount, 0);
  assert.equal(models({ ...sampleModel, views: ' ' }).m3.amount, null);
  assert.equal(models({ ...sampleModel, views: false }).m3.amount, null);
});

test('M1 needs same-channel typed source; Studio estimate and settlement stays explicit', () => {
  const { m1 } = models({ ...sampleModel, evidence: { m1: ownEvidence } });
  assert.equal(m1.rpm, 3000);
  assert.equal(m1.amount, 300000);
  assert.equal(m1.grade, 'A');
  assert.equal(m1.revenue_kind, 'studio_estimate');
  const zero = models({ ...sampleModel, evidence: { m1: { ...ownEvidence, revenue_kind: 'settlement', revenue: 0 } } }).m1;
  assert.equal(zero.amount, 0);
  assert.equal(zero.revenue_kind, 'settlement');
  for (const override of [{ verified: false }, { channel_id: 'other', same_channel: true }, { period_end: '2026-11-01' }, { views_basis: 'engaged' }, { revenue_scope: 'platform' }, { format: 'shorts' }, { evidence_url: 'javascript:foo' }, { currency: 'USD' }, { views: 0 }, { revenue_kind: 'unknown' }]) {
    const rejected = models({ ...sampleModel, evidence: { m1: { ...ownEvidence, ...override } } }).m1;
    assert.equal(rejected.grade, 'U');
    assert.equal(rejected.amount, null);
  }
  assert.equal(models({ ...sampleModel, rpm: { m1: 2000 }, evidence: { m1: true } }).m1.amount, null);
});

test('M2 uses distinct matching RPM sample median and dispersion, or an evidenced aggregate', () => {
  const model = models({ ...sampleModel, evidence: { m2: peerEvidence } }).m2;
  assert.equal(model.grade, 'B');
  assert.equal(model.sample_size, 2);
  assert.equal(model.amount, 350000);
  assert.deepEqual(model.dispersion, { min: 2000, max: 5000, p25: 2750, p75: 4250 });
  assert.equal(models({ ...sampleModel, country: 'KR', evidence: { m2: peerEvidence } }).m2.amount, null);
  const invalid = { ...peerEvidence, samples: [{ channel_id: 'a', rpm: 1000 }, { channel_id: 'a', rpm: 9000 }, { channel_id: 'b', rpm: 0 }] };
  assert.equal(models({ ...sampleModel, evidence: { m2: invalid } }).m2.amount, null);
  const aggregate = { ...peerEvidence, samples: undefined, sample_size: 3, dispersion: { min: 0, max: 8000 }, median_rpm: 0 };
  assert.equal(models({ ...sampleModel, evidence: { m2: aggregate } }).m2.amount, 0);
  assert.equal(models({ ...sampleModel, evidence: { m2: { ...aggregate, median_rpm: 9000 } } }).m2.amount, null);
});

test('monthly revenue only uses the three most recent full contiguous same-scope months', () => {
  const result = monthlyIncome({ ...businessFixture, months: [...monthRows, { month: '2026-11', amount: 99999999 }, { month: '2026-07', amount: 1 }] });
  assert.deepEqual(result.expectedMonths, ['2026-08', '2026-09', '2026-10']);
  assert.equal(result.monthlyMin, 1500000);
  assert.equal(result.monthlyAvg, 3000000);
  assert.equal(result.P, 0.5);
  assert.equal(monthlyIncome({ ...businessFixture, targetMoney: 1500000 }).P, 1);
  const months = monthRows.map((row, i) => i ? row : { ...row, amount: 0 });
  const zero = monthlyIncome({ ...businessFixture, months });
  assert.equal(zero.monthlyMin, 0);
  assert.equal(zero.P, 0);
  assert.equal(zero.sustained, false);
  for (const override of [{ amount: null }, { completed: false }, { partial: true }, { revenue_scope: 'platform' }, { currency: null }, { period_start: '2026-08-02', period_end: '2026-08-31' }]) {
    assert.equal(monthlyIncome({ ...businessFixture, months: [{ ...months[0], ...override }, ...months.slice(1)] }).P, null);
  }
  assert.equal(monthlyIncome({ ...businessFixture, startedAt: '2026-08-02' }).P, null);
  assert.equal(monthlyIncome({ ...businessFixture, months: [monthRows[0], monthRows[2]] }).P, null);
  assert.equal(monthlyIncome({ ...businessFixture, months: [...monthRows, { ...monthRows[0], amount: 0 }] }).P, null);
  assert.equal(monthlyIncome({ ...businessFixture, asOf: '2026-02-30' }).P, null);
});

test('full six-part score applies original weights without rounding and exposes denominators', () => {
  const result = business(businessFixture);
  assert.equal(result.profile_id, 'business-fit-v1');
  assert.deepEqual(result.missing, []);
  assert.equal(result.confirmed, 6);
  assert.equal(result.monthlyMin, 1500000);
  assert.equal(result.monthlyAvg, 3000000);
  assert.equal(result.median, 12500);
  assert.equal(result.p25, 9750);
  assert.equal(result.hitRate, 0.75);
  near(result.concentration, 18000 / 150000);
  near(result.components.C, 0.765);
  near(result.components.H, 2 / 3);
  assert.deepEqual([result.comparison.searched, result.comparison.n, result.comparison.K, result.comparison.unknown], [5, 5, 3, 0]);
  near(result.score, 25 * 0.5 + 25 * 0.765 + 20 * (2 / 3) + 15 * 0.6 + 10 * 0.5);
});

test('D30 score needs 12 distinct measured snapshots; duplicates and wrong-day/future/cumulative records never count', () => {
  const values = constantSnapshots(12500, 11);
  const incomplete = business({ ...businessFixture, snapshots: [...values, values[0], { video_id: 'd7', day: 7, views: 9999 }, { video_id: 'cumulative', views: 999999 }, { video_id: 'future', day: 30, views: 50, observed_at: '2026-12-01' }, { video_id: 'waiting', day: 30, views: 50, pending: true }] });
  assert.equal(incomplete.repeat.count, 11);
  assert.equal(incomplete.repeat.pending, 1);
  assert.equal(incomplete.components.C, null);
  assert.equal(incomplete.score, null);
  const zero = business({ snapshots: constantSnapshots(0) });
  assert.equal(zero.median, 0);
  assert.equal(zero.p25, 0);
  assert.equal(zero.hitRate, 0);
  assert.equal(zero.concentration, 0);
  assert.equal(zero.components.C, 0);
  assert.equal(quantile([0, 10], 0.25), 2.5);
  const conflict = business({ snapshots: [...constantSnapshots(500), { video_id: 'v0', day: 30, views: 50000, observed_at: '2026-11-01' }] });
  assert.equal(conflict.repeat.count, 11);
  assert.equal(conflict.repeat.conflicts, 1);
  assert.equal(conflict.repeat.windowEnd, null);
  const dates = business({ snapshots: [{ video_id: 'kept', day: 30, views: 0, observed_at: '2026-10-11' }, { video_id: 'x', day: 30, views: 9, observed_at: '2026-11-01', verified: false }] });
  assert.equal(dates.repeat.count, 1);
  assert.equal(dates.repeat.windowEnd, '2026-10-11');
});

test('concentration warning is strictly greater than threshold and independent of eligibility', () => {
  const result = business({ snapshots: snapshots([1000000, ...Array(11).fill(12000)]) });
  assert.equal(result.steady, true);
  assert.equal(result.concentrationWarning, true);
  assert.equal(business({ snapshots: snapshots([35, 30, 20, 15]) }).concentrationWarning, false);
});

test('work time uses three distinct own measured pilots and never imputes time from a comparator', () => {
  const [first, second, third] = businessFixture.pilots;
  assert.equal(business({ pilots: [first, first, second, { ...third, own: false }] }).components.H, null);
  assert.equal(business({ pilots: [first, second, { ...third, measured: false }] }).components.H, null);
  assert.equal(business({ pilots: [first, second, { ...third, minutes: 0 }] }).components.H, 1);
  assert.equal(business({ pilots: [first, second, third].map(p => ({ ...p, minutes: 300 })) }).components.H, 0);
});

test('comparison denominator keeps low outcomes separate from unknown and excludes double counting operators', () => {
  const extras = [
    { ...peerRows[0], channel_id: 'unknown', operator_id: 'other', independent: null },
    { ...peerRows[0], channel_id: 'short', operator_id: 'short', snapshots: constantSnapshots(10000, 11) },
    { ...peerRows[0], channel_id: 'shared', representative: false },
    { ...peerRows[0], channel_id: 'excluded', selected: false },
    { independent: true }
  ];
  const comparison = business({ ...businessFixture, comparisons: [{ ...peerRows[0], representative: true }, ...peerRows.slice(1), ...extras] }).comparison;
  assert.deepEqual([comparison.searched, comparison.n, comparison.K, comparison.unknown, comparison.excluded, comparison.failed], [10, 5, 3, 3, 2, 2]);
  assert.equal(comparison.T, 0.6);
  assert.equal(comparison.selectionRule, businessFixture.selectionRule);
  const tooFew = business({ comparisons: [...peerRows.slice(0, 4), { ...peerRows[4], independent: null }] });
  assert.equal(tooFew.comparison.n, 4);
  assert.equal(tooFew.comparison.K, 3);
  assert.equal(tooFew.components.T, null);
  const allMiss = business({ comparisons: peerRows.map(row => ({ ...row, snapshots: constantSnapshots(0) })) });
  assert.equal(allMiss.components.T, 0);
});

test('expansion distinguishes unresearched, checked ideas, confirmed related trade and own recurring trade', () => {
  const X = expansion => business({ expansion }).components.X;
  assert.equal(X({}), null);
  assert.equal(X({ productLink: 'https://example.com/shop', researched: true }), 0);
  assert.equal(X({ researched: true, paidTradeVerified: true }), null);
  assert.equal(X({ paidTradeVerified: true, actor: 'peer' }), 0.5);
  const own = { paidTradeVerified: true, actor: 'my business', own: true, completedMonths: 2, procedureVerified: true, weeklyMinutes: 120 };
  assert.equal(X(own), 1);
  assert.equal(X({ ...own, weeklyMinutes: 120.01 }), 0.5);
  assert.equal(X({ ...own, completedMonths: 1 }), 0.5);
  assert.equal(X({ ...own, procedureVerified: false }), 0.5);
});

test('content age distinguishes d < 90, age 90, age 364, and d >= 365', () => {
  const result = days => {
    const base = new Date('2026-11-27T00:00:00Z');
    base.setUTCDate(base.getUTCDate() - days);
    return business({ ...businessFixture, startedAt: base.toISOString().slice(0, 10) });
  };
  assert.equal(result(89).components.N, null);
  assert.equal(result(89).newEntry, true);
  assert.equal(result(89).score, null);
  assert.equal(result(90).components.N, 1);
  assert.equal(result(90).newEntry, false);
  near(result(364).components.N, 1 / 275);
  assert.equal(result(365).components.N, 0);
  assert.equal(result(366).components.N, 0);
  assert.equal(result(-1).d, null);
  assert.equal(business({ ...businessFixture, startedAt: undefined, joinedAt: '2019-01-01' }).components.N, null);
});

test('period profit separates own ads, platform, costs, labor, and hourly return', () => {
  const input = { period_start: '2026-10-01', period_end: '2026-10-31', own: true, approved: true, revenue_scope: 'platform', platformRevenue: 120000, externalContribution: 20000, variableCost: 30000, fixedCost: 10000, laborCost: 60000, laborAlreadyIncluded: false, directMinutes: 120, views: 50000, rpm: 2000 };
  const result = pilotProfit(input);
  assert.equal(result.cashProfit, 100000);
  assert.equal(result.laborAdjustedProfit, 40000);
  assert.equal(result.hourlyCashProfit, 50000);
  assert.equal(result.hourlyLaborAdjustedProfit, 20000);
  assert.equal(result.estimatedAdRevenue, 100000);
  assert.equal(result.estimatedCashProfit, 80000);
  assert.equal(result.breakEvenViews, 20000);
  assert.equal(pilotProfit({ ...input, laborAlreadyIncluded: true }).laborAdjustedProfit, 100000);
  assert.equal(pilotProfit({ ...input, fixedCost: null }).cashProfit, null);
  assert.equal(pilotProfit({ ...input, externalContribution: -250000 }).cashProfit, -170000);
  assert.equal(pilotProfit({ ...input, directMinutes: 0 }).hourlyCashProfit, null);
  assert.equal(pilotProfit({ ...input, period_end: null }).cashProfit, null);
  const preApproval = pilotProfit({ ...input, approved: false, revenue_scope: 'ad', platformRevenue: null });
  assert.equal(preApproval.adRevenue, 0);
  assert.equal(preApproval.estimatedAdRevenue, 0);
  assert.equal(preApproval.cashProfit, -20000);
  assert.equal(preApproval.breakEvenViews, null);
  assert.equal(pilotProfit({ ...input, approved: false, platformRevenue: null }).cashProfit, null);
  assert.equal(pilotProfit({ ...input, own: false, approved: false }).adRevenue, null);
});

test('numeric sorting always places null/invalid last and preserves real zero and negative profit', () => {
  const values = [100.02, null, -3, 0, '', 100.01];
  assert.deepEqual([...values].sort((a, b) => compareNullable(a, b, 'desc')), [100.02, 100.01, 0, -3, null, '']);
  assert.deepEqual([...values].sort((a, b) => compareNullable(a, b, 'asc')), [-3, 0, 100.01, 100.02, null, '']);
});