import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttributesSidebar } from './AttributesSidebar';
import { SelectableValue } from '@grafana/data';
import { AdHocFiltersVariable, SceneObject } from '@grafana/scenes';

// Mock react-inlinesvg to prevent async state updates during tests
jest.mock('react-inlinesvg', () => ({
  __esModule: true,
  default: ({ src, innerRef, ...props }: any) => React.createElement('span', { 'data-testid': 'mocked-svg', ...props }),
}));

// Mock the hooks and utilities
jest.mock('hooks', () => ({
  useFavoriteAttributes: jest.fn(() => ({
    favoriteAttributes: [],
    toggleFavorite: jest.fn(),
    reorderFavorites: jest.fn(),
  })),
}));

jest.mock('utils/utils', () => ({
  getFiltersVariable: jest.fn(),
  getTraceByServiceScene: jest.fn(() => ({
    useState: jest.fn(() => ({ attributes: [] })),
  })),
}));

const mockUseFavoriteAttributes = require('hooks').useFavoriteAttributes;
const mockGetFiltersVariable = require('utils/utils').getFiltersVariable;

// Helper function to create a mock useState implementation for filters
// This returns a jest mock function with a complete mock state object
const createMockUseState = (filters: Array<{ key: string; operator: string; value: string }>) => {
  return jest.fn(() => ({
    filters,
    datasource: null,
    applyMode: 'manual' as const,
    type: 'adhoc' as const,
    name: 'filters',
  }));
};

describe('AttributesSidebar', () => {
  let mockModel: SceneObject;
  let mockFiltersVariable: AdHocFiltersVariable;
  let mockOnAttributeChange: jest.Mock;

  const sampleOptions: Array<SelectableValue<string>> = [
    { label: 'resource.service.name', value: 'resource.service.name' },
    { label: 'resource.cluster', value: 'resource.cluster' },
    { label: 'resource.namespace', value: 'resource.namespace' },
    { label: 'span.http.method', value: 'span.http.method' },
    { label: 'span.http.status_code', value: 'span.http.status_code' },
    { label: 'span.db.system', value: 'span.db.system' },
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockOnAttributeChange = jest.fn();

    // Setup mock model
    mockModel = {
      useState: jest.fn(() => ({})),
    } as unknown as SceneObject;

    // Setup mock filters variable
    mockFiltersVariable = {
      state: { filters: [] },
      useState: jest.fn(() => ({ filters: [] })),
      setState: jest.fn(),
    } as unknown as AdHocFiltersVariable;

    mockGetFiltersVariable.mockReturnValue(mockFiltersVariable);

    // Setup favorites hook mock
    mockUseFavoriteAttributes.mockReturnValue({
      favoriteAttributes: [],
      toggleFavorite: jest.fn(),
      reorderFavorites: jest.fn(),
    });

    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
  });

  describe('Rendering', () => {
    it('should render the sidebar with default title', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByText('Attributes')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          title="Custom Title"
          model={mockModel}
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render all attribute options', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByText('service.name')).toBeInTheDocument();
      expect(screen.getByText('cluster')).toBeInTheDocument();
      expect(screen.getByText('http.method')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByPlaceholderText('Search attributes...')).toBeInTheDocument();
    });

    it('should render scope tabs', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Resource')).toBeInTheDocument();
      expect(screen.getByText('Span')).toBeInTheDocument();
    });

    it('should render Favorites tab when showFavorites is true', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    it('should not render Favorites tab when showFavorites is false', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={false}
        />
      );

      expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
    });
  });

  describe('Single Selection Mode', () => {
    it('should display selected attribute', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected="resource.service.name"
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      expect(screen.getByText('resource.service.name')).toBeInTheDocument();
    });

    it('should call onAttributeChange when clicking an attribute', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      fireEvent.click(screen.getByText('service.name'));

      expect(mockOnAttributeChange).toHaveBeenCalledWith('resource.service.name');
    });

    it('should deselect attribute when clicking selected attribute', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected="resource.service.name"
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      fireEvent.click(screen.getByText('service.name'));

      expect(mockOnAttributeChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Multi Selection Mode', () => {
    it('should display selected count', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={['resource.service.name', 'span.http.method']}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          isMulti={true}
        />
      );

      expect(screen.getByText(/Selected \(2\):/)).toBeInTheDocument();
    });

    it('should render checkboxes for each attribute', () => {
      const { container } = render(
        <AttributesSidebar
          options={sampleOptions}
          selected={[]}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          isMulti={true}
        />
      );

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should add attribute to selection when clicking unchecked attribute', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={['resource.service.name']}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          isMulti={true}
        />
      );

      const checkbox = screen.getAllByRole('checkbox')[1]; // Second checkbox
      fireEvent.click(checkbox);

      expect(mockOnAttributeChange).toHaveBeenCalledWith(expect.arrayContaining(['resource.service.name']));
    });

    it('should remove attribute from selection when clicking checked attribute', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={['resource.service.name', 'span.http.method']}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          isMulti={true}
        />
      );

      const checkbox = screen.getAllByRole('checkbox')[0]; // First checkbox (assuming it's checked)
      fireEvent.click(checkbox);

      expect(mockOnAttributeChange).toHaveBeenCalled();
    });

    it('should not show "All" button when allowAllOption is false', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={['resource.service.name']}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          isMulti={true}
          allowAllOption={false}
        />
      );

      // Should not show the "All" secondary button
      const allButtons = screen.queryAllByRole('button', { name: 'All' });
      const secondaryButton = allButtons.find(
        (button) => button.getAttribute('type') !== 'button' || button.classList.contains('css-')
      );
      expect(secondaryButton).toBeUndefined();
    });

    it('should show "All" button when allowAllOption is true and not selected', () => {
      const { container } = render(
        <AttributesSidebar
          options={sampleOptions}
          selected={['resource.service.name']}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          isMulti={true}
          allowAllOption={true}
        />
      );

      // Check that selected attribute container has an "All" button
      const selectedContainer = container.querySelector('.css-1klk34');
      expect(selectedContainer).toBeInTheDocument();
      expect(selectedContainer?.textContent).toContain('All');
    });
  });

  describe('Search Functionality', () => {
    it('should filter attributes based on search text', async () => {
      const user = userEvent.setup();
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search attributes...');
      await user.type(searchInput, 'http');

      expect(screen.getByText('http.method')).toBeInTheDocument();
      expect(screen.getByText('http.status_code')).toBeInTheDocument();
      expect(screen.queryByText('service.name')).not.toBeInTheDocument();
    });

    it('should support case-insensitive search', async () => {
      const user = userEvent.setup();
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search attributes...');
      await user.type(searchInput, 'HTTP');

      expect(screen.getByText('http.method')).toBeInTheDocument();
      expect(screen.getByText('http.status_code')).toBeInTheDocument();
    });

    it('should support regex search - start with pattern', async () => {
      const user = userEvent.setup();
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search attributes...');
      await user.type(searchInput, '^service');

      expect(screen.getByText('service.name')).toBeInTheDocument();
      expect(screen.queryByText('namespace')).not.toBeInTheDocument();
    });

    it('should support regex search - end with pattern', async () => {
      const user = userEvent.setup();
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search attributes...');
      await user.type(searchInput, '\\.name$');

      // Should match service.name (ends with .name) but not namespace (ends with space)
      expect(screen.getByText('service.name')).toBeInTheDocument();
      expect(screen.queryByText('namespace')).not.toBeInTheDocument();
    });

    it('should support regex search - OR pattern', async () => {
      const user = userEvent.setup();
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search attributes...');
      await user.type(searchInput, '(http|db)');

      expect(screen.getByText('http.method')).toBeInTheDocument();
      expect(screen.getByText('db.system')).toBeInTheDocument();
      expect(screen.queryByText('service.name')).not.toBeInTheDocument();
    });

    it('should support regex search - wildcard pattern', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search attributes...');
      // Use regex wildcard pattern
      fireEvent.change(searchInput, { target: { value: 'http.*' } });

      // Should find both http attributes
      expect(screen.getByText('http.method')).toBeInTheDocument();
      expect(screen.getByText('http.status_code')).toBeInTheDocument();
      // But not other attributes
      expect(screen.queryByText('service.name')).not.toBeInTheDocument();
    });

    it('should clear search on Escape key', async () => {
      const user = userEvent.setup();
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search attributes...');
      await user.type(searchInput, 'http');
      expect(searchInput).toHaveValue('http');

      await user.type(searchInput, '{Escape}');
      expect(searchInput).toHaveValue('');
    });

    it('should clear search when clicking clear button', async () => {
      const user = userEvent.setup();
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search attributes...');
      await user.type(searchInput, 'http');

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
    });

    it('should show empty state when no results match search', async () => {
      const user = userEvent.setup();
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search attributes...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No attributes match your criteria')).toBeInTheDocument();
    });
  });

  describe('Scope Filtering', () => {
    it('should show all attributes by default', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByText('service.name')).toBeInTheDocument();
      expect(screen.getByText('http.method')).toBeInTheDocument();
    });

    it('should filter to Resource scope when Resource tab is clicked', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      fireEvent.click(screen.getByText('Resource'));

      expect(screen.getByText('service.name')).toBeInTheDocument();
      expect(screen.getByText('cluster')).toBeInTheDocument();
      expect(screen.queryByText('http.method')).not.toBeInTheDocument();
    });

    it('should filter to Span scope when Span tab is clicked', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      fireEvent.click(screen.getByText('Span'));

      expect(screen.getByText('http.method')).toBeInTheDocument();
      expect(screen.getByText('db.system')).toBeInTheDocument();
      expect(screen.queryByText('service.name')).not.toBeInTheDocument();
    });

    it('should show scope badges when All scope is selected', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getAllByText('resource.').length).toBeGreaterThan(0);
      expect(screen.getAllByText('span.').length).toBeGreaterThan(0);
    });

    it('should not show scope badges when specific scope is selected', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      fireEvent.click(screen.getByText('Resource'));

      // Should not show badge when filtering to specific scope
      const badges = screen.queryAllByText('resource.');
      expect(badges.length).toBe(0);
    });
  });

  describe('Favorites Management', () => {
    it('should show favorites tab in first position when showFavorites is true', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      const tabs = screen.getAllByRole('tab');
      // Favorites should be first
      expect(tabs[0]).toHaveTextContent('Favorites');
    });

    it('should start with Favorites scope when showFavorites is true', () => {
      mockUseFavoriteAttributes.mockReturnValue({
        favoriteAttributes: ['resource.service.name'],
        toggleFavorite: jest.fn(),
        reorderFavorites: jest.fn(),
      });

      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      // Should only show favorite attributes
      expect(screen.getByText('service.name')).toBeInTheDocument();
      expect(screen.queryByText('cluster')).not.toBeInTheDocument();
    });

    it('should call toggleFavorite when star button is clicked', () => {
      const mockToggleFavorite = jest.fn();
      mockUseFavoriteAttributes.mockReturnValue({
        favoriteAttributes: [],
        toggleFavorite: mockToggleFavorite,
        reorderFavorites: jest.fn(),
      });

      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      // Click on the All tab to see all attributes
      fireEvent.click(screen.getByText('All'));

      // Find and click star button
      const starButtons = screen.getAllByRole('button', { name: /add to favorites/i });
      fireEvent.click(starButtons[0]);

      expect(mockToggleFavorite).toHaveBeenCalled();
    });

    it('should show filled star for favorite attributes', () => {
      mockUseFavoriteAttributes.mockReturnValue({
        favoriteAttributes: ['resource.service.name'],
        toggleFavorite: jest.fn(),
        reorderFavorites: jest.fn(),
      });

      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      fireEvent.click(screen.getByText('All'));

      expect(screen.getByRole('button', { name: /remove from favorites/i })).toBeInTheDocument();
    });

    it('should display favorites in custom order', () => {
      mockUseFavoriteAttributes.mockReturnValue({
        favoriteAttributes: ['span.http.method', 'resource.service.name', 'span.db.system'],
        toggleFavorite: jest.fn(),
        reorderFavorites: jest.fn(),
      });

      const { container } = render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      const items = container.querySelectorAll('li[draggable="true"]');
      // Order should match favoriteAttributes array
      expect(items[0]).toHaveTextContent('http.method');
      expect(items[1]).toHaveTextContent('service.name');
      expect(items[2]).toHaveTextContent('db.system');
    });

    it('should make items draggable in Favorites scope', () => {
      mockUseFavoriteAttributes.mockReturnValue({
        favoriteAttributes: ['resource.service.name', 'span.http.method'],
        toggleFavorite: jest.fn(),
        reorderFavorites: jest.fn(),
      });

      const { container } = render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      const draggableItems = container.querySelectorAll('li[draggable="true"]');
      expect(draggableItems.length).toBeGreaterThan(0);
    });

    it('should not make items draggable in non-Favorites scope', () => {
      mockUseFavoriteAttributes.mockReturnValue({
        favoriteAttributes: ['resource.service.name'],
        toggleFavorite: jest.fn(),
        reorderFavorites: jest.fn(),
      });

      const { container } = render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      fireEvent.click(screen.getByText('All'));

      const draggableItems = container.querySelectorAll('li[draggable="true"]');
      expect(draggableItems.length).toBe(0);
    });
  });

  describe('Drag and Drop', () => {
    it('should call reorderFavorites on successful drop', () => {
      const mockReorderFavorites = jest.fn();
      mockUseFavoriteAttributes.mockReturnValue({
        favoriteAttributes: ['resource.service.name', 'span.http.method', 'span.db.system'],
        toggleFavorite: jest.fn(),
        reorderFavorites: mockReorderFavorites,
      });

      const { container } = render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      const items = container.querySelectorAll('li[draggable="true"]');

      // Simulate drag from first to third item
      fireEvent.dragStart(items[0]);
      fireEvent.dragEnter(items[2]);
      fireEvent.drop(items[2]);
      fireEvent.dragEnd(items[0]);

      expect(mockReorderFavorites).toHaveBeenCalled();
    });

    it('should show ghost element during drag over', () => {
      mockUseFavoriteAttributes.mockReturnValue({
        favoriteAttributes: ['resource.service.name', 'span.http.method'],
        toggleFavorite: jest.fn(),
        reorderFavorites: jest.fn(),
      });

      const { container } = render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      const items = container.querySelectorAll('li[draggable="true"]');

      fireEvent.dragStart(items[0]);
      fireEvent.dragEnter(items[1]);

      // Ghost element should appear
      expect(screen.getByText('Drop here')).toBeInTheDocument();
    });
  });

  describe('Filter Detection', () => {
    it('should show filter icon for filtered attributes', () => {
      mockFiltersVariable.useState = createMockUseState([
        { key: 'resource.service.name', operator: '=', value: 'test' },
      ]);

      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      // Find the filtered attribute and check for filter icon
      const serviceNameItem = screen.getByText('service.name').closest('li');
      expect(serviceNameItem).toBeInTheDocument();
    });

    it('should update tooltip for filtered attributes', () => {
      mockFiltersVariable.useState = createMockUseState([
        { key: 'resource.service.name', operator: '=', value: 'test' },
      ]);

      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const serviceNameItem = screen.getByText('service.name').closest('li');
      expect(serviceNameItem).toHaveAttribute('title', 'Filtered: service.name');
    });

    it('should show filtered attributes correctly in single mode', () => {
      mockFiltersVariable.useState = createMockUseState([
        { key: 'resource.service.name', operator: '=', value: 'test' },
      ]);

      render(
        <AttributesSidebar
          options={sampleOptions}
          selected="span.http.method"
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      // Verify filtered attribute has special title
      const serviceNameItem = screen.getByText('service.name').closest('li');
      expect(serviceNameItem).toHaveAttribute('title', 'Filtered: service.name');

      // Verify non-filtered attribute doesn't have special title
      const httpMethodItem = screen.getByText('http.method').closest('li');
      expect(httpMethodItem).toHaveAttribute('title', 'http.method');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options array', () => {
      render(
        <AttributesSidebar
          options={[]}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByText('No attributes available')).toBeInTheDocument();
    });

    it('should handle options with missing values', () => {
      const optionsWithMissing = [
        { label: 'Valid', value: 'valid' },
        { label: 'Invalid', value: undefined },
      ] as Array<SelectableValue<string>>;

      render(
        <AttributesSidebar
          options={optionsWithMissing}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.queryByText('Invalid')).not.toBeInTheDocument();
    });

    it('should strip attribute prefixes from labels', () => {
      const optionsWithPrefixes = [
        { label: 'resource.service.name', value: 'resource.service.name' },
        { label: 'span.http.method', value: 'span.http.method' },
      ];

      render(
        <AttributesSidebar
          options={optionsWithPrefixes}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByText('service.name')).toBeInTheDocument();
      expect(screen.getByText('http.method')).toBeInTheDocument();
    });

    it('should sort attributes alphabetically', () => {
      const unsortedOptions = [
        { label: 'resource.zebra', value: 'resource.zebra' },
        { label: 'resource.alpha', value: 'resource.alpha' },
        { label: 'resource.middle', value: 'resource.middle' },
      ];

      const { container } = render(
        <AttributesSidebar
          options={unsortedOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      const items = container.querySelectorAll('li');
      const labels = Array.from(items).map((item) => item.textContent);

      // Should be sorted alphabetically
      expect(labels[0]).toContain('alpha');
      expect(labels[1]).toContain('middle');
      expect(labels[2]).toContain('zebra');
    });

    it('should handle undefined selected value in single mode', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
        />
      );

      expect(screen.getByText(/Selected:/)).toBeInTheDocument();
    });

    it('should handle empty array in multi mode', () => {
      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={[]}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          isMulti={true}
        />
      );

      expect(screen.getByText(/Selected \(0\):/)).toBeInTheDocument();
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('should not trigger selection when clicking star button', () => {
      mockUseFavoriteAttributes.mockReturnValue({
        favoriteAttributes: [],
        toggleFavorite: jest.fn(),
        reorderFavorites: jest.fn(),
      });

      render(
        <AttributesSidebar
          options={sampleOptions}
          selected={undefined}
          onAttributeChange={mockOnAttributeChange}
          model={mockModel}
          showFavorites={true}
        />
      );

      fireEvent.click(screen.getByText('All'));

      const starButtons = screen.getAllByRole('button', { name: /add to favorites/i });
      fireEvent.click(starButtons[0]);

      // Should not call onAttributeChange
      expect(mockOnAttributeChange).not.toHaveBeenCalled();
    });
  });
});
