import React, { useState } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { RadioButtonGroup, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { TimeSeekerScene } from '../seeker/TimeSeekerScene';
import { InsightsTimelineWidget } from 'addedComponents/InsightsTimelineWidget/InsightsTimelineWidget';
import { MetricFunction } from 'utils/shared';

interface RedPanelExtrasProps {
  timeSeekerScene?: TimeSeekerScene;
  serviceName: string | null | undefined;
  metric: MetricFunction;
  startTime: string;
  endTime: string;
}

type ExtraType = 'seeker' | 'insights';

export const RedPanelExtras: React.FC<RedPanelExtrasProps> = ({
  timeSeekerScene,
  serviceName,
  metric,
  startTime,
  endTime,
}) => {
  const styles = useStyles2(getStyles);
  const [selectedExtra, setSelectedExtra] = useState<ExtraType>('seeker');

  const hasSeeker = Boolean(timeSeekerScene);
  const hasInsights = Boolean(serviceName);

  // If neither is available, render nothing
  if (!hasSeeker && !hasInsights) {
    return null;
  }

  // If only one is available, render it with a text label
  if (hasSeeker && !hasInsights) {
    return (
      <div className={styles.container}>
        <div className={styles.text}>Seeker</div>
        {timeSeekerScene && <timeSeekerScene.Component model={timeSeekerScene} />}
      </div>
    );
  }

  if (!hasSeeker && hasInsights) {
    return (
      <div className={styles.container}>
        <div className={styles.text}>Insights</div>
        <InsightsTimelineWidget
          serviceName={serviceName || ''}
          metric={metric}
          startTime={startTime}
          endTime={endTime}
        />
      </div>
    );
  }

  // Both are available - render radio button group (vertically stacked)
  const options = [
    { label: 'Seeker', value: 'seeker' as ExtraType },
    { label: 'Insights', value: 'insights' as ExtraType },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.radioButtons}>
        <RadioButtonGroup options={options} value={selectedExtra} onChange={setSelectedExtra} size="sm" />
      </div>
      <div className={styles.content}>
        {selectedExtra === 'seeker' && timeSeekerScene && <timeSeekerScene.Component model={timeSeekerScene} />}
        {selectedExtra === 'insights' && (
          <InsightsTimelineWidget
            serviceName={serviceName || ''}
            metric={metric}
            startTime={startTime}
            endTime={endTime}
          />
        )}
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
    width: '100%',
    backgroundColor: theme.colors.background.secondary,
  }),
  radioButtons: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    padding: theme.spacing(1),
    '& > div': {
      flexDirection: 'column',
    },
  }),
  content: css({
    flex: 1,
    minWidth: 0,
  }),
  text: css({
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(1),

    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
  }),
});
