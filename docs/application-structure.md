# Application structure

**What this file is for:** A **product map** (entry → exploration → trace view → exit/embed). For *why* the app exists, see `project-intent.md`. Use this doc when implementing or reviewing UI and URL behavior.

## Entry points

### Sidebar navigation

The primary entry is **Drilldown → Traces** in Grafana’s menu. That loads the main exploration route (`/a/grafana-exploretraces-app/explore`) with the selected Tempo data source (last-used datasource is remembered in local storage when possible).

### Extension links

Users can land in Traces Drilldown from elsewhere in Grafana:

- **Dashboard panel menu**: “Open in Traces Drilldown” when the panel uses a Tempo query—filters and time range are carried over when they can be mapped from structured filters or parsed TraceQL.
- **Explore toolbar**: Link into the queryless Traces Drilldown experience from Explore when working with Tempo.
- **Grafana Assistant**: Navigation extension to open Traces Drilldown with appropriate context.

### Embedded components

The plugin exposes:

- **Embedded trace exploration**: A full exploration view scoped by props/state for use inside other apps or surfaces.
- **Open in Traces Drilldown button**: Opens the app with a configured exploration context.

### Direct URLs

Deep links encode datasource, primary signal, ad-hoc filters, metric (rate / errors / duration), group-by, active tab (`actionView`), time-range selection for comparison, and optionally `traceId` / `spanId`. Bookmarks and share actions rely on this URL state.

## Main exploration layout

The root experience is a **scene-based** tree (`TraceExploration` → body → `TracesByServiceScene` and related children) with URL sync for exploration and trace focus.

### Top row (header)

- **Data source**: Tempo data source selector.
- **Controls**: Time picker and refresh (standard scene controls).
- **Plugin info** (info icon): Version, changelog, contribute, documentation, give feedback (when enabled in Grafana), report an issue, and Grafana build.
- **Entity/assertions** (when applicable): Contextual widgets tied to the current service scope.

### Filters row

- **Primary signal**: Root spans, all spans, server spans, consumer spans, database calls—each applies a different span filter baseline.
- **Ad-hoc filters**: Additional attribute filters to narrow the RED query and downstream tabs.
- **Trace ID**: Enter a trace ID to open that trace in the drawer without browsing from the list.

### RED panel and metric

Below the filters, a large **RED visualization** reflects the current metric:

- **Rate** — request/span rate over time.
- **Errors** — error signal for investigation.
- **Duration** — latency distribution (histogram-style views and thresholds where relevant).

Users can **click or select a time range** on the RED chart to scope a comparison or detailed view (behavior varies by metric and tab). A **group-by** control changes how the metric is split (e.g. by service or span name).

### TraceQL configuration feedback

If Tempo/traceQL setup issues are detected, a warning banner may appear at the top of the exploration so users know data or queries may be incomplete.

## Tabs (action views)

The tab bar switches `actionView` in the URL. Typical order and intent:

1. **Breakdown** — Slice the selected metric by attributes or dimensions to find hotspots.
2. **Structure** — Hierarchical / structural view of traces or spans for the current filters and metric.
3. **Comparison** — Compare two time windows (often after selecting a region on the RED chart) to see what changed.
4. **Exceptions** — Shown when the **Errors** metric is selected; surfaces exception-oriented detail.
5. **Trace list** — Tabular list of traces/spans; links to open traces in Explore in a new tab where supported.
6. **Adaptive traces** — Shown only when an instrumentation tailsampling policy filter is present **and** the optional Adaptive Traces plugin component is available; otherwise hidden.

The **Share** control in the tab bar captures the current exploration URL for teammates.

## Trace view

The trace view is the detailed view of a single trace. It appears in a **side drawer** over the exploration (or as a full-width “Back to all traces” view when the app is embedded). The URL can include `traceId` and optionally `spanId`, so a specific trace—and span—can be shared or bookmarked.

### Opening the trace view

Users reach the trace view in several ways:

- **Trace list tab**: Click a trace in the trace list to open it in the drawer. If the list row has a span context, that span can be passed so the view opens with that span focused.
- **Trace ID field**: In the header filters row, entering a trace ID and confirming (e.g. Enter) loads that trace in the drawer without using the list.
- **Exceptions tab**: From exception results, opening a trace (e.g. from the accordion) opens the same drawer with that trace.
- **Direct link**: A URL that includes `traceId` (and optionally `spanId`) opens the app with the drawer already showing that trace.

### What the trace view shows

The drawer content is a **full trace visualization** (the standard Grafana traces panel): the full trace with all spans, their timing, and service/operation hierarchy. When a `spanId` is present (from the list, exceptions, or URL), the view **focuses that span** so the user lands on the relevant part of the trace.

While the trace is loading, a skeleton layout is shown. If the trace is not found (e.g. 404), an error message is shown; when the data source uses time-shifted search, the message can explain that the trace may exist outside the current time range. Other failures show a short error state. If no trace is selected, the drawer shows an empty state (“No trace selected”).

### Closing and context

Closing the drawer (or choosing “Back to all traces” in embedded mode) clears `traceId` and `spanId` from the URL and returns the user to the exploration with filters and tab unchanged. The exploration remains in the background while the drawer is open, so users can keep the same metric, filters, and tab when they close the trace.

## Exit points and handoffs

- **Share exploration**: Copy link with full URL state.
- **Open in Explore**: From trace/span list actions, jump to Grafana Explore with trace context.
- **Open in Traces Drilldown** (converse path): Other surfaces use the exposed button or extension links to pass users into this app.
