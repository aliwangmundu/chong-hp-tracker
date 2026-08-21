import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import OBR from "@owlbear-rodeo/sdk";
import { clampHp } from "@/core/inlineMath";
import type { NumericStatKey, TrackedToken } from "@/core/types";
import AcField from "./AcField";
import StatField from "./StatField";

type Props = {
  token: TrackedToken;
  selected: boolean;
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
  onAcChange: (id: string, value: string) => void;
  onOpenDetails: (id: string) => void;
};

/**
 * Selects a token and pans the map to it, leaving the zoom level alone.
 *
 * Fitting the viewport to a single token's bounds would slam the zoom all the
 * way in, so this converts the token centre to screen space, offsets it by the
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

export default function TokenRow({
  token,
  selected,
  onStatChange,
  onAcChange,
  onOpenDetails,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: token.id });

  const { hp, ac, maxHp } = token.stats;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "group flex items-center gap-1 rounded-lg px-1 py-1",
        "hover:bg-ink-100/70 dark:hover:bg-ink-900/60",
        isDragging ? "z-10 opacity-80 shadow-lg" : "",
        selected ? "bg-ink-100 dark:bg-ink-900" : "",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        title={`Focus ${token.name}`}
        onClick={() => void focusToken(token.id)}
        className={[
          "size-7 shrink-0 overflow-hidden rounded outline-none",
          "focus-visible:ring-2 focus-visible:ring-ink-400",
          selected ? "ring-2 ring-ink-500 dark:ring-ink-300" : "",
        ].join(" ")}
      >
        <img
          src={token.imageUrl}
          alt=""
          draggable={false}
          className="drag-none size-full object-contain"
        />
      </button>

      {/* Takes the leftover width so long names truncate. The panel itself is
          narrow enough that "leftover" is a small gap, not a chasm. */}
      <div
        className={[
          "min-w-0 flex-1 truncate text-sm",
          token.visible ? "" : "italic text-ink-400 dark:text-ink-500",
        ].join(" ")}
        title={token.name}
      >
        {token.name || "Unnamed"}
      </div>

      <StatField
        label={`${token.name} hit points`}
        value={hp}
        widthClass="w-20 shrink-0"
        big
        onCommit={(next) => onStatChange(token.id, "hp", clampHp(next, maxHp))}
      />

      <AcField
        label={`${token.name} armor class`}
        value={ac}
        widthClass="w-10 shrink-0"
        onCommit={(next) => onAcChange(token.id, next)}
      />

      <button
        type="button"
        aria-label={`More stats for ${token.name}`}
        title="Extra HP and max HP"
        onClick={() => onOpenDetails(token.id)}
        onPointerDown={(event) => event.stopPropagation()}
        className={[
          "flex size-6 shrink-0 items-center justify-center rounded-md",
          "text-ink-400 transition-colors",
          "hover:bg-ink-200 hover:text-ink-800",
          "dark:text-ink-600 dark:hover:bg-ink-800 dark:hover:text-ink-100",
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
