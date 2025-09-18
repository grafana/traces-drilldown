import { css } from '@emotion/css';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { ButtonGroup, ToolbarButton, Input, Icon, IconButton, useStyles2, Badge } from '@grafana/ui';
import {
  RESOURCE_ATTR,
  SPAN_ATTR,
  ignoredAttributes,
  radioAttributesResource,
  radioAttributesSpan,
} from 'utils/shared';

type ScopeType = 'All' | 'Resource' | 'Span' | 'Favorites';

const FAVORITES_ATTRIBUTES_STORAGE_KEY = 'grafana.traces.drilldown.favorites.attributes';

// Default favorites attributes from radioAttributesResource and radioAttributesSpan
const getDefaultFavoritesAttributes = (): string[] => {
  return [...radioAttributesResource, ...radioAttributesSpan];
};

interface AttributesSidebarProps {
  /** Array of available attribute options */
  options: Array<SelectableValue<string>>;
  /** Currently selected attribute value */
  selectedAttribute?: string;
  /** Callback when attribute selection changes */
  onAttributeChange: (attribute: string | undefined) => void;
  /** Optional title for the sidebar */
  title?: string;
}

interface AttributeItem {
  label: string;
  value: string;
  scope: ScopeType;
}

export function AttributesSidebar({
  options,
  selectedAttribute,
  onAttributeChange,
  title = 'Attributes',
}: AttributesSidebarProps) {
  const styles = useStyles2(getStyles);
  const [searchValue, setSearchValue] = useState('');
  const [selectedScope, setSelectedScope] = useState<ScopeType>('Favorites');
  const [favoritesAttributes, setFavoritesAttributes] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load favorites attributes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_ATTRIBUTES_STORAGE_KEY);
    if (stored) {
      try {
        setFavoritesAttributes(JSON.parse(stored));
      } catch {
        // If parsing fails, use defaults
        const defaults = getDefaultFavoritesAttributes();
        const filteredDefaults = defaults.filter((attr) => options.some((option) => option.value === attr));
        setFavoritesAttributes(filteredDefaults);
      }
    } else {
      // Initialize with defaults
      const defaults = getDefaultFavoritesAttributes();
      setFavoritesAttributes(defaults);
      localStorage.setItem(FAVORITES_ATTRIBUTES_STORAGE_KEY, JSON.stringify(defaults));
    }
  }, []);

  // Save favorites attributes to localStorage whenever they change
  useEffect(() => {
    if (favoritesAttributes.length > 0) {
      localStorage.setItem(FAVORITES_ATTRIBUTES_STORAGE_KEY, JSON.stringify(favoritesAttributes));
    }
  }, [favoritesAttributes]);

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

  // Toggle star status for an attribute
  const toggleStar = useCallback((attributeValue: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering attribute selection
    setFavoritesAttributes((prev) => {
      const isFavorites = prev.includes(attributeValue);
      if (isFavorites) {
        return prev.filter((attr) => attr !== attributeValue);
      } else {
        return [...prev, attributeValue];
      }
    });
  }, []);

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

      setFavoritesAttributes((prev) => {
        // Since the list of favorites may not match the rendered list,
        // we need to map the dragged/drop indexes (from the rendered list) to the favorites list
        const filteredAttributesAtDropIndex = filteredAttributes[dropIndex];
        const filteredAttributesAtDraggedIndex = filteredAttributes[draggedIndex];
        const favoritesIndexOfDroppedItem = prev.findIndex((item) => item === filteredAttributesAtDropIndex.value);
        const favoritesIndexOfDraggedItem = prev.findIndex((item) => item === filteredAttributesAtDraggedIndex.value);

        const newOrder = [...prev];
        newOrder.splice(favoritesIndexOfDraggedItem, 1);
        newOrder.splice(favoritesIndexOfDroppedItem, 0, filteredAttributesAtDraggedIndex.value);
        return newOrder;
      });

      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex]
  );

  // Filter attributes based on search and scope
  const filteredAttributes = useMemo(() => {
    if (selectedScope === 'Favorites') {
      // For favorites scope, show favorites attributes in their custom order
      const favoritesItems = favoritesAttributes
        .map((attrValue) => attributeItems.find((item) => item.value === attrValue))
        .filter(Boolean) as AttributeItem[];

      // Apply search filter
      return favoritesItems.filter((item) => item.label.toLowerCase().includes(searchValue.toLowerCase()));
    }

    return attributeItems.filter((item) => {
      // Filter by search text
      const matchesSearch = item.label.toLowerCase().includes(searchValue.toLowerCase());

      // Filter by scope
      const matchesScope = selectedScope === 'All' || item.scope === selectedScope;

      return matchesSearch && matchesScope;
    });
  }, [attributeItems, searchValue, selectedScope, favoritesAttributes]);

  const handleScopeChange = (scope: ScopeType) => {
    setSelectedScope(scope);
  };

  const handleAttributeSelect = (attribute: string) => {
    // Toggle selection - if already selected, deselect it
    const newSelection = selectedAttribute === attribute ? undefined : attribute;
    onAttributeChange(newSelection);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setSearchValue('');
    }
  };

  const scopeButtons = [
    {
      label: 'Favorites',
      value: 'Favorites' as ScopeType,
    },
    { label: 'All', value: 'All' as ScopeType },
    { label: 'Resource', value: 'Resource' as ScopeType },
    { label: 'Span', value: 'Span' as ScopeType },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {/* Title */}
        <div className={styles.title}>{title}</div>

        <div className={styles.selectedAttributeContainer}>
          <div className={styles.selectedAttributeLabel}>
            <strong>Selected:</strong> {selectedAttribute}
          </div>
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
          <ButtonGroup>
            {scopeButtons.map((button) => (
              <ToolbarButton
                key={button.value}
                variant={selectedScope === button.value ? 'active' : 'default'}
                className={styles.scopeButton}
                onClick={() => handleScopeChange(button.value)}
              >
                {button.label}
              </ToolbarButton>
            ))}
          </ButtonGroup>
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
            const isFavorites = favoritesAttributes.includes(attribute.value);
            const isFavoritesScope = selectedScope === 'Favorites';
            const isDragging = draggedIndex === index;
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
                  title={attribute.label}
                  className={`${styles.attributeItem} ${
                    selectedAttribute === attribute.value ? styles.attributeItemSelected : ''
                  } ${isFavoritesScope ? styles.draggableItem : ''} ${isDragging ? styles.dragging : ''}`}
                  onClick={() => handleAttributeSelect(attribute.value)}
                  draggable={isFavoritesScope}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleItemDragLeave}
                  onDrop={() => handleDrop(index)}
                >
                  {isFavoritesScope && (
                    <Icon name="draggabledots" className={styles.dragHandle} title="Drag to reorder" />
                  )}
                  {(selectedScope === 'All' || selectedScope === 'Favorites') && (
                    <Badge
                      color={'darkgrey'}
                      text={attribute.scope.toLowerCase() + '.'}
                      className={styles.attributeScope}
                    />
                  )}
                  <div className={styles.attributeLabel}>{attribute.label}</div>
                  <IconButton
                    name={isFavorites ? 'favorite' : 'star'}
                    variant="secondary"
                    size="sm"
                    className={`${styles.starButton} ${isFavorites ? styles.starButtonActive : ''}`}
                    tooltip={isFavorites ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={(event) => toggleStar(attribute.value, event)}
                  />
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
      padding: theme.spacing(0.5, 1),
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
    scopeButton: css({
      fontSize: theme.typography.bodySmall.fontSize,
      flex: 1,
      justifyContent: 'center',

      '& div': {
        width: '100%',
        justifyContent: 'center',
      },
    }),
    attributesList: css({
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
    }),
    attributeItem: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      flexDirection: 'row',
      padding: theme.spacing(0.5, 1),
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
