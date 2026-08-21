import { useState } from "react";
import { newRoll, withEntry, withoutEntry } from "@/core/entries";
import { ENTRY_NAME_MAX_LENGTH, ROLL_TEXT_MAX_LENGTH } from "@/core/metadata";
import type { RollEntry } from "@/core/types";
import { RemoveButton, SectionHeading } from "./EntryControls";

type Props = {
  rolls: RollEntry[];
  error: string | null;
  onChange: (next: RollEntry[]) => void;
  onRoll: (entry: RollEntry) => void;
};

/**
 * Saved dice, one row each: a name, an expression, and a button.
 *
 * The label is what identifies the roll in the log, which is why the old
 * free-form note is gone — a note that had to be retyped before every roll was
 * doing the same job worse.
 */
export default function RollList({ rolls, error, onChange, onRoll }: Props) {
  return (
    <section>
      <SectionHeading
        title="Rolls"
        addLabel="Add a roll"
        onAdd={() => onChange([...rolls, newRoll()])}
      />

      {rolls.length === 0 ? (
        <p className="py-1 text-xs text-ink-400 dark:text-ink-600">None.</p>
      ) : (
        <ul className="space-y-1">
          {rolls.map((entry) => (
            <li key={entry.id} className="flex items-center gap-1">
              <TextInput
                value={entry.label}
                placeholder="Label"
                maxLength={ENTRY_NAME_MAX_LENGTH}
                className="w-[5.5rem] shrink-0"
                onCommit={(label) =>
                  onChange(withEntry(rolls, entry.id, { label }))
                }
              />
              <TextInput
                value={entry.expression}
                placeholder="1d20 + 3"
                maxLength={ROLL_TEXT_MAX_LENGTH}
                className="min-w-0 flex-1 font-mono"
                invalid={error !== null}
                onEnter={(expression) => onRoll({ ...entry, expression })}
                onCommit={(expression) =>
                  onChange(withEntry(rolls, entry.id, { expression }))
                }
              />
              <button
                type="button"
                onClick={() => onRoll(entry)}
                aria-label={`Roll ${entry.label || entry.expression}`}
                title="Roll"
                className={[
                  "shrink-0 rounded px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                  "bg-ink-200 text-ink-700 transition-colors hover:bg-ink-300 hover:text-ink-900",
                  "dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700 dark:hover:text-ink-50",
                ].join(" ")}
              >
                Roll
              </button>
              <RemoveButton
                label={`Remove ${entry.label || "roll"}`}
                onClick={() => onChange(withoutEntry(rolls, entry.id))}
              />
            </li>
          ))}
        </ul>
      )}

      {error !== null && (
        <p className="pt-1 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}

function TextInput({
  value,
  placeholder,
  maxLength,
  className,
  invalid = false,
  onCommit,
  onEnter,
}: {
  value: string;
  placeholder: string;
  maxLength: number;
  className: string;
  invalid?: boolean;
  onCommit: (next: string) => void;
  onEnter?: (next: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const next = draft.slice(0, maxLength);
    setDraft(null);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="text"
      autoComplete="off"
      spellCheck={false}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={placeholder}
      value={draft ?? value}
      className={[
        className,
        "rounded-md border px-1.5 py-1 text-sm outline-none transition-colors",
        "placeholder:font-sans placeholder:text-ink-300 dark:placeholder:text-ink-700",
        invalid
          ? "border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
          : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-950 dark:hover:border-ink-700",
        "text-ink-900 dark:text-ink-100",
        "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500 dark:focus:ring-ink-500/30",
      ].join(" ")}
      onFocus={() => setDraft(value)}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter" && onEnter !== undefined) {
          event.preventDefault();
          const next = (draft ?? value).slice(0, maxLength);
          if (next !== value) onCommit(next);
          setDraft(null);
          onEnter(next);
          return;
        }
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
