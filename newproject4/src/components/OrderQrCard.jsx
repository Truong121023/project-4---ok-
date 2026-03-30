import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getOrderPublicQrHref } from "../lib/orderWorkflow";

export default function OrderQrCard({
  order,
  title = "Order QR",
  subtitle = "Quet ma nay de mo hoa don cong khai. App noi bo co the quet cung ma nay va tu tach token.",
  className = "",
}) {
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const publicQrHref = getOrderPublicQrHref(order);
  const qrToken = String(order?.orderQrToken ?? "").trim();

  useEffect(() => {
    let cancelled = false;

    async function buildQrImage() {
      if (!publicQrHref) {
        setQrImageUrl("");
        setQrError("");
        return;
      }

      try {
        const nextImageUrl = await QRCode.toDataURL(publicQrHref, {
          width: 220,
          margin: 1,
          color: {
            dark: "#2f2619",
            light: "#fffdf8",
          },
        });

        if (!cancelled) {
          setQrImageUrl(nextImageUrl);
          setQrError("");
        }
      } catch (error) {
        if (!cancelled) {
          setQrImageUrl("");
          setQrError(error instanceof Error ? error.message : "Unable to render QR.");
        }
      }
    }

    void buildQrImage();

    return () => {
      cancelled = true;
    };
  }, [publicQrHref]);

  if (!publicQrHref && !qrToken) {
    return null;
  }

  return (
    <div
      className={`rounded-[1.5rem] border border-matcha-900/10 bg-white/76 p-5 shadow-[0_18px_44px_rgba(79,70,45,0.08)] ${className}`.trim()}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex w-full max-w-[240px] flex-col items-center rounded-[1.5rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,240,231,0.9))] p-4">
          {qrImageUrl ? (
            <img
              className="h-[220px] w-[220px] rounded-[1.25rem] border border-matcha-900/10 bg-white p-2"
              src={qrImageUrl}
              alt="Order QR"
            />
          ) : (
            <div className="grid h-[220px] w-[220px] place-items-center rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white p-4 text-center text-sm leading-6 text-stone-500">
              {qrError ? "Khong the render QR luc nay." : "Dang tao QR..."}
            </div>
          )}

          <a
            className="mt-4 inline-flex rounded-full border border-matcha-900/10 bg-white px-4 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-foam"
            href={publicQrHref}
            rel="noreferrer"
            target="_blank"
          >
            Mo hoa don cong khai
          </a>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">{title}</p>
          <p className="mt-3 text-base font-semibold text-tea-900">
            Ma QR nay co the quet truc tiep ngay trong app.
          </p>
          <p className="mt-2 text-sm leading-7 text-stone-600">{subtitle}</p>

          <div className="mt-4 grid gap-3 text-sm leading-7 text-stone-600">
            {order?.invoiceNumber ? <span>Hoa don: {order.invoiceNumber}</span> : null}
            {qrToken ? (
              <span className="break-all">
                QR token: <strong className="font-semibold text-tea-900">{qrToken}</strong>
              </span>
            ) : null}
            {publicQrHref ? (
              <span className="break-all">
                Public QR URL: <strong className="font-semibold text-tea-900">{publicQrHref}</strong>
              </span>
            ) : null}
          </div>

          <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/70 px-4 py-3 text-sm leading-7 text-stone-600">
            `USER` quet se mo invoice cong khai. `STAFF/SHIPPER` quet trong app noi bo se tu lay
            token tu URL nay truoc khi gui len backend.
          </div>
        </div>
      </div>
    </div>
  );
}
