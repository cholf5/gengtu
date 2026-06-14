// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useUndoableState } from './useUndoableState';

/**
 * Drive `now` by hand so coalesce-window assertions are deterministic. We
 * mutate the same `clock` object across renders — the hook reads it via the
 * `now` callback, so each call sees the latest value.
 */
function makeClock(initial = 0) {
  const clock = { t: initial };
  return {
    clock,
    now: () => clock.t,
    advance: (ms: number) => {
      clock.t += ms;
    },
  };
}

describe('useUndoableState', () => {
  it('initialises with empty stacks and the given value', () => {
    const { result } = renderHook(() => useUndoableState(0));
    expect(result.current.state).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('accepts a lazy initialiser', () => {
    const { result } = renderHook(() => useUndoableState(() => 42));
    expect(result.current.state).toBe(42);
  });

  it('undo restores the previous value after a single edit', () => {
    const { result } = renderHook(() => useUndoableState(0));
    act(() => result.current.setState(1));
    expect(result.current.state).toBe(1);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.state).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo replays the undone edit', () => {
    const { result } = renderHook(() => useUndoableState(0));
    act(() => result.current.setState(1));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.state).toBe(1);
    expect(result.current.canRedo).toBe(false);
  });

  it('drops the future stack after a fresh edit', () => {
    const { result } = renderHook(() => useUndoableState(0));
    act(() => result.current.setState(1));
    act(() => result.current.undo()); // state = 0, future has 1
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.setState(2));
    expect(result.current.canRedo).toBe(false);
    expect(result.current.state).toBe(2);
  });

  it('coalesces edits that share a key within the time window', () => {
    const { now, advance } = makeClock();
    const { result } = renderHook(() => useUndoableState(0, { now, windowMs: 500 }));

    act(() => result.current.setState(1, { coalesceKey: 'text:a' }));
    advance(100);
    act(() => result.current.setState(2, { coalesceKey: 'text:a' }));
    advance(100);
    act(() => result.current.setState(3, { coalesceKey: 'text:a' }));

    expect(result.current.state).toBe(3);
    act(() => result.current.undo());
    // All three coalesced into one step → undo lands on the initial value.
    expect(result.current.state).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('does not coalesce once the window has elapsed', () => {
    const { now, advance } = makeClock();
    const { result } = renderHook(() => useUndoableState(0, { now, windowMs: 500 }));

    act(() => result.current.setState(1, { coalesceKey: 'text:a' }));
    advance(600); // outside the window
    act(() => result.current.setState(2, { coalesceKey: 'text:a' }));

    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    act(() => result.current.undo());
    expect(result.current.state).toBe(0);
  });

  it('treats different coalesce keys as separate steps', () => {
    const { now } = makeClock();
    const { result } = renderHook(() => useUndoableState(0, { now, windowMs: 500 }));

    // Same instant, different keys — must still produce two steps.
    act(() => result.current.setState(1, { coalesceKey: 'text:a' }));
    act(() => result.current.setState(2, { coalesceKey: 'drag:a' }));

    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    act(() => result.current.undo());
    expect(result.current.state).toBe(0);
  });

  it('never coalesces edits without a key, even back-to-back', () => {
    const { now } = makeClock();
    const { result } = renderHook(() => useUndoableState(0, { now }));

    act(() => result.current.setState(1));
    act(() => result.current.setState(2));
    act(() => result.current.setState(3));

    act(() => result.current.undo());
    expect(result.current.state).toBe(2);
    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    act(() => result.current.undo());
    expect(result.current.state).toBe(0);
  });

  it('skips reference-equal updates', () => {
    const value = { x: 1 };
    const { result } = renderHook(() => useUndoableState(value));
    act(() => result.current.setState(value)); // same reference
    expect(result.current.canUndo).toBe(false);
  });

  it('drops the oldest entries when the limit is exceeded', () => {
    const { result } = renderHook(() => useUndoableState(0, { limit: 3 }));

    // 4 edits → past should retain only the 3 most recent prior values.
    act(() => result.current.setState(1));
    act(() => result.current.setState(2));
    act(() => result.current.setState(3));
    act(() => result.current.setState(4));

    expect(result.current.state).toBe(4);
    // Undo three times, verifying each landing — limit=3 means we can recover
    // through 3, 2, 1 but the earliest pre-edit (0) was dropped.
    act(() => result.current.undo());
    expect(result.current.state).toBe(3);
    act(() => result.current.undo());
    expect(result.current.state).toBe(2);
    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    expect(result.current.canUndo).toBe(false);
  });

  it('reset clears both stacks and replaces present', () => {
    const { result } = renderHook(() => useUndoableState(0));
    act(() => result.current.setState(1));
    act(() => result.current.setState(2));
    act(() => result.current.undo()); // future has an entry now

    act(() => result.current.reset(99));
    expect(result.current.state).toBe(99);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('supports updater functions and reads the latest present', () => {
    const { result } = renderHook(() => useUndoableState(10));
    act(() => result.current.setState((prev) => prev + 5));
    act(() => result.current.setState((prev) => prev * 2));
    expect(result.current.state).toBe(30);
    act(() => result.current.undo());
    expect(result.current.state).toBe(15);
  });

  it('undo after a coalesced run lands on the value before the run', () => {
    const { now, advance } = makeClock();
    const { result } = renderHook(() => useUndoableState('a', { now, windowMs: 500 }));

    // Discrete edit first, then a coalesced run on top of it.
    act(() => result.current.setState('b'));
    advance(50);
    act(() => result.current.setState('b1', { coalesceKey: 'k' }));
    advance(50);
    act(() => result.current.setState('b2', { coalesceKey: 'k' }));

    act(() => result.current.undo());
    expect(result.current.state).toBe('b'); // coalesced run undone in one step
    act(() => result.current.undo());
    expect(result.current.state).toBe('a'); // discrete edit undone
  });

  // Regression: undo/redo must open a fresh merge window. Otherwise the next
  // same-key setState within `windowMs` would coalesce *over* the restored
  // value and silently swallow a step. See review doc § #4.
  it('does not coalesce across an undo, even within the time window', () => {
    const { now, advance } = makeClock();
    const { result } = renderHook(() => useUndoableState(0, { now, windowMs: 500 }));

    act(() => result.current.setState(1, { coalesceKey: 'k' }));
    advance(10);
    act(() => result.current.setState(2)); // discrete edit on top
    advance(10);
    act(() => result.current.undo()); // present = 1
    advance(10); // still well inside the original 'k' window
    act(() => result.current.setState(3, { coalesceKey: 'k' }));

    // After the second undo we expect to land back on the value the user
    // restored (1), not skip past it to the initial value.
    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    act(() => result.current.undo());
    expect(result.current.state).toBe(0);
  });

  it('does not coalesce across a redo, even within the time window', () => {
    const { now, advance } = makeClock();
    const { result } = renderHook(() => useUndoableState(0, { now, windowMs: 500 }));

    act(() => result.current.setState(1, { coalesceKey: 'k' }));
    advance(10);
    act(() => result.current.setState(2));
    advance(10);
    act(() => result.current.undo()); // present = 1
    advance(10);
    act(() => result.current.redo()); // present = 2
    advance(10);
    act(() => result.current.setState(3, { coalesceKey: 'k' }));

    // After undo we should land on the redone value (2), not skip past it.
    act(() => result.current.undo());
    expect(result.current.state).toBe(2);
  });
});
