---
description: Determine your use case to begin your investigation
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/determine-use-case/
keywords:
  - Explore Traces
  - Use case
title: Determine your use case
menuTitle: Determine your use case
weight: 400
draft: true
---

<!-- needs to be updated for Explore Traces -->

# Determine your use case

At the beginning of your investigation, you may either know what's wrong (for example, you know the affected service or that there’s too much CPU usage), or you may want identify resource hot spots so you can address them.

This can lead you to two different starting points:

- Use case 1 - You want to investigate an issue to determine the root cause.
- Use case 2 - You want to research resource and performance hot spots to determine areas that can be optimized.

Your use case determines what’s most important.
For example, in use case 1, if a service is misbehaving, then you might want to see the profile types so you can see the CPU and memory profiles alongside each other.

For either use case, the first step is to identify areas of interest by reviewing profiles or a single service.
Select different profile types to focus on memory allocation, CPU processes, allocation sizes, blocks, or mutually exclusive (mutex).

The profile types available depend on how you've instrumented your app to generate your profiling data.
For more information, refer to [Profiling types](../concepts/#profile-types/) for help selecting a profile type to match your use case.
Refer to [Understand profile types](https://grafana.com/docs/pyroscope/latest/view-and-analyze-profile-data/profiling-types/) to learn about profile types and instrumentation methods.

After you’ve identified the problem process or service, you can filter and explore using labels and flame graphs to view lower levels.
With capabilities like the [Flame graph AI interpreter](https://grafana.com/docs/grafana-cloud/monitor-applications/profiles/flamegraph-ai/) or the [GitHub integration](https://grafana.com/docs/grafana-cloud/monitor-applications/profiles/pyroscope-github-integration/), Grafana Profiles Drilldown helps you locate the root cause and how to address it.

## Use case 1: Investigate an issue

Profiling data is ideal when you know there is a specific service or area where there is a performance issue.
Maybe an alert from spike in CPU led you to profiles or maybe your logs showed OOM issue for a particular service and you need to debug it.
Profiles Drilldown lets you quickly drill into a service and identify the performance issue in these scenarios.

### Example: Know the problem service, not the cause

If you know the affected service, start by viewing that service and then reviewing the profiles for that service.
In this example, you may have identified that the `checkoutservice` has an issue.
Use **Search services** to locate `checkoutservice`, and then use the **Profile types** view to examine all profiles for that service.

Alternatively, select the **Profile types** view, and then choose the `checkoutservice` from the **Service** drop-down list.

### Example: Know there is an issue, need to investigate

If you only know there is an issue and have to investigate, go to the **All services** view.
With the **Profile type** selector, check the services' CPU processes, memory allocation, blocks, locks, exceptions, and other available profile types.

After you locate the profile with a spike, select either **Profile types** view to examine all profile types for that service, or select **Labels** to view the labels (such as `hostname` or `span_name`) for that service.

## Use case 2: Research performance and resource bottlenecks

Uncover performance issues during a proactive analysis, such as a cost-cutting exercise or an attempt to improve latency or memory usage. This can occur be across multiple services or within a service across profile types, labels, or a combination of the two.

**Next step: [Investigate and identify issues](../investigate/)**
