/* LONGFORM Stage 3. No DOM, network, storage, locale, or implicit clock. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LFMetrics = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const MODEL_VERSION = 'longform-master-v3';
  const PROFILE_ID = 'business-fit-v1';
  const DAY = 86400000;
  const WEIGHTS = Object.freeze({ P: 25, C: 25, H: 20, T: 15, X: 10, N: 5 });
  const M3_USD = { ai: 8, education: 6, tech: 5, pets: 3, drama: 2.5, music: 1.5 };
  const COUNTRY = { KR: 0.4, JP: 0.55, US: 1 };
  const M4_KRW = { ai: [2000, 3500, 6000], finance: [3000, 5500, 8000], grant: [2500, 4000, 7000] };
  const M5_KRW = { education: 5000, finance: 4000 };
  const LEGACY_KRW = [1000, 2000, 4000];
  const VIEW_BASES = ['public', 'engaged', 'eligible_engaged'];
  const SCOPES = {
    ad: 'ad', ads: 'ad', advertising: 'ad', ad_revenue: 'ad',
    platform: 'platform', platform_revenue: 'platform', youtube_total: 'platform',
    external: 'external', external_revenue: 'external',
    total: 'total', total_revenue: 'total'
  };
  const list = value => Array.isArray(value) ? value : [];
  const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
  const finite = value => Number.isFinite(value) ? value : null;
  const pick = (object, key) => Object.hasOwn(object, key) ? object[key] : undefined;
  const clip = value => Math.min(1, Math.max(0, value));
  const scopeOf = value => pick(SCOPES, text(value)?.toLowerCase()) ?? null;
  const basisOf = value => VIEW_BASES.includes(value) ? value : null;
  const money = value => number(value, 0);
  const positive = value => { const n = money(value); return n > 0 ? n : null; };
  const ratio = (value, fallback) => number(value, 0, 1) ?? fallback;
  const mean = values => values.length ? finite(values.reduce((sum, n) => sum + n / values.length, 0)) : null;

  function number(value, min = -Infinity, max = Infinity) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return null;
      value = Number(normalized);
    }
    return Number.isFinite(value) && value >= min && value <= max ? (value === 0 ? 0 : value) : null;
  }

  function dateOnly(value) {
    const s = text(value);
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s) || s.startsWith('0000-')) return null;
    const ms = Date.parse(`${s}T00:00:00Z`);
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s ? s : null;
  }

  function stamp(value) {
    const s = text(value);
    if (!s || !dateOnly(s.slice(0, 10))) return null;
    return s.length === 10 || (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s))) ? s : null;
  }

  function period(input) {
    const start = dateOnly(input.period_start);
    const end = dateOnly(input.period_end);
    return start && end && start <= end ? [start, end] : null;
  }

  function sourceUrl(value) {
    try {
      const src = text(value);
      if (src && /^https?:\/\//i.test(src) && new URL(src).hostname) return src;
    } catch { /* Invalid source stays unknown. */ }
    return null;
  }

  function quantile(values, p) {
    if (!Array.isArray(values) || !values.length || !Number.isFinite(p) || p < 0 || p > 1 || values.some(value => !Number.isFinite(value))) return null;
    const ordered = values.slice().sort((a, b) => a - b);
    const i = (ordered.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return finite(ordered[lo] * (1 - (i - lo)) + ordered[hi] * (i - lo));
  }

  function sameMeasurement(evidence, input, targetPeriod) {
    if (!targetPeriod || !basisOf(input.views_basis) || !scopeOf(input.revenue_scope)) return false;
    const measuredPeriod = period(evidence);
    return measuredPeriod != null && measuredPeriod.every((date, i) => date === targetPeriod[i]) &&
      evidence.format === 'longform' && basisOf(evidence.views_basis) === input.views_basis &&
      scopeOf(evidence.revenue_scope) === scopeOf(input.revenue_scope) && String(evidence.currency).toUpperCase() === 'KRW';
  }

  function measuredRpm(evidence) {
    const declared = money(evidence.rpm);
    const rawRevenue = money(evidence.revenue);
    const rawViews = positive(evidence.views);
    if (evidence.revenue != null || evidence.views != null) {
      if (rawRevenue === null || rawViews === null) return null;
      return finite(rawRevenue / rawViews * 1000);
    }
    return declared;
  }

  function models(input = {}) {
    const views = money(input.views);
    const sector = text(input.sector)?.toLowerCase() ?? null;
    const country = text(input.country)?.toUpperCase() ?? null;
    const fx = positive(input.fx);
    const targetPeriod = period(input);
    const basis = basisOf(input.views_basis);
    const scope = scopeOf(input.revenue_scope);
    const base = {
      currency: 'KRW', period_start: targetPeriod?.[0] ?? null, period_end: targetPeriod?.[1] ?? null,
      views_basis: basis, revenue_scope: scope, format: 'longform', model_version: MODEL_VERSION,
      country_assumption: null, fx_assumption: null, evidence_url: null,
      observed_at: stamp(input.observed_at), retrieved_at: stamp(input.retrieved_at)
    };
    function result(id, name, grade, rates, info = {}, reason = null) {
      const rpm = rates?.[rates.length === 3 ? 1 : 0] ?? null;
      const amounts = views !== null && rates ? rates.map(rate => finite(views / 1000 * rate)) : null;
      const available = amounts != null && amounts.every(amount => amount !== null);
      const isUnsupported = reason === 'unsupported_sector' || reason === 'unsupported_views_basis' || reason === 'unsupported_revenue_scope';
      return {
        ...base, ...info, model_id: id, name, amount: available ? amounts[amounts.length === 3 ? 1 : 0] : null,
        range: available && amounts.length === 3 ? amounts : null,
        range_kind: rates?.length === 3 ? 'assumption' : null,
        rpm, rpm_range: rates?.length === 3 ? rates.slice() : null,
        grade: available ? grade : 'U', status: available ? (grade === 'C' ? 'scenario' : 'measured_rpm') : isUnsupported ? 'not_applicable' : 'unknown',
        reason: available ? null : reason ?? (views === null ? 'missing_views' : 'invalid_amount')
      };
    }
    const first = input.evidence?.m1 ?? {};
    const firstRef = sourceUrl(first.evidence_url);
    const kind = ['studio_estimate', 'settlement'].includes(first.revenue_kind) ? first.revenue_kind : null;
    const channel = text(input.channel_id);
    const sourceChannel = text(first.channel_id);
    const sameChannel = channel && sourceChannel ? channel === sourceChannel : first.same_channel === true;
    const declaredFirst = money(input.rpm?.m1);
    const ownRate = first.verified === true && firstRef && kind && sameChannel && sameMeasurement(first, input, targetPeriod)
      ? measuredRpm(first) ?? ((first.revenue == null && first.views == null && first.rpm == null) ? declaredFirst : null) : null;
    const m1 = result('m1', 'Same-channel measured RPM', 'A', ownRate === null ? null : [ownRate],
      { evidence_url: firstRef, revenue_kind: kind, amount_kind: 'measured_rpm_application' }, ownRate === null ? 'missing_same_channel_evidence' : null);

    const second = input.evidence?.m2 ?? {};
    const secondRef = sourceUrl(second.evidence_url);
    const rule = text(second.selection_rule);
    let sampleSize = null, spread = null, peerRate = null;
    if (second.verified === true && secondRef && rule && sector && pick(COUNTRY, country) != null &&
        sameMeasurement(second, input, targetPeriod) && second.sector === sector && second.country === country) {
      if (Array.isArray(second.samples)) {
        const rates = new Map();
        const conflicts = new Set();
        for (const sample of second.samples) {
          if (!sample || sample.verified === false || (sample.sector != null && sample.sector !== sector) || (sample.country != null && sample.country !== country) ||
              !sameMeasurement({ ...second, ...sample }, input, targetPeriod)) continue;
          const id = text(sample.channel_id);
          const measured = measuredRpm(sample);
          if (!id || id === channel || measured === null || conflicts.has(id)) continue;
          if (rates.has(id) && rates.get(id) !== measured) { rates.delete(id); conflicts.add(id); }
          else rates.set(id, measured);
        }
        const values = [...rates.values()];
        sampleSize = values.length;
        if (sampleSize >= 2) {
          peerRate = quantile(values, 0.5);
          spread = { min: Math.min(...values), max: Math.max(...values), p25: quantile(values, 0.25), p75: quantile(values, 0.75) };
        }
      } else {
        const n = money(second.sample_size);
        const min = money(second.dispersion?.min), max = money(second.dispersion?.max);
        const median = money(second.median_rpm ?? second.rpm ?? input.rpm?.m2);
        if (Number.isSafeInteger(n) && n >= 2 && min !== null && max !== null && median !== null && min <= median && median <= max) {
          sampleSize = n; spread = { min, max }; peerRate = median;
        }
      }
    }
    const m2 = result('m2', 'Comparable-channel measured RPM median', 'B', peerRate === null ? null : [peerRate], {
      evidence_url: secondRef, sample_size: sampleSize, dispersion: spread, selection_rule: rule,
      comparison_country: country, comparison_sector: sector, amount_kind: 'measured_rpm_application'
    }, peerRate === null ? 'missing_comparable_evidence' : null);

    // Longform baselines assume public views and an ad-revenue scenario, never observed income.
    const scenarioInfo = { views_basis: 'public', revenue_scope: 'ad', amount_kind: 'scenario' };
    const scenarioMismatch = input.views_basis != null && basis !== 'public' ? 'unsupported_views_basis'
      : input.revenue_scope != null && scope !== 'ad' ? 'unsupported_revenue_scope' : null;
    function scenario(id, name, rates, extras, reason = null) {
      return result(id, name, 'C', scenarioMismatch ? null : rates, { ...scenarioInfo, ...extras }, reason ?? scenarioMismatch);
    }
    const m3USD = pick(M3_USD, sector);
    const coefficient = pick(COUNTRY, country);
    const localRpm = m3USD != null && coefficient != null && fx != null ? finite(m3USD * coefficient * fx) : null;
    const m3Rates = localRpm != null ? [0.6, 1, 1.6].map(multiple => finite(localRpm * multiple)) : null;
    const m3 = scenario('m3', 'vidIQ scenario', m3Rates?.every(rate => rate !== null) ? m3Rates : null,
      { country_assumption: coefficient != null ? country : null, country_coefficient: coefficient ?? null, fx_assumption: fx, sector_usd_rpm: m3USD ?? null, format_coefficient: 1 },
      m3USD == null ? 'unsupported_sector' : coefficient == null ? 'missing_supported_country' : fx == null ? 'missing_fx' : null);
    const n3 = pick(M4_KRW, sector);
    const m4 = scenario('m4', 'N3 longform scenario', n3, {}, n3 == null ? 'unsupported_sector' : null);
    const m5 = scenario('m5', 'P1 longform fixed RPM', [pick(M5_KRW, sector) ?? 2000], {});
    const legacy = scenario('legacy', 'Longform legacy scenarios', LEGACY_KRW, {});
    return { m1, m2, m3, m4, m5, legacy };
  }

  function monthOffset(month, delta) {
    const yyyy = Number(month.slice(0, 4)), mm = Number(month.slice(5, 7));
    const index = yyyy * 12 + mm - 1 + delta;
    return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
  }

  // Supply an explicit asOf date in the reporting calendar. The current month never qualifies.
  function monthlyIncome(input = {}) {
    const asOf = dateOnly(input.asOf);
    const target = positive(input.targetMoney ?? input.target_money) ?? 3000000;
    const month = asOf?.slice(0, 7);
    const expected = month ? [-3, -2, -1].map(delta => monthOffset(month, delta)) : [];
    const started = dateOnly(input.startedAt ?? input.started_at);
    const rows = list(input.months);
    const wantScope = scopeOf(input.revenue_scope);
    const normalized = expected.map(key => {
      const start = `${key}-01`;
      const end = new Date(Date.parse(`${monthOffset(key, 1)}-01T00:00:00Z`) - DAY).toISOString().slice(0, 10);
      const candidates = rows.filter(row => row && (row.month ?? text(row.period_start)?.slice(0, 7)) === key && (!wantScope || scopeOf(row.revenue_scope) === wantScope));
      if (started && started > start) return { month: key, amount: null, reason: 'incomplete_first_month' };
      if (candidates.length !== 1) return { month: key, amount: null, reason: candidates.length ? 'ambiguous_month' : 'missing_month' };
      const row = candidates[0];
      const revenueScope = scopeOf(row.revenue_scope);
      const amount = money(row.amount);
      const currency = text(row.currency)?.toUpperCase();
      const hasBoundaries = row.period_start != null || row.period_end != null;
      const full = hasBoundaries ? dateOnly(row.period_start) === start && dateOnly(row.period_end) === end : row.completed === true;
      const reason = row.completed === false || row.partial === true || !full ? 'incomplete_month'
        : !revenueScope || currency !== 'KRW' || amount === null || row.verified === false ? 'untyped_or_missing_revenue' : null;
      return { month: key, amount: reason ? null : amount, reason, revenue_scope: revenueScope, revenue_kind: text(row.revenue_kind), currency: currency ?? null };
    });
    const allMonths = normalized.length === 3 && normalized.every(row => row.amount !== null);
    const sameScope = allMonths && normalized.every(row => row.revenue_scope === normalized[0].revenue_scope);
    const values = sameScope ? normalized.map(row => row.amount) : [];
    const monthlyMin = values.length ? Math.min(...values) : null;
    return {
      monthlyMin, monthlyAvg: mean(values), monthlyTarget: target,
      P: monthlyMin === null ? null : clip(monthlyMin / target), sustained: monthlyMin === null ? null : monthlyMin > 0,
      months: normalized, expectedMonths: expected, revenue_scope: sameScope ? normalized[0].revenue_scope : null,
      reason: !asOf ? 'missing_as_of' : !allMonths ? 'missing_completed_months' : !sameScope ? 'mixed_revenue_scope' : null
    };
  }

  function consistency(samples, settings) {
    const record = new Map(), conflicts = new Set();
    let missing = 0, pending = 0, duplicates = 0;
    let windowStart = null, windowEnd = null;
    for (const sample of list(samples)) {
      if (!sample) { missing++; continue; }
      if (sample.pending === true) { pending++; continue; }
      const id = text(sample.video_id ?? sample.id);
      const day = number(sample.day ?? sample.age_days);
      const views = money(sample.views);
      const observed = stamp(sample.observed_at);
      if (!id || day !== 30 || views === null || sample.missing === true || sample.verified === false || (sample.format != null && sample.format !== 'longform') ||
          (sample.views_basis != null && sample.views_basis !== settings.viewsBasis) ||
          (settings.asOf && observed && observed.slice(0, 10) > settings.asOf)) { missing++; continue; }
      const observedDate = observed?.slice(0, 10) ?? null;
      if (record.has(id) || conflicts.has(id)) {
        duplicates++;
        if (record.has(id) && record.get(id).views !== views) { record.delete(id); conflicts.add(id); }
        else if (record.has(id) && !record.get(id).observedDate && observedDate) record.set(id, { views, observedDate });
      } else record.set(id, { views, observedDate });
    }
    const values = [];
    for (const { views, observedDate } of record.values()) {
      values.push(views);
      if (observedDate && (!windowStart || observedDate < windowStart)) windowStart = observedDate;
      if (observedDate && (!windowEnd || observedDate > windowEnd)) windowEnd = observedDate;
    }
    const count = values.length;
    const median = quantile(values, 0.5), p25 = quantile(values, 0.25);
    const hitRate = count ? values.filter(value => value >= settings.viewsGoal).length / count : null;
    const q25Ratio = median === null ? null : median === 0 ? 0 : p25 / median;
    const high = values.reduce((max, value) => Math.max(max, value), 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    const concentration = !count ? null : !high ? 0 : Number.isFinite(total) ? high / total
      : 1 / values.reduce((sum, value) => sum + value / high, 0);
    const eligible = count >= (settings.minSample??12);
    return {
      C: eligible ? 0.5 * clip(q25Ratio) + 0.5 * hitRate : null,
      median, p25, hitRate, q25Ratio, concentration,
      concentrationWarning: concentration === null ? null : concentration > settings.concentrationThreshold,
      steady: eligible ? hitRate >= settings.hitThreshold && q25Ratio >= settings.q25Threshold : null,
      count, missing, pending, duplicates, conflicts: conflicts.size, eligible, day: 30, goal: settings.viewsGoal,
      windowStart, windowEnd, views_basis: settings.viewsBasis
    };
  }

  function pilotTime(rows) {
    const times = new Map(), conflicts = new Set();
    for (const pilot of list(rows)) {
      if (!pilot || pilot.own !== true || pilot.measured !== true || pilot.completed === false) continue;
      const id = text(pilot.id ?? pilot.video_id);
      const minutes = money(pilot.minutes ?? pilot.direct_minutes);
      if (!id || minutes === null || conflicts.has(id)) continue;
      if (times.has(id) && times.get(id) !== minutes) { times.delete(id); conflicts.add(id); }
      else times.set(id, minutes);
    }
    const count = times.size;
    const medianMinutes = count >= 3 ? quantile([...times.values()], 0.5) : null;
    return { count, medianMinutes, H: medianMinutes === null ? null : clip((240 - medianMinutes) / 180) };
  }

  function comparisons(rows, settings) {
    const byChannel = new Map(), byOperator = new Map();
    let anonymous = 0, excluded = 0, unknown = 0;
    for (const row of list(rows)) {
      const id = text(row?.channel_id);
      if (!id) { anonymous++; continue; }
      if (!byChannel.has(id)) byChannel.set(id, []);
      byChannel.get(id).push(row);
    }
    for (const records of byChannel.values()) {
      if (records.every(row => row.selected === false || row.independent === false)) { excluded++; continue; }
      if (records.length !== 1) { unknown++; continue; }
      const row = records[0];
      const operator = text(row.operator_id);
      if (row.selected !== true || row.independent !== true || !operator) { unknown++; continue; }
      if (!byOperator.has(operator)) byOperator.set(operator, []);
      byOperator.get(operator).push(row);
    }
    let n = 0, K = 0, sharedOperator = 0;
    for (const group of byOperator.values()) {
      const designated = group.filter(row => row.representative === true);
      // Keep one preassigned representative or mark duplicates unresolved. Do not choose after seeing outcomes.
      if (group.length > 1 && designated.length !== 1) { sharedOperator += group.length; unknown += group.length; continue; }
      const row = group.length === 1 ? group[0] : designated[0];
      if (group.length > 1) { sharedOperator += group.length - 1; excluded += group.length - 1; }
      const stat = consistency(row.snapshots, settings);
      if (!stat.eligible) { unknown++; continue; }
      n++;
      if (stat.steady) K++;
    }
    const searched = byChannel.size + anonymous;
    return { searched, n, K, unknown: unknown + anonymous, excluded, sharedOperator,
      failed: n - K, proportion: n ? K / n : null, T: n >= 5 ? K / n : null,
      minimum: 5, selectionRule: text(settings.selectionRule) };
  }

  function expansionScore(data = {}) {
    const actor = text(data?.actor);
    const completedMonths = money(data?.completedMonths);
    const weeklyMinutes = money(data?.weeklyMinutes);
    let X = null;
    if (data?.paidTradeVerified === true && actor) {
      X = data.own === true && Number.isSafeInteger(completedMonths) && completedMonths >= 2 &&
        data.procedureVerified === true && weeklyMinutes !== null && weeklyMinutes <= 120 ? 1 : 0.5;
    } else if (data?.researched === true && data.paidTradeVerified !== true) X = 0;
    return { X, actor, completedMonths, weeklyMinutes };
  }

  // All revenue and cost inputs must describe one reporting period. Unknown expense is not free.
  function pilotProfit(input = {}) {
    const startEnd = period(input);
    const rawPlatform = money(input.platformRevenue);
    const externalContribution = number(input.externalContribution);
    const variableCost = money(input.variableCost), fixedCost = money(input.fixedCost);
    const directMinutes = money(input.directMinutes), laborCost = money(input.laborCost);
    const preApproval = input.own === true && (input.monetizationStatus === 'unapproved' || input.approved === false);
    const adOnly = scopeOf(input.revenue_scope) === 'ad';
    const adRevenue = preApproval ? 0 : money(input.adRevenue ?? (adOnly ? input.platformRevenue : null));
    const platformRevenue = preApproval && adOnly ? 0 : rawPlatform;
    const compatiblePeriod = startEnd != null && input.periodMatched !== false && (input.currency == null || text(input.currency)?.toUpperCase() === 'KRW');
    const missing = [];
    const inputs = { platformRevenue, externalContribution, variableCost, fixedCost };
    if (!compatiblePeriod) missing.push('period');
    for (const [key, value] of Object.entries(inputs)) if (value === null) missing.push(key);
    const cashProfit = missing.length ? null : finite(platformRevenue + externalContribution - variableCost - fixedCost);
    const laborAdjustedProfit = cashProfit === null ? null : input.laborAlreadyIncluded === true ? cashProfit
      : input.laborAlreadyIncluded === false && laborCost !== null ? finite(cashProfit - laborCost) : null;
    const hourlyCashProfit = cashProfit !== null && directMinutes > 0 ? finite(cashProfit / directMinutes * 60) : null;
    const hourlyLaborAdjustedProfit = laborAdjustedProfit !== null && directMinutes > 0 ? finite(laborAdjustedProfit / directMinutes * 60) : null;
    const rpm = money(input.rpm), views = money(input.views);
    const estimatedAdRevenue = !compatiblePeriod ? null : preApproval ? 0
      : input.own === true && (input.monetizationStatus === 'approved' || input.approved === true) && rpm !== null && views !== null
        ? finite(views / 1000 * rpm) : null;
    const productionCost = variableCost !== null && fixedCost !== null ? finite(variableCost + fixedCost) : null;
    const estimatedCashProfit = estimatedAdRevenue !== null && externalContribution !== null && productionCost !== null
      ? finite(estimatedAdRevenue + externalContribution - productionCost) : null;
    const breakEvenViews = !compatiblePeriod || productionCost === null ? null : productionCost === 0 ? 0
      : input.own === true && !preApproval && (input.monetizationStatus === 'approved' || input.approved === true) && rpm > 0
        ? finite(Math.ceil(productionCost * 1000 / rpm)) : null;
    return { currency: 'KRW', revenue_scope: scopeOf(input.revenue_scope), period_start: startEnd?.[0] ?? null, period_end: startEnd?.[1] ?? null,
      ...inputs, adRevenue, estimatedAdRevenue, estimatedCashProfit, cashProfit, laborAdjustedProfit, hourlyCashProfit, hourlyLaborAdjustedProfit,
      hourlyProfit: hourlyCashProfit, productionCost, breakEvenViews, laborCost, directMinutes, missing };
  }

  function business(input = {}) {
    const asOf = dateOnly(input.asOf);
    const startedAt = dateOnly(input.startedAt ?? input.started_at);
    const age = asOf && startedAt ? (Date.parse(asOf) - Date.parse(startedAt)) / DAY : null;
    const d = age !== null && age >= 0 ? age : null;
    const N = d === null || d < 90 ? null : d >= 365 ? 0 : clip((365 - d) / 275);
    const cfg = input.settings ?? {};
    const settings = {
      asOf, minSample: Math.max(12,Math.floor(positive(input.minSample ?? cfg.minSample)??12)), viewsGoal: positive(input.viewsGoal ?? cfg.viewsGoal) ?? 10000,
      viewsBasis: basisOf(input.views_basis ?? cfg.views_basis) ?? 'public',
      hitThreshold: ratio(input.hitThreshold ?? cfg.hitThreshold, 0.7),
      q25Threshold: ratio(input.q25Threshold ?? cfg.q25Threshold, 0.5),
      concentrationThreshold: ratio(input.concentrationThreshold ?? cfg.concentrationThreshold, 0.35),
      selectionRule: input.selectionRule ?? cfg.selectionRule
    };
    const monthly = monthlyIncome({ ...input, targetMoney: input.targetMoney ?? cfg.targetMoney });
    const repeat = consistency(input.snapshots, settings);
    const pilot = pilotTime(input.pilots);
    const comparison = comparisons(input.comparisons, settings);
    const expansion = expansionScore(input.expansion);
    const components = { P: monthly.P, C: repeat.C, H: pilot.H, T: comparison.T, X: expansion.X, N };
    const missing = Object.keys(WEIGHTS).filter(key => components[key] === null);
    const points = Object.fromEntries(Object.keys(WEIGHTS).map(key => [key, components[key] === null ? null : components[key] * WEIGHTS[key]]));
    const score = missing.length ? null : Object.values(points).reduce((sum, pointsValue) => sum + pointsValue, 0);
    return {
      profile_id: PROFILE_ID, score, components, points, missing, confirmed: 6 - missing.length,
      monthlyMin: monthly.monthlyMin, monthlyAvg: monthly.monthlyAvg, median: repeat.median, p25: repeat.p25,
      hitRate: repeat.hitRate, q25Ratio: repeat.q25Ratio, concentration: repeat.concentration,
      concentrationWarning: repeat.concentrationWarning, steady: repeat.steady,
      monthly, repeat, pilot, comparison, expansion, d, newEntry: d === null ? null : d < 90,
      profit: input.profit ? pilotProfit(input.profit) : null, settings
    };
  }

  // Null/invalid values always go last; sort ties without perturbing the source order.
  function compareNullable(left, right, direction = 'desc') {
    const a = number(left), b = number(right);
    if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
    if (a === b) return 0;
    return (a < b ? -1 : 1) * (direction === 'asc' ? 1 : -1);
  }

  return Object.freeze({ models, business, monthlyIncome, pilotProfit, compareNullable, quantile, MODEL_VERSION, PROFILE_ID, WEIGHTS });
});