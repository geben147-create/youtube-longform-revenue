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

  function stamp(input) {
    const at = has(input, 'observedAt') ? input.observedAt : null;
    const observedAt = instant(at);
    const verified = observedAt !== null && has(input, 'verified') && input.verified === true;
    const checked = day(at) || (has(input, 'checked') && day(input.checked));
    return checked ? {observedAt, verified, checked} : {observedAt, verified};
  }

  function current(row, metric) {
    if (!has(row, metric) || !validMetric(metric, row[metric])) return null;
    const scoped = has(row, 'observations') && record(row.observations) && has(row.observations, metric);
    const input = scoped ? (record(row.observations[metric]) ? row.observations[metric] : {}) : row;
    return {metric, value: row[metric], ...stamp(input)};
  }

  function newer(candidate, incumbent) {
    if (!incumbent) return true;
    if (incumbent.observedAt !== null) return candidate.observedAt > incumbent.observedAt;
    // The original checked field is a calendar day, not an instant. Never assign it a
    // timezone; only promote when the candidate must be later even in UTC-12.
    if (incumbent.checked) return Date.parse(candidate.observedAt) >= Date.parse(incumbent.checked + 'T00:00:00-12:00') + 86400000;
    return true; // A verified dated observation takes precedence over an undated baseline.
  }

  function mergeOne(original, incoming, conflicts, isNew) {
    const row = copy(original);
    const history = new Map();
    const byMetric = new Map(metrics.map(metric => [metric, new Map()]));
    const candidates = new Map();
    let changed = false;

    function keep(entry) {
      history.set(JSON.stringify([entry.metric, entry.value, entry.observedAt, entry.verified, entry.checked]), entry);
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
        const entry = current(source, metric);
        if (!entry) continue;
        keep(entry);
        if (activeFeed && entry.verified && (!candidates.has(metric) || candidates.get(metric).observedAt < entry.observedAt)) {
          candidates.set(metric, entry);
        }
      }
    }

    collect(original, isNew);
    for (const item of incoming) collect(item, true);

    const observations = has(row, 'observations') && record(row.observations) ? row.observations : {};
    for (const metric of metrics) {
      const incumbent = current(original, metric);
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
      } else if (isNew && incumbent?.verified && byTime.get(incumbent.observedAt).size > 1) {
        // New IDs have no original local value to fall back to. Keep the evidence,
        // but do not show an arbitrary winner for their disputed current metric.
        selected = null;
        delete row[metric];
        delete observations[metric];
      }
      if (selected) {
        const {observedAt, verified, checked} = selected;
        // Keep the checked marker attached to the metric it originally accompanied.
        observations[metric] = {observedAt, verified, ...(checked ? {checked} : {})};
      }
    }
    if (Object.keys(observations).length) row.observations = observations;
    if (history.size || has(row, 'history')) row.history = [...history.values()];
    return {row, changed};
  }

  /**
   * merge(localRows, remoteRows) => {rows, conflicts, added, updated}.
   * Match by id; keep local order/metadata; append new IDs in first-seen feed order.
   * v/s/n accept explicit {observedAt, verified: true}, preferably per metric at
   * row.observations[metric]; a per-metric record overrides row-wide provenance.
   * checked is legacy day-only evidence. note, d, and asOf are never time inputs.
   * rows are independent JSON data suitable for cache round-tripping. Observations
   * retains current provenance; history retains de-duplicated claims, including
   * superseded/undated values. History can veto conflicts but never promote values.
   * updated counts existing IDs whose current metric/provenance advanced, not edits
   * to history alone. conflicts entries are {id, metric, observedAt, values}.
   */
  function merge(localRows, remoteRows) {
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
      const result = mergeOne(local, incoming.get(id) || [], conflicts, false);
      rows.push(result.row);
      if (result.changed) updated++;
      incoming.delete(id);
    }
    for (const [first, ...rest] of incoming.values()) {
      rows.push(mergeOne(first, rest, conflicts, true).row);
      added++;
    }
    return {rows, conflicts, added, updated};
  }

  return {merge};
}));
