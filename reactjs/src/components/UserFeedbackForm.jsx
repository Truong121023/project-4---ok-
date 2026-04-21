import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ui } from "../ui";

export default function UserFeedbackForm({
  title = "Leave order feedback",
  canSubmit,
  loginPath = "/login",
  orderOptions = [],
  onSubmit,
}) {
  const [relatedOrderId, setRelatedOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedOrderOptions = useMemo(
    () =>
      Array.isArray(orderOptions)
        ? orderOptions.filter((option) => option?.value && option?.label)
        : [],
    [orderOptions],
  );

  useEffect(() => {
    setNotice("");
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (relatedOrderId || !normalizedOrderOptions.length) {
      return;
    }

    setRelatedOrderId(normalizedOrderOptions[0].value);
  }, [normalizedOrderOptions, relatedOrderId]);

  const resetForm = () => {
    setRelatedOrderId(normalizedOrderOptions[0]?.value ?? "");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setNotice("Please sign in with a USER account to leave feedback.");
      return;
    }

    const trimmedMessage = message.trim();

    if (!relatedOrderId || !trimmedMessage) {
      setNotice("Please choose a completed order and write your feedback.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await onSubmit({
        relatedOrderId,
        message: trimmedMessage,
      });

      setNotice(result?.message ?? "Feedback sent.");

      if (result?.ok) {
        resetForm();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="grid gap-4 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-5"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            Order feedback
          </span>
          <h3 className="mt-2 text-xl font-semibold text-tea-900">{title}</h3>
        </div>
      </div>

      <p className="text-sm leading-7 text-stone-600">
        Feedback can only be submitted for orders that were completed successfully. Each order can
        receive one feedback entry.
      </p>

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
          Completed order
        </span>
        <select
          className={ui.input}
          value={relatedOrderId}
          onChange={(event) => setRelatedOrderId(event.target.value)}
          disabled={!normalizedOrderOptions.length}
        >
          <option value="">
            {!normalizedOrderOptions.length ? "No eligible orders yet" : "Choose an order"}
          </option>
          {normalizedOrderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Message</span>
        <textarea
          className={`${ui.input} min-h-32 resize-y`}
          placeholder="Tell the store how the order experience went."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>

      {notice ? <p className="text-sm leading-7 text-stone-600">{notice}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          className={ui.primaryButton}
          type="submit"
          disabled={submitting || !normalizedOrderOptions.length}
        >
          {submitting ? "Sending..." : "Send feedback"}
        </button>

        {!canSubmit ? (
          <Link className={ui.secondaryButton} to={loginPath}>
            Sign in
          </Link>
        ) : null}
      </div>
    </form>
  );
}
