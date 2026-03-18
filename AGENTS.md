# Grafana Traces Drilldown

> A Grafana app plugin for queryless exploration of trace data stored in Tempo.

## How these files fit together

| File | What it’s for |
|------|----------------|
| **`AGENTS.md`** (this file) | **Entry point for AI / contributors.** Traces Drilldown workflow: Tempo & TraceQL, expected vs bug, Scenes patterns, security. Points to every other doc below. |
| **`.config/AGENTS/instructions.md`** | **Grafana plugin tooling only** — official plugin-tools links, webpack, `plugin.json`, E2E, rules about `.config`. Same for any Grafana plugin; not Traces product behavior. |
| **`docs/project-intent.md`** | **Why** we built the app — philosophy, core features, principles. Use when reasoning about tradeoffs or scope. |
| **`docs/application-structure.md`** | **How the product is organized** — user journeys, screens, tabs, trace view, links in/out. Use when changing UI or URL behavior. |
| **`docs/sources/`** | **Shipped user docs** (get started, concepts, investigate). Use when updating customer-facing copy or aligning code with published behavior. |

## When to read which doc (shallow vs full)

**Shallow** = Use the table above; only open a doc if the task clearly needs it. **Full** = Read the whole doc before making changes.

| Task type | Read fully | Shallow or skip |
|-----------|------------|-----------------|
| **Tiny edit** — typo, single component, rename, lint | This file (table + Scenes bullets if touching scenes) | project-intent, application-structure, instructions |
| **UI / URL / tabs** — new tab, URL param, entry or exit point, trace view or drawer behavior | `docs/application-structure.md` | project-intent unless scope changes |
| **Scope or principles** — “should we add X?”, new feature, product tradeoffs | `docs/project-intent.md` | application-structure unless UI changes too |
| **Build / plugin** — plugin.json, webpack, .config, E2E, publish/sign | `.config/AGENTS/instructions.md` | project-intent, application-structure |
| **Shipped user docs** — editing get-started, concepts, or structure in `docs/sources/` | Relevant file in `docs/sources/` + `docs/README.md` | project-intent, application-structure unless aligning to UI |
| **Bug in traces / TraceQL / RED / data** | This file (Tempo links + “Expected vs bug”) + code | application-structure only if UI or URL is involved |

**Default:** If the task is small or unclear, stay shallow — use the table; open another doc only when the task clearly fits that doc’s purpose.

## Before investigating issues or bugs

**Read relevant documentation before making code changes or proposing fixes.** That reduces wrong assumptions about Tempo, TraceQL, or app behavior.

### Tempo and TraceQL documentation

Start with the [Grafana Tempo documentation](https://grafana.com/docs/tempo/latest/). When working on trace-related features (TraceQL, RED metrics, span attributes, time range), consult in particular:

- **[TraceQL](https://grafana.com/docs/tempo/latest/traceql/)** — Query language and semantics for traces.
- **[Tempo data source](https://grafana.com/docs/grafana/latest/datasources/tempo/)** — Data source configuration, including time-shifted trace search (e.g. `traceQuery.timeShiftEnabled`), which affects “trace not found” behavior and error messages.
- Trace lookup by ID and time range behavior so you can distinguish expected behavior from bugs.

### Local project documentation

- **`docs/sources/`** — Traces Drilldown user-facing docs in this repo.
- **`docs/project-intent.md`** and **`docs/application-structure.md`** — App intent and product map (see table above for when to use each).
- **[Traces Drilldown on grafana.com](https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/)** — Published docs.

### Determine expected behavior first

Before changing behavior or “fixing” something, decide whether it’s:

- **Expected** — e.g. trace missing because it’s outside the chosen (or time-shifted) window; or behavior that follows TraceQL / RED semantics.
- **Actually wrong** — e.g. filters not applied, wrong metric shown, or URL state out of sync.

## Project conventions

Refer to **`.config/AGENTS/instructions.md`** for Grafana plugin–specific rules (documentation indexes, critical rules). **Never modify anything inside the `.config` folder;** it is managed by Grafana plugin tools.

- **Edits** — Tradeoff: **Large replacements** (many lines in one go) are fewer tool calls when they succeed but often fail on whitespace or formatting, forcing retries and re-reads. **Smaller, incremental steps** (one logical change per edit) match more reliably and are easier to retry. Prefer smaller steps for big or multi-part changes; a single large replace is fine when the snippet is short and you have the exact content from the file.

- **Frontend security** — Follow workspace rules for HTML sanitization (DOMPurify), URLs (safe URL APIs / `textUtil.sanitizeUrl` where applicable), and avoiding unsafe DOM APIs.

### Scenes in Traces Drilldown

Traces Drilldown uses [@grafana/scenes](https://grafana.com/developers/scenes/) for app structure, routing, and interactive UI. When working on scenes-related code, follow the [Grafana Scenes documentation](https://grafana.com/developers/scenes/) and consider the [scenes demos](https://github.com/grafana/scenes/tree/main/packages/scenes-app/src/demos).

- **Root and exploration** — The root exploration is built from `TraceExploration` and its body (e.g. `TracesByServiceScene`). Use `$data` (e.g. `SceneQueryRunner`) and `$timeRange` (e.g. `SceneTimeRange`) on scene objects so they propagate to descendants.
- **Scene objects** — Custom scene objects extend `SceneObjectBase`. Implement state-modifying logic in the scene object class (not only in the renderer) to keep model complexity separate from the component. Use `model.useState()` to subscribe to state and `model.setState()` to update it.
- **Object tree** — Do not reuse the same scene object instance in multiple places in the tree. Use `SceneObjectRef` for shared references or clone the object for separate instances.
- **URL sync** — Exploration state (e.g. `traceId`, `spanId`, `actionView`, filters, metric) is synced to the URL; preserve that behavior when adding or changing URL-driven state.

## Usage

Start with **How these files fit together** above, then open the doc that matches your task (tooling vs product why vs product map vs user docs).
