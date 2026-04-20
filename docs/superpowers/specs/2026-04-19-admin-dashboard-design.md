# Admin Dashboard — Design Spec

## Overview

A full-screen CLI command center (`pilot admin`) for Medal Social infrastructure. Built with React Ink, powered by the Medal Social SDK, with role-based views for workspace admins and super admins.

## Goals

- Give workspace owners/admins a terminal-native view of their workspace health, site status, content, and analytics
- Give super admins (Medal Social team) a platform-wide command center with visibility into all workspaces, services, and operations
- Share the same data layer (Medal Social SDK) so permissions are enforced at the API level
- Ship customer-facing view first (Phase 1), then layer super admin capabilities on top (Phase 2)

## Non-Goals

- No Vercel integration — Medal Social will build its own deploy pipeline
- No direct Convex queries — everything goes through the Medal Social SDK
- No WebSocket real-time — polling (30s) is sufficient for CLI

## Command

```
pilot admin
```

Auth-gated via the SDK. Checks the authenticated user's role:
- `owner` or `admin` on a workspace → customer view (scoped to their workspace)
- `super_admin` → super admin view (all workspaces + platform health)
- Any other role → exits with "You don't have permission to access the admin dashboard"

## Layout: Hybrid Dashboard

Persistent health strip on top, tabbed command panels below, keyboard shortcuts in the status bar.

```
┌──────────────────────────────────────────────────────────────┐
│ ✈ PILOT ADMIN                    user@email · role · time   │
├──────────────────────────────────────────────────────────────┤
│ ● AUTH  ● API  ● EMAIL  ● REALTIME  ...  12 ws  11 live    │
├──────────────────────────────────────────────────────────────┤
│ [TAB1] | TAB2 | TAB3 | TAB4 | TAB5                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Active panel content (table, cards, logs, etc.)             │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ↑↓ navigate  ⏎ select  / search  Tab switch  r refresh  q  │
└──────────────────────────────────────────────────────────────┘
```

## Roles & Views

### Customer View (workspace owner/admin)

Health strip shows workspace-scoped services: Site, DNS, SSL, Email, Content + quick stats (plan, uptime, monthly visits).

| Tab | Shows | Actions |
|-----|-------|---------|
| **Overview** | Site status, scheduled posts, monthly visits, recent activity | — |
| **Site** | Domain health, DNS config, SSL status, uptime, build status | Trigger rebuild, check DNS |
| **Content** | Published/draft/scheduled content, Sanity dataset stats | Publish draft, schedule post |
| **Analytics** | Visits, top pages, trends | — |
| **Settings** | Workspace config, plan, billing status, team members | — |

### Super Admin View (Medal Social team)

Health strip shows platform-wide services: Auth, API, Email, Realtime, Scheduler, Storage, Contacts, Events + quick stats (workspace count, live sites, warnings, MRR).

| Tab | Shows | Actions |
|-----|-------|---------|
| **Customers** | All workspaces table (name, status, site health, plan, MRR, last active) | Drill into any workspace's customer view |
| **Services** | Platform-wide service health (auth, API, email, realtime, scheduler, storage, contacts, events) | Restart service, clear cache |
| **Deploys** | Recent deploys across all workspaces, build status | Trigger rebuild for any workspace |
| **Actions** | Quick ops: create workspace, suspend workspace, manage DNS | Execute with confirmation modal |
| **Logs** | Streaming platform errors/events across all workspaces | Filter by workspace, severity |

Super admin can drill into any workspace from the Customers tab and see the exact same customer view.

## Keyboard Navigation

### Global (always available)

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Switch between panels |
| `1`–`5` | Jump to specific tab |
| `r` | Refresh all data |
| `/` | Search/filter within current panel |
| `q` | Quit dashboard |
| `?` | Show help overlay |

### Panel-specific

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate rows/items |
| `⏎` | Select / drill into detail |
| `Esc` | Back / close detail view |
| `a` | Open actions menu for selected item |

### Actions Flow

- Press `a` on an item → actions menu appears as a modal
- Select an action → confirmation modal (uses existing `Modal` component)
- Destructive actions (suspend, delete) → require typing the workspace name to confirm

### Search

- `/` opens an inline filter bar at the top of the active panel
- Filters the table/list in real-time as you type
- `Esc` clears the filter and returns focus to the panel

## File Structure

```
packages/cli/
  src/commands/admin.ts              ← Commander entry, auth check, launch screen
  src/screens/Admin.tsx              ← Main screen, manages tabs + state
  src/screens/admin/
    HealthStrip.tsx                   ← Persistent top bar with service dots + stats
    CustomersPanel.tsx               ← Workspace table (phase 1: own, phase 2: all)
    SitePanel.tsx                    ← Domain, DNS, SSL, build status
    ContentPanel.tsx                 ← Content stats from Sanity via SDK
    AnalyticsPanel.tsx               ← Visit metrics
    SettingsPanel.tsx                ← Workspace config
    ActionsPanel.tsx                 ← Quick actions (phase 2)
    ServicesPanel.tsx                ← Platform health (phase 2)
    DeploysPanel.tsx                 ← Deploy history (phase 2)
    LogsPanel.tsx                    ← Streaming logs (phase 2)
  src/admin/
    api.ts                           ← SDK wrapper — fetches data, handles polling
    types.ts                         ← Admin types (WorkspaceHealth, ServiceStatus, etc.)
```

## SDK Integration

`api.ts` wraps Medal Social SDK calls:
- Auto-refresh polling at 30s intervals (configurable)
- Loading/error states per panel (skeleton loaders while data fetches)
- Role-based query scoping — the SDK enforces permissions server-side, the CLI renders whatever comes back
- Error handling: network failures show inline error state with retry option, not a crash

## Reused Components

No new UI primitives needed. Reuses existing Pilot components:
- `TabBar` — tab switching
- `SplitPanel` — layout structure
- `StatusBar` — bottom keyboard hints
- `Modal` — action confirmations
- `Header` — top bar

## Design Tokens

All colors from `colors.ts` design token system:
- Service status: `colors.success` (green), `colors.warning` (yellow), `colors.error` (red)
- Brand accent: `colors.primary` (#9A6AC2) for highlights, active tabs, stat values
- Backgrounds, borders, muted text: from existing token palette
- Respects `NO_COLOR` env var for accessibility

## Testing

- Co-located tests: `Admin.test.tsx`, `HealthStrip.test.tsx`, etc.
- ink-testing-library for component rendering
- Mock SDK responses for each panel
- Test role-based rendering: super admin sees all tabs, customer sees scoped tabs
- Test keyboard navigation: tab switching, row selection, search filtering
- Test action confirmations: modal appears, destructive actions require name input

## Phasing

### Phase 1 — Customer View
- `pilot admin` command with auth
- HealthStrip (workspace-scoped)
- Overview, Site, Content, Analytics, Settings panels
- Keyboard navigation + search
- SDK integration for workspace data

### Phase 2 — Super Admin
- Role detection → super admin layout
- Customers panel (all-workspaces table with drill-down)
- Services panel (platform health)
- Deploys panel
- Actions panel (create/suspend workspace, DNS management)
- Logs panel (streaming, filterable)
