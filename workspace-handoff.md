# LONGFORM · MASTER V3 handoff

Baseline `b27aaab6872ccb935e74847909abcc3c6a8ce894`. Completed baseline (stage 1) not rebuilt. Stage 2 working branch commit `65c52b5406ff3acd77d6f8c004b3fdbd825620a9`. No changes to catalog JSON, channel trends, legacy/V2 page or formulas, ingestion schedule, Shorts, Insta source, Hermes or HumanTouch.

| Requirement | File | Verification |
| --- | --- | --- |
| 2: default, saved/share priority, query, representative, counts | `index.html`, `longform-workspace.js` | Browser: saved/default, existing `q=3Eke3c2nKic` (one card); selection counts computed |
| 3: revenue metadata, M1–M5, A/B/C/U, separate score | `lf-metrics.js`, `longform-workspace.js` | `node --test lf-metrics.test.cjs`; legacy, missing vs 0, range, scope, same-age denominator, sort |
| 4: 7/8 selection, rights-based export, observations | `lf-selection-ui.js`, `lf-export.js`, `lf-observations.js`, `index.html` | `node --test lf-export.test.cjs lf-observations.test.cjs`; browser smoke on branch/Pages separate |

## Main board research evidence (JSON)

Open a card's `검증 근거`, enter an evidence URL, and fill the JSON field only with documented values. Generic legacy v1 fields remain intact but do not establish a grade, monthly income, repeated outcomes or measured RPM by themselves. Data stays browser-local. Empty fields are unknown, not zero. Do not paste confidential credentials or subtitle text here.

- `revenueBasis`: `verified`, `views`, `period_start`, `period_end`, `views_basis`, `revenue_scope`, `evidence_url`, `observed_at`, `retrieved_at`. M1/M2 require matched period and cannot silently apply period rates to lifetime volumes.
- `rpmEvidence.m1`: `verified: true`, `same_channel: true` or matching `channel_id`, `format: "longform"`, `currency: "KRW"`, `period_start`, `period_end`, `views_basis`, `revenue_scope`, `revenue_kind: "studio_estimate"` or `"settlement"`, `rpm` or revenue/view pair, `evidence_url`.
- `rpmEvidence.m2`: verified matched format, currency, period, basis, scope, country and sector, `selection_rule`, `evidence_url`, and distinct channel RPM `samples` or documented `sample_size`, `dispersion` and `median_rpm`.
- `actual`: known observed settlement, with `verified`, `kind: "settlement"`, `revenue_scope`, `views_basis`, `period_start`, `period_end`, `amount`, `currency: "KRW"`, `evidence_url`. Distinguish source data from own pilot.
- `business`: `startedAt` (verified date, not channel registration), `months` (three most recent completed calendar months in compatible scope; each record includes month, amount, currency, scope, completed, source), `snapshots` (only actual D30 observations, with video_id/day/views/basis/observed_at), `pilots` (distinct id, own, measured, minutes), `comparisons` (independent operators with same criteria, traced sampling rule and snapshots), `expansion` (researched, paidTradeVerified, actor, own, completedMonths, procedureVerified, weeklyMinutes and evidenced transaction counts). The six criteria P/C/H/T/X/N follow the MASTER. Unknown does not reweight the score, which is not a probability. `d30`/`d7` on the root are explicit verified observations with `{day,views,observed_at,evidence_url}` and never backfilled from cumulative views.
- `pilot`: own measured period, revenue/cost and direct minutes, laborCost and laborAlreadyIncluded, currency, scope, monetization status, evidence_url. Approved/known zero differs from unknown.

## HUB adapter (handed off to integration owner)

JSON schema `content-workbench.selection.v1`, schema_version 1, format `longform`, mode `reference_batch`, `project_id`, `run_id`, `created_at`, timezone `Asia/Seoul`, `published_within_days` 30 or 60, `filters_snapshot` plus `filters` alias, ordered `selected` array of 7 or 8 unique items. Entries carry `video_id`, `source_url`, `title_original`, `channel`, `published_at` + `published_date`, `views`, `observed_at`, `retrieved_at`, `duration_seconds`, `language`, `format`, `model_id`, `model_version`, `selection_reason`, and rights status. When time-of-day is unknown, `published_at` stays null and `published_date` has the KST day. Consumers may use date precision for display, never for exact observation. Scope is frozen before export. Browser key `content-workbench:selection:v1:longform:<run_id>` is written only with an explicit handoff; JSON import is the cross-origin fallback. No local path, private evidence text, or subtitles in the shared payload. No HUB source changes here.

https://geben147-create.github.io/Insta/research-hub-20261108/#workspace

SRT/VTT/TXT input is user-provided only; verified rights and valid timecodes are required for private SRT ZIP. Each SRT retains its own time axis. Untimed TXT has no synthetic timestamps. Markdown/CSV support permitted analysis and limited quotes. Local QA uses synthetic permission fixtures, not actual third-party transcripts. Google Sheets CSV manual import is the safe default; no connected Sheet/account destination was supplied. No HumanTouch import, local video decoding, or rendering performed by LONGFORM.

## Observation merge

The shared ledger remains read-only. Explicit metric `observations.v = {observedAt: ISO timestamp, verified: true}` or equivalent verified row provenance is required to replace an existing observation. Same-time conflicts and undated/stale entries preserve source history, not an invented winner. Existing manual metadata is kept. Retrieval time is separate. Read-only remote failures show the retained in-build count and any available browser cache.

## Commands

```sh
node --test lf-metrics.test.cjs lf-export.test.cjs lf-observations.test.cjs
node --check longform-workspace.js
node --check lf-selection-ui.js
```

## Integration evidence

- `lf-hub-fixture.json` is an eight-video, metadata-only fixture from the existing catalog; it is not a new verified recommendation. HUB branch owner confirmed in Chrome that all eight IDs remain ordered, all unknown observation timestamps remain null, and filters are retained.
- Branch Chrome: built-in 2,883 rows; current shared merge 2,902 visible rows; 19 additions; 0 newer verified replacements observed. The pure merge tests cover actual newer, ambiguous, stale, undated, and cached observations.
- Browser: Quick 7 and Quick 8; mutating the draft does not mutate the frozen 8-item run; JSON preserves dates without generated times and contains no cues; unauthorized SRT download is withheld.

## Five-view follow-up (2026-11-27)

- In-place five presets plus identical-filter overall / selected-field positions; preserve favorites namespaces, direct URLs and old calculations. Unknown full business score and unknown growth remain unrankable as verified candidates. Recent/prior upload cohorts use different-age lifetime snapshots; displayed as such.
- Responsive local menu settings, 2–4 comparison, Korean browser voice fallback, and separate candidate/source panels. No external private storage, OAuth, rank publication into Insta, or player ad manipulation.
- Research seed: 413 verified distinct public-source candidates in 10 areas (34–58 per area), KR 117 / JP 162 / US-oriented English 134; 30/60/365 windows 102/157/413. Target 100 per area is not finished. The ten channel observations do not establish ten independent operators.
- Fresh-feed retrieval provenance belongs to each verified observation. See LFObservations.provenance(row,'v'); cache replay does not inject retrieval times.
