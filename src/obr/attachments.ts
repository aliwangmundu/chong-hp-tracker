import {
  type AttachmentBehavior,
  type Image,
  type Item,
  buildShape,
  buildText,
} from "@owlbear-rodeo/sdk";
import type { TokenStats, TrackedStats } from "@/core/types";
import { getTokenBounds } from "./bounds";

// --- Look and feel ---------------------------------------------------------

const FONT = "Roboto, sans-serif";

const DIAMETER = 32;
const FONT_SIZE = 18;
const FONT_SIZE_SMALL = 13;
const EDGE_PADDING = 2;

const HP_FILL = "#8b1c1c";
const HP_STROKE = "#fca5a5";
const AC_FILL = "#1e293b";
const AC_STROKE = "#cbd5e1";
const TEXT_COLOR = "#ffffff";

const FILL_OPACITY = 0.85;
const STROKE_OPACITY = 0.55;

// --- Attachment ids --------------------------------------------------------
// Deterministic ids let the sync loop rebuild an attachment in place and find
// orphans without keeping a side table.

const SUFFIXES = {
  hpCircle: "/chong-hp-circle",
  hpText: "/chong-hp-text",
  acCircle: "/chong-ac-circle",
  acText: "/chong-ac-text",
} as const;

const ALL_SUFFIXES = Object.values(SUFFIXES);

export function attachmentIds(itemId: string): string[] {
  return ALL_SUFFIXES.map((suffix) => `${itemId}${suffix}`);
}

export function isOurAttachment(item: Item): boolean {
  return ALL_SUFFIXES.some((suffix) => item.id.endsWith(suffix));
}

// --- Builders --------------------------------------------------------------

const DISABLED_BEHAVIORS: AttachmentBehavior[] = [
  "ROTATION",
  "VISIBLE",
  "COPY",
  "SCALE",
];

type Bubble = {
  id: string;
  textId: string;
  value: string;
  fill: string;
  stroke: string;
  center: { x: number; y: number };
};

function buildBubble(item: Image, bubble: Bubble): Item[] {
  const label = bubble.value;

  const circle = buildShape()
    .id(bubble.id)
    .shapeType("CIRCLE")
    .width(DIAMETER)
    .height(DIAMETER)
    .position(bubble.center)
    .fillColor(bubble.fill)
    .fillOpacity(FILL_OPACITY)
    .strokeColor(bubble.stroke)
    .strokeOpacity(STROKE_OPACITY)
    .strokeWidth(1)
    .zIndex(30_000)
    .attachedTo(item.id)
    .layer("ATTACHMENT")
    .locked(true)
    .visible(item.visible)
    .disableHit(true)
    .disableAttachmentBehavior(DISABLED_BEHAVIORS)
    .build();

  const text = buildText()
    .id(bubble.textId)
    .position({
      x: bubble.center.x - DIAMETER / 2,
      y: bubble.center.y - DIAMETER / 2,
    })
    .plainText(label.length > 4 ? "…" : label)
    .textType("PLAIN")
    .textAlign("CENTER")
    .textAlignVertical("MIDDLE")
    .width(DIAMETER)
    .height(DIAMETER)
    .fontSize(label.length > 2 ? FONT_SIZE_SMALL : FONT_SIZE)
    .fontFamily(FONT)
    .fontWeight(600)
    .fillColor(TEXT_COLOR)
    .fillOpacity(1)
    .strokeWidth(0)
    .lineHeight(1)
    .attachedTo(item.id)
    .layer("TEXT")
    .locked(true)
    .visible(item.visible)
    .disableHit(true)
    .disableAttachmentBehavior(DISABLED_BEHAVIORS)
    .build();

  return [circle, text];
}

/**
 * Builds the HP and AC bubbles for a token.
 *
 * They sit on the bottom edge — HP bottom-left, AC bottom-right — and hold
 * those positions whether one or both are shown, so a bubble never jumps
 * sideways when you set the other stat.
 *
 * An empty list is a valid answer: a token nobody has given stats to shows
 * nothing at all, which is what keeps scenery and unstatted tokens clean.
 */
export function buildAttachments(
  item: Image,
  stats: TokenStats,
  tracked: TrackedStats,
  sceneDpi: number,
): Item[] {
  if (!tracked.hp && !tracked.ac) return [];

  const { center, width, height } = getTokenBounds(item, sceneDpi);
  const bottom = center.y + height / 2;
  const y = bottom - DIAMETER / 2 - EDGE_PADDING;

  // On a token too narrow for both, tuck them either side of the middle
  // instead of letting them overlap.
  const halfSpan = Math.max(width / 2 - DIAMETER / 2 - EDGE_PADDING, DIAMETER / 2);

  const items: Item[] = [];

  if (tracked.hp) {
    items.push(
      ...buildBubble(item, {
        id: `${item.id}${SUFFIXES.hpCircle}`,
        textId: `${item.id}${SUFFIXES.hpText}`,
        // Temporary hit points are folded into the number on the map; the panel
        // is where the split between the two is visible.
        value: String(stats.hp + stats.extraHp),
        fill: HP_FILL,
        stroke: HP_STROKE,
        center: { x: center.x - halfSpan, y },
      }),
    );
  }

  if (tracked.ac) {
    items.push(
      ...buildBubble(item, {
        id: `${item.id}${SUFFIXES.acCircle}`,
        textId: `${item.id}${SUFFIXES.acText}`,
        value: stats.ac,
        fill: AC_FILL,
        stroke: AC_STROKE,
        center: { x: center.x + halfSpan, y },
      }),
    );
  }

  return items;
}

/**
 * Everything about a token that changes what its bubbles look like.
 *
 * The sync loop compares these strings instead of re-deriving geometry, so a
 * scene change that only moves an unrelated item costs one string compare.
 */
export function attachmentSignature(
  item: Image,
  stats: TokenStats,
  tracked: TrackedStats,
  sceneDpi: number,
): string {
  return [
    stats.hp,
    stats.extraHp,
    stats.ac,
    tracked.hp ? 1 : 0,
    tracked.ac ? 1 : 0,
    item.position.x,
    item.position.y,
    item.scale.x,
    item.scale.y,
    item.rotation,
    item.image.width,
    item.image.height,
    item.grid.dpi,
    item.grid.offset.x,
    item.grid.offset.y,
    item.visible ? 1 : 0,
    sceneDpi,
  ].join("|");
}
