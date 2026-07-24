"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

/**
 * Central keyboard-focus registry for forms that want broker-terminal-style
 * navigation: Enter / Tab advances to the next field, the parent form owns the
 * source-of-truth for field order (which can be conditional on form state).
 *
 * Usage:
 *   const order = useMemo(() => [...], [tradeData]);
 *   <KeyboardFormProvider order={order}>
 *     <Input id="entryPrice" ... />
 *     <Input id="stoploss" ... />
 *   </KeyboardFormProvider>
 *
 * Each input calls useKeyboardField(id, opts) and spreads the returned ref +
 * onKeyDown handler. The hook handles Enter / Tab / Esc and (for "horizontal"
 * fields) Left / Right.
 */

type FieldId = string;

interface KeyboardFormCtx {
  registerField: (id: FieldId, el: HTMLElement | null) => void;
  focusNext: (currentId: FieldId) => void;
  focusPrev: (currentId: FieldId) => void;
  focusField: (id: FieldId) => void;
  isLast: (id: FieldId) => boolean;
}

const Ctx = createContext<KeyboardFormCtx | null>(null);

export function KeyboardFormProvider({
  order,
  children,
}: {
  order: readonly FieldId[];
  children: React.ReactNode;
}) {
  const refs = useRef<Map<FieldId, HTMLElement>>(new Map());
  const orderRef = useRef<readonly FieldId[]>(order);
  orderRef.current = order;

  const registerField = useCallback((id: FieldId, el: HTMLElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  }, []);

  const focusField = useCallback((id: FieldId) => {
    const el = refs.current.get(id);
    if (el) {
      el.focus();
      // For inputs, also select all so the next keystroke replaces the value.
      if (
        el instanceof HTMLInputElement &&
        (el.type === "text" || el.type === "number" || el.type === "date" || el.type === "search")
      ) {
        try {
          el.select();
        } catch {
          /* some input types disallow select() */
        }
      }
    } else {
      // The field may have just appeared this render (conditional sub-fields).
      // Defer one microtask + one rAF and try again, then give up silently.
      queueMicrotask(() => {
        const retried = refs.current.get(id);
        if (retried) {
          retried.focus();
          return;
        }
        requestAnimationFrame(() => {
          refs.current.get(id)?.focus();
        });
      });
    }
  }, []);

  // Walks the static field order, skipping any registered element that is
  // currently `disabled`. Static layout means we don't need to wait for a
  // React commit before resolving the next field.
  const focusByOffset = useCallback(
    (currentId: FieldId, offset: number) => {
      const list = orderRef.current;
      let i = list.indexOf(currentId);
      if (i < 0) return;
      while (true) {
        i += offset;
        if (i < 0 || i >= list.length) return;
        const el = refs.current.get(list[i]);
        if (!el) continue;
        const disabled =
          (el as HTMLInputElement | HTMLButtonElement | HTMLSelectElement)
            .disabled === true;
        if (!disabled) {
          focusField(list[i]);
          return;
        }
      }
    },
    [focusField]
  );

  // Defer one tick so any pending React commit (which updates the DOM's
  // `disabled` attribute on conditional fields) lands before we resolve the
  // next field. Static order alone isn't enough — disabled state is still
  // React-driven and must be applied to the DOM before the focus walk.
  const focusNext = useCallback(
    (id: FieldId) => {
      setTimeout(() => focusByOffset(id, +1), 0);
    },
    [focusByOffset]
  );

  const focusPrev = useCallback(
    (id: FieldId) => {
      setTimeout(() => focusByOffset(id, -1), 0);
    },
    [focusByOffset]
  );

  const isLast = useCallback((id: FieldId) => {
    const list = orderRef.current;
    return list.indexOf(id) === list.length - 1;
  }, []);

  const value = useMemo<KeyboardFormCtx>(
    () => ({ registerField, focusNext, focusPrev, focusField, isLast }),
    [registerField, focusNext, focusPrev, focusField, isLast]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useKeyboardForm(): KeyboardFormCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Allow components to be used outside the provider — they degrade
    // gracefully to a no-op (Enter does nothing extra, native Tab still works).
    return NOOP_CTX;
  }
  return ctx;
}

const NOOP_CTX: KeyboardFormCtx = {
  registerField: () => {},
  focusNext: () => {},
  focusPrev: () => {},
  focusField: () => {},
  isLast: () => false,
};

interface UseKeyboardFieldOptions {
  /**
   * "input"      — text/number inputs. Enter → focusNext.
   * "dropdown"   — autocompletes / fixed-list pickers. Enter / Tab → focusNext;
   *                Esc → onEscape if provided. Up/Down/letter handling stays in
   *                the host component; the hook only owns the cross-field move.
   * "horizontal" — radio-pair / segmented toggle. Left/Right → onPrev/onNext
   *                callbacks (component owns the value cycling); Enter/Tab → focusNext.
   */
  type?: "input" | "dropdown" | "horizontal";
  /** Called when Esc is pressed on a "dropdown" field. */
  onEscape?: () => void;
  /** Called when Left arrow is pressed on a "horizontal" field. */
  onPrev?: () => void;
  /** Called when Right arrow is pressed on a "horizontal" field. */
  onNext?: () => void;
  /**
   * If true, Enter on this field will NOT advance focus (lets the host handle
   * it — e.g., autocompletes that need to commit a highlight first).
   * The host can call focusNext(id) explicitly after committing.
   */
  enterHandledByHost?: boolean;
}

/**
 * Per-field hook. Returns:
 * - `ref`: attach to the focusable DOM element. Auto-registers with the form.
 * - `onKeyDown`: spread on the element. Handles cross-field navigation.
 *
 * Components that already have their own onKeyDown (autocompletes) should
 * compose: call this hook, then in their own onKeyDown call the returned
 * onKeyDown for any keys they don't handle themselves.
 */
export function useKeyboardField(
  id: FieldId,
  opts: UseKeyboardFieldOptions = {}
) {
  const { focusNext, focusPrev, registerField } = useKeyboardForm();
  const { type = "input", onEscape, onPrev, onNext, enterHandledByHost } = opts;

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      registerField(id, el);
    },
    [id, registerField]
  );

  // Cleanup on unmount (when the field is conditionally hidden, e.g.
  // FnO sub-fields disappearing).
  useEffect(() => {
    return () => registerField(id, null);
  }, [id, registerField]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter") {
        if (!enterHandledByHost) {
          e.preventDefault();
          focusNext(id);
        }
        return;
      }
      // For plain `input` fields, route Tab / Shift+Tab through the static
      // FIELD_ORDER too — relying on native DOM Tab walk leaks past the
      // form's intended field sequence (e.g., Tab from the last target
      // input was overshooting Validity in the create-recommendation form).
      if (e.key === "Tab" && type === "input") {
        e.preventDefault();
        if (e.shiftKey) focusPrev(id);
        else focusNext(id);
        return;
      }
      if (e.key === "Escape" && type === "dropdown") {
        onEscape?.();
        return;
      }
      if (type === "horizontal") {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onPrev?.();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onNext?.();
        }
      }
    },
    [enterHandledByHost, focusNext, focusPrev, id, onEscape, onNext, onPrev, type]
  );

  return { ref: setRef, onKeyDown };
}
