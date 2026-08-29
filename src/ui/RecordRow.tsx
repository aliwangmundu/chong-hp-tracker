import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import OBR from "@owlbear-rodeo/sdk";
import { clampHp } from "@/core/inlineMath";
import { RECORD_NAME_MAX_LENGTH } from "@/core/records";
import type {
  AssignableToken,
  NumericStatKey,
  TrackedRecord,
} from "@/core/types";
import AcField from "./AcField";
import StatField from "./StatField";

type Props = {
  record: TrackedRecord;
  token: AssignableToken | undefined;
  selected: boolean;
  detailsOpen: boolean;
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
  onAcChange: (id: string, value: string) => void;
  onNameChange: (id: string, value: string) => void;
  onToggleDetails: (id: string) => void;
};

/**
 * Selects the linked token and pans the map to it, leaving the zoom alone.
 *
 * Fitting the viewport to one token's bounds would slam the zoom all the way
 * in, so this converts the token centre to screen space, offsets it by the
 * viewport centre, and animates the viewport position instead.
 */
async function focusToken(id: string): Promise<void> {
  await OBR.player.select([id]);

  const bounds = await OBR.scene.items.getItemBounds([id]);
  const centerOnScreen = await OBR.viewport.transformPoint(bounds.center);

  const [width, height, scale] = await Promise.all([
    OBR.viewport.getWidth(),
    OBR.viewport.getHeight(),
    OBR.viewport.getScale(),
  ]);

  const offset = await OBR.viewport.inverseTransformPoint({
    x: centerOnScreen.x - width / 2,
    y: centerOnScreen.y - height / 2,
  });

  await OBR.viewport.animateTo({
    scale,
    position: { x: -offset.x * scale, y: -offset.y * scale },
  });
}

export default function RecordRow({
  record,
  token,
  selected,
  detailsOpen,
  onStatChange,
  onAcChange,
  onNameChange,
  onToggleDetails,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: record.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "group flex items-center gap-1 rounded-lg px-1 py-1",
        "hover:bg-ink-100/70 dark:hover:bg-ink-900/60",
        isDragging ? "z-10 opacity-80 shadow-lg" : "",
        selected ? "bg-ink-100 dark:bg-ink-900" : "",
        record.hidden ? "opacity-60" : "",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        disabled={token === undefined}
        title={
          token === undefined
            ? "No token linked — open the details to link one"
            : `Focus ${token.name}`
        }
        onClick={() => {
          if (record.tokenId !== null) void focusToken(record.tokenId);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        className={[
          "size-7 shrink-0 overflow-hidden rounded outline-none",
          "focus-visible:ring-2 focus-visible:ring-ink-400",
          selected ? "ring-2 ring-ink-500 dark:ring-ink-300" : "",
          token === undefined
            ? "border border-dashed border-ink-300 dark:border-ink-700"
            : "",
        ].join(" ")}
      >
        {token === undefined ? (
          <span className="sr-only">No token linked</span>
        ) : (
          <img
            src={token.imageUrl}
            alt=""
            draggable={false}
            className="drag-none size-full object-contain"
          />
        )}
      </button>

      <NameField
        value={record.name}
        placeholder={token?.name || "Unnamed"}
        onCommit={(next) => onNameChange(record.id, next)}
      />

      <StatField
        label={`${record.name || "Record"} hit points`}
        value={record.hp}
        widthClass="w-20 shrink-0"
        big
        onCommit={(next) =>
          onStatChange(record.id, "hp", clampHp(next, record.maxHp))
        }
      />

      <AcField
        label={`${record.name || "Record"} armor class`}
        value={record.ac}
        widthClass="w-10 shrink-0"
        onCommit={(next) => onAcChange(record.id, next)}
      />

      <button
        type="button"
        aria-label={`Details for ${record.name || "record"}`}
        aria-expanded={detailsOpen}
        title="Token, extra HP, conditions and resources"
        onClick={() => onToggleDetails(record.id)}
        onPointerDown={(event) => event.stopPropagation()}
        className={[
          "flex size-6 shrink-0 items-center justify-center rounded-md",
          detailsOpen
            ? "bg-ink-300 text-ink-900 dark:bg-ink-700 dark:text-ink-50"
            : "text-ink-400 hover:bg-ink-200 hover:text-ink-800 dark:text-ink-600 dark:hover:bg-ink-800 dark:hover:text-ink-100",
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
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

/**
 * The record's name, edited in place.
 *
 * With no token to take a name from, this is the record's only identity — so it
 * is a field in the row rather than something buried in the details, and it
 * falls back to showing the linked token's name as placeholder text.
 */
function NameField({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const next = draft.trim().slice(0, RECORD_NAME_MAX_LENGTH);
    setDraft(null);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="text"
      autoComplete="off"
      spellCheck={false}
      maxLength={RECORD_NAME_MAX_LENGTH}
      placeholder={placeholder}
      aria-label="Name"
      value={draft ?? value}
      title={value || placeholder}
      className={[
        "min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent",
        "px-1 py-1 text-sm outline-none transition-colors",
        "placeholder:text-ink-400 dark:placeholder:text-ink-600",
        "hover:border-ink-200 dark:hover:border-ink-800",
        "focus:border-ink-400 focus:bg-white focus:ring-2 focus:ring-ink-400/30",
        "dark:focus:border-ink-500 dark:focus:bg-ink-950 dark:focus:ring-ink-500/30",
      ].join(" ")}
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
      onPointerDown={(event) => event.stopPropagation()}
    />
  );
}
