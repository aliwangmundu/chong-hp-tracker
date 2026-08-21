import type { Image } from "@owlbear-rodeo/sdk";

export type TokenBounds = {
  /** Centre of the token in scene coordinates. */
  center: { x: number; y: number };
  width: number;
  height: number;
};

/**
 * The on-map footprint of an image token.
 *
 * An image's pixels are authored at its own DPI, so the scene scales it by
 * `sceneDpi / image.grid.dpi` before the item's own scale applies. `grid.offset`
 * then says which pixel of the image sits at the item's position. Skipping any
 * of those three steps is why attachments drift on non-standard token art.
 */
export function getTokenBounds(image: Image, sceneDpi: number): TokenBounds {
  const dpiScale = sceneDpi / image.grid.dpi;

  const width = Math.abs(image.image.width * dpiScale * image.scale.x);
  const height = Math.abs(image.image.height * dpiScale * image.scale.y);

  // Centre relative to the item's anchor, in image pixels.
  let x = image.image.width / 2 - image.grid.offset.x;
  let y = image.image.height / 2 - image.grid.offset.y;

  // Into scene units, then through the item's own scale.
  x *= dpiScale * image.scale.x;
  y *= dpiScale * image.scale.y;

  // Then the item's rotation about its anchor.
  const radians = (image.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    center: {
      x: image.position.x + x * cos - y * sin,
      y: image.position.y + x * sin + y * cos,
    },
    width,
    height,
  };
}
