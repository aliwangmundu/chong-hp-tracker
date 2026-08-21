import { useEffect, useState } from "react";
import OBR, { type Metadata } from "@owlbear-rodeo/sdk";
import { type RollLogEntry, parseRollLog } from "@/core/rolls";
import RollBreakdown from "../RollBreakdown";

/**
 * The floating roll result, rendered in its own popover over the map.
 *
 * The page reads the newest entry from the shared log rather than being handed
 * one, so it needs no message passing: whoever opens the popover, every client
 * shows the same roll.
 */
export default function RollPopover() {
  const [entry, setEntry] = useState<RollLogEntry | null>(null);

  useEffect(() => {
    const apply = (metadata: Metadata) => {
      const log = parseRollLog(metadata);
      setEntry(log[log.length - 1] ?? null);
    };
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

  if (entry === null) return null;

  const accent = entry.crit
    ? "border-emerald-400 dark:border-emerald-600"
    : entry.fumble
      ? "border-red-400 dark:border-red-700"
      : "border-ink-300 dark:border-ink-700";

  return (
    <div
      className={[
        "mx-auto w-fit max-w-full rounded-xl border-2 px-4 py-2 shadow-xl",
        "bg-ink-50/95 text-ink-900 backdrop-blur",
        "dark:bg-ink-975/95 dark:text-ink-100",
        accent,
      ].join(" ")}
    >
      <div className="flex items-baseline justify-center gap-1.5 text-[11px] text-ink-400 dark:text-ink-500">
        <span className="truncate font-medium text-ink-600 dark:text-ink-300">
          {entry.token || entry.who || "Roll"}
        </span>
        {entry.note !== "" && <span className="truncate">· {entry.note}</span>}
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
      <div className="mt-0.5 whitespace-nowrap text-center">
        <RollBreakdown segments={entry.segments} total={entry.total} />
      </div>
    </div>
  );
}
