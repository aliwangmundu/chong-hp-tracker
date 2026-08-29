type Props = {
  round: number;
  onStep: (delta: 1 | -1) => void;
  canStepBack: boolean;
  onAdd: () => void;
};

/**
 * The combat round, pinned above the token list.
 *
 * Stepping it is the only thing in the extension that edits every token at
 * once: forward counts every condition down by one, back counts them up, so a
 * mis-click is undone by clicking the other arrow.
 */
export default function RoundBar({
  round,
  onStep,
  canStepBack,
  onAdd,
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

      <div className="flex flex-1 justify-end">
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add a record"
          title="Add a record"
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
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
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
