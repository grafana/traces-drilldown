---
description: Investigate trends and spikes to identify issues.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/investigate/add-filters/
keywords:
  - Traces Drilldown
  - Investigate
refs:
  use-dashboards:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/dashboards/use-dashboards/#set-dashboard-time-range
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/visualizations/dashboards/use-dashboards/
title: Add filters
menuTitle: Add filters
weight: 600
---

# Refine your investigation using filters

Use filters to refine your investigation.

Filters are available on the **Breakdown** and **Comparison** views.
Refer to [Analyze tracing data](../analyze-tracing-data) for how to use these views.

## Add filters

Each time you add a filter, the condition appears in the list of filters at the top of the page.
The list of filters expands as you investigate and explore your tracing data using Traces Drilldown.

1. Refine your investigation by adding filters.
1. Optional: Use the tabs underneath the metrics selection to provide insights into breakdowns, comparisons, latency, and other explorations.
1. Choose filters to hone in on the problem areas. Each filter that you select adds to the **Filter** bar at the top of the page. You can select filters on the **Comparison** and **Breakdown** tabs in the following ways:
    * Select **Add to filters**.
    * Use the **Filter** bar near the top.

![Change filters for your investigation](/media/docs/explore-traces/traces-drilldown-filters-ga-1.png)

### Example

Let's say that you want to investigate a spike in errored root spans longer than 200ms.

1. Select **Root spans**.
1. Select the **Errored traces** tab.
1. In the Filter by labeled values, enter `span:duration`, select greater than (`>`) from the drop-down list, and then enter `200ms`.
1. Once the data updates, sort the **Errored traces** table by the **Duration** column.

{{< video-embed src="/media/docs/explore-traces/traces-drilldown-errors-root-span-duration-filter.mp4" >}}

## Modify a filter

Selecting an option for a filter automatically updates the displayed data.
If there are no matches, the app displays a “No data for selected query” message.

To modify an applied filter:

1. Select the filter to modify in the filter bar.
1. Select an option from the drop-down list.

You can also click in the **Filter** bar to add filters using drop-down lists.

## Remove filters

To remove a filter, select **Remove filter** (**X**) at the end of the filter you want to remove.

## Change the time range

Use the time picker at the top right to modify the data shown in Traces Drilldown.

You can select a time range of up to 24 hours in duration.
By default, this time range can be any 24-hour period in your configured trace data retention period.
The default retention period is 30 days.
Your configuration may vary from these values.

For more information about the time range picker, refer to [Use dashboards](ref:use-dashboards).

