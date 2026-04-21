# Pilot Up — Registry & Template Installer Design

> **Status:** Approved · April 21, 2026
> **Author:** Ali (with brainstorming partner)

---

## 1. Problem & Goal

`pilot up` is a stub today. Non-technical users — marketers, designers, founders — need a single command that installs a tool, configures it, and immediately gives them an AI specialist who knows how to use it. No knowledge of Node, npm, Nix, or package managers required.

**`pilot up remotion`** should:
1. Install all prerequisites (Node.js, ffmpeg, chromium)
2. Install the tool itself (Remotion CLI)
3. Deploy an AI skill for that tool
4. Wire up a **Video Specialist** crew member pre-loaded with Remotion knowledge

`pilot down remotion` undoes all of it cleanly.

---

## 2. Registry

### Hosting & Fetch

The registry lives at:
```
https://pilot.medalsocial.com/registry/v1/index.json
```

Cached at `~/.pilot/registry/index.json` with a **1-hour TTL**. On `pilot up`:

1. Check cache age — if fresh, use it
2. If stale, fetch + verify SHA-256 against the registry's own `sha256` field
3. If offline and cache exists, use cache with a `⚠ Using cached registry (offline)` warning
4. If offline and no cache, fall back to the small bundled registry baked into the binary

### Registry JSON Shape

```json
{
  "version": 1,
  "publishedAt": "2026-04-21T00:00:00Z",
  "sha256": "<sha256 of the templates array, hex>",
  "templates": [ ... ]
}
```

The `sha256` field covers only the `templates` array (canonical JSON, sorted keys). Pilot recomputes and compares before use. Mismatched hash → abort with `REGISTRY_TAMPERED` error.

### Security Model

Templates are **pure data** — no scripts, no code. Only Pilot's own typed installer executes anything based on the manifest. This is the security boundary: the registry cannot inject arbitrary commands. This mirrors Homebrew's bottle model where the formula defines metadata and Homebrew's own code does the work.

### Extensibility

The registry schema is versioned (`version` field). Future registry types (`skills`, `apps`, `crew`) follow the same fetch/cache/verify pattern — just different top-level keys. `pilot up` v1 only reads `templates`; the infrastructure is shared.

---

## 3. Template Manifest Format

Each entry in `templates[]`:

```json
{
  "name": "remotion",
  "displayName": "Remotion Video Studio",
  "description": "Video production with Node.js and React — produce videos programmatically",
  "version": "1.2.0",
  "category": "video",
  "platforms": ["darwin", "linux", "win32"],
  "steps": [
    {
      "type": "pkg",
      "nix": "nodejs_20",
      "brew": "node",
      "winget": "OpenJS.NodeJS.LTS",
      "label": "Node.js runtime"
    },
    {
      "type": "pkg",
      "nix": "ffmpeg",
      "brew": "ffmpeg",
      "winget": "Gyan.FFmpeg",
      "label": "Media encoder"
    },
    {
      "type": "pkg",
      "nix": "chromium",
      "brew": "chromium",
      "winget": "Google.Chrome",
      "label": "Browser engine"
    },
    {
      "type": "npm",
      "pkg": "@remotion/cli",
      "global": true,
      "label": "Remotion CLI"
    },
    {
      "type": "skill",
      "id": "remotion",
      "url": "https://pilot.medalsocial.com/registry/v1/skills/remotion.md",
      "label": "Remotion AI skill"
    }
  ],
  "crew": {
    "specialist": "video-specialist",
    "displayName": "Video Specialist",
    "skills": ["remotion"]
  },
  "completionHint": "Run `npx remotion studio` to open the studio"
}
```

```json
{
  "name": "pencil",
  "displayName": "Pencil Design Studio",
  "description": "Medal Social's local-first design engine",
  "version": "1.0.0",
  "category": "design",
  "platforms": ["darwin", "linux", "win32"],
  "steps": [
    {
      "type": "npm",
      "pkg": "@medalsocial/pencil",
      "global": true,
      "label": "Pencil engine"
    },
    {
      "type": "mcp",
      "server": "pencil",
      "command": "pencil mcp",
      "label": "MCP server wiring"
    },
    {
      "type": "zed-extension",
      "id": "medalsocial.pencil",
      "label": "Zed extension"
    },
    {
      "type": "skill",
      "id": "pencil",
      "url": "https://pilot.medalsocial.com/registry/v1/skills/pencil.md",
      "label": "Pencil AI skill"
    }
  ],
  "crew": {
    "specialist": "design-specialist",
    "displayName": "Design Specialist",
    "skills": ["pencil"]
  },
  "completionHint": "Open Zed and look for the Pencil panel"
}
```

### Step Types

| Type | Description | Fields |
|------|-------------|--------|
| `pkg` | OS package — resolved by platform | `nix`, `brew`, `winget`, `label` |
| `npm` | npm package install | `pkg`, `global`, `label` |
| `mcp` | Add an MCP server entry to `~/.pilot/settings.json` under `mcpServers` | `server`, `command`, `label` |
| `zed-extension` | Write the extension ID to Zed's `settings.json` `auto_install_extensions` list; prints manual install hint if Zed not found | `id`, `label` |
| `skill` | Download skill markdown from `url`, write to `~/.pilot/skills/<id>.md` | `id`, `url`, `label` |

### Platform Resolution for `pkg` steps

Pilot detects available package managers once at start of install:

| Platform | Priority order |
|----------|---------------|
| macOS (`darwin`) | Nix → Homebrew → npm |
| Linux | Nix → npm |
| Windows (`win32`) | winget → npm |

If no package manager matches for a `pkg` step, that step fails with a clear user-facing message: `"Node.js requires Nix, Homebrew, or winget — none found. Install one and retry."` The install stops at that step.

### Shared Package Protection

Before removing a `pkg` step's package during `pilot down`, Pilot checks `~/.pilot/templates.json` for other installed templates that also declare the same package. If found, the step is skipped: `"Node.js kept (also used by nextmedal)"`.

---

## 4. `pilot up <template>` — Install Flow

```
$ pilot up remotion

  Remotion Video Studio
  Video production with Node.js and React

  ✓ Node.js runtime       already installed
  ⠸ Media encoder         installing...
  ○ Browser engine
  ○ Remotion CLI
  ○ Remotion AI skill

Done in 1m 42s. Run `npx remotion studio` to open the studio.
Your Video Specialist is ready — ask them anything about Remotion.
```

### Steps

1. **Registry fetch** — check TTL, fetch+verify if stale, offline fallback
2. **Template lookup** — if name not found, print available template names and exit 1
3. **Already installed check** — if in `~/.pilot/templates.json`, prompt `"Remotion is already installed. Reinstall? [y/N]"`
4. **Platform detection** — detect available package managers once
5. **Step execution** — for each step in order:
   - Run `check()` — returns true if already satisfied
   - If already satisfied → mark ✓ "already installed", skip
   - Otherwise → run install action → spinner → done ✓ or error ✗
6. **Failure handling** — on step error, mark ✗, show error message, stop. Do not continue subsequent steps. User re-runs to resume (already-satisfied steps are skipped).
7. **State write** — on full success, write entry to `~/.pilot/templates.json`
8. **Crew wiring** — upsert `settings.crew.specialists[specialist]` in `~/.pilot/settings.json` with `{ displayName, skills }` so the specialist is available to the REPL
9. **Completion screen** — elapsed time, `completionHint`, specialist ready message

### Idempotency

Every step has a `check()` that returns true if the action is already satisfied. Running `pilot up remotion` twice is safe — already-installed steps are skipped.

---

## 5. `pilot up` (no args) — Browse UI

Split-panel screen. Left: category list. Right: templates in selected category.

```
┌─ pilot up ──────────────────────────────────────────────────────┐
│  Categories           │  Templates                               │
│  ──────────────────── │  ──────────────────────────────────────  │
│  > All                │  ● Pencil Design Studio   [installed]   │
│    Design             │    Medal Social's design engine          │
│    Video              │                                          │
│    Dev Tools          │  ○ Remotion Video Studio                 │
│                       │    Video production with React           │
│                       │                                          │
│                       │  ○ NextMedal Web App                     │
│                       │    Full-stack web application            │
└───────────────────────┴──────────────────────────────────────────┘
  ↑↓ navigate  ←→ switch panel  enter install  d uninstall  q quit
```

Pressing Enter on an uninstalled template starts the install flow inline — the right panel becomes the step-progress view. Pressing `d` on an installed template runs `pilot down` inline.

---

## 6. `pilot down <template>` — Uninstall Flow

Mirrors `pilot up` in reverse. Steps execute in reverse order. Shared packages are protected (see Section 3).

```
$ pilot down remotion

  Removing Remotion Video Studio...

  ✓ Remotion AI skill    removed
  ✓ Video Specialist     retired from crew
  ✓ Remotion CLI         removed
  ✓ Media encoder        removed
  ✓ Browser engine       removed
  ✓ Node.js              kept (used by nextmedal)

Done. Run `pilot up remotion` to reinstall.
```

The existing `down.ts` and `uninstaller.ts` are replaced by the new step-based uninstaller.

---

## 7. Module Layout

```
packages/cli/src/
├── registry/
│   ├── types.ts           — RegistryIndex, TemplateEntry, Step union types
│   ├── types.test.ts
│   ├── fetch.ts           — fetchRegistry(): fetch + SHA verify + cache
│   ├── fetch.test.ts
│   └── bundled.ts         — hardcoded fallback for offline-no-cache; includes pencil, remotion, nextmedal
├── installer/
│   ├── detect.ts          — detectPackageManagers(): { nix, brew, winget, npm }
│   ├── detect.test.ts
│   ├── steps.ts           — executeStep(), checkStep() — one handler per step type
│   ├── steps.test.ts
│   ├── runner.ts          — runSteps(), runStepsReverse() — orchestration
│   └── runner.test.ts
├── commands/
│   ├── up.ts              — rewrite: registry lookup + runner + crew wiring
│   ├── up.test.ts
│   ├── down.ts            — rewrite: reverse runner + shared-pkg protection
│   └── down.test.ts
└── screens/
    ├── Up.tsx             — browse screen (SplitPanel + template rows)
    ├── Up.test.tsx
    ├── UpInstall.tsx      — inline install progress (StepRow × n + Completion)
    └── UpInstall.test.tsx
```

**Modified files:**
- `packages/cli/src/device/templates.ts` — deleted; templates now come from registry
- `packages/cli/src/device/uninstaller.ts` — deleted; replaced by `installer/runner.ts`
- `packages/cli/src/bin/pilot.ts` — update `up` and `down` command handlers

**New UI components (CLI-local, modelled after kit's equivalents):**
- `packages/cli/src/screens/up/InstallStepRow.tsx` — mirrors kit's `StepRow` for install progress
- `packages/cli/src/screens/up/InstallCompletion.tsx` — mirrors kit's `Completion` for the done screen

---

## 8. Testing Strategy

**`registry/fetch.ts`**
- Fetch success + SHA match → returns parsed index
- Fetch success + SHA mismatch → throws `REGISTRY_TAMPERED`
- Network failure + valid cache → returns cache with warning flag
- Network failure + no cache → returns bundled fallback

**`installer/detect.ts`**
- Mock `which`/PATH for each PM combination; assert correct detection per platform

**`installer/steps.ts`**
- Each step type has: `checkStep` returns true (satisfied), `checkStep` returns false (needs install), `executeStep` issues the right command, `executeStep` propagates failure
- Use injected `Exec` — no real package manager calls

**`installer/runner.ts`**
- All steps pass → state written, specialist wired
- Step 2 fails → stops at step 2, steps 3+ never called
- Re-run after partial failure → already-done steps skipped
- Reverse run (down) → correct order, shared packages skipped

**`screens/Up.tsx` + `screens/UpInstall.tsx`**
- ink-testing-library snapshots: browse view, install progress, completion

---

## 9. Out of Scope for v1

- `pilot tap add <org/repo>` — community template taps (deferred)
- Registry skill entries — skills come from the template manifest for now; a first-class `skills` registry key is deferred
- Config/wizard steps for templates that need API keys or project setup
- Windows CI runners for template install E2E tests (infrastructure cost; unit tests cover Windows paths)
- `pilot up --list` flag (the no-args browse UI covers this)
