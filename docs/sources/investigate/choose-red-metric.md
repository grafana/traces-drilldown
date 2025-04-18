---
description: Select a rate, error, or duration metric for your investigation.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/investigate/
keywords:
  - Traces Drilldown
  - Investigate
title: Select a metric for your investigation
menuTitle: Select a RED metric
weight: 300
---

# Select a metric for your investigation

Grafana Traces Drilldown provides powerful tools that help you identify and analyze problems in your applications and services.

Using these steps, you can use the tracing data to investigate issues.

1. Select the whether to use **Root spans** or **All spans**.
1. Choose the metric you want to use: rates, errors, or duration.
1. Define filters to refine the view of your data.
1. Use the structural or trace list to drill down into the issue.

## Choose a RED metric

Traces Drilldown uses RED metrics generated from your tracing data to guide your investigation.
In this context, RED metrics mean:

* **Rates** show the rate of incoming spans per second.
* **Errors** show spans that are failing.
* **Duration** displays the amount of time those spans take; represented as a heat map that shows response time and latency.

When you select a RED metric, the tabs underneath the metrics selection changes match the context.
For example, selecting **Duration** displays **Root cause latency** and **Slow traces tabs**.
Choosing **Errors** changes the tabs to **Root cause errors** and **Errored traces**. Rate provides **Service structure**, and **Traces** tabs.
These tabs are used when you [analyze tracing data](#analyze-tracing-data).

To choose a RED metric:

1. Select a graph to select a **Rate**, **Errors**, or **Duration** metric type. Notice that your selection changes the first drop-down list on the filter bar.
1. Optional: Select the signal you want to observe. **Full traces** are the default selection.
1. Look for spikes or trends in the data to help identify issues.

{{< admonition type="tip" >}}
If no data or limited data appears, refresh the page. Verify that you have selected the correct data source in the Data source drop-down as well as a valid time range.
{{< /admonition >}}

