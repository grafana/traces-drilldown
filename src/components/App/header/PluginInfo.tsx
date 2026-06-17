import { css } from '@emotion/css';
import { usePluginContext, GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { Button, Dropdown, Menu, useStyles2 } from '@grafana/ui';
import React from 'react';

import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';

import { TempoLogo } from './TempoLogo';

const PLUGIN_REPO = 'https://github.com/grafana/traces-drilldown';
const DOCUMENTATION_URL = 'https://grafana.com/docs/grafana/next/explore/simplified-exploration/traces/';
const FEEDBACK_FORM_URL = 'https://grafana.qualtrics.com/jfe/form/SV_9LUZ21zl3x4vUcS';

const commitSha = process.env.COMMIT_SHA;
const pluginCommitUrl =
  commitSha && commitSha !== 'local' ? `${PLUGIN_REPO}/commit/${commitSha}` : undefined;

const { buildInfo: grafanaBuildInfo } = config;

function InfoMenuHeader() {
  const styles = useStyles2(getStyles);
  const pluginContext = usePluginContext();
  const version = pluginContext?.meta?.info?.version ?? process.env.VERSION ?? '?.?.?';
  const updated = pluginContext?.meta?.info?.updated ?? '?';

  return (
    <div className={styles.menuHeader}>
      <h5>
        <TempoLogo />
        {t('plugin-info.header.title', 'Grafana Traces Drilldown v{{version}}', { version })}
      </h5>
      <div className={styles.subTitle}>
        {t('plugin-info.header.last-update', 'Last update: {{updated}}', { updated })}
      </div>
    </div>
  );
}

function InfoMenu() {
  const isDev = !commitSha || commitSha === 'local';
  const shortCommitSha = isDev ? (commitSha ?? 'local') : commitSha.slice(0, 8);

  return (
    <Menu header={<InfoMenuHeader />}>
      <Menu.Item
        label={t('plugin-info.menu.commit-sha', 'Commit SHA: {{sha}}', { sha: shortCommitSha })}
        icon="github"
        disabled={isDev || !pluginCommitUrl}
        onClick={() => {
          if (pluginCommitUrl) {
            window.open(pluginCommitUrl, '_blank', 'noopener,noreferrer');
          }
        }}
      />
      <Menu.Item
        label={t('plugin-info.menu.changelog', 'Changelog')}
        icon="list-ul"
        onClick={() => window.open(`${PLUGIN_REPO}/blob/main/CHANGELOG.md`, '_blank', 'noopener,noreferrer')}
      />
      <Menu.Item
        label={t('plugin-info.menu.contribute', 'Contribute')}
        icon="external-link-alt"
        onClick={() => window.open(`${PLUGIN_REPO}/blob/main/CONTRIBUTING.md`, '_blank', 'noopener,noreferrer')}
      />
      <Menu.Item
        label={t('plugin-info.menu.documentation', 'Documentation')}
        icon="document-info"
        onClick={() => {
          reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.feedback_link_clicked);
          window.open(DOCUMENTATION_URL, '_blank', 'noopener,noreferrer');
        }}
      />
      {config.feedbackLinksEnabled && (
        <Menu.Item
          label={t('plugin-info.menu.give-feedback', 'Give feedback')}
          icon="comment-alt-message"
          onClick={() => {
            reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.global_docs_link_clicked);
            window.open(FEEDBACK_FORM_URL, '_blank', 'noopener,noreferrer');
          }}
        />
      )}
      <Menu.Item
        label={t('plugin-info.menu.report-issue', 'Report an issue')}
        icon="bug"
        onClick={() => window.open(`${PLUGIN_REPO}/issues/new`, '_blank', 'noopener,noreferrer')}
      />
      <Menu.Divider />
      <Menu.Item
        label={t('plugin-info.menu.grafana-version', 'Grafana {{edition}} ({{env}})', {
          edition: grafanaBuildInfo.edition,
          env: grafanaBuildInfo.env,
        })}
        icon="grafana"
        onClick={() =>
          window.open(
            `https://github.com/grafana/grafana/commit/${grafanaBuildInfo.commit}`,
            '_blank',
            'noopener,noreferrer'
          )
        }
      />
    </Menu>
  );
}

export function PluginInfo() {
  return (
    <Dropdown overlay={<InfoMenu />} placement="bottom-end">
      <Button
        aria-label={t('plugin-info.button.title', 'Plugin info')}
        icon="info-circle"
        variant="secondary"
        tooltip={t('plugin-info.button.tooltip', 'Plugin info')}
        tooltipPlacement="top"
        title={t('plugin-info.button.title', 'Plugin info')}
        data-testid="plugin-info-button"
      />
    </Dropdown>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  menuHeader: css`
    padding: ${theme.spacing(0.5, 1)};
    white-space: nowrap;
  `,
  subTitle: css`
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
});
