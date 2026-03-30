import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import SmartImage from "./SmartImage";

export default function ImageGalleryModal({
  open,
  images,
  alt,
  startIndex = 0,
  onClose,
}) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const totalImages = images?.length ?? 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    const safeIndex = Math.min(Math.max(startIndex, 0), Math.max(totalImages - 1, 0));
    setActiveIndex(safeIndex);
  }, [open, startIndex, totalImages]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (totalImages <= 1) {
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current + 1) % totalImages);
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => (current - 1 + totalImages) % totalImages);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, totalImages]);

  if (!open || !totalImages) {
    return null;
  }

  const currentImage = images[activeIndex] ?? images[0] ?? "";
  const modal = (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-tea-950/75 px-4 py-4 backdrop-blur-sm sm:py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        className="fixed right-4 top-4 z-[71] rounded-full border border-white/15 bg-black/55 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition hover:bg-black/70"
        type="button"
        onClick={onClose}
      >
        Dong
      </button>

      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#171510] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:max-h-[calc(100vh-3rem)] sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex flex-none flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-white/80">
              THU VIEN ANH
            </span>
            <span className="text-sm text-white/70">
              {activeIndex + 1}/{totalImages}
            </span>
          </div>

          <button
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            type="button"
            onClick={onClose}
          >
            Dong
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/40">
          <SmartImage
            className="h-full max-h-[calc(100vh-13rem)] w-full object-contain sm:max-h-[calc(100vh-15rem)]"
            src={currentImage}
            alt={`${alt} ${activeIndex + 1}`}
            loading="eager"
            fallbackClassName="grid h-full max-h-[calc(100vh-13rem)] w-full place-items-center bg-black/40 text-sm text-white/60 sm:max-h-[calc(100vh-15rem)]"
          />

          {totalImages > 1 ? (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/45 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/60"
                type="button"
                onClick={() =>
                  setActiveIndex((current) => (current - 1 + totalImages) % totalImages)
                }
              >
                Previous
              </button>

              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/45 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/60"
                type="button"
                onClick={() => setActiveIndex((current) => (current + 1) % totalImages)}
              >
                Next
              </button>
            </>
          ) : null}
        </div>

        {totalImages > 1 ? (
          <div className="mt-4 grid max-h-32 flex-none grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5 lg:grid-cols-7">
            {images.map((imagePath, index) => (
              <button
                key={`${imagePath}-${index}`}
                className={`overflow-hidden rounded-[1rem] border bg-black/20 text-left transition ${
                  index === activeIndex
                    ? "border-matcha-400 shadow-[0_0_0_2px_rgba(157,183,104,0.35)]"
                    : "border-white/10 hover:border-white/25"
                }`}
                type="button"
                onClick={() => setActiveIndex(index)}
              >
                <SmartImage
                  className="h-20 w-full object-cover"
                  src={imagePath}
                  alt={`${alt} ${index + 1}`}
                  loading="lazy"
                  fallbackClassName="grid h-20 w-full place-items-center bg-black/20 text-[10px] text-white/60"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modal;
  }

  return createPortal(modal, document.body);
}
