import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "../context/ToastContext";
import { getOrderInvoicePreviewHref } from "../lib/orderWorkflow";

export default function InvoicePreviewModal({
  order,
  open = false,
  onClose,
  title = "Xuat hoa don",
}) {
  const toast = useToast();
  const iframeRef = useRef(null);
  const [frameLoading, setFrameLoading] = useState(true);
  const invoiceUrl = getOrderInvoicePreviewHref(order);
  const invoiceLabel = order?.invoiceNumber
    ? `Hoa don ${order.invoiceNumber}`
    : order?.id
      ? `Hoa don don #${order.id}`
      : "Hoa don";

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handlePrint = useCallback(() => {
    if (!invoiceUrl) {
      toast.warning("Hoa don nay chua co duong dan preview de in.", {
        title: "Hoa don",
      });
      return;
    }

    try {
      const frameWindow = iframeRef.current?.contentWindow;

      if (!frameWindow) {
        throw new Error("Preview frame is not ready.");
      }

      frameWindow.focus?.();
      frameWindow.print?.();
    } catch {
      toast.warning("Trinh duyet dang chan in truc tiep trong popup. Hay bam Mo tab moi roi Ctrl+P.", {
        title: "Hoa don",
      });
    }
  }, [invoiceUrl, toast]);

  useEffect(() => {
    if (!open) {
      setFrameLoading(true);
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose, handlePrint, open]);

  if (!open || !invoiceUrl) {
    return null;
  }

  const modal = (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(36,29,20,0.44)] px-2 py-2 backdrop-blur-sm sm:px-4 sm:py-4 xl:px-6 xl:py-6">
      <div className="relative flex h-[96vh] w-[min(98vw,1680px)] flex-col overflow-hidden rounded-[2rem] border border-matcha-900/10 bg-[#f8f4ec] shadow-[0_28px_80px_rgba(39,30,19,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-matcha-900/10 bg-white/78 px-5 py-4 lg:px-7 lg:py-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-tea-700">{title}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-tea-900">{invoiceLabel}</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              Xem truoc hoa don ngay trong popup. Ban co the bam <strong>In hoa don</strong> hoac
              nhan <strong>Ctrl+P</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-5 py-3 text-sm font-semibold text-foam shadow-[0_16px_30px_rgba(89,108,61,0.24)] transition hover:-translate-y-0.5"
              type="button"
              onClick={handlePrint}
            >
              In hoa don
            </button>
            <a
              className="inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/70 px-5 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
              href={invoiceUrl}
              rel="noreferrer"
              target="_blank"
            >
              Mo tab moi
            </a>
            <button
              className="inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/70 px-5 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
              type="button"
              onClick={handleClose}
            >
              Dong
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-[#efe8db]">
          {frameLoading ? (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#f6f1e8]/80">
              <div className="rounded-[1.4rem] border border-matcha-900/10 bg-white/82 px-6 py-5 text-center shadow-[0_18px_44px_rgba(79,70,45,0.08)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Invoice Preview
                </p>
                <p className="mt-3 text-base font-semibold text-tea-900">Dang tai hoa don...</p>
              </div>
            </div>
          ) : null}

          <iframe
            ref={iframeRef}
            className="h-full w-full bg-white"
            src={invoiceUrl}
            title={invoiceLabel}
            onLoad={() => setFrameLoading(false)}
          />
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modal;
  }

  return createPortal(modal, document.body);
}
