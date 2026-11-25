import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import { Box, EmptyState as SharedEmptyState, Icon } from '@grafana/ui';
import React from 'react';
import { testIds } from 'utils/testIds';
import { EmptyState } from './EmptyState';
import { GrotNotFound } from './GrotNotFound';

type EmptyStateSceneState = SceneObjectState & {
  remedyMessage?: string;
  imgWidth?: number;
} & ({ layout: 'shared'; message: string; padding?: never } | { layout?: never; message?: string; padding?: string });

export const SharedQueryEmptyState = ({
  message,
  remedyMessage,
  imgWidth = 300,
}: {
  message: string;
  remedyMessage?: string;
  imgWidth?: number;
}) => (
  <Box width="100%" data-testid={testIds.emptyState}>
    <SharedEmptyState message={message} image={<GrotNotFound width={imgWidth} />} variant="not-found">
      {remedyMessage && (
        <>
          <Icon name="info-circle" /> {remedyMessage}
        </>
      )}
    </SharedEmptyState>
  </Box>
);

export class EmptyStateScene extends SceneObjectBase<EmptyStateSceneState> {
  public static Component = ({ model }: SceneComponentProps<EmptyStateScene>) => {
    const { message, remedyMessage, imgWidth, padding, layout } = model.useState();
    if (layout === 'shared') {
      return <SharedQueryEmptyState message={message} remedyMessage={remedyMessage} imgWidth={imgWidth} />;
    }

    return <EmptyState message={message} remedyMessage={remedyMessage} imgWidth={imgWidth} padding={padding} />;
  };
}
