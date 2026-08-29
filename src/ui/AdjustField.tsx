import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  onAdjust: (delta: number) => void;
};

const SIGNED = /^([+-])\s*(\d+)$/;
const ERROR_FLASH_MS = 700;

/**
 * A damage-and-healing box: type `+8` or `-5`, press Enter.
 *
 * The sign is required, and a bare number is refused rather than guessed at.
 * "12" could reasonably mean twelve damage or twelve healing, and picking one
 * silently is how a boss loses its health bar to a hasty keystroke. It also
 * keeps this box unambiguously different from the HP field beside it, which
 * takes an absolute value.
 */
export default function AdjustField({ label, onAdjust }: Props) {
  const [draft, setDraft] = useState("");
  const [errored, setErrored] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    };
  }, []);

  const flashError = () => {
    setErrored(true);
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setErrored(false), ERROR_FLASH_MS);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") return;

    const match = SIGNED.exec(trimmed);
    if (match?.[1] === undefined || match[2] === undefined) {
      flashError();
      return;
    }

    const magnitude = Number.parseInt(match[2], 10);
    if (!Number.isFinite(magnitude)) {
      flashError();
      return;
    }

    onAdjust(match[1] === "-" ? -magnitude : magnitude);
    setDraft("");
  };

  return (
    <input
      type="text"
      inputMode="text"
      autoComplete="off"
      spellCheck={false}
      aria-label={label}
      title={`${label} — type +8 or -5 and press Enter`}
      placeholder="±"
      value={draft}
      className={[
        "w-11 shrink-0 rounded-md border px-1 py-2 text-center text-base",
        "tabular-nums outline-none transition-colors",
        "placeholder:text-ink-300 dark:placeholder:text-ink-700",
        errored
          ? "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/40"
          : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-950 dark:hover:border-ink-700",
        "text-ink-900 dark:text-ink-100",
        "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500 dark:focus:ring-ink-500/30",
      ].join(" ")}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft("");
          event.currentTarget.blur();
        }
      }}
      // Leaving the box discards rather than commits: an unfinished "+" should
      // not become anything when you click away.
      onBlur={() => setDraft("")}
      onPointerDown={(event) => event.stopPropagation()}
    />
  );
}
