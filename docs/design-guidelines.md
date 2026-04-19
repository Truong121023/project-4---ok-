# Kamatcha Zen Design Guidelines

## Overview

Kamatcha Zen is a premium matcha store chain with a minimalist Japanese aesthetic. The design system emphasizes whitespace, natural materials, and calm sophistication—reflecting traditional Zen philosophy applied to modern e-commerce.

**Build Size:** 271.71 kB gzipped  
**Tech Stack:** Tailwind CSS v4 with `@theme` tokens, CSS custom properties, no runtime dependencies

---

## Color Palette

### Matcha Green Scale
Core accent colors reflecting premium matcha tea aesthetic.

```
--color-matcha-50:  #f4f7f0   (very light)
--color-matcha-100: #e4ecdd
--color-matcha-200: #c9d9ba
--color-matcha-300: #a8c290
--color-matcha-400: #8aab68
--color-matcha-500: #7a9a3e   (primary accent)
--color-matcha-600: #647f33
--color-matcha-700: #4a6426
--color-matcha-800: #364a1c
--color-matcha-900: #2a3a1e
```

### Cream Scale
Background and soft surface colors.

```
--color-cream-50:  #fbf8f1
--color-cream-100: #f5f0e4   (primary background)
--color-cream-200: #ede4d0
```

### Beige Scale
Neutral mid-tone surfaces.

```
--color-beige-100: #f0ebe0
--color-beige-200: #e5dece
--color-beige-300: #d4cbba
--color-beige-400: #bfb49f
```

### Ink Scale
Text and dark content.

```
--color-ink-400: #8a8f82   (secondary text)
--color-ink-500: #6e7467
--color-ink-600: #5a5f52   (body text)
--color-ink-700: #3f4439
--color-ink-800: #2e3229
--color-ink-900: #1f231a   (primary text)
```

### Semantic Aliases
- `--color-bg`: Cream-50 (page background)
- `--color-surface`: Cream-100 (raised surfaces)
- `--color-surface-raised`: Cream-50
- `--color-border-hairline`: oklch(0% 0 0 / 0.08)
- `--color-accent`: Matcha-500 (interactive elements)
- `--color-accent-soft`: Matcha-100 (backgrounds, highlights)

### Status Colors (Muted Palette)
- `--color-success`: #4a7c45 | soft: #e6f0e5
- `--color-warn`: #8a6a20 | soft: #f5eedb
- `--color-danger`: #8a3028 | soft: #f5e5e3

**Note:** Gold removed from palette per brand guidelines. All accent/interactive states use matcha green.

---

## Typography

### Font Stack
- **Display:** Noto Serif Display, Lora, serif (headings, hero text)
- **Body:** Inter, system-ui, sans-serif (body copy, UI)
- **Accent/Code:** JetBrains Mono (monospace for technical content)

### Heading Scales (Fluid)
Responsive sizing using CSS `clamp()` for smooth scaling across viewports.

```
h1: clamp(2rem, 4vw + 1rem, 3.75rem)
h2: clamp(1.5rem, 2.5vw + 0.75rem, 2.5rem)
h3: clamp(1.25rem, 1.5vw + 0.5rem, 1.875rem)
```

### Heading Styles
- Weight: 600
- Letter-spacing: -0.02em
- Line-height: 1.15
- Color: Ink-900

### Body Text
- Font-size: 16px (airy) / 14px (compact)
- Line-height: 1.6 (airy) / 1.5 (compact)
- Color: Ink-900
- Font optical sizing: enabled

---

## Spacing System

### Ma (間) — Zen Whitespace
Named after the Japanese concept of "negative space" that defines form.

#### Airy Density (Customer Facing)
```
--spacing-ma-xs:  8px
--spacing-ma-sm:  16px
--spacing-ma-md:  24px
--spacing-ma-lg:  40px
--spacing-ma-xl:  64px
--spacing-ma-2xl: 96px
```

#### Compact Density (Admin/Employee)
```
--spacing-ma-xs:  6px
--spacing-ma-sm:  12px
--spacing-ma-md:  16px
--spacing-ma-lg:  24px
--spacing-ma-xl:  40px
--spacing-ma-2xl: 64px
```

---

## Motion & Animation

### Scroll Reveal
Subtle entrance animation for hero content and sections as they come into view.

```css
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 500ms ease-out, transform 500ms ease-out;
}
.reveal-on-scroll.in-view {
  opacity: 1;
  transform: none;
}
```

### Toast Notifications
Slide-in from top with soft easing.

```css
@keyframes toast-slide-in {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.toast-enter {
  animation: toast-slide-in 180ms ease-out;
}
```

### Accessibility
- All animations respect `prefers-reduced-motion: reduce`
- Transitions disabled when system prefers reduced motion

---

## Border Radius

Subtle rounding for soft, approachable appearance.

```
--radius-sm:   6px
--radius-md:   12px   (default for cards, inputs)
--radius-lg:   20px   (large interactive elements)
--radius-xl:   28px   (hero sections, modals)
--radius-pill: 999px  (fully rounded buttons/badges)
```

---

## Shadows

Layered, soft shadows create depth without harshness.

```
--shadow-hairline: inset 0 0 0 1px oklch(0% 0 0 / 0.08)
--shadow-soft:     0 4px 16px oklch(35% 0.08 140 / 0.08)   (default elevations)
--shadow-lift:     0 8px 32px oklch(35% 0.08 140 / 0.12)   (interactive hover states)
```

---

## Density Modes

The design system supports two distinct density modes applied via CSS classes:

### Density: Airy (`.density-airy`)
**Applied to:** Customer-facing pages (home, product detail, checkout, loyalty)

- Font-size: 16px
- Line-height: 1.6
- Spacing: Generous (ma-xs through ma-2xl at full scale)
- Goal: Calm, spacious experience reflecting premium tea store aesthetic

### Density: Compact (`.density-compact`)
**Applied to:** Admin panel, employee dashboard, internal tools

- Font-size: 14px
- Line-height: 1.5
- Spacing: Reduced by ~25% for information density
- Goal: Efficient workflows for operational users

---

## Gradients

### Gradient: Matcha Mist
Soft diagonal gradient blending cream, matcha, and cream—used for hero backgrounds and feature sections.

```css
.gradient-matcha-mist {
  background: linear-gradient(135deg, #fbf8f1 0%, #f4f7f0 50%, #f5f0e4 100%);
}
```

### Gradient: Stone
Warm neutral gradient for secondary backgrounds and containers.

```css
.gradient-stone {
  background: linear-gradient(135deg, #f0ebe0 0%, #ede4d0 50%, #e5dece 100%);
}
```

---

## Component Primitives

26 UI primitives available in `src/components/ui/`:

**Form Controls:** Button, IconButton, Input, Textarea, Checkbox, Radio, Select, Switch  
**Feedback:** Toast, Tooltip, Badge, Tag  
**Layout:** Card, Dialog, Sheet, Breadcrumb, Pagination, Table  
**Content:** Avatar, Empty State, Skeleton, Stepper  
**Navigation:** Tabs  
**Pricing:** Price Tag  

All primitives follow Zen design language with matcha green accents, soft shadows, and respectful whitespace.

---

## Domain Components

### Cards (3)
- **Dish Card:** Product showcase with image, title, description, price, and action buttons
- **News Card:** Promotional/blog content with image, headline, and metadata
- **Store Card:** Location/outlet info with address, hours, distance

### Admin Components (4)
- **Admin Data Table:** Paginated data with sorting, filtering, compact density
- **Admin Form Grid:** Multi-column form layout for resource creation/editing
- **Admin Page Header:** Section title with breadcrumb and action buttons
- **Admin Stat Card:** KPI display with value, label, and trend indicator

### Employee Components (6)
- **Order Card:** Compact order summary with status, items, and quick actions
- **Order Detail Panel:** Full order context (items, customer, delivery info, timeline)
- **Orders Panel:** Paginated list of active/recent orders
- **Header Section:** User greeting, shift status, notifications badge
- **Notifications Panel:** Order alerts and system messages
- **Delivery Proof Section:** Photo upload and timestamp for fulfillment

### Page Templates (6)
- **Customer Home:** Hero, featured products, store locator, loyalty call-to-action
- **Customer Product Detail:** Image gallery, product info, customization, reviews, related items
- **Customer Checkout:** Cart review, shipping form, payment, order summary
- **Admin Dashboard:** Analytics, resource management tables, system health
- **Employee Dashboard:** Active orders, notifications, delivery map, shift info
- **Public Store Locator:** Interactive map, store cards, hours, contact info

---

## Implementation Notes

1. **No runtime dependencies added** — All tokens are CSS custom properties in Tailwind v4 `@theme` block
2. **WCAG 2.1 AA compliant** — Color contrast checked; focus states visible; animations respect motion preferences
3. **Cross-browser tested** — Webkit scrollbar styling, vendor-prefixed font smoothing included
4. **Responsive by default** — Fluid typography, density modes via CSS classes, no JS required for theming
5. **Brand consistency** — All 33 pages restyled with unified token set; no inline color codes

---

## Resources

- **Tokens file:** `reactjs/src/styles.css` (lines 1–78)
- **Base & utility layers:** `reactjs/src/styles.css` (lines 80–243)
- **Component library:** `reactjs/src/components/ui/`
- **Domain components:** `reactjs/src/components/{cards,admin,employee}/`
- **Page templates:** `reactjs/src/components/templates/`
