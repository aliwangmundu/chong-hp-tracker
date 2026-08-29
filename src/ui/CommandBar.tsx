import { useMemo, useState } from "react";
import {
  COMMAND_HELP,
  MAX_LINES,
  type RecordSpec,
  parseCommand,
  summarize,
} from "@/core/command";

type Props = {
  onSubmit: (specs: RecordSpec[]) => void;
  onClose: () => void;
};

/**
 * Bulk entry, one record per line.
 *
 * The preview under the box is the point: it parses as you type and says
 * exactly what will be created, so a typo shows up before it becomes eight
 * wrongly-named goblins you then have to delete one at a time.
 */
export default function CommandBar({ onSubmit, onClose }: Props) {
  const [text, setText] = useState("");

  const { specs, summary } = useMemo(() => {
    const parsed = parseCommand(text);
    return {
      specs: parsed.flatMap((line) => (line.ok ? line.specs : [])),
      summary: summarize(parsed),
    };
  }, [text]);

  const submit = () => {
    if (specs.length === 0) return;
    onSubmit(specs);
    setText("");
    onClose();
  };

  return (
    <div className="shrink-0 border-b border-ink-200 bg-ink-100/50 px-2 py-2 dark:border-ink-800 dark:bg-ink-900/50">
      <textarea
        autoFocus
        rows={4}
        spellCheck={false}
        value={text}
        placeholder={COMMAND_HELP}
        aria-label="Add records"
        className={[
          "no-scrollbar w-full resize-none rounded-md border px-1.5 py-1",
          "font-mono text-xs leading-relaxed outline-none transition-colors",
          "border-ink-200 bg-white text-ink-900",
          "placeholder:text-ink-300 dark:placeholder:text-ink-700",
          "dark:border-ink-800 dark:bg-ink-950 dark:text-ink-100",
          "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500",
        ].join(" ")}
        onChange={(event) => setText(event.currentTarget.value)}
        onKeyDown={(event) => {
          // Enter is a newline here — this is a multi-line box by design — so
          // the modifier is what commits.
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            submit();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      />

      <div className="mt-1 flex items-start gap-2">
        <div className="min-w-0 flex-1 text-[11px] leading-snug">
          {text.trim() === "" ? (
            <p className="text-ink-400 dark:text-ink-600">
              <code>name</code> then any of <code>x8</code> <code>7/7</code>{" "}
              <code>ac 15</code> <code>#group</code>, in any order.
            </p>
          ) : (
            <>
              <p className="text-ink-500 dark:text-ink-400">
                {summary.records === 0
                  ? "Nothing to add"
                  : `Adds ${summary.records} record${summary.records === 1 ? "" : "s"}`}
                {summary.groups.length > 0 &&
                  ` · ${summary.groups.length} group${summary.groups.length === 1 ? "" : "s"}`}
              </p>
              {summary.errors.slice(0, 3).map((error) => (
                <p
                  key={error.source}
                  className="truncate text-red-600 dark:text-red-400"
                  title={`${error.source} — ${error.error}`}
                >
                  {error.source} — {error.error}
                </p>
              ))}
              {summary.errors.length > 3 && (
                <p className="text-red-600 dark:text-red-400">
                  and {summary.errors.length - 3} more
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          <Button onClick={onClose} title="Close (Esc)">
            Cancel
          </Button>
          <Button
            primary
            disabled={specs.length === 0}
            onClick={submit}
            title={`Add them (Ctrl+Enter) — at most ${MAX_LINES} lines`}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function Button({
  children,
  onClick,
  title,
  primary = false,
  disabled = false,
}: {
  children: string;
  onClick: () => void;
  title: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        primary
          ? "bg-ink-700 text-ink-50 hover:bg-ink-800 dark:bg-ink-200 dark:text-ink-950 dark:hover:bg-ink-100"
          : "bg-ink-200 text-ink-700 hover:bg-ink-300 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
