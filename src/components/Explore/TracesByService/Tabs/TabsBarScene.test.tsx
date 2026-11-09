import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { sceneGraph } from '@grafana/scenes';
import { TabsBarScene } from './TabsBarScene';
import { actionViewTestIds } from 'utils/testIds';
import {
  getTraceByServiceScene,
  getTraceExplorationScene,
  getFiltersVariable,
  getPrimarySignalVariable,
} from 'utils/utils';

jest.mock('utils/utils', () => ({
  getTraceByServiceScene: jest.fn(),
  getTraceExplorationScene: jest.fn(),
  getFiltersVariable: jest.fn(),
  getPrimarySignalVariable: jest.fn(),
  getExceptionsScene: jest.fn(),
}));
jest.mock('../../actions/ShareExplorationAction', () => ({ ShareExplorationAction: () => null }));
jest.mock('@grafana/runtime', () => ({ ...jest.requireActual('@grafana/runtime'), usePluginComponent: () => ({}) }));

jest.mock('./Spans/SpansScene', () => ({ buildSpansScene: jest.fn() }));
jest.mock('./Structure/StructureScene', () => ({ buildStructureScene: jest.fn() }));
jest.mock('./Breakdown/BreakdownScene', () => ({ buildBreakdownScene: jest.fn() }));
jest.mock('./Exceptions/ExceptionsScene', () => ({ buildExceptionsScene: jest.fn() }));
jest.mock('./Comparison/ComparisonScene', () => ({ buildComparisonScene: jest.fn() }));
jest.mock('./AdaptiveTraces/AdaptiveTracesScene', () => ({ buildAdaptiveTracesScene: jest.fn() }));

describe('stable tab anchors', () => {
  const onUserSetActionView = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(sceneGraph, 'getData').mockReturnValue({ useState: () => ({}) } as any);
    jest.spyOn(sceneGraph, 'getTimeRange').mockReturnValue({ useState: () => ({}) } as any);
    (getTraceByServiceScene as jest.Mock).mockReturnValue({
      useState: () => ({ actionView: 'breakdown' }),
      state: {},
      onUserSetActionView,
    });
    (getFiltersVariable as jest.Mock).mockReturnValue({ useState: () => ({ filters: [] }) });
    (getPrimarySignalVariable as jest.Mock).mockReturnValue({ useState: () => ({ value: 'true' }) });
  });
  afterEach(() => jest.restoreAllMocks());
  function show(metric: string) {
    (getTraceExplorationScene as jest.Mock).mockReturnValue({
      getMetricVariable: () => ({ useState: () => ({ value: metric }) }),
      useState: () => ({}),
      state: {},
    });
    const model = new TabsBarScene({});
    return render(<model.Component model={model} />);
  }
  it('keeps the trace-list anchor on the actionable tab when its metric label changes', () => {
    const view = show('rate');
    expect(screen.getByTestId(actionViewTestIds.traceList)).toHaveTextContent('Traces');
    fireEvent.click(screen.getByTestId(actionViewTestIds.traceList));
    expect(onUserSetActionView).toHaveBeenCalledWith('traceList');
    view.unmount();
    show('duration');
    expect(screen.getByTestId(actionViewTestIds.traceList)).toHaveTextContent('Slow traces');
    expect(screen.getByTestId(actionViewTestIds.structure)).toHaveTextContent('Root cause latency');
  });
  it('preserves conditional availability for exceptions and adaptive traces', () => {
    const view = show('rate');
    expect(screen.queryByTestId(actionViewTestIds.exceptions)).not.toBeInTheDocument();
    expect(screen.queryByTestId(actionViewTestIds.adaptiveTraces)).not.toBeInTheDocument();
    view.unmount();
    show('errors');
    fireEvent.click(screen.getByTestId(actionViewTestIds.exceptions));
    expect(onUserSetActionView).toHaveBeenCalledWith('exceptions');
  });
});
