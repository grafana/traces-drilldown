import React, { useMemo } from 'react';

import { css } from '@emotion/css';
import { DataFrame, GrafanaTheme2, LoadingState } from '@grafana/data';
import { SceneComponentProps, sceneGraph, SceneObject, SceneObjectBase, SceneObjectState, SceneQueryRunner } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { getTraceByServiceScene } from 'utils/utils';
import { getDatasourceUidOrThrow } from '../ExceptionUtils';

type DistributionItem = {
  value: string;
  count: number;
  pctOfTotal: number;
  pctOfMax: number;
};

interface ExceptionDistributionPanelState extends SceneObjectState {
  title: string;
  attributeKey: string;
  items?: DistributionItem[];
  loadingState?: LoadingState;
  error?: string;
}

type ExceptionDistributionPanelInit = Omit<ExceptionDistributionPanelState, 'items' | 'loadingState' | 'error'> & {
  query: string;
  datasourceUid: string;
  timeRangeScene: SceneObject;
};

const MAX_ROWS = 6;

class ExceptionDistributionPanel extends SceneObjectBase<ExceptionDistributionPanelState> {
  constructor(state: ExceptionDistributionPanelInit) {
    super({
      $data: new SceneQueryRunner({
        datasource: { uid: state.datasourceUid },
        $timeRange: sceneGraph.getTimeRange(state.timeRangeScene),
        queries: [
          {
            refId: 'A',
            queryType: 'traceql',
            tableType: 'spans',
            query: state.query,
            limit: 200,
            filters: [],
          },
        ],
      }),
      title: state.title,
      attributeKey: state.attributeKey,
    });

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);
      this._subs.add(
        data.subscribeToState((dataState) => {
          const panelData = dataState.data;
          const state = panelData?.state;
          if (!state) {
            return;
          }

          if (state === LoadingState.Error) {
            this.setState({
              loadingState: LoadingState.Error,
              error: panelData.errors?.[0]?.message ?? 'Query failed',
              items: [],
            });
            return;
          }

          if (state === LoadingState.Loading || state === LoadingState.NotStarted) {
            this.setState({ loadingState: state });
            return;
          }

          const series = panelData.series ?? [];
          const items = buildDistribution(series, this.state.attributeKey);
          this.setState({ loadingState: state, items, error: undefined });
        })
      );
    });
  }

  static Component = ({ model }: SceneComponentProps<ExceptionDistributionPanel>) => {
    const styles = useStyles2(getStyles);
    const { title, items, loadingState, error } = model.useState();
    const placeholder =
      loadingState === LoadingState.Loading || loadingState === LoadingState.NotStarted
        ? 'Loading…'
        : error ?? (!items || items.length === 0 ? 'No values' : null);

    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>{title}</div>
        </div>

        <div className={styles.body}>
          {placeholder ? (
            <div className={styles.placeholder}>{placeholder}</div>
          ) : (
            items?.map((item) => {
              const percent = Math.round(item.pctOfTotal * 100);
              const barWidth = `${Math.max(0, Math.min(100, item.pctOfMax * 100))}%`;

              return (
                <div className={styles.row} key={item.value}>
                  <div className={styles.value} title={item.value}>
                    {item.value}
                  </div>
                  <div className={styles.barWrap} aria-hidden={true}>
                    <div className={styles.barFill} style={{ width: barWidth }} />
                  </div>
                  <div className={styles.meta} title={`${percent}%`}>
                    <span className={styles.pct}>{percent}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };
}

export function buildDistribution(series: DataFrame[], attributeKey: string, maxRows = MAX_ROWS): DistributionItem[] {
  const rawItems = series
    .map((df) => {
      const value = getSeriesValue(df, attributeKey) ?? 'Unknown';
      const count = getSeriesCount(df);
      return { value, count };
    })
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);

  const total = rawItems.reduce((acc, i) => acc + i.count, 0);
  const max = rawItems[0]?.count ?? 0;

  if (total === 0 || max === 0) {
    return [];
  }

  const head = rawItems.slice(0, maxRows);
  const tail = rawItems.slice(maxRows);
  const items = tail.length ? [...head, { value: 'Other', count: tail.reduce((acc, i) => acc + i.count, 0) }] : head;

  const maxForBars = Math.max(...items.map((i) => i.count), 1);

  return items.map((i) => ({
    value: i.value,
    count: i.count,
    pctOfTotal: i.count / total,
    pctOfMax: i.count / maxForBars,
  }));
}

export function getSeriesValue(df: DataFrame, attributeKey: string) {
  const valueField = df.fields.find((f) => f.name !== 'time');
  const raw = valueField?.labels?.[attributeKey];
  return raw ? raw.replace(/"/g, '') : undefined;
}

function getSeriesCount(df: DataFrame) {
  const valueField = df.fields.find((f) => f.name !== 'time' && f.type === 'number');
  const vals = valueField?.values;
  if (!vals) {
    return 0;
  }

  // Query results can be a single-point series or a vector of points; summing handles both shapes consistently.
  let sum = 0;
  for (const v of vals) {
    if (typeof v === 'number' && !isNaN(v)) {
      sum += v;
    }
  }
  return sum;
}

function getStyles(theme: GrafanaTheme2) {
  return {
    panel: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.primary,
      overflow: 'hidden',
      minWidth: 260,
    }),
    header: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
      background: theme.colors.background.secondary,
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
    }),
    headerLeft: css({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    body: css({
      padding: theme.spacing(1),
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
      maxHeight: 140,
      overflowY: 'auto',
      overflowX: 'hidden',
    }),
    placeholder: css({
      color: theme.colors.text.secondary,
      fontStyle: 'italic',
      padding: `${theme.spacing(0.5)} 0`,
    }),
    row: css({
      display: 'grid',
      gridTemplateColumns: 'minmax(160px, 2fr) 1fr minmax(64px, auto)',
      alignItems: 'center',
      gap: theme.spacing(0.5),
    }),
    value: css({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'normal',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      color: theme.colors.text.primary,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: 1.2,
    }),
    barWrap: css({
      height: 6,
      borderRadius: 999,
      background: theme.colors.border.weak,
      overflow: 'hidden',
    }),
    barFill: css({
      background: theme.colors.text.link,
      height: '100%',
      borderRadius: 999,
      opacity: 0.9,
    }),
    meta: css({
      display: 'flex',
      justifyContent: 'flex-end',
      fontSize: theme.typography.bodySmall.fontSize,
      whiteSpace: 'nowrap',
    }),
    pct: css({
      color: theme.colors.text.secondary,
      minWidth: 28,
      textAlign: 'right',
    }),
  };
}

export const ExceptionComparison = ({
  scene,
  selectedAttributes,
  baseFilter,
}: {
  scene: SceneObject;
  selectedAttributes?: string[];
  baseFilter: string;
}) => {
  const styles = useStyles2(getComparisonStyles);

  const panels = useMemo(() => {
    const defaults = ['resource.service.name', 'resource.service.namespace', 'name'];
    const available = getTraceByServiceScene(scene).state.attributes ?? [];
    const attributeKeys = getAttributeKeys(selectedAttributes, available, defaults);

    let datasourceUid: string;
    try {
      datasourceUid = getDatasourceUidOrThrow(scene);
    } catch (err) {
      console.error('Failed to get datasource UID:', err);
      return [];
    }

    return attributeKeys.map((attributeKey) => {
      const query = `${baseFilter} | count_over_time() by (${attributeKey})`;
      return new ExceptionDistributionPanel({
        title: attributeKey,
        attributeKey,
        query,
        datasourceUid,
        timeRangeScene: scene,
      });
    });
  }, [selectedAttributes, baseFilter, scene]);

  return (
    <div className={styles.container}>
      {panels.map((panel: ExceptionDistributionPanel, idx: number) => (
        <div key={idx} className={styles.item}>
          <panel.Component model={panel} />
        </div>
      ))}
    </div>
  );
};

export function getAttributeKeys(selected: string[] | undefined, available: string[], defaults: string[]) {
  const picked = (selected ?? defaults).filter(Boolean);
  const filtered = available.length ? picked.filter((k) => available.includes(k)) : picked;
  return filtered.length ? filtered : defaults;
}

function getComparisonStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      gap: theme.spacing(1),
      flexWrap: 'wrap',
      paddingBottom: theme.spacing(0.5),
      marginBottom: theme.spacing(1),
    }),
    item: css({
      flex: '1 1 0',
      minWidth: 240,
    }),
  };
}
