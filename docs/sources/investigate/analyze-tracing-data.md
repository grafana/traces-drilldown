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

The **Breakdown** tab highlights attributes that are correlated with the selected metric.
When you're using **Duration** metrics, **Breakdown** orders the sequence of attributes by their average duration.
When you select **Rate**, **Breakdown** orders the sequence of attributes by their rate of requests per second, with errors colored red.

You can change the **Scope** to show **Resource** or **Span**.

Using the **Group by** selector, you can group the selected metric by different attributes.
For example, if you have selected **Errors** as a metric type and then choose the `service.name` attribute, the displayed results show the number of errors sorted by the `service.name` with the most matches.

![Errors metric showing the **Breakdown** tab without filters](/media/docs/explore-traces/traces-drilldown-errors-breakdown-tab.png)

The app defaults to `service.name` and displays other commonly used resource level attributes such as `cluster`, `environment`, and `namespace`.
In the drop-down list, you can choose any resource level attribute to group by.

## Use the Comparison tab

The **Comparison** tab highlights attributes that are correlated with the selected metric.

The behavior of the comparison also differs depending upon the RED metric you've chosen.
For example, if you're viewing **Errors** metrics, the comparison shows the attribute values that correlate with errors.
However, if you're viewing **Duration** metrics, the comparison shows the attributes that correlate with high latency.

![Comparison view](/media/docs/explore-traces/traces-drilldown-root-spans-duration-comparison-tab.png)

## Use the Structure tab

The Structure tab lets you extract and view aggregate data from your traces. 
The name of the tab differs depending on the metric you are viewing: 

* Rate provides **Service structure**
* Errors provides **Root cause errors**
* Duration (**spans** in the UI) metrics provides **Root cause latency**

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