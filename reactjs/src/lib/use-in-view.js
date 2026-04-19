import { useEffect, useState } from 'react';

/**
 * useInView — toggle `.in-view` class via IntersectionObserver.
 * @param {React.RefObject} ref  - ref attached to the DOM element
 * @param {object} options
 * @param {number} options.threshold - intersection ratio to trigger (default 0.15)
 * @param {boolean} options.once    - stop observing after first trigger (default true)
 * @returns {boolean} inView
 */
export function useInView(ref, { threshold = 0.15, once = true } = {}) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold, once]);

  return inView;
}
