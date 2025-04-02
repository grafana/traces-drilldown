import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { Icon, Tooltip, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

interface StreamingIndicatorProps {
  isStreaming: boolean;
  iconSize?: number;
}

export const StreamingIndicator = ({ 
  isStreaming, 
  iconSize = 14,
}: StreamingIndicatorProps) => {
  const styles = useStyles2(getStyles, iconSize);

  if (!isStreaming) {
    return null;
  }

  return (
    <Tooltip content={'Streaming'}>
      <Icon name={'circle-mono'} size="md" className={styles.streamingIndicator} />
    </Tooltip>
  );
};

const getStyles = (theme: GrafanaTheme2, iconSize: number) => {
  return {
    streamingIndicator: css({
      width: `${iconSize}px`,
      height: `${iconSize}px`,
      backgroundColor: theme.colors.success.text,
      fill: theme.colors.success.text,
      borderRadius: '50%',
      display: 'inline-block',
    }),
  };
}; 
