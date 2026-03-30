import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { ui } from "../ui";

export default function UserReviewForm({
  title,
  existingReview,
  canSubmit,
  loginPath = "/login",
  onSubmit,
  onDelete,
}) {
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setRating(Number(existingReview?.rating ?? 5));
    setReviewTitle(existingReview?.title ?? "");
    setComment(existingReview?.comment ?? "");
    setNotice("");
    setSubmitting(false);
  }, [existingReview]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      const message = "Please sign in with a USER account to submit a review.";
      setNotice(message);
      toast.error(message, { title: "Review" });
      return;
    }

    setSubmitting(true);

    try {
      const result = await onSubmit({
        rating,
        title: reviewTitle,
        comment,
      });

      const message = result?.message ?? "Review saved.";
      setNotice(message);
      if (result?.ok === false) {
        toast.error(message, { title: "Review" });
      } else {
        toast.success(message, { title: "Review" });
      }
    } catch (error) {
      const message = error?.message || "Unable to save the review right now.";
      setNotice(message);
      toast.error(message, { title: "Review" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview || typeof onDelete !== "function") {
      return;
    }

    setSubmitting(true);

    try {
      const result = await onDelete(existingReview);
      const message = result?.message ?? "Review deleted.";
      setNotice(message);
      if (result?.ok === false) {
        toast.error(message, { title: "Review" });
      } else {
        toast.success(message, { title: "Review" });
      }
    } catch (error) {
      const message = error?.message || "Unable to delete the review right now.";
      setNotice(message);
      toast.error(message, { title: "Review" });
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
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Review</span>
          <h3 className="mt-2 text-xl font-semibold text-tea-900">{title}</h3>
        </div>
        {existingReview ? (
          <span className={ui.pill}>
            {existingReview.approved === false ? "Saved" : "Visible"}
          </span>
        ) : null}
      </div>

      <p className="text-sm leading-7 text-stone-600">
        Chia se trai nghiem cua ban mot cach ngan gon, ro rang va lich su.
      </p>

      <div className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Rating</span>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              className={
                value === rating
                  ? ui.primaryButton
                  : "inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/70 px-4 py-2 text-sm font-semibold text-tea-900"
              }
              type="button"
              onClick={() => setRating(value)}
            >
              {value} star{value > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Title</span>
        <input
          className={ui.input}
          type="text"
          placeholder="Write a short headline for your review"
          value={reviewTitle}
          onChange={(event) => setReviewTitle(event.target.value)}
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Review</span>
        <textarea
          className={`${ui.input} min-h-28 resize-y`}
          placeholder="Share your experience"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>

      {notice ? <p className="text-sm leading-7 text-stone-600">{notice}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button className={ui.primaryButton} type="submit" disabled={submitting}>
          {submitting
            ? "Submitting..."
            : existingReview
              ? "Update review"
              : "Submit review"}
        </button>

        {existingReview && typeof onDelete === "function" ? (
          <button className={ui.secondaryButton} type="button" disabled={submitting} onClick={handleDelete}>
            Delete review
          </button>
        ) : null}

        {!canSubmit ? (
          <Link className={ui.secondaryButton} to={loginPath}>
            Sign in
          </Link>
        ) : null}
      </div>
    </form>
  );
}
