import { useState } from "react";
import { useSiteData } from "../context/SiteDataContext";
import { useToast } from "../context/ToastContext";
import { ui } from "../ui";

export default function QuickFavoriteButton({
  targetType,
  targetId,
  className,
  activeClassName,
  inactiveClassName,
  activeLabel = "Saved",
  inactiveLabel = "Save",
  loadingLabel = "Saving...",
  onResult,
}) {
  const { isFavorite, toggleFavorite } = useSiteData();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const active = isFavorite(targetType, targetId);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!targetId) {
      const message = "Unable to determine this favorite item.";
      toast.error(message, { title: "Favorite" });
      onResult?.(message);
      return;
    }

    setLoading(true);

    try {
      const result = await toggleFavorite(targetType, targetId);
      if (result?.message) {
        if (result.ok) {
          toast.success(result.message, { title: "Favorite" });
        } else {
          toast.error(result.message, { title: "Favorite" });
        }
      }
      onResult?.(result.message, result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={
        className ??
        (active
          ? activeClassName ?? ui.primaryButton
          : inactiveClassName ?? ui.secondaryButton)
      }
      type="button"
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? loadingLabel : active ? activeLabel : inactiveLabel}
    </button>
  );
}
