---
cascade:
  FULL_PRODUCT_NAME: Grafana Traces Drilldown
  PRODUCT_NAME: Traces Drilldown
description: Learn about traces and how you can investigate tracing data with Grafana Traces Drilldown to understand and troubleshoot
  your application and services.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/
keywords:
  - Explore Traces
  - Traces Drilldown
title: Traces Drilldown
menuTitle: Traces Drilldown
weight: 100
refs:
  tempo-data-source:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/datasources/tempo/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/connect-externally-hosted/data-sources/tempo/
hero:
  title: Traces Drilldown
  level: 1
  width: 100
  height: 100
  description: Use Traces Drilldown to investigate and identify issues using tracing data.
cards:
  title_class: pt-0 lh-1
  items:
    - title: Get started
      href: ./get-started/
      description: How do you use tracing data to investigate an issue? Start here.
      height: 24
    - title: Access or install
      href: ./access/
      description: Access or install Traces Drilldown.
      height: 24
    - title: Concepts
      href: ./concepts/
      description: Learn the concepts you need to use tracing.
      height: 24
    - title: Investigate trends and spikes
      href: ./investigate/
      description: Use your tracing data to identify issues and determine the root cause.
      height: 24
    - title: Changelog
      href: https://github.com/grafana/explore-traces/blob/main/CHANGELOG.md
      description: Learn about the updates, new features, and bugfixes in this version.
      height: 24
---

# Traces Drilldown

<!-- Content used in the Traces Drilldown learning journey -->
{{< shared id="traces-intro-1" >}}

Distributed traces provide a way to monitor applications by tracking requests across services.
Traces record the details of a request to help understand why an issue is or was happening.

{{< /shared >}}

Grafana Traces Drilldown helps you visualize insights from your Tempo traces data.
Using the app, you can:

* Use Rate, Errors, and Duration (RED) metrics derived from traces to investigate issues
* Uncover related issues and monitor changes over time
* Browse automatic visualizations of your data based on its characteristics
* Do all of this without writing TraceQL queries

{{< docs/learning-journeys title="Explore traces using Traces Drilldown" url="https://grafana.com/docs/learning-journeys/drilldown-traces/" >}}

To learn more, read:
* [From multi-line queries to no-code investigations: meeting Grafana users where they are](https://grafana.com/blog/2024/10/22/from-multi-line-queries-to-no-code-investigations-meeting-grafana-users-where-they-are/)
* [A queryless experience for exploring metrics, logs, traces, and profiles: Introducing the Explore apps suite for Grafana](https://grafana.com/blog/2024/09/24/queryless-metrics-logs-traces-profiles/).

{{< docs/play title="Grafana Traces Drilldown" url="https://play.grafana.org/a/grafana-exploretraces-app/explore" >}}

## Who is Grafana Traces Drilldown for?

Grafana Traces Drilldown is for engineers of all levels of operational expertise. You no longer need to be an SRE wizard to get value from your traces.

Traditionally, you'd need a deep understanding of your systems and the tracing query language, TraceQL, to get the most out of your tracing data.

With Grafana Traces Drilldown, you get the same powerful insights, by just viewing and clicking in visualizations which are automatically generated from your tracing data.

## Explore

{{< card-grid key="cards" type="simple" >}}