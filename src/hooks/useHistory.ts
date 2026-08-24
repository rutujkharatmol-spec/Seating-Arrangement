import { useCallback, useMemo, useState } from 'react';

/**
 * Undo / redo history for a single state object.
 *
 * Every change goes through `commit`, which records a human-readable label so
 * the Undo button can say *what* it is about to undo ("Undo: Block 12 seats").
 */

const MAX_HISTORY = 60;

interface Entry<T> {
  state: T;
  label: string;
}

interface Hist<T> {
  past: Entry<T>[];
  present: Entry<T>;
  future: Entry<T>[];
}

export interface HistoryApi<T> {
  present: T;
  canUndo: boolean;
  canRedo: boolean;
  /** Label of the change that Undo would roll back. */
  undoLabel: string | null;
  /** Label of the change that Redo would re-apply. */
  redoLabel: string | null;
  /** Apply a change and push it onto the undo stack. */
  commit: (updater: (current: T) => T, label: string) => void;
  /** Replace everything and clear history (load / reset / import). */
  reset: (next: T, label: string) => void;
  undo: () => void;
  redo: () => void;
}

export function useHistory<T>(initial: T | (() => T)): HistoryApi<T> {
  const [hist, setHist] = useState<Hist<T>>(() => ({
    past: [],
    present: {
      state: typeof initial === 'function' ? (initial as () => T)() : initial,
      label: 'Opened plan',
    },
    future: [],
  }));

  const commit = useCallback((updater: (current: T) => T, label: string) => {
    setHist((h) => {
      const next = updater(h.present.state);
      if (next === h.present.state) return h;
      return {
        past: [...h.past, h.present].slice(-MAX_HISTORY),
        present: { state: next, label },
        future: [],
      };
    });
  }, []);

  const reset = useCallback((next: T, label: string) => {
    setHist({ past: [], present: { state: next, label }, future: [] });
  }, []);

  const undo = useCallback(() => {
    setHist((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future].slice(0, MAX_HISTORY),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHist((h) => {
      if (h.future.length === 0) return h;
      const [next, ...rest] = h.future;
      return {
        past: [...h.past, h.present].slice(-MAX_HISTORY),
        present: next,
        future: rest,
      };
    });
  }, []);

  return useMemo(
    () => ({
      present: hist.present.state,
      canUndo: hist.past.length > 0,
      canRedo: hist.future.length > 0,
      // Undoing rolls back the change that produced the current state.
      undoLabel: hist.past.length > 0 ? hist.present.label : null,
      redoLabel: hist.future.length > 0 ? hist.future[0].label : null,
      commit,
      reset,
      undo,
      redo,
    }),
    [hist, commit, reset, undo, redo]
  );
}
