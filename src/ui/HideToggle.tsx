type Props = {
  hidden: boolean;
  onToggle: () => void;
};

/**
 * GM-only switch for hiding the Adversaries list from players.
 *
 * Deliberately shows the state as a word as well as an icon — a lone crossed-out
 * eye reads equally well as "is hidden" and "click to hide", and getting that
 * backwards means showing players the whole monster roster.
 */
export default function HideToggle({ hidden, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      title={
        hidden
          ? "Players cannot see this list. Click to reveal it."
          : "Players can see this list. Click to hide it."
      }
      className={[
        "flex items-center gap-1 rounded-md px-1.5 py-0.5",
        "text-[10px] font-semibold uppercase tracking-wider",
        "transition-colors focus-visible:outline focus-visible:outline-1",
        "focus-visible:outline-offset-1 focus-visible:outline-ink-400",
        hidden
          ? "bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
          : "text-ink-400 hover:bg-ink-100 hover:text-ink-600 dark:text-ink-600 dark:hover:bg-ink-900 dark:hover:text-ink-300",
      ].join(" ")}
    >
      {hidden ? <EyeOffIcon /> : <EyeIcon />}
      {hidden ? "Hidden" : "Hide"}
    </button>
  );
}

const iconProps = {
  width: 12,
  height: 12,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.6 3.6M6.6 6.6A18 18 0 0 0 2 12s3.6 7 10 7a10.6 10.6 0 0 0 5.4-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
