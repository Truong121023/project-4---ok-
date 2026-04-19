export const ui = {
  // Layout
  page: "relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 sm:px-6 lg:px-8",

  // Panels & Cards
  panel:
    "rounded-xl border border-ink-900/10 bg-cream-50/95 p-6 shadow-soft backdrop-blur-sm sm:p-8",
  card:
    "rounded-xl border border-ink-900/10 bg-cream-50 p-6 shadow-soft transition-shadow duration-300 hover:shadow-lift",
  cardGold:
    "rounded-xl border border-matcha-200 bg-cream-50 p-5 shadow-soft",

  // Typography
  eyebrow:
    "mb-3 inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-matcha-600",
  eyebrowJp:
    "mb-2 inline-block font-medium text-lg text-matcha-700 tracking-wider",
  heroTitle:
    "max-w-[14ch] text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-ink-900 sm:text-5xl lg:text-6xl",
  bannerTitle:
    "max-w-[16ch] text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-4xl lg:text-5xl",
  sectionTitle:
    "max-w-[20ch] text-2xl font-semibold leading-tight tracking-[-0.01em] text-ink-900 sm:text-3xl",
  copy: "mt-4 max-w-2xl text-sm leading-7 text-ink-600 sm:text-base",
  muted: "text-sm leading-7 text-ink-400 sm:text-base",
  price: "text-lg font-semibold tracking-[0.02em] text-matcha-700",

  // Buttons
  primaryButton:
    "inline-flex cursor-pointer items-center justify-center rounded-full bg-matcha-500 px-6 py-3 text-sm font-semibold text-cream-50 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:bg-matcha-700 hover:shadow-lift active:scale-[0.98]",
  secondaryButton:
    "inline-flex cursor-pointer items-center justify-center rounded-full border border-ink-900/10 bg-cream-50 px-6 py-3 text-sm font-semibold text-ink-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-cream-100 active:scale-[0.98]",
  ghostButton:
    "inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-matcha-700 transition-all duration-300 hover:bg-matcha-500/10",

  // Inputs
  input:
    "w-full rounded-lg border border-ink-900/10 bg-cream-50 px-4 py-3 text-sm text-ink-900 outline-none transition-all duration-300 focus:border-matcha-500 focus:shadow-[0_0_0_3px_oklch(46%_0.11_140_/_0.15)] placeholder:text-ink-400",

  // Pills & Badges
  pill: "inline-flex items-center rounded-full bg-matcha-100 px-3 py-1.5 text-xs font-semibold tracking-wide text-matcha-700",
  pillGold: "inline-flex items-center rounded-full border border-beige-300 bg-beige-100 px-3 py-1.5 text-xs font-semibold tracking-wide text-ink-700",

  // Dividers
  sectionDivider:
    "relative flex items-center gap-4 text-xs font-bold uppercase tracking-[0.2em] text-ink-400 before:h-px before:flex-1 before:bg-gradient-to-r before:from-transparent before:to-beige-300 after:h-px after:flex-1 after:bg-gradient-to-l after:from-transparent after:to-beige-300",
};
