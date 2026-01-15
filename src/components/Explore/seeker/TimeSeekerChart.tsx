import React from 'react';
import { UPlotChart } from '@grafana/ui';
import { TimeSeekerDragOverlay } from './TimeSeekerDragOverlay';
import { TimeSeekerLoadingOverlay } from './TimeSeekerLoadingOverlay';
import { useTimeSeeker } from './TimeSeekerContext';

export const TimeSeekerChart: React.FC = () => {
  const { timeValues, valueValues, width, chartHeight, chartConfig } = useTimeSeeker();

  return (
    <div style={{ position: 'relative', width, height: chartHeight }}>
      <UPlotChart data={[timeValues, valueValues]} width={width} height={chartHeight} config={chartConfig} />
      <TimeSeekerLoadingOverlay />
      <TimeSeekerDragOverlay />
    </div>
  );
};
