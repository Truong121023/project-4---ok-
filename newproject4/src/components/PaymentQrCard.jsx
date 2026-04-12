import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { hasUsablePaymentSession, isPaymentExpired } from "../lib/orderStatus";

function formatDateTime(value) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRemainingTime(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s left`;
  }

  return `${seconds}s left`;
}

export default function PaymentQrCard({
  order,
  title = "PayOS QR",
  subtitle = "Scan this QR in your banking app or open PayOS from the payment button.",
  className = "",
}) {
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const paymentQrCode = String(order?.paymentQrCode ?? "").trim();
  const paymentCheckoutUrl = String(order?.paymentCheckoutUrl ?? "").trim();
  const paymentProvider = String(order?.paymentProvider ?? "").trim();
  const paymentReference = String(order?.paymentReference ?? "").trim();
  const paymentExpiresAt = String(order?.paymentExpiresAt ?? "").trim();
  const hasPaymentSession = hasUsablePaymentSession(order);
  const expired = isPaymentExpired(order);

  useEffect(() => {
    let cancelled = false;

    async function buildQrImage() {
      if (!paymentQrCode) {
        setQrImageUrl("");
        setQrError("");
        return;
      }

      try {
        const nextImageUrl = await QRCode.toDataURL(paymentQrCode, {
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
  }, [paymentQrCode]);

  useEffect(() => {
    if (!paymentExpiresAt || expired) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expired, paymentExpiresAt]);

  const countdownLabel = useMemo(() => {
    const expiresAt = Date.parse(paymentExpiresAt);

    if (Number.isNaN(expiresAt)) {
      return "";
    }

    return formatRemainingTime(expiresAt - currentTime);
  }, [currentTime, paymentExpiresAt]);

  if (!hasPaymentSession || !paymentQrCode) {
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
              alt="Payment QR"
            />
          ) : (
            <div className="grid h-[220px] w-[220px] place-items-center rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white p-4 text-center text-sm leading-6 text-stone-500">
              {paymentQrCode
                ? qrError || "Unable to render the PayOS QR right now."
                : "QR is unavailable for this payment session."}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center">
            {paymentProvider ? (
              <span className="rounded-full bg-matcha-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-matcha-700">
                {paymentProvider}
              </span>
            ) : null}
            {countdownLabel ? (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                  expired
                    ? "bg-amber-100 text-amber-900"
                    : "bg-tea-900/8 text-tea-900"
                }`}
              >
                {countdownLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">{title}</p>
          <p className="mt-3 text-base font-semibold text-tea-900">
            Use the backend-provided PayOS QR payload directly.
          </p>
          <p className="mt-2 text-sm leading-7 text-stone-600">{subtitle}</p>

          <div className="mt-4 grid gap-3 text-sm leading-7 text-stone-600">
            {paymentReference ? (
              <span className="break-all">
                Payment reference: <strong className="font-semibold text-tea-900">{paymentReference}</strong>
              </span>
            ) : null}
            {paymentExpiresAt ? (
              <span>
                Payment expires at:{" "}
                <strong className="font-semibold text-tea-900">
                  {formatDateTime(paymentExpiresAt) || paymentExpiresAt}
                </strong>
              </span>
            ) : null}
          </div>

          <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/70 px-4 py-3 text-sm leading-7 text-stone-600">
            The QR is rendered from <code>paymentQrCode</code>. The payment button should continue
            opening <code>paymentCheckoutUrl</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
