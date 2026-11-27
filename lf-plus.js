/* Plus-alpha helpers. Pure and additive: reads LFMetrics but never replaces its models, scores or tests. */
(function (root, factory) {
  'use strict';
  const api = factory(root.LFMetrics || (typeof require === 'function' ? require('./lf-metrics.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LFPlus = api;
})(typeof window === 'object' ? window : globalThis, function (core) {
  'use strict';
  if (!core) throw new Error('LFMetrics is required');
  const SUPPORTED = Object.freeze(['KR', 'JP', 'US']);
  const COEFFICIENTS = Object.freeze({ KR: 0.4, JP: 0.55, US: 1 });
  const RETENTION = Object.freeze([1, 0.7, 0.5, 0.3]);
  const finite = x => Number.isFinite(x) ? x : null;
  const num = x => typeof x === 'number' && Number.isFinite(x) ? x : null;
  const text = x => typeof x === 'string' && x.trim() ? x.trim() : null;
  const https = x => { try { const u = new URL(x); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
  const stamp = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(x) && Number.isFinite(Date.parse(x));
  const hasSource = row => https(row?.evidence_url) || https(row?.source) || https(row?.sourceUrl);

  // 1. Where does a country coefficient participate? Descriptive only; model outputs are unchanged.
  const APPLICABILITY = Object.freeze({
    legacy: { name: '기존 1,000/2,000/4,000', countryCoefficient: 'none', fx: false, note: '고정 KRW 가정 단가입니다. 국가계수·환율을 쓰지 않습니다.' },
    m1: { name: 'M1 동일 채널 실측', countryCoefficient: 'none', fx: false, note: '해당 채널의 같은 기간·조회 기준 실측 RPM을 사용합니다. 국가계수를 곱하지 않습니다.' },
    m2: { name: 'M2 비교군 실측', countryCoefficient: 'filter', fx: false, note: 'KR/JP/US 중 같은 시청 국가의 비교군만 허용하는 조건입니다. 계수를 곱하지 않습니다.' },
    m3: { name: 'M3 vidIQ 시나리오', countryCoefficient: 'multiply', fx: true, note: '분야 USD 단가 × 국가계수 × 환율 × 0.6/1/1.6. 지원 국가는 KR/JP/US뿐입니다.' },
    m4: { name: 'M4 N3 시나리오', countryCoefficient: 'none', fx: false, note: '분야별 고정 KRW 가정입니다. 국가계수를 직접 쓰지 않습니다.' },
    m5: { name: 'M5 P1 고정 단가', countryCoefficient: 'none', fx: false, note: '고정 KRW 가정입니다. 국가계수를 직접 쓰지 않습니다.' }
  });
  function countryDisclosure(modelId, country) {
    const item = APPLICABILITY[modelId];
    const code = text(country)?.toUpperCase() ?? null;
    if (!item) return null;
    const coefficient = COEFFICIENTS[code] ?? null;
    return {
      model_id: modelId, ...item, country: code, supportedCountries: SUPPORTED.slice(), unsupportedKnown: ['IN'],
      coefficient: item.countryCoefficient === 'multiply' ? coefficient : null,
      status: item.countryCoefficient === 'multiply' ? (coefficient == null ? 'missing_supported_country' : 'applied')
        : item.countryCoefficient === 'filter' ? (coefficient == null ? 'unsupported_country_filter' : 'filter_only') : 'not_used',
      indiaCoefficient: null,
      label: item.countryCoefficient === 'multiply' ? '국가계수 적용 (KR 0.40 / JP 0.55 / US 1.00, IN 계수 없음)'
        : item.countryCoefficient === 'filter' ? '국가 일치 조건만 사용' : '국가계수 미사용'
    };
  }
  const allCountryDisclosures = country => Object.keys(APPLICABILITY).map(id => countryDisclosure(id, country));

  // 2. Conservative child-content scenario. It is a user-selectable scale over an existing range, not an RPM source.
  function childConservative(range, retentions = RETENTION) {
    const values = Array.isArray(range) && range.length ? range.map(num) : null;
    const rates = (Array.isArray(retentions) ? retentions : RETENTION).filter(r => Number.isFinite(r) && r > 0 && r <= 1);
    return {
      kind: 'child_conservative_scenario', official: false, rates,
      notice: '공식 계수나 YouTube 지급 규칙이 아닙니다. 아동용 콘텐츠는 맞춤 광고 제한 등으로 수익이 낮아질 수 있어 사용자가 비교하려고 선택한 보수 가정입니다.',
      base_range: values,
      scenarios: values && values.every(v => v != null) ? rates.map(rate => ({ retention: rate, range: values.map(v => finite(v * rate)) })) : []
    };
  }

  // 3. M3+ mixed-country simulation. Each country is computed by the unchanged M3 model, then weighted.
  function mixCountries(input = {}) {
    const weights = input.weights ?? {};
    const parts = SUPPORTED.map(code => [code, num(weights[code]) ?? 0]).filter(([, w]) => w > 0);
    const bad = Object.entries(weights).filter(([code, w]) => !SUPPORTED.includes(code) && Number(w) > 0).map(([code]) => code);
    if (bad.length) return { available: false, reason: 'unsupported_country_weight', unsupported: bad, supported: SUPPORTED.slice(), range: null, official: false };
    if (Object.values(weights).some(w => Number(w) < 0 || (w != null && !Number.isFinite(Number(w))))) return { available: false, reason: 'invalid_weight', range: null, official: false };
    const total = parts.reduce((s, [, w]) => s + w, 0);
    if (total <= 0) return { available: false, reason: 'missing_weights', range: null, official: false };
    const shares = parts.map(([code, w]) => [code, w / total]);
    const per = shares.map(([code, share]) => ({ code, share, model: core.models({ views: input.views, sector: input.sector, country: code, fx: input.fx }).m3 }));
    const missing = per.find(x => !x.model.range);
    if (missing) return { available: false, reason: missing.model.reason ?? 'm3_unavailable', country: missing.code, range: null, official: false };
    const range = [0, 1, 2].map(i => finite(per.reduce((s, x) => s + x.share * x.model.range[i], 0)));
    return {
      available: range.every(x => x !== null), kind: 'm3_plus_mixed_country_scenario', official: false,
      normalized_weights: Object.fromEntries(shares), mixed_country_coefficient: finite(shares.reduce((s, [c, share]) => s + share * COEFFICIENTS[c], 0)),
      fx: per[0].model.fx_assumption, sector_usd_rpm: per[0].model.sector_usd_rpm, range, countries: per.map(x => ({ code: x.code, share: x.share, range: x.model.range })),
      notice: 'M3를 대체하지 않는 선택형 확장입니다. 입력한 시청 국가 비중은 실제 시청자 분포 자료가 아닙니다.'
    };
  }

  // 4. Subscriber helpers are supplementary and never feed M1~M5 or business-fit.
  function subscriberAux(input = {}) {
    const views = num(input.views), subs = num(input.subscribers);
    const recent = (Array.isArray(input.recentViews) ? input.recentViews : []).filter(v => Number.isFinite(v) && v >= 0);
    const total = recent.reduce((s, v) => s + v, 0);
    return {
      auxiliary: true,
      viewsPerSubscriber: views != null && subs != null && subs > 0 ? finite(views / subs) : null,
      recentSample: recent.length, recentMedianViews: recent.length ? core.quantile(recent, 0.5) : null,
      topShare: recent.length >= 2 && total > 0 ? finite(Math.max(...recent) / total) : null,
      smallSample: recent.length < 5, note: '공개 구독자 수는 반올림될 수 있고, 표본의 업로드 시점이 달라 성공확률이나 수익을 뜻하지 않습니다.'
    };
  }

  // 5. Evidence audit. It labels missing proof; it does not change the V3 formulas or discard supplied values.
  function auditBusiness(data = {}, options = {}) {
    const rows = k => Array.isArray(data?.[k]) ? data[k].filter(Boolean) : [];
    const months = rows('months'), snaps = rows('snapshots').filter(r => Number(r.day ?? r.age_days) === 30), pilots = rows('pilots'), comps = rows('comparisons');
    const out = {
      months: { present: months.length > 0, ok: months.length > 0 && months.every(r => r.verified !== false && hasSource(r)), reasons: [] },
      snapshots: { present: snaps.length > 0, ok: snaps.length > 0 && snaps.every(r => r.verified !== false && stamp(r.observed_at) && (hasSource(r) || r.verified === true)), reasons: [] },
      pilots: { present: pilots.length > 0, ok: pilots.length > 0 && pilots.every(r => r.verified !== false && hasSource(r)), reasons: [] },
      comparisons: { present: comps.length > 0, ok: comps.length > 0 && !!(text(data?.selectionRule) || text(options.selectionRule)) && comps.every(r => r.verified !== false && hasSource(r)), reasons: [] },
      expansion: { present: !!data?.expansion, ok: !!data?.expansion && data.expansion.verified !== false && hasSource(data.expansion), reasons: [] }
    };
    if (out.months.present && !out.months.ok) out.months.reasons.push('월별 수익: 출처 URL 또는 verified:false 확인 필요');
    if (out.snapshots.present && !out.snapshots.ok) out.snapshots.reasons.push('D30 조회: observed_at과 verified/출처 필요');
    if (out.pilots.present && !out.pilots.ok) out.pilots.reasons.push('직접 작업시간: 출처 필요');
    if (out.comparisons.present && !out.comparisons.ok) out.comparisons.reasons.push('독립 비교: selection_rule과 출처 필요');
    if (out.expansion.present && !out.expansion.ok) out.expansion.reasons.push('사업 확장: 거래 근거 URL 필요');
    const need = ['months', 'snapshots', 'pilots', 'comparisons', 'expansion'];
    const missing = need.filter(k => out[k].present && !out[k].ok);
    return { ok: missing.length === 0, status: missing.length ? 'evidence_insufficient' : 'evidence_checked', missing, components: out, note: '근거 부족은 입력값을 삭제하지 않고 점수 반영만 보류합니다.' };
  }
  function guardedScore(business, audit) {
    const score = num(business?.score);
    return score == null ? { value: null, raw: null, status: 'incomplete' } :
      audit?.ok ? { value: score, raw: score, status: 'evidence_checked' } : { value: null, raw: score, status: 'evidence_insufficient' };
  }
  return Object.freeze({ SUPPORTED, COEFFICIENTS, RETENTION, APPLICABILITY, countryDisclosure, allCountryDisclosures, childConservative, mixCountries, subscriberAux, auditBusiness, guardedScore });
});
