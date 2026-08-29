import { useState } from "react";
import { ENTRY_NAME_MAX_LENGTH } from "@/core/entries";

/** Shared bits of the condition and resource rows. */

export function EntryName({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const next = draft.trim().slice(0, ENTRY_NAME_MAX_LENGTH);
    setDraft(null);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="text"
      autoComplete="off"
      spellCheck={false}
      maxLength={ENTRY_NAME_MAX_LENGTH}
      placeholder={placeholder}
      aria-label={placeholder}
      value={draft ?? value}
      className={[
        "min-w-0 flex-1 rounded-md border px-1.5 py-1 text-sm outline-none transition-colors",
        "border-ink-200 bg-white text-ink-900 hover:border-ink-300",
        "placeholder:text-ink-300 dark:placeholder:text-ink-700",
        "dark:border-ink-800 dark:bg-ink-950 dark:text-ink-100 dark:hover:border-ink-700",
        "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500 dark:focus:ring-ink-500/30",
      ].join(" ")}
      onFocus={() => setDraft(value)}
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

export function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "flex size-5 shrink-0 items-center justify-center rounded",
        "text-ink-300 transition-colors hover:bg-red-100 hover:text-red-700",
        "dark:text-ink-700 dark:hover:bg-red-950 dark:hover:text-red-300",
      ].join(" ")}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

export function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "flex size-5 shrink-0 items-center justify-center rounded",
        "text-ink-400 transition-colors hover:bg-ink-200 hover:text-ink-900",
        "dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-50",
      ].join(" ")}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

export function SectionHeading({
  title,
  onAdd,
  addLabel,
}: {
  title: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-1 pt-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
        {title}
      </h3>
      <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
      <AddButton label={addLabel} onClick={onAdd} />
    </div>
  );
}
