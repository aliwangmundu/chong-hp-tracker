import { type ReactNode, useEffect, useState } from "react";
import OBR, { type Metadata } from "@owlbear-rodeo/sdk";
import { ROLL_POPOVER_ID, type RollLogEntry, parseRollLog } from "@/core/rolls";
import RollBreakdown from "../RollBreakdown";

type Tab = "result" | "log";

/**
 * The floating dice card: newest result on one tab, the shared log on the
 * other.
 *
 * It reads the log from scene metadata rather than being handed a roll, so it
 * needs no message channel — whoever opened it, every client renders the same
 * history. Switching to Log and back is sticky within a session because the
 * page stays mounted while the popover is open.
 */
export default function RollPopover() {
  const [entries, setEntries] = useState<RollLogEntry[]>([]);
  const [tab, setTab] = useState<Tab>("result");

  useEffect(() => {
    const apply = (metadata: Metadata) => setEntries(parseRollLog(metadata));
    void OBR.scene.getMetadata().then(apply);
    return OBR.scene.onMetadataChange(apply);
  }, []);

  useEffect(() => {
    const apply = (mode: "DARK" | "LIGHT") => {
      document.documentElement.classList.toggle("dark", mode === "DARK");
    };
    void OBR.theme.getTheme().then((theme) => apply(theme.mode));
    return OBR.theme.onChange((theme) => apply(theme.mode));
  }, []);

  // A fresh roll pulls you back to the result; reading the log mid-combat is
  // less common than wanting to see what just happened.
  const newestId = entries[entries.length - 1]?.id;
  useEffect(() => {
    if (newestId !== undefined) setTab("result");
  }, [newestId]);

  const newest = entries[entries.length - 1] ?? null;

  return (
    <div
      className={[
        "flex h-full flex-col overflow-hidden rounded-2xl border shadow-2xl",
        "border-ink-300 bg-ink-50/95 text-ink-900 backdrop-blur",
        "dark:border-ink-700 dark:bg-ink-975/95 dark:text-ink-100",
      ].join(" ")}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-ink-200 px-1.5 py-1.5 dark:border-ink-800">
        <TabButton active={tab === "result"} onClick={() => setTab("result")}>
          Result
        </TabButton>
        <TabButton active={tab === "log"} onClick={() => setTab("log")}>
          Log
          <span className="ml-1 tabular-nums opacity-60">{entries.length}</span>
        </TabButton>

        <button
          type="button"
          onClick={() => void OBR.popover.close(ROLL_POPOVER_ID)}
          aria-label="Close"
          title="Close"
          className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-200 hover:text-ink-900 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-50"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      {tab === "result" ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-3">
          {newest === null ? (
            <p className="text-sm text-ink-400 dark:text-ink-600">
              No rolls yet.
            </p>
          ) : (
            <div className="w-full text-center">
              <Byline entry={newest} center />
              <div className="mt-1 break-words text-base">
                <RollBreakdown segments={newest.segments} total={newest.total} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <ul className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
          {entries.length === 0 ? (
            <li className="py-2 text-center text-sm text-ink-400 dark:text-ink-600">
              No rolls yet.
            </li>
          ) : (
            [...entries].reverse().map((entry) => (
              <li key={entry.id} className="leading-tight">
                <Byline entry={entry} />
                <RollBreakdown
                  segments={entry.segments}
                  total={entry.total}
                  size="xs"
                />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
        active
          ? "bg-ink-200 text-ink-900 dark:bg-ink-800 dark:text-ink-50"
          : "text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Byline({
  entry,
  center = false,
}: {
  entry: RollLogEntry;
  center?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-baseline gap-1.5 text-[10px] text-ink-400 dark:text-ink-600",
        center ? "justify-center" : "",
      ].join(" ")}
    >
      <span className="truncate font-medium text-ink-600 dark:text-ink-300">
        {entry.token || entry.who || "Roll"}
      </span>
      {entry.label !== "" && <span className="truncate">· {entry.label}</span>}
      {entry.crit && (
        <span className="shrink-0 font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Crit
        </span>
      )}
      {entry.fumble && !entry.crit && (
        <span className="shrink-0 font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
          Fumble
        </span>
      )}
    </div>
  );
}
