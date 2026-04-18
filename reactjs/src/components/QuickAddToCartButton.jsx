import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { useToast } from "../context/ToastContext";
import { ui } from "../ui";

export default function QuickAddToCartButton({
  dishId,
  storeId,
  quantity = 1,
  blocked = false,
  blockedMessage = "",
  preorderOnly = false,
  preorderMessage = "Added to cart. This item is currently available for preorder only.",
  resolvePayload,
  className,
  children = "Add to cart",
  onResult,
}) {
  const auth = useAuth();
  const { addToCart } = useSiteData();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (auth.isAuthenticated && !auth.hasRole("USER")) {
      const message = "Only USER accounts can add items to the cart.";
      toast.error(message, { title: "Cart" });
      onResult?.(message);
      return;
    }

    setLoading(true);

    try {
      let nextDishId = dishId;
      let nextStoreId = storeId;
      let nextQuantity = quantity;
      let nextBlocked = blocked;
      let nextBlockedMessage = blockedMessage;
      let nextPreorderOnly = preorderOnly;
      let nextPreorderMessage = preorderMessage;

      if (resolvePayload) {
        const resolvedPayload = await resolvePayload();

        if (resolvedPayload) {
          nextDishId = resolvedPayload.dishId ?? nextDishId;
          nextStoreId = resolvedPayload.storeId ?? nextStoreId;
          nextQuantity = resolvedPayload.quantity ?? nextQuantity;
          nextBlocked = resolvedPayload.blocked ?? nextBlocked;
          nextBlockedMessage = resolvedPayload.blockedMessage ?? nextBlockedMessage;
          nextPreorderOnly = resolvedPayload.preorderOnly ?? nextPreorderOnly;
          nextPreorderMessage = resolvedPayload.preorderMessage ?? nextPreorderMessage;
        }
      }

      if (nextBlocked || !nextDishId || !nextStoreId) {
        const message = nextBlockedMessage || "This item cannot be added to the cart right now.";
        toast.warning(message, { title: "Cart" });
        onResult?.(message);
        return;
      }

      const result = await addToCart({
        itemId: nextDishId,
        storeId: nextStoreId,
        quantity: nextQuantity,
      });

      const message =
        result.ok && nextPreorderOnly ? nextPreorderMessage || result.message : result.message;

      if (message) {
        if (result.ok) {
          toast.success(message, { title: "Cart" });
        } else {
          toast.error(message, { title: "Cart" });
        }
      }

      onResult?.(message, {
        ...result,
        preorderOnly: nextPreorderOnly,
      });
    } catch (error) {
      const message = error?.message || "Unable to add this item to the cart right now.";
      toast.error(message, { title: "Cart" });
      onResult?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={className ?? ui.primaryButton}
      type="button"
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? "Adding..." : children}
    </button>
  );
}
