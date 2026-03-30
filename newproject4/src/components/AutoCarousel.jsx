import { useEffect, useEffectEvent, useMemo, useState } from "react";

export default function AutoCarousel({
  items,
  getKey,
  renderSlide,
  label,
  autoMs = 5000,
}) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToSlide = (nextIndex) => {
    if (!safeItems.length) {
      return;
    }

    const normalizedIndex = (nextIndex + safeItems.length) % safeItems.length;
    setActiveIndex(normalizedIndex);
  };

  const advanceSlide = useEffectEvent(() => {
    goToSlide(activeIndex + 1);
  });

  useEffect(() => {
    if (safeItems.length <= 1) {
      setActiveIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      advanceSlide();
    }, autoMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeIndex, advanceSlide, autoMs, safeItems.length]);

  useEffect(() => {
    if (!safeItems.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => Math.min(current, safeItems.length - 1));
  }, [safeItems.length]);

  if (!safeItems.length) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/55 px-5 py-8 text-sm text-stone-500">
        No data is available for this carousel{label ? ` ${label}` : ""}.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-[1.75rem]">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {safeItems.map((item, index) => (
            <div key={getKey(item)} className="min-w-full">
              {renderSlide(item, index === activeIndex)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {safeItems.map((item, index) => (
            <button
              key={getKey(item)}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              className={
                index === activeIndex
                  ? "h-2.5 w-8 rounded-full bg-matcha-600 transition"
                  : "h-2.5 w-2.5 rounded-full bg-matcha-900/20 transition"
              }
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-matcha-900/10 bg-white/70 px-4 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5"
            type="button"
            onClick={() => goToSlide(activeIndex - 1)}
          >
            Previous
          </button>
          <button
            className="rounded-full border border-matcha-900/10 bg-white/70 px-4 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5"
            type="button"
            onClick={() => goToSlide(activeIndex + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
