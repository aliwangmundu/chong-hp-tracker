import { describe, expect, it } from "vitest";
import type { Image } from "@owlbear-rodeo/sdk";
import { getTokenBounds } from "./bounds";

/** Minimal stand-in for the handful of fields getTokenBounds reads. */
const image = (overrides: {
  imageWidth?: number;
  imageHeight?: number;
  gridDpi?: number;
  offset?: { x: number; y: number };
  scale?: { x: number; y: number };
  position?: { x: number; y: number };
  rotation?: number;
}): Image =>
  ({
    image: {
      width: overrides.imageWidth ?? 300,
      height: overrides.imageHeight ?? 300,
      url: "",
      mime: "image/png",
    },
    grid: {
      dpi: overrides.gridDpi ?? 300,
      offset: overrides.offset ?? { x: 150, y: 150 },
    },
    scale: overrides.scale ?? { x: 1, y: 1 },
    position: overrides.position ?? { x: 0, y: 0 },
    rotation: overrides.rotation ?? 0,
  }) as unknown as Image;

const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThan(0.001);

describe("getTokenBounds", () => {
  it("scales image pixels into scene units", () => {
    // A 300px image authored at 300 DPI on a 150 DPI grid is one square.
    const bounds = getTokenBounds(image({}), 150);
    close(bounds.width, 150);
    close(bounds.height, 150);
  });

  it("applies the item scale", () => {
    const bounds = getTokenBounds(image({ scale: { x: 2, y: 3 } }), 150);
    close(bounds.width, 300);
    close(bounds.height, 450);
  });

  it("treats a negative scale (a flipped token) as positive size", () => {
    const bounds = getTokenBounds(image({ scale: { x: -1, y: 1 } }), 150);
    close(bounds.width, 150);
  });

  it("centres a token whose anchor is its middle", () => {
    const bounds = getTokenBounds(image({ position: { x: 500, y: 400 } }), 150);
    close(bounds.center.x, 500);
    close(bounds.center.y, 400);
  });

  it("respects a grid offset that is not the image centre", () => {
    // Anchor at the top-left corner: the centre sits half a square in.
    const bounds = getTokenBounds(
      image({ offset: { x: 0, y: 0 }, position: { x: 0, y: 0 } }),
      150,
    );
    close(bounds.center.x, 75);
    close(bounds.center.y, 75);
  });

  it("rotates the centre about the anchor", () => {
    const bounds = getTokenBounds(
      image({ offset: { x: 0, y: 0 }, rotation: 90 }),
      150,
    );
    close(bounds.center.x, -75);
    close(bounds.center.y, 75);
  });

  it("handles art authored at a different DPI than the scene", () => {
    const bounds = getTokenBounds(
      image({ imageWidth: 512, imageHeight: 512, gridDpi: 512, offset: { x: 256, y: 256 } }),
      150,
    );
    close(bounds.width, 150);
  });
});
