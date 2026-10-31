import { dateTime, FieldType, LoadingState, type DataFrame, type PanelData } from '@grafana/data';
import React, { type MouseEvent } from 'react';
import { config, usePluginComponent } from '@grafana/runtime';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  CustomVariable,
  EmbeddedScene,
  SceneCSSGridItem,
  SceneDataNode,
  SceneTimeRange,
  SceneVariableSet,
  VizPanel,
} from '@grafana/scenes';

import pluginJson from '../../../plugin.json';
import { buildPanelMenuItems, PanelMenu } from '../panels/PanelMenu';
import { ADD_TO_NOTEBOOK_COMPONENT_ID, captureNotebookTile, EventOpenAddToNotebook } from './addToNotebook';
import { getPanelData } from './addToDashboard';
import { getLayoutChild } from '../layouts/attributeBreakdown';
import * as utils from 'utils/utils';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  usePluginComponent: jest.fn(),
}));
jest.mock('utils/utils', () => ({
  getTraceExplorationScene: jest.fn(),
  getDataSource: () => 'tempo-production',
  getDatasourceVariable: () => ({ getValue: () => 'tempo-production' }),
  getCurrentStep: () => 60,
  getRawLabelValue: (...args: Parameters<typeof utils.getRawLabelValue>) =>
    jest.requireActual<typeof utils>('utils/utils').getRawLabelValue(...args),
  toLabelValueType: (...args: Parameters<typeof utils.toLabelValueType>) =>
    jest.requireActual<typeof utils>('utils/utils').toLabelValueType(...args),
  toEscapedValue: (...args: Parameters<typeof utils.toEscapedValue>) =>
    jest.requireActual<typeof utils>('utils/utils').toEscapedValue(...args),
}));
jest.mock('../../../featureFlags/featureFlags', () => ({ useFlagTempoAlerting: () => false }));

function setup() {
  const targets = [{ refId: 'A', queryType: 'traceql', query: '{ resource.service.name="${service}" } | rate()' }];
  const menu = new PanelMenu({ alertTargets: targets });
  const panel = new VizPanel({
    pluginId: 'timeseries',
    title: 'Rate: ${service}',
    options: { legend: { showLegend: false } },
    fieldConfig: { defaults: { unit: 'reqps' }, overrides: [] },
    menu,
    $data: new SceneDataNode({
      data: {
        state: LoadingState.Done,
        series: [],
        traceIds: ['private-trace-id'],
        timeRange: new SceneTimeRange({}).state.value,
      },
    }),
  });
  const timeRange = new SceneTimeRange({ from: 'now-2h', to: 'now', timeZone: 'America/Los_Angeles' });
  const service = new CustomVariable({ name: 'service', query: 'checkout', value: 'checkout', text: 'checkout' });
  const filters = new CustomVariable({ name: 'filters', query: 'true', value: 'true', text: 'true' });
  const root = new EmbeddedScene({
    body: panel,
    $timeRange: timeRange,
    $variables: new SceneVariableSet({
      variables: [
        service,
        new CustomVariable({ name: 'primarySignal', query: 'true', value: 'true', text: 'true' }),
        filters,
      ],
    }),
  });
  jest
    .mocked(utils.getTraceExplorationScene)
    .mockReturnValue(root as unknown as ReturnType<typeof utils.getTraceExplorationScene>);
  return { panel, menu, targets, root, timeRange, service, filters };
}

describe('notebook tile capture', () => {
  const originalPermissions = config.bootData.user.permissions;
  beforeEach(() => {
    config.bootData.user.permissions = { 'notebooks:create': true };
    jest.mocked(usePluginComponent).mockImplementation((id) => ({
      isLoading: false,
      component: id === ADD_TO_NOTEBOOK_COMPONENT_ID ? NotebookForm : null,
    }));
  });
  afterEach(() => {
    config.bootData.user.permissions = originalPermissions;
    jest.restoreAllMocks();
  });

  it('declares the exact host v1 dependency', () => {
    expect(pluginJson.dependencies.extensions.exposedComponents).toContain(ADD_TO_NOTEBOOK_COMPONENT_ID);
  });

  it('snapshots the selected tile query, datasource, visualization, and raw window on opening', () => {
    const { panel, menu, root, timeRange, service } = setup();
    const received = jest.fn();
    root.subscribeToEvent(EventOpenAddToNotebook, received);
    buildPanelMenuItems(menu, false, true)
      .find((item) => item.text === 'Add to notebook')
      ?.onClick?.({} as MouseEvent);
    expect(received).toHaveBeenCalledTimes(1);
    const capture = received.mock.calls[0][0].payload;
    expect(capture).toEqual({
      panel: {
        type: 'timeseries',
        title: 'Rate: checkout',
        datasource: { uid: 'tempo-production', type: 'tempo' },
        targets: [
          { refId: 'A', queryType: 'traceql', query: '{ resource.service.name="checkout" } | rate()', step: 60 },
        ],
        options: { legend: { showLegend: false } },
        fieldConfig: { defaults: { unit: 'reqps' }, overrides: [] },
      },
      capturedTimeRange: { from: 'now-2h', to: 'now', timeZone: 'America/Los_Angeles' },
    });
    panel.state.options.legend!.showLegend = true;
    service.changeValueTo('other');
    timeRange.setState({ from: 'now-24h' });
    expect(capture.panel.options.legend.showLegend).toBe(false);
    expect(capture.panel.targets[0].query).toContain('checkout');
    expect(capture.capturedTimeRange.from).toBe('now-2h');
    expect(JSON.stringify(capture)).not.toContain('private-trace-id');
  });

  it('keeps absolute raw DateTimes as ISO, not resolved relative instants', () => {
    const { panel, targets, timeRange } = setup();
    timeRange.setState({
      value: {
        ...timeRange.state.value,
        raw: { from: dateTime('2026-10-05T08:00:00Z'), to: dateTime('2026-10-05T09:00:00Z') },
      },
    });
    expect(captureNotebookTile(panel, targets)?.capturedTimeRange).toEqual({
      from: '2026-10-05T08:00:00.000Z',
      to: '2026-10-05T09:00:00.000Z',
      timeZone: 'America/Los_Angeles',
    });
  });

  it('resolves variables at opening rather than when the tile menu was constructed', () => {
    const { panel, targets, service } = setup();
    service.changeValueTo('payments');
    expect(captureNotebookTile(panel, targets)?.panel.targets?.[0].query).toContain('payments');
  });

  it('normalizes absolute string bounds to ISO without losing the source timezone', () => {
    const { panel, targets, root } = setup();
    root.setState({
      $timeRange: new SceneTimeRange({
        from: '2026-10-05T01:00:00-07:00',
        to: '2026-10-05T02:00:00-07:00',
        timeZone: 'America/Los_Angeles',
      }),
    });
    expect(captureNotebookTile(panel, targets)?.capturedTimeRange).toEqual({
      from: '2026-10-05T08:00:00.000Z',
      to: '2026-10-05T09:00:00.000Z',
      timeZone: 'America/Los_Angeles',
    });
  });

  it('hides without extension or permission and accepts create OR write', () => {
    const { menu, root } = setup();
    const hasItem = (available: boolean) =>
      buildPanelMenuItems(menu, false, available).some((item) => item.text === 'Add to notebook');
    expect(hasItem(false)).toBe(false);
    config.bootData.user.permissions = {};
    expect(hasItem(true)).toBe(false);
    config.bootData.user.permissions = { 'notebooks:write': true };
    expect(hasItem(true)).toBe(true);
    const selected = buildPanelMenuItems(menu, false, true).find((item) => item.text === 'Add to notebook');
    const received = jest.fn();
    root.subscribeToEvent(EventOpenAddToNotebook, received);
    config.bootData.user.permissions = {};
    selected?.onClick?.({} as MouseEvent);
    expect(received).not.toHaveBeenCalled();
  });

  it('excludes unsupported custom panels, aggregate providers, and unscoped tiles', () => {
    const { panel, targets, menu } = setup();
    panel.setState({ pluginId: 'flamegraph' });
    expect(captureNotebookTile(panel, targets)).toBeUndefined();
    expect(buildPanelMenuItems(menu, false, true).some((item) => item.text === 'Add to notebook')).toBe(false);
    panel.setState({ pluginId: 'timeseries', $data: undefined });
    expect(captureNotebookTile(panel, targets)).toBeUndefined();
    expect(captureNotebookTile(panel, [])).toBeUndefined();
  });

  it.each([
    ['status', '"error"', 'error'],
    ['kind', 'server', 'server'],
    ['span.foo', '"123"', '"123"'],
    ['span.foo', JSON.stringify('say "hi"\\there\n'), JSON.stringify('say "hi"\\there\n')],
  ])(
    'exports the actual tile serializer through the dashboard adapter and notebook menu: %s=%s',
    (attribute, rawValue, expectedValue) => {
      const { root } = setup();
      const { tile, frame, data } = buildTile(root, attribute, rawValue);
      const panel = tile.state.body;
      expect(panel).toBeInstanceOf(VizPanel);
      if (!(panel instanceof VizPanel) || !(panel.state.menu instanceof PanelMenu)) {
        throw new Error('Expected a capturable breakdown tile');
      }
      const menu = panel.state.menu;
      const expectedQuery = `{true && true && ${attribute}=${expectedValue}} | rate() by(${attribute})`;
      expect(getPanelData(panel, menu.state.alertTargets).panel.targets?.[0].query).toBe(expectedQuery);
      const received = jest.fn();
      root.subscribeToEvent(EventOpenAddToNotebook, received);

      buildPanelMenuItems(menu, false, true)
        .find((item) => item.text === 'Add to notebook')
        ?.onClick?.({} as MouseEvent);

      expect(received).toHaveBeenCalledTimes(1);
      const capture = received.mock.calls[0][0].payload;
      expect(capture.panel.targets[0].query).toBe(expectedQuery);
      expect(capture.panel.datasource.uid).toBe('tempo-production');
      frame.fields[0].labels = { [attribute]: 'changed' };
      data.series.length = 0;
      expect(capture.panel.targets[0].query).toBe(expectedQuery);
    }
  );

  it.each(['123', 'true', 'checkout', '"${service}"', '"bad\\q"'])(
    'does not offer tile exports when type or interpolation fidelity is missing: %s',
    (rawValue) => {
      const { root } = setup();
      const { tile } = buildTile(root, 'span.foo', rawValue);
      const panel = tile.state.body;
      expect(panel).toBeInstanceOf(VizPanel);
      if (!(panel instanceof VizPanel)) {
        throw new Error('Expected a visible breakdown tile');
      }
      expect(panel.state.menu).toBeUndefined();
      expect(panel.state.$data).toBeInstanceOf(SceneDataNode);
    }
  );

  it('removes cached export actions when label type metadata becomes unsafe and restores them only when safe', () => {
    const { root } = setup();
    const panels: Record<string, SceneCSSGridItem> = {};
    const { tile } = buildTile(root, 'span.foo', '"123"', panels);
    const panel = tile.state.body;
    if (!(panel instanceof VizPanel)) {
      throw new Error('Expected a breakdown tile');
    }
    expect(panel.state.menu).toBeInstanceOf(PanelMenu);

    expect(buildTile(root, 'span.foo', '123', panels).tile).toBe(tile);
    expect(panel.state.menu).toBeUndefined();

    expect(buildTile(root, 'span.foo', '"123"', panels).tile).toBe(tile);
    expect(panel.state.menu).toBeInstanceOf(PanelMenu);
  });

  it('refreshes live capture, static Explore links and capabilities without replacing an existing tile menu', async () => {
    const { root, filters } = setup();
    const panels: Record<string, SceneCSSGridItem> = {};
    const { tile } = buildTile(root, 'span.first', '"original"', panels);
    const panel = tile.state.body;
    if (!(panel instanceof VizPanel) || !(panel.state.menu instanceof PanelMenu)) {
      throw new Error('Expected a capturable tile menu');
    }
    const menu = panel.state.menu;
    const received = jest.fn();
    root.subscribeToEvent(EventOpenAddToNotebook, received);
    render(React.createElement(menu.Component, { model: menu }));
    const originalQuery = '{true && true && span.first="original"} | rate() by(span.first)';
    await waitFor(() => expect(readExploreQuery()).toBe(originalQuery));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add to notebook' }));
    const originalCapture = received.mock.calls[0][0].payload;
    const body = menu.state.body;

    act(() => {
      filters.changeValueTo('span.http.method="GET"');
      expect(buildTile(root, 'span.second', '"updated"', panels).tile).toBe(tile);
    });

    expect(panel.state.menu).toBe(menu);
    expect(menu.state.body).toBe(body);
    const updatedQuery = '{true && span.http.method="GET" && span.second="updated"} | rate() by(span.second)';
    await waitFor(() => expect(readExploreQuery()).toBe(updatedQuery));
    expect(getPanelData(panel, menu.state.alertTargets).panel.targets?.[0].query).toBe(updatedQuery);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add to notebook' }));
    expect(received).toHaveBeenCalledTimes(2);
    expect(received.mock.calls[1][0].payload.panel.targets[0].query).toBe(updatedQuery);
    expect(originalCapture.panel.targets[0].query).toBe(originalQuery);

    act(() => menu.setState({ alertTargets: [] }));
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Add to notebook' })).not.toBeInTheDocument());
    act(() => menu.setState({ query: '{true} | rate()' }));
    await waitFor(() => expect(readExploreQuery()).toBe('{true} | rate()'));
  });
});

function NotebookForm(): null {
  return null;
}

function readExploreQuery(): string {
  const href = screen.getByRole('menuitem', { name: 'Explore' }).getAttribute('href');
  const url = new URL(href ?? '', window.location.origin);
  return JSON.parse(url.searchParams.get('panes') ?? '{}')['traces-explore'].queries[0].query;
}

function buildTile(
  root: EmbeddedScene,
  attribute: string,
  rawValue: string,
  panels: Record<string, SceneCSSGridItem> = {}
) {
  const frame: DataFrame = {
    name: 'selected-tile',
    length: 1,
    fields: [{ name: 'Value', type: FieldType.number, values: [1], config: {}, labels: { [attribute]: rawValue } }],
  };
  const data: PanelData = { state: LoadingState.Done, series: [frame], timeRange: root.state.$timeRange!.state.value };
  const variable = new CustomVariable({ name: 'groupBy', query: attribute, value: attribute, text: attribute });
  const tile = getLayoutChild(
    root,
    panels,
    () => 'Selected tile',
    variable,
    'rate',
    () => []
  )(data, frame);
  root.setState({ body: tile });
  return { tile, frame, data };
}
