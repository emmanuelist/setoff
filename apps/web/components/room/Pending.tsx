import { Plate } from "./Plate";

/**
 * A plate whose instrument is still reading the chain. It holds the space the real plate will
 * take, so nothing jumps when the figures land, and it says what it is waiting for rather than
 * shimmering at the reader. The sweep is one slow pass over the well, killed by reduced motion
 * along with every other animation in the stylesheet.
 */
export function Pending({ legend, aside, className, rows = 3, height }: {
  legend?: string;
  aside?: string;
  className?: string;
  rows?: number;
  height?: number;
}) {
  return (
    <Plate legend={legend} aside={aside} className={className} aria-busy="true">
      {/* The well fills whatever height the plate reserves, so a tall placeholder reads as one instrument. */}
      <div className="well relative grid flex-1 content-start gap-3 overflow-hidden p-4" style={height ? { minHeight: height } : undefined}>
        {Array.from({ length: rows }, (_, i) => (
          <span
            key={i}
            className="h-3 rounded-[2px] bg-ink/[0.07]"
            // Uneven widths read as an instrument mid-reading; equal bars read as a loading GIF.
            style={{ width: `${[68, 92, 44, 80, 56][i % 5]}%` }}
          />
        ))}
        <span className="sweep pointer-events-none absolute inset-0" aria-hidden="true" />
      </div>
      <span className="sr">Reading the chain.</span>
    </Plate>
  );
}
