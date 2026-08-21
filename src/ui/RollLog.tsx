import { useState } from "react";
import { formatTotal } from "@/core/dice";
import type { RollLogEntry } from "@/core/rolls";
import RollBreakdown from "./RollBreakdown";

/**
 * The shared roll history, collapsed to one line until clicked.
 *
 * Newest first: the roll you care about is the one that just happened, and it
 * should not require scrolling to the bottom of twenty entries to find.
 */
export default function RollLog({ entries }: { entries: RollLogEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const newest = entries[entries.length - 1];

  return (
    <section className="pt-1">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 py-1 text-left"
      >
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          Log
        </h3>
        <span className="text-[11px] tabular-nums text-ink-400 dark:text-ink-600">
          {entries.length}
        </span>
        <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
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
          className={[
            "shrink-0 text-ink-400 transition-transform dark:text-ink-600",
            expanded ? "rotate-180" : "",
          ].join(" ")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {entries.length === 0 ? (
        <p className="py-1 text-xs text-ink-400 dark:text-ink-600">
          No rolls yet.
        </p>
      ) : expanded ? (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto py-1">
          {[...entries].reverse().map((entry) => (
            <li key={entry.id} className="leading-tight">
              <Byline entry={entry} />
              <RollBreakdown
                segments={entry.segments}
                total={entry.total}
                size="xs"
              />
            </li>
          ))}
        </ul>
      ) : (
        newest !== undefined && (
          <div className="truncate py-1 leading-tight">
            <Byline entry={newest} />
            <span className="text-[11px] tabular-nums text-ink-500 dark:text-ink-400">
              = <span className="font-semibold">{formatTotal(newest.total)}</span>
            </span>
          </div>
        )
      )}
    </section>
  );
}

function Byline({ entry }: { entry: RollLogEntry }) {
  return (
    <div className="flex items-baseline gap-1 text-[10px] text-ink-400 dark:text-ink-600">
      <span className="truncate">{entry.token || entry.who || "Roll"}</span>
      {entry.note !== "" && <span className="truncate">· {entry.note}</span>}
      {entry.crit && (
        <span className="shrink-0 font-semibold uppercase text-emerald-600 dark:text-emerald-400">
          crit
        </span>
      )}
      {entry.fumble && !entry.crit && (
        <span className="shrink-0 font-semibold uppercase text-red-600 dark:text-red-400">
          fumble
        </span>
      )}
    </div>
  );
}
