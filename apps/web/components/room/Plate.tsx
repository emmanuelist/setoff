import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One instrument plate on the wall. Its legend is the instrument's name, engraved; a plate never
 * carries a kicker above a heading.
 */
export function Plate({ legend, aside, className, children, as: Tag = "section", ...rest }: {
  legend?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "aside" | "article";
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Tag className={cn("plate flex flex-col p-5 sm:p-6", className)} {...rest}>
      {(legend || aside) && (
        <div className="mb-4 flex min-h-5 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {legend && <h2 className="legend">{legend}</h2>}
          {aside && <div className="text-caption text-graphite">{aside}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
