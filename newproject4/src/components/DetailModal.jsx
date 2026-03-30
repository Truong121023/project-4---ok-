import { useEffect } from "react";
import MediaLibrary from "./MediaLibrary";

export default function DetailModal({
  open,
  onClose,
  title,
  subtitle,
  badge,
  images,
  children,
  belowContent,
  dialogClassName = "max-w-5xl",
  bodyClassName = "",
  mediaHeroClassName = "h-[20rem] sm:h-[24rem]",
  mediaThumbnailClassName = "h-20",
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tea-950/45 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`w-full rounded-[2rem] border border-matcha-900/10 bg-[#f8f5ef] p-5 shadow-[0_28px_80px_rgba(39,64,45,0.24)] sm:p-6 ${dialogClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {badge ? (
              <span className="inline-flex rounded-full bg-matcha-500/12 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-matcha-700">
                {badge}
              </span>
            ) : null}
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-tea-900">{title}</h2>
            {subtitle ? (
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">{subtitle}</p>
            ) : null}
          </div>

          <button
            className="rounded-full border border-matcha-900/10 bg-white/75 px-4 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5"
            type="button"
            onClick={onClose}
          >
            Dong
          </button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <MediaLibrary
            images={images}
            alt={title}
            heroClassName={mediaHeroClassName}
            thumbnailClassName={mediaThumbnailClassName}
          />

          <div className={`grid gap-4 content-start ${bodyClassName}`.trim()}>{children}</div>
        </div>

        {belowContent ? <div className="mt-6">{belowContent}</div> : null}
      </div>
    </div>
  );
}
