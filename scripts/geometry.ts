/**
 * The film's geometry, in composition pixels. Both the chrome renderer and the
 * compositor import this: they disagreed once (a 750px window against a 1000px
 * one) and the product was drawn straight through the bezel.
 *
 * Footage is captured 16:9 at 1600x900 and shown at 1520x855, a 5% downscale,
 * so the frame is genuinely 1080p rather than an upscale of a smaller capture.
 */
export const FILM = {
  W: 1920,
  H: 1080,
  capture: { w: 1600, h: 900 },
  /** The window bezel, including its 38px title bar. */
  frame: { x: 200, y: 56, w: 1520, bar: 38, h: 855 },
  ground: "#14130f",
} as const;

/** The interior of the bezel: where the product is drawn. */
export const WIN = {
  x: FILM.frame.x,
  y: FILM.frame.y + FILM.frame.bar,
  w: FILM.frame.w,
  h: FILM.frame.h,
} as const;
