---
description: View exemplars to explore the links between metrics and spans.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/traces/investigate/
keywords:
  - Traces Drilldown
  - Investigate
title: View exemplars
menuTitle: View exemplars
weight: 600
---

# View exemplars

Exemplars provide a link between the metrics and the traces themselves.

An exemplar is a specific trace representative of measurement taken in a given time interval. While metrics excel at giving you an aggregated view of your system, traces give you a fine grained view of a single request; exemplars are a way to link the two.

Use exemplars to help isolate problems within your data distribution by pinpointing query traces exhibiting high latency within a time interval.
Once you localize the latency problem to a few exemplar traces, you can combine it with additional system based information or location properties to perform a root cause analysis faster, leading to quick resolutions to performance issues.

For more information, refer to [Introduction to exemplars](https://grafana.com/docs/grafana/<GRAFANA+VERSION>/fundamentals/exemplars/).

## Exemplars in Traces Drilldown

In Traces Drilldown, exemplar data is represented by a small diamond next to the bar graphs.
You can view the exemplar information by hovering the cursor over over the small diamond.

![A small diamond next to the bar graph indicates that exemplar data is available.](/media/docs/explore-traces/explore-traces-exemplar-v2.4.png)

Select **View trace** to open a slide-out trace panel.

![Selecting View trace reveals a slide-out panel with the full trace information.](/media/docs/explore-traces/explore-traces-exemplars-trace-v2.4.png)