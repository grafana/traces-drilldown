# Traces Drilldown (Grafana app plugin)

**What this file is for:** **Grafana plugin** rules and links (build, `plugin.json`, plugin-tools).

---

This repo is the **Traces Drilldown** Grafana app plugin.

Agent knowledge of the Grafana plugin API can be stale. Prefer **official Grafana plugin docs** when implementing or changing plugin behavior.

**Plugin-tools docs**: Prefer content from **grafana.com** (safe to fetch). The main index is https://grafana.com/developers/plugin-tools/llms.txt. Use your fetch tool or `curl -s`. Many pages are available as markdown by appending `.md` to the path (e.g. https://grafana.com/developers/plugin-tools/troubleshooting.md).

## Rules (do not break)

- **Leave `.config` unchanged.** That directory is owned by Grafana plugin tooling.
- **Do not change plugin ID or type** in `plugin.json`.
- **After editing `plugin.json`**, a Grafana server restart is required—mention this to the user.
- Store secrets in `secureJsonData`; use `jsonData` for non-secret config.
- **Frontend builds**: Use the webpack setup in `.config/` (do not replace it).
- **Backend builds**: Use mage and the Grafana plugin Go SDK targets.
- **Extending config** (webpack, eslint, prettier, etc.): Start from the existing config; see https://grafana.com/developers/plugin-tools/how-to-guides/extend-configurations.md
- **E2E tests**: Use **`@grafana/plugin-e2e`**.
