import { type ReactNode, useState } from "react";
import type { CategoryDef } from "@/core/categories";
import { clampExtraHp, clampMaxHp } from "@/core/inlineMath";
import { NOTE_MAX_LENGTH, RECORD_NAME_MAX_LENGTH } from "@/core/records";
import type {
  AssignableToken,
  Condition,
  NumericStatKey,
  TrackedRecord,
} from "@/core/types";
import AcField from "./AcField";
import ConditionList from "./ConditionList";
import StatField from "./StatField";

type Props = {
  record: TrackedRecord;
  /** Categories this person can see, so a player cannot file into a hidden one. */
  categories: CategoryDef[];
  token: AssignableToken | undefined;
  /** The token currently selected on the map, if exactly one is. */
  selectedToken: AssignableToken | undefined;
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
  onAcChange: (id: string, value: string) => void;
  onNameChange: (id: string, value: string) => void;
  onNoteChange: (id: string, value: string) => void;
  onConditionsChange: (id: string, next: Condition[]) => void;
  onCategoryChange: (id: string, categoryId: string | null) => void;
  onAssign: (id: string, tokenId: string | null) => void;
  onDelete: (id: string) => void;
};

/**
 * Everything about a record except its HP, opened underneath its row.
 *
 * Full width and flush with the row above it, so the two read as one block
 * rather than a panel floating inside the list. Its own height is capped and it
 * scrolls internally: a record with a long note and six conditions should not
 * push the rest of the roster off the screen.
 *
 * This is also the only place any of these values can be changed — the row is
 * deliberately read-only apart from HP.
 */
export default function RecordDetails({
  record,
  categories,
  token,
  selectedToken,
  onStatChange,
  onAcChange,
  onNameChange,
  onNoteChange,
  onConditionsChange,
  onCategoryChange,
  onAssign,
  onDelete,
}: Props) {
  return (
    <div className="mb-1 overflow-hidden rounded-lg border border-ink-200 bg-ink-100/40 dark:border-ink-800 dark:bg-ink-900/40">
      <div className="no-scrollbar max-h-60 space-y-2.5 overflow-y-auto px-2.5 py-2.5">
        <div className="space-y-1">
          <Label>Note</Label>
          <NoteField
            value={record.note}
            onCommit={(next) => onNoteChange(record.id, next)}
          />
        </div>

        <div className="space-y-1">
          <Label>Name</Label>
          <TextField
            value={record.name}
            placeholder={token?.name || "Unnamed"}
            maxLength={RECORD_NAME_MAX_LENGTH}
            onCommit={(next) => onNameChange(record.id, next)}
          />
        </div>

        <div className="space-y-1">
          <Label>Token</Label>
          <div className="flex items-center gap-1">
            {token !== undefined && (
              <img
                src={token.imageUrl}
                alt=""
                draggable={false}
                className="drag-none size-5 shrink-0 rounded object-contain"
              />
            )}
            <span className="min-w-0 flex-1 truncate text-xs text-ink-500 dark:text-ink-400">
              {token !== undefined
                ? token.name
                : record.tokenId === null
                  ? "Nothing linked"
                  : "Not in this scene"}
            </span>
            <SmallButton
              disabled={selectedToken === undefined}
              title={
                selectedToken === undefined
                  ? "Select one token on the map first"
                  : `Link ${selectedToken.name}`
              }
              onClick={() => {
                if (selectedToken !== undefined) {
                  onAssign(record.id, selectedToken.id);
                }
              }}
            >
              Link
            </SmallButton>
            {record.tokenId !== null && (
              <SmallButton
                title="Unlink the token — the record stays"
                onClick={() => onAssign(record.id, null)}
              >
                Unlink
              </SmallButton>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Group</Label>
          <select
            value={record.categoryId ?? ""}
            onChange={(event) =>
              onCategoryChange(
                record.id,
                event.currentTarget.value === ""
                  ? null
                  : event.currentTarget.value,
              )
            }
            className={[
              "w-full rounded-md border px-1.5 py-1 text-xs outline-none transition-colors",
              "border-ink-200 bg-white text-ink-900 hover:border-ink-300",
              "dark:border-ink-800 dark:bg-ink-950 dark:text-ink-100 dark:hover:border-ink-700",
              "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30",
            ].join(" ")}
          >
            <option value="">Ungrouped</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name || "Untitled"}
                {category.hidden ? " (hidden)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* AC, extra and max share one line — three secondary numbers do not
            deserve a stacked row each above the conditions. */}
        <div className="flex items-center gap-2 pt-0.5">
          <InlineStat label="AC">
            <AcField
              label={`${record.name || "Record"} armor class`}
              value={record.ac}
              widthClass="w-10"
              onCommit={(next) => onAcChange(record.id, next)}
            />
          </InlineStat>
          <InlineStat label="Extra">
            <StatField
              label={`${record.name || "Record"} extra hit points`}
              value={record.extraHp}
              widthClass="w-11"
              allowMath={false}
              onCommit={(next) =>
                onStatChange(record.id, "extraHp", clampExtraHp(next))
              }
            />
          </InlineStat>
          <InlineStat label="Max">
            <StatField
              label={`${record.name || "Record"} maximum hit points`}
              value={record.maxHp}
              widthClass="w-11"
              allowMath={false}
              onCommit={(next) =>
                onStatChange(record.id, "maxHp", clampMaxHp(next))
              }
            />
          </InlineStat>
        </div>

        <ConditionList
          conditions={record.conditions}
          onChange={(next) => onConditionsChange(record.id, next)}
        />

        <div className="border-t border-ink-200 pt-2 dark:border-ink-800">
          <SmallButton
            danger
            title="Delete this record. The token itself is untouched."
            onClick={() => onDelete(record.id)}
          >
            Delete record
          </SmallButton>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
      {children}
    </span>
  );
}

function InlineStat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center gap-1">
      <span className="text-xs text-ink-500 dark:text-ink-400">{label}</span>
      {children}
    </div>
  );
}

const inputClasses = [
  "w-full rounded-md border px-1.5 py-1 text-sm outline-none transition-colors",
  "border-ink-200 bg-white text-ink-900 hover:border-ink-300",
  "placeholder:text-ink-400 dark:placeholder:text-ink-600",
  "dark:border-ink-800 dark:bg-ink-950 dark:text-ink-100 dark:hover:border-ink-700",
  "focus:border-ink-400 focus:ring-2 focus:ring-ink-400/30 dark:focus:border-ink-500 dark:focus:ring-ink-500/30",
].join(" ");

function TextField({
  value,
  placeholder,
  maxLength,
  onCommit,
}: {
  value: string;
  placeholder: string;
  maxLength: number;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const next = draft.trim().slice(0, maxLength);
    setDraft(null);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="text"
      autoComplete="off"
      spellCheck={false}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label="Name"
      value={draft ?? value}
      className={inputClasses}
      onFocus={() => setDraft(value)}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/**
 * The note.
 *
 * Enter inserts a newline rather than committing, because this is the one field
 * where multiple lines are the point. It saves on blur, and Escape abandons
 * whatever you were typing.
 */
function NoteField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const next = draft.slice(0, NOTE_MAX_LENGTH);
    setDraft(null);
    if (next !== value) onCommit(next);
  };

  return (
    <textarea
      rows={3}
      spellCheck
      maxLength={NOTE_MAX_LENGTH}
      placeholder="Anything worth remembering…"
      aria-label="Note"
      value={draft ?? value}
      className={`${inputClasses} no-scrollbar resize-none leading-snug`}
      onFocus={() => setDraft(value)}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function SmallButton({
  children,
  onClick,
  title,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        "shrink-0 rounded px-1.5 py-1 text-[11px] transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        danger
          ? "text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
          : "bg-ink-200 text-ink-700 hover:bg-ink-300 hover:text-ink-900 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700 dark:hover:text-ink-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
