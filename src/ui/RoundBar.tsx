import type { ReactNode } from "react";

type Props = {
  round: number;
  onStep: (delta: 1 | -1) => void;
  canStepBack: boolean;
  onAddRecord: () => void;
  onAddCategory: () => void;
};

/**
 * The combat round, pinned above the record list, with the two add buttons.
 *
 * Stepping the round is the only thing in the extension that edits every record
 * at once: forward counts every condition down by one, back counts them up, so
 * a mis-click is undone by clicking the other arrow.
 */
export default function RoundBar({
  round,
  onStep,
  canStepBack,
  onAddRecord,
  onAddCategory,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-ink-200 px-2 py-1.5 dark:border-ink-800">
      <div className="flex-1" />
      <Arrow
        direction="back"
        disabled={!canStepBack}
        onClick={() => onStep(-1)}
      />

      <span className="px-1 text-[11px] font-medium uppercase tracking-wider text-ink-400 dark:text-ink-500">
        Round
      </span>
      <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
        {round}
      </span>

      <Arrow direction="forward" onClick={() => onStep(1)} />

      <div className="flex flex-1 items-center justify-end gap-0.5">
        <AddButton
          label="New category — hidden from players until you reveal it"
          onClick={onAddCategory}
          strokeWidth={2}
        >
          <path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.93L11.5 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          <path d="M12 11v5M9.5 13.5h5" />
        </AddButton>

        <AddButton label="Add a record" onClick={onAddRecord}>
          <path d="M12 5v14M5 12h14" />
        </AddButton>
      </div>
    </div>
  );
}

function AddButton({
  label,
  onClick,
  strokeWidth = 2.5,
  children,
}: {
  label: string;
  onClick: () => void;
  strokeWidth?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "flex size-6 items-center justify-center rounded-md",
        "text-ink-500 transition-colors hover:bg-ink-200 hover:text-ink-900",
        "dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50",
      ].join(" ")}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}

function Arrow({
  direction,
  onClick,
  disabled = false,
}: {
  direction: "back" | "forward";
  onClick: () => void;
  disabled?: boolean;
}) {
  const back = direction === "back";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={back ? "Previous round" : "Next round"}
      title={
        back
          ? "Previous round — counts conditions back up"
          : "Next round — counts every condition down by one"
      }
      className={[
        "flex size-6 items-center justify-center rounded-md",
        "text-ink-500 hover:bg-ink-200 hover:text-ink-900",
        "dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50",
        "disabled:pointer-events-none disabled:opacity-30",
      ].join(" ")}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={back ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </svg>
    </button>
  );
}
