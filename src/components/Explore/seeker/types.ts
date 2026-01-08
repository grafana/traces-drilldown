import { AbsoluteTimeRange, FieldConfigSource, PanelData } from '@grafana/data';
import { MetricFunction } from 'utils/shared';

export type SeriesSize = 'sm' | 'md' | 'lg';

export interface SimpleOptions {
  text: string;
  showSeriesCount: boolean;
  seriesCountSize: SeriesSize;
}

export interface TimeSeekerProps {
  data: PanelData;
  width: number;
  id?: number;
  fieldConfig?: FieldConfigSource;
  metric?: MetricFunction;
  initialVisibleRange?: AbsoluteTimeRange;
  onChangeTimeRange: (range: AbsoluteTimeRange) => void;
  onVisibleRangeChange?: (range: AbsoluteTimeRange) => void;
  loadingRanges?: Array<{ from: number; to: number }>;
  hasLargeBatchWarning?: boolean;
}

export interface DragStyles {
  dragOverlayStyle?: React.CSSProperties;
  leftHandleStyle?: React.CSSProperties;
  rightHandleStyle?: React.CSSProperties;
}
