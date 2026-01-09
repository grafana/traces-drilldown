import React, { useRef, useState, useEffect } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { Icon, useStyles2, Tooltip } from '@grafana/ui';
import { css } from '@emotion/css';
import { SparklineCell } from './SparklineCell';

export interface ExceptionRow {
  type: string;
  message: string;
  service: string;
  lastSeen: string;
  occurrences: number;
  timeSeries: Array<{ time: number; count: number }>;
}

interface ExceptionsTableProps {
  rows: ExceptionRow[];
  theme: GrafanaTheme2;
  onFilterClick?: (key: string, value: string, operator?: '=' | '!=', append?: boolean) => void;
}

// Component to conditionally show tooltip only when text is truncated
const TruncatedMessage = ({ message, onClick, className }: { message: string; onClick: () => void; className: string }) => {
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

export const ExceptionsTable = ({ rows, theme, onFilterClick }: ExceptionsTableProps) => {
  const styles = useStyles2(getStyles);
  
  const handleTypeClick = (type: string) => {
    if (onFilterClick) {
      onFilterClick('event.exception.type', type);
    }
  };

  const handleMessageClick = (message: string) => {
    if (onFilterClick) {
      onFilterClick('event.exception.message', message);
    }
  };

  const handleIncludeClick = (message: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFilterClick) {
      onFilterClick('event.exception.message', message, '=', true);
    }
  };

  const handleExcludeClick = (message: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFilterClick) {
      onFilterClick('event.exception.message', message, '!=', true);
    }
  };

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.headerCell}>
              <span>Exception Details</span>
              <Tooltip content="Exception type, message, service, and last seen timestamp. Use the +/- buttons to include or exclude exception types, or click on type or message to filter.">
                <Icon name="info-circle" size="sm" className={styles.headerIcon} />
              </Tooltip>
            </th>
            <th className={styles.headerCellOccurrences}>
              <span>Occurrences</span>
              <Tooltip content="Total number of times this exception has occurred">
                <Icon name="info-circle" size="sm" className={styles.headerIcon} />
              </Tooltip>
            </th>
            <th className={styles.headerCellFrequency}>
              <span>Frequency</span>
              <Tooltip content="Visual representation of exception frequency over time">
                <Icon name="info-circle" size="sm" className={styles.headerIcon} />
              </Tooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={styles.tableRow}>
              <td className={styles.tableCell}>
                <div className={styles.exceptionDetailsContainer}>
                  <div className={styles.contentWithButtonsContainer}>
                    <div className={styles.exceptionContentContainer}>
                      <div 
                        className={styles.exceptionType}
                        onClick={() => handleTypeClick(row.type)}
                      >
                        {row.type}
                      </div>
                      <TruncatedMessage
                        message={row.message}
                        onClick={() => handleMessageClick(row.message)}
                        className={styles.exceptionMessage}
                      />
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
                        onClick={(e) => handleIncludeClick(row.message, e)}
                        aria-label="Include exception message"
                      >
                        Include
                      </button>
                      <button
                        className={styles.filterButton}
                        onClick={(e) => handleExcludeClick(row.message, e)}
                        aria-label="Exclude exception message"
                      >
                        Exclude
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  const baseHeaderCell = {
    padding: theme.spacing(2),
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
    padding: theme.spacing(2),
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
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      '&:hover': {
        backgroundColor: theme.colors.background.secondary,
      },
    }),
    tableCell: css(baseTableCell),
    tableCellOccurrences: css(centeredTableCell('150px')),
    tableCellFrequency: css(centeredTableCell('220px')),
    occurrencesCell: css({
      fontSize: theme.typography.h5.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.primary,
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
      gap: theme.spacing(2),
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
      flexDirection: 'row',
      gap: theme.spacing(1),
      flexShrink: 0, // Prevent buttons from shrinking
    }),
    filterButton: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
      background: 'transparent',
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      cursor: 'pointer',
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      transition: 'all 0.2s ease-in-out',
      whiteSpace: 'nowrap',
      '&:hover': {
        background: theme.colors.background.secondary,
        color: theme.colors.text.primary,
        borderColor: theme.colors.border.strong,
      },
      '&:active': {
        transform: 'scale(0.95)',
      },
    }),
    exceptionType: css({
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.link,
      cursor: 'pointer',
      marginBottom: theme.spacing(0.5),
      '&:hover': {
        textDecoration: 'underline',
      },
    }),
    exceptionMessage: css({
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.text.primary,
      lineHeight: 1.4,
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
    exceptionMeta: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(2),
      fontSize: theme.typography.bodySmall.fontSize,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing(0.5),
    }),
    metaItem: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
    }),
  };
};

