# Changelog

## 1.1.3

##### Chores

*  Exceptions tab improvements (#535) (7cf574e6)
*  Update Grafana packages (#511) (b89ef3cb)

##### New Features

*  Trace exploration improvements (#537) (a8704e8d)
*  Exceptions tab (#509) (c259a96f)

##### Bug Fixes

*  Fix date formatting when rounded (#529) (3593aaa7)
*  Fix duplicate title and close button in drawer (#507) (6b4527be)


## 1.1.2

##### Chores

*  changing input props for exposed component (#462) (0cf77202)
*  isolate types imports for exposed component (#460) (fdb54e47)
*  remove extension link from logs drilldown (#421) (9a8efe9e)
*  update bundle-types.yml (#347) (7403a7ec)

##### Continuous Integration

*  Add conventional commits workflow and improve release (#506) (81897aa4)

##### New Features

*  open in explore traces button (#335) (d7d91db3)
* **explorations:**  rename to `investigations` (#340) (651373d2)

##### Bug Fixes

* **500:**  Use db.system.name instead of db.name attribute for the "Database calls" filter (#501) (06b298d4)
* **PanelMenu:**  use `firstValueFrom()` instead of `lastValueFrom()` (#399) (e343d6a9)
* **open in drilldown button:**  update tempo matcher type (#376) (78aceb98)

##### Other Changes

*  create a new history item when a filter is added from the breakdown (#431) (edb3f1af)
*  Do not show an empty state while streaming is still in progress (#426) (b877d479)
*  update error panel y-axis labels (#424) (6236467b)
*  Add "Go Queryless" hook (#404) (18319c97)
*  Make extensions compatible with different Grafana versions (#395) (b045de36)


## [1.1.0](https://github.com/grafana/traces-drilldown/compare/v1.0.0...v1.1.0) (2025-06-27)

* Default to all spans when pressing Open in Traces Drilldown button ([#443](https://github.com/grafana/traces-drilldown/pull/443))
* Fix broken links in docs ([#447](https://github.com/grafana/traces-drilldown/pull/447))
* Fix zizmor detected template-injection issues ([#450](https://github.com/grafana/traces-drilldown/pull/450))
* Style error panels according to metric ([#449](https://github.com/grafana/traces-drilldown/pull/449))
* Work around ref URIs bug ([#457](https://github.com/grafana/traces-drilldown/pull/457))
* New exposed component to embed the trace exploration scene ([#407](https://github.com/grafana/traces-drilldown/pull/407))
* Fix Zizmor persist credentials issues ([#456](https://github.com/grafana/traces-drilldown/pull/456))
* Fix exposing types ([#459](https://github.com/grafana/traces-drilldown/pull/459))
* chore: isolate types imports for exposed component ([#460](https://github.com/grafana/traces-drilldown/pull/460))
* chore: changing input props for exposed component ([#462](https://github.com/grafana/traces-drilldown/pull/462))
* Embedded mode improvements ([#466](https://github.com/grafana/traces-drilldown/pull/466))
* Bring back all primary signals ([#472](https://github.com/grafana/traces-drilldown/pull/472))
* Upgrade packages ([#476](https://github.com/grafana/traces-drilldown/pull/476))
* Update policy token to use env variable from Vault ([#473](https://github.com/grafana/traces-drilldown/pull/473))
* Embedded mode improvements ([#477](https://github.com/grafana/traces-drilldown/pull/477))
* UPreserve asserts context via embedded assertions widget component ([#464](https://github.com/grafana/traces-drilldown/pull/464))
* Fix Zizmor issues ([#483](https://github.com/grafana/traces-drilldown/pull/483))
* Type string booleans as booleans unless user has put them in quotes ([#482](https://github.com/grafana/traces-drilldown/pull/482))
* Embedded mode fixes + improvements ([#484](https://github.com/grafana/traces-drilldown/pull/484))
* Explain selection vs baseline when 'Span rate' metric is chosen ([#487](https://github.com/grafana/traces-drilldown/pull/487))
* Update @grafana/scenes to 6.23.0 ([#488](https://github.com/grafana/traces-drilldown/pull/488))
* Add namespace to embedded app ([#489](https://github.com/grafana/traces-drilldown/pull/489))

## [1.0.0](https://github.com/grafana/traces-drilldown/compare/v0.2.9...v1.0.0) (2025-04-24)

* Breakdown: Do not show an empty state while streaming is still in progress. ([#426](https://github.com/grafana/traces-drilldown/pull/426))
* Add support for contextualised trace list table. ([#409](https://github.com/grafana/traces-drilldown/pull/409))
* Move version to menu and remove preview badge. ([#429](https://github.com/grafana/traces-drilldown/pull/429))
* Add fix to show empty state in the trace list. ([#430](https://github.com/grafana/traces-drilldown/pull/430))
* Fix to normalize comparison data when total fields are missing or invalid. ([#435](https://github.com/grafana/traces-drilldown/pull/435))
* Breakdown: create a new history item when a filter is added from the breakdown. ([#431](https://github.com/grafana/traces-drilldown/pull/431))

## [0.2.9](https://github.com/grafana/traces-drilldown/compare/v0.2.8...v0.2.9) (2025-04-15)

* Remove exemplars from heatmap. ([#398](https://github.com/grafana/traces-drilldown/pull/398))
* Filter out redundant attributes. ([#397](https://github.com/grafana/traces-drilldown/pull/397))
* Show warning if datasource is not configured with TraceQL metrics. ([#400](https://github.com/grafana/traces-drilldown/pull/400))
* Ensure Y-axis label matches the data for RED metrics. ([#401](https://github.com/grafana/traces-drilldown/pull/401))
* Explore: Add "Go Queryless" hook. ([#404](https://github.com/grafana/traces-drilldown/pull/404))
* Fix issue with container height. ([#422](https://github.com/grafana/traces-drilldown/pull/422))
* Use events to open traces. ([#410](https://github.com/grafana/traces-drilldown/pull/410))
* chore: remove extension link from logs drilldown. ([#421](https://github.com/grafana/traces-drilldown/pull/421))
* Fix structure tab flickering. ([#394](https://github.com/grafana/traces-drilldown/pull/394))
* Support typed query generation. ([#423](https://github.com/grafana/traces-drilldown/pull/423))
* RED Panels: update error panel y-axis labels. ([#424](https://github.com/grafana/traces-drilldown/pull/424))
* Rename plugin extension link from Explore to Drilldown. ([#425](https://github.com/grafana/traces-drilldown/pull/425))
* Add support for adding a trace to investigations. ([#408](https://github.com/grafana/traces-drilldown/pull/408))

## [0.2.6](https://github.com/grafana/traces-drilldown/compare/v0.2.4...v0.2.6) (2025-03-12)

### Enhancements

* Support for add to investigation. ([#320](https://github.com/grafana/traces-drilldown/pull/320))
* Support for metrics streaming. ([#312](https://github.com/grafana/traces-drilldown/pull/312))
* Rename plugin to Grafana Traces Drilldown. ([#329](https://github.com/grafana/traces-drilldown/pull/329))
* Add back and forward support for app actions. ([#294](https://github.com/grafana/traces-drilldown/pull/294))
* Exposes a component which takes properties and creates a LinkButton with a href to navigate to the Traces Drilldown from outside. ([#335](https://github.com/grafana/traces-drilldown/pull/335))
* Select custom columns in trace list. ([#342](https://github.com/grafana/traces-drilldown/pull/342))

## [0.2.3](https://github.com/grafana/explore-traces/compare/v0.2.2...v0.2.3) (2025-02-06)

### Enhancements

* **Open trace in drawer:** The traces now open in a drawer which should improve the experience of analysing the details of a trace. ([#325](https://github.com/grafana/explore-traces/pull/325))

### Bug Fixes

* Fixes crash on main metric panel ([#317](https://github.com/grafana/explore-traces/pull/317))

## [0.2.2](https://github.com/grafana/explore-traces/compare/v0.2.0...v0.2.2) (2025-01-13)

### Enhancements

* **Custom values in filters bar:** The filters bar now allows custom values which can be used to build regular expressions or input values missing from the dropdown options. ([#288](https://github.com/grafana/explore-traces/pull/252))

## [0.2.0](https://github.com/grafana/explore-traces/compare/v0.1.3...v0.2.0) (2025-01-10)

### Features

* **Support for exemplars:** Quickly jump to the relevant data points or logs for deeper troubleshooting with newly added support for exemplars, directly on your metrics graph. By clicking on a point of interest on the graph—like a spike or anomaly—you can quickly jump to the relevant traces for deeper troubleshooting and dramatically reduce the time it takes to root cause an issue. ([#278](https://github.com/grafana/explore-traces/pull/278)) Requires Grafana >= 11.5.0
* **Open traces in Explore:** When viewing trace spans, now you can easily open the full trace in Explore. This provides a streamlined way to pivot between trace analysis and the broader Grafana Explore experience without losing context. ([#267](https://github.com/grafana/explore-traces/pull/267))

### Enhancements

* **Trace breakdown adjusts better to smaller screens:** The **Breakdown** tab now automatically adjusts its attribute selector display based on available screen width, improving usability on smaller viewports. ([#267](https://github.com/grafana/explore-traces/pull/267))
* **Search is now case-insensitive:** Search in the **Breakdown** and **Comparison** tabs now ignores capitalization, ensuring you see all matching results. ([#252](https://github.com/grafana/explore-traces/pull/252))
* **Performance boost and reduced bundle size**: Code-splitting and lazy loading for faster loading times. Only the modules you need are fetched on demand, cutting down on initial JavaScript payload and improving app performance. ([#275](https://github.com/grafana/explore-traces/pull/275))
* **Various fixes and improvements:** Fixed loading and empty states. Fixed broken documentation link. Refined styles above filters for a more polished look. Added descriptive text to the Span List tab for added clarity. Enhanced tooltip design for RED metrics. Standardized error messages and titles, plus added helpful hints when an empty state appears. ([#263](https://github.com/grafana/explore-traces/pull/263))

## 0.1.2

Release public preview version.
