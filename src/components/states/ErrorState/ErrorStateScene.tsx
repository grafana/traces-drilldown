import { t } from '@grafana/i18n';
import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import React from 'react';
import { Alert } from '@grafana/ui';
import { testIds } from 'utils/testIds';

interface ErrorStateSceneState extends SceneObjectState {
  message: string;
}

export class ErrorStateScene extends SceneObjectBase<ErrorStateSceneState> {
  public static Component = ({ model }: SceneComponentProps<ErrorStateScene>) => {
    const { message } = model.useState();
    return (
      <Alert title={t('error-state-scene.query-error', 'Query error')} severity={'error'} data-testid={testIds.errorState}>
        {message}
      </Alert>
    );
  };
}
