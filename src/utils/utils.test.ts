import { isDefined, isUserSelection } from './utils';
import { stubUplot } from './testUtils';

describe('isDefined', () => {
  it('should return true for non-null and non-undefined values', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined({})).toBe(true);
  });

  it('should return false for null and undefined values', () => {
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });
});

describe('isUserSelection', () => {
  it('should return true when a real user performs a x-drag with a mouse event and a selection', () => {
    const u = stubUplot({ event: new MouseEvent('mousedown'), dragX: true, left: 10, width: 50 });
    expect(isUserSelection(u)).toBe(true);
  });

  it('should return true even when the selection is anchored at 0 (not null)', () => {
    const u = stubUplot({ event: new MouseEvent('mousedown'), dragX: true, left: 0, width: 0 });
    expect(isUserSelection(u)).toBe(true);
  });

  it('should return false for a programmatic event', () => {
    const u = stubUplot({ event: null, dragX: true, left: 10, width: 50 });
    expect(isUserSelection(u)).toBe(false);
  });

  it('should return false when the cursor event is not a MouseEvent', () => {
    const u = stubUplot({ event: new Event('foo'), dragX: true, left: 10, width: 50 });
    expect(isUserSelection(u)).toBe(false);
  });

  it('should return false when x-dragging is disabled', () => {
    const u = stubUplot({ event: new MouseEvent('mousedown'), dragX: false, left: 10, width: 50 });
    expect(isUserSelection(u)).toBe(false);
  });

  it('should return false when there is no left selection', () => {
    const u = stubUplot({ event: new MouseEvent('mousedown'), dragX: true, left: null, width: 50 });
    expect(isUserSelection(u)).toBe(false);
  });

  it('should return false when there is no width', () => {
    const u = stubUplot({ event: new MouseEvent('mousedown'), dragX: true, left: 10, width: null });
    expect(isUserSelection(u)).toBe(false);
  });

  it('should return false when the cursor is absent', () => {
    const u = stubUplot({ cursor: false, left: 10, width: 50 });
    expect(isUserSelection(u)).toBe(false);
  });
});
