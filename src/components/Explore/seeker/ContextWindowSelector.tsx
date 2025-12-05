import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, DatePickerWithInput, Stack, Field, Grid } from '@grafana/ui';
import { AbsoluteTimeRange, parseDuration, durationToMilliseconds, dateTime } from '@grafana/data';

interface Props {
  dashboardFrom: number;
  dashboardTo: number;
  now: number;
  visibleRange: AbsoluteTimeRange;
  setVisibleRange: (r: AbsoluteTimeRange) => void;
  setRelativeContextDuration?: (duration: string | null) => void;
  onClose: () => void;
}

const OPTIONS = [
  { label: 'Last 12 hours', value: '12h' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 3 days', value: '3d' },
  { label: 'Last 1 week', value: '7d' },
  { label: 'Last 2 weeks', value: '14d' },
  { label: 'Same as timepicker', value: '0h' },
];

export const ContextWindowSelector: React.FC<Props> = ({
  dashboardFrom,
  dashboardTo,
  now,
  visibleRange,
  setVisibleRange,
  setRelativeContextDuration,
  onClose,
}) => {
  const [fromText, setFromText] = useState<string>(dateTime(visibleRange.from).toISOString());
  const [toText, setToText] = useState<string>(dateTime(visibleRange.to).toISOString());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef, onClose]);

  const applyWindow = (newRange: AbsoluteTimeRange) => {
    setVisibleRange(newRange);
    onClose();
  };

  const applyExtraWindow = (duration: string) => {
    try {
      const extraWindow = durationToMilliseconds(parseDuration(duration));
      const newFrom = dashboardFrom - extraWindow;
      const newTo = Math.min(dashboardTo + extraWindow, now);
      applyWindow({ from: newFrom, to: newTo });
      if (setRelativeContextDuration) {
        setRelativeContextDuration(duration);
      }
    } catch (err) {
      console.error('Failed to parse duration', err);
    }
  };

  const applyAbsoluteRange = () => {
    try {
      const from = dateTime(fromText).valueOf();
      const to = dateTime(toText).valueOf();
      if (!isNaN(from) && !isNaN(to) && from < to) {
        applyWindow({ from, to });
        if (setRelativeContextDuration) {
          setRelativeContextDuration(null);
        }
      }
    } catch (err) {
      console.error('Failed to parse absolute range', err);
    }
  };

  return (
    <div ref={wrapperRef}>
      <Stack direction="column" gap={2}>
        <Grid columns={2} gap={0.5}>
          {OPTIONS.map((opt) => (
            <Button key={opt.value} variant="secondary" size="sm" onClick={() => applyExtraWindow(opt.value)}>
              {opt.label}
            </Button>
          ))}
        </Grid>
        <Stack direction="column" gap={1}>
          <Field label="From" noMargin>
            <Input
              value={fromText}
              onChange={(e) => setFromText(e.currentTarget.value)}
              addonAfter={
                <Button
                  tooltip="Select from date"
                  icon="calendar-alt"
                  variant="secondary"
                  onClick={() => setShowFromPicker(!showFromPicker)}
                />
              }
            />
          </Field>
          {showFromPicker && (
            <DatePickerWithInput
              value={fromText}
              onChange={(val) => setFromText(val instanceof Date ? val.toISOString() : val)}
            />
          )}

          <Field label="To" noMargin>
            <Input
              value={toText}
              onChange={(e) => setToText(e.currentTarget.value)}
              addonAfter={
                <Button
                  tooltip="Select to date"
                  icon="calendar-alt"
                  variant="secondary"
                  onClick={() => setShowToPicker(!showToPicker)}
                />
              }
            />
          </Field>
          {showToPicker && (
            <DatePickerWithInput
              value={toText}
              onChange={(val) => setToText(val instanceof Date ? val.toISOString() : val)}
            />
          )}

          <Button fullWidth size="sm" variant="primary" onClick={applyAbsoluteRange}>
            Apply Absolute Range
          </Button>
        </Stack>
      </Stack>
    </div>
  );
};
