import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';

import { usePluginComponent } from '@grafana/runtime';
import { DataSourceVariable, sceneGraph, SceneObject, SceneTimeRange } from '@grafana/scenes';

import { LoadSearchScene } from './LoadSearchScene';
import { useHasSavedSearches, useSavedSearches, isQueryLibrarySupported } from './saveSearch';
import { getDatasourceVariable, getFiltersVariable, getTraceExplorationScene } from '../../../utils/utils';
import { DataQuery } from '@grafana/schema';

jest.mock('react-inlinesvg', () => ({
  __esModule: true,
  default: ({ src, innerRef, ...props }: { src?: string; innerRef?: React.Ref<HTMLSpanElement>; [key: string]: unknown }) =>
    React.createElement('span', { 'data-testid': 'mocked-svg', ...props }),
}));
jest.mock('./saveSearch');
jest.mock('../../../utils/utils');
jest.mock('@grafana/runtime');

const mockUseHasSavedSearches = jest.mocked(useHasSavedSearches);
const mockGetDatasourceVariable = jest.mocked(getDatasourceVariable);
const mockGetTraceExplorationScene = jest.mocked(getTraceExplorationScene);
const mockGetFiltersVariable = jest.mocked(getFiltersVariable);
const mockUseSavedSearches = jest.mocked(useSavedSearches);
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
    jest.mocked(isQueryLibrarySupported).mockReturnValue(false);
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

    expect(screen.queryByText('Load a previously saved search')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.queryByText('Load a previously saved search')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close'));

    expect(screen.queryByText('Load a previously saved search')).not.toBeInTheDocument();
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
    jest.mocked(isQueryLibrarySupported).mockReturnValue(true);
    jest.mocked(usePluginComponent).mockReturnValue({ component, isLoading: false });

    const scene = new LoadSearchScene({ dsUid: 'test-datasource-uid', dsName: 'test-datasource-uid' });
    render(<scene.Component model={scene} />);

    expect(screen.getByText('Exposed component')).toBeInTheDocument();
  });

  describe('Loading a search', () => {
    beforeEach(() => {
      jest.mocked(isQueryLibrarySupported).mockReturnValue(true);
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
