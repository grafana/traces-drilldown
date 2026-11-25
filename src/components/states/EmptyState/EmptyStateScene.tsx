import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import { Box, EmptyState as SharedEmptyState, Icon } from '@grafana/ui';
import React from 'react';
import { testIds } from 'utils/testIds';
import { EmptyState } from './EmptyState';
import { GrotNotFound } from './GrotNotFound';

interface EmptyStateSceneState extends SceneObjectState {
  message?: string;
  remedyMessage?: string;
  imgWidth?: number;
  padding?: string;
  layout?: 'shared';
}

export class EmptyStateScene extends SceneObjectBase<EmptyStateSceneState> {
  public static Component = ({ model }: SceneComponentProps<EmptyStateScene>) => {
    const { message, remedyMessage, imgWidth, padding, layout } = model.useState();
    if (layout === 'shared' && message) {
      return (
        <Box width="100%" data-testid={testIds.emptyState}>
          <SharedEmptyState message={message} image={<GrotNotFound width={imgWidth ?? 300} />} variant="not-found">
            {remedyMessage && (
              <>
                <Icon name="info-circle" /> {remedyMessage}
              </>
            )}
          </SharedEmptyState>
        </Box>
      );
    }

    return <EmptyState message={message} remedyMessage={remedyMessage} imgWidth={imgWidth} padding={padding} />;
  };
}
