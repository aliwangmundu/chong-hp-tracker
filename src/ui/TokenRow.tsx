import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import OBR from "@owlbear-rodeo/sdk";
import { clampAc, clampHp } from "@/core/inlineMath";
import type { StatKey, TrackedToken } from "@/core/types";
import StatField from "./StatField";

type Props = {
  token: TrackedToken;
  selected: boolean;
  onStatChange: (id: string, key: StatKey, value: number) => void;
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

export default function TokenRow({ token, selected, onStatChange }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: token.id });

  const { hp, ac } = token.stats;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "group flex items-center gap-2 rounded-lg px-2 py-1.5",
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
          "size-8 shrink-0 overflow-hidden rounded outline-none",
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

      <div className="min-w-0 flex-1">
        <div
          className={[
            "truncate text-sm",
            token.visible ? "" : "italic text-ink-400 dark:text-ink-500",
          ].join(" ")}
          title={token.name}
        >
          {token.name || "Unnamed"}
        </div>
      </div>

      <div className="shrink-0">
        <StatField
          label={`${token.name} hit points`}
          value={hp}
          widthClass="w-24"
          big
          onCommit={(next) => onStatChange(token.id, "hp", clampHp(next))}
        />
      </div>

      <div className="shrink-0">
        <StatField
          label={`${token.name} armor class`}
          value={ac}
          widthClass="w-14"
          onCommit={(next) => onStatChange(token.id, "ac", clampAc(next))}
        />
      </div>
    </div>
  );
}
