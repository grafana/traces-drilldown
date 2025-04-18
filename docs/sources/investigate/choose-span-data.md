---
description: Use root span or full span data for your investigation.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/investigate/
keywords:
  - Traces Drilldown
  - Investigate
title: Choose root or full span data
menuTitle: Choose span data
weight: 200
---

# Choose root or full span data

Grafana Traces Drilldown provides powerful tools that help you identify and analyze problems in your applications and services.

Using these steps, you can use the tracing data to investigate issues.

1. Select the whether to use **Root spans** or **All spans**.
1. Choose the metric you want to use: rates, errors, or duration.
1. Define filters to refine the view of your data.
1. Use the structural or trace list to drill down into the issue.


## Select root spans or raw tracing data from all spans

Tracing data is highly structured and annotated and reflects events that happen in your services.
You can choose the type of services you want to observe and think about.

By default, Traces Drilldown displays information about root spans. You can change this by using the selector in the filter bar.

You can use any one of these primary signal types.

Root spans traces
: Inspect full journeys of requests across services

All spans
: View and analyze raw span data
