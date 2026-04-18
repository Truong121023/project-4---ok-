function cn(...values) {
  return values.filter(Boolean).join(" ");
}

const SIZE_STYLES = {
  sm: {
    shell: "h-11 w-11 rounded-[1rem] p-1.5",
    title: "text-sm tracking-[0.22em]",
    subtitle: "text-xs",
  },
  md: {
    shell: "h-12 w-12 rounded-[1.1rem] p-1.5",
    title: "text-sm tracking-[0.22em]",
    subtitle: "text-xs",
  },
  lg: {
    shell: "h-14 w-14 rounded-[1.25rem] p-2",
    title: "text-base tracking-[0.2em]",
    subtitle: "text-sm",
  },
};

export default function BrandLogo({
  size = "md",
  subtitle = "Modern tea spaces",
  className = "",
  textClassName = "",
  subtitleClassName = "",
}) {
  const styles = SIZE_STYLES[size] ?? SIZE_STYLES.md;

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden border border-[#e9dcc8] bg-[#f6ecde] shadow-[0_10px_24px_rgba(89,108,61,0.12)]",
          styles.shell,
        )}
      >
        <img
          className="h-full w-full object-contain mix-blend-multiply"
          src="/kamatcha-logo.png"
          alt="Kamatcha logo"
        />
      </span>

      <span className={cn("min-w-0", textClassName)}>
        <strong
          className={cn(
            "block truncate font-semibold uppercase text-tea-900",
            styles.title,
          )}
        >
          Kamatcha
        </strong>
        {subtitle ? (
          <span
            className={cn(
              "block pt-0.5 text-stone-500",
              styles.subtitle,
              subtitleClassName,
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
