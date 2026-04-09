# Subplan 06: Production Hardening

> **For agentic workers:** Use superpowers:subagent-driven-development

**Goal:** Harden Pilot for production — upgrade monorepo toolchain, add structured logging with redaction, typed error system, AI client robustness (retry/timeout/offline), config migration, plugin sandboxing, binary distribution, E2E tests, and React Ink ErrorBoundary.

**Architecture:** pnpm monorepo with a `cli` package (React Ink + Commander.js) and `plugins/` packages (@medalsocial/kit, sanity, pencil). The plugin system loads manifests, registers MCP servers and slash commands. The AI layer uses Vercel AI SDK with Claude for streaming chat, tool calling, and crew auto-routing. Training generates AGENTS.md / CLAUDE.md consumed by Claude Code, Codex, and any MCP-aware tool.

**Tech Stack:** TypeScript (strict), pnpm workspaces, React Ink, Commander.js, Vercel AI SDK, @ai-sdk/anthropic, Zod, Vitest, ink-testing-library, Biome

**Depends on:** [01-foundation.md](01-foundation.md) through [05-skill-deployment.md](05-skill-deployment.md)

---

## Phase 8: Production Toolchain

### Task 29: Upgrade monorepo toolchain (Turborepo, strict Biome, Husky, secretlint)

**Files:**
- Modify: `package.json`
- Modify: `biome.json`
- Create: `turbo.json`
- Create: `.husky/pre-commit`
- Create: `.commitlintrc.json`
- Create: `.secretlintrc.json`
- Create: `scripts/check-node-version.mjs`
- Create: `knip.json`
- Modify: `vitest.config.ts`

Adds: Turborepo for task graph + caching, strict Biome rules matching medal-monorepo, Husky pre-commit with lint-staged + typecheck + secretlint, commitlint for conventional commits, knip for dead code detection, v8 coverage with thresholds, Node version enforcement, pnpm-only enforcement, license checking.

See Task 29 detailed steps in supplementary doc. This is a toolchain upgrade — all configs are declarative JSON/YAML files.

---

## Phase 9: Error System + Logging

### Task 30: Structured logging with redaction

**Files:**
- Create: `packages/cli/src/lib/logger/types.ts` — Logger interface (debug/info/warn/error + child)
- Create: `packages/cli/src/lib/logger/create-logger.ts` — factory with level filtering, JSON output, pretty mode
- Create: `packages/cli/src/lib/logger/redaction.ts` — sanitizeContext() redacts password/token/apiKey/secret recursively
- Create: `packages/cli/src/lib/logger/index.ts` — instantiated logger (dev=debug+pretty, prod=info+JSON)
- Test: `packages/cli/src/lib/logger/redaction.test.ts`

Pattern: matches medal-monorepo logger. Transport failures never crash user paths.

---

### Task 31: Typed error system

**Files:**
- Create: `packages/cli/src/lib/errors.ts` — PilotError class with ErrorCode, formatError for user display
- Test: `packages/cli/src/lib/errors.test.ts`

Error codes: PLUGIN_NOT_FOUND, NIX_BUILD_FAILED, NIX_NOT_INSTALLED, MACHINE_NOT_DETECTED, CONFIG_INVALID, CONFIG_MIGRATION_FAILED, AI_REQUEST_FAILED, AI_RATE_LIMITED, AI_TIMEOUT, OFFLINE, SKILL_DEPLOY_FAILED, UPDATE_FAILED, PERMISSION_DENIED.

Users see messages, never error codes. Logs capture full context.

---

## Phase 10: AI Client Robustness + Offline Resilience

### Task 32: Robust AI client (retry, timeout, offline detection)

**Files:**
- Modify: `packages/cli/src/ai/client.ts` — retry loop (3 attempts), exponential backoff on rate limit, AbortSignal.timeout(60s), offline check before request
- Create: `packages/cli/src/ai/config.ts` — model registry (AVAILABLE_MODELS, DEFAULT_MODEL, AI_CONFIG with maxRetries/timeoutMs/retryDelayMs)
- Create: `packages/cli/src/ai/offline.ts` — isOnline() via HEAD to api.anthropic.com with 5s timeout
- Test: `packages/cli/src/ai/offline.test.ts`

On offline: throws PilotError(OFFLINE) with friendly message "Medal Social unreachable — AI features unavailable. Machine commands still work."

---

## Phase 11: Config Migration + Plugin Sandboxing

### Task 33: Config migration system

**Files:**
- Create: `packages/cli/src/config/migration.ts` — versioned migration chain (v0→v1→v2→current), migrate() walks the chain
- Test: `packages/cli/src/config/migration.test.ts`

On load: reads config, checks version, runs migrations if needed, writes back. Pre-v1 configs (no version field) get migrated cleanly.

---

### Task 34: Plugin sandboxing (permission enforcement)

**Files:**
- Create: `packages/cli/src/plugins/sandbox.ts` — validatePermissions() rejects wildcard network, isNetworkAllowed() checks against declared domains
- Test: `packages/cli/src/plugins/sandbox.test.ts`

Plugins declare permissions in plugin.toml. Pilot enforces them at runtime. Undeclared network access is blocked. Permission review shown before install.

---

## Phase 12: Binary Distribution + E2E + Error Boundaries

### Task 35: Binary build + install script

**Files:**
- Create: `scripts/build-binary.sh` — ncc build to single file, add shebang, chmod +x
- Create: `scripts/install.sh` — curl installer served at pilot.medalsocial.com/install, detects OS/arch, downloads release binary
- Modify: `packages/cli/package.json` — add build:binary script using @vercel/ncc

Output: single `pilot` binary, zero runtime deps.

---

### Task 36: E2E test suite

**Files:**
- Create: `tests/e2e/helpers.ts` — runCommand(), spawnPilot(), cleanTestState() with isolated PILOT_HOME
- Create: `tests/e2e/install-flow.test.ts` — version, help, all commands listed
- Create: `tests/e2e/pilot-up.test.ts` — templates listed, preflight runs
- Create: `tests/e2e/update-flow.test.ts` — update check works
- Modify: `package.json` — add test:e2e to quality gate

Quality gate becomes: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`

---

### Task 37: React Ink ErrorBoundary

**Files:**
- Create: `packages/cli/src/components/ErrorBoundary.tsx` — catches uncaught errors, logs them, shows recovery UI ("Something went wrong. Run pilot again.")
- Modify: `packages/cli/src/commands/repl.ts` — wrap Repl in ErrorBoundary
- Test: `packages/cli/src/components/ErrorBoundary.test.tsx`

Every command entry point wraps its screen in ErrorBoundary. Crashes log to ~/.pilot/analytics/ and show a clean message, never a stack trace.

---

## Self-Review

| Spec Section | Task |
|---|---|
| Turborepo + strict Biome + Husky + secretlint | Task 29 |
| Structured logging with redaction | Task 30 |
| Typed error system | Task 31 |
| AI retry + timeout + offline detection | Task 32 |
| Config migration | Task 33 |
| Plugin sandboxing | Task 34 |
| Binary distribution + install script | Task 35 |
| E2E test suite | Task 36 |
| React Ink ErrorBoundary | Task 37 |
| knip dead code detection | Task 29 |
| Test coverage thresholds | Task 29 |
| Quality gate (lint + typecheck + test + e2e) | Tasks 29, 36 |
