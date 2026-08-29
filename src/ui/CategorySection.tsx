import { type ReactNode, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { CATEGORY_NAME_MAX_LENGTH } from "@/core/categories";

export const droppableIdFor = (categoryId: string | null) =>
  `category:${categoryId ?? "none"}`;

export function categoryFromDroppableId(id: string): string | null | undefined {
  if (!id.startsWith("category:")) return undefined;
  const rest = id.slice("category:".length);
  return rest === "none" ? null : rest;
}

type Props = {
  categoryId: string | null;
  name: string;
  hidden: boolean;
  count: number;
  /** False for the ungrouped and Chosen sections, which have nothing to rename. */
  editable: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Chosen is styled apart: it is a working set, not a filing cabinet. */
  accent?: boolean;
  onRename: (next: string) => void;
  onToggleHidden: () => void;
  onDelete: () => void;
  emptyHint?: string;
  children: ReactNode;
};

/**
 * One category's heading and drop zone.
 *
 * The section itself is a drop target so an empty category still accepts a row,
 * and so dropping below the last row files it here rather than doing nothing.
 */
export default function CategorySection({
  categoryId,
  name,
  hidden,
  count,
  editable,
  collapsed,
  onToggleCollapsed,
  accent = false,
  onRename,
  onToggleHidden,
  onDelete,
  emptyHint = "Drag a record here.",
  children,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableIdFor(categoryId),
  });

  return (
    <section className="pb-1">
      <header className="flex items-center gap-1 px-1 pb-1 pt-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand section" : "Collapse section"}
          title={collapsed ? "Expand" : "Collapse"}
          className="flex size-5 shrink-0 items-center justify-center rounded text-ink-400 transition-colors hover:bg-ink-200 hover:text-ink-800 dark:text-ink-600 dark:hover:bg-ink-800 dark:hover:text-ink-100"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={collapsed ? "-rotate-90" : ""}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {editable ? (
          <NameField value={name} onCommit={onRename} />
        ) : (
          <h2
            className={[
              "truncate text-[11px] font-semibold uppercase tracking-wider",
              accent
                ? "text-amber-700 dark:text-amber-400"
                : "text-ink-500 dark:text-ink-400",
            ].join(" ")}
          >
            {name || "Untitled"}
          </h2>
        )}

        <span className="shrink-0 text-[11px] tabular-nums text-ink-400 dark:text-ink-600">
          {count}
        </span>

        <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />

        {editable && (
          <>
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
              label="Delete category — its records move to the ungrouped list"
              onClick={onDelete}
              danger
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </IconButton>
          </>
        )}
      </header>

      {!collapsed && (
        <div
          ref={setNodeRef}
          className={[
            "min-h-[2.25rem] rounded-lg transition-colors",
            isOver ? "bg-ink-200/50 dark:bg-ink-900/70" : "",
            accent
              ? "bg-amber-100/50 ring-1 ring-amber-300/60 dark:bg-amber-950/20 dark:ring-amber-800/50"
              : "",
          ].join(" ")}
        >
          {count === 0 ? (
            <p className="px-2 py-2 text-xs text-ink-400 dark:text-ink-600">
              {emptyHint}
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
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
        "min-w-0 max-w-[9rem] flex-none truncate rounded border border-transparent bg-transparent",
        "px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider outline-none transition-colors",
        "text-ink-500 dark:text-ink-400",
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
