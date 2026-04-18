import { useEffect, useMemo, useState } from "react";
import { getImageCandidates } from "../lib/images";

export default function SmartImage({ src, alt, className, fallbackClassName, ...props }) {
  const candidates = useMemo(() => getImageCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [src]);

  const currentSrc = candidates[candidateIndex] ?? "";

  if (!currentSrc) {
    return (
      <div
        className={
          fallbackClassName ??
          "grid h-full w-full place-items-center bg-stone-100 text-xs text-stone-500"
        }
      >
        No image
      </div>
    );
  }

  return (
    <img
      {...props}
      className={className}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex((current) => current + 1);
        }
      }}
    />
  );
}
