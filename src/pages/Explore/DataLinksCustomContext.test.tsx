import React, { useContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { DataLinksCustomContext } from './DataLinksCustomContext';
import { DataLinksContext, GrafanaConfig, locationUtil, useDataLinksContext } from '@grafana/data';
import { usePluginFunctions } from '@grafana/runtime';
import { getDataSourceInstanceList } from '@grafana/plugin-compat/datasources';

// --- Mocks ---

const mockUpstreamProcessor = jest.fn((options: any) => options.linkModel);

jest.mock('@grafana/data', () => {
  const actualReact = require('react');
  return {
    ...jest.requireActual('@grafana/data'),
    DataLinksContext: actualReact.createContext(null),
    useDataLinksContext: jest.fn(),
  };
});

jest.mock('@grafana/runtime', () => ({
  usePluginFunctions: jest.fn(),
}));

jest.mock('@grafana/plugin-compat/datasources', () => ({
  getDataSourceInstanceList: jest.fn(),
}));

const mockedUseDataLinksContext = useDataLinksContext as unknown as jest.Mock;
const mockedUsePluginFunctions = usePluginFunctions as unknown as jest.Mock;
const mockedGetDataSourceInstanceList = jest.mocked(getDataSourceInstanceList);

// --- Helpers ---

function createMockTimeRange() {
  return {
    from: new Date('2024-01-01T00:00:00Z') as any,
    to: new Date('2024-01-01T01:00:00Z') as any,
    raw: { from: 'now-1h', to: 'now' },
  };
}

function createMockLinkModel(overrides: Record<string, any> = {}) {
  return {
    href: 'http://original-link',
    interpolatedParams: {
      query: {
        refId: 'A',
        datasource: { uid: 'ds-uid', type: 'loki' },
        expr: '{job="test"}',
      },
      timeRange: createMockTimeRange(),
    },
    ...overrides,
  };
}

// Captures the context value provided through DataLinksContext.Provider
let capturedContext: any = null;
function TestConsumer() {
  capturedContext = useContext(DataLinksContext as React.Context<any>);
  return <div data-testid="child">child</div>;
}

// --- Setup ---

const mockExtensionFn = jest.fn();

function setupAllConditionsMet() {
  mockedUseDataLinksContext.mockReturnValue({
    dataLinkPostProcessor: mockUpstreamProcessor,
  });

  mockedUsePluginFunctions.mockReturnValue({
    functions: [{ fn: mockExtensionFn }],
  });

  mockedGetDataSourceInstanceList.mockResolvedValue([{ type: 'loki', uid: 'ds-uid' }]);

  mockUpstreamProcessor.mockImplementation((options: any) => options.linkModel);
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedContext = null;
  setupAllConditionsMet();
  locationUtil.initialize({
    config: { appSubUrl: '/grafana' } as GrafanaConfig,
    getTimeRangeForUrl: () => ({ from: 'now-1h', to: 'now' }),
    getVariablesUrlParams: () => ({}),
  });
});

// --- Tests ---

describe('DataLinksCustomContext', () => {
  describe('early return paths - renders children without Provider', () => {
    it('when embedded=true', async () => {
      render(
        <DataLinksCustomContext embedded={true} timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(capturedContext).toBeNull();
      });
    });

    it('when useDataLinksContext is unavailable', async () => {
      mockedUseDataLinksContext.mockReturnValue(undefined);

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(capturedContext).toBeNull();
      });
    });

    it('when usePluginFunctions returns no extensions', async () => {
      mockedUsePluginFunctions.mockReturnValue({ functions: [] });

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(capturedContext).toBeNull();
      });
    });

    it('when extension entry exists but fn is missing', async () => {
      mockedUsePluginFunctions.mockReturnValue({ functions: [{} as any] });

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(capturedContext).toBeNull();
      });
    });

    it('when timeRange is not provided', async () => {
      render(
        <DataLinksCustomContext>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(capturedContext).toBeNull();
      });
    });
  });

  describe('Provider rendering', () => {
    it('renders Provider with custom dataLinkPostProcessor when all conditions are met', async () => {
      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(capturedContext).not.toBeNull();
        expect(typeof capturedContext.dataLinkPostProcessor).toBe('function');
      });
    });
  });

  describe('dataLinkPostProcessor callback logic', () => {
    it('updates href for Loki datasource links', async () => {
      const mockPath = '/a/grafana-lokiexplore-app/explore';
      mockExtensionFn.mockReturnValue({ path: mockPath });

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        const linkModel = createMockLinkModel();
        const result = capturedContext.dataLinkPostProcessor({ linkModel });

        expect(result.href).toBe(`/grafana${mockPath}`);
      });

      expect(mockExtensionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: expect.arrayContaining([
            expect.objectContaining({
              datasource: expect.objectContaining({ type: 'loki' }),
            }),
          ]),
        })
      );
    });

    it('does not modify href for non-Loki datasource links', async () => {
      mockedGetDataSourceInstanceList.mockResolvedValue([{ type: 'prometheus', uid: 'ds-prom-uid' }]);

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        const linkModel = createMockLinkModel();
        const result = capturedContext.dataLinkPostProcessor({ linkModel });

        expect(result.href).toBe('http://original-link');
        expect(mockExtensionFn).not.toHaveBeenCalled();
      });
    });

    it('maintains stable dataLinkPostProcessor reference across re-renders', async () => {
      const { rerender } = render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        capturedContext.dataLinkPostProcessor({ linkModel: createMockLinkModel() });
        expect(mockExtensionFn).toHaveBeenCalled();
      });

      const firstProcessor = capturedContext.dataLinkPostProcessor;

      rerender(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      expect(capturedContext.dataLinkPostProcessor).toBe(firstProcessor);
    });

    it('does not modify href when extension returns no path', async () => {
      mockExtensionFn.mockReturnValue(undefined);

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      await waitFor(() => {
        const linkModel = createMockLinkModel();
        const result = capturedContext.dataLinkPostProcessor({ linkModel });

        expect(mockExtensionFn).toHaveBeenCalled();
        expect(result.href).toBe('http://original-link');
      });
    });
  });
});
