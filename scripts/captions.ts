/**
 * How the narration is cut into lines.
 *
 * One script, two renderings: each line is synthesised as its own take and shown as its own
 * caption, so the same split has to hold in the voice, the alignment and the render. It lives
 * here, once, for that reason.
 */

/** Sentences, kept whole. A caption split mid-clause is unreadable at speed. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    // Merge very short fragments into the previous line so nothing flashes.
    .reduce<string[]>((acc, s) => {
      const words = s.split(/\s+/).length;
      if (words <= 4 && acc.length) acc[acc.length - 1] += " " + s;
      else acc.push(s);
      return acc;
    }, []);
}
