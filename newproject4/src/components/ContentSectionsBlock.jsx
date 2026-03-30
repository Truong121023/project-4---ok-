import SmartImage from "./SmartImage";
import { normalizeImagePathList } from "../lib/images";
import { ui } from "../ui";

function getSectionImagePaths(section) {
  const imagePaths = normalizeImagePathList(section?.imagePaths);
  return imagePaths.length ? imagePaths : normalizeImagePathList(section?.imagePath);
}

function normalizeSections(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section) => {
      const imagePaths = getSectionImagePaths(section);

      return {
        title: String(section?.title ?? "").trim(),
        content: String(section?.content ?? ""),
        imagePath: imagePaths[0] ?? "",
        imagePaths,
      };
    })
    .filter(
      (section) =>
        section.title || String(section.content ?? "").trim() || section.imagePaths.length,
    );
}

function splitContent(content) {
  return String(content ?? "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sectionBadge(index) {
  return String(index + 1).padStart(2, "0");
}

function GalleryTile({ imagePath, title, className, overlayText = "" }) {
  return (
    <div className={`relative overflow-hidden bg-stone-100 ${className}`}>
      <SmartImage
        className="h-full w-full object-cover"
        src={imagePath}
        alt={title}
        loading="lazy"
        fallbackClassName="grid h-full w-full place-items-center bg-stone-100 text-xs text-stone-500"
      />
      {overlayText ? (
        <div className="absolute inset-0 grid place-items-center bg-tea-900/55 text-xl font-semibold text-white backdrop-blur-[1px]">
          {overlayText}
        </div>
      ) : null}
    </div>
  );
}

function SectionGallery({ imagePaths, title }) {
  if (!imagePaths.length) {
    return null;
  }

  if (imagePaths.length === 1) {
    return (
      <div className="border-t border-matcha-900/10 bg-stone-100">
        <GalleryTile imagePath={imagePaths[0]} title={title} className="h-64 sm:h-80" />
      </div>
    );
  }

  if (imagePaths.length === 2) {
    return (
      <div className="border-t border-matcha-900/10 bg-matcha-900/10">
        <div className="grid grid-cols-2 gap-px">
          {imagePaths.slice(0, 2).map((imagePath, index) => (
            <GalleryTile
              key={`${imagePath}-${index}`}
              imagePath={imagePath}
              title={`${title} ${index + 1}`}
              className="h-56 sm:h-80"
            />
          ))}
        </div>
      </div>
    );
  }

  const visibleImages = imagePaths.slice(0, 4);
  const sideImages = visibleImages.slice(1);
  const remainingCount = imagePaths.length - visibleImages.length;
  const sideTileHeightClass =
    sideImages.length >= 3 ? "h-28 sm:h-[6.95rem]" : "h-36 sm:h-[10.45rem]";

  return (
    <div className="border-t border-matcha-900/10 bg-matcha-900/10">
      <div className="grid gap-px sm:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <GalleryTile imagePath={visibleImages[0]} title={title} className="h-64 sm:h-[21rem]" />

        <div className={`grid gap-px ${sideImages.length > 1 ? "grid-cols-2 sm:grid-cols-1" : ""}`}>
          {sideImages.map((imagePath, index) => {
            const isLastVisible = index === sideImages.length - 1;
            const overlayText = remainingCount > 0 && isLastVisible ? `+${remainingCount}` : "";

            return (
              <GalleryTile
                key={`${imagePath}-${index + 1}`}
                imagePath={imagePath}
                title={`${title} ${index + 2}`}
                className={sideTileHeightClass}
                overlayText={overlayText}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ContentSectionsBlock({
  sections,
  eyebrow = "Sections",
  title = "More details",
  description = "",
}) {
  const contentSections = normalizeSections(sections);

  if (!contentSections.length) {
    return null;
  }

  return (
    <section className="grid gap-4 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-matcha-900/10 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            {eyebrow}
          </span>
          <h2 className="mt-2 text-xl font-semibold text-tea-900 sm:text-2xl">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
          ) : null}
        </div>

        <span className={ui.pill}>{contentSections.length} sections</span>
      </div>

      <div className="grid gap-4">
        {contentSections.map((section, index) => {
          const paragraphs = splitContent(section.content);
          const titleText = section.title || `Section ${index + 1}`;

          return (
            <article
              key={`${titleText}-${index}`}
              className="overflow-hidden rounded-[1.35rem] border border-matcha-900/10 bg-white shadow-[0_16px_36px_rgba(79,70,45,0.08)]"
            >
              <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-matcha-500/12 text-sm font-bold text-matcha-700">
                  {sectionBadge(index)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-tea-900 sm:text-lg">
                      {titleText}
                    </h3>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      {eyebrow}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-stone-400">
                    Feed-style section {index + 1}
                  </p>
                </div>
              </div>

              {paragraphs.length ? (
                <div className="grid gap-3 px-4 pb-4 text-sm leading-7 text-stone-700 sm:px-5">
                  {paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </div>
              ) : null}

              <SectionGallery imagePaths={section.imagePaths} title={titleText} />

              <div className="flex flex-wrap items-center gap-2 border-t border-matcha-900/10 bg-[#fbfaf7] px-4 py-3 sm:px-5">
                <span className={ui.pill}>Section {index + 1}</span>
                {section.imagePaths.length ? (
                  <span className={ui.pill}>
                    {section.imagePaths.length} image{section.imagePaths.length > 1 ? "s" : ""}
                  </span>
                ) : null}
                {paragraphs.length ? (
                  <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold tracking-wide text-stone-500">
                    {paragraphs.length} text block{paragraphs.length > 1 ? "s" : ""}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
