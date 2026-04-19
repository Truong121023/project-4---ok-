import { cn } from "../../lib/cn";

/**
 * PriceTag — displays price with optional strikethrough original.
 * Uses mono font for numerals per spec.
 * @param {string|number} props.price — current price
 * @param {string|number} [props.original] — original price (shows strikethrough)
 * @param {string} [props.currency='₫']
 */
export function PriceTag({ price, original, currency = "₫", className, ...rest }) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-2", className)}
      {...rest}
    >
      <span className="font-mono text-base font-semibold tracking-tight text-matcha-700">
        {typeof price === "number" ? price.toLocaleString("vi-VN") : price}
        <span className="ml-0.5 text-xs font-sans font-medium">{currency}</span>
      </span>
      {original != null && (
        <span className="font-mono text-sm text-ink-400 line-through">
          {typeof original === "number"
            ? original.toLocaleString("vi-VN")
            : original}
          <span className="ml-0.5 text-xs font-sans">{currency}</span>
        </span>
      )}
    </span>
  );
}

export default PriceTag;
