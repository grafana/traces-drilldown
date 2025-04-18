---
description: Investigate trends and spikes to identify issues.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/investigate/
keywords:
  - Traces Drilldown
  - Investigate
title: Investigate trends and spikes
menuTitle: Investigate trends and spikes
weight: 600
---

# Investigate trends and spikes

Grafana Traces Drilldown provides powerful tools that help you identify and analyze problems in your applications and services.

Using these steps, you can use the tracing data to investigate issues.

1. [Select **Root spans** or **All spans**](choose-span-data) to look at either the first span in a trace (the root span) or all span data.
1. [Choose the metric](choose-red-metric) you want to use: rates, errors, or duration.
1. [Add filters](add-filters) to refine the view of your data.
1. [Analyze data](analyze-tracing-data) using **Breakdown**, **Comparison**, **Service structure**, **Root cause analysis**, **Traces**, and **Service structure** tabs.

You can use these steps in any order and move between them as many times as needed.
Depending on what you find, you may start with root spans, delve into error data, and then select **All spans** to access all of the tracing data.

{{< docs/play title="the Grafana Play site" url="https://play.grafana.org/a/grafana-exploretraces-app/explore" >}}

## Example of traces drilldown in action

The screenshot above illustrates the **Traces Drilldown** app in Grafana.

Using the **Breakdown**, **Comparison**, **Structure**, and **Trace list** tabs, you can drill down into specific issues and gain actionable insights into your system's performance and reliability.

1. **Data source selection**:
   At the top left, you select the data source for your traces. In this example, the data source is set to `grafanacloud-traces`.

2. **Filters**:
   The filter bar helps you refine the data displayed. You can apply filters such as `Root spans`, `All spans`, or specific label values to narrow the scope of your investigation.

3. **Select metric type**:
   Choose between **Rate**, **Errors**, or **Duration** metrics. In this example, the **Span rate** metric is selected, showing the number of spans per second.
   - The **Span rate** graph (top left) shows the rate of spans over time.
   - The **Errors** graph (top right) displays the error rate over time, with red bars indicating errors.
   - The **Duration** heatmap (bottom right) visualizes the distribution of span durations, helping you identify latency patterns.

5. **Breakdown tab**:
   The **Breakdown** tab (highlighted in the screenshot) organizes attributes by their correlation with the selected metric. For example:
   - The tab groups attributes by `service.name` (e.g., `frontend-proxy`, `frontend-web`, `load-generator`).
   - Each group shows the rate of requests per second, with errors highlighted in red.

6. **Group by and scope options**:
   - The **Group by** lets you group metrics by attributes such as `service.name`, `service.namespace`, or `service.version`.
   - The **Scope** selector lets you toggle between **Resource** and **Span** views.

7. **Add to filters**:
   Each attribute group includes an **Add to filters** option, enabling you to refine your investigation further by focusing on specific services or attributes.

8. **Time range selector**:
   At the top right, you can adjust the time range for the displayed data using the time picker. In this example, the time range is set to the last 30 minutes.


