import { useEffect, useRef } from "react";
import { useToast } from "../context/ToastContext";

export function useToastMessage(message, options = {}) {
  const toast = useToast();
  const lastMessageRef = useRef("");
  const {
    enabled = true,
    type = "info",
    title = "",
    duration,
    dedupeKey,
  } = options;

  useEffect(() => {
    const normalizedMessage = String(message ?? "").trim();

    if (!normalizedMessage) {
      lastMessageRef.current = "";
      return;
    }

    if (!enabled || normalizedMessage === lastMessageRef.current) {
      return;
    }

    toast.pushToast({
      type,
      title,
      message: normalizedMessage,
      duration,
      dedupeKey: dedupeKey ?? `${type}:${title}:${normalizedMessage}`,
    });
    lastMessageRef.current = normalizedMessage;
  }, [dedupeKey, duration, enabled, message, title, toast, type]);
}
