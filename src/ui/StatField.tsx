import { useEffect, useRef, useState } from "react";
import { evaluateStatInput } from "@/core/inlineMath";

type Props = {
  value: number;
  onCommit: (next: number) => void;
  label: string;
  /** Overrides the tooltip that is otherwise built from `label`. */
  title?: string;
  /** Tailwind width class; the HP field is wider than AC. */
  widthClass?: string;
  /** Taller with a larger typeface — used for HP, the field you actually type in. */
  big?: boolean;
  /**
   * Arithmetic entry. Off for the secondary stats, where a bare number is the
   * only sensible input and "+5" almost certainly means a typo.
   */
  allowMath?: boolean;
  disabled?: boolean;
};

const ERROR_FLASH_MS = 700;

/**
 * A stat input you can do arithmetic in.
 *
 * Focusing puts the caret after the current number so you can type "-25"
 * straight away. While the draft is an expression, the resolved value is
 * previewed above the field. Enter commits, Escape reverts, and an expression
 * that will not parse flashes rather than committing a wrong number.
 */
export default function StatField({
  value,
  onCommit,
  label,
  title,
  widthClass = "w-14",
  big = false,
  allowMath = true,
  disabled = false,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  const errorTimer = useRef<number>();

  useEffect(() => {
    return () => {
      if (errorTimer.current !== undefined) {
        window.clearTimeout(errorTimer.current);
      }
    };
  }, []);

  const flashError = () => {
    setErrored(true);
    if (errorTimer.current !== undefined) {
      window.clearTimeout(errorTimer.current);
    }
    errorTimer.current = window.setTimeout(
      () => setErrored(false),
      ERROR_FLASH_MS,
    );
  };

  const editing = draft !== null;
  const shown = editing ? draft : String(value);

  // Only preview when the draft is doing something a plain number would not.
  const preview = (() => {
    if (!allowMath) return null;
    if (draft === null) return null;
    const trimmed = draft.trim();
    if (trimmed === "" || /^\d+$/.test(trimmed)) return null;
    const result = evaluateStatInput(trimmed, value);
    return result.ok ? result.value : null;
  })();

  const commit = () => {
    if (draft === null) return;

    if (!allowMath) {
      const parsed = Number.parseInt(draft.trim(), 10);
      setDraft(null);
      if (!Number.isFinite(parsed)) {
        flashError();
        return;
      }
      if (parsed !== value) onCommit(parsed);
      return;
    }

    const result = evaluateStatInput(draft, value);
    setDraft(null);
    if (!result.ok) {
      // An unparseable entry must never become 0 — that is how a boss loses
      // its HP to a stray keystroke.
      flashError();
      return;
    }
    if (result.value !== value) onCommit(result.value);
  };

  return (
    <div className="relative">
      {preview !== null && (
        <div className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-ink-50 shadow-md dark:bg-ink-100 dark:text-ink-950">
          = {preview}
        </div>
      )}
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        aria-label={label}
        title={
          title ?? (allowMath ? `${label} — type -25, +8 or -25 + 8` : label)
        }
        disabled={disabled}
        value={shown}
        className={[
          widthClass,
          big ? "px-2 py-2 text-base font-medium" : "px-1.5 py-1 text-sm",
          "no-spinner rounded-md border text-center tabular-nums outline-none transition-colors",
          "border-ink-200 bg-white text-ink-900 hover:border-ink-300",
          "dark:border-ink-800 dark:bg-ink-950 dark:text-ink-100 dark:hover:border-ink-700",
          "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500 dark:focus:ring-ink-500/30",
          "disabled:opacity-50",
          errored
            ? "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/40"
            : "",
        ].join(" ")}
        onFocus={(event) => {
          setDraft(String(value));
          const input = event.currentTarget;
          // Caret to the end so the next keystroke appends to the number.
          requestAnimationFrame(() => {
            const end = input.value.length;
            input.setSelectionRange(end, end);
          });
        }}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
        // A drag started inside the field should edit text, not move the row.
        onPointerDown={(event) => event.stopPropagation()}
      />
    </div>
  );
}
