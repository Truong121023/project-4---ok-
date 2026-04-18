import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { feedbackCategoryOptions, normalizeFeedbackCategory } from "../lib/feedbackCategories";
import { ui } from "../ui";

export default function UserFeedbackForm({
  title = "Send feedback",
  canSubmit,
  loginPath = "/login",
  storeOptions = [],
  onSubmit,
}) {
  const [category, setCategory] = useState(feedbackCategoryOptions[0]?.value ?? "GENERAL");
  const [relatedStoreId, setRelatedStoreId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedStoreOptions = useMemo(
    () =>
      Array.isArray(storeOptions)
        ? storeOptions.filter((option) => option?.value && option?.label)
        : [],
    [storeOptions],
  );

  useEffect(() => {
    setCategory((current) => normalizeFeedbackCategory(current));
    setNotice("");
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (relatedStoreId || !normalizedStoreOptions.length) {
      return;
    }

    setRelatedStoreId(normalizedStoreOptions[0].value);
  }, [normalizedStoreOptions, relatedStoreId]);

  const resetForm = () => {
    setCategory(feedbackCategoryOptions[0]?.value ?? "GENERAL");
    setRelatedStoreId(normalizedStoreOptions[0]?.value ?? "");
    setSubject("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setNotice("Please sign in with a USER account to send feedback.");
      return;
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!category || !relatedStoreId || !trimmedSubject || !trimmedMessage) {
      setNotice("Please fill in the category, store, subject, and message.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await onSubmit({
        category,
        relatedStoreId,
        subject: trimmedSubject,
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
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Feedback</span>
          <h3 className="mt-2 text-xl font-semibold text-tea-900">{title}</h3>
        </div>
      </div>

      <p className="text-sm leading-7 text-stone-600">
        Share feedback about the service, products, or your overall experience. Every message is
        stored under your current account.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Feedback category</span>
          <select
            className={ui.input}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {feedbackCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Related store</span>
          <select
            className={ui.input}
            value={relatedStoreId}
            onChange={(event) => setRelatedStoreId(event.target.value)}
            disabled={!normalizedStoreOptions.length}
          >
            <option value="">
              {!normalizedStoreOptions.length ? "Loading stores..." : "Select a store"}
            </option>
            {normalizedStoreOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Subject</span>
        <input
          className={ui.input}
          type="text"
          placeholder="Write a short summary of the issue"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Message</span>
        <textarea
          className={`${ui.input} min-h-32 resize-y`}
          placeholder="Describe your feedback in more detail"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>

      {notice ? <p className="text-sm leading-7 text-stone-600">{notice}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          className={ui.primaryButton}
          type="submit"
          disabled={submitting || !normalizedStoreOptions.length}
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
