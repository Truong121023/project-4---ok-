import {
  formatDeliveryTypeLabel,
  getOrderStageMeta,
  getOrderProgress,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  resolveOrderStage,
  summarizeOrderStatus,
} from "../lib/orderStatus";

function badgeClass(tone) {
  const classes = {
    matcha: "bg-matcha-500/12 text-matcha-800 border-matcha-500/20",
    tea: "bg-tea-500/10 text-tea-900 border-tea-900/10",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
    stone: "bg-stone-200/70 text-stone-700 border-stone-300/70",
  };

  return classes[tone] ?? classes.tea;
}

function getOrderTone(status) {
  const normalizedStatus = String(status ?? "").toUpperCase();

  if (normalizedStatus === "COMPLETED") {
    return "matcha";
  }

  if (normalizedStatus === "CANCELLED") {
    return "red";
  }

  if (normalizedStatus === "PENDING") {
    return "amber";
  }

  return "tea";
}

function getPaymentTone(status) {
  const normalizedStatus = String(status ?? "").toUpperCase();

  if (normalizedStatus === "PAID") {
    return "matcha";
  }

  if (["CANCELLED", "FAILED"].includes(normalizedStatus)) {
    return "red";
  }

  return "amber";
}

function circleClass(state) {
  if (state === "completed") {
    return "border-matcha-600 bg-matcha-600 text-white";
  }

  if (state === "current") {
    return "border-tea-900 bg-tea-900 text-white";
  }

  return "border-matcha-900/15 bg-white text-stone-400";
}

function lineClass(state) {
  return state === "completed"
    ? "bg-matcha-600"
    : state === "current"
      ? "bg-tea-900/40"
      : "bg-matcha-900/10";
}

function stateLabel(state) {
  if (state === "completed") {
    return "Done";
  }

  if (state === "current") {
    return "Current";
  }

  return "Upcoming";
}

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

function getStepMeta(stepKey, order, state) {
  const normalizedStepKey = String(stepKey ?? "").toUpperCase();
  const createdAt = formatDateTime(order?.createdAt);
  const updatedAt = formatDateTime(order?.updatedAt);
  const paidAt = formatDateTime(order?.paidAt);
  const preparingStaffName = String(order?.preparingStaffName ?? "").trim();
  const deliveringShipperName = String(order?.deliveringShipperName ?? "").trim();

  if (state === "pending") {
    return [];
  }

  const prefix = state === "current" ? "Dang xu ly" : "Da xong";

  switch (normalizedStepKey) {
    case "PENDING":
      return createdAt ? [`${prefix}: ${createdAt}`] : [];
    case "CONFIRMED":
      return [
        paidAt ? `${prefix}: ${paidAt}` : updatedAt ? `Cap nhat: ${updatedAt}` : "",
      ].filter(Boolean);
    case "PREPARING":
      return [
        preparingStaffName ? `Staff: ${preparingStaffName}` : "",
        updatedAt ? `${state === "current" ? "Dang tu" : "Cap nhat"}: ${updatedAt}` : "",
      ].filter(Boolean);
    case "READY_FOR_SHIPPER":
      return [updatedAt ? `${prefix}: ${updatedAt}` : ""].filter(Boolean);
    case "OUT_FOR_DELIVERY":
      return [
        deliveringShipperName ? `Shipper: ${deliveringShipperName}` : "",
        updatedAt ? `${state === "current" ? "Dang tu" : "Cap nhat"}: ${updatedAt}` : "",
      ].filter(Boolean);
    case "COMPLETED":
      return [
        deliveringShipperName ? `Shipper: ${deliveringShipperName}` : "",
        updatedAt ? `Hoan tat: ${updatedAt}` : "",
      ].filter(Boolean);
    default:
      return updatedAt ? [`Cap nhat: ${updatedAt}`] : [];
  }
}

export default function OrderStatusTracker({ order, compact = false }) {
  const orderMeta = getOrderStatusMeta(order?.status);
  const paymentMeta = getPaymentStatusMeta(order?.paymentStatus);
  const stageMeta = getOrderStageMeta(resolveOrderStage(order));
  const steps = getOrderProgress(order);
  const currentStepIndex = steps.findIndex((step) => step.state === "current");
  const completedSteps = steps.filter((step) => step.state === "completed").length;

  return (
    <section className={compact ? "grid gap-4" : "grid gap-5"}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${badgeClass(getOrderTone(order?.status))}`}
        >
          Order: {orderMeta.label}
        </span>

        <span
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${badgeClass(getPaymentTone(order?.paymentStatus))}`}
        >
          Payment: {paymentMeta.label}
        </span>

        <span className="inline-flex items-center rounded-full border border-matcha-900/10 bg-white px-3 py-1.5 text-xs font-semibold text-tea-900">
          {formatDeliveryTypeLabel(order?.deliveryType)}
        </span>
      </div>

      <p className={`${compact ? "text-sm" : "text-sm"} leading-7 text-stone-600`}>
        {summarizeOrderStatus(order)}
      </p>

      <div className="rounded-[1.35rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,240,231,0.86))] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Current stage
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-tea-900">{stageMeta.label}</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">{stageMeta.description}</p>
          </div>

          <span className="rounded-full border border-matcha-900/10 bg-white px-4 py-2 text-sm font-semibold text-tea-900">
            {currentStepIndex >= 0
              ? `Step ${currentStepIndex + 1}/${steps.length}`
              : `${completedSteps}/${steps.length} done`}
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className="relative overflow-hidden rounded-[1.15rem] border border-matcha-900/10 bg-white/72 p-4"
          >
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute left-[1.55rem] top-[3.4rem] h-[calc(100%_-_2.6rem)] w-[2px] ${lineClass(step.state)}`}
              />
            ) : null}

            <div className="flex items-start gap-4">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-bold ${circleClass(step.state)}`}
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-tea-900">{step.label}</p>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      step.state === "completed"
                        ? "border-matcha-500/20 bg-matcha-500/12 text-matcha-800"
                        : step.state === "current"
                          ? "border-tea-900/10 bg-tea-500/10 text-tea-900"
                          : "border-matcha-900/10 bg-white text-stone-500"
                    }`}
                  >
                    {stateLabel(step.state)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-6 text-stone-500">
                  {step.state === "current"
                    ? "Buoc dang duoc xu ly."
                    : step.state === "completed"
                      ? "Buoc nay da hoan tat."
                      : "Buoc nay se den sau."}
                </p>
                {getStepMeta(step.key, order, step.state).length ? (
                  <div className="mt-2 grid gap-1 text-xs leading-6 text-stone-600">
                    {getStepMeta(step.key, order, step.state).map((meta, metaIndex) => (
                      <span key={`${step.key}-${metaIndex}`}>{meta}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
