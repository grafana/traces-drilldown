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
Expand your observability journey and learn about [the Drilldown apps suite](../../).
{{< /admonition >}}

<!-- Commenting out this video until we can replace it with a new one -->
<!-- {{< youtube id="a3uB1C2oHA4" >}} -->

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

![Select All spans to view all raw span data and Errors as your metric](/media/docs/explore-traces/traces-drilldown-allspans-errors-red-v1.2.png "Select All spans to view all raw span data and Errors as your metric")

If you're seeing errors in your traces, here are three common misunderstandings to avoid.

First, not all red spans are application failures. A span marked 'error' might just indicate a timeout or expected validation failure. Check the error message and type before assuming something's broken.

Second, errors cascade. When one service fails, downstream spans inherit that error status. Look for the root span with the error to find the actual source, not just the last service in the chain.

Finally, remember that error count isn't the same as error rate. Ten errors might seem alarming, but if you handled ten thousand requests, that's only 0.1%. Always consider the context.

Check the span attributes and error details. They'll tell you what really happened.

### Correlate attributes

Use the **Comparison** tab to correlate attributes values with errors. The results are ordered by the difference in those attributes by the highest ones first. This helps
you see what's causing the errors immediately.
The **Comparison** tab analyzes the difference between two sets of traces:

- Green bars (Baseline): Normal/healthy trace behavior
- Red bars (Selection): Current selection with status = error filter

The view compares your selection (red) to the baseline (green) and ranks attributes by the largest difference.
This indicates a significant spike in `HTTP 500` (Internal Server Error) responses during your selected time range.
The visualization highlights that:

- 500 errors aren't normal for this system, they don't appear in the baseline comparison
- There were 500 traces containing HTTP 500 status codes during the error period
- This represents a 100% deviation from normal behavior

Click **Add to filters** to narrow the investigation to these values, or choose **Inspect** to explore the full distribution.

![Errors are immediately visible by the large red bars](/media/docs/explore-traces/traces-drilldown-errors-comparison-http-status-code-v1.2.png "Errors are immediately visible by the large red bars")

Hovering over any of the bars shows a tooltip with information about the value and the percentage of the total.

![Tooltip showing the value and the percentage of the total](/media/docs/explore-traces/traces-drilldown-errors-hover-tooltip.png "Tooltip showing the value and the percentage of the total")

### Inspect the problem

Select **Inspect** on a card to drill into the distribution for that attribute.
In this example, selecting **Inspect** on `span.http.status_code` shows the distribution by value. Using this view shows the following:

- Normal state: All requests completed successfully (`200`/`201`)
- Error state: Significant portion return `500` errors
- Root cause: something caused the internal server errors during the selected time frame

Use **Add to filters** on the `500` card to keep only error spans and continue the investigation.

![Inspect the HTTP 500 errors](/media/docs/explore-traces/traces-drilldown-errors-comparison-http-status-attr-selected-v1.2.png "Inspect the HTTP 500 errors")

### Use Root cause errors

Select **Root cause errors** for an aggregated view of all of the traces that have errors in them.
This screen provides critical insights into where and how the `HTTP 500` error occurred in your distributed system.

Using this view, you can see that the Frontend > Recommendations services have problems. Specifically, that the `/api/pizza` endpoint chain is failing.

![Root cause errors tab](/media/docs/explore-traces/traces-drilldown-root-cause-errors-v1.2.png "Root cause errors tab")

To view additional details, click the link icon and select **View linked span** to open the trace drawer.

![View linked spans to see details of errors](/media/docs/explore-traces/traces-drilldown-root-cause-trace-drawer-v1.2.png "View linked spans to see details of errors")

Errors spans have a red icon next to them. Select the down arrow next to the errored span to see details.

![Select the down arrow next to the errored span to see details](/media/docs/explore-traces/traces-drilldown-root-cause-trace-expanded-v1.2.png "Select the down arrow next to the errored span to see details")