---
description: Investigate trends and spikes to identify issues.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/investigate/
keywords:
  - Traces Drilldown
  - Investigate
refs:
  choose-span-data:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/explore/simplified-exploration/traces/investigate/choose-span-data/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/visualizations/explore/simplified-exploration/traces/investigate/choose-span-data/
  choose-red-metric:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/explore/simplified-exploration/traces/investigate/choose-red-metric/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/visualizations/explore/simplified-exploration/traces/investigate/choose-red-metric/
  analyze-tracing-data:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/explore/simplified-exploration/traces/investigate/analyze-tracing-data/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/visualizations/explore/simplified-exploration/traces/investigate/analyze-tracing-data/
  add-filters:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/explore/simplified-exploration/traces/investigate/add-filters/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/visualizations/explore/simplified-exploration/traces/investigate/add-filters/
title: Investigate trends and spikes
menuTitle: Investigate trends and spikes
weight: 600
---

# Investigate trends and spikes

Grafana Traces Drilldown provides powerful tools that help you identify and analyze problems in your applications and services.

Using these steps, you can use the tracing data to investigate issues.

1. [Select **Root spans** or **All spans**](ref:choose-span-data) to look at either the first span in a trace (the root span) or all span data.
1. [Choose the metric](ref:choose-red-metric) you want to use: rates, errors, or duration.
1. [Analyze data](ref:analyze-tracing-data) using **Breakdown**, **Comparison**, **Service structure** (available for rate), **Root cause errors** (available for errors), **Root cause latency** (available for duration), and **Traces** tabs.
1. [Add filters](ref:add-filters) to refine the view of your data.

You can use these steps in any order and move between them as many times as needed.
Depending on what you find, you may start with root spans, delve into error data, and then select **All spans** to access all of the tracing data.

{{< docs/play title="the Grafana Play site" url="https://play.grafana.org/a/grafana-exploretraces-app/explore" >}}
