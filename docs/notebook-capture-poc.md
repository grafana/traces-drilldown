# Notebook capture POC

## Entry point and contract

In Breakdown's grid/rows layout, open a scoped timeseries tile's menu and choose **Add to notebook**. The menu requires the core `grafana/add-to-notebook-form/v1` component to be loaded and either `notebooks:create` or `notebooks:write`. The core only registers this component with notebooks enabled. Restart Grafana after changing `plugin.json`.

The app owns a modal in `TraceExploration`; a bubbling event carries a detached snapshot, so closing the menu cannot drop the form. The local props match the inspected core `AddToNotebookForm.tsx`: `buildPanel`, `capturedTimeRange`, and `onClose`. The core owns selection, creation, writing, and common analytics. No consumer analytics or secondary notebook write is added.

The snapshot reuses the Add-to-dashboard adapter and explicit per-tile targets, not the layout's aggregate query. Filters/variables are interpolated at opening; the selected frame's label predicate, real Tempo UID, query step, visualization options, field configuration, raw relative strings or ISO absolute bounds, and source timezone are retained. The builder returns a fresh JSON panel from that snapshot, never a mutable scene reference. Data frames, trace payloads, and exemplar callbacks are not copied.

## Limits

- Only known scoped timeseries tiles backed by `SceneDataNode` plus explicit TraceQL targets are offered. Aggregate RED, histogram, comparison, structure, exception, trace-detail, and arbitrary/custom-transformed panels are excluded.
- The query is re-executed in the notebook; this is not an image or a frozen response. Relative bounds remain relative. The core form controls whether to lock the cell's time window.
- Scene-only exemplar navigation and raw annotations are not exported. No trace telemetry is automatically attached.
- Tile predicates use the existing typed TraceQL escaping helpers. Known status/kind intrinsics retain bare enum literals; explicitly quoted label strings are decoded once and escaped without changing their type (including numeric-looking strings, quotes, backslashes and control characters). Known intrinsic durations require explicit duration units.
- Missing labels, ambiguous unquoted custom-attribute values (including numbers/booleans), malformed string encodings, unknown intrinsic enums, and strings containing `$` are excluded rather than guessed. Dollar-containing values cannot be preserved safely through the current scene interpolation adapter.
- This fixes the shared breakdown-tile query builder, so valid predicates are also corrected for existing Add to dashboard, Explore and Create alert actions. Unsafe tiles remain visible with their existing header actions, but their export menu is omitted instead of exporting an incorrect or aggregate query. General dashboard export adapters and other layouts are unchanged.
- Reused tiles update their existing menu's resolved Explore query and explicit export targets in place. The menu renderer rebuilds links/capabilities when those inputs change, preserving the menu lifecycle while ensuring a new capture uses the latest frame/group/filter context. Already-open notebook snapshots remain detached.
- No browser, live datasource, host integration, deployment, or performance verification has been performed.

## Local verification

Use Node **22.22.0** (`mise.toml`) and package-pinned pnpm **11.28.1**. Install with `pnpm install --frozen-lockfile --ignore-scripts`; no manifests or lockfiles were changed. Local tooling/cache files live under ignored `work/` and `.pnpm-store/` in this repository.

Focused tests cover real scene interpolation, selected query/UID/options/window snapshots, post-opening mutation, availability/permission gates, exclusions, and form/modal close callbacks. Run the new notebook tests alongside `addToDashboard.test.ts`, `getPanelDataForAlert.test.ts`, and `generateMetricsQuery.test.ts` with one Jest worker. `NODE_PATH=$PWD/node_modules/.pnpm/node_modules` permits the existing undeclared external `lodash` imports to resolve in this pnpm checkout. Run `pnpm typecheck`, `pnpm lint --ignore-pattern 'work/**' --ignore-pattern '.pnpm-store/**'`, i18n extraction, and Prettier on changed files.

Verified locally: 5 relevant Jest suites / 40 tests passed, full TypeScript passed, full lint completed with 0 errors and 22 warnings in existing code, and the new action/menu files passed lint with zero warnings. English strings were extracted; the i18n CI check reports no updates. No dependency installation or registry blocker remains. No home/global registry configuration was modified; no authentication script was run.

Predicate-fidelity follow-up: 8 relevant Jest suites / 129 tests pass, including the actual tile serializer, shared dashboard adapter, notebook capture, and a rendered menu regression covering reused-tile updates, refreshed Explore links, capability changes and frozen prior captures. Full TypeScript, focused ESLint with zero warnings, Prettier and `git diff --check` pass. Existing pinned Node/dependencies were reused; no installs, authentication scripts or global configuration changes were needed. Browser/host/deployment verification remains unperformed.
