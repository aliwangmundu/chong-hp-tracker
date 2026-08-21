import { type Segment, formatTotal } from "@/core/dice";

/**
 * Renders a roll as "1d20 (17) + 3 = 20".
 *
 * Each face is bolded when it is the die's highest (a crit) or a 1 (a fumble),
 * which is why the log stores segments rather than a finished string — the
 * marks have to survive the trip through scene metadata to everyone else.
 */
export default function RollBreakdown({
  segments,
  total,
  size = "sm",
}: {
  segments: Segment[];
  total: number;
  size?: "sm" | "xs";
}) {
  const text = size === "xs" ? "text-[11px]" : "text-sm";

  return (
    <span className={`${text} tabular-nums`}>
      {segments.map((segment, index) => (
        <span key={index}>
          {index > 0 && " "}
          {segment.kind === "plain" ? (
            <span className="text-ink-500 dark:text-ink-400">
              {segment.text}
            </span>
          ) : (
            <span>
              <span className="text-ink-500 dark:text-ink-400">
                {segment.label}
              </span>
              <span className="text-ink-400 dark:text-ink-500"> (</span>
              {segment.dice.map((die, dieIndex) => {
                const crit = die.value === die.sides;
                const fumble = die.value === 1 && die.sides > 1;
                return (
                  <span key={dieIndex}>
                    {dieIndex > 0 && (
                      <span className="text-ink-400 dark:text-ink-500">, </span>
                    )}
                    <span
                      className={
                        crit
                          ? "font-bold text-emerald-600 dark:text-emerald-400"
                          : fumble
                            ? "font-bold text-red-600 dark:text-red-400"
                            : ""
                      }
                    >
                      {die.value}
                    </span>
                  </span>
                );
              })}
              <span className="text-ink-400 dark:text-ink-500">)</span>
            </span>
          )}
        </span>
      ))}
      <span className="text-ink-400 dark:text-ink-500"> = </span>
      <span className="font-semibold">{formatTotal(total)}</span>
    </span>
  );
}
