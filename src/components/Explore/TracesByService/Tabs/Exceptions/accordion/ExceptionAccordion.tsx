import React from 'react';

import { GrafanaTheme2, toOption } from '@grafana/data';
import { Stack, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { SceneObject } from '@grafana/scenes';

import { AttributesSidebar } from 'components/Explore/AttributesSidebar';
import { renderTraceQLLabelFilters } from 'utils/filters-renderer';
import { getFiltersVariable, getPrimarySignalVariable, getSpanListColumnsVariable, getTraceByServiceScene } from 'utils/utils';
import { ExceptionRow } from '../ExceptionsTable';
import { ExceptionComparison } from './ExceptionComparison';
import { ExceptionTraceResults } from './ExceptionTraceResults';
import { escapeTraceQlString } from '../ExceptionUtils';

interface ExceptionAccordionProps {
  row: ExceptionRow;
  scene: SceneObject;
}

export const ExceptionAccordionContent = ({ row, scene }: ExceptionAccordionProps) => {
  const styles = useStyles2(getAccordionStyles);
  const spanListColumnsVar = getSpanListColumnsVariable(scene);
  spanListColumnsVar.useState(); // re-render on change

  const { attributes } = getTraceByServiceScene(scene).useState();
  const baseFilter = buildExceptionFilterExpr({ exceptionMessage: row.message, exceptionType: row.type, scene });
  const selectedAttributes = normalizeToStringArray(spanListColumnsVar.getValue());

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.message}>
          {row.message && (
            <div>
              <span className={styles.errorLabel}>Error:</span>{' '}
              {(() => {
                const highlight = getMessageHighlight(row.message);
                if (!highlight) {
                  return <span>{row.message}</span>;
                }

                return (
                  <span>
                    {highlight.prefix}
                    {highlight.afterErrorSeparator}
                    {highlight.highlightText ? (
                      <span className={styles.errorHighlight}>{highlight.highlightText}</span>
                    ) : null}
                    {highlight.suffix}
                  </span>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <Stack direction="row" gap={2} width="100%">
          <AttributesSidebar
            options={attributes?.map((x) => toOption(x)) ?? []}
            selected={selectedAttributes}
            onAttributeChange={(cols) => spanListColumnsVar.changeValueTo(cols ?? [])}
            model={scene}
            showFavorites={true}
            isMulti={true}
          />

          <div className={styles.comparisonAndResultsContainer}>
            <ExceptionComparison
              selectedAttributes={selectedAttributes}
              baseFilter={baseFilter}
              scene={scene}
            />
            <ExceptionTraceResults
              selectedAttributes={selectedAttributes}
              baseFilter={baseFilter}
              scene={scene}
            />
          </div>
        </Stack>
      </div>
    </div>
  );
};

export const getMessageHighlight = (message: string) => {
  const lowerMessage = message.toLowerCase();
  const errorToken = 'error:';
  const errorIndex = lowerMessage.indexOf(errorToken);
  const hasErrorToken = errorIndex !== -1;
  const afterError = hasErrorToken ? message.slice(errorIndex + errorToken.length) : message;
  const trimmed = afterError.trimStart();
  if (!trimmed) {
    return null;
  }

  const leadingSpaces = afterError.length - trimmed.length;
  const separator = afterError.slice(0, leadingSpaces);
  const colonIdx = trimmed.indexOf(':');
  const highlightText = colonIdx === -1 ? trimmed : trimmed.slice(0, colonIdx + 1);
  const suffix = colonIdx === -1 ? '' : trimmed.slice(colonIdx + 1);

  return {
    prefix: hasErrorToken ? message.slice(0, errorIndex) : '',
    afterErrorSeparator: separator,
    highlightText,
    suffix,
  };
};

const normalizeToStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => v?.toString()).filter(Boolean) as string[];
  }
  return value ? [value.toString()] : [];
};

export const buildExceptionFilterExpr = ({
  exceptionMessage,
  exceptionType,
  scene,
}: {
  exceptionMessage: string;
  exceptionType?: string;
  scene: SceneObject;
}) => {
  const primarySignalExpr = (getPrimarySignalVariable(scene).state.value as string) || 'true';
  const filtersExpr = renderTraceQLLabelFilters(getFiltersVariable(scene).state.filters);

  const escapedMessage = escapeTraceQlString(exceptionMessage);
  const typeFilter = exceptionType && exceptionType !== 'Unknown' ? ` && event.exception.type = "${escapeTraceQlString(exceptionType)}"` : '';

  return `{${primarySignalExpr} && ${filtersExpr} && status = error && event.exception.message = "${escapedMessage}"${typeFilter}}`;
};

const getAccordionStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      padding: theme.spacing(2),
      backgroundColor: theme.colors.background.secondary,

      '.cell-link': {
        color: theme.colors.text.link,
        cursor: 'pointer',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ':hover': {
          textDecoration: 'underline',
        },
      },
    }),
    section: css({
      marginBottom: theme.spacing(2),
    }),
    message: css({
      marginBottom: theme.spacing(4),
    }),
    errorLabel: css({
      color: theme.colors.error.text,
    }),
    errorHighlight: css({
      color: theme.colors.warning.text,
    }),
    comparisonAndResultsContainer: css({
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
    }),
  };
};
