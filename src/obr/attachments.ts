import {
  type AttachmentBehavior,
  type Image,
  type Item,
  buildShape,
  buildText,
} from "@owlbear-rodeo/sdk";
import type { TrackedRecord } from "@/core/types";
import { getTokenBounds } from "./bounds";

// --- Look and feel ---------------------------------------------------------

const FONT = "Roboto, sans-serif";

const DIAMETER = 32;
const FONT_SIZE = 18;
const FONT_SIZE_SMALL = 13;
const EDGE_PADDING = 2;

const HP_FILL = "#8b1c1c";
const HP_STROKE = "#fca5a5";
/** Extra HP's own circle — green, next to HP rather than merged into it. */
const EXTRA_FILL = "#166534";
const EXTRA_STROKE = "#86efac";
const AC_FILL = "#1e293b";
const AC_STROKE = "#cbd5e1";
const CONDITION_FILL = "#4c1d95";
const CONDITION_STROKE = "#c4b5fd";
/** An effect that has run out but has not been cleared yet. */
const CONDITION_EXPIRED_FILL = "#7f1d1d";
const CONDITION_EXPIRED_STROKE = "#fca5a5";
const TEXT_COLOR = "#ffffff";

const FILL_OPACITY = 0.85;
const STROKE_OPACITY = 0.55;

// --- Attachment ids --------------------------------------------------------
// Deterministic ids let the sync loop rebuild an attachment in place and find
// orphans without keeping a side table.

/** Condition circles drawn on a token before the row runs out of space. */
export const MAX_CONDITION_BUBBLES = 4;

const SUFFIXES = {
  hpCircle: "/chong-hp-circle",
  hpText: "/chong-hp-text",
  extraCircle: "/chong-extra-circle",
  extraText: "/chong-extra-text",
  acCircle: "/chong-ac-circle",
  acText: "/chong-ac-text",
} as const;

const CONDITION_SUFFIXES = Array.from(
  { length: MAX_CONDITION_BUBBLES },
  (_, index) => [
    `/chong-cond-${index}-circle`,
    `/chong-cond-${index}-text`,
  ],
).flat();

const ALL_SUFFIXES = [...Object.values(SUFFIXES), ...CONDITION_SUFFIXES];

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
 * Builds the HP, extra-HP and AC bubbles for a token.
 *
 * HP sits bottom-left, AC bottom-right, and hold those positions whether or
 * not AC is shown, so nothing jumps sideways when you fill it in. Extra HP
 * tucks in immediately beside HP, on the outside — toward the middle of the
 * token, away from AC — and only when there is any to show; a record with no
 * extra HP looks exactly like it did before extra HP existed.
 *
 * Only ever called for a token a record is linked to, so HP always draws —
 * linking is the deliberate act that says "put this one on the map". Scenery
 * and unlinked tokens are never passed here at all.
 */
export function buildAttachments(
  item: Image,
  record: TrackedRecord,
  sceneDpi: number,
): Item[] {
  const conditions = record.conditions.slice(0, MAX_CONDITION_BUBBLES);
  // AC only shows once it has been filled in; extra HP once it is above 0.
  const showAc = record.ac !== "";
  const showExtra = record.extraHp > 0;

  const { center, width, height } = getTokenBounds(item, sceneDpi);
  const bottom = center.y + height / 2;

  const hpHalfSpan = Math.max(
    width / 2 - DIAMETER / 2 - EDGE_PADDING,
    DIAMETER / 2,
  );
  const acHalfSpan = Math.max(
    width / 2 - DIAMETER / 2 - EDGE_PADDING,
    DIAMETER / 2,
  );

  const hpCenter = {
    x: center.x - hpHalfSpan,
    y: bottom - DIAMETER / 2 - EDGE_PADDING,
  };

  const items: Item[] = buildBubble(item, {
    id: `${item.id}${SUFFIXES.hpCircle}`,
    textId: `${item.id}${SUFFIXES.hpText}`,
    value: String(Math.max(record.hp, 0)),
    fill: HP_FILL,
    stroke: HP_STROKE,
    center: hpCenter,
  });

  if (showExtra) {
    items.push(
      ...buildBubble(item, {
        id: `${item.id}${SUFFIXES.extraCircle}`,
        textId: `${item.id}${SUFFIXES.extraText}`,
        value: String(record.extraHp),
        fill: EXTRA_FILL,
        stroke: EXTRA_STROKE,
        center: { x: hpCenter.x + DIAMETER + 2, y: hpCenter.y },
      }),
    );
  }

  if (showAc) {
    items.push(
      ...buildBubble(item, {
        id: `${item.id}${SUFFIXES.acCircle}`,
        textId: `${item.id}${SUFFIXES.acText}`,
        value: record.ac,
        fill: AC_FILL,
        stroke: AC_STROKE,
        center: { x: center.x + acHalfSpan, y: bottom - DIAMETER / 2 - EDGE_PADDING },
      }),
    );
  }

  // Conditions run along the top edge, left to right, so they never collide
  // with the bubbles sitting on the bottom one.
  if (conditions.length > 0) {
    const top = center.y - height / 2 + DIAMETER / 2 + EDGE_PADDING;
    const step = DIAMETER + 2;
    const span = step * (conditions.length - 1);
    const startX = Math.max(
      center.x - width / 2 + DIAMETER / 2 + EDGE_PADDING,
      center.x - span / 2,
    );

    conditions.forEach((condition, index) => {
      const expired = condition.duration <= 0;
      items.push(
        ...buildBubble(item, {
          id: `${item.id}/chong-cond-${index}-circle`,
          textId: `${item.id}/chong-cond-${index}-text`,
          value: String(condition.duration),
          fill: expired ? CONDITION_EXPIRED_FILL : CONDITION_FILL,
          stroke: expired ? CONDITION_EXPIRED_STROKE : CONDITION_STROKE,
          center: { x: startX + step * index, y: top },
        }),
      );
    });
  }

  return items;
}

/**
 * Everything about a token that changes what its bubbles look like.
 *
 * The sync loop compares these strings instead of re-deriving geometry, so a
 * scene change that only moves an unrelated item costs one string compare.
 * `extraHp` is here because it decides whether the extra-HP bubble exists at
 * all, not only what it says.
 */
export function attachmentSignature(
  item: Image,
  record: TrackedRecord,
  sceneDpi: number,
): string {
  return [
    record.hp,
    record.extraHp,
    record.ac,
    record.conditions
      .slice(0, MAX_CONDITION_BUBBLES)
      .map((condition) => condition.duration)
      .join(","),
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
