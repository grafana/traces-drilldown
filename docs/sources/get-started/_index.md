---
description: Learn how to get started with Traces Drilldown
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/get-started/
keywords:
  - Traces Drilldown
  - Get started
title: Get started with Traces Drilldown
menuTitle: Get started
weight: 300
---

# Get started with Traces Drilldown

You can use traces to identify errors in your apps and services and then to optimize and streamline them.

When working with traces, start with the big picture.
Investigate using primary signals, RED metrics, filters, and structural or trace list tabs to explore your data.
To learn more, refer to [Concepts](../concepts/).

{{< admonition type="note" >}}
Expand your observability journey and learn about [the Drilldown apps suite](https://grafana.com/docs/grafana-cloud/visualizations/simplified-exploration/).
{{< /admonition >}}

{{< youtube id="a3uB1C2oHA4" >}}

## Before you begin

To use Grafana Traces Drilldown with Grafana Cloud, you need:

- A Grafana Cloud account
- A Grafana stack in Grafana Cloud with a configured Tempo data source

To use Traces Drilldown with self-managed Grafana, you need:

- Your own Grafana v11.2 or later instance with a configured Tempo data source
- Installed Traces Drilldown plugin

For more details, refer to [Access Traces Drilldown](../access/).

## Explore your tracing data

Most investigations follow these steps:

1. Select the primary signal.
1. Choose the metric you want to use: rates, errors, or duration.
1. Define filters to refine the view of your data.
1. Use the structural or trace list to drill down into the issue.

{{< docs/play title="the Grafana Play site" url="https://play.grafana.org/a/grafana-exploretraces-app/explore" >}}

## Example: Investigate source of errors

As an example, you want to uncover the source of errors in your spans.
For this, you need to compare the errors in the traces to locate the problem trace.
Here's how this works.

### Choose the level of data and a metric

To identify the trouble spot, you want to use raw tracing data instead of just the root span, which is the first span of every trace.
Select **All spans** in the Filters, then choose the **Errors** metric.

![Select All spans to view all raw span data and Errors as your metric](/media/docs/explore-traces/traces-drilldown-allspans-errors.png)

### Correlate attributes

To correlate attribute values with errors, use the **Comparison** tab.
This tab surfaces attributes values that heavily correlate with erroring spans.
The results are ordered by the difference in those attributes by the highest ones first. This helps
you see what's causing the errors immediately.
You can see here that 99.34% of the time, the span name was equal to `HTTP GET /api/datasources/proxy/uid/:uid/*` the span was also erroring.

![Errors are immediately visible by the large red bars](../images/explore-traces-errors-metric-flow.png)

### Inspect the problem

To dig deeper, select **Inspect** to focus in on the problem.
It's easy to spot the problem: the tall, red bar indicates that the problems are happening with  `HTTP GET /api/datasources/proxy/uid/:uid/*`.
Next, use **Add to filters** to focus just on the erroring API call.

![Add to filters to focus on the API call](../images/explore-traces-errors-add-filters-flow.png)

### Use Root cause errors

Select **Root cause errors** for an aggregated view of all of the traces that have errors in them.
To view additional details, right-click on a line and select **HTTP Outgoing Request**.

![Contextual menu available in the Root cause errors tab](../images/explore-traces-errors-rcause-menu.png)

To examine a single example transaction, click on an entry to open one of the individual traces used to construct that aggregate view.

![Link to span data from Root cause errors](../images/explore-traces-errors-root-cause.png)
