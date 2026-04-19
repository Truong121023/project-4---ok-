import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { PriceTag } from "../ui/price-tag";
import { Button } from "../ui/button";
import { cn } from "../../lib/cn";

/**
 * DishCard — menu item card with image, name, price, badges, add-to-cart.
 * @param {object} props
 * @param {string} [props.image]
 * @param {string} props.name
 * @param {number} props.price
 * @param {number} [props.originalPrice]
 * @param {string[]} [props.badges] — e.g. ['New', 'Hot']
 * @param {() => void} [props.onAddToCart]
 * @param {() => void} [props.onClick] — card click handler
 * @param {string} [props.className]
 */
export function DishCard({
  image,
  name,
  price,
  originalPrice,
  badges = [],
  onAddToCart,
  onClick,
  className,
  ...rest
}) {
  return (
    <Card
      variant="raised"
      padding="none"
      className={cn("overflow-hidden cursor-pointer group", className)}
      onClick={onClick}
      {...rest}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-beige-100">
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-beige-300">
            🍵
          </div>
        )}
        {badges.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {badges.map((b) => (
              <Badge key={b} variant="matcha">{b}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4">
        <p className="font-semibold text-ink-900 leading-tight line-clamp-2">{name}</p>
        <div className="flex items-center justify-between gap-2">
          <PriceTag price={price} original={originalPrice} />
          {onAddToCart && (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
              aria-label={`Add ${name} to cart`}
            >
              + Add
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default DishCard;
