import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';

import { DataLinksCustomContext } from './DataLinksCustomContext';
import { DataLinksContext, useDataLinksContext } from '@grafana/data';
import { getDataSourceSrv, usePluginFunctions } from '@grafana/runtime';

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
  getDataSourceSrv: jest.fn(),
  usePluginFunctions: jest.fn(),
}));

const mockedUseDataLinksContext = useDataLinksContext as unknown as jest.Mock;
const mockedUsePluginFunctions = usePluginFunctions as unknown as jest.Mock;
const mockedGetDataSourceSrv = getDataSourceSrv as jest.Mock;

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

  mockedGetDataSourceSrv.mockReturnValue({
    getInstanceSettings: jest.fn((uid: string) => ({ type: 'loki', uid })),
  });

  mockUpstreamProcessor.mockImplementation((options: any) => options.linkModel);
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedContext = null;
  setupAllConditionsMet();
});

// --- Tests ---

describe('DataLinksCustomContext', () => {
  describe('early return paths - renders children without Provider', () => {
    it('when embedded=true', () => {
      render(
        <DataLinksCustomContext embedded={true} timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(capturedContext).toBeNull();
    });

    it('when useDataLinksContext is unavailable', () => {
      mockedUseDataLinksContext.mockReturnValue(undefined);

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(capturedContext).toBeNull();
    });

    it('when usePluginFunctions returns no extensions', () => {
      mockedUsePluginFunctions.mockReturnValue({ functions: [] });

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(capturedContext).toBeNull();
    });

    it('when timeRange is not provided', () => {
      render(
        <DataLinksCustomContext>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(capturedContext).toBeNull();
    });
  });

  describe('Provider rendering', () => {
    it('renders Provider with custom dataLinkPostProcessor when all conditions are met', () => {
      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(capturedContext).not.toBeNull();
      expect(typeof capturedContext.dataLinkPostProcessor).toBe('function');
    });
  });

  describe('dataLinkPostProcessor callback logic', () => {
    it('updates href for Loki datasource links', () => {
      const mockPath = '/a/grafana-lokiexplore-app/explore';
      mockExtensionFn.mockReturnValue({ path: mockPath });

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      const linkModel = createMockLinkModel();
      const result = capturedContext.dataLinkPostProcessor({ linkModel });

      expect(result.href).toBe(mockPath);
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

    it('does not modify href for non-Loki datasource links', () => {
      mockedGetDataSourceSrv.mockReturnValue({
        getInstanceSettings: jest.fn(() => ({ type: 'prometheus', uid: 'ds-uid' })),
      });

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      const linkModel = createMockLinkModel();
      const result = capturedContext.dataLinkPostProcessor({ linkModel });

      expect(result.href).toBe('http://original-link');
      expect(mockExtensionFn).not.toHaveBeenCalled();
    });

    it('does not modify href when extension returns no path', () => {
      mockExtensionFn.mockReturnValue(undefined);

      render(
        <DataLinksCustomContext timeRange={createMockTimeRange() as any}>
          <TestConsumer />
        </DataLinksCustomContext>
      );

      const linkModel = createMockLinkModel();
      const result = capturedContext.dataLinkPostProcessor({ linkModel });

      expect(result.href).toBe('http://original-link');
      expect(mockExtensionFn).toHaveBeenCalled();
    });
  });
});
