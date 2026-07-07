# Grafana Traces Drilldown

> A Grafana app plugin for queryless exploration of trace data stored in Tempo.

## How these files fit together

| File | What it's for |
|------|----------------|
| **`AGENTS.md`** (this file) | **Entry point.** Tempo & TraceQL workflow, expected vs bug, Scenes patterns, security. Points to every other doc below. |
| **`CONTRIBUTING.md`** | **Human contributors.** Dev setup, issues vs PRs, i18n, PR checklist, link to GenAI policy. |
| **`docs/genai.md`** | **AI-assisted contributions.** Disclosure, acceptable use, Traces Drilldown-specific pitfalls. |
| **`.config/AGENTS/instructions.md`** | **Plugin tooling only** — webpack, `plugin.json`, E2E, rules about `.config`. |
| **`docs/project-intent.md`** | **Why** we built the app — philosophy, principles. Use when reasoning about tradeoffs or scope. |
| **`docs/application-structure.md`** | **How the product is organized** — user journeys, screens, tabs, trace view, links in/out. Use when changing UI or URL behavior. |
| **`docs/sources/`** | **Shipped user docs** (get started, concepts, investigate). Use when updating customer-facing copy. |

**Code anchors:** Explore shell: `src/pages/Explore/TraceExploration.tsx`. Service drilldown / RED: `src/components/Explore/TracesByService/TracesByServiceScene.tsx`. Trace drawer: `TraceDrawerScene.tsx`, spans list: `SpanListScene.tsx` (same dir). Shared utils: `src/utils/`. Use these to open the right file first; avoid broad repo search for small changes. Use grep or codebase search before opening large files (e.g. 400+ lines) unless you need full context.

## When to read which doc (shallow vs full)

**Shallow** = Use the table above; only open a doc if the task clearly needs it. **Full** = Read the whole doc before making changes.

| Task type | Read fully | Shallow or skip |
|-----------|------------|-----------------|
| **Tiny edit** — typo, single component, rename, lint | This file (table + Scenes bullets if touching scenes) | project-intent, application-structure, instructions |
| **UI / URL / tabs** — new tab, URL param, trace view or drawer | `docs/application-structure.md` | project-intent unless scope changes |
| **Scope or principles** — "should we add X?", new feature | `docs/project-intent.md` | application-structure unless UI changes |
| **Build / plugin** — plugin.json, webpack, .config, E2E | `.config/AGENTS/instructions.md` | project-intent, application-structure |
| **Shipped user docs** — get-started, concepts, structure | Relevant file in `docs/sources/` + `docs/README.md` | Others unless aligning to UI |
| **Bug in traces / TraceQL / RED / data** | This file (Tempo links) + code | application-structure only if UI or URL involved |
| **AI-assisted contribution** — drafting or reviewing with GenAI | `docs/genai.md` | AGENTS.md, CONTRIBUTING.md unless filing a PR |

**Default:** Stay shallow; open another doc only when the task clearly fits. For renames, lint, or single-file UI tweaks, skip application-structure and other deep docs.

**`docs/application-structure.md` by topic** (open the section you need instead of the whole doc when possible):

- [Entry points & extension links](docs/application-structure.md#entry-points) · [Direct URLs / URL state](docs/application-structure.md#direct-urls)
- [Main exploration layout](docs/application-structure.md#main-exploration-layout) (header, filters, RED)
- [Tabs / `actionView`](docs/application-structure.md#tabs-action-views)
- [Trace drawer](docs/application-structure.md#trace-view) (`traceId` / `spanId`)
- [Exit & handoffs](docs/application-structure.md#exit-points-and-handoffs)

## Before investigating issues or bugs

**Read relevant documentation before making code changes or proposing fixes.**

### Tempo and TraceQL documentation

[Tempo docs](https://grafana.com/docs/tempo/latest/) · [TraceQL](https://grafana.com/docs/tempo/latest/traceql/) · [Tempo data source](https://grafana.com/docs/grafana/latest/datasources/tempo/) (time-shifted search, "trace not found"). Trace lookup by ID and time range — know expected behavior before changing anything.

### Determine expected behavior first

- **Expected** — e.g. trace missing because it's outside the chosen (or time-shifted) window; behavior that follows TraceQL / RED semantics.
- **Actually wrong** — e.g. filters not applied, wrong metric shown, URL state out of sync.

## Project conventions

**Plugin (build, .config, E2E):** See **`.config/AGENTS/instructions.md`** — do not modify `.config`.

- **Commands** — After code changes: `pnpm lint`, `pnpm typecheck`.
- **Edits** — Large replacements (many lines) are fewer tool calls when they succeed but often fail on whitespace/formatting. Smaller, incremental steps match more reliably. Prefer smaller steps for big or multi-part changes; one large replace is fine when the snippet is short and you have the exact content from the file.
- **Avoid** — Reading whole large files for a small change (see Code anchors; grep first). One giant multi-file replace without verifying exact content.
- **Frontend security** — Follow workspace rules: HTML sanitization (DOMPurify), safe URL APIs / `textUtil.sanitizeUrl` and whatever else you think is necessary.
- **Dependency installs** — `pnpm-workspace.yaml` sets `frozenLockfile: true` and `ignoreScripts: true` (applied on every `pnpm install`). In scripts and CI use `pnpm install --frozen-lockfile --ignore-scripts`. To refresh the lockfile after dependency changes, use `pnpm install --no-frozen-lockfile --ignore-scripts`. Do not run installs without `--ignore-scripts` unless a package truly needs a lifecycle script (rebuild manually). Review `pnpm-workspace.yaml` `overrides` when security advisories affect transitive deps.

### Scenes in Traces Drilldown

Traces Drilldown uses [@grafana/scenes](https://grafana.com/developers/scenes/) for app structure, routing, and interactive UI. When working on scenes-related code, follow the [Grafana Scenes documentation](https://grafana.com/developers/scenes/) and consider the [scenes demos](https://github.com/grafana/scenes/tree/main/packages/scenes-app/src/demos).

- **Layout** — See `docs/application-structure.md` (Main exploration layout, Trace view) for the scene tree and URL state.
- **Scene objects** — Extend `SceneObjectBase`. Put state logic in the scene object class (not only in the renderer). Use `model.useState()` to subscribe, `model.setState()` to update.
- **Object tree** — Do not reuse the same scene object instance in multiple places. Use `SceneObjectRef` for shared references or clone.
- **URL sync** — Exploration state (`traceId`, `spanId`, `actionView`, filters, metric) is synced to the URL; preserve that when adding or changing URL-driven state.

## Usage

Start with the **How these files fit together** table above, then open the doc that matches your task.

**Human contributors:** follow [CONTRIBUTING.md](CONTRIBUTING.md) for how to file issues, open pull requests, run local checks, and use AI tools responsibly. The full GenAI policy is in [docs/genai.md](docs/genai.md).
