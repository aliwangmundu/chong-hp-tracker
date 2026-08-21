import { useState } from "react";
import { ROLL_TEXT_MAX_LENGTH } from "@/core/metadata";

type Props = {
  expression: string;
  note: string;
  error: string | null;
  onExpressionChange: (next: string) => void;
  onNoteChange: (next: string) => void;
  onRoll: (expression: string) => void;
};

/**
 * Dice entry.
 *
 * Both fields are stored on the token, so a character keeps its attack string
 * and its note between sessions. Enter rolls; the expression is deliberately
 * not cleared, because the same roll usually happens again next turn.
 */
export default function RollSection({
  expression,
  note,
  error,
  onExpressionChange,
  onNoteChange,
  onRoll,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? expression;

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    if (draft !== expression) onExpressionChange(draft);
  };

  return (
    <section>
      <div className="flex items-center gap-2 pb-1 pt-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          Rolling
        </h3>
        <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
      </div>

      <div className="flex items-center gap-1">
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={ROLL_TEXT_MAX_LENGTH}
          placeholder="1d20 + 3"
          aria-label="Dice expression"
          title="Type a roll and press Enter — 1d20 + 3, 2d6 + 1d4, (1d8 + 2) * 2"
          value={shown}
          className={[
            "min-w-0 flex-1 rounded-md border px-1.5 py-1 font-mono text-sm outline-none transition-colors",
            "placeholder:font-sans placeholder:text-ink-300 dark:placeholder:text-ink-700",
            error !== null
              ? "border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
              : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-950 dark:hover:border-ink-700",
            "text-ink-900 dark:text-ink-100",
            "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500 dark:focus:ring-ink-500/30",
          ].join(" ")}
          onFocus={() => setDraft(expression)}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const value = draft ?? expression;
              if (value !== expression) onExpressionChange(value);
              setDraft(null);
              onRoll(value);
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(null);
              event.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          onClick={() => onRoll(draft ?? expression)}
          aria-label="Roll"
          title="Roll"
          className={[
            "shrink-0 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider",
            "bg-ink-200 text-ink-700 transition-colors hover:bg-ink-300 hover:text-ink-900",
            "dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700 dark:hover:text-ink-50",
          ].join(" ")}
        >
          Roll
        </button>
      </div>

      {error !== null && (
        <p className="pt-1 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <input
        type="text"
        autoComplete="off"
        maxLength={ROLL_TEXT_MAX_LENGTH}
        placeholder="Note — labels the roll in the log"
        aria-label="Roll note"
        value={note}
        onChange={(event) => onNoteChange(event.currentTarget.value)}
        className={[
          "mt-1 w-full rounded-md border px-1.5 py-1 text-sm outline-none transition-colors",
          "border-ink-200 bg-white text-ink-900 hover:border-ink-300",
          "placeholder:text-ink-300 dark:placeholder:text-ink-700",
          "dark:border-ink-800 dark:bg-ink-950 dark:text-ink-100 dark:hover:border-ink-700",
          "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500 dark:focus:ring-ink-500/30",
        ].join(" ")}
      />
    </section>
  );
}
