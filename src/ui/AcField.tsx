import { useState } from "react";
import { AC_MAX_LENGTH, normalizeAc } from "@/core/ac";

type Props = {
  value: string;
  onCommit: (next: string) => void;
  label: string;
  widthClass?: string;
  /** Overrides the hover text; the label is used when omitted. */
  title?: string;
};

/**
 * Armour class as free text.
 *
 * Not every table writes a number here — "M" for a monster's melee AC, "?" for
 * something the party has not worked out yet — so this is a plain three-character
 * text field rather than the arithmetic input HP uses.
 */
export default function AcField({
  value,
  onCommit,
  label,
  widthClass = "w-12",
  title,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;

  const commit = () => {
    if (draft === null) return;
    const next = normalizeAc(draft);
    setDraft(null);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="text"
      autoComplete="off"
      spellCheck={false}
      maxLength={AC_MAX_LENGTH}
      aria-label={label}
      title={title ?? label}
      value={shown}
      className={[
        widthClass,
        "rounded-md border px-1 py-1 text-center text-sm outline-none transition-colors",
        "border-ink-200 bg-white text-ink-900 hover:border-ink-300",
        "dark:border-ink-800 dark:bg-ink-950 dark:text-ink-100 dark:hover:border-ink-700",
        "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500 dark:focus:ring-ink-500/30",
      ].join(" ")}
      onFocus={(event) => {
        setDraft(value);
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
      onPointerDown={(event) => event.stopPropagation()}
    />
  );
}
