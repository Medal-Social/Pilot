# Socket.dev Score Improvement

## Goal

Raise the Socket.dev score for `@medalsocial/pilot` from ~83 overall to ~90+ by addressing Quality, Supply Chain, and Maintenance categories.

## Current State (v0.1.0)

| Category | Score |
|----------|-------|
| Supply Chain Security | 75 |
| Vulnerability | 100 |
| Quality | 69 |
| Maintenance | 86 |
| License | 100 |

### Active Alerts

- **Network access** (3 instances) — from `ws`, `ink` transitive deps
- **Environment variable access** (7 instances) — primarily from `loose-envify` (React 18 dep)
- **Unmaintained** (1 instance) — `patch-console` (last release Feb 2022, transitive via ink)
- **Debug access** (1 instance) — dep using dynamic code execution
- **AI-detected anomalies** (4 instances in 3 packages)
- **Minified code** (4 instances in 4 packages) — dependency build artifacts
- **URL strings** (13 instances) — hardcoded URLs in deps
- **Missing README** — no `packages/cli/README.md` in published tarball

## Changes

### 1. Add package README

Create `packages/cli/README.md` as the npm-facing README. Covers: what Pilot is, installation, key commands, usage examples, and links to the full repo docs.

This is the single biggest lever for the Quality score. Socket penalizes packages with no README heavily.

**Expected impact:** Quality 69 → ~90+

### 2. Upgrade React 18 to React 19

Update in `packages/cli/package.json`:
- `react`: `^18.3.0` → `^19.0.0`
- `@types/react`: `^18.3.0` → `^19.0.0`

React 19 removed the `loose-envify` dependency entirely. This eliminates several "environment variable access" alerts from the Supply Chain score, since `loose-envify` was the primary package calling `process.env` across the dependency tree. Also removes `js-tokens` as a transitive dep.

Compatibility: `ink@5` requires `react >=18` and `ink-text-input@6` requires `react >=18`, so React 19 is within range.

**Expected impact:** Supply Chain 75 → ~80-85 (fewer env var alerts, fewer total deps)

### 3. Enable npm provenance

Change `publishConfig.provenance` from `false` to `true` in `packages/cli/package.json`.

This adds SLSA provenance attestation when publishing from GitHub Actions, linking the package to the exact source commit and CI workflow. Strong Supply Chain trust signal.

Note: Provenance only works when publishing from GitHub Actions with `id-token: write`. Local publishes must use `--no-provenance`.

**Expected impact:** Supply Chain ↑ (trust signal, not a numeric alert fix)

### 4. Add second npm maintainer

Already done: `medal-pilot` added as npm owner via `npm owner add`.

**Expected impact:** Maintenance 86 → ~90+

### 5. Publish new version

Publish v0.1.1+ (ideally through GitHub Actions for provenance). More version history improves Maintenance score over time.

**Expected impact:** Maintenance ↑ (incremental, compounds with more releases)

## Out of Scope

- Replacing `ink` or `react` (core framework, disproportionate effort)
- Vendoring `patch-console` (transitive dep from ink, can't easily replace)
- Eliminating all dependency-driven alerts (network access, URL strings, minified code — inherent to the dep tree)
- Targeting literal 100% score (diminishing returns past ~93)

## Success Criteria

- Socket.dev overall score >= 90
- Quality score >= 90
- Supply Chain score >= 80
- Maintenance score >= 90
- All tests pass after React 19 upgrade
