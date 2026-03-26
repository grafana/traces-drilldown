# The Grafana Traces Drilldown app

**What this file is for:** **Product intent** — why the app exists, what it optimizes for, and guiding principles. It does not describe screens or tabs (see `application-structure.md` for that).

---

Grafana Traces Drilldown is a plugin that lets users investigate Tempo trace data **without writing TraceQL**. It targets the same observability goals as ad-hoc querying—spotting spikes, errors, and latency—through RED-style metrics and guided drill-downs instead of manual query construction.

## Core features

- **RED from traces**: Rate, errors, and duration views derived from trace/span data, with visualizations chosen to match the selected metric (e.g. histograms for duration).
- **Primary signals**: Narrow the population of spans (root spans, all spans, server/consumer spans, database calls) before drilling deeper.
- **Progressive drill-down**: Filters, group-by, breakdown and structure views, comparison across time, trace/span lists.
- **Trace detail**: Open a specific trace in a drawer; jump to Explore from list views when users need raw TraceQL.
- **Shareable state**: URL and scene variables preserve datasource, filters, metric, tab (`actionView`), selection, and trace/span focus where applicable.

## Core principles

- **Simplicity first**: Default path is visual and interactive; advanced behavior (e.g. all spans, comparison) is available without blocking newcomers.
- **Tempo-native**: Built around Tempo data sources and trace-derived metrics; behavior should stay honest to what the backend can answer.
- **Connected to Grafana**: Entry from Explore, dashboards, and Assistant; exit to Explore and shareable links—not a siloed experience.
- **Accessible breadth**: Useful for users who are not TraceQL experts while still supporting power-user workflows (filters, comparisons, external tools).
