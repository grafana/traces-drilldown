import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { DataSourceVariable, SceneObject } from '@grafana/scenes';

import { LoadSearchModal } from './LoadSearchModal';
import { SavedSearch, useSavedSearches } from './saveSearch';
import { getDatasourceVariable, getFiltersVariable, getTraceExplorationScene } from '../../../utils/utils';

jest.mock('react-inlinesvg', () => ({
  __esModule: true,
  default: ({ src, innerRef, ...props }: { src?: string; innerRef?: React.Ref<HTMLSpanElement>; [key: string]: unknown }) =>
    React.createElement('span', { 'data-testid': 'mocked-svg', ...props }),
}));
jest.mock('./saveSearch');
jest.mock('../../../utils/utils');

const mockUseSavedSearches = useSavedSearches as jest.MockedFunction<typeof useSavedSearches>;
const mockGetDatasourceVariable = getDatasourceVariable as jest.MockedFunction<typeof getDatasourceVariable>;
const mockGetTraceExplorationScene = getTraceExplorationScene as jest.MockedFunction<typeof getTraceExplorationScene>;
const mockGetFiltersVariable = getFiltersVariable as jest.MockedFunction<typeof getFiltersVariable>;

const { applySavedSearchToScene } = jest.requireMock('./saveSearch');

const mockSearches: SavedSearch[] = [
  {
    uid: '1',
    title: 'Test Search 1',
    description: 'First test search',
    query: '{job="test1"}',
    dsUid: 'test-ds',
    timestamp: Date.now(),
  },
  {
    uid: '2',
    title: 'Test Search 2',
    description: 'Second test search',
    query: '{job="test2"}',
    dsUid: 'test-ds',
    timestamp: Date.now() - 1,
  },
];

describe('LoadSearchModal', () => {
  const mockOnClose = jest.fn();
  const mockDeleteSearch = jest.fn();
  const mockSceneRef = {} as unknown as SceneObject;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatasourceVariable.mockReturnValue({
      getValue: () => 'test-ds',
      changeValueTo: jest.fn(),
    } as unknown as DataSourceVariable);
    mockGetTraceExplorationScene.mockReturnValue({} as ReturnType<typeof getTraceExplorationScene>);
    mockGetFiltersVariable.mockReturnValue({
      setState: jest.fn(),
    } as unknown as ReturnType<typeof getFiltersVariable>);
    mockUseSavedSearches.mockReturnValue({
      saveSearch: jest.fn(),
      searches: mockSearches,
      isLoading: false,
      deleteSearch: mockDeleteSearch,
    });
  });

  test('renders the modal with saved searches', () => {
    render(<LoadSearchModal onClose={mockOnClose} sceneRef={mockSceneRef} />);

    expect(screen.getAllByText('Test Search 1')).toHaveLength(2);
    expect(screen.getByText('Test Search 2')).toBeInTheDocument();
  });

  test('Renders empty state when no searches', () => {
    mockUseSavedSearches.mockReturnValue({
      saveSearch: jest.fn(),
      searches: [],
      isLoading: false,
      deleteSearch: mockDeleteSearch,
    });

    render(<LoadSearchModal onClose={mockOnClose} sceneRef={mockSceneRef} />);

    expect(screen.getByText('No saved searches to display.')).toBeInTheDocument();
  });

  test('Selects a search when clicked', () => {
    render(<LoadSearchModal onClose={mockOnClose} sceneRef={mockSceneRef} />);

    fireEvent.click(screen.getAllByLabelText('Test Search 2')[0]);

    expect(screen.getByText('{job="test2"}')).toBeInTheDocument();
  });

  test('Applies filters and closes when Select is clicked', () => {
    render(<LoadSearchModal onClose={mockOnClose} sceneRef={mockSceneRef} />);

    fireEvent.click(screen.getByRole('button', { name: /^select$/i }));

    expect(applySavedSearchToScene).toHaveBeenCalledWith(mockSceneRef, '{job="test1"}', 'test-ds');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('Calls deleteSearch when delete button is clicked', () => {
    render(<LoadSearchModal onClose={mockOnClose} sceneRef={mockSceneRef} />);

    const deleteButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(deleteButton);

    expect(mockDeleteSearch).toHaveBeenCalledWith('1');
  });

});
