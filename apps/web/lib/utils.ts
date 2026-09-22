import { createCn } from "cn/config";

/**
 * Class merging that knows the room's type scale. Without this, a role like `text-caption` reads
 * as a colour, and merging it with `text-on-ink` silently drops the size.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["label", "caption", "small", "body", "lead", "heading", "figure-m", "figure-l", "title", "display", "figure-xl", "figure-hero"] }],
    },
  },
});
