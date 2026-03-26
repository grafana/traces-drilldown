import React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { sceneGraph, SceneObject } from '@grafana/scenes';

import { SaveSearchModal } from './SaveSearchModal';
import { useCheckForExistingSearch, useSavedSearches } from './saveSearch';
import { renderTraceQLLabelFilters } from '../../../utils/filters-renderer';
import { getFiltersVariable, getTraceExplorationScene } from '../../../utils/utils';

jest.mock('react-inlinesvg', () => ({
  __esModule: true,
  default: ({ src, innerRef, ...props }: { src?: string; innerRef?: React.Ref<HTMLSpanElement>; [key: string]: unknown }) =>
    React.createElement('span', { 'data-testid': 'mocked-svg', ...props }),
}));
jest.mock('./saveSearch');
jest.mock('../../../utils/utils');
jest.mock('../../../utils/filters-renderer');
jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getAppEvents: jest.fn(() => ({
    publish: jest.fn(),
  })),
  reportInteraction: jest.fn(),
}));

const mockUseSaveSearches = jest.mocked(useSavedSearches);
const mockUseCheckForExistingSearch = jest.mocked(useCheckForExistingSearch);
const mockRenderTraceQLLabelFilters = jest.mocked(renderTraceQLLabelFilters);

describe('SaveSearchModal', () => {
  const mockOnClose = jest.fn();
  const mockSaveSearch = jest.fn();
  const mockSceneRef = {} as unknown as SceneObject;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCheckForExistingSearch.mockReturnValue(undefined);
    mockRenderTraceQLLabelFilters.mockReturnValue('{job="test"}');
    jest.spyOn(sceneGraph, 'getAncestor').mockReturnValue({} as unknown as SceneObject);
    jest.mocked(getTraceExplorationScene).mockReturnValue({} as ReturnType<typeof getTraceExplorationScene>);
    jest.mocked(getFiltersVariable).mockReturnValue({
      state: { filters: [] },
      useState: () => ({ filters: [] }),
    } as unknown as ReturnType<typeof getFiltersVariable>);

    mockUseSaveSearches.mockReturnValue({
      saveSearch: mockSaveSearch,
      isLoading: false,
      searches: [],
      deleteSearch: jest.fn(),
    });
  });

  test('renders the modal with query', () => {
    render(<SaveSearchModal dsUid="test-ds" onClose={mockOnClose} sceneRef={mockSceneRef} />);

    expect(screen.getByText('Save current search')).toBeInTheDocument();
    expect(screen.getByText('{job="test"}')).toBeInTheDocument();
  });

  test('submits the form with title and description', async () => {
    mockSaveSearch.mockResolvedValue(undefined);

    render(<SaveSearchModal dsUid="test-ds" onClose={mockOnClose} sceneRef={mockSceneRef} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Search' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test description' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockSaveSearch).toHaveBeenCalledWith({
        description: 'Test description',
        dsUid: 'test-ds',
        query: '{job="test"}',
        title: 'My Search',
      });
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('shows alert when search already exists', () => {
    mockUseCheckForExistingSearch.mockReturnValue({
      description: 'Test description',
      dsUid: 'test-ds',
      query: '{job="test"}',
      title: 'Existing Search',
      timestamp: 123456,
      uid: 'test',
    });

    render(<SaveSearchModal dsUid="test-ds" onClose={mockOnClose} sceneRef={mockSceneRef} />);

    expect(screen.getByText(/previously saved search/i)).toBeInTheDocument();
    expect(screen.getByText(/existing search/i)).toBeInTheDocument();
  });

  test('disables submit button when title is empty', () => {
    render(<SaveSearchModal dsUid="test-ds" onClose={mockOnClose} sceneRef={mockSceneRef} />);

    const submitButton = screen.getByRole('button', { name: /^save$/i });
    expect(submitButton).toBeDisabled();
  });
});
