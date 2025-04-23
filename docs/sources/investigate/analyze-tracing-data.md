---
description: Analyze tracing data using comparison, root cause analysis, and traces view to investigate trends and spikes.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/investigate/
keywords:
  - Traces Drilldown
  - Analyze
title: Analyze tracing data
menuTitle: Analyze tracing data
weight: 500
---

# Analyze tracing data

To further analyze the filtered spans, use the dynamically changing tabs, **Comparison**, **Structure**, **Root cause analysis**, and **Trace list**.

When you select a RED metric, the tabs change to match the context.

Each tab provides a brief explanation about the information provided.

## Use the Breakdown tab

The **Breakdown** tab splits the selected metric by the values of a chosen resource or span attribute.
When you're using **Duration** metrics, **Breakdown** shows the 90th percentile duration for every value of the selected attribute orders the sequence of attributes by their average duration.
When you select **Rate**, **Breakdown** orders the sequence of attributes by their rate of requests per second, with errors colored red.

You can change the **Scope** to show **Resource** or **Span**.

Using the **Group by** selector, you can group the selected metric by different attributes.
For example, if you have selected **Errors** as a metric type and then choose the `service.name` attribute, the displayed results show the number of errors sorted by the `service.name` with the most matches.

![Errors metric showing the **Breakdown** tab without filters](/media/docs/explore-traces/traces-drilldown-errors-breakdown-tab.png)

The app defaults to `service.name` and displays other commonly used resource level attributes such as `cluster`, `environment`, and `namespace`.
In the drop-down list, you can choose any resource level attribute to group by.

## Use the Comparison tab

The **Comparison** tab helps you surface and rank which span attributes are most correlated with the selected metric so you can immediately spot what's driving your trace-level issues.

![Comparison view](/media/docs/explore-traces/traces-drilldown-root-spans-duration-comparison-tab.png)

Upon selecting a metric, the tab computes, for each resource or span attribute, how strongly that attribute value differs between the selected subset (**selection**) and all other spans (**baseline**).
It lists attribute‑value pairs in descending order of that difference, so the top entries are those most uniquely associated with your signal of interest.

- If you're viewing the **Errors** metric, the **selection** contains all erroring spans, while the **baseline** contains all non-erroring spans.

- If you're viewing the **Duration** metric, by default the **selection** contains the slowest spans above the 90th percentile, while the **baseline** contains all other spans. You can manually adjust the selection on the duration heatmap.

The behavior of the comparison also differs depending upon the RED metric you've chosen.
For example, if you're viewing **Errors** metrics, the comparison shows the attribute values that correlate with errors.
However, if you're viewing **Duration** metrics, the comparison shows the attributes that correlate with high latency.

### Focus on individual attributes with **Inspect**

**Inspect** lets you breakdown and see the individual attribute values from a given comparison
If you have a comparison like this, you can highlight the value with the highest difference (here, `attribute=value` is `span.app.product.id=OLJCESPC7Z` ), but you can't easily see all other values.

![Select Inspect on an attribute](/media/docs/explore-traces/traceas-drilldown-comparison-inspect-example.png)

When selecting **Inspect**, the app shows only one attribute, `span.app.product.id`, but with a visualization for every value.

![Inspect focuses the results on the selected attribute](/media/docs/explore-traces/traces-drilldown-comparison-inspect-post-select.png)

## Use the Structure tab

The Structure tab lets you extract and view aggregate data from your traces.
The name of the tab differs depending on the metric you are viewing:

* Rate provides **Service structure**
* Errors provides **Root cause errors**
* Duration metrics provides **Root cause latency**

For **Rate**, the **Service structure** tab shows you how your applications talk to each other to fulfill requests.
Use this tab to analyze the service structure of the traces that match the current filters.

![Service structure tab](/media/docs/explore-traces/traces-drilldown-span-rate-service-structure.png)

For **Errors**, the **Root cause errors** tab shows the structure of errors beneath your selected filters. Use this tab to immediately see the chain of errors that are causing issues higher up in traces.

![Link to span data from Root cause errors](/media/docs/explore-traces/traces-drilldown-errors-root-cause-errors.png)

When you select **Duration** metrics, the **Root cause latency** tab shows the structure of the longest running spans so you can analyze the structure of slow spans.

The pictured spans are an aggregated view compiled using spans from multiple traces.

![Duration metric showing root cause latency](/media/docs/explore-traces/traces-drilldown-duration-root-cause.png)

## Use the Trace list tab

Each RED metric has a trace list:

* **Rate** provides a tab that lists **Traces**.
* **Errors** provides a list of **Errored traces**.
* **Duration** (**spans**) lists **Slow traces**.

From this view, you can add additional attributes to new columns using **Add extra columns**.

{{< video-embed src="/media/docs/explore-traces/traces-drilldown-add-column-trace-view.mp4" >}}

## Change the selected time range

Use the time picker at the top right to modify the data shown in Traces Drilldown.

You can select a time range of up to 24 hours in duration.
This time range can be any 24-hour period in your configured trace data retention period.
The default is 30 days.

For more information about the time range picker, refer to [Use dashboards](https://grafana.com/docs/grafana/<GRAFANA_VERSION>/dashboards/use-dashboards/#set-dashboard-time-range).