'use strict';
const assert = require('assert'), O = require(require('path').join(__dirname,'lf-v14.js'));
let n = 0; const t = (name, f) => { f(); n++; console.log('pass', name); };
const now = Date.parse('2026-11-28');
const pool = [
  { id: 'a', t: 'AI 주식 분석 ETF', ch: 'A', v: 100000, d: '2026-11-01', s: 900 },
  { id: 'b', t: '고양이 이야기', ch: 'B', v: 5000, d: '2025-01-01', s: 600 },
  { id: 'c', t: '', ch: '', v: null, d: null, s: null }
];
const info = v => v.id === 'a' ? { subs: 1000, chAge: 30, x: 100, chViews: 200000, chVideos: 5 } : {};
const R = O.build(pool, { now, info, channels: () => new Map() });
t('weights sum to 100', () => assert.strictEqual(O.weights.reduce((a, w) => a + w[2], 0), 100));
t('unknown stays unknown (no coverage, no score)', () => { const s = R.scores.get('c'); assert.strictEqual(s.coverage, 0); assert.strictEqual(s.scaled, null); assert.strictEqual(s.parts.c1, null); });
t('coverage counts only known criteria', () => { const s = R.scores.get('a'); const known = O.weights.filter(([k]) => s.parts[k]).reduce((a, w) => a + w[2], 0); assert.strictEqual(Math.round(s.coverage * 100), known); });
t('tentative below 60%', () => { for (const s of R.scores.values()) assert.strictEqual(s.tentative, s.coverage < 0.6); });
t('category S for AI stock', () => assert.strictEqual(O.category(pool[0]).cls, 'S'));
t('old channel new-channel criterion is real 0 not unknown', () => { const R2 = O.build([{ id: 'x', t: 't', ch: 'X', v: 10, d: '2026-01-01', s: 300 }, { id: 'y', t: 't', ch: 'Y', v: 20, d: '2026-01-01', s: 300 }], { now, info: v => ({ chAge: v.id === 'x' ? 2000 : 10 }), channels: () => new Map() }); assert.strictEqual(R2.scores.get('x').parts.c9.raw, 0); });
console.log(n + ' tests passed');
