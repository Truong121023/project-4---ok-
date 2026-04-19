import { cn } from "../../lib/cn";

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

/**
 * Avatar — user image with initials fallback.
 * @param {string} [props.src]
 * @param {string} [props.alt]
 * @param {string} [props.initials] — shown when src absent or broken
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md']
 */
export function Avatar({ src, alt = "", initials, size = "md", className, ...rest }) {
  const base = cn(
    "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-matcha-100 font-semibold text-matcha-700 select-none flex-shrink-0",
    sizeMap[size] ?? sizeMap.md,
    className
  );

  return (
    <span className={base} {...rest}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span aria-hidden="true">{initials ?? "?"}</span>
      )}
    </span>
  );
}

export default Avatar;
