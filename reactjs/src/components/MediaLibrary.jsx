import { useState } from "react";
import { useTranslation } from "react-i18next";
import ImageGalleryModal from "./ImageGalleryModal";
import SmartImage from "./SmartImage";
import { normalizeImagePathList } from "../lib/images";

export default function MediaLibrary({
  images,
  alt,
  badge,
  className = "",
  heroClassName = "h-72",
  thumbnailClassName = "h-20",
}) {
  const { t } = useTranslation("admin");
  const [activeImageIndex, setActiveImageIndex] = useState(-1);
  const imagePaths = normalizeImagePathList(images);
  const heroImage = imagePaths[0] ?? "";
  const libraryImages = imagePaths.slice(1);

  return (
    <>
      <div className={`grid gap-3 ${className}`.trim()}>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-matcha-900/10 bg-stone-100">
          <button
            className="block w-full text-left"
            type="button"
            onClick={() => {
              if (heroImage) {
                setActiveImageIndex(0);
              }
            }}
            aria-label={t("mediaLibrary.viewGallery", { alt })}
          >
            <SmartImage
              className={`w-full object-cover transition duration-200 hover:scale-[1.01] ${heroClassName}`}
              src={heroImage}
              alt={alt}
              loading="lazy"
              fallbackClassName={`grid w-full place-items-center bg-stone-100 text-xs text-stone-500 ${heroClassName}`}
            />
          </button>

          {badge ? (
            <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-tea-900 backdrop-blur">
              {badge}
            </span>
          ) : null}

          {imagePaths.length ? (
            <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-white backdrop-blur">
              {t("mediaLibrary.openGallery")}
            </span>
          ) : null}
        </div>

        {libraryImages.length ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                {t("mediaLibrary.library")}
              </span>
              <span className="text-xs text-stone-500">
                {t("mediaLibrary.additionalImages", { count: libraryImages.length })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {libraryImages.map((imagePath, index) => {
                const imageIndex = index + 1;

                return (
                  <button
                    key={`${imagePath}-${index}`}
                    className="overflow-hidden rounded-[1.1rem] border border-matcha-900/10 bg-stone-100 text-left transition hover:-translate-y-0.5"
                    type="button"
                    onClick={() => setActiveImageIndex(imageIndex)}
                    aria-label={t("mediaLibrary.viewImage", { number: imageIndex + 1, alt })}
                  >
                    <SmartImage
                      className={`w-full object-cover ${thumbnailClassName}`}
                      src={imagePath}
                      alt={`${alt} ${imageIndex + 1}`}
                      loading="lazy"
                      fallbackClassName={`grid w-full place-items-center bg-stone-100 text-[10px] text-stone-500 ${thumbnailClassName}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <ImageGalleryModal
        open={activeImageIndex >= 0}
        images={imagePaths}
        alt={alt}
        startIndex={activeImageIndex}
        onClose={() => setActiveImageIndex(-1)}
      />
    </>
  );
}
