---
description: Learn about the user interface for Traces Drilldown.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/ui-reference/
keywords:
  - Traces Drilldown
  - UI reference
refs:
  use-dashboards-time:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/dashboards/use-dashboards/#set-dashboard-time-range
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/visualizations/dashboards/use-dashboards/#set-dashboard-time-range
title: Traces Drilldown UI reference
menuTitle: UI reference
weight: 700
---

# Traces Drilldown UI reference

Grafana Traces Drilldown helps you focus your tracing data exploration.
Some sections change based on the metric you choose.
For details on workflows, refer to [Analyze tracing data](../investigate/analyze-tracing-data/).

![Numbered sections of the Traces Drilldown app](/media/docs/explore-traces/2.0/screenshot-grafana-traces-drilldown-screen-parts-numbered-v2.0.3.png)

1. **Data source selection**:
   At the top left, you select the data source for your traces, either a Grafana Cloud Traces or Tempo data source.

1. **Filters**:
   The filter bar helps you refine the data displayed.
   You can select the primary signal (**Root spans** or **All spans**, plus **Server spans**, **Consumer spans**, or **Database calls** from the adjacent drop-down). You can also add specific label values to narrow the scope of your investigation.

1. **Select metric type**:
   Choose between **Rate**, **Errors**, or **Duration** metrics. In this example, the **Rate** metric is selected, showing the number of spans per second.
   - The **Rate** graph (top left) shows the rate of spans over time.
   - The **Errors** graph (top right) displays the error rate over time, with red bars indicating errors.
   - The **Duration** heat map (bottom right) visualizes the distribution of span durations and can help identify latency patterns.

<!-- TODO: Uncomment when Grafana 13 ships and tracesDrilldownTimeSeeker toggle reaches GA.
1. **Time range seeker**:
   Below the RED metric panel, the time range seeker displays a compact overview chart spanning a wider time window (up to several days) so you can spot spikes and trends beyond the currently selected range.

   Drag across the chart to select a time window, then use the floating controls to refine it:
   - **Pan left / Pan right**: Shift the visible window in either direction.
   - **Zoom in / Zoom out**: Narrow or widen the context around your selection.
   - **Focus selection**: Reset the visible window to your current selection.
   - **Set range**: Open the time range picker to enter an exact range.

   The seeker loads data in batches and uses sampling for faster responses over long time ranges. A warning icon appears if the time range requires loading a large amount of data.

   The time range seeker requires the `tracesDrilldownTimeSeeker` feature toggle to be enabled. Refer to [Grafana feature toggles](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/feature-toggles/) for more information.
-->

1. **Investigation-focused tabs**:
   Each metric type has its own set of tabs that help you explore your tracing data. These tabs differ depending on the metric type you've selected.
   For example, when you use **Rate**, the investigation tabs show **Breakdown**, **Service structure**, **Comparison**, and **Traces**.
   - **Exceptions** (**Errors** only): Group exception messages with counts, trend sparkline, emitting service, and last-seen.
   - Percentiles (Duration only): Choose `p50`, `p75`, `p90`, `p95`, `p99` for Duration views. Default: `p90`. If you clear all, `p90` applies automatically.

1. **Include and Exclude**:
   Each attribute group includes **Include** and **Exclude** buttons. Select **Include** to add a matching filter (`=`) or **Exclude** to add a negating filter (`!=`) to your current investigation.

1. **Time range selector**:
   At the top right, you can adjust the time range for displayed data using the time picker. In this example, the time range is set to the last 1 hour. Refer to [Set dashboard time range](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/use-dashboards/#set-dashboard-time-range) for more information.

   You can also open a specific trace by ID by entering the trace ID into the **Trace ID** input and pressing Enter. Refer to [Open a trace by ID](../investigate/analyze-tracing-data/#open-a-trace-by-id) for more information.

   Use the **Save** (save icon) and **Load** (folder-open icon) buttons in the header to save your current filters as a named query or load a previously saved one.
   The **Save** button appears when at least one filter is applied.
   Refer to [Save and load queries](../investigate/save-load-queries/) for more information.

1. **Attributes sidebar**:
   Use the **Attributes** sidebar to select and manage attributes across views. Search attributes with regular expressions. Press **Escape** or click **Clear** to reset the search.

   Click the star icon to add or remove a favorite. Drag and drop favorites to reorder them. Switch between scopes: **Favorites**, **All**, **Resource**, **Span**. A filter icon marks attributes already applied in the **Filters** bar.

   In **Breakdown** and **Comparison** views, selecting an attribute sets the current **Group by** attribute. In the trace list view, select multiple attributes to add or remove table columns. The app saves favorites in your browser.

## Share your investigation

Select **Copy url** (link icon) in the tab bar to copy a URL that captures your current exploration state, including the data source, filters, selected metric, active tab, and time range.
Share the URL so others can open the same view.

## View service insights

{{< admonition type="note" >}}
Service insights require the Grafana Asserts app and are available on Grafana Cloud.
{{< /admonition >}}

When the Grafana Asserts app is available, Traces Drilldown adds context for the service you're investigating:

- **Insights**: Turn on the **Insights** toggle on the RED metric time series to overlay annotations that mark notable events on the timeline.
- **Entity assertions**: An assertions widget in the header summarizes active assertions for the selected service.

## Query result streaming

When you first open Traces Drilldown, you may notice a green dot on the upper right corner of any of the metrics graphs.

This green dot indicates that Traces Drilldown is displaying data that's still being received, or streamed.
Streaming lets you view partial query results before the entire query completes.

## Open in Explore app

You can open a trace in the Explore app by clicking the **Open in Explore** button.
This opens the trace in the Explore app, where you can use the full power of Explore to analyze the trace.

If you're using Explore, you can open a trace in Traces Drilldown by clicking the **Open in Traces Drilldown** button.
