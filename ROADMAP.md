# Roadmap

Last updated: 2026-04-11

This roadmap covers planned work for the next 12 months. It is not a commitment — priorities may shift based on user feedback and community needs.

## Now (Q2 2026)

**Goal: Complete v1 core platform**

- [ ] AI integration — Vercel AI SDK + Claude, crew routing, streaming
- [ ] Crew system — 5 crew leads (Brand, Marketing, Tech, CS, Sales) with auto-routing
- [ ] Skill deployment — `~/.pilot/skills/`, CLAUDE.md routing, smart updates with manifest checksums
- [ ] `pilot up` — one-click machine setup with split-panel UI, preflight checks, progress tracking
- [ ] OpenSSF Silver badge — security documentation, signed releases, test coverage

## Next (Q3 2026)

**Goal: Plugin ecosystem and hardening**

- [ ] Plugin sandboxing — runtime permission enforcement
- [ ] Skill security — content signing, script safety scanning, integrity checks
- [ ] E2E test suite — full command-line integration tests
- [ ] Shell completions — bash, zsh, fish
- [ ] `NO_COLOR` / `FORCE_COLOR` support
- [ ] Structured logging + error system

## Later (Q4 2026 – Q1 2027)

**Goal: Cloud-optional features and distribution**

- [ ] Cloud sync — account sync, plugin registry, team knowledge sharing
- [ ] Training knowledge base — bi-directional source sync
- [ ] Config migration system
- [ ] Themes — dark/light mode from design tokens
- [ ] Local-only telemetry dashboard

## Not Planned

These are explicitly out of scope:

- **GUI/desktop app** — Pilot is CLI-first. Rich UI happens in the terminal via React Ink.
- **Hosting AI models** — Pilot connects to AI providers, it doesn't run models locally.
- **Package manager** — Pilot uses the plugin system, not npm/pip/etc. for user-facing installs.
