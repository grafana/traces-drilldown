# Changelog

## 2.0.1

##### Build System / Dependencies

*  add support for mise package manager (#684) (53ede010)

##### Chores

* **deps:**
  *  update dependency dompurify to v3.4.0 [security] (#715) (3296adb8)
  *  update dependency knip to v5.88.1 (#706) (2536ab60)
  *  update dependency @types/node to v22.19.15 (#705) (47eacfa9)
  *  update dependency lodash to v4.18.1 [security] (#707) (5f7b8089)
  *  update dependency sass-loader to v16.0.7 (#699) (3abf9f9a)
  *  update dependency nwsapi to v2.2.23 (#698) (0b73206c)
  *  update dependency semver to v7.7.4 (#700) (c392be0a)
  *  update swc monorepo (#701) (f7ade26d)
  *  update dependency @types/lodash to v4.17.24 (#695) (865c175f)
  *  update dependency css-loader to v7.1.4 (#696) (937d0b6a)
  *  update dependency eslint-plugin-jsdoc to v62.8.1 (#697) (62e3f515)
  *  update rabbitmq:management docker digest to 23fe4f2 (#694) (baa8d266)
  *  update grafana/tempo:latest docker digest to 112d818 (#693) (99d2c503)
  *  pin dependencies (#660) (79e5589c)
  *  lock file maintenance (#652) (fc21531c)
  *  update grafana/tempo:latest docker digest to 5aa154f (#663) (c8bf14cc)
  *  update grafana/intro-to-mltp:mythical-beasts-recorder-latest docker digest to 82cd149 (#662) (c83d2803)
*  Remove unused dependencies (#675) (88e7ff7b)
* **eslint:**  migrate to ESLint 9 flat config (#681) (c7eed48c)

##### Documentation Changes

*  Update for Include/Exclude, Adaptive Traces tab, and time seeker (#709) (aea3d093)
*  Update for save queries (#688) (e59eb9b5)

##### New Features

*  Time range seeker (#611) (eb283c9d)
*  Support include / exclude for panels (#624) (5edbe889)

##### Bug Fixes

*  upgrade `terser-webpack-plugin` to resolve CVE (#714) (bfe4c44d)
*  Fix issue with logsDrilldownExtension.fn (#708) (d2264fde)
*  add packages to resolutions in package.json (#683) (8f24f6b0)
*  update levignore to pass grafana runtime compatibility check (#682) (5c097dff)
* **deps:**  update resolutions to fix `yarn audit` vulnerabilities (#690) (ca57dd08)


## 2.0.0

##### Chores

* **deps:**
  *  fix all dependency vulnerabilities (minimatch, ajv, @tootallnate/once) (#674) (d9168e50)
  *  bump undici from 7.18.2 to 7.24.4 (#669) (2f771b89)
*  Fix release action (#672) (f5326ea7)

##### Documentation Changes

*  Update Traces Drilldown doc and screenshots (#670) (f655b157)

##### New Features

*  Add AGENTS.md and surrounding files (#671) (ea7313bf)
*  Support Saved Queries (#653) (1ad5ea70)


## 1.4.1


## 1.4.0

##### Chores

*  React 19 upgrade (#666) (e9db5d4f)


## 1.3.3

##### Chores

*  Resolve react-router (#665) (23f24805)
*  Remove spellcheck (#648) (03e5068c)
*  Update brace expansion (#644) (3efce86e)
* **deps:**
  *  bump qs from 6.14.1 to 6.14.2 (#651) (90247275)
  *  update actions/checkout digest to 34e1148 (#636) (3564c51d)
  *  update grafana/grafana-enterprise:latest docker digest to 9dedb4a (#637) (26e31535)
  *  update grafana/intro-to-mltp:mythical-beasts-recorder-latest docker digest to 1420cd8 (#638) (4867cbde)
  *  pin dependency @testing-library/react to 16.3.1 (#635) (0ee83dc4)
* **deps-dev:**  bump webpack from 5.101.0 to 5.104.1 (#647) (bcd785df)

##### New Features

*  Hide baseline only panels in the comparison tab (#664) (56a7e3eb)
*  Enhanced exceptions tab (#627) (733eec3d)
*  Send filters to EntityAssertionsWidget (#626) (057ddf2e)

##### Bug Fixes

*  resolves the addition of extra pipelines in trace explorer (#650) (24f820d9)


## 1.3.2

##### Chores

*  Upgrade lodash (#643) (433559b)


## 1.3.1

##### Chores

*  Upgrade react-router (#621) (eec1df9e)

##### Bug Fixes

*  Check if usePluginFunctions is available (#616) (99112e44)


## 1.3.0

##### Chores

* **deps:**
  *  update dependency @babel/core to v7.28.5 (#577) (3dfd3cd5)
  *  update swc monorepo (#580) (8f14d360)
  *  update grafana/tempo:latest docker digest to 6d4f1f3 (#599) (8f747508)
*  Update grafana to 12.3.0 (#609) (deb155f2)
* **config:**  migrate config renovate.json (#607) (aee65df3)

##### Continuous Integration

*  Update workflow permissions (#623) (0269bfc5)

##### Documentation Changes

*  Minor updates to docs (#608) (af917d5d)

##### New Features

*  Show favorites first in the attribute sidebar (#625) (975e40c6)
*  Exceptions Tab v2 (#619) (7ee82314)
*  Adaptive Traces Integration (#614) (c3c77e68)
* **links:**  grafana assistant traces drilldown full query navigation (#541) (64e42e8e)


## 1.2.1

##### Chores

*  Add Renovate rules (#606) (d836c42a)
* **deps:**
  *  update dependency nwsapi to v2.2.22 (#572) (07865f22)
  *  pin dependencies (#569) (f3353005)

##### Documentation Changes

*  Exception tab (#585) (364fe32e)
*  Doc updates for 554, 558, and 555 (#564) (68d41f9c)

##### New Features

*  Mini embeddable Traces Drilldown (#592) (7aecc60e)
*  Find single span errors and high latency on the root cause tab (#594) (db46387a)
*  Link to Logs Drilldown instead of Explore (#563) (6ea96dd3)


## 1.2.0

##### Chores

*  add annotation topic to annotation frame (#560) (e9856325)

##### New Features

*  Attributes sidebar (#558) (7ed0f3c8)
*  View trace by ID input (#555) (6a8d0cfe)
*  Percentiles variable for duration breakdown (#554) (69e3ab05)


## 1.1.4

##### Chores

*  Support quoted numeric strings (#552) (c9120937)
*  Update create-plugin (#539) (b540db0e)
*  updates readme to reflect GA status. (#540) (4c928873)

##### New Features

*  Integrate Insights Timeline widget (#543) (8853aa3a)

##### Performance Improvements

*  Use new TraceQL sampling hint for RED panels (#547) (b68d6c64)


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
