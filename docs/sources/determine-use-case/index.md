---
description: Determine your use case to begin your investigation with Traces Drilldown.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/determine-use-case/
keywords:
  - Traces Drilldown
  - Use case
  - Investigation
title: Determine your use case
menuTitle: Determine your use case
weight: 400
topicType: concept
versionDate: 2026-01-27
---

# Determine your use case

Before you start investigating, identify your use case to choose the right approach and metric type.

Your use case determines which RED metric you start with and how you navigate through your tracing data. You might know exactly what's wrong, or you might need to explore to find issues.

## Why this concept matters

Identifying your use case helps you start your investigation efficiently. It guides you to the right RED metric and workflow, saving time and helping you find root causes faster.

Grafana Traces Drilldown supports three main types of investigations: error investigation, performance analysis, and activity monitoring. Each use case has a different starting point and workflow.

## How it works

Each use case maps to a specific RED metric and investigation workflow. Your investigation goal determines which metric you start with and which tabs and views are most useful.

Error investigation uses the **Errors** metric to find failed requests and their root causes. Performance analysis uses the **Duration** metric to identify slow operations and latency bottlenecks. Activity monitoring uses the **Rate** metric to understand service communication patterns and request flows.

Traces Drilldown adapts its interface based on your selected metric. When you choose **Errors**, you see error-specific tabs like **Exceptions** and **Root cause errors**. When you choose **Duration**, you see latency-focused tabs like **Root cause latency** and **Slow traces**. When you choose **Rate**, you see **Service structure** to visualize service communication.

## Use case 1: Investigate errors

Use this when you know requests are failing or you've seen error alerts.

You might have noticed:
- Error alerts from your monitoring system
- Failed requests in your application logs
- User reports of errors or failed operations
- Spikes in error rates on dashboards

### How to start

1. Select **Errors** as your metric type.
2. Start with **Root spans** to see service-level error patterns.
3. Use the **Comparison** tab to identify which attributes correlate with errors.
4. Use the **Breakdown** tab to see which services or operations have the most errors.
5. Use the **Exceptions** tab to find common error messages.
6. Use **Root cause errors** to see the error chain structure.

**When to switch to All spans**: If you need to find errors deeper in the call chain, like database errors or downstream service failures that don't appear at the root level, switch to **All spans**.

### Example scenarios

**You know a service is failing but not why**: 
1. Select **Errors** metric and **Root spans**.
2. Filter by the service name.
3. Use **Comparison** to see which attributes differ between successful and failed requests.
4. Use **Root cause errors** to see the error chain structure.

**You see error alerts but don't know the source**: 
1. Select **Errors** metric and **Root spans**.
2. Use **Breakdown** to see which services have the most errors.
3. Drill into the problematic service using filters.
4. Use **Comparison** to identify what's different about the failing requests.

**You need to find internal errors**: 
1. Start with **Errors** metric and **Root spans** to see service-level patterns.
2. If errors don't appear at the root level, switch to **All spans**.
3. This reveals database errors, downstream service failures, or internal operation errors.
4. Use **Exceptions** to find common error messages.

## Use case 2: Analyze performance

Use this when you want to identify slow operations, latency bottlenecks, or optimize response times.

You might be investigating:
- Slow response times reported by users
- High latency alerts
- Performance degradation over time
- Need to optimize specific operations

### How to start

1. Select **Duration** as your metric type.
2. Start with **Root spans** for end-to-end request latency.
3. Use the duration heatmap to identify latency patterns.
4. Select percentiles (p90, p95, p99) based on your SLA requirements.
5. Use **Root cause latency** to see which operations are slowest.
6. Use **Slow traces** to examine individual slow requests.
7. Use **Breakdown** to see duration by different attributes like service, environment, or region.

**When to switch to All spans**: If you need to find slow internal operations like database queries or background jobs that don't appear at the root level, switch to **All spans**.

### Example scenarios

**Users report slow responses**: 
1. Select **Duration** metric and **Root spans**.
2. Look at the heatmap for latency spikes.
3. Use **Root cause latency** to see which service operations are causing delays.
4. Use **Slow traces** to examine individual slow requests.

**You want to optimize a specific endpoint**: 
1. Select **Duration** metric and **Root spans**.
2. Add filters for the endpoint.
3. Use **Breakdown** to see duration by different attributes like service, environment, or region.
4. Select appropriate percentiles (p90, p95, p99) based on your optimization goals.

**You need to find slow database queries**: 
1. Select **Duration** metric and **All spans** (database queries appear as child spans).
2. Filter by database-related attributes.
3. Use **Breakdown** to see which queries are slowest.
4. Examine the slowest spans in **Slow traces** to identify problematic queries.

## Use case 3: Monitor activity

Use this when you want to understand service communication patterns, request flows, or overall system activity.

You might want to:
- Understand how services communicate
- Monitor request rates and patterns
- Identify unusual activity spikes
- Map service dependencies

### How to start

1. Select **Rate** as your metric type.
2. Start with **Root spans** for service-level request rates.
3. Use **Service structure** to visualize service-to-service communication.
4. Use **Breakdown** to see request rates by different attributes.
5. Use **Comparison** to identify unusual patterns compared to baseline.
6. Use **Traces** tab to examine individual requests.

**When to switch to All spans**: If you need to see internal operations or child spans within traces, switch to **All spans**. Most activity monitoring use cases work well with **Root spans**.

### Example scenarios

**You want to understand service dependencies**: 
1. Select **Rate** metric and **Root spans**.
2. Use **Service structure** to see how services call each other.
3. Identify the communication patterns and dependencies.
4. Use **Traces** to examine individual request flows.

**You notice unusual activity spikes**: 
1. Select **Rate** metric and **Root spans**.
2. Use **Breakdown** to see which services or operations have increased rates.
3. Use **Comparison** to compare against normal baseline behavior.
4. Switch to **Errors** or **Duration** if the spike indicates problems.

**You're doing capacity planning**: 
1. Select **Rate** metric and **Root spans**.
2. Use **Breakdown** by service, environment, or region.
3. Understand request distribution patterns.
4. Use **Service structure** to see communication volumes between services.

## Choose your starting point

Your starting point depends on what you already know:

**You know what's wrong**: 
- Errors present → Start with **Errors** metric and **Root spans**.
- Performance issues → Start with **Duration** metric and **Root spans**.
- Specific service affected → Add a filter for that service first, then select the appropriate metric.

**You need to explore**: 
- Start with **Rate** metric and **Root spans** to get an overview.
- Look for unusual patterns in the graphs.
- Switch to **Errors** or **Duration** based on what you find.

**You're doing proactive analysis**: 
- Start with **Rate** metric and **Root spans** to understand normal patterns.
- Use **Comparison** to identify deviations from baseline.
- Switch to **Errors** or **Duration** when you find areas of concern.

## Related concepts

- [RED metrics](../concepts/#rate-error-and-duration-metrics) - Understanding Rate, Errors, and Duration metrics
- [Traces and spans](../concepts/#traces-and-spans) - How traces and spans work in distributed systems

## Related tasks

After you've determined your use case:

- [Choose a RED metric](../investigate/choose-red-metric/) to match your investigation goal.
- [Choose root or full span data](../investigate/choose-span-data/) based on the depth you need.
- [Analyze tracing data](../investigate/analyze-tracing-data/) using the appropriate tabs for your metric type.
- [Add filters](../investigate/add-filters/) to refine your investigation as you discover patterns.
