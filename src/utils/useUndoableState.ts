import { useCallback, useRef, useState } from 'react';

/**
 * Drop-in replacement for `useState` that records a snapshot stack so callers
 * can `undo` / `redo` semantic edits. The `setState` signature mirrors
 * `useState`'s (value or updater fn) and accepts an optional second argument
 * that controls coalescing of consecutive same-kind edits.
 *
 * Coalescing rule (see design doc § 3): a new `setState` call that supplies a
 * `coalesceKey` matching the top entry's key AND lands within `windowMs` of
 * that entry's timestamp updates `present` *without* pushing a new history
 * entry — this is how a continuous drag or a rapid stream of typed characters
 * collapses into a single undo step.
 *
 * Important: history pushes the *previous* present (the value being replaced),
 * not the new one. That keeps `undo()` symmetric — pop past → present, push
 * old present → future — and lets us treat the most recent value as the
 * implicit head of the history.
 */

export interface UndoableOptions {
  /** Maximum number of entries kept in the past stack. Oldest are dropped. */
  limit?: number;
  /** Time window (ms) within which two edits sharing a coalesce key merge. */
  windowMs?: number;
  /** Injection point for tests; defaults to `Date.now`. */
  now?: () => number;
}

export interface CoalesceOptions {
  /**
   * When provided, an edit may merge with the previous edit if the previous
   * edit had the same key and occurred within the time window. Treat it as a
   * stable identifier for "the kind of micro-adjustment in progress" — e.g.
   * `text:${fieldId}` for typing, `drag:${fieldId}` for dragging.
   */
  coalesceKey: string;
}

interface Entry<T> {
  snapshot: T;
  coalesceKey: string | null;
  ts: number;
}

interface History<T> {
  past: Entry<T>[];
  present: T;
  future: Entry<T>[];
  /** Coalesce key of the head, or null if the head is a discrete edit. */
  headKey: string | null;
  /** Timestamp of the head; used to decide whether the next edit can merge. */
  headTs: number;
}

type Updater<T> = T | ((prev: T) => T);

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_MS = 500;

function isUpdaterFn<T>(value: Updater<T>): value is (prev: T) => T {
  return typeof value === 'function';
}

function applyUpdater<T>(updater: Updater<T>, prev: T): T {
  return isUpdaterFn(updater) ? updater(prev) : updater;
}

export interface UseUndoableState<T> {
  state: T;
  setState: (updater: Updater<T>, coalesce?: CoalesceOptions) => void;
  undo: () => void;
  redo: () => void;
  /** Replace the present and clear both stacks. Used on context switch. */
  reset: (next: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoableState<T>(
  initial: T | (() => T),
  options: UndoableOptions = {},
): UseUndoableState<T> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = options.now ?? Date.now;

  // Keep `now` and `windowMs` / `limit` accessible from stable callbacks
  // without having to thread them through closures.
  const nowRef = useRef(now);
  nowRef.current = now;
  const windowMsRef = useRef(windowMs);
  windowMsRef.current = windowMs;
  const limitRef = useRef(limit);
  limitRef.current = limit;

  const [history, setHistory] = useState<History<T>>(() => ({
    past: [],
    present: typeof initial === 'function' ? (initial as () => T)() : initial,
    future: [],
    headKey: null,
    headTs: 0,
  }));

  const setState = useCallback((updater: Updater<T>, coalesce?: CoalesceOptions) => {
    setHistory((current) => {
      const next = applyUpdater(updater, current.present);
      // Reference-equal updates are no-ops — don't muddy the stack with them.
      if (Object.is(next, current.present)) {
        return current;
      }

      const ts = nowRef.current();
      const canMerge =
        !!coalesce &&
        current.headKey !== null &&
        current.headKey === coalesce.coalesceKey &&
        ts - current.headTs < windowMsRef.current;

      if (canMerge) {
        // Merge into the head: keep `past` untouched, just slide `present`
        // forward and refresh the timestamp so the merge window keeps rolling
        // for the next keystroke / drag tick.
        return {
          past: current.past,
          present: next,
          future: [],
          headKey: coalesce!.coalesceKey,
          headTs: ts,
        };
      }

      // Discrete edit: push the *old* present onto past and drop the redo stack.
      const entry: Entry<T> = {
        snapshot: current.present,
        coalesceKey: current.headKey,
        ts: current.headTs,
      };
      const past = current.past.length >= limitRef.current
        ? [...current.past.slice(current.past.length - limitRef.current + 1), entry]
        : [...current.past, entry];

      return {
        past,
        present: next,
        future: [],
        headKey: coalesce ? coalesce.coalesceKey : null,
        headTs: ts,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) {
        return current;
      }
      const previous = current.past[current.past.length - 1];
      const past = current.past.slice(0, -1);
      // Snapshot the current head into future so redo restores it verbatim.
      const headEntry: Entry<T> = {
        snapshot: current.present,
        coalesceKey: current.headKey,
        ts: current.headTs,
      };
      // Open a fresh merge window — the next setState (even with a matching
      // coalesceKey) must produce a new past entry, otherwise it would silently
      // overwrite the value we just restored. See review doc § #4.
      return {
        past,
        present: previous.snapshot,
        future: [...current.future, headEntry],
        headKey: null,
        headTs: nowRef.current(),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) {
        return current;
      }
      const next = current.future[current.future.length - 1];
      const future = current.future.slice(0, -1);
      const headEntry: Entry<T> = {
        snapshot: current.present,
        coalesceKey: current.headKey,
        ts: current.headTs,
      };
      // Same fresh-window invariant as undo (see above).
      return {
        past: [...current.past, headEntry],
        present: next.snapshot,
        future,
        headKey: null,
        headTs: nowRef.current(),
      };
    });
  }, []);

  const reset = useCallback((nextValue: T) => {
    setHistory({
      past: [],
      present: nextValue,
      future: [],
      headKey: null,
      headTs: 0,
    });
  }, []);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
