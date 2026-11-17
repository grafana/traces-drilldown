import { dateTime } from '@grafana/data';
import * as scenes from '@grafana/scenes';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TracesByServiceScene } from 'components/Explore/TracesByService/TracesByServiceScene';
import { TraceExploration } from '../../pages/Explore/TraceExploration';
import EmbeddedTraceExceptions from './EmbeddedTraceExceptions';

jest.mock('../../components/App/App', () => ({
  usePluginJsonData: () => ({ queryRangeHours: 6 }),
}));

jest.mock('components/Explore/TracesByService/TracesByServiceScene', () => {
  class TracesByServiceScene {
    state: { exceptionsScene?: { Component: () => React.JSX.Element } } = {};
    isActive = false;
    activate() {
      this.isActive = true;
      if (!this.state.exceptionsScene) {
        this.state.exceptionsScene = { Component: () => <div>exceptions-table</div> };
      }
      return () => undefined;
    }
  }
  return { TracesByServiceScene };
});

jest.mock('../../pages/Explore/TraceExploration', () => ({
  TraceExploration: jest.fn().mockImplementation((state) => ({
    state,
    isActive: false,
    getMetricVariable: jest.fn(),
    activate: jest.fn(() => jest.fn()),
    Component: () => <div>full-exploration</div>,
  })),
}));

const initialTimeRange = {
  from: dateTime('2026-01-01T00:00:00Z'),
  to: dateTime('2026-01-01T01:00:00Z'),
  raw: { from: 'now-1h', to: 'now' },
};

describe('EmbeddedTraceExceptions', () => {
  beforeEach(() => {
    jest.mocked(TraceExploration).mockClear();
    jest.spyOn(scenes, 'syncStateFromSearchParams').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mounts the exceptions tab and does not read the host URL', () => {
    render(
      <EmbeddedTraceExceptions
        initialTimeRange={initialTimeRange}
        initialDS="tempo"
        initialFilters={[{ key: 'resource.service.name', operator: '=', value: 'api' }]}
        embedderName="Assistant"
      />
    );

    expect(screen.queryByText('full-exploration')).not.toBeInTheDocument();
    const exploration = jest.mocked(TraceExploration).mock.results[0]?.value;
    expect(exploration.getMetricVariable).toHaveBeenCalled();
    expect(exploration.activate).toHaveBeenCalled();
    expect(scenes.syncStateFromSearchParams).not.toHaveBeenCalled();
    expect(TraceExploration).toHaveBeenCalledWith(
      expect.objectContaining({
        embedded: true,
        initialMetric: 'errors',
        initialActionView: 'exceptions',
        allowedActionViews: ['exceptions'],
        initialDS: 'tempo',
        embedderName: 'Assistant',
        queryRangeHours: 6,
      })
    );
  });

  it('renders the exceptions scene on the first render', () => {
    const service = new TracesByServiceScene({});
    jest.mocked(TraceExploration).mockImplementationOnce(
      (state) =>
        ({
          state: { ...state, topScene: service },
          isActive: false,
          getMetricVariable: jest.fn(),
          activate: jest.fn(() => jest.fn()),
          Component: () => null,
        }) as unknown as TraceExploration
    );

    render(
      <EmbeddedTraceExceptions
        initialTimeRange={initialTimeRange}
        initialDS="tempo"
        initialFilters={[{ key: 'resource.service.name', operator: '=', value: 'api' }]}
        embedderName="Assistant"
      />
    );

    expect(screen.getByText('exceptions-table')).toBeInTheDocument();
  });

  it('stops the exploration and service when unmounted', () => {
    const deactivateExploration = jest.fn();
    const deactivateService = jest.fn();
    const service = new TracesByServiceScene({});
    service.activate = () => {
      service.isActive = true;
      service.state.exceptionsScene = { Component: () => <div>exceptions-table</div> };
      return deactivateService;
    };
    jest.mocked(TraceExploration).mockImplementationOnce(
      (state) =>
        ({
          state: { ...state, topScene: service },
          isActive: false,
          getMetricVariable: jest.fn(),
          activate: () => deactivateExploration,
          Component: () => null,
        }) as unknown as TraceExploration
    );

    const { unmount } = render(
      <EmbeddedTraceExceptions
        initialTimeRange={initialTimeRange}
        initialDS="tempo"
        initialFilters={[{ key: 'resource.service.name', operator: '=', value: 'api' }]}
        embedderName="Assistant"
      />
    );

    unmount();

    expect(deactivateService).toHaveBeenCalledTimes(1);
    expect(deactivateExploration).toHaveBeenCalledTimes(1);
  });
});
