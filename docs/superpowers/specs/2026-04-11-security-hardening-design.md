# Security Hardening — Design Spec

**Date:** 2026-04-11
**Goal:** Meet all OpenSSF Best Practices Silver + Gold criteria for [project 12447](https://www.bestpractices.dev/en/projects/12447)
**Approach:** Criterion-by-criterion — each item gets its doc/code/badge-answer in one pass

---

## Summary

54 criteria total across Silver and Gold levels. ~18 need badge-page answers only. ~20 need new documentation. ~10 need engineering work. ~6 are N/A.

### Work Categories

| Category | Count | Examples |
|----------|-------|---------|
| Badge answer only (already met) | 18 | coding_standards_enforced, external_dependencies, automated_integration_testing |
| New documentation | 20 | governance, code_of_conduct, roadmap, assurance_case |
| Engineering work | 10 | signed_releases (Sigstore), test_coverage (90%), SPDX headers, security headers |
| Mark N/A | 6 | build_standard_variables, sites_password_security, installation_standard_variables |

---

## Silver Criteria

### Section 1: Basics

#### 1. `governance` (MUST)
**Status:** Not documented
**Action:** Create `GOVERNANCE.md`
- Decision model: Benevolent Dictator with Medal Social org as backstop
- Decisions made via GitHub issues/PRs
- Final authority: project lead
- Org admins can appoint successors
**Deliverable:** `/GOVERNANCE.md`

#### 2. `roles_responsibilities` (MUST)
**Status:** Not documented
**Action:** Add to `GOVERNANCE.md`
- Project Lead: roadmap, releases, security response
- Contributor: PRs, issues, docs
- Org Admin: infrastructure, succession, access management
**Deliverable:** Section in `/GOVERNANCE.md`

#### 3. `access_continuity` (MUST)
**Status:** Covered by org ownership, not documented
**Action:** Add to `GOVERNANCE.md`
- Medal Social org owns GitHub repo + npm packages
- Org admins can grant access if lead is unavailable
- No single point of failure at infrastructure level
**Deliverable:** Section in `/GOVERNANCE.md`

#### 4. `bus_factor` (SHOULD at Silver, MUST at Gold)
**Status:** Unmet — single active maintainer
**Action:** Second contributor will be onboarded. Document in `GOVERNANCE.md`. See Gold section for details.
**Deliverable:** Section in `/GOVERNANCE.md`

#### 5. `code_of_conduct` (MUST)
**Status:** Already exists — Contributor Covenant 2.1
**Action:** Verify and mark as Met on badge page.
**Deliverable:** Badge page answer

#### 6. `dco` (SHOULD)
**Status:** Not implemented
**Action:** Add DCO section to `CONTRIBUTING.md` — require `Signed-off-by` in commits.
**Deliverable:** Section in `/CONTRIBUTING.md`

#### 7. `documentation_roadmap` (MUST)
**Status:** Feature tracker exists in README, no standalone roadmap
**Action:** Create `ROADMAP.md` covering next 12 months.
**Deliverable:** `/ROADMAP.md`

#### 8. `documentation_architecture` (MUST)
**Status:** Brief section in CLAUDE.md, not a proper architecture doc
**Action:** Create `docs/ARCHITECTURE.md` — monorepo structure, CLI entry point → Commander → screens → AI layer, plugin system lifecycle, crew routing, skill deployment, design token system.
**Deliverable:** `/docs/ARCHITECTURE.md`

#### 9. `documentation_security` (MUST)
**Status:** SECURITY.md covers reporting, not user expectations
**Action:** Create `docs/SECURITY-EXPECTATIONS.md` — what users can/cannot expect.
**Deliverable:** `/docs/SECURITY-EXPECTATIONS.md`

#### 10. `documentation_quick_start` (MUST)
**Status:** README already has Quick Start section (line 104)
**Action:** Already met. Badge page answer.
**Deliverable:** Badge page answer

#### 11. `documentation_current` (MUST)
**Status:** No formal policy
**Action:** Add to `CONTRIBUTING.md` — PRs changing behavior must update relevant docs. Add to PR template checklist.
**Deliverable:** Section in `/CONTRIBUTING.md`, PR template update

#### 12. `documentation_achievements` (MUST)
**Status:** Scorecard badge in README
**Action:** Add Silver/Gold badges to README within 48h of earning.
**Deliverable:** Badge page answer + checklist item

#### 13. `accessibility_best_practices` (SHOULD)
**Status:** Design token system exists, no formal a11y docs
**Action:** Document in `CONTRIBUTING.md`.
**Deliverable:** Section in `/CONTRIBUTING.md`

#### 14. `internationalization` (SHOULD)
**Status:** English-only CLI
**Action:** Mark N/A on badge.
**Deliverable:** Badge page answer

#### 15. `sites_password_security` (MUST)
**Status:** N/A — project sites don't store passwords
**Action:** Mark N/A on badge page.
**Deliverable:** Badge page answer

### Section 2: Change Control

#### 16. `maintenance_or_update` (MUST)
**Status:** Rolling release model exists, not documented
**Action:** Document in `GOVERNANCE.md` — single active release line, fixes ship in next release, users upgrade via `pilot update`. No LTS branches.
**Deliverable:** Section in `/GOVERNANCE.md`

### Section 3: Reporting

#### 17. `vulnerability_report_credit` (MUST)
**Status:** No credit policy
**Action:** Add to `SECURITY.md` — reporters credited in release notes unless they request anonymity. Create `docs/SECURITY-CREDITS.md`.
**Deliverable:** Section in `/SECURITY.md`, `/docs/SECURITY-CREDITS.md`

#### 18. `vulnerability_response_process` (MUST)
**Status:** SECURITY.md has basics, needs formalized timeline
**Action:** Expand SECURITY.md: triage (48h) → confirm/reject (7 days) → fix → coordinated disclosure (90 days) → release + credit.
**Deliverable:** Expanded `/SECURITY.md`

### Section 4: Quality

#### 19. `coding_standards` (MUST)
**Status:** Biome config exists, documented in CLAUDE.md
**Action:** Add coding standards section to `CONTRIBUTING.md`.
**Deliverable:** Section in `/CONTRIBUTING.md`

#### 20. `coding_standards_enforced` (MUST)
**Status:** Already enforced via pre-commit hooks + CI
**Action:** Badge page answer.
**Deliverable:** Badge page answer only

#### 21. `build_standard_variables` (MUST)
**Status:** N/A — JS/TS project
**Action:** Mark N/A.
**Deliverable:** Badge page answer

#### 22. `build_preserve_debug` (SHOULD)
**Status:** N/A — source maps used instead
**Action:** Mark N/A.
**Deliverable:** Badge page answer

#### 23. `build_non_recursive` (MUST)
**Status:** Turborepo resolves build graph
**Action:** Badge page answer.
**Deliverable:** Badge page answer only

#### 24. `build_repeatable` (MUST)
**Status:** Frozen lockfile, pinned deps — needs verification
**Action:** Verify reproducibility: two clean builds, compare output hashes.
**Deliverable:** Badge page answer

#### 25. `installation_common` (MUST)
**Status:** Homebrew, curl, npm, `pilot uninstall` all exist
**Action:** Badge page answer.
**Deliverable:** Badge page answer only

#### 26. `installation_standard_variables` (MUST)
**Status:** N/A — npm/Homebrew handle paths
**Action:** Mark N/A.
**Deliverable:** Badge page answer

#### 27. `installation_development_quick` (MUST)
**Status:** Works but not documented
**Action:** Add "Development Setup" to `CONTRIBUTING.md`.
**Deliverable:** Section in `/CONTRIBUTING.md`

#### 28-32. Badge answers only
`external_dependencies`, `dependency_monitoring`, `updateable_reused_components`, `interfaces_current`, `automated_integration_testing` — all already met.

#### 33. `regression_tests_added50` (MUST)
**Action:** Add regression test policy to `CONTRIBUTING.md`.
**Deliverable:** Section in `/CONTRIBUTING.md`

#### 34. `test_statement_coverage80` (MUST — Silver)
**Status:** CLI at 71%, kit at 94%
**Action:** Write tests to reach 80%. Gold requires 90% — see Gold section.
**Deliverable:** New test files, vitest config update

#### 35. `test_policy_mandated` (MUST)
**Action:** Add formal test policy to `CONTRIBUTING.md`.
**Deliverable:** Section in `/CONTRIBUTING.md`

### Section 5: Security

#### 36. `implement_secure_design` (MUST)
**Action:** Document in `docs/ASSURANCE-CASE.md`.
**Deliverable:** Section in `/docs/ASSURANCE-CASE.md`

#### 37. `input_validation` (MUST)
**Action:** Audit input surfaces, document validation strategy in assurance case.
**Deliverable:** Code fixes (if gaps found), section in `/docs/ASSURANCE-CASE.md`

#### 38. `crypto_credential_agility` (MUST)
**Action:** Document in assurance case.
**Deliverable:** Section in `/docs/ASSURANCE-CASE.md`

#### 39. `crypto_algorithm_agility` (SHOULD)
**Action:** Document in assurance case.
**Deliverable:** Section in `/docs/ASSURANCE-CASE.md`

#### 40-41. `crypto_certificate_verification`, `crypto_verification_private` (MUST)
**Action:** Verify no TLS bypass in codebase, badge page answers.
**Deliverable:** Badge page answers only

#### 42. `signed_releases` (MUST)
**Action:** Add Sigstore cosign to binary release workflow. Document verification in `SECURITY.md`.
**Deliverable:** CI workflow update, section in `/SECURITY.md`

#### 43. `version_tags_signed` (SUGGESTED)
**Action:** Low-priority. Implement if time permits.
**Deliverable:** CI workflow update

#### 44. `assurance_case` (MUST)
**Action:** Create `docs/ASSURANCE-CASE.md` covering 5 threat surfaces.
**Deliverable:** `/docs/ASSURANCE-CASE.md`

---

## Gold Criteria (additional)

### 45. `achieve_silver` (MUST)
**Status:** Prerequisite — met by completing Silver criteria above.
**Action:** Complete all Silver criteria first.
**Deliverable:** Silver badge awarded

### 46. `bus_factor` (MUST at Gold)
**Status:** Unmet — single active maintainer
**Action:** Onboard second contributor with significant contributions (50+ commits or 1000+ lines of code or 20+ pages of docs within past year). Document in `GOVERNANCE.md`.
**Deliverable:** Second contributor active on the project

### 47. `contributors_unassociated` (MUST)
**Status:** Unmet — needs 2+ unassociated significant contributors
**Action:** Second contributor must be unassociated (not paid by same org to work on project). Each must have non-trivial contributions in past year (50+ commits or 1000+ lines or 20+ pages docs).
**Deliverable:** Contribution history visible in git log

### 48. `copyright_per_file` (MUST)
**Status:** No copyright headers in source files
**Action:** Add SPDX copyright header to all `.ts` and `.tsx` source files:
```
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
```
**Deliverable:** All source files updated

### 49. `license_per_file` (MUST)
**Status:** No license headers in source files
**Action:** Combined with criterion 48 — the SPDX header covers both copyright and license.
**Deliverable:** Same as criterion 48

### 50. `small_tasks` (MUST)
**Status:** No "good first issue" labels
**Action:** Create 3-5 GitHub issues labeled `good first issue` for new contributors. Examples: add `NO_COLOR` support, add shell completions, add `--json` output flag.
**Deliverable:** GitHub issues created with `good first issue` label

### 51. `two_person_review` (MUST)
**Status:** Single maintainer — no external review
**Action:** Once second contributor is onboarded, establish review process: all PRs require approval from someone other than the author. Configure GitHub branch protection to require 1 approving review.
**Deliverable:** Branch protection rule, documented in `CONTRIBUTING.md`

### 52. `test_statement_coverage90` (MUST)
**Status:** CLI at 71%, kit at 94%
**Action:** Write extensive tests to reach 90% statement coverage across both packages. This supersedes the Silver 80% requirement. Focus areas:
- `src/commands/` (currently 0%)
- `src/components/` uncovered files (Modal, ThinkingRow, ProgressBar)
- `src/screens/Update.tsx` (currently 48%)
- `src/bin/pilot.ts` (currently 0% — may need exclusion or targeted tests)
- `src/device/state.ts` (currently 32%)
**Deliverable:** New test files, vitest config with 90% threshold

### 53. `test_branch_coverage80` (MUST)
**Status:** CLI at 76.83% branches — close but needs work
**Action:** Write tests that cover untested branches (if/else paths, error cases, edge conditions). Add branch coverage threshold to vitest config.
**Deliverable:** Additional test cases, vitest config update

### 54. `hardened_site` (MUST)
**Status:** Unknown — `pilot.medalsocial.com` security headers not checked
**Action:** Verify security headers on the landing page. If missing, add to the Cloudflare Workers config (`workers/pilot-landing/`):
- `Content-Security-Policy`
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
**Deliverable:** Workers config update

---

## Deliverables Summary

### New Files
| File | Criteria Covered |
|------|-----------------|
| `GOVERNANCE.md` | governance, roles_responsibilities, access_continuity, bus_factor, maintenance_or_update |
| `ROADMAP.md` | documentation_roadmap |
| `docs/ARCHITECTURE.md` | documentation_architecture |
| `docs/SECURITY-EXPECTATIONS.md` | documentation_security |
| `docs/SECURITY-CREDITS.md` | vulnerability_report_credit |
| `docs/ASSURANCE-CASE.md` | implement_secure_design, input_validation, crypto_credential_agility, crypto_algorithm_agility, assurance_case |

### Modified Files
| File | Changes |
|------|---------|
| `CONTRIBUTING.md` | dco, coding_standards, documentation_current, accessibility, dev_quick_start, test_policy, regression_tests, two_person_review |
| `SECURITY.md` | vulnerability response timeline, reporter credit policy, release signing verification docs |
| `README.md` | Silver + Gold badges |
| `.github/workflows/build-binaries.yml` | Sigstore cosign signing |
| `vitest.config.ts` | Coverage thresholds (90% statements, 80% branches) |
| `workers/pilot-landing/src/index.ts` | Security headers |
| All `.ts`/`.tsx` source files | SPDX copyright + license headers |

### New Test Files
| Target | Current → Target Coverage |
|--------|--------------------------|
| `src/commands/*.test.ts` | 0% → 90%+ |
| `src/components/Modal.test.tsx` | 0% → 90%+ |
| `src/components/ThinkingRow.test.tsx` | 0% → 90%+ |
| `src/components/ProgressBar.test.tsx` | 0% → 90%+ |
| `src/screens/Update.test.tsx` (expand) | 48% → 90%+ |
| `src/device/state.test.ts` (expand) | 32% → 90%+ |

### GitHub Issues
3-5 issues with `good first issue` label for new contributors

### People / Process
- Second contributor onboarded with significant contributions
- Branch protection requiring 1 approving review
- All PRs reviewed by someone other than author

### Badge Page Answers Only (no code/doc changes)
`coding_standards_enforced`, `build_non_recursive`, `installation_common`, `external_dependencies`, `dependency_monitoring`, `updateable_reused_components`, `interfaces_current`, `automated_integration_testing`, `crypto_certificate_verification`, `crypto_verification_private`, `sites_password_security`, `build_standard_variables`, `build_preserve_debug`, `installation_standard_variables`, `internationalization`, `documentation_quick_start`, `code_of_conduct`

---

## Implementation Order

Work criterion-by-criterion, grouped by deliverable file:

**Phase 1: Documentation (Silver + Gold)**
1. `GOVERNANCE.md` — criteria 1-4, 16, 46
2. `CONTRIBUTING.md` — criteria 6, 11, 13, 19, 27, 33, 35, 51
3. `SECURITY.md` updates — criteria 17, 18, 42 (verification docs)
4. `docs/SECURITY-CREDITS.md` — criterion 17
5. `docs/SECURITY-EXPECTATIONS.md` — criterion 9
6. `docs/ARCHITECTURE.md` — criterion 8
7. `ROADMAP.md` — criterion 7
8. `docs/ASSURANCE-CASE.md` — criteria 36-39, 44

**Phase 2: Engineering (Silver)**
9. Sigstore signing in CI — criterion 42
10. Build reproducibility verification — criterion 24
11. Input validation audit — criterion 37

**Phase 3: Engineering (Gold)**
12. SPDX headers on all source files — criteria 48-49
13. Security headers on landing page — criterion 54
14. Test coverage to 90% statements, 80% branches — criteria 52-53
15. Coverage thresholds in vitest config — criteria 52-53

**Phase 4: Process (Gold)**
16. Create `good first issue` GitHub issues — criterion 50
17. Onboard second contributor — criteria 46-47
18. Enable branch protection (require review) — criterion 51

**Phase 5: Badge Pages**
19. Fill Silver badge page answers — all Silver criteria
20. Fill Gold badge page answers — all Gold criteria
21. Add badges to README — criterion 12
