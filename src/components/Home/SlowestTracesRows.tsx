import { css } from '@emotion/css';
import { DataFrame, Field, GrafanaTheme2, urlUtil } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import React from 'react';
import { EXPLORATIONS_ROUTE, ROUTES, VAR_METRIC, VAR_FILTERS } from 'utils/shared';
import { AttributePanelRow } from './AttributePanelRow';
import { HomepagePanelType } from './AttributePanel';
import { formatDuration } from '../../utils/dates';

type Props = {
  series: DataFrame[];
  type: HomepagePanelType;
};

export const SlowestTracesRows = (props: Props) => {
  const { series, type } = props;
  const styles = useStyles2(getStyles);

  const durField = series[0].fields.find((f) => f.name === 'duration');
  if (durField && durField.values) {
    const sortedByDuration = durField?.values
      .map((_, i) => i)
      ?.sort((a, b) => durField?.values[b] - durField?.values[a]);
    const sortedFields = series[0].fields.map((f) => {
      return {
        ...f,
        values: sortedByDuration?.map((i) => f.values[i]),
      };
    });

    const getLabel = (traceServiceField: Field | undefined, traceNameField: Field | undefined, index: number) => {
      let label = '';
      if (traceServiceField?.values[index]) {
        label = traceServiceField.values[index];
      }
      if (traceNameField?.values[index]) {
        label = label.length === 0 ? traceNameField.values[index] : `${label}: ${traceNameField.values[index]}`;
      }
      return label.length === 0 ? 'Trace service & name not found' : label;
    };

    const getUrl = (
      traceId: string,
      spanIdField: Field | undefined,
      traceServiceField: Field | undefined,
      index: number
    ) => {
      if (!spanIdField || !spanIdField.values[index] || !traceServiceField || !traceServiceField.values[index]) {
        console.error('SpanId or traceService not found');
        return ROUTES.Explore;
      }

      const params = {
        traceId,
        spanId: spanIdField.values[index],
        [`var-${VAR_FILTERS}`]: `resource.service.name|=|${traceServiceField.values[index]}`,
        [`var-${VAR_METRIC}`]: 'duration',
      };

      return urlUtil.renderUrl(EXPLORATIONS_ROUTE, params);
    };

    const getDuration = (durationField: Field | undefined, index: number) => {
      if (!durationField || !durationField.values) {
        return 'Duration not found';
      }

      return formatDuration(durationField.values[index] / 1000);
    };

    const traceIdField = sortedFields.find((f) => f.name === 'traceIdHidden');
    const spanIdField = sortedFields.find((f) => f.name === 'spanID');
    const traceNameField = sortedFields.find((f) => f.name === 'traceName');
    const traceServiceField = sortedFields.find((f) => f.name === 'traceService');
    const durationField = sortedFields.find((f) => f.name === 'duration');

    return (
      <div className={styles.container}>
        {traceIdField?.values?.map((traceId, index) => (
          <span key={index}>
            <AttributePanelRow
              type={type}
              index={index}
              label={getLabel(traceServiceField, traceNameField, index)}
              labelTitle="Trace"
              value={getDuration(durationField, index)}
              valueTitle="Duration"
              url={getUrl(traceId, spanIdField, traceServiceField, index)}
            />
          </span>
        ))}
      </div>
    );
  }
  return null;
};

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      padding: `${theme.spacing(2)} 0`,
    }),
  };
}
