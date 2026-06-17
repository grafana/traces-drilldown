import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';

import { usePluginComponent } from '@grafana/runtime';
import { DataSourceVariable, sceneGraph, SceneObject, SceneTimeRange } from '@grafana/scenes';

import { LoadSearchScene } from './LoadSearchScene';
import { useHasSavedSearches, useSavedSearches, useQueryLibrarySupported } from './saveSearch';
import { getDatasourceVariable, getFiltersVariable, getTraceExplorationScene } from '../../../utils/utils';
import { DataQuery } from '@grafana/schema';

jest.mock('./saveSearch');
jest.mock('./LoadSearchModal', () => ({
  LoadSearchModal: jest.fn(() => null),
}));
jest.mock('../../../utils/utils');
jest.mock('@grafana/runtime');
jest.mock('@grafana/ui', () => {
  const actual = jest.requireActual('@grafana/ui');
  return {
    ...actual,
    ToolbarButton: ({ onClick, disabled }: { onClick?(): void; disabled?: boolean }) => (
      <button onClick={onClick} disabled={disabled}>
        Open
      </button>
    ),
    useStyles2: () => ({
      button: 'button',
    }),
  };
});

const mockUseHasSavedSearches = jest.mocked(useHasSavedSearches);
const mockGetDatasourceVariable = jest.mocked(getDatasourceVariable);
const mockGetTraceExplorationScene = jest.mocked(getTraceExplorationScene);
const mockGetFiltersVariable = jest.mocked(getFiltersVariable);
const mockUseSavedSearches = jest.mocked(useSavedSearches);
const { LoadSearchModal } = jest.requireMock('./LoadSearchModal');
const mockLoadSearchModal = jest.mocked(LoadSearchModal);
const { applySavedSearchToScene } = jest.requireMock('./saveSearch');

function FakeExposedComponent({ onSelectQuery }: { onSelectQuery(query: DataQuery): void }) {
  return (
    <div>
      <button
        onClick={() => {
          onSelectQuery({
            refId: 'A',
            datasource: {
              type: 'tempo',
              uid: 'test-ds',
            },
            query: '{job="test1"}',
          } as DataQuery);
        }}
      >
        Select
      </button>
    </div>
  );
}

describe('LoadSearchScene', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatasourceVariable.mockReturnValue({
      getValue: () => 'test-datasource-uid',
      subscribeToState: jest.fn(),
      changeValueTo: jest.fn(),
      state: {
        text: 'test-datasource-uid',
      },
    } as unknown as DataSourceVariable);
    mockGetFiltersVariable.mockReturnValue({
      setState: jest.fn(),
    } as unknown as ReturnType<typeof getFiltersVariable>);
    mockGetTraceExplorationScene.mockReturnValue({
      state: { embedded: false },
    } as ReturnType<typeof getTraceExplorationScene>);
    mockUseSavedSearches.mockReturnValue({
      deleteSearch: jest.fn(),
      saveSearch: jest.fn(),
      searches: [],
      isLoading: false,
    });
    jest.spyOn(sceneGraph, 'getAncestor').mockReturnValue({
      state: {
        embedded: false,
      },
    } as unknown as SceneObject);
    jest.spyOn(sceneGraph, 'getTimeRange').mockReturnValue({
      state: { value: { from: 'now-1h', to: 'now', raw: { from: 'now-1h', to: 'now' } } },
    } as unknown as SceneTimeRange);
    jest.mocked(usePluginComponent).mockReturnValue({ component: undefined, isLoading: false });
    jest.mocked(useQueryLibrarySupported).mockReturnValue(false);
  });

  test('Disables button when there are no saved searches', () => {
    mockUseHasSavedSearches.mockReturnValue(false);

    const scene = new LoadSearchScene({ dsUid: 'test-datasource-uid', dsName: 'test-datasource-uid' });
    render(<scene.Component model={scene} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  test('Enables button when there are saved searches', () => {
    mockUseHasSavedSearches.mockReturnValue(true);

    const scene = new LoadSearchScene({ dsUid: 'test-datasource-uid', dsName: 'test-datasource-uid' });
    render(<scene.Component model={scene} />);

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  test('Opens modal when button is clicked', () => {
    mockUseHasSavedSearches.mockReturnValue(true);

    const scene = new LoadSearchScene({ dsUid: 'test-datasource-uid', dsName: 'test-datasource-uid' });
    render(<scene.Component model={scene} />);

    expect(mockLoadSearchModal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button'));

    expect(mockLoadSearchModal).toHaveBeenCalledTimes(1);

    const firstModalCallProps = mockLoadSearchModal.mock.calls[0]?.[0] as { onClose(): void };
    act(() => {
      firstModalCallProps.onClose();
    });

    fireEvent.click(screen.getByRole('button'));
    expect(mockLoadSearchModal).toHaveBeenCalledTimes(2);
  });

  test('Returns null when the scene is embedded', () => {
    mockGetTraceExplorationScene.mockReturnValue({
      state: { embedded: true },
    } as ReturnType<typeof getTraceExplorationScene>);

    const scene = new LoadSearchScene({ dsUid: 'test-datasource-uid', dsName: 'test-datasource-uid' });
    const { container } = render(<scene.Component model={scene} />);

    expect(container.firstChild).toBeNull();
  });

  test('Uses the exposed component if available', () => {
    const component = () => <div>Exposed component</div>;
    jest.mocked(useQueryLibrarySupported).mockReturnValue(true);
    jest.mocked(usePluginComponent).mockReturnValue({ component, isLoading: false });

    const scene = new LoadSearchScene({ dsUid: 'test-datasource-uid', dsName: 'test-datasource-uid' });
    render(<scene.Component model={scene} />);

    expect(screen.getByText('Exposed component')).toBeInTheDocument();
  });

  describe('Loading a search', () => {
    beforeEach(() => {
      jest.mocked(useQueryLibrarySupported).mockReturnValue(true);
      // @ts-expect-error
      jest.mocked(usePluginComponent).mockReturnValue({ component: FakeExposedComponent, isLoading: false });
      mockUseHasSavedSearches.mockReturnValue(true);
    });

    test('Applies filters when a query is selected from the exposed component', () => {
      const scene = new LoadSearchScene({ dsUid: 'test-datasource-uid', dsName: 'test-datasource-uid' });
      render(<scene.Component model={scene} />);

      fireEvent.click(screen.getByText('Select'));

      expect(applySavedSearchToScene).toHaveBeenCalledWith(scene, '{job="test1"}', 'test-ds');
    });
  });
});
