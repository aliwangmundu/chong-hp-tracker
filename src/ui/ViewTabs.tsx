export type View = "DM" | "PLAYER";

type Props = {
  view: View;
  onChange: (next: View) => void;
};

/**
 * Two ways to look at the same records.
 *
 * The DM view is the workshop: categories, Chosen, drag-to-file. The player
 * view is the flat roster with a damage box — everything you need in a fight
 * and nothing you need between them. Both are available to everyone; the role
 * only picks which one opens first.
 */
export default function ViewTabs({ view, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="flex shrink-0 gap-1 border-b border-ink-200 px-2 pb-1.5 dark:border-ink-800"
    >
      <Tab active={view === "PLAYER"} onClick={() => onChange("PLAYER")}>
        Player
      </Tab>
      <Tab active={view === "DM"} onClick={() => onChange("DM")}>
        DM
      </Tab>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "flex-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider",
        "transition-colors",
        active
          ? "bg-ink-200 text-ink-900 dark:bg-ink-800 dark:text-ink-50"
          : "text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:text-ink-600 dark:hover:bg-ink-900 dark:hover:text-ink-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
