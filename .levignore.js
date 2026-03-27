module.exports = {
  removals: [
    /getPluginLinkExtensions/, // removed in 12.0.0 (https://github.com/grafana/grafana/pull/102102)
    /DataLinksContext/, // added in 12.3.0 (https://github.com/grafana/grafana/pull/110590)
    /useDataLinksContext/, // added in 12.3.0 (https://github.com/grafana/grafana/pull/110590)
    /DashboardInfo/, // dashboardId removed in 12.4.x, not used by this plugin
  ],
  changes: [
    /^config$/, // type expansion in 12.4.x, plugin only reads stable properties
  ],
};
