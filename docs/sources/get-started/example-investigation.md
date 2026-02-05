---
title: Investigation walkthrough
menuTitle: Investigation walkthrough
description: A hands-on walkthrough of investigating errors using Traces Drilldown on play.grafana.org.
weight: 265
keywords:
  - Traces Drilldown
  - Investigation
  - Walkthrough
---

# Investigation walkthrough

Follow this step-by-step walkthrough to investigate errors using Grafana Traces Drilldown on [play.grafana.org](https://play.grafana.org). This tutorial guides you through the basic workflow so you can learn by doing.

{{< docs/play title="the Grafana Play site" url="https://play.grafana.org/a/grafana-exploretraces-app/explore" >}}

Because `play.grafana.org` is a public demo, data changes over time and may reset. If you don’t see data, try refreshing and ensure the time range and data source are correct.

## Scenario

You've noticed errors in your application and want to investigate which requests are failing and why.

## Investigate on play.grafana.org

Use the public demo environment to explore traces with Traces Drilldown.

### Open Traces Drilldown

1. Open [play.grafana.org](https://play.grafana.org).
1. In the left menu, navigate to **Drilldown > Traces**.
1. Traces Drilldown opens with the **grafanacloud-demoinfra-traces** data source selected.

### Choose span data

By default, Traces Drilldown shows **Root spans** (one span per trace) for accurate, service‑level insight.
For deeper error investigations, start with **Root spans**, then switch to **All spans** to include downstream or internal errors in child spans.
Refer to [Choose root or full span data](../../investigate/choose-span-data/) for more information.

### Select Errors metric

1. In the **Select metric type** section, you'll see three options:
   - **Spans (rate)**: Overall request/span rate
   - **Errors**: Failed requests/spans
   - **Duration**: Latency distribution (heatmap)
1. Click **Errors** to focus on failed requests.
1. The view updates to show error-specific tabs: **Breakdown**, **Root cause errors**, **Comparison**, **Exceptions**, and **Errored traces**.

### View errored traces

1. Click the **Errored traces** tab to see individual traces with errors.
1. The table shows traces with columns:
   - **Start time**: When the request occurred
   - **Status**: Shows `error` for all traces in this view
   - **Trace Service**: The service that handled the request (for example, `frontend`)
   - **Trace Name**: The operation name (for example, `GET /api/quotes`, `POST /api/pizza`)

### Examine a specific trace

1. Click **Open in new tab** on a trace row to view the full trace details.
1. The trace view opens in Explore showing:
   - **Trace header**: Service name, HTTP method, and status code (for example, `502`)
   - **Trace ID**: The unique identifier for this request
   - **Duration**: Total time for the request (for example, `250.41ms`)
   - **Overview timeline**: Visual representation of all spans with error spans highlighted
1. The **span timeline** shows the sequence of operations:
   - Parent spans (for example, `frontend GET /api/quotes`)
   - Child spans (for example, `HTTP GET`)
   - Error spans are highlighted in red/orange
1. Use the **Filters** to focus on:
   - **Critical path**: The slowest path through the trace
   - **Errors**: Only spans with errors
   - **High latency**: Slow spans

### Explore error patterns with breakdown

1. Go back to the **Breakdown** tab to see error patterns.
1. The **Attributes** panel shows available dimensions:
   - `resource.service.name`: Which services have errors
   - `span.name`: Which operations are failing
   - `span.status`: Error status codes
   - `span.http.status_code`: HTTP response codes
1. Click on an attribute to break down errors by that dimension.

### What you learned

By following this walkthrough, you learned how to:

- Navigate Traces Drilldown and select the **Errors** metric
- View errored traces in a table format
- Examine individual trace details
- Use **Breakdown** to identify error patterns

For more advanced investigation techniques like using the **Comparison** tab and **Inspect** feature, refer to the [Example: Investigate source of errors](../../get-started/#example-investigate-source-of-errors) section.

## Next steps

Now that you've completed the basic walkthrough:

- [Determine your use case](../../determine-use-case/) to choose the right investigation approach
- [Choose a RED metric](../../investigate/choose-red-metric/) to guide what you analyze next
- [Add filters](../../investigate/add-filters/) to refine the scope of your investigation
- [Analyze tracing data](../../investigate/analyze-tracing-data/) with Breakdown, Comparison, and Root cause views
- [Choose root or full span data](../../investigate/choose-span-data/) depending on your use case
