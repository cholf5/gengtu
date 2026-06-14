import { useEffect } from 'react';

/**
 * Bind Ctrl/Cmd-Z (undo), Ctrl/Cmd-Shift-Z (redo) and Ctrl-Y (redo) to the
 * supplied callbacks for as long as the host component is mounted.
 *
 * Mirrors `MemeEditor`'s existing Delete handler: keystrokes inside an input,
 * textarea, or contentEditable target pass through untouched, so the browser's
 * native input-level undo keeps working while the user is typing.
 *
 * `canUndo` / `canRedo` gate `preventDefault()` — when our stacks are empty we
 * leave the event alone, which lets the browser fall back to whatever default
 * it would do (usually nothing useful here, but it's the polite choice).
 */
export function useUndoKeyboard(
  undo: () => void,
  redo: () => void,
  canUndo: boolean,
  canRedo: boolean,
) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }

      const mod = event.ctrlKey || event.metaKey;
      if (!mod) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        if (!canUndo) {
          return;
        }
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        if (!canRedo) {
          return;
        }
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [undo, redo, canUndo, canRedo]);
}
