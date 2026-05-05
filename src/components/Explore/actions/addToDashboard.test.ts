import { sceneGraph, SceneQueryRunner, type VizPanel } from '@grafana/scenes';

import {
  ADD_TO_DASHBOARD_COMPONENT_ID,
  ADD_TO_DASHBOARD_LABEL,
  EventOpenAddToDashboard,
  getPanelData,
  type PanelDataRequestPayload,
} from './addToDashboard';

describe('addToDashboard constants', () => {
  it('exposes the add-to-dashboard extension component id', () => {
    expect(ADD_TO_DASHBOARD_COMPONENT_ID).toBe('grafana/add-to-dashboard-form/v1');
  });

  it('exposes a stable menu label', () => {
    expect(ADD_TO_DASHBOARD_LABEL).toBe('Add to dashboard');
  });
});

describe('EventOpenAddToDashboard', () => {
  it('uses a fixed event type', () => {
    expect(EventOpenAddToDashboard.type).toBe('open-add-to-dashboard');
  });

  it('carries panel data on the payload', () => {
    const panelData = {
      panel: { type: 'timeseries', title: 'T', targets: [] },
      range: { from: 'now-1h', to: 'now', raw: { from: 'now-1h', to: 'now' } },
    } as unknown as PanelDataRequestPayload;

    const evt = new EventOpenAddToDashboard({ panelData });

    expect(evt.payload.panelData).toBe(panelData);
  });
});

describe('getPanelData', () => {
  const mockRange = { from: 'now-6h', to: 'now', raw: { from: 'now-6h', to: 'now' } };

  const baseVizPanel = (): VizPanel =>
    ({
      state: {
        pluginId: 'timeseries',
        title: '{{interval}} — RED',
        options: { legend: { displayMode: 'list' } },
        fieldConfig: { defaults: {}, overrides: [] },
      },
    }) as unknown as VizPanel;

  beforeEach(() => {
    jest.spyOn(sceneGraph, 'getTimeRange').mockReturnValue({
      state: { value: mockRange },
    } as unknown as ReturnType<typeof sceneGraph.getTimeRange>);

    jest.spyOn(sceneGraph, 'interpolate').mockImplementation((_scene, value) =>
      typeof value === 'string' ? `[interp:${value}]` : String(value ?? '')
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns time range from the scene graph', () => {
    const vizPanel = baseVizPanel();
    const dataRef = {};
    jest.spyOn(sceneGraph, 'getData').mockReturnValue(dataRef as ReturnType<typeof sceneGraph.getData>);
    jest.spyOn(sceneGraph, 'findObject').mockReturnValue(null);

    const { range } = getPanelData(vizPanel);

    expect(range).toBe(mockRange);
    expect(sceneGraph.getTimeRange).toHaveBeenCalledWith(vizPanel);
  });

  it('maps viz panel state onto the exported panel and clears targets when no query runner is found', () => {
    const vizPanel = baseVizPanel();
    jest.spyOn(sceneGraph, 'getData').mockReturnValue({} as ReturnType<typeof sceneGraph.getData>);
    jest.spyOn(sceneGraph, 'findObject').mockReturnValue(null);

    const { panel } = getPanelData(vizPanel);

    expect(panel.type).toBe('timeseries');
    expect(panel.title).toBe('[interp:{{interval}} — RED]');
    expect(panel.targets).toEqual([]);
    expect(panel.options).toEqual(vizPanel.state.options);
    expect(panel.fieldConfig).toEqual(vizPanel.state.fieldConfig);
    expect(sceneGraph.findObject).toHaveBeenCalled();
  });

  it('includes optional description when present', () => {
    const vizPanel = {
      ...baseVizPanel(),
      state: {
        ...baseVizPanel().state,
        description: 'Panel help text',
      },
    } as unknown as VizPanel;

    jest.spyOn(sceneGraph, 'getData').mockReturnValue({} as ReturnType<typeof sceneGraph.getData>);
    jest.spyOn(sceneGraph, 'findObject').mockReturnValue(null);

    expect(getPanelData(vizPanel).panel.description).toBe('Panel help text');
  });

  it('interpolates TraceQL targets, strips fromExploreMetrics, and interpolates datasource uid', () => {
    const vizPanel = baseVizPanel();
    const runner = new SceneQueryRunner({
      datasource: { uid: '${ds}', type: 'tempo' },
      queries: [
        {
          refId: 'A',
          query: '{ resource.service.name =~ "$service" }',
          fromExploreMetrics: true,
        },
      ],
      maxDataPoints: 240,
    });

    const dataRef = {};
    jest.spyOn(sceneGraph, 'getData').mockReturnValue(dataRef as ReturnType<typeof sceneGraph.getData>);
    jest.spyOn(sceneGraph, 'findObject').mockImplementation((_root, predicate) => {
      expect(predicate(runner)).toBe(true);
      return runner;
    });

    const { panel } = getPanelData(vizPanel);

    expect(panel.targets).toEqual([
      {
        refId: 'A',
        query: '[interp:{ resource.service.name =~ "$service" }]',
        fromExploreMetrics: false,
      },
    ]);
    expect(panel.datasource).toEqual({
      uid: '[interp:${ds}]',
      type: 'tempo',
    });
    expect(panel.maxDataPoints).toBe(240);
  });

  it('leaves an empty query string unmodified', () => {
    const vizPanel = baseVizPanel();
    const runner = new SceneQueryRunner({
      datasource: { uid: 'fixed-uid', type: 'tempo' },
      queries: [{ refId: 'A', query: '', fromExploreMetrics: true }],
    });

    jest.spyOn(sceneGraph, 'getData').mockReturnValue({} as ReturnType<typeof sceneGraph.getData>);
    jest.spyOn(sceneGraph, 'findObject').mockReturnValue(runner);

    const { panel } = getPanelData(vizPanel);

    expect(panel.targets?.[0]?.query).toBe('');
    expect(sceneGraph.interpolate).not.toHaveBeenCalledWith(vizPanel, '');
  });

  it('does not pass datasource through interpolate when uid is missing', () => {
    const vizPanel = baseVizPanel();
    const runner = new SceneQueryRunner({
      datasource: { type: 'tempo' },
      queries: [{ refId: 'A', query: 'count()' }],
    });

    jest.spyOn(sceneGraph, 'getData').mockReturnValue({} as ReturnType<typeof sceneGraph.getData>);
    jest.spyOn(sceneGraph, 'findObject').mockReturnValue(runner);

    const { panel } = getPanelData(vizPanel);

    expect(panel.datasource).toEqual({ type: 'tempo' });
  });
});
