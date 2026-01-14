import React, { useState } from 'react';
import { Button, Field, useStyles2, FieldSet, Combobox } from '@grafana/ui';
import { PluginConfigPageProps, AppPluginMeta, PluginMeta, GrafanaTheme2 } from '@grafana/data';
import { FetchResponse, getBackendSrv, locationService } from '@grafana/runtime';
import { css } from '@emotion/css';
import { lastValueFrom, Observable } from 'rxjs';
import { DEFAULT_QUERY_RANGE_HOURS } from 'utils/shared';

export type JsonData = {
  queryRangeHours?: number;
};

type State = {
  // The time range for each cached batch (in hours)
  queryRangeHours: number;
};

interface Props extends PluginConfigPageProps<AppPluginMeta<JsonData>> {}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: `${i + 1} hour${i > 0 ? 's' : ''}`,
  value: i + 1,
}));

const AppConfig = ({ plugin }: Props) => {
  const s = useStyles2(getStyles);
  const { enabled, pinned, jsonData } = plugin.meta;
  const [state, setState] = useState<State>({
    queryRangeHours: jsonData?.queryRangeHours ?? DEFAULT_QUERY_RANGE_HOURS,
  });

  const onChangeQueryRange = (option: { label?: string; value?: number } | null) => {
    if (option?.value) {
      setState({
        ...state,
        queryRangeHours: option.value,
      });
    }
  };

  return (
    <div data-testid={testIds.appConfig.container}>
      {/* ENABLE / DISABLE PLUGIN */}
      <FieldSet label="Enable / Disable">
        {!enabled && (
          <>
            <div className={s.colorWeak}>The plugin is currently not enabled.</div>
            <Button
              className={s.marginTop}
              variant="primary"
              onClick={() =>
                updatePluginAndReload(plugin.meta.id, {
                  enabled: true,
                  pinned: true,
                  jsonData,
                })
              }
            >
              Enable plugin
            </Button>
          </>
        )}

        {/* Disable the plugin */}
        {enabled && (
          <>
            <div className={s.colorWeak}>The plugin is currently enabled.</div>
            <Button
              className={s.marginTop}
              variant="destructive"
              onClick={() =>
                updatePluginAndReload(plugin.meta.id, {
                  enabled: false,
                  pinned: false,
                  jsonData,
                })
              }
            >
              Disable plugin
            </Button>
          </>
        )}
      </FieldSet>

      {/* CUSTOM SETTINGS */}
      <FieldSet label="Time Seeker Settings" className={s.marginTopXl}>
        <Field
          label="Query Range"
          description="The time range for each cached batch in the Time Seeker. Larger values mean fewer queries but more data per query."
        >
          <Combobox<number>
            width={30}
            id="query-range-hours"
            data-testid={testIds.appConfig.queryRange}
            options={HOUR_OPTIONS}
            value={state.queryRangeHours}
            onChange={onChangeQueryRange}
          />
        </Field>

        <div className={s.marginTop}>
          <Button
            type="submit"
            data-testid={testIds.appConfig.submit}
            onClick={() =>
              updatePluginAndReload(plugin.meta.id, {
                enabled,
                pinned,
                jsonData: {
                  queryRangeHours: state.queryRangeHours,
                },
              })
            }
          >
            Save settings
          </Button>
        </div>
      </FieldSet>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  colorWeak: css`
    color: ${theme.colors.text.secondary};
  `,
  marginTop: css`
    margin-top: ${theme.spacing(3)};
  `,
  marginTopXl: css`
    margin-top: ${theme.spacing(6)};
  `,
});

const updatePluginAndReload = async (pluginId: string, data: Partial<PluginMeta<JsonData>>) => {
  try {
    await updatePlugin(pluginId, data);

    // Reloading the page as the changes made here wouldn't be propagated to the actual plugin otherwise.
    // This is not ideal, however unfortunately currently there is no supported way for updating the plugin state.
    locationService.reload();
  } catch (e) {
    console.error('Error while updating the plugin', e);
  }
};

const testIds = {
  appConfig: {
    container: 'data-testid ac-container',
    queryRange: 'data-testid ac-query-range',
    submit: 'data-testid ac-submit-form',
  },
};

/**
 * Save plugin settings to Grafana backend.
 * Follows the recommended approach from:
 * https://grafana.com/developers/plugin-tools/tutorials/build-an-app-plugin#configuration-page
 */
export const updatePlugin = async (pluginId: string, data: Partial<PluginMeta>) => {
  const response = getBackendSrv().fetch({
    url: `/api/plugins/${pluginId}/settings`,
    method: 'POST',
    data,
  }) as unknown as Observable<FetchResponse>;

  const dataResponse = await lastValueFrom(response);

  return dataResponse.data;
};

export default AppConfig;
