---
description: Analyze tracing data using comparison, root cause analysis, Comparison, and traces view to investigate trends and spikes.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/investigate/
keywords:
  - Traces Drilldown
  - Analyze
title: Analyze tracing data
menuTitle: Analyze tracing data
weight: 600
---

# Analyze tracing data

To further analyze the filtered spans, use the dynamically changing tabs, **Comparison**, **Structure**, **Root cause analysis**, and **Trace list**.

When you select a RED metric, the tabs underneath the metrics selection changes match the context.

Each tab provides a brief explanation about the information provided.

## Comparison

The **Comparison** tab highlights attributes that are correlated with the selected metric.

The behavior of the comparison also differs depending upon the RED metric you've chosen.
For example, if you're viewing **Error** metrics, the comparison shows the attribute values that correlate with errors.
However, if you're viewing **Duration** metrics, the comparison shows the attributes that correlate with high latency.

![Comparison view](/media/docs/explore-traces/explore-traces-rate-comparison-v2.4.png)

## Structure

The structural tab lets you extract and view aggregate data from your traces.

* Rate provides **Service structure**
* Errors provides **Root cause errors**
* Duration metrics provides **Root cause latency**

For **Rate**, the **Service structure** tab shows you how your applications "talk" to each other to fulfill requests.
Use this tab to analyze the service structure of the traces that match the current filters.

![Service structure tab](/media/docs/explore-traces/explore-traces-rate-service-structure-v0.9.png)

For **Errors**, the **Root cause errors** tab shows structure of errors beneath your selected filters. Use this tab to immediately see the chain of errors that are causing issues higher up in traces.

![Link to span data from Root cause errors](/media/docs/explore-traces/explore-traces-errors-root-cause-v0.9.png)

When you select **Duration** metrics, the **Root cause latency** tab shows the structure of the longest running spans so you can analyze the structure of slow spans.

The pictured spans are an aggregated view compiled using spans from multiple traces.

![Duration metric showing root cause latency](/media/docs/explore-traces/explore-traces-duration-root-cause-latency.png)

## Trace list

Each RED metric has a trace list:

* **Rate** provides a tab that lists **Traces**.
* **Errors** provides a list of **Errored traces**.
* **Duration** lists **Slow traces**.

![Example trace list for Duration showing slow traces](/media/docs/explore-traces/explore-traces-duration-slow-traces-v0.9.png)

## Change the selected time range

Use the time picker at the top right to modify the data shown in Traces Drilldown.

You can select a time range of up to 24 hours in duration.
This time range can be any 24-hour period in your configured trace data retention period.
The default is 30 days.

For more information about the time range picker, refer to [Use dashboards](https://grafana.com/docs/grafana/latest/dashboards/use-dashboards/#set-dashboard-time-range).