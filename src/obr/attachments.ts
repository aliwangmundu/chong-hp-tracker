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

// --- The health pill ---------------------------------------------------
// A small rounded-corner oblong rather than a bar or a circle: the number —
// "current/max", with "+ extra" appended when there is any — sits inside
// it, rather than floating above.

const PILL_HEIGHT = 15;
const PILL_MIN_WIDTH = 34;
const PILL_FONT_SIZE = 10;
/** The label shrinks to this once it is too long to read comfortably at
 *  full size — "120/150 + 25" is a lot of characters for a token-sized
 *  pill. */
const PILL_FONT_SIZE_SMALL = 8.5;
/** Horizontal room around the text — roughly the width of the two rounded
 *  caps put together. */
const PILL_PADDING = 10;
/** Past this many characters the label drops to the small size. */
const PILL_LONG_LABEL_LENGTH = 10;

// --- Attachment ids --------------------------------------------------------
// Deterministic ids let the sync loop rebuild an attachment in place and find
// orphans without keeping a side table.

/** Condition circles drawn on a token before the row runs out of space. */
export const MAX_CONDITION_BUBBLES = 4;

const SUFFIXES = {
  hpPillBody: "/chong-hp-pill-body",
  hpPillCapL: "/chong-hp-pill-capl",
  hpPillCapR: "/chong-hp-pill-capr",
  hpText: "/chong-hp-text",
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
 * The pill's label: "current/max", or just "current" once no max is
 * recorded — the same "no cap" reading `maxHp` already has everywhere else —
 * with "+ extra" appended whenever there is a nonzero extra HP to show.
 */
function pillLabel(record: TrackedRecord): string {
  const hp = Math.max(record.hp, 0);
  const base = record.maxHp > 0 ? `${hp}/${record.maxHp}` : `${hp}`;
  return record.extraHp > 0 ? `${base} + ${record.extraHp}` : base;
}

/**
 * How wide the pill needs to be to hold its label, and at what font size.
 *
 * There is no live text measurement here — this is a headless script with no
 * guarantee of a working canvas — so it is the same length-based estimate
 * `buildBubble` already uses for its own text, just applied to a string
 * instead of a threshold.
 */
function pillGeometry(label: string): { fontSize: number; width: number } {
  const fontSize =
    label.length > PILL_LONG_LABEL_LENGTH
      ? PILL_FONT_SIZE_SMALL
      : PILL_FONT_SIZE;
  const width = Math.max(
    PILL_MIN_WIDTH,
    Math.round(label.length * fontSize * 0.62) + PILL_PADDING,
  );
  return { fontSize, width };
}

/**
 * Builds the health pill: a rounded-corner oblong with its label sitting
 * inside it.
 *
 * There is no native rounded-rectangle shape, so the pill is a plain
 * rectangle with a circle capping each end — sized so the circle's radius
 * exactly matches the rectangle's half-height, which is what makes the seam
 * disappear. All three pieces share one flat fill and no stroke, so nothing
 * shows through where they overlap.
 */
function buildHealthPill(
  item: Image,
  record: TrackedRecord,
  center: { x: number; y: number },
): Item[] {
  const label = pillLabel(record);
  const { fontSize, width } = pillGeometry(label);
  const capRadius = PILL_HEIGHT / 2;
  const bodyWidth = Math.max(width - PILL_HEIGHT, 0);
  const left = center.x - width / 2;
  const right = center.x + width / 2;

  const items: Item[] = [];

  if (bodyWidth > 0) {
    items.push(
      buildShape()
        .id(`${item.id}${SUFFIXES.hpPillBody}`)
        .shapeType("RECTANGLE")
        .width(bodyWidth)
        .height(PILL_HEIGHT)
        .position(center)
        .fillColor(HP_FILL)
        .fillOpacity(FILL_OPACITY)
        .strokeWidth(0)
        .zIndex(30_000)
        .attachedTo(item.id)
        .layer("ATTACHMENT")
        .locked(true)
        .visible(item.visible)
        .disableHit(true)
        .disableAttachmentBehavior(DISABLED_BEHAVIORS)
        .build(),
    );
  }

  const caps: [string, number][] = [
    [SUFFIXES.hpPillCapL, left + capRadius],
    [SUFFIXES.hpPillCapR, right - capRadius],
  ];
  for (const [suffix, x] of caps) {
    items.push(
      buildShape()
        .id(`${item.id}${suffix}`)
        .shapeType("CIRCLE")
        .width(PILL_HEIGHT)
        .height(PILL_HEIGHT)
        .position({ x, y: center.y })
        .fillColor(HP_FILL)
        .fillOpacity(FILL_OPACITY)
        .strokeWidth(0)
        .zIndex(30_000)
        .attachedTo(item.id)
        .layer("ATTACHMENT")
        .locked(true)
        .visible(item.visible)
        .disableHit(true)
        .disableAttachmentBehavior(DISABLED_BEHAVIORS)
        .build(),
    );
  }

  items.push(
    buildText()
      .id(`${item.id}${SUFFIXES.hpText}`)
      .position({ x: left, y: center.y - PILL_HEIGHT / 2 })
      .plainText(label)
      .textType("PLAIN")
      .textAlign("CENTER")
      .textAlignVertical("MIDDLE")
      .width(width)
      .height(PILL_HEIGHT)
      .fontSize(fontSize)
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
      .build(),
  );

  return items;
}

/**
 * Builds the health pill and AC bubble for a token.
 *
 * They sit on the bottom edge — the pill bottom-left, AC bottom-right — and
 * hold those positions whether or not AC is shown, so nothing jumps sideways
 * when you fill it in. On a token too narrow for both, each tucks toward the
 * middle rather than overlapping the other.
 *
 * Only ever called for a token a record is linked to, so the pill always
 * draws — linking is the deliberate act that says "put this one on the map".
 * Scenery and unlinked tokens are never passed here at all.
 */
export function buildAttachments(
  item: Image,
  record: TrackedRecord,
  sceneDpi: number,
): Item[] {
  const conditions = record.conditions.slice(0, MAX_CONDITION_BUBBLES);
  // AC only shows once it has been filled in.
  const showAc = record.ac !== "";

  const { center, width, height } = getTokenBounds(item, sceneDpi);
  const bottom = center.y + height / 2;

  const pillWidth = pillGeometry(pillLabel(record)).width;
  const pillHalfSpan = Math.max(
    width / 2 - pillWidth / 2 - EDGE_PADDING,
    pillWidth / 2,
  );
  const acHalfSpan = Math.max(
    width / 2 - DIAMETER / 2 - EDGE_PADDING,
    DIAMETER / 2,
  );

  const items: Item[] = buildHealthPill(item, record, {
    x: center.x - pillHalfSpan,
    y: bottom - PILL_HEIGHT / 2 - EDGE_PADDING,
  });

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
  // with the bar and AC bubble sitting on the bottom one.
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
 * Everything about a token that changes what its pill and bubbles look like.
 *
 * The sync loop compares these strings instead of re-deriving geometry, so a
 * scene change that only moves an unrelated item costs one string compare.
 * `maxHp` and `extraHp` are both here because either changes the pill's
 * label, and therefore its width, even when `hp` itself has not moved.
 */
export function attachmentSignature(
  item: Image,
  record: TrackedRecord,
  sceneDpi: number,
): string {
  return [
    record.hp,
    record.maxHp,
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
