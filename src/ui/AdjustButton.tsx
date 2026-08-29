import { parseAdjustment } from "@/core/adjust";

type Props = {
  /** The record's AC text, which doubles as the amount in the player view. */
  value: string;
  label: string;
  onAdjust: (delta: number) => void;
};

/**
 * One-press damage or healing, using the number already in AC.
 *
 * A button rather than a field: in the player view the amount is a property of
 * the character that rarely changes, so it is set once in the expanded row and
 * then applied with a single click for the rest of the fight.
 */
export default function AdjustButton({ value, label, onAdjust }: Props) {
  const delta = parseAdjustment(value);
  const usable = delta !== null;

  return (
    <button
      type="button"
      disabled={!usable}
      aria-label={label}
      title={
        usable
          ? `${label} — ${delta > 0 ? "+" : ""}${delta} HP`
          : "Put a signed number like +8 or -5 in AC to use this"
      }
      onClick={() => {
        if (delta !== null) onAdjust(delta);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className={[
        "w-11 shrink-0 rounded-md border px-1 py-2 text-center text-base",
        "tabular-nums transition-colors",
        usable
          ? "border-ink-300 bg-ink-100 text-ink-800 hover:bg-ink-200 hover:text-ink-950 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700 dark:hover:text-ink-50"
          : "cursor-not-allowed border-dashed border-ink-200 text-ink-300 dark:border-ink-800 dark:text-ink-700",
      ].join(" ")}
    >
      {value.trim() === "" ? "±" : value}
    </button>
  );
}
