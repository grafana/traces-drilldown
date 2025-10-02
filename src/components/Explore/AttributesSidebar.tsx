import { css } from '@emotion/css';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { TabsBar, Tab, Input, Icon, IconButton, useStyles2, Badge, Checkbox, Button, useTheme2 } from '@grafana/ui';
import { RESOURCE_ATTR, SPAN_ATTR, ignoredAttributes } from 'utils/shared';
import { getFiltersVariable } from 'utils/utils';
import { SceneObject } from '@grafana/scenes';
import { useFavoriteAttributes } from 'hooks';

type ScopeType = 'All' | 'Resource' | 'Span' | 'Favorites';

interface BaseAttributesSidebarProps {
  /** Array of available attribute options */
  options: Array<SelectableValue<string>>;
  /** Optional title for the sidebar */
  title?: string;
  /** Scene object to access variables */
  model: SceneObject;

  showFavorites?: boolean;
  allowAllOption?: boolean;
}

interface SingleAttributesSidebarProps extends BaseAttributesSidebarProps {
  /** Currently selected attribute value(s) - string for single mode, string[] for multi mode */
  selected?: string;
  /** Callback when attribute selection changes - receives string | undefined for single mode, string[] for multi mode */
  onAttributeChange: (attribute: string | undefined) => void;

  isMulti?: false;
}

interface MultiAttributesSidebarProps extends BaseAttributesSidebarProps {
  /** Currently selected attribute value(s) - string for single mode, string[] for multi mode */
  selected?: string[];
  /** Callback when attribute selection changes - receives string | undefined for single mode, string[] for multi mode */
  onAttributeChange: (attribute: string[] | undefined) => void;

  isMulti: true;
}

interface AttributeItem {
  label: string;
  value: string;
  scope: ScopeType;
}

export function AttributesSidebar({
  options,
  selected,
  onAttributeChange,
  title = 'Attributes',
  model,
  showFavorites,
  isMulti,
  allowAllOption,
}: SingleAttributesSidebarProps | MultiAttributesSidebarProps) {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const [searchValue, setSearchValue] = useState('');
  const [selectedScope, setSelectedScope] = useState<ScopeType>(showFavorites ? 'Favorites' : 'All');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { favoriteAttributes, toggleFavorite, reorderFavorites } = useFavoriteAttributes({ scene: model });

  const filtersVariable = getFiltersVariable(model);
  const { filters } = filtersVariable.useState();

  const currentFilters = filters.map((filter) => filter.key);

  // Helper function to test if a label matches the search value (supports regex)
  const matchesSearchValue = useCallback((label: string, search: string): boolean => {
    if (!search) {
      return true;
    }

    try {
      // Try to use the search value as a regex pattern (case-insensitive)
      const regex = new RegExp(search, 'i');
      return regex.test(label);
    } catch (error) {
      // If regex is invalid, fall back to simple case-insensitive string matching
      return label.toLowerCase().includes(search.toLowerCase());
    }
  }, []);

  // Helper functions for handling selection modes
  const getSelectedAttributes = (): string[] => {
    if (isMulti) {
      return Array.isArray(selected) ? selected : [];
    }
    return selected && typeof selected === 'string' ? [selected] : [];
  };

  const isAttributeSelected = (attribute: string): boolean => {
    const selected = getSelectedAttributes();
    return selected.includes(attribute);
  };

  // Transform options into AttributeItem format with scope information
  const attributeItems: AttributeItem[] = useMemo(() => {
    return options
      .filter((option) => option.value && !ignoredAttributes.includes(option.value))
      .map((option) => {
        const value = option.value!;
        let scope: ScopeType = 'Span';
        let label = option.label || value;

        if (value.startsWith(RESOURCE_ATTR)) {
          scope = 'Resource';
          label = label.replace(RESOURCE_ATTR, '');
        } else if (value.startsWith(SPAN_ATTR)) {
          scope = 'Span';
          label = label.replace(SPAN_ATTR, '');
        }

        return {
          label,
          value,
          scope,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  // Filter attributes based on search and scope
  const filteredAttributes = useMemo(() => {
    if (selectedScope === 'Favorites') {
      // For favorites scope, show favorites attributes in their custom order
      const favoritesItems = favoriteAttributes
        .map((attrValue) => attributeItems.find((item) => item.value === attrValue))
        .filter(Boolean) as AttributeItem[];

      // Apply search filter
      return favoritesItems.filter((item) => matchesSearchValue(item.label, searchValue));
    }

    return attributeItems.filter((item) => {
      // Filter by search text
      const matchesSearch = matchesSearchValue(item.label, searchValue);

      // Filter by scope
      const matchesScope = selectedScope === 'All' || item.scope === selectedScope;

      return matchesSearch && matchesScope;
    });
  }, [attributeItems, searchValue, selectedScope, favoriteAttributes, matchesSearchValue]);

  // Select the next favorite attribute if the selected attribute is in the filters (single mode only)
  useEffect(() => {
    if (!isMulti && selected && typeof selected === 'string' && currentFilters.includes(selected)) {
      const currentIndex = filteredAttributes.findIndex((item) => item.value === selected);
      const nextIndex = currentIndex + 1;

      if (nextIndex < filteredAttributes.length) {
        onAttributeChange(filteredAttributes[nextIndex].value);
        return;
      }
    }
  }, [selected, currentFilters, isMulti, filteredAttributes, onAttributeChange]);

  // Toggle star status for an attribute
  const toggleStar = useCallback(
    (attributeValue: string, event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent triggering attribute selection
      toggleFavorite(attributeValue);
    },
    [toggleFavorite]
  );

  // Handle drag and drop for favorites attributes
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent, index: number) => {
      event.preventDefault();
      event.stopPropagation();
      if (draggedIndex !== null && draggedIndex !== index && dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex, dragOverIndex]
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent, index: number) => {
      event.preventDefault();
      event.stopPropagation();
      if (draggedIndex !== null && draggedIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex]
  );

  const handleItemDragLeave = useCallback((event: React.DragEvent) => {
    event.stopPropagation();
    // Don't clear dragOverIndex here - let the container handle it
  }, []);

  const handleListDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleListDragLeave = useCallback((event: React.DragEvent) => {
    // Only clear if we're leaving the entire list container
    const target = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as HTMLElement;

    // If the related target is not a child of the list, we're leaving
    if (!target.contains(related)) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback(
    (dropIndex: number) => {
      if (draggedIndex === null) {
        return;
      }
      // Since the list of favorites may not match the rendered list,
      // we need to map the dragged/drop indexes (from the rendered list) to the favorites list
      const filteredAttributesAtDropIndex = filteredAttributes[dropIndex];
      const filteredAttributesAtDraggedIndex = filteredAttributes[draggedIndex];
      const favoritesIndexOfDroppedItem = favoriteAttributes.findIndex(
        (item) => item === filteredAttributesAtDropIndex.value
      );
      const favoritesIndexOfDraggedItem = favoriteAttributes.findIndex(
        (item) => item === filteredAttributesAtDraggedIndex.value
      );

      reorderFavorites(favoritesIndexOfDraggedItem, favoritesIndexOfDroppedItem);

      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, reorderFavorites, filteredAttributes]
  );

  const handleScopeChange = (scope: ScopeType) => {
    setSelectedScope(scope);
  };

  const handleAttributeSelect = (attribute: string) => {
    if (isMulti === true) {
      // Multiple selection mode
      const currentSelected = getSelectedAttributes();
      const isSelected = currentSelected.includes(attribute);
      const newSelection = isSelected
        ? currentSelected.filter((attr) => attr !== attribute) // Remove if selected
        : [...currentSelected, attribute]; // Add if not selected
      onAttributeChange(newSelection);
    } else {
      // Single selection mode
      const newSelection = selected === attribute ? undefined : attribute;
      onAttributeChange(newSelection);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setSearchValue('');
    }
  };

  const scopeButtons = [
    { label: 'All', value: 'All' as ScopeType },
    { label: 'Resource', value: 'Resource' as ScopeType },
    { label: 'Span', value: 'Span' as ScopeType },
  ];

  if (showFavorites) {
    scopeButtons.unshift({ label: 'Favorites', value: 'Favorites' as ScopeType });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {/* Title */}
        <div className={styles.title}>{title}</div>

        <div className={styles.selectedAttributeContainer}>
          <div className={styles.selectedAttributeLabel}>
            {isMulti ? (
              <>
                <strong>Selected ({getSelectedAttributes().length}):</strong>{' '}
                {getSelectedAttributes().length > 0 ? getSelectedAttributes().join(', ') : 'None'}
              </>
            ) : (
              <>
                <strong>Selected:</strong> {selected}
              </>
            )}
          </div>
          {allowAllOption && selected !== 'All' && (
            <Button variant="secondary" size="sm" onClick={() => handleAttributeSelect('All')}>
              All
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className={styles.searchContainer}>
          <Input
            className={styles.searchInput}
            prefix={<Icon name="search" />}
            placeholder="Search attributes..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.currentTarget.value)}
            onKeyDown={handleSearchKeyDown}
            suffix={
              searchValue && (
                <IconButton
                  name="times"
                  variant="secondary"
                  tooltip="Clear search"
                  onClick={() => setSearchValue('')}
                />
              )
            }
          />
        </div>

        {/* Scope Selector */}
        <div className={styles.scopeContainer}>
          <TabsBar>
            {scopeButtons.map((button) => (
              <Tab
                key={button.value}
                label={button.label}
                className={styles.scopeTab}
                active={selectedScope === button.value}
                onChangeTab={() => handleScopeChange(button.value)}
              />
            ))}
          </TabsBar>
        </div>
      </div>

      {/* Attributes List */}
      <ul className={styles.attributesList} onDragOver={handleListDragOver} onDragLeave={handleListDragLeave}>
        {filteredAttributes.length === 0 ? (
          <div className={styles.emptyState}>
            {searchValue || selectedScope !== 'All' ? 'No attributes match your criteria' : 'No attributes available'}
          </div>
        ) : (
          filteredAttributes.map((attribute, index) => {
            const isFavorites = favoriteAttributes.includes(attribute.value);
            const isFavoritesScope = selectedScope === 'Favorites';
            const isDragging = draggedIndex === index;
            const isFiltered = currentFilters.includes(attribute.value);
            const isSelected = isAttributeSelected(attribute.value);
            const showGhostAbove = dragOverIndex === index && draggedIndex !== null && draggedIndex > index;
            const showGhostBelow = dragOverIndex === index && draggedIndex !== null && draggedIndex < index;

            return (
              <React.Fragment key={attribute.value}>
                {/* Ghost element above */}
                {showGhostAbove && (
                  <li className={styles.ghostElement} onDrop={() => handleDrop(index)}>
                    <div className={styles.ghostContent}>Drop here</div>
                  </li>
                )}

                <li
                  title={isFiltered ? `Filtered: ${attribute.label}` : attribute.label}
                  className={`${styles.attributeItem} ${
                    !isMulti && isSelected ? styles.attributeItemSelected : ''
                  } ${isFavoritesScope ? styles.draggableItem : ''} ${isDragging ? styles.dragging : ''}`}
                  onClick={!isMulti ? () => handleAttributeSelect(attribute.value) : undefined}
                  draggable={isFavoritesScope}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleItemDragLeave}
                  onDrop={() => handleDrop(index)}
                >
                  {isMulti && (
                    <Checkbox
                      value={isSelected}
                      onChange={() => handleAttributeSelect(attribute.value)}
                      className={styles.checkbox}
                    />
                  )}
                  <div className={styles.attributeContent}>
                    {(selectedScope === 'All' || selectedScope === 'Favorites') && (
                      <Badge
                        color={'darkgrey'}
                        text={attribute.scope.toLowerCase() + '.'}
                        className={styles.attributeScope}
                      />
                    )}
                    {isFiltered && <Icon name="filter" color={theme.colors.text.disabled} />}
                    <div className={styles.attributeLabel}>{attribute.label}</div>
                  </div>
                  {showFavorites && (
                    <IconButton
                      name={isFavorites ? 'favorite' : 'star'}
                      variant="secondary"
                      size="sm"
                      className={`${styles.starButton} ${isFavorites ? styles.starButtonActive : ''}`}
                      tooltip={isFavorites ? 'Remove from favorites' : 'Add to favorites'}
                      onClick={(event) => toggleStar(attribute.value, event)}
                    />
                  )}
                </li>

                {/* Ghost element below */}
                {showGhostBelow && (
                  <li className={styles.ghostElement} onDrop={() => handleDrop(index)}>
                    <div className={styles.ghostContent}>Drop here</div>
                  </li>
                )}
              </React.Fragment>
            );
          })
        )}
      </ul>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.colors.background.primary,
      width: '300px',
      minWidth: '300px',
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
    }),
    header: css({
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      gap: theme.spacing(1),
      padding: theme.spacing(1),
    }),
    title: css({
      fontSize: theme.typography.h5.fontSize,
      fontWeight: theme.typography.h5.fontWeight,
      color: theme.colors.text.primary,
      borderBottom: `1px solid ${theme.colors.border.medium}`,
    }),
    selectedAttributeContainer: css({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing(0.5, 0),
      gap: theme.spacing(1),
      height: '32px',
    }),
    selectedAttributeLabel: css({
      fontSize: theme.typography.bodySmall.fontSize,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    searchContainer: css({}),
    searchInput: css({
      width: '100%',
    }),
    scopeContainer: css({
      '& > div': {
        width: '100%',
      },
    }),
    scopeTab: css({
      '& button': {
        fontSize: theme.typography.bodySmall.fontSize,
      },
    }),
    attributesList: css({
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
      padding: theme.spacing(0, 0.5),
    }),
    attributeItem: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      flexDirection: 'row',
      padding: theme.spacing(0.5),
      borderRadius: theme.shape.radius.default,
      cursor: 'pointer',
      border: `1px solid transparent`,
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.border.medium}`,
      },
    }),
    attributeItemSelected: css({
      backgroundColor: theme.colors.primary.transparent,
      border: `1px solid ${theme.colors.primary.border}`,
      '&:hover': {
        backgroundColor: theme.colors.primary.transparent,
        border: `1px solid ${theme.colors.primary.border}`,
      },
    }),
    checkbox: css({
      flexShrink: 0,
      marginRight: theme.spacing(1),
    }),
    attributeContent: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      flex: 1,
      minWidth: 0, // Allow content to shrink
    }),
    attributeLabel: css({
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.primary,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    attributeScope: css({
      fontSize: theme.typography.bodySmall.fontSize,
    }),
    draggableItem: css({
      cursor: 'grab',
      '&:active': {
        cursor: 'grabbing',
      },
    }),
    dragHandle: css({
      color: theme.colors.text.secondary,
      cursor: 'grab',
      '&:hover': {
        color: theme.colors.text.primary,
      },
    }),
    starButton: css({
      marginLeft: 'auto',
      '&:hover': {
        color: theme.colors.text.primary,
      },
    }),
    starButtonActive: css({
      color: theme.colors.text.primary,
    }),
    dragging: css({
      opacity: 0.5,
      transform: 'scale(0.95)',
      transition: 'all 0.2s ease-in-out',
    }),
    ghostElement: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: theme.spacing(4),
      margin: theme.spacing(0.25, 0),
      border: `2px dashed ${theme.colors.primary.main}`,
      borderRadius: theme.shape.radius.default,
      backgroundColor: theme.colors.primary.transparent,
      animation: 'pulse 1s ease-in-out infinite alternate',
      '@keyframes pulse': {
        from: { opacity: 0.6 },
        to: { opacity: 1 },
      },
    }),
    ghostContent: css({
      fontSize: theme.typography.bodySmall.fontSize,
      color: theme.colors.primary.text,
      fontWeight: theme.typography.fontWeightMedium,
      textAlign: 'center',
    }),
    emptyState: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing(3),
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      fontStyle: 'italic',
      textAlign: 'center',
    }),
  };
}
