import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/cn";

/**
 * StoreCard — store listing with image, name, address, distance badge, hours.
 * @param {string} [props.image]
 * @param {string} props.name
 * @param {string} [props.address]
 * @param {string} [props.distance] — e.g. "1.2 km"
 * @param {string} [props.hours] — e.g. "07:00 – 22:00"
 * @param {boolean} [props.open] — is store currently open
 * @param {() => void} [props.onClick]
 * @param {string} [props.className]
 */
export function StoreCard({
  image,
  name,
  address,
  distance,
  hours,
  open: isOpen,
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
      <div className="relative aspect-video overflow-hidden bg-beige-100">
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl text-beige-300">
            🏪
          </div>
        )}
        {distance && (
          <span className="absolute right-3 top-3">
            <Badge variant="beige">{distance}</Badge>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-ink-900 leading-tight">{name}</p>
          {isOpen !== undefined && (
            <Badge variant={isOpen ? "success" : "ink"}>
              {isOpen ? "Open" : "Closed"}
            </Badge>
          )}
        </div>
        {address && (
          <p className="text-xs text-ink-500 line-clamp-2 leading-relaxed">{address}</p>
        )}
        {hours && (
          <p className="text-xs text-ink-400">⏰ {hours}</p>
        )}
      </div>
    </Card>
  );
}

export default StoreCard;
