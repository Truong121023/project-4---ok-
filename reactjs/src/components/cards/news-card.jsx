import { Card } from "../ui/card";
import { Tag } from "../ui/tag";
import { cn } from "../../lib/cn";

/**
 * NewsCard — article card with image, date, category tag, title, excerpt.
 * @param {string} [props.image]
 * @param {string} [props.date] — pre-formatted display string
 * @param {string} [props.category]
 * @param {string} props.title
 * @param {string} [props.excerpt]
 * @param {() => void} [props.onClick]
 * @param {string} [props.className]
 */
export function NewsCard({
  image,
  date,
  category,
  title,
  excerpt,
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
      {image && (
        <div className="aspect-[16/9] overflow-hidden bg-beige-100">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {category && <Tag>{category}</Tag>}
          {date && (
            <time className="text-xs text-ink-400 ml-auto">{date}</time>
          )}
        </div>
        <p className="font-semibold text-ink-900 leading-snug line-clamp-2 group-hover:text-matcha-700 transition-colors">
          {title}
        </p>
        {excerpt && (
          <p className="text-sm text-ink-500 leading-relaxed line-clamp-3">{excerpt}</p>
        )}
      </div>
    </Card>
  );
}

export default NewsCard;
