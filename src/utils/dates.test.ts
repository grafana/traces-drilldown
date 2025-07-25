import { sceneGraph, SceneObject } from '@grafana/scenes';
import { formatDuration, getStepForTimeRange, ONE_DAY, ONE_HOUR, ONE_MILLISECOND, ONE_MINUTE, ONE_SECOND } from './dates';

jest.mock('@grafana/scenes');

describe('formatDuration', () => {
  it('formats durations less than a second correctly', () => {
    expect(formatDuration(500)).toBe('500μs');      // 500 microseconds
    expect(formatDuration(5000)).toBe('5ms');       // 5000 microseconds
    expect(formatDuration(1_000_000)).toBe('1s');   // 1,000,000 microseconds
  });

  it('formats durations in seconds and minutes', () => {
    expect(formatDuration(1_500_000)).toBe('1.5s');    // 1,500,000 microseconds
    expect(formatDuration(90_000_000)).toBe('1m 30s'); // 90,000,000 microseconds
  });

  it('formats durations with primary and secondary units', () => {
    expect(formatDuration(183_840_000_000)).toBe('2d 3h'); // 183,840,000,000 microseconds
    expect(formatDuration(3_661_000_000)).toBe('1h 1m');   // 3,661,000,000 microseconds
  });

  it('handles exact day, hour, minute, second, and millisecond values', () => {
    expect(formatDuration(ONE_DAY)).toBe('1d');
    expect(formatDuration(ONE_HOUR)).toBe('1h');
    expect(formatDuration(ONE_MINUTE)).toBe('1m');
    expect(formatDuration(ONE_SECOND)).toBe('1s');
    expect(formatDuration(ONE_MILLISECOND)).toBe('1ms');
  });

  it('formats durations with a secondary unit that rounds up to a whole primary unit', () => {
    expect(formatDuration(299898037.75)).toBe('5m');
  });
});

describe('getStepForTimeRange', () => {
  const mockScene = {} as SceneObject;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates step size based on time range and default data points', () => {
    // Mock the time range: from 0s to 500s
    (sceneGraph.getTimeRange as jest.Mock).mockReturnValue({
      state: { value: { from: { unix: () => 0 }, to: { unix: () => 500 } } },
    });

    expect(getStepForTimeRange(mockScene)).toBe('10s'); // 500s / 50 data points = 10s per step
  });

  it('calculates step size based on time range and specified data points', () => {
    // Mock a 2000s range
    (sceneGraph.getTimeRange as jest.Mock).mockReturnValue({
      state: { value: { from: { unix: () => 0 }, to: { unix: () => 2000 } } },
    });

    expect(getStepForTimeRange(mockScene, 100)).toBe('20s'); // 2000s / 100 data points = 20s per step
  });

  it('returns a minimum step of 1s even for short ranges or high data points', () => {
    // Mock a short range
    (sceneGraph.getTimeRange as jest.Mock).mockReturnValue({
      state: { value: { from: { unix: () => 0 }, to: { unix: () => 30 } } },
    });

    expect(getStepForTimeRange(mockScene, 100)).toBe('1s'); // 30s / 100 data points rounds to 1s
  });

  it('handles large time ranges correctly', () => {
    // Mock a very large range (e.g., 2 days)
    (sceneGraph.getTimeRange as jest.Mock).mockReturnValue({
      state: { value: { from: { unix: () => 0 }, to: { unix: () => 172800 } } },
    });

    expect(getStepForTimeRange(mockScene, 100)).toBe('1728s'); // 2 days (172800 seconds) / 100 data points
  });
});
