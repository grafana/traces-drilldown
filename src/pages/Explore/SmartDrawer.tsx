import { css, keyframes } from '@emotion/css';
import React, { useEffect, useState } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Drawer, IconButton, useStyles2 } from '@grafana/ui';

interface SmartDrawerProps {
  children: React.ReactNode;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  forceNoDrawer?: boolean;
  investigationButton?: React.ReactNode;
}

export const SmartDrawer = ({
  children,
  title,
  isOpen,
  onClose,
  forceNoDrawer = false,
  investigationButton,
}: SmartDrawerProps) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isAnimating, setIsAnimating] = useState(false);
  const styles = useStyles2(getStyles);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setIsAnimating(false);
    }
  };

  const shouldUseDrawer = !forceNoDrawer && windowWidth > 1500;

  if (!isOpen && !isAnimating) {
    return null;
  }

  if (shouldUseDrawer) {
    return (
      <Drawer size="lg" onClose={onClose}>
        {title && (
          <div className={styles.drawerHeader}>
            <h3>{title}</h3>
            <div className={styles.drawerHeaderButtons}>
              {investigationButton}
              <IconButton name="times" onClick={onClose} tooltip="Close drawer" size="lg" />
            </div>
          </div>
        )}
        {children}
      </Drawer>
    );
  }

  return (
    <div
      className={`${styles.container} ${isOpen ? styles.slideIn : styles.slideOut}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className={styles.drawerHeader}>
        <Button variant="secondary" fill="text" size="md" icon={'arrow-left'} onClick={onClose}>
          Back to all traces
        </Button>
        {investigationButton}
      </div>
      {children}
    </div>
  );
};

const slideInAnimation = keyframes`
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
`;

const slideOutAnimation = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
`;

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
  slideIn: css({
    animation: `${slideInAnimation} 0.3s ease-out forwards`,
  }),
  slideOut: css({
    animation: `${slideOutAnimation} 0.3s ease-in forwards`,
  }),
  drawerHeader: css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing(2),

    h3: {
      margin: 0,
    },
  }),
  drawerHeaderButtons: css({
    display: 'flex',
    gap: theme.spacing(1),
  }),
});
