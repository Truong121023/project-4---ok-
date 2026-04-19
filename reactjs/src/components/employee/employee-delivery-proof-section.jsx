import { useTranslation } from "react-i18next";
import { ui } from "../../ui";
import { formatDateTimeVn } from "../../lib/locale";

/**
 * EmployeeDeliveryProofSection — upload form + current proof preview for shippers.
 * Inputs are h-11 (44 px) for touch comfort.
 *
 * @param {object}   props.order
 * @param {string}   props.deliveryProofPreviewUrl
 * @param {object}   props.proofForm               — { note, capturedAt, uploading, inputKey }
 * @param {Function} props.onProofUpload
 * @param {Function} props.onProofFileChange
 * @param {Function} props.onProofNoteChange
 * @param {Function} props.onProofCapturedAtChange
 */
export function EmployeeDeliveryProofSection({
  order,
  deliveryProofPreviewUrl,
  proofForm,
  onProofUpload,
  onProofFileChange,
  onProofNoteChange,
  onProofCapturedAtChange,
}) {
  const { t } = useTranslation("employee");

  return (
    <div className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={ui.eyebrow}>{t("deliveryProof.eyebrow")}</p>
          <p className="mt-1 text-sm leading-6 text-ink-600">
            {t("deliveryProof.description")}
          </p>
        </div>
        {order.deliveryProofUploadedAt ? (
          <span className={ui.pill}>
            {t("deliveryProof.uploadedBadge", { date: formatDateTimeVn(order.deliveryProofUploadedAt) })}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Preview pane */}
        <div className="rounded-lg border border-ink-900/10 bg-cream-100 p-4">
          {deliveryProofPreviewUrl ? (
            <img
              className="h-64 w-full rounded-lg object-cover"
              src={deliveryProofPreviewUrl}
              alt={t("deliveryProof.eyebrow")}
            />
          ) : (
            <div className="grid h-64 place-items-center rounded-lg border border-dashed border-ink-900/15 bg-beige-100 px-4 text-center text-sm leading-7 text-ink-400">
              {t("deliveryProof.noImage")}
            </div>
          )}
          {order.deliveryProofNote ? (
            <p className="mt-3 text-sm leading-6 text-ink-600">
              {t("deliveryProof.noteLabel", { note: order.deliveryProofNote })}
            </p>
          ) : null}
          {order.deliveryProofCapturedAt ? (
            <p className="mt-2 text-xs text-ink-400">
              {t("deliveryProof.capturedLabel", { date: formatDateTimeVn(order.deliveryProofCapturedAt) })}
            </p>
          ) : null}
        </div>

        {/* Upload form — inputs h-11 = 44 px */}
        <form className="grid gap-3" onSubmit={onProofUpload}>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
              {t("deliveryProof.proofImageLabel")}
            </span>
            <input
              key={proofForm.inputKey}
              accept="image/*"
              className={`${ui.input} h-11`}
              type="file"
              onChange={onProofFileChange}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
              {t("deliveryProof.capturedAtLabel")}
            </span>
            <input
              className={`${ui.input} h-11`}
              type="datetime-local"
              value={proofForm.capturedAt}
              onChange={(e) => onProofCapturedAtChange(e.target.value)}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
              {t("deliveryProof.noteFieldLabel")}
            </span>
            <textarea
              className={`${ui.input} min-h-[100px] resize-y`}
              placeholder={t("deliveryProof.notePlaceholder")}
              value={proofForm.note}
              onChange={(e) => onProofNoteChange(e.target.value)}
            />
          </label>

          <div>
            <button
              className={ui.primaryButton}
              disabled={proofForm.uploading}
              type="submit"
            >
              {proofForm.uploading ? t("deliveryProof.uploadingButton") : t("deliveryProof.uploadButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeDeliveryProofSection;
