---
description: Access or install Traces Drilldown.
canonical: https://grafana.com/docs/grafana/latest/explore/simplified-exploration/tempo/access/
keywords:
  - Install
  - Configure
  - Traces Drilldown
menuTitle: Access or install
weight: 150
refs:
  tempo-data-source:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/datasources/tempo/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/connect-externally-hosted/data-sources/tempo/
---

# Access or install Traces Drilldown

You can access Grafana Traces Drilldown using any of these:

 - [Grafana Cloud](#set-up-in-grafana-cloud): The easiest method, since no setup or installation is required.
 - Self-managed [Grafana](#set-up-in-self-managed-grafana) open source or Enterprise: You must install the Traces Drilldown plugin.

Traces Drilldown requires Grafana Tempo 2.6 or later with [TraceQL metrics configured](https://grafana.com/docs/tempo/<TEMPO_VERSION>/operations/traceql-metrics/).

## Set up in Grafana Cloud

To use Traces Drilldown with Grafana Cloud, you need the following:

- Grafana Cloud account
- Grafana stack in Grafana Cloud receiving tracing data from your stack's default [Hosted Traces](https://grafana.com/docs/grafana-cloud/send-data/traces/) data source or a [Tempo data source](https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/tempo/configure-tempo-data-source/)

## Set up in self-managed Grafana

To use Traces Drilldown with self-managed Grafana open source or Grafana Enterprise, you need:

- Your own Grafana instance running 11.2 or later
- Tempo 2.6 or later with [TraceQL metrics configured](https://grafana.com/docs/tempo/<TEMPO_VERSION>/operations/traceql-metrics/)
- Configured [Tempo data source](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/) receiving tracing data

Next, [access Traces Drilldown](#access-traces-drilldown).

### Install the Traces Drilldown plugin

{{< admonition type="note" >}}
If you are using Grafana v12 or later, Traces Drilldown may be pre-installed.
To check, refer to [Access Traces Drilldown](#access-traces-drilldown).
{{</ admonition >}}

Traces Drilldown is distributed as a Grafana Plugin.
You can find it in the official [Grafana Plugin Directory](https://grafana.com/grafana/plugins/grafana-exploretraces-app/).

### Install in your Grafana instance

You can install Traces Drilldown in your Grafana instance using `grafana cli`:

```shell
grafana cli --pluginUrl=https://storage.googleapis.com/integration-artifacts/grafana-exploretraces-app/grafana-exploretraces-app-latest.zip plugins install grafana-traces-app
```

Alternatively, follow these steps to install Traces Drilldown in Grafana:

1. In Grafana, go to **Administration** > **Plugins and data** > **Plugins**.
2. Search for "Traces Drilldown".
3. Select Traces Drilldown.
4. Click **Install**.

The plugin is automatically activated after installation.

### Install in a Docker container

To install the app in a Docker container, configure the following environment variable:

```shell
GF_INSTALL_PLUGINS=https://storage.googleapis.com/integration-artifacts/grafana-exploretraces-app/grafana-exploretraces-app-latest.zip;grafana-traces-app
```

## Access Traces Drilldown

To access Traces Drilldown, use the following steps:

1. Open your Grafana stack in a web browser.
1. In the main menu, select **Drilldown** > **Traces**.