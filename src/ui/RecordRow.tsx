import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import OBR from "@owlbear-rodeo/sdk";
import { clampHp } from "@/core/inlineMath";
import type {
  AssignableToken,
  NumericStatKey,
  TrackedRecord,
} from "@/core/types";
import AdjustButton from "./AdjustButton";
import StatField from "./StatField";

type Props = {
  record: TrackedRecord;
  token: AssignableToken | undefined;
  /** The token selected on the map, if exactly one is. Enables linking. */
  selectedToken: AssignableToken | undefined;
  selected: boolean;
  expanded: boolean;
  /** The player view gets the AC-driven damage button; the DM view does not. */
  showAdjust?: boolean;
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
  onToggleExpanded: (id: string) => void;
  onAssign: (id: string, tokenId: string) => void;
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

/**
 * The always-visible line: token slot, name, HP.
 *
 * HP is the only value editable here. Everything else — the name included —
 * lives in the expanded panel, so a mistimed click during combat can cost you a
 * hit point but never rename a character.
 *
 * The only other thing a click does here is link a token, from the slot on the
 * left.
 */
export default function RecordRow({
  record,
  token,
  selectedToken,
  selected,
  expanded,
  showAdjust = false,
  onStatChange,
  onToggleExpanded,
  onAssign,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: record.id });

  const canLink = token === undefined && selectedToken !== undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "group flex items-center gap-1 rounded-lg px-1 py-1",
        "hover:bg-ink-100/70 dark:hover:bg-ink-900/60",
        // The floating overlay is the thing you are moving; this is the
        // gap it left behind.
        isDragging ? "opacity-30" : "",
        selected ? "bg-ink-100 dark:bg-ink-900" : "",
        expanded ? "bg-ink-100/80 dark:bg-ink-900/80" : "",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        disabled={token === undefined && !canLink}
        title={
          canLink
            ? `Link ${selectedToken.name}`
            : token !== undefined
              ? `Focus ${token.name}`
              : "Select a token on the map, then click here to link it"
        }
        aria-label={
          canLink ? `Link ${selectedToken.name}` : "Token"
        }
        onClick={() => {
          if (canLink) {
            onAssign(record.id, selectedToken.id);
            return;
          }
          if (record.tokenId !== null) void focusToken(record.tokenId);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        className={[
          "relative size-7 shrink-0 overflow-hidden rounded outline-none",
          "focus-visible:ring-2 focus-visible:ring-ink-400",
          selected ? "ring-2 ring-ink-500 dark:ring-ink-300" : "",
          token === undefined
            ? "border border-dashed border-ink-300 dark:border-ink-700"
            : "",
          canLink
            ? "border-ink-400 bg-ink-200/60 text-ink-700 dark:border-ink-500 dark:bg-ink-800/60 dark:text-ink-200"
            : "",
        ].join(" ")}
      >
        {token !== undefined ? (
          <img
            src={token.imageUrl}
            alt=""
            draggable={false}
            className="drag-none size-full object-contain"
          />
        ) : canLink ? (
          // Only offered when there is something to link — an empty slot with
          // nothing selected is inert, not a button that does nothing.
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            aria-hidden
            className="size-full p-1.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        ) : (
          <span className="sr-only">No token linked</span>
        )}
      </button>

      <span
        className={[
          "min-w-0 flex-1 truncate px-1 text-sm",
          record.name === "" ? "text-ink-400 dark:text-ink-600" : "",
        ].join(" ")}
        title={record.name || token?.name || "Unnamed"}
      >
        {record.name || token?.name || "Unnamed"}
      </span>

      <StatField
        label={`${record.name || "Record"} hit points`}
        value={record.hp}
        widthClass="w-20 shrink-0"
        big
        onCommit={(next) =>
          onStatChange(record.id, "hp", clampHp(next, record.maxHp))
        }
      />

      {showAdjust && (
        <AdjustButton
          value={record.ac}
          label={`Apply ${record.name || "record"}'s AC amount`}
          onAdjust={(delta) =>
            onStatChange(
              record.id,
              "hp",
              clampHp(record.hp + delta, record.maxHp),
            )
          }
        />
      )}

      <button
        type="button"
        aria-label={`${expanded ? "Collapse" : "Expand"} ${record.name || "record"}`}
        aria-expanded={expanded}
        title={expanded ? "Collapse" : "Note, name, AC and more"}
        onClick={() => onToggleExpanded(record.id)}
        onPointerDown={(event) => event.stopPropagation()}
        className={[
          "flex size-6 shrink-0 items-center justify-center rounded-md",
          expanded
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
          strokeLinejoin="round"
          aria-hidden
          className={expanded ? "rotate-180" : ""}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
