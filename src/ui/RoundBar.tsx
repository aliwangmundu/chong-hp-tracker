import type { ReactNode } from "react";

type Props = {
  round: number;
  onStep: (delta: 1 | -1) => void;
  canStepBack: boolean;
  onAddRecord: () => void;
  /** No scene open to save a non-player record into, and this isn't Player. */
  addRecordDisabled?: boolean;
  onAddCategory: () => void;
  /** Categories are scene-scoped; there is nowhere to put one without one. */
  addCategoryDisabled?: boolean;
  onToggleCommand: () => void;
  commandOpen: boolean;
  commandDisabled?: boolean;
};

const SCENE_NEEDED = "Open a scene first — there's nowhere to save it yet.";

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
  addRecordDisabled = false,
  onAddCategory,
  addCategoryDisabled = false,
  onToggleCommand,
  commandOpen,
  commandDisabled = false,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1 px-2 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400 dark:text-ink-500">
        Round
      </span>
      <span className="text-sm font-semibold tabular-nums">{round}</span>

      {/* Both arrows together to the right of the number, rather than one
          either side — the pair reads as one control that way. */}
      <div className="flex items-center">
        <Arrow
          direction="back"
          disabled={!canStepBack}
          onClick={() => onStep(-1)}
        />
        <Arrow direction="forward" onClick={() => onStep(1)} />
      </div>

      <div className="flex flex-1 items-center justify-end gap-0.5">
        <AddButton
          label={
            commandDisabled
              ? SCENE_NEEDED
              : "Add several at once by typing them"
          }
          onClick={onToggleCommand}
          active={commandOpen}
          disabled={commandDisabled}
          strokeWidth={2}
        >
          <path d="m5 8 3.5 3.5L5 15" />
          <path d="M12 15h7" />
          <rect x="2" y="4" width="20" height="16" rx="2.5" />
        </AddButton>

        <AddButton
          label={
            addCategoryDisabled
              ? SCENE_NEEDED
              : "New category — hidden from players until you reveal it"
          }
          onClick={onAddCategory}
          disabled={addCategoryDisabled}
          strokeWidth={2}
        >
          <path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.93L11.5 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          <path d="M12 11v5M9.5 13.5h5" />
        </AddButton>

        <AddButton
          label={addRecordDisabled ? SCENE_NEEDED : "Add a record"}
          onClick={onAddRecord}
          disabled={addRecordDisabled}
        >
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
  active = false,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  strokeWidth?: number;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={[
        "flex size-6 items-center justify-center rounded-md transition-colors",
        "disabled:pointer-events-none disabled:opacity-30",
        active
          ? "bg-ink-300 text-ink-900 dark:bg-ink-700 dark:text-ink-50"
          : "text-ink-500 hover:bg-ink-200 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50",
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
