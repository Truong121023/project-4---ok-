import { cn } from "../../lib/cn";

/**
 * Skeleton — pulsing placeholder block.
 * Respects prefers-reduced-motion via CSS (animation-none utility).
 * @param {string} [props.className] — use to set width/height/rounded
 */
export function Skeleton({ className, ...rest }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "block rounded-md bg-beige-200 animate-pulse motion-reduce:animate-none",
        className
      )}
      {...rest}
    />
  );
}

/** Convenience: multi-line text skeleton */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && lines > 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

export default Skeleton;
