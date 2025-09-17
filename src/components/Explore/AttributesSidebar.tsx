import { css } from '@emotion/css';
import React, { useMemo, useState } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { ButtonGroup, ToolbarButton, Input, Icon, IconButton, useStyles2, Badge, Stack } from '@grafana/ui';
import { RESOURCE_ATTR, SPAN_ATTR, ignoredAttributes } from 'utils/shared';

type ScopeType = 'All' | 'Resource' | 'Span';

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
  const [selectedScope, setSelectedScope] = useState<ScopeType>('All');

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
    return attributeItems.filter((item) => {
      // Filter by search text
      const matchesSearch = item.label.toLowerCase().includes(searchValue.toLowerCase());

      // Filter by scope
      const matchesScope = selectedScope === 'All' || item.scope === selectedScope;

      return matchesSearch && matchesScope;
    });
  }, [attributeItems, searchValue, selectedScope]);

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
    { label: 'All', value: 'All' as ScopeType },
    { label: 'Resource', value: 'Resource' as ScopeType },
    { label: 'Span', value: 'Span' as ScopeType },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {/* Title */}
        <div className={styles.title}>{title}</div>

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
                onClick={() => handleScopeChange(button.value)}
              >
                {button.label}
              </ToolbarButton>
            ))}
          </ButtonGroup>
        </div>
      </div>

      {/* Attributes List */}
      <ul className={styles.attributesList}>
        {filteredAttributes.length === 0 ? (
          <div className={styles.emptyState}>
            {searchValue || selectedScope !== 'All' ? 'No attributes match your criteria' : 'No attributes available'}
          </div>
        ) : (
          filteredAttributes.map((attribute) => (
            <li
              key={attribute.value}
              title={attribute.label}
              className={`${styles.attributeItem} ${
                selectedAttribute === attribute.value ? styles.attributeItemSelected : ''
              }`}
              onClick={() => handleAttributeSelect(attribute.value)}
            >
              {selectedScope === 'All' && (
                <Badge
                  color={'darkgrey'}
                  text={attribute.scope.toLowerCase() + '.'}
                  className={styles.attributeScope}
                />
              )}
              <div className={styles.attributeLabel}>{attribute.label}</div>
            </li>
          ))
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
      height: 'calc(100vh - 550px)',
      backgroundColor: theme.colors.background.primary,
      width: '280px',
      minWidth: '280px',
    }),
    header: css({
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      padding: theme.spacing(1),
    }),
    title: css({
      fontSize: theme.typography.h5.fontSize,
      fontWeight: theme.typography.h5.fontWeight,
      marginBottom: theme.spacing(2),
      color: theme.colors.text.primary,
    }),
    searchContainer: css({
      marginBottom: theme.spacing(2),
    }),
    searchInput: css({
      width: '100%',
    }),
    scopeContainer: css({
      marginBottom: theme.spacing(2),
      '& > div': {
        width: '100%',
      },
      '& button': {
        flex: 1,
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
