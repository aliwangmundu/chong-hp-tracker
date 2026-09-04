import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";

/** The three tabs that are not categories. */
export const PLAYER_TAB = "player";
export const CHOSEN_TAB = "chosen";
export const UNGROUPED_TAB = "ungrouped";

export type TabKind = "player" | "chosen" | "ungrouped" | "category";

export type TabDef = {
  /** A category id, or one of the three constants above. */
  id: string;
  label: string;
  kind: TabKind;
  /** Category only: hidden from players. */
  hidden: boolean;
};

export const tabDroppableId = (id: string) => `tab:${id}`;

export function tabFromDroppableId(id: string): string | undefined {
  return id.startsWith("tab:") ? id.slice("tab:".length) : undefined;
}

type Props = {
  tabs: TabDef[];
  active: string;
  onSelect: (id: string) => void;
};

/**
 * One row of tabs, one list at a time.
 *
 * This replaced a stack of collapsible sections. With a dozen categories the
 * stack was mostly headings, and finding a record meant scrolling past groups
 * you were not using; a tab strip shows one group at full height and costs one
 * row of chrome no matter how many there are.
 *
 * Every tab is also a drop target, which is what keeps filing by drag alive
 * now that only one category is on screen: pick a record up, drop it on a tab,
 * and it moves there. Chosen is the exception — it mirrors the map selection,
 * so there is nothing to drop into it.
 */
export default function TabStrip({ tabs, active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Groups"
      className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-ink-200 px-2 pb-1.5 dark:border-ink-800"
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          tab={tab}
          active={tab.id === active}
          onSelect={() => onSelect(tab.id)}
        />
      ))}
    </div>
  );
}

function Tab({
  tab,
  active,
  onSelect,
}: {
  tab: TabDef;
  active: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: tabDroppableId(tab.id),
    disabled: tab.kind === "chosen",
  });

  // A tab off the end of the strip is no use as a drop target or as a place to
  // put you back after a rename, so the selected one scrolls itself in.
  const button = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (active) {
      button.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [active]);

  const accent = tab.kind === "chosen";

  return (
    <button
      ref={(node: HTMLButtonElement | null) => {
        button.current = node;
        setNodeRef(node);
      }}
      type="button"
      role="tab"
      aria-selected={active}
      title={
        tab.kind === "category" && tab.hidden
          ? `${tab.label || "Untitled"} — hidden from players`
          : tab.label
      }
      onClick={onSelect}
      className={[
        "flex shrink-0 items-center gap-1 rounded-md px-2 py-1",
        "text-[11px] font-semibold uppercase tracking-wider transition-colors",
        "max-w-[8rem]",
        isOver ? "ring-2 ring-ink-400 dark:ring-ink-500" : "",
        active
          ? accent
            ? "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100"
            : "bg-ink-200 text-ink-900 dark:bg-ink-800 dark:text-ink-50"
          : accent
            ? "text-amber-700 hover:bg-amber-100 dark:text-amber-500 dark:hover:bg-amber-950/40"
            : "text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:text-ink-600 dark:hover:bg-ink-900 dark:hover:text-ink-300",
      ].join(" ")}
    >
      {tab.kind === "category" && tab.hidden && (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="shrink-0 opacity-70"
        >
          <path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.6 3.6M6.6 6.6A18 18 0 0 0 2 12s3.6 7 10 7a10.6 10.6 0 0 0 5.4-1.4" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          <path d="m2 2 20 20" />
        </svg>
      )}
      <span className="truncate">{tab.label || "Untitled"}</span>
    </button>
  );
}
