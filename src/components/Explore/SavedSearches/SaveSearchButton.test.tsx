import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { usePluginComponent } from '@grafana/runtime';
import { DataSourceVariable, SceneObject, sceneGraph } from '@grafana/scenes';

import { SaveSearchButton } from './SaveSearchButton';
import { isQueryLibrarySupported, useSavedSearches } from './saveSearch';
import { renderTraceQLLabelFilters } from '../../../utils/filters-renderer';
import { getDatasourceVariable, getFiltersVariable, getTraceExplorationScene } from '../../../utils/utils';

jest.mock('react-inlinesvg', () => ({
  __esModule: true,
  default: ({ src, innerRef, ...props }: { src?: string; innerRef?: React.Ref<HTMLSpanElement>; [key: string]: unknown }) =>
    React.createElement('span', { 'data-testid': 'mocked-svg', ...props }),
}));
jest.mock('./saveSearch');
jest.mock('../../../utils/utils');
jest.mock('../../../utils/filters-renderer');
jest.mock('@grafana/runtime');

const mockGetDatasourceVariable = jest.mocked(getDatasourceVariable);
const mockGetTraceExplorationScene = jest.mocked(getTraceExplorationScene);
const mockGetFiltersVariable = jest.mocked(getFiltersVariable);
const mockUseSaveSearches = jest.mocked(useSavedSearches);

describe('SaveSearchButton', () => {
  const mockSceneRef = {} as unknown as SceneObject;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatasourceVariable.mockReturnValue({
      getValue: () => 'test-datasource-uid',
      state: {
        text: 'test-datasource-uid',
      },
    } as DataSourceVariable);
    mockGetTraceExplorationScene.mockReturnValue({ state: { embedded: false } } as ReturnType<typeof getTraceExplorationScene>);
    const mockFilters = [{ key: 'job', operator: '=' as const, value: 'test' }];
    mockGetFiltersVariable.mockReturnValue({
      state: { filters: mockFilters },
      useState: () => ({ filters: mockFilters }),
    } as unknown as ReturnType<typeof getFiltersVariable>);
    jest.mocked(renderTraceQLLabelFilters).mockReturnValue('{job="test"}');
    jest.spyOn(sceneGraph, 'getAncestor').mockReturnValue({
      state: { embedded: false },
    } as unknown as SceneObject);
    mockUseSaveSearches.mockReturnValue({
      saveSearch: jest.fn(),
      isLoading: false,
      searches: [],
      deleteSearch: jest.fn(),
    });
    jest.mocked(usePluginComponent).mockReturnValue({ component: undefined, isLoading: false });
    jest.mocked(isQueryLibrarySupported).mockReturnValue(false);
  });

  test('Opens the modal when the button is clicked', () => {
    render(<SaveSearchButton sceneRef={mockSceneRef} />);

    expect(screen.queryByText('Save current search')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(screen.getByText('Save current search')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.queryByText('Save current search')).not.toBeInTheDocument();
  });

  test('Returns null when the scene is embedded', () => {
    mockGetTraceExplorationScene.mockReturnValue({
      state: { embedded: true },
    } as ReturnType<typeof getTraceExplorationScene>);

    const { container } = render(<SaveSearchButton sceneRef={mockSceneRef} />);
    expect(container.firstChild).toBeNull();
  });

  test('Returns null when there are no filters', () => {
    mockGetFiltersVariable.mockReturnValue({
      state: { filters: [] },
      useState: () => ({ filters: [] }),
    } as unknown as ReturnType<typeof getFiltersVariable>);

    const { container } = render(<SaveSearchButton sceneRef={mockSceneRef} />);
    expect(container.firstChild).toBeNull();
  });

  test('Uses the exposed component if available', () => {
    const component = () => <div>Exposed component</div>;
    jest.mocked(isQueryLibrarySupported).mockReturnValue(true);
    jest.mocked(usePluginComponent).mockReturnValue({ component, isLoading: false });

    render(<SaveSearchButton sceneRef={mockSceneRef} />);

    expect(screen.getByText('Exposed component')).toBeInTheDocument();
  });
});
