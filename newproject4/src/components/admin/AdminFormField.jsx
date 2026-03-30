import SmartImage from "../SmartImage";
import { ui } from "../../ui";

function createEmptyContentSection() {
  return {
    title: "",
    content: "",
    imagePath: "",
    imagePaths: [],
  };
}

function normalizeSectionImagePaths(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter((item, index, array) => item && array.indexOf(item) === index);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n+/)
      .map((item) => item.trim())
      .filter((item, index, array) => item && array.indexOf(item) === index);
  }

  return [];
}

function createSectionImagePatch(value) {
  const imagePaths = normalizeSectionImagePaths(value);

  return {
    imagePath: imagePaths[0] ?? "",
    imagePaths,
  };
}

function normalizeContentSections(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((section) => {
    const imageSource =
      Array.isArray(section?.imagePaths) && section.imagePaths.length
        ? section.imagePaths
        : section?.imagePath;

    return {
      title: String(section?.title ?? ""),
      content: String(section?.content ?? ""),
      ...createSectionImagePatch(imageSource),
    };
  });
}

function moveArrayItem(items, fromIndex, toIndex) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

export default function AdminFormField({
  field,
  value,
  onChange,
  onUploadFiles,
  uploadState,
}) {
  const baseClass = `${ui.input} text-sm`;
  const helper = field.description ? (
    <span className="text-xs leading-6 text-stone-500">{field.description}</span>
  ) : null;
  const canUploadImages = field.type === "image-gallery" && typeof onUploadFiles === "function";

  if (field.type === "image-gallery") {
    const imagePaths = Array.isArray(value) ? value : [];

    return (
      <div className="grid gap-3">
        <div className="grid gap-1">
          <span className="text-sm font-semibold text-tea-900">{field.label}</span>
          {helper}
        </div>

        {uploadState?.message ? (
          <span className="text-xs leading-6 text-matcha-700">{uploadState.message}</span>
        ) : null}
        {uploadState?.error ? (
          <span className="text-xs leading-6 text-red-700">{uploadState.error}</span>
        ) : null}

        {imagePaths.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {imagePaths.map((imagePath) => (
              <div
                key={imagePath}
                className="overflow-hidden rounded-[1.25rem] border border-matcha-900/10 bg-stone-50"
              >
                <SmartImage
                  className="h-32 w-full object-cover"
                  src={imagePath}
                  alt={field.label}
                  loading="lazy"
                  fallbackClassName="grid h-32 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                />
                <div className="grid gap-2 px-3 py-3">
                  <span className="truncate text-xs text-stone-500">{imagePath}</span>
                  <button
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5"
                    type="button"
                    onClick={() =>
                      onChange(
                        field.name,
                        imagePaths.filter((currentPath) => currentPath !== imagePath),
                      )
                    }
                  >
                    Remove image
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white/60 px-4 py-5 text-sm text-stone-500">
            No images yet.
          </div>
        )}

        {canUploadImages ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-matcha-900/10 bg-white/70 px-4 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5">
              <input
                className="hidden"
                type="file"
                accept="image/*"
                multiple
                disabled={field.disabled || uploadState?.loading}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length) {
                    void onUploadFiles(field.name, files, field.uploadFolder);
                  }
                  event.target.value = "";
                }}
              />
              {uploadState?.loading ? "Uploading images..." : "Choose multiple images"}
            </label>

            {imagePaths.length ? (
              <button
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5"
                type="button"
                onClick={() => onChange(field.name, [])}
              >
                Remove all
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (field.type === "content-sections") {
    const sections = normalizeContentSections(value);

    const updateSection = (sectionIndex, patch) => {
      onChange(
        field.name,
        sections.map((section, index) =>
          index === sectionIndex
            ? {
                ...section,
                ...patch,
              }
            : section,
        ),
      );
    };

    return (
      <div className="grid gap-4">
        <div className="grid gap-1">
          <span className="text-sm font-semibold text-tea-900">{field.label}</span>
          {helper}
        </div>

        {sections.length ? (
          <div className="grid gap-4">
            {sections.map((section, index) => {
              const sectionUploadState =
                uploadState?.sectionIndex === index ? uploadState : null;
              const sectionImagePaths = normalizeSectionImagePaths(
                Array.isArray(section.imagePaths) && section.imagePaths.length
                  ? section.imagePaths
                  : section.imagePath,
              );

              return (
                <article
                  key={`${field.name}-${index}`}
                  className="grid gap-4 rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">
                        Section {index + 1}
                      </span>
                      <p className="mt-2 text-base font-semibold text-tea-900">
                        {section.title.trim() || "Untitled section"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-matcha-900/10 bg-white px-3 py-2 text-xs font-semibold text-tea-900"
                        type="button"
                        disabled={index === 0}
                        onClick={() =>
                          onChange(field.name, moveArrayItem(sections, index, index - 1))
                        }
                      >
                        Move up
                      </button>
                      <button
                        className="rounded-full border border-matcha-900/10 bg-white px-3 py-2 text-xs font-semibold text-tea-900"
                        type="button"
                        disabled={index === sections.length - 1}
                        onClick={() =>
                          onChange(field.name, moveArrayItem(sections, index, index + 1))
                        }
                      >
                        Move down
                      </button>
                      <button
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                        type="button"
                        onClick={() =>
                          onChange(
                            field.name,
                            sections.filter((_, currentIndex) => currentIndex !== index),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-tea-900">Section title</span>
                    <input
                      className={baseClass}
                      type="text"
                      value={section.title}
                      placeholder="Workshop atmosphere"
                      onChange={(event) =>
                        updateSection(index, {
                          title: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-tea-900">Section content</span>
                    <textarea
                      className={`${baseClass} min-h-28 resize-y`}
                      rows={5}
                      value={section.content}
                      placeholder="Describe this section in more detail."
                      onChange={(event) =>
                        updateSection(index, {
                          content: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-tea-900">
                      Section image paths
                    </span>
                    <textarea
                      className={`${baseClass} min-h-24 resize-y`}
                      rows={4}
                      value={sectionImagePaths.join("\n")}
                      placeholder={`/uploads/${field.uploadFolder ?? "content"}/section-1.jpg\n/uploads/${field.uploadFolder ?? "content"}/section-2.jpg`}
                      onChange={(event) =>
                        updateSection(index, createSectionImagePatch(event.target.value))
                      }
                    />
                    <span className="text-xs leading-6 text-stone-500">
                      One image path per line. The first image is also mirrored into the legacy
                      <code className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">
                        imagePath
                      </code>
                      field.
                    </span>
                  </label>

                  {sectionUploadState?.message ? (
                    <span className="text-xs leading-6 text-matcha-700">
                      {sectionUploadState.message}
                    </span>
                  ) : null}
                  {sectionUploadState?.error ? (
                    <span className="text-xs leading-6 text-red-700">
                      {sectionUploadState.error}
                    </span>
                  ) : null}

                  {sectionImagePaths.length ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {sectionImagePaths.map((imagePath, imageIndex) => (
                          <div
                            key={`${imagePath}-${imageIndex}`}
                            className="overflow-hidden rounded-[1.25rem] border border-matcha-900/10 bg-stone-50"
                          >
                            <SmartImage
                              className="h-36 w-full object-cover"
                              src={imagePath}
                              alt={section.title || field.label}
                              loading="lazy"
                              fallbackClassName="grid h-36 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                            />
                            <div className="grid gap-2 px-3 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-xs text-stone-500">
                                  {imagePath}
                                </span>
                                {imageIndex === 0 ? (
                                  <span className="rounded-full bg-matcha-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-matcha-700">
                                    Primary
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {imageIndex > 0 ? (
                                  <button
                                    className="rounded-full border border-matcha-900/10 bg-white px-3 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5"
                                    type="button"
                                    onClick={() =>
                                      updateSection(
                                        index,
                                        createSectionImagePatch([
                                          imagePath,
                                          ...sectionImagePaths.filter(
                                            (currentPath) => currentPath !== imagePath,
                                          ),
                                        ]),
                                      )
                                    }
                                  >
                                    Set as first
                                  </button>
                                ) : null}
                                <button
                                  className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5"
                                  type="button"
                                  onClick={() =>
                                    updateSection(
                                      index,
                                      createSectionImagePatch(
                                        sectionImagePaths.filter(
                                          (currentPath) => currentPath !== imagePath,
                                        ),
                                      ),
                                    )
                                  }
                                >
                                  Remove image
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-[1.15rem] border border-dashed border-matcha-900/15 bg-white/60 px-4 py-4 text-xs leading-6 text-stone-500">
                        Upload order is kept in <code>imagePaths[]</code>. The first item becomes
                        the hero image and mirrors into the legacy <code>imagePath</code> alias.
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white/60 px-4 py-5 text-sm text-stone-500">
                      No section images yet.
                    </div>
                  )}

                  {typeof onUploadFiles === "function" ? (
                    <div className="flex flex-wrap gap-3">
                      <label className="inline-flex w-fit cursor-pointer items-center justify-center rounded-full border border-matcha-900/10 bg-white/70 px-4 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5">
                        <input
                          className="hidden"
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={field.disabled || sectionUploadState?.loading}
                          onChange={(event) => {
                            const files = Array.from(event.target.files ?? []);

                            if (files.length) {
                              void onUploadFiles(field.name, files, field.uploadFolder, {
                                mode: "section-image",
                                sectionIndex: index,
                              });
                            }

                            event.target.value = "";
                          }}
                        />
                        {sectionUploadState?.loading
                          ? "Uploading section images..."
                          : "Upload section images"}
                      </label>

                      {sectionImagePaths.length ? (
                        <button
                          className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5"
                          type="button"
                          onClick={() => updateSection(index, createSectionImagePatch([]))}
                        >
                          Remove all images
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white/60 px-4 py-5 text-sm text-stone-500">
            No sections yet.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full border border-matcha-900/10 bg-white px-4 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5"
            type="button"
            onClick={() => onChange(field.name, [...sections, createEmptyContentSection()])}
          >
            Add section
          </button>

          {sections.length ? (
            <button
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5"
              type="button"
              onClick={() => onChange(field.name, [])}
            >
              Remove all sections
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-tea-900">{field.label}</span>
        <textarea
          className={`${baseClass} min-h-28 resize-y`}
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
          rows={field.rows ?? 5}
          value={value}
          disabled={field.disabled}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
        {helper}
      </label>
    );
  }

  if (field.type === "select") {
    const options = field.options ?? [];

    return (
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-tea-900">{field.label}</span>
        <select
          className={baseClass}
          name={field.name}
          required={field.required}
          value={value}
          disabled={field.disabled || options.length === 0}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          {options.length === 0 ? (
            <option value="">No data available</option>
          ) : (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
        {helper}
      </label>
    );
  }

  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-tea-900">{field.label}</span>
      <input
        className={baseClass}
        type={field.type ?? "text"}
        name={field.name}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        required={field.required}
        value={value}
        disabled={field.disabled}
        inputMode={field.inputMode}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
      {helper}
    </label>
  );
}
