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

// --- The health bar ----------------------------------------------------
// A slim, quiet bar rather than a circle: its length says how hurt something
// is at a glance, and the number above it says exactly how much.

const BAR_WIDTH = 46;
const BAR_HEIGHT = 7;
/** Slightly shorter than the track, so the fill reads as inset rather than
 *  edge-to-edge with it. */
const BAR_FILL_HEIGHT = BAR_HEIGHT - 2;
const BAR_TEXT_HEIGHT = 12;
const BAR_TEXT_GAP = 1;
const BAR_FONT_SIZE = 10;
/** A sliver of fill stays visible above 0 hp — "barely alive" still reads as
 *  alive, the way the number never disappears either. */
const MIN_FILL_WIDTH = 3;

const HP_TRACK_FILL = "#241414";
const HP_TRACK_OPACITY = 0.6;
const HP_TRACK_STROKE = "#7f1d1d";
const HP_TRACK_STROKE_OPACITY = 0.45;

/** A dark outline on the number, since it now sits over a bar rather than a
 *  filled circle and needs to hold up against whatever art is underneath. */
const BAR_TEXT_STROKE = "#000000";
const BAR_TEXT_STROKE_OPACITY = 0.6;

// --- Attachment ids --------------------------------------------------------
// Deterministic ids let the sync loop rebuild an attachment in place and find
// orphans without keeping a side table.

/** Condition circles drawn on a token before the row runs out of space. */
export const MAX_CONDITION_BUBBLES = 4;

const SUFFIXES = {
  hpTrack: "/chong-hp-track",
  hpFill: "/chong-hp-fill",
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
 * Builds the health bar: a track, a fill sized to HP over max HP, and the
 * number above it.
 *
 * No max HP recorded reads as a full bar — the same "no cap" reading `maxHp`
 * already has everywhere else — since there is nothing to measure the fill
 * against. HP at or below 0 drops the fill entirely; the track and the "0"
 * above it are what says the rest.
 */
function buildHealthBar(
  item: Image,
  record: TrackedRecord,
  center: { x: number; y: number },
): Item[] {
  const hp = Math.max(record.hp, 0);
  const ratio = record.maxHp > 0 ? Math.min(hp / record.maxHp, 1) : 1;
  const fillWidth = hp <= 0 ? 0 : Math.max(BAR_WIDTH * ratio, MIN_FILL_WIDTH);
  const left = center.x - BAR_WIDTH / 2;

  const items: Item[] = [
    buildShape()
      .id(`${item.id}${SUFFIXES.hpTrack}`)
      .shapeType("RECTANGLE")
      .width(BAR_WIDTH)
      .height(BAR_HEIGHT)
      .position(center)
      .fillColor(HP_TRACK_FILL)
      .fillOpacity(HP_TRACK_OPACITY)
      .strokeColor(HP_TRACK_STROKE)
      .strokeOpacity(HP_TRACK_STROKE_OPACITY)
      .strokeWidth(1)
      .zIndex(30_000)
      .attachedTo(item.id)
      .layer("ATTACHMENT")
      .locked(true)
      .visible(item.visible)
      .disableHit(true)
      .disableAttachmentBehavior(DISABLED_BEHAVIORS)
      .build(),
  ];

  if (fillWidth > 0) {
    items.push(
      buildShape()
        .id(`${item.id}${SUFFIXES.hpFill}`)
        .shapeType("RECTANGLE")
        .width(fillWidth)
        .height(BAR_FILL_HEIGHT)
        .position({ x: left + fillWidth / 2, y: center.y })
        .fillColor(HP_FILL)
        .fillOpacity(FILL_OPACITY)
        .strokeColor(HP_STROKE)
        .strokeOpacity(STROKE_OPACITY)
        .strokeWidth(0)
        .zIndex(30_001)
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
      .position({
        x: left,
        y: center.y - BAR_HEIGHT / 2 - BAR_TEXT_GAP - BAR_TEXT_HEIGHT,
      })
      .plainText(String(hp))
      .textType("PLAIN")
      .textAlign("CENTER")
      .textAlignVertical("BOTTOM")
      .width(BAR_WIDTH)
      .height(BAR_TEXT_HEIGHT)
      .fontSize(BAR_FONT_SIZE)
      .fontFamily(FONT)
      .fontWeight(600)
      .fillColor(TEXT_COLOR)
      .fillOpacity(1)
      .strokeColor(BAR_TEXT_STROKE)
      .strokeOpacity(BAR_TEXT_STROKE_OPACITY)
      .strokeWidth(2)
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
 * Builds the health bar and AC bubble for a token.
 *
 * They sit on the bottom edge — the bar bottom-left, AC bottom-right — and
 * hold those positions whether or not AC is shown, so nothing jumps sideways
 * when you fill it in. On a token too narrow for both, each tucks toward the
 * middle rather than overlapping the other.
 *
 * Only ever called for a token a record is linked to, so the bar always
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

  const barHalfSpan = Math.max(
    width / 2 - BAR_WIDTH / 2 - EDGE_PADDING,
    BAR_WIDTH / 2,
  );
  const acHalfSpan = Math.max(
    width / 2 - DIAMETER / 2 - EDGE_PADDING,
    DIAMETER / 2,
  );

  const items: Item[] = buildHealthBar(item, record, {
    x: center.x - barHalfSpan,
    y: bottom - BAR_HEIGHT / 2 - EDGE_PADDING,
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
 * Everything about a token that changes what its bar and bubbles look like.
 *
 * The sync loop compares these strings instead of re-deriving geometry, so a
 * scene change that only moves an unrelated item costs one string compare.
 * `maxHp` is here because it changes the bar's fill even when HP itself has
 * not moved.
 */
export function attachmentSignature(
  item: Image,
  record: TrackedRecord,
  sceneDpi: number,
): string {
  return [
    record.hp,
    record.maxHp,
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
