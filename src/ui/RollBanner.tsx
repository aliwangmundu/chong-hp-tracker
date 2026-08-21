import type { RollLogEntry } from "@/core/rolls";
import RollBreakdown from "./RollBreakdown";

/**
 * The newest roll, across the top of the panel.
 *
 * Owlbear gives an extension no surface over the map, so "top centre" is the
 * top centre of this window. It is driven by the shared log rather than the
 * local roll, so everyone in the room sees the same banner.
 */
export default function RollBanner({
  entry,
  onDismiss,
}: {
  entry: RollLogEntry;
  onDismiss: () => void;
}) {
  const accent = entry.crit
    ? "border-emerald-400 dark:border-emerald-700"
    : entry.fumble
      ? "border-red-400 dark:border-red-800"
      : "border-ink-300 dark:border-ink-700";

  return (
    <button
      type="button"
      onClick={onDismiss}
      title="Dismiss"
      className={[
        "absolute inset-x-2 top-2 z-20 rounded-lg border px-3 py-2 text-left shadow-lg",
        "bg-ink-50 dark:bg-ink-950",
        accent,
      ].join(" ")}
    >
      <div className="flex items-baseline gap-1.5 text-[11px] text-ink-400 dark:text-ink-500">
        <span className="truncate font-medium text-ink-600 dark:text-ink-300">
          {entry.token || entry.who || "Roll"}
        </span>
        {entry.note !== "" && <span className="truncate">· {entry.note}</span>}
        {entry.crit && (
          <span className="ml-auto shrink-0 font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Crit
          </span>
        )}
        {entry.fumble && !entry.crit && (
          <span className="ml-auto shrink-0 font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            Fumble
          </span>
        )}
      </div>
      <div className="mt-0.5">
        <RollBreakdown segments={entry.segments} total={entry.total} />
      </div>
    </button>
  );
}
