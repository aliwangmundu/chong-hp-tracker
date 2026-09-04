import { type ReactNode, useState } from "react";
import { CATEGORY_NAME_MAX_LENGTH } from "@/core/categories";

type Props = {
  name: string;
  hidden: boolean;
  onRename: (next: string) => void;
  onToggleHidden: () => void;
  onDelete: () => void;
};

/**
 * Rename, hide, delete — for whichever category tab is open.
 *
 * These used to hang off each section heading, which meant every category paid
 * for them whether or not you were looking at it. One tab is open at a time
 * now, so one row of controls is enough, and it sits under the strip where the
 * heading used to be.
 */
export default function CategoryBar({
  name,
  hidden,
  onRename,
  onToggleHidden,
  onDelete,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1 px-2 pt-1.5">
      <NameField value={name} onCommit={onRename} />

      <IconButton
        label={
          hidden
            ? "Hidden from players. Click to reveal."
            : "Visible to players. Click to hide."
        }
        active={hidden}
        onClick={onToggleHidden}
      >
        {hidden ? (
          <>
            <path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.6 3.6M6.6 6.6A18 18 0 0 0 2 12s3.6 7 10 7a10.6 10.6 0 0 0 5.4-1.4" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            <path d="m2 2 20 20" />
          </>
        ) : (
          <>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </IconButton>

      <IconButton
        label="Delete category — its records move to Ungrouped"
        onClick={onDelete}
        danger
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </IconButton>
    </div>
  );
}

function NameField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const next = draft.trim().slice(0, CATEGORY_NAME_MAX_LENGTH);
    setDraft(null);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="text"
      autoComplete="off"
      spellCheck={false}
      maxLength={CATEGORY_NAME_MAX_LENGTH}
      placeholder="Untitled"
      aria-label="Category name"
      value={draft ?? value}
      className={[
        "min-w-0 flex-1 truncate rounded border border-transparent bg-transparent",
        "px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider outline-none",
        "transition-colors text-ink-500 dark:text-ink-400",
        "placeholder:text-ink-400 dark:placeholder:text-ink-600",
        "hover:border-ink-200 dark:hover:border-ink-800",
        "focus:border-ink-400 focus:bg-white dark:focus:border-ink-500 dark:focus:bg-ink-950",
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

function IconButton({
  label,
  onClick,
  active = false,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={[
        "flex size-5 shrink-0 items-center justify-center rounded transition-colors",
        danger
          ? "text-ink-300 hover:bg-red-100 hover:text-red-700 dark:text-ink-700 dark:hover:bg-red-950 dark:hover:text-red-300"
          : active
            ? "bg-ink-200 text-ink-700 dark:bg-ink-800 dark:text-ink-200"
            : "text-ink-400 hover:bg-ink-200 hover:text-ink-800 dark:text-ink-600 dark:hover:bg-ink-800 dark:hover:text-ink-100",
      ].join(" ")}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}
