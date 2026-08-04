import { createTheme } from '@grafana/data';
import { renderHook } from '@testing-library/react';
import type uPlot from 'uplot';

import { useTimeSeekerChartConfig, UseTimeSeekerChartConfigParams } from './useTimeSeekerChartConfig';
import { stubUplot } from 'utils/testUtils';
import { MutableRefObject } from 'react';

function setupTest() {
  const onChangeTimeRange = jest.fn();
  const ref = <T>(current: T): MutableRefObject<T> => ({ current });
  const params: UseTimeSeekerChartConfigParams = {
    theme: createTheme(),
    metric: 'rate',
    visibleRange: { from: 0, to: 100 },
    timelineRange: { from: 10, to: 60 },
    uplotRef: ref(null),
    wheelListenerRef: ref(null),
    isProgrammaticSelect: ref(false),
    skipNextSelectUpdate: ref(false),
    interactionMode: ref('idle'),
    suppressNextTimeRangeUpdate: ref(false),
    setVisibleRange: jest.fn(),
    setTimelineRange: jest.fn(),
    handlePanStart: jest.fn(),
    onChangeTimeRange,
    updateOverlay: jest.fn(),
  };

  const { result } = renderHook(() => useTimeSeekerChartConfig(params));
  const hooks = result.current.getConfig().hooks as { setSelect: Array<(u: uPlot) => void> };
  return { setSelect: hooks.setSelect[0], onChangeTimeRange };
}

describe('useTimeSeekerChartConfig setSelect', () => {
  it('should ignore a programmatic setSelect and not change the time range (regression for #815)', () => {
    const { setSelect, onChangeTimeRange } = setupTest();
    setSelect(stubUplot({ event: null, dragX: true, left: 10, width: 50 }));

    expect(onChangeTimeRange).not.toHaveBeenCalled();
  });

  it('should propagate a real user drag to onChangeTimeRange', () => {
    const { setSelect, onChangeTimeRange } = setupTest();
    setSelect(stubUplot({ event: new MouseEvent('mousedown'), dragX: true, left: 10, width: 50 }));

    expect(onChangeTimeRange).toHaveBeenCalledWith({ from: 10, to: 60 });
  });
});
