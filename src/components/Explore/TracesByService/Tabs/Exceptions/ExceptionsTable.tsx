import React, { useRef, useState, useEffect } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { Icon, useStyles2, Tooltip } from '@grafana/ui';
import { t, Trans } from '@grafana/i18n';
import { css } from '@emotion/css';
import { SparklineCell } from './SparklineCell';
import { ExceptionAccordionContent } from './accordion/ExceptionAccordion';
import { SceneObject } from '@grafana/scenes';

import { ExceptionMessageFilterOperator, getExceptionMessageFilter } from './ExceptionUtils';

export interface ExceptionRow {
  type: string;
  message: string;
  groupedMessages: string[];
  service: string;
  lastSeen: string;
  occurrences: number;
  timeSeries: Array<{ time: number; count: number }>;
}

interface ExceptionsTableProps {
  rows: ExceptionRow[];
  theme: GrafanaTheme2;
  scene: SceneObject;
  onFilterClick?: (
    key: string,
    value: string,
    operator?: ExceptionMessageFilterOperator,
    append?: boolean
  ) => void;
}

// Component to conditionally show tooltip only when text is truncated
const TruncatedMessage = ({ message, onClick, className }: { message: string; onClick: (e: React.MouseEvent) => void; className: string }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      const element = textRef.current;
      if (element) {
        // Check both horizontal and vertical overflow for webkit-line-clamp
        const isOverflowing = 
          element.scrollWidth > element.clientWidth || 
          element.scrollHeight > element.clientHeight;
        setIsTruncated(isOverflowing);
      }
    };

    checkTruncation();
    
    // Recheck on window resize
    window.addEventListener('resize', checkTruncation);
    
    // Small delay to ensure styles are applied
    const timer = setTimeout(checkTruncation, 100);
    
    return () => {
      window.removeEventListener('resize', checkTruncation);
      clearTimeout(timer);
    };
  }, [message]);

  const content = (
    <div 
      ref={textRef}
      className={className}
      onClick={onClick}
    >
      {message}
    </div>
  );

  if (isTruncated) {
    return (
      <Tooltip content={message} placement="top">
        {content}
      </Tooltip>
    );
  }

  return content;
};

const getSharedPrefixAndMessageRemainders = (messages: string[]) => {
  if (messages.length < 2) {
    return { sharedPrefix: '', remainders: messages };
  }

  const [first, ...rest] = messages;
  let sharedPrefix = first;

  for (const message of rest) {
    let i = 0;
    const max = Math.min(sharedPrefix.length, message.length);
    while (i < max && sharedPrefix[i] === message[i]) {
      i++;
    }
    sharedPrefix = sharedPrefix.slice(0, i);
    if (!sharedPrefix) {
      break;
    }
  }

  const lastBoundary = Math.max(
    sharedPrefix.lastIndexOf(' '),
    sharedPrefix.lastIndexOf(','),
    sharedPrefix.lastIndexOf(':'),
    sharedPrefix.lastIndexOf('/')
  );
  if (lastBoundary > 0) {
    sharedPrefix = sharedPrefix.slice(0, lastBoundary + 1);
  }

  sharedPrefix = sharedPrefix.trimEnd();

  if (!sharedPrefix) {
    return { sharedPrefix: '', remainders: messages };
  }

  const remainders = messages.map((message) => {
    const remainder = message.startsWith(sharedPrefix) ? message.slice(sharedPrefix.length).trimStart() : message;
    return remainder || message;
  });

  return { sharedPrefix, remainders };
};

export const ExceptionsTable = ({ rows, theme, onFilterClick, scene }: ExceptionsTableProps) => {
  const styles = useStyles2(getStyles);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleMessageFilterClick = (message: string, mode: 'include' | 'exclude', e: React.MouseEvent) => {
    e.stopPropagation();
    const { value, operator } = getExceptionMessageFilter(message, mode);
    onFilterClick?.('event.exception.message', value, operator, true);
  };

  const handleRowClick = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.headerCell}>
              <span><Trans i18nKey="exceptions-table.header.exception-details">Exception Details</Trans></span>
              <Tooltip content={t('exceptions-table.header.exception-details-tooltip', 'Exception type, message, service, and last seen timestamp. Use the include/exclude buttons to include or exclude exception messages, or click on type or message to filter.')}>
                <Icon name="info-circle" size="sm" className={styles.headerIcon} />
              </Tooltip>
            </th>
            <th className={styles.headerCellOccurrences}>
              <span><Trans i18nKey="exceptions-table.header.occurrences">Occurrences</Trans></span>
              <Tooltip content={t('exceptions-table.header.occurrences-tooltip', 'Total number of times this exception has occurred')}>
                <Icon name="info-circle" size="sm" className={styles.headerIcon} />
              </Tooltip>
            </th>
            <th className={styles.headerCellFrequency}>
              <span><Trans i18nKey="exceptions-table.header.frequency">Frequency</Trans></span>
              <Tooltip content={t('exceptions-table.header.frequency-tooltip', 'Visual representation of exception frequency over time')}>
                <Icon name="info-circle" size="sm" className={styles.headerIcon} />
              </Tooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isExpanded = expandedRow === index;
            const hasGroupedMessages = row.groupedMessages.length > 1;
            const { sharedPrefix, remainders } = hasGroupedMessages
              ? getSharedPrefixAndMessageRemainders(row.groupedMessages)
              : { sharedPrefix: '', remainders: [] as string[] };
            return (
              <React.Fragment key={index}>
                <tr 
                  className={styles.tableRow}
                  onClick={() => handleRowClick(index)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-controls={`exception-accordion-${index}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(index);
                    }
                  }}
                >
                  <td className={styles.tableCell}>
                    <div className={styles.exceptionDetailsContainer}>
                      <div className={styles.contentWithButtonsContainer}>
                        <div className={styles.exceptionContentContainer}>
                          <div 
                            className={styles.exceptionType}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(index);
                            }}
                          >
                            {row.type}
                          </div>
                          <div className={styles.exceptionMessageRow}>
                            <TruncatedMessage
                              message={row.message}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(index);
                              }}
                              className={styles.exceptionMessage}
                            />
                            {hasGroupedMessages && (
                              <Tooltip
                                placement="top"
                                content={
                                  <div className={styles.groupedMessagesTooltip}>
                                    <div className={styles.groupedMessagesTooltipTitle}>
                                      <Trans i18nKey="exceptions-table.grouped-messages-title">Grouped messages</Trans>
                                    </div>
                                      {sharedPrefix && (
                                        <div className={styles.groupedMessagesSharedPrefix}>
                                          <span className={styles.groupedMessagesLabel}>
                                            <Trans i18nKey="exceptions-table.grouped-messages-common-prefix">Common</Trans>:
                                          </span>{' '}
                                          {sharedPrefix}
                                        </div>
                                      )}
                                    <ul className={styles.groupedMessagesList}>
                                      {remainders.map((groupedMessage, groupedMessageIndex) => (
                                        <li key={`${groupedMessage}-${groupedMessageIndex}`}>{groupedMessage}</li>
                                      ))}
                                    </ul>
                                  </div>
                                }
                              >
                                <button
                                  type="button"
                                  className={styles.groupedMessagesButton}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={t(
                                    'exceptions-table.grouped-messages-aria-label',
                                    'Show grouped exception messages'
                                  )}
                                >
                                  <Icon name="info-circle" size="sm" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                          <div className={styles.exceptionMeta}>
                            {row.service && (
                              <span className={styles.metaItem}>
                                <Icon name="cube" size="xs" />
                                <span>{row.service}</span>
                              </span>
                            )}
                            {row.lastSeen && (
                              <span className={styles.metaItem}>
                                <Icon name="clock-nine" size="xs" />
                                <span>{row.lastSeen}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={styles.filterButtonsContainer}>
                          <button
                            className={styles.filterButton}
                            onClick={(e) => handleMessageFilterClick(row.message, 'include', e)}
                            aria-label={t('exceptions-table.include-aria-label', 'Include exception message')}
                          >
                            <Trans i18nKey="exceptions-table.include">Include</Trans>
                          </button>
                          <button
                            className={styles.filterButton}
                            onClick={(e) => handleMessageFilterClick(row.message, 'exclude', e)}
                            aria-label={t('exceptions-table.exclude-aria-label', 'Exclude exception message')}
                          >
                            <Trans i18nKey="exceptions-table.exclude">Exclude</Trans>
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.tableCellOccurrences}>
                    <div className={styles.occurrencesCell}>{row.occurrences}</div>
                  </td>
                  <td className={styles.tableCellFrequency}>
                    <SparklineCell seriesData={row.timeSeries} theme={theme} />
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td 
                      colSpan={3} 
                      className={styles.accordionCell} 
                      id={`exception-accordion-content-${index}`}
                      role="region"
                      aria-labelledby={`exception-accordion-content-${index}`}
                    >
                      <ExceptionAccordionContent row={row} scene={scene} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  const baseHeaderCell = {
    padding: theme.spacing(1.5),
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.colors.text.secondary,
    backgroundColor: theme.colors.background.secondary,
    
    '> span': {
      marginRight: theme.spacing(0.5),
    },
  };

  const centeredHeaderCell = (width: string) => ({
    ...baseHeaderCell,
    textAlign: 'center' as const,
    width,
  });

  const baseTableCell = {
    padding: theme.spacing(1.5),
    verticalAlign: 'middle' as const,
  };

  const centeredTableCell = (width: string) => ({
    ...baseTableCell,
    textAlign: 'center' as const,
    width,
  });

  return {
    container: css({
      width: '100%',
      height: '100%',
      minHeight: 0,
      overflowX: 'auto',
      overflowY: 'auto',
    }),
    table: css({
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: theme.colors.background.primary,
      tableLayout: 'fixed',
    }),
    headerRow: css({
      borderBottom: `1px solid ${theme.colors.border.weak}`,
    }),
    headerCell: css({
      ...baseHeaderCell,
      textAlign: 'left',
      width: 'auto',
    }),
    headerCellOccurrences: css(centeredHeaderCell('150px')),
    headerCellFrequency: css(centeredHeaderCell('220px')),
    headerIcon: css({
      color: theme.colors.text.secondary,
      opacity: 0.7,
    }),
    tableRow: css({
      cursor: 'pointer',
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      '&:hover': {
        backgroundColor: theme.colors.background.secondary,
      },
    }),
    tableCell: css(baseTableCell),
    tableCellOccurrences: css(centeredTableCell('150px')),
    tableCellFrequency: css(centeredTableCell('220px')),
    occurrencesCell: css({
      color: theme.colors.text.primary,
      fontSize: theme.typography.body.fontSize,
    }),
    exceptionDetailsContainer: css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }),
    contentWithButtonsContainer: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
      width: '100%',
    }),
    exceptionContentContainer: css({
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minWidth: 0, // Allows flex item to shrink below content size
    }),
    filterButtonsContainer: css({
      display: 'flex',
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: '4px',
      overflow: 'hidden',
    }),
    filterButton: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${theme.spacing(0.25)} ${theme.spacing(1)}`,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: theme.colors.text.primary,
      fontSize: theme.typography.bodySmall.fontSize,
      transition: 'background 0.2s ease-in-out, color 0.2s ease-in-out',
      whiteSpace: 'nowrap',
      '&:hover': {
        background: theme.colors.background.primary,
      },
      '&:active': {
        transform: 'scale(0.95)',
      },
      '&:not(:last-child)': {
        borderRight: `1px solid ${theme.colors.border.medium}`,
      },
    }),
    exceptionType: css({
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.link,
      cursor: 'pointer',
      marginBottom: theme.spacing(0.25),
      '&:hover': {
        textDecoration: 'underline',
      },
    }),
    accordionCell: css({
      padding: 0,
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      backgroundColor: theme.colors.background.secondary,
    }),
    exceptionMessage: css({
      color: theme.colors.text.primary,
      wordBreak: 'break-word',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 1,
      WebkitBoxOrient: 'vertical',
      cursor: 'pointer',
      '&:hover': {
        color: theme.colors.text.link,
      },
    }),
    exceptionMessageRow: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      minWidth: 0,
    }),
    exceptionMeta: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      color: theme.colors.text.secondary,
      marginTop: theme.spacing(0.25),
    }),
    groupedMessagesButton: css({
      display: 'inline-flex',
      flexShrink: 0,
      padding: 0,
      border: 'none',
      background: 'transparent',
      color: theme.colors.text.secondary,
      cursor: 'pointer',
      '&:hover': {
        color: theme.colors.text.primary,
      },
    }),
    groupedMessagesTooltip: css({
      maxWidth: '860px',
    }),
    groupedMessagesTooltipTitle: css({
      fontWeight: theme.typography.fontWeightMedium,
      marginBottom: theme.spacing(0.5),
    }),
    groupedMessagesSharedPrefix: css({
      marginBottom: theme.spacing(0.5),
      color: theme.colors.text.secondary,
    }),
    groupedMessagesLabel: css({
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.primary,
    }),
    groupedMessagesList: css({
      margin: 0,
      paddingLeft: theme.spacing(2),
      '> li': {
        marginBottom: theme.spacing(0.25),
      },
    }),
    metaItem: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
    }),
  };
};

