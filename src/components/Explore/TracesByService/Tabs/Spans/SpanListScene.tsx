import React from 'react';

import {
  PanelBuilders,
  SceneComponentProps,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { DataFrame, GrafanaTheme2, LoadingState, PanelData, toURLRange, urlUtil, toOption } from '@grafana/data';
import { config } from '@grafana/runtime';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { css } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';
import { Icon, Link, TableCellDisplayMode, TableCustomCellOptions, useStyles2, useTheme2 } from '@grafana/ui';
import { map, Observable } from 'rxjs';
import {
  getDataSource,
  getSpanListColumnsVariable,
  getTraceByServiceScene,
  getTraceExplorationScene,
} from '../../../../../utils/utils';
import {
  EMPTY_STATE_ERROR_MESSAGE,
  EMPTY_STATE_ERROR_REMEDY_MESSAGE,
  EventTraceOpened,
} from '../../../../../utils/shared';
import { SpanListColumnsSelector } from './SpanListColumnsSelector';
import { reportAppInteraction, USER_EVENTS_PAGES, USER_EVENTS_ACTIONS } from 'utils/analytics';

export interface SpanListSceneState extends SceneObjectState {
  panel?: SceneFlexLayout;
  dataState: 'empty' | 'loading' | 'done';
}

export class SpanListScene extends SceneObjectBase<SpanListSceneState> {
  constructor(state: Partial<SpanListSceneState>) {
    super({
      dataState: 'empty',
      ...state,
    });

    this.addActivationHandler(() => {
      this.setState({
        $data: new SceneDataTransformer({
          transformations: this.setupTransformations(),
        }),
      });
      const sceneData = sceneGraph.getData(this);

      this.updatePanel(sceneData.state.data);
      this._subs.add(
        sceneData.subscribeToState((data) => {
          this.updatePanel(data.data);
        })
      );
    });
  }

  private setupTransformations() {
    return [
      () => (source: Observable<DataFrame[]>) => {
        return source.pipe(
          map((data: DataFrame[]) => {
            return data.map((df) => {
              const fields = df.fields;
              const nameField = fields.find((f) => f.name === 'traceName');

              const options: TableCustomCellOptions = {
                type: TableCellDisplayMode.Custom,
                cellComponent: (props) => {
                  const data = props.frame;
                  const traceIdField = data?.fields.find((f) => f.name === 'traceIdHidden');
                  const spanIdField = data?.fields.find((f) => f.name === 'spanID');
                  const traceId = traceIdField?.values[props.rowIndex];
                  const spanId = spanIdField?.values[props.rowIndex];

                  if (!traceId) {
                    return props.value as string;
                  }

                  const name = props.value ? (props.value as string) : '<name not yet available>';
                  return (
                    <div className={'cell-link-wrapper'}>
                      <div
                        className={'cell-link'}
                        title={name}
                        onClick={() => {
                          this.publishEvent(new EventTraceOpened({ traceId, spanId }), true);
                        }}
                      >
                        {name}
                      </div>
                      <Link href={this.getLinkToExplore(traceId, spanId)} target={'_blank'} title={'Open in new tab'}>
                        <Icon name={'external-link-alt'} size={'sm'} />
                      </Link>
                    </div>
                  );
                },
              };
              if (nameField?.config?.custom) {
                nameField.config.custom.cellOptions = options;
              }
              return {
                ...df,
                fields,
              };
            });
          })
        );
      },
    ];
  }

  private getLinkToExplore = (traceId: string, spanId: string) => {
    const traceExplorationScene = getTraceExplorationScene(this);
    const datasource = getDataSource(traceExplorationScene);

    const timeRange = sceneGraph.getTimeRange(this).state.value;
    const exploreState = JSON.stringify({
      ['explore-traces']: {
        range: toURLRange(timeRange.raw),
        queries: [{ refId: 'traceId', queryType: 'traceql', query: traceId, datasource }],
        panelsState: {
          trace: {
            spanId,
          },
        },
        datasource,
      },
    });
    const subUrl = config.appSubUrl ?? '';
    return urlUtil.renderUrl(`${subUrl}/explore`, { panes: exploreState, schemaVersion: 1 });
  };

  private updatePanel(data?: PanelData) {
    if (
      data?.state === LoadingState.Loading ||
      data?.state === LoadingState.NotStarted ||
      !data?.state ||
      (data?.state === LoadingState.Streaming && !data.series?.[0]?.length)
    ) {
      if (this.state.dataState === 'loading') {
        return;
      }
      this.setState({
        dataState: 'loading',
        panel: new SceneFlexLayout({
          direction: 'row',
          children: [
            new LoadingStateScene({
              component: SkeletonComponent,
            }),
          ],
        }),
      });
      return;
    }
    if (data?.state === LoadingState.Done || data?.state === LoadingState.Streaming) {
      if (data.series.length === 0 || data.series[0].length === 0) {
        this.setState({
          dataState: 'empty',
          panel: new SceneFlexLayout({
            children: [
              new SceneFlexItem({
                body: new EmptyStateScene({
                  message: EMPTY_STATE_ERROR_MESSAGE,
                  remedyMessage: EMPTY_STATE_ERROR_REMEDY_MESSAGE,
                  padding: '32px',
                }),
              }),
            ],
          }),
        });
      } else if (this.state.dataState !== 'done') {
        this.setState({
          dataState: 'done',
          panel: new SceneFlexLayout({
            direction: 'row',
            children: [
              new SceneFlexItem({
                body: PanelBuilders.table()
                  .setHoverHeader(true)
                  .setOverrides((builder) => {
                    return builder
                      .matchFieldsWithName('spanID')
                      .overrideCustomFieldConfig('hidden', true)
                      .matchFieldsWithName('traceService')
                      .overrideCustomFieldConfig('width', 350)
                      .matchFieldsWithName('traceName')
                      .overrideCustomFieldConfig('width', 350);
                  })
                  .build(),
              }),
            ],
          }),
        });
      }
    }
  }

  public onChange = (columns: string[]) => {
    const variable = getSpanListColumnsVariable(this);
    if (variable.getValue() !== columns) {
      variable.changeValueTo(columns);

      reportAppInteraction(
        USER_EVENTS_PAGES.analyse_traces,
        USER_EVENTS_ACTIONS.analyse_traces.span_list_columns_changed,
        {
          columns,
        }
      );
    }
  };

  public static Component = ({ model }: SceneComponentProps<SpanListScene>) => {
    const { panel } = model.useState();
    const styles = getStyles(useTheme2());
    const variable = getSpanListColumnsVariable(model);
    const { attributes } = getTraceByServiceScene(model).useState();

    if (!panel) {
      return;
    }

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.description}>View a list of spans for the current set of filters.</div>
          <SpanListColumnsSelector
            options={attributes?.map((x) => toOption(x)) ?? []}
            value={variable.getValue()}
            onChange={model.onChange}
          />
        </div>
        <panel.Component model={panel} />
      </div>
    );
  };
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      display: 'contents',

      '[role="cell"] > div': {
        display: 'flex',
        width: '100%',
      },

      '.cell-link-wrapper': {
        display: 'flex',
        gap: '4px',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',

        a: {
          padding: 4,
          fontSize: 0,

          ':hover': {
            background: theme.colors.background.secondary,
          },
        },
      },

      '.cell-link': {
        color: theme.colors.text.link,
        cursor: 'pointer',
        maxWidth: '300px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',

        ':hover': {
          textDecoration: 'underline',
        },
      },
    }),
    description: css({
      fontSize: theme.typography.h6.fontSize,
      padding: `${theme.spacing(1)} 0 ${theme.spacing(2)} 0`,
    }),
    header: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '10px',
    }),
  };
};

const SkeletonComponent = () => {
  const styles = useStyles2(getSkeletonStyles);

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <Skeleton count={1} width={80} />
      </div>
      {[...Array(3)].map((_, i) => (
        <div className={styles.row} key={i}>
          {[...Array(6)].map((_, j) => (
            <span className={styles.rowItem} key={j}>
              <Skeleton count={1} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

function getSkeletonStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      height: '100%',
      width: '100%',
      position: 'absolute',
      backgroundColor: theme.colors.background.primary,
      border: `1px solid ${theme.colors.border.weak}`,
      padding: '5px',
    }),
    title: css({
      marginBottom: '20px',
    }),
    row: css({
      marginBottom: '5px',
      display: 'flex',
      justifyContent: 'space-around',
    }),
    rowItem: css({
      width: '14%',
    }),
  };
}
