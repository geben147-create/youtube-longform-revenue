/* Pure merge for the LONGFORM all-videos.json row shape. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.LFObservations = factory();
}(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const metrics = ['v', 's', 'n']; // Views, duration in seconds, channel subscribers.
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const list = value => Array.isArray(value) ? value : [];
  const idOf = row => record(row) && has(row, 'id') && typeof row.id === 'string' && row.id.trim() === row.id && row.id !== '' ? row.id : null;
  const validMetric = (metric, value) => Number.isSafeInteger(value) && value >= (metric === 's' ? 181 : 0);
  const copy = value => Array.isArray(value) ? value.map(copy) : record(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])) : value;

  function day(value) {
    if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return null;
    const ms = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? value : null;
  }

  // No free-form Date.parse. Require an actual calendar date, a clock and a known zone.
  function instant(value) {
    const match = typeof value === 'string' && /^([0-9]{4}-[0-9]{2}-[0-9]{2})T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,3})?(Z|[+-](?:[01][0-9]|2[0-3]):[0-5][0-9])$/.exec(value);
    if (!match || !day(match[1]) || match[2] === '-00:00') return null;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) return null;
    const canonical = new Date(ms).toISOString();
    return canonical.length === 24 ? canonical : null;
  }

  function stamp(input, feedRetrievedAt = null) {
    const at = has(input, 'observedAt') ? input.observedAt : null;
    const observedAt = instant(at);
    const verified = observedAt !== null && has(input, 'verified') && input.verified === true;
    const checked = day(at) || (has(input, 'checked') && day(input.checked));
    const retrievedAt = verified ? ((has(input, 'retrievedAt') && instant(input.retrievedAt)) || feedRetrievedAt) : null;
    return {observedAt, verified, ...(checked ? {checked} : {}), ...(retrievedAt ? {retrievedAt} : {})};
  }

  function current(row, metric, feedRetrievedAt) {
    if (!record(row) || !metrics.includes(metric) || !has(row, metric) || !validMetric(metric, row[metric])) return null;
    const scoped = has(row, 'observations') && record(row.observations) && has(row.observations, metric);
    const input = scoped ? (record(row.observations[metric]) ? row.observations[metric] : {}) : row;
    return {metric, value: row[metric], ...stamp(input, feedRetrievedAt)};
  }

  // Export/display the two timestamps for the current verified value, never a
  // root-level retrieval timestamp left over from another metric or version.
  function provenance(row, metric) {
    const entry = current(row, metric);
    return {observedAt: entry?.verified ? entry.observedAt : null, retrievedAt: entry?.retrievedAt ?? null};
  }

  // Repeated fetches of a single claim do not grow history; keep the earliest
  // known retrieval. This also makes duplicate feed claims stable.
  function earlierRetrieval(entry, previous) {
    return Boolean(entry.retrievedAt && (!previous.retrievedAt || entry.retrievedAt < previous.retrievedAt));
  }

  function newer(candidate, incumbent) {
    if (!incumbent) return true;
    if (incumbent.observedAt !== null) return candidate.observedAt > incumbent.observedAt;
    // The original checked field is a calendar day, not an instant. Never assign it a
    // timezone; only promote when the candidate must be later even in UTC-12.
    if (incumbent.checked) return Date.parse(candidate.observedAt) >= Date.parse(incumbent.checked + 'T00:00:00-12:00') + 86400000;
    return true; // A verified dated observation takes precedence over an undated baseline.
  }

  function mergeOne(original, incoming, conflicts, isNew, feedRetrievedAt) {
    const row = copy(original);
    const history = new Map();
    const byMetric = new Map(metrics.map(metric => [metric, new Map()]));
    const candidates = new Map();
    let changed = false;

    function keep(entry) {
      const key = JSON.stringify([entry.metric, entry.value, entry.observedAt, entry.verified, entry.checked]);
      if (!history.has(key) || earlierRetrieval(entry, history.get(key))) history.set(key, entry);
      if (entry.verified) {
        const byTime = byMetric.get(entry.metric);
        if (!byTime.has(entry.observedAt)) byTime.set(entry.observedAt, new Set());
        byTime.get(entry.observedAt).add(entry.value);
      }
    }

    function collect(source, activeFeed) {
      for (const item of list(has(source, 'history') ? source.history : null)) {
        if (record(item) && has(item, 'metric') && has(item, 'value') && metrics.includes(item.metric) && validMetric(item.metric, item.value)) {
          keep({metric: item.metric, value: item.value, ...stamp(item)});
        }
      }
      for (const metric of metrics) {
        const entry = current(source, metric, activeFeed ? feedRetrievedAt : null);
        if (!entry) continue;
        keep(entry);
        const prior = candidates.get(metric);
        if (activeFeed && entry.verified && (!prior || prior.observedAt < entry.observedAt ||
            (prior.observedAt === entry.observedAt && prior.value === entry.value && earlierRetrieval(entry, prior)))) {
          candidates.set(metric, entry);
        }
      }
    }

    collect(original, isNew);
    for (const item of incoming) collect(item, true);

    const observations = has(row, 'observations') && record(row.observations) ? row.observations : {};
    for (const metric of metrics) {
      const incumbent = current(original, metric, isNew ? feedRetrievedAt : null);
      const candidate = candidates.get(metric);
      const byTime = byMetric.get(metric);
      // An equal-time disagreement with the incumbent is worth surfacing even if its
      // original timestamp was recorded without verification.
      if (incumbent && byTime.has(incumbent.observedAt)) byTime.get(incumbent.observedAt).add(incumbent.value);
      for (const observedAt of [...byTime.keys()].sort()) {
        const values = byTime.get(observedAt);
        if (values.size > 1) conflicts.push({id: original.id, metric, observedAt, values: [...values].sort((a, b) => a - b)});
      }
      const blocked = candidate && byTime.get(candidate.observedAt).size > 1;
      let selected = incumbent;
      if (candidate && !blocked && newer(candidate, incumbent)) {
        selected = candidate;
        row[metric] = candidate.value;
        changed = true;
      } else if (isNew && !blocked && incumbent?.verified && candidate?.observedAt === incumbent.observedAt) {
        // Duplicate matching claims can supply retrieval metadata for a new ID.
        selected = candidate;
      } else if (isNew && incumbent?.verified && byTime.get(incumbent.observedAt).size > 1) {
        // New IDs have no original local value to fall back to. Keep the evidence,
        // but do not show an arbitrary winner for their disputed current metric.
        selected = null;
        delete row[metric];
        delete observations[metric];
      }
      if (selected) {
        const {metric: _metric, value: _value, ...provenance} = selected;
        // Keep checked/retrieved markers attached to the observation they accompanied.
        observations[metric] = provenance;
      }
    }
    if (Object.keys(observations).length) row.observations = observations;
    if (history.size || has(row, 'history')) row.history = [...history.values()];
    return {row, changed};
  }

  /**
   * merge(localRows, remoteRows, {retrievedAt}?) => {rows, conflicts, added, updated}.
   * Match by id; keep local order/metadata; append new IDs in first-seen feed order.
   * v/s/n accept explicit {observedAt, verified: true}, preferably per metric at
   * row.observations[metric]; a per-metric record overrides row-wide provenance,
   * including optional retrievedAt. Supply the optional batch retrievedAt only for
   * a fresh fetch: it fills missing timestamps on verified incoming current claims,
   * not local rows or history. Retrieval never affects recency or verification.
   * checked is legacy day-only evidence. note, d, and asOf are never time inputs.
   * rows are independent JSON data suitable for cache round-tripping. Observations
   * retains current provenance; history retains de-duplicated claims, including
   * superseded/undated values. History can veto conflicts but never promote values.
   * updated counts existing IDs whose current metric/provenance advanced, not edits
   * to history alone. conflicts entries are {id, metric, observedAt, values}.
   */
  function merge(localRows, remoteRows, options) {
    const feedRetrievedAt = record(options) && has(options, 'retrievedAt') ? instant(options.retrievedAt) : null;
    const incoming = new Map();
    for (const row of list(remoteRows)) {
      const id = idOf(row);
      if (id === null) continue;
      if (incoming.has(id)) incoming.get(id).push(row);
      else incoming.set(id, [row]);
    }
    const rows = [], conflicts = [];
    let added = 0, updated = 0;
    for (const local of list(localRows)) {
      const id = idOf(local);
      if (id === null) { rows.push(copy(local)); continue; }
      const result = mergeOne(local, incoming.get(id) || [], conflicts, false, feedRetrievedAt);
      rows.push(result.row);
      if (result.changed) updated++;
      incoming.delete(id);
    }
    for (const [first, ...rest] of incoming.values()) {
      rows.push(mergeOne(first, rest, conflicts, true, feedRetrievedAt).row);
      added++;
    }
    return {rows, conflicts, added, updated};
  }

  return {merge, provenance};
}));
