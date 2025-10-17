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
weight: 600
---

# Traces Drilldown UI reference

Grafana Traces Drilldown helps you focus your tracing data exploration.
Some sections change based on the metric you choose.
For details on workflows, refer to [Analyze tracing data](../investigate/analyze-tracing-data).

![Numbered sections of the Traces Drilldown app](/media/docs/explore-traces/traces-drilldown-screen-ui-oct25.png)

1. **Data source selection**:
   At the top left, you select the data source for your traces. In this example, the data source is set to `grafanacloud-traces`.

1. **Filters**:
   The filter bar helps you refine the data displayed.
   You can select the type of trace data, either **Root spans** or **All spans**. You can also add specific label values to narrow the scope of your investigation.

1. **Select metric type**:
   Choose between **Rate** (spans), **Errors**, or **Duration** metrics. In this example, the **Span rate** metric is selected, showing the number of spans per second.
   - The **Span rate** graph (top left) shows the rate of spans over time.
   - The **Errors** graph (top right) displays the error rate over time, with red bars indicating errors.
   - The **Duration** heatmap (bottom right) visualizes the distribution of span durations and can help identify latency patterns.

1. **Investigation-focused tabs**:
   Each metric type has its own set of tabs that help you explore your tracing data. These tabs differ depending on the metric type you've selected.
   For example, when you use Span rate, then the Investigation type tabs show **Breakdown**, **Service structure**, **Comparison**, and **Traces**.
    - Percentiles (Duration only): Choose `p50`, `p75`, `p90`, `p95`, `p99` for Duration views. Default: `p90`. If you clear all, `p90` applies automatically.

1. **Add to filters**:
   Each attribute group includes an **Add to filters** option, so you can add your selections into the current investigation.

1. **Time range selector**:
   At the top right, you can adjust the time range for the displayed data using the time picker. In this example, the time range is set to the last 30 minutes. Refer to [Set dashboard time range](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/use-dashboards/#set-dashboard-time-range) for more information.

   You can also open a specific trace by ID by entering the trace ID into the **Trace ID** input and pressing Enter or clicking **Submit**. Refer to [Open a trace by ID](../investigate/analyze-tracing-data#open-a-trace-by-id) for more information.

1. **Attributes sidebar**:
    Use the Attributes sidebar to select and manage attributes across views. Search attributes with regular expressions. Press **Escape** or click **Clear** to reset the search.

    Click the star icon to add or remove a favorite. Drag and drop favorites to reorder them. Switch between scopes: **Favorites**, **All**, **Resource**, **Span**. A filter icon marks attributes already applied in the **Filters** bar.

    In **Breakdown** and **Comparison** views, selecting an attribute sets the current **Group by** attribute. In **Trace list** view, select multiple attributes to add or remove table columns. The app saves favorites in your browser.

## Streaming query results

When you first open Traces Drilldown, you may notice a green dot on the upper right corner of any of the metrics graphs.

This green dot indicates that Traces Drilldown is displaying data that's still being received, or streamed.
Streaming lets you view partial query results before the entire query completes.

## Open in Explore app

You can open a trace in the Explore app by clicking the **Open in Explore** button.
This will open the trace in the Explore app, where you can use the full power of the Explore app to analyze the trace.

If you are using Explore, you can open a trace in Traces Drilldown by clicking the **Open in Traces Drilldown** button.