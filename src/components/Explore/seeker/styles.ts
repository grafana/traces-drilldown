import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

export const getTimeSeekerStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    fontFamily: 'Open Sans',
    position: 'relative',
    overflow: 'hidden',
    paddingTop: theme.spacing(2),
    height: theme.spacing(8),
  }),
  chartContainer: css({
    position: 'relative',
    width: '100%',
    height: 42,
  }),
});

export const getControlStyles = (theme: GrafanaTheme2) => ({
  floatingControls: css({
    position: 'absolute',
    top: 0,
    right: 0,
  }),
  floatingControlsContent: css({
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    gap: 4,
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: 4,
    padding: 2,
    zIndex: 3,
    opacity: 0.3,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1,
    },
    button: {
      margin: 0,
    },
  }),
  popoverContent: css({
    backgroundColor: theme.colors.background.primary,
    padding: 8,
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  }),
  buttonWrapper: css({
    position: 'relative',
    display: 'inline-block',
  }),
  timeRangeInputContainer: css({
    // Position the input container at the right side of the controls
    position: 'absolute',
    top: 0,
    right: 0,
    width: 1,
    height: '100%',
    // Don't block pointer events on the container itself - clicks pass through to button
    pointerEvents: 'none',
    overflow: 'visible',
    // Lower z-index so button is on top, but allow popup to show above
    zIndex: -1,
    // Hide the wrapper visually but keep functional
    '& > div': {
      position: 'relative',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      // Hide the trigger button but allow popup to show
      '& > button': {
        opacity: 0,
        pointerEvents: 'auto',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      },
      // Ensure the popup section is visible and interactive
      '& > section, & section[data-floating-ui-focusable]': {
        visibility: 'visible',
        opacity: 1,
        pointerEvents: 'auto',
        zIndex: 10000,
        // Reset font styling to default Grafana styles
        fontFamily: theme.typography.fontFamily,
        '& *': {
          // Ensure all children have proper font styling
          fontFamily: 'inherit',
          fontSize: 'inherit',
        },
      },
      // Also ensure popup content is visible
      '& #TimePickerContent, & [id*="TimePicker"]': {
        visibility: 'visible',
        opacity: 1,
        pointerEvents: 'auto',
        fontFamily: theme.typography.fontFamily,
      },
    },
  }),
});

export const getDragOverlayStyles = (theme: GrafanaTheme2) => ({
  resizeHandle: css({
    position: 'absolute',
    top: 0,
    width: '4px',
    height: '100%',
    background: 'linear-gradient(to right, rgba(0, 123, 255, 0.4), rgba(0, 123, 255, 0.2))',
    border: '1px solid rgba(0, 123, 255, 0.8)',
    cursor: 'ew-resize',
    zIndex: 2,
    boxShadow: '0 0 4px rgba(0, 123, 255, 0.5)',
    transition: 'background 0.2s',
    '&:hover': {
      background: 'rgba(0, 123, 255, 0.6)',
    },
  }),
});

export const getLoadingOverlayStyles = (theme: GrafanaTheme2) => ({
  loadingOverlay: css({
    position: 'absolute',
    top: 0,
    height: '29px',
    background: `repeating-linear-gradient(
      -45deg,
      ${theme.colors.primary.shade},
      ${theme.colors.primary.shade} 4px,
      transparent 4px,
      transparent 8px
    )`,
    opacity: 0.6,
    pointerEvents: 'none',
    zIndex: 5,
    animation: 'loading-pulse 1.5s ease-in-out infinite',
    '@keyframes loading-pulse': {
      '0%, 100%': {
        opacity: 0.4,
      },
      '50%': {
        opacity: 0.7,
      },
    },
  }),
});
