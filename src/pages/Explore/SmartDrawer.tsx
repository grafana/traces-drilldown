import { css } from '@emotion/css';
import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';
import { Drawer } from './Drawer';

interface SmartDrawerProps {
  children: React.ReactNode;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  forceNoDrawer?: boolean;
  investigationButton?: React.ReactNode;
}

export const SmartDrawer = ({
  children,
  title,
  isOpen,
  onClose,
  embedded = false,
  forceNoDrawer = false,
  investigationButton,
}: SmartDrawerProps) => {
  const styles = useStyles2(getStyles);

  const shouldUseDrawer = !forceNoDrawer && !embedded;

  if (!isOpen) {
    return null;
  }

  if (shouldUseDrawer) {
    return (
      <Drawer size="lg" title={title} onClose={onClose}>
        {children}
      </Drawer>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.drawerHeader}>
        <Button variant="primary" fill="text" size="md" icon={'arrow-left'} onClick={onClose}>
          Back to all traces
        </Button>
        {embedded && investigationButton}
      </div>
      {children}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    height: '100%',
    width: '100%',
    background: theme.colors.background.primary,
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 3,
  }),
  drawerHeader: css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing(2),

    h4: {
      margin: 0,
    },
  }),
});
