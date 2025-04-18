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

Tracing data is highly structured and annotated and reflects events that happen in your services.
You can choose the type of services you want to observe and think about.

By default, Traces Drilldown displays information about root spans.
You can change this by using the selector in the filter bar.

Root spans traces
: Inspect full journeys of requests across services

All spans
: View and analyze raw span data

<!-- Add screenshots of root span vs all spans and some info about when you'd use one or the other-->

## Root spans

A root span is the first span in a trace.
In tracing data, think of it as the trunk from which all subsequent spans in the same trace branch.

Queries against root spans are faster because you're searching a subset of the tracing data.

## All spans

The **All spans** option lets you query all span data for all traces within the selected time period.
Query times take longer they search the raw span data.