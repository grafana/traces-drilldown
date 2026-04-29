import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { css } from '@emotion/css';

import { AppEvents, GrafanaTheme2 } from '@grafana/data';
import { getAppEvents, reportInteraction } from '@grafana/runtime';
import { SceneObject } from '@grafana/scenes';
import { Modal, Button, Box, Field, Input, Stack, useStyles2, Alert } from '@grafana/ui';
import { t, Trans } from '@grafana/i18n';

import { getFiltersVariable, getTraceExplorationScene } from '../../../utils/utils';
import { renderTraceQLLabelFilters } from '../../../utils/filters-renderer';
import { useCheckForExistingSearch, useSavedSearches } from './saveSearch';

interface Props {
  dsUid: string;
  onClose(): void;
  sceneRef: SceneObject;
}

export function SaveSearchModal({ dsUid, onClose, sceneRef }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<'error' | 'idle' | 'saved' | 'saving'>('idle');
  const styles = useStyles2(getStyles);

  const traceExploration = useMemo(() => getTraceExplorationScene(sceneRef), [sceneRef]);
  const { filters } = getFiltersVariable(traceExploration).useState();
  const query = useMemo(
    () => renderTraceQLLabelFilters(filters),
    [filters]
  );

  const { saveSearch } = useSavedSearches(dsUid);
  const existingSearch = useCheckForExistingSearch(dsUid, query);

  useEffect(() => {
    reportInteraction('grafana_traces_app_save_search_visited');
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const appEvents = getAppEvents();

      try {
        setState('saving');
        await saveSearch({ description, dsUid, query, title });
        setState('saved');

        appEvents.publish({
          payload: ['Search successfully saved.'],
          type: AppEvents.alertSuccess.name,
        });

        reportInteraction('grafana_traces_app_save_search_search_saved');

        onClose();
      } catch (e) {
        console.error(e);
        setState('error');

        appEvents.publish({
          payload: ['Unexpected error saving this search.'],
          type: AppEvents.alertError.name,
        });
      }
    },
    [description, dsUid, onClose, query, saveSearch, title]
  );

  return (
    <Modal title={t('save-search-modal.title', 'Save current search')} isOpen={true} onDismiss={onClose}>
      <Alert title="" severity="info">
        <Trans i18nKey="save-search-modal.info-alert">Saved searches are stored locally in your browser and will only be available on this device.</Trans>
      </Alert>
      <Box marginBottom={2}>
        <code className={styles.query}>{query}</code>
      </Box>
      {state !== 'saved' ? (
        <form onSubmit={handleSubmit}>
          <Stack gap={1} direction="column" minWidth={0} flex={1}>
            <Box flex={1} marginBottom={2}>
              {existingSearch && (
                <Alert title="" severity="warning">
                  <Trans i18nKey="save-search-modal.existing-search-warning">There is a previously saved search with the same query: {{ title: existingSearch.title }}</Trans>
                </Alert>
              )}
              <Field label={t('save-search-modal.field.title', 'Title')} noMargin htmlFor="save-search-title">
                <Input
                  id="save-search-title"
                  required
                  value={title}
                  onChange={(e: FormEvent<HTMLInputElement>) => setTitle(e.currentTarget.value)}
                  disabled={state === 'saving'}
                />
              </Field>
            </Box>
            <Box flex={1} marginBottom={2}>
              <Field label={t('save-search-modal.field.description', 'Description')} noMargin htmlFor="save-search-description">
                <Input
                  id="save-search-description"
                  value={description}
                  onChange={(e: FormEvent<HTMLInputElement>) => setDescription(e.currentTarget.value)}
                  disabled={state === 'saving'}
                />
              </Field>
            </Box>
          </Stack>
          <Modal.ButtonRow>
            <Button variant="secondary" fill="outline" onClick={onClose} disabled={state === 'saving'}>
              <Trans i18nKey="save-search-modal.cancel">Cancel</Trans>
            </Button>
            <Button type="submit" disabled={!title || state === 'saving'}>
              <Trans i18nKey="save-search-modal.save">Save</Trans>
            </Button>
          </Modal.ButtonRow>
        </form>
      ) : (
        <>
          <Alert title={t('save-search-modal.success-title', 'Success')} severity="success">
            <Trans i18nKey="save-search-modal.success-message">Search successfully saved.</Trans>
          </Alert>
          <Modal.ButtonRow>
            <Button variant="secondary" fill="outline" onClick={onClose}>
              <Trans i18nKey="save-search-modal.close">Close</Trans>
            </Button>
          </Modal.ButtonRow>
        </>
      )}
    </Modal>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  query: css({
    backgroundColor: theme.colors.background.elevated,
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.bodySmall.fontSize,
    padding: theme.spacing(1),
    display: 'block',
  }),
});
