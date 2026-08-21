import { useState } from "react";

type Props = {
  value: number;
  onCommit: (next: number) => void;
  label: string;
  min?: number;
  max?: number;
  /** Draws attention to a condition that has run out. */
  expired?: boolean;
};

/**
 * A small whole-number field.
 *
 * No arithmetic entry — that belongs to HP, where "-25" is what a person
 * means. Here a bare number is the only sensible input, and unparseable text
 * reverts instead of committing a zero.
 */
export default function NumberField({
  value,
  onCommit,
  label,
  min = 0,
  max = 999,
  expired = false,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft.trim(), 10);
    setDraft(null);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(max, Math.max(min, parsed));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      aria-label={label}
      title={label}
      value={draft ?? String(value)}
      className={[
        "w-9 shrink-0 rounded-md border px-1 py-1 text-center text-sm tabular-nums outline-none transition-colors",
        expired
          ? "border-red-400 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
          : "border-ink-200 bg-white text-ink-900 hover:border-ink-300 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-100 dark:hover:border-ink-700",
        "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500 dark:focus:ring-ink-500/30",
      ].join(" ")}
      onFocus={(event) => {
        setDraft(String(value));
        event.currentTarget.select();
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
    />
  );
}
