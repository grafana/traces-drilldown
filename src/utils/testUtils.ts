import type uPlot from 'uplot';

interface FakeUplotOptions {
  event?: unknown;
  dragX?: boolean;
  left?: number | null;
  width?: number | null;
  cursor?: boolean;
}

export function stubUplot({ event, dragX, left, width, cursor = true }: FakeUplotOptions): uPlot {
  return {
    cursor: cursor ? { event, drag: { x: dragX } } : undefined,
    select: { left, width },
    posToVal: (px: number, _scaleKey: string, _canvasPixels?: boolean) => px,
  } as unknown as uPlot;
}
