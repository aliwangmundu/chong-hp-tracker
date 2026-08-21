import { type ReactNode, useEffect, useRef, useState } from "react";
import OBR, { type Metadata } from "@owlbear-rodeo/sdk";
import {
  CORNER_LABEL,
  CORNER_ORDER,
  ROLL_CONTROL_CHANNEL,
  ROLL_POPOVER_ID,
  type RollControlMessage,
  type RollCorner,
  type RollLogEntry,
  parseRollLog,
  readCorner,
  writeCorner,
} from "@/core/rolls";
import RollBreakdown from "../RollBreakdown";

function send(message: RollControlMessage): void {
  // LOCAL: these are this person's window controls, not a room-wide event.
  void OBR.broadcast.sendMessage(ROLL_CONTROL_CHANNEL, message, {
    destination: "LOCAL",
  });
}

/**
 * The dice card: one feed, oldest at the top, newest at the bottom.
 *
 * A single list rather than a result tab and a log tab — the roll you just made
 * is the last line of the history, not a different kind of thing, and reading
 * it in place keeps the two or three before it visible for comparison.
 *
 * It reads the log from scene metadata rather than being handed a roll, so no
 * message channel is needed for the content: whoever rolled, every client shows
 * the same feed.
 */
export default function RollPopover() {
  const [entries, setEntries] = useState<RollLogEntry[]>([]);
  const [pinned, setPinned] = useState(false);
  const [corner, setCorner] = useState<RollCorner>(readCorner);
  const bottom = useRef<HTMLDivElement>(null);

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

  // The newest roll is at the bottom, so that is where the view belongs.
  const newestId = entries[entries.length - 1]?.id;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [newestId]);

  const cycleCorner = () => {
    const index = CORNER_ORDER.indexOf(corner);
    const next = CORNER_ORDER[(index + 1) % CORNER_ORDER.length] ?? corner;
    setCorner(next);
    writeCorner(next);
    send({ kind: "move", corner: next });
  };

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    send({ kind: "pin", pinned: next });
  };

  const lastIndex = entries.length - 1;

  return (
    <div
      className={[
        "flex h-full flex-col overflow-hidden rounded-xl border shadow-2xl",
        "border-ink-300 bg-ink-50/95 text-ink-900 backdrop-blur",
        "dark:border-ink-700 dark:bg-ink-975/95 dark:text-ink-100",
      ].join(" ")}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-ink-200 px-2 py-1 dark:border-ink-800">
        <h1 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          Rolls
        </h1>
        <span className="text-[11px] tabular-nums text-ink-400 dark:text-ink-600">
          {entries.length}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <IconButton
            label={`Move to the ${CORNER_LABEL[
              CORNER_ORDER[(CORNER_ORDER.indexOf(corner) + 1) %
                CORNER_ORDER.length] ?? corner
            ]}`}
            onClick={cycleCorner}
          >
            <path d="M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
          </IconButton>

          <IconButton
            label={pinned ? "Unpin — let it hide again" : "Pin — stop it hiding"}
            active={pinned}
            onClick={togglePin}
          >
            <path d="M12 17v5M9 3h6l-1 7 3 3H7l3-3-1-7Z" />
          </IconButton>

          <IconButton
            label="Close"
            onClick={() => void OBR.popover.close(ROLL_POPOVER_ID)}
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </IconButton>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400 dark:text-ink-600">
            No rolls yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {entries.map((entry, index) => {
              const newest = index === lastIndex;
              return (
                <li
                  key={entry.id}
                  className={
                    newest
                      ? "mt-1.5 rounded-lg bg-ink-200/60 px-2.5 py-2 dark:bg-ink-900/70"
                      : "px-0.5 leading-tight opacity-70"
                  }
                >
                  <Byline entry={entry} big={newest} />
                  <div className={newest ? "mt-0.5 text-base" : ""}>
                    <RollBreakdown
                      segments={entry.segments}
                      total={entry.total}
                      size={newest ? "sm" : "xs"}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottom} />
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
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
        "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-ink-300 text-ink-900 dark:bg-ink-700 dark:text-ink-50"
          : "text-ink-400 hover:bg-ink-200 hover:text-ink-900 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-50",
      ].join(" ")}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}

function Byline({ entry, big }: { entry: RollLogEntry; big: boolean }) {
  return (
    <div
      className={[
        "flex items-baseline gap-1.5",
        big ? "text-[11px]" : "text-[10px]",
        "text-ink-400 dark:text-ink-600",
      ].join(" ")}
    >
      <span className="truncate font-medium text-ink-600 dark:text-ink-300">
        {entry.token || entry.who || "Roll"}
      </span>
      {entry.label !== "" && <span className="truncate">· {entry.label}</span>}
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
  );
}
