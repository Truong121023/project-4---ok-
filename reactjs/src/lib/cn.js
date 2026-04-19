/**
 * Tiny class name joiner — filters falsy values, joins with space.
 * Replaces clsx/classnames. No external dep.
 * @param {...(string|undefined|null|false|0)} args
 * @returns {string}
 */
export function cn(...args) {
  return args.filter(Boolean).join(" ");
}
