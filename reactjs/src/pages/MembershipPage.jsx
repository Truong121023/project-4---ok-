import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Dialog } from "../components/ui/dialog";
import { getApiErrorMessage } from "../lib/api";
import { formatCurrencyVnd } from "../lib/locale";
import {
  createAdminUserLevelDefinition,
  deleteAdminUserLevelDefinition,
  fetchAdminUserLevelDefinitions,
  updateAdminUserLevelDefinition,
} from "../lib/siteApi";
import { ui } from "../ui";

const POINTS_PER_VND = 0.001;
const VND_PER_POINT = Math.round(1 / POINTS_PER_VND);

// Gradients chosen to keep WCAG AA (4.5:1) for white text on the right endpoint.
const tierAccents = [
  { accent: "from-[#9c6c48] to-[#b8885d]", chip: "bg-[#f2e0d2] text-[#8a5a37]" },
  { accent: "from-[#5b6775] to-[#8b97a5]", chip: "bg-slate-100 text-slate-700" },
  { accent: "from-[#b78c19] to-[#e7c15a]", chip: "bg-amber-100 text-amber-700" },
  { accent: "from-[#4e5968] to-[#b7c3d2]", chip: "bg-zinc-100 text-zinc-700" },
];

const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";

const eyebrowAccent =
  "text-sm font-semibold uppercase tracking-[0.18em] text-tea-700";

function formatPoints(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")} pts`;
}

function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" />
    </svg>
  );
}

function toNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function getThresholdPoints(tier) {
  return toNumber(tier?.minMembershipPoints ?? tier?.minPaidAmount, 0);
}

function getThresholdSpend(tier) {
  return getThresholdPoints(tier) * VND_PER_POINT;
}

function normalizeTierName(tier) {
  return String(tier?.name ?? tier?.code ?? "Unnamed tier").trim() || "Unnamed tier";
}

function normalizeTierCode(tier) {
  return String(tier?.code ?? normalizeTierName(tier)).trim().toUpperCase();
}

function sortTierDefinitions(items) {
  return [...items].sort((left, right) => {
    const thresholdCompare = getThresholdPoints(left) - getThresholdPoints(right);
    if (thresholdCompare !== 0) return thresholdCompare;
    return normalizeTierCode(left).localeCompare(normalizeTierCode(right), "vi");
  });
}

function resolveTier(definitions, points) {
  const normalizedPoints = Math.max(0, Number(points ?? 0));
  return (
    [...definitions].reverse().find((tier) => normalizedPoints >= getThresholdPoints(tier)) ??
    definitions[0] ??
    null
  );
}

function buildTierPresentation(tier, index) {
  const palette = tierAccents[index % tierAccents.length];
  return {
    ...tier,
    accent: palette.accent,
    chip: palette.chip,
    key: tier.id || `${normalizeTierCode(tier)}-${index}`,
    thresholdPoints: getThresholdPoints(tier),
    thresholdSpend: getThresholdSpend(tier),
    label: normalizeTierName(tier),
    codeLabel: normalizeTierCode(tier),
  };
}

function createTierDraft(tier = null) {
  return {
    id: tier?.id ? String(tier.id) : "",
    storeId: tier?.storeId ? String(tier.storeId) : "",
    storeName: String(tier?.storeName ?? ""),
    code: String(tier?.code ?? ""),
    name: String(tier?.name ?? ""),
    minMembershipPoints: tier ? String(getThresholdPoints(tier)) : "",
    active: Boolean(tier?.active ?? true),
  };
}

function validateField(name, value) {
  const trimmed = typeof value === "string" ? value.trim() : value;
  if (name === "code") {
    if (!trimmed) return "Level code is required.";
    if (!/^[A-Z][A-Z0-9_]*$/.test(trimmed)) return "Use uppercase letters, digits, and underscores only.";
  }
  if (name === "name") {
    if (!trimmed) return "Level name is required.";
  }
  if (name === "minMembershipPoints") {
    if (trimmed === "" || trimmed === null || trimmed === undefined) return "Minimum points is required.";
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return "Must be a non-negative number.";
    if (!Number.isInteger(n)) return "Must be a whole number.";
  }
  return "";
}

export default function MembershipPage() {
  const auth = useAuth();
  const [calculatorSpend, setCalculatorSpend] = useState("500000");
  const [calculatorOrders, setCalculatorOrders] = useState("5");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [backendNotice, setBackendNotice] = useState(
    "Backend currently returns the operational membership fields only. Marketing copy, accent styling, and extra tier benefits are not part of the API contract yet.",
  );
  const [tierDefinitions, setTierDefinitions] = useState([]);
  const [tierDraft, setTierDraft] = useState(() => createTierDraft());
  const [fieldErrors, setFieldErrors] = useState({});
  const [savingTier, setSavingTier] = useState(false);
  const [deletingTierId, setDeletingTierId] = useState("");
  const [confirmTier, setConfirmTier] = useState(null);

  const codeRef = useRef(null);
  const nameRef = useRef(null);
  const minPointsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDefinitions() {
      if (!auth.isAuthenticated) {
        if (!cancelled) {
          setTierDefinitions([]);
          setError("Please sign in before opening the membership management page.");
          setLoading(false);
        }
        return;
      }

      if (!auth.hasRole("ADMIN")) {
        if (!cancelled) {
          setTierDefinitions([]);
          setError("Only ADMIN can manage membership tier definitions from /api/admin/user-levels.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetchAdminUserLevelDefinitions(auth);
        if (cancelled) return;
        setTierDefinitions(sortTierDefinitions(response));
      } catch (requestError) {
        if (cancelled) return;
        setError(getApiErrorMessage(requestError, "Unable to load membership tiers from backend."));
        setTierDefinitions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDefinitions();

    return () => {
      cancelled = true;
    };
  }, [auth]);

  const membershipTiers = useMemo(
    () => tierDefinitions.map((tier, index) => buildTierPresentation(tier, index)),
    [tierDefinitions],
  );
  const isEditingTier = Boolean(tierDraft.id);
  const draftThresholdPoints = toNumber(tierDraft.minMembershipPoints, 0);
  const draftThresholdSpend = getThresholdSpend({ minMembershipPoints: draftThresholdPoints });
  const draftScopeLabel = tierDraft.storeId
    ? tierDraft.storeName || `Store #${tierDraft.storeId}`
    : "Global membership";

  const calculator = useMemo(() => {
    const spend = Math.max(0, Number(calculatorSpend || 0));
    const orders = Math.max(0, Number(calculatorOrders || 0));
    const points = Math.floor(spend * POINTS_PER_VND);
    const tier = resolveTier(membershipTiers, points);
    const tierIndex = membershipTiers.findIndex((item) => String(item.key) === String(tier?.key));
    const nextTier = tierIndex >= 0 ? membershipTiers[tierIndex + 1] ?? null : membershipTiers[0] ?? null;
    const averageOrderValue = orders > 0 ? spend / orders : 0;
    const pointsPerOrder = orders > 0 ? points / orders : points;

    return {
      spend,
      orders,
      points,
      tier,
      nextTier,
      averageOrderValue,
      pointsPerOrder,
      pointsNeeded: nextTier ? Math.max(0, nextTier.thresholdPoints - points) : 0,
      spendNeeded: nextTier ? Math.max(0, nextTier.thresholdSpend - spend) : 0,
    };
  }, [calculatorOrders, calculatorSpend, membershipTiers]);

  const overviewCards = [
    {
      label: "Earn rate",
      value: `1 point / ${formatCurrencyVnd(VND_PER_POINT)}`,
      note: "This matches the current backend rule: only paid orders should add membership points.",
    },
    {
      label: "Tier count",
      value: `${membershipTiers.length}`,
      note: membershipTiers.length
        ? "Loaded directly from /api/admin/user-levels."
        : "No tier definitions were returned by backend.",
    },
    {
      label: "Current example tier",
      value: calculator.tier ? calculator.tier.label : "No tier data",
      note: `Based on ${formatCurrencyVnd(calculator.spend)} paid spend.`,
    },
    {
      label: "Next threshold",
      value: calculator.nextTier ? calculator.nextTier.label : "Top tier reached",
      note: calculator.nextTier
        ? `${formatPoints(calculator.pointsNeeded)} or ${formatCurrencyVnd(calculator.spendNeeded)} more`
        : "No higher tier remaining.",
    },
  ];

  const resetTierDraft = () => {
    setTierDraft(createTierDraft());
    setFieldErrors({});
  };

  const handleEditTier = (tier) => {
    setNotice("");
    setError("");
    setFieldErrors({});
    setTierDraft(createTierDraft(tier));
  };

  const handleFieldBlur = (name) => {
    setFieldErrors((current) => {
      const msg = validateField(name, tierDraft[name]);
      const next = { ...current };
      if (msg) next[name] = msg;
      else delete next[name];
      return next;
    });
  };

  const focusFirstInvalid = (errors) => {
    if (errors.code) codeRef.current?.focus();
    else if (errors.name) nameRef.current?.focus();
    else if (errors.minMembershipPoints) minPointsRef.current?.focus();
  };

  const handleTierSubmit = async (event) => {
    event.preventDefault();

    if (!auth.hasRole("ADMIN")) {
      setError("Only ADMIN can manage membership tiers.");
      return;
    }

    const nextErrors = {
      code: validateField("code", tierDraft.code),
      name: validateField("name", tierDraft.name),
      minMembershipPoints: validateField("minMembershipPoints", tierDraft.minMembershipPoints),
    };
    const cleaned = Object.fromEntries(Object.entries(nextErrors).filter(([, v]) => v));
    setFieldErrors(cleaned);

    if (Object.keys(cleaned).length > 0) {
      setError("Please fix the highlighted fields before saving.");
      focusFirstInvalid(cleaned);
      return;
    }

    setSavingTier(true);
    setError("");
    setNotice("");

    try {
      if (tierDraft.id) {
        await updateAdminUserLevelDefinition(auth, tierDraft.id, tierDraft);
      } else {
        await createAdminUserLevelDefinition(auth, tierDraft);
      }

      const nextDefinitions = await fetchAdminUserLevelDefinitions(auth);
      setTierDefinitions(sortTierDefinitions(nextDefinitions));
      setTierDraft(createTierDraft());
      setFieldErrors({});
      setNotice(
        tierDraft.id
          ? `Updated membership tier ${tierDraft.name.trim() || tierDraft.code.trim()}.`
          : `Added membership tier ${tierDraft.name.trim() || tierDraft.code.trim()}.`,
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save this membership tier."));
    } finally {
      setSavingTier(false);
    }
  };

  const requestDeleteTier = (tier) => {
    if (!tier?.id) return;
    setConfirmTier(tier);
  };

  const cancelDeleteTier = () => setConfirmTier(null);

  const confirmDeleteTier = async () => {
    const tier = confirmTier;
    if (!tier?.id) return;

    setConfirmTier(null);
    setDeletingTierId(String(tier.id));
    setError("");
    setNotice("");

    try {
      await deleteAdminUserLevelDefinition(auth, tier.id);
      const nextDefinitions = await fetchAdminUserLevelDefinitions(auth);
      setTierDefinitions(sortTierDefinitions(nextDefinitions));

      if (String(tierDraft.id) === String(tier.id)) {
        setTierDraft(createTierDraft());
      }

      setNotice(`Deleted membership tier ${normalizeTierName(tier)}.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to delete this membership tier."));
    } finally {
      setDeletingTierId("");
    }
  };

  const fieldErrorId = (name) => `tier-${name}-error`;
  const fieldHelperId = (name) => `tier-${name}-helper`;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className={eyebrowAccent}>Membership Management</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
          Admin membership tiers
        </h1>
        <div className="mt-4 grid gap-3 text-sm leading-7 text-stone-600">
          <p>This page reads membership tier thresholds from backend instead of sample constants.</p>
          {backendNotice ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start justify-between gap-3 rounded-[1.3rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900"
            >
              <span>{backendNotice}</span>
              <button
                aria-label="Dismiss notice"
                className="flex-shrink-0 rounded-full p-1 text-amber-900/70 transition hover:bg-amber-100 hover:text-amber-900"
                type="button"
                onClick={() => setBackendNotice("")}
              >
                ✕
              </button>
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-[1.3rem] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800"
            >
              {error}
            </div>
          ) : null}
          {notice ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-[1.3rem] border border-matcha-500/20 bg-matcha-500/10 px-4 py-3 text-sm text-matcha-700"
            >
              {notice}
            </div>
          ) : null}
        </div>
      </header>

      {loading ? (
        <section className={ui.panel} aria-busy="true">
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading membership tiers from backend...
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.9fr)]">
        <div className="grid gap-6">
          <section className={ui.card} aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="sr-only">Overview</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4"
                >
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                    {card.label}
                  </p>
                  <strong className="mt-3 block text-2xl font-semibold text-tea-900">
                    {card.value}
                  </strong>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{card.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={ui.card} aria-labelledby="tier-editor-heading">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={eyebrowAccent}>Tier editor</p>
                <h2 id="tier-editor-heading" className="mt-2 text-2xl font-semibold text-tea-900">
                  Add and update membership levels
                </h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Admin can define each level by name and point threshold directly from this page.
                  New tiers are created as global membership levels by default.
                </p>
              </div>
              <span className={ui.pill}>{isEditingTier ? "Editing tier" : "Create tier"}</span>
            </div>

            <form className="mt-6 grid gap-5" onSubmit={handleTierSubmit} noValidate>
              <div className="grid gap-4 md:grid-cols-2">
                <label htmlFor="tier-code" className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Level code <span aria-hidden="true" className="text-rose-600">*</span>
                  </span>
                  <input
                    id="tier-code"
                    ref={codeRef}
                    className={`${ui.input} ${fieldErrors.code ? "border-rose-400 focus:border-rose-500" : ""}`}
                    placeholder="SILVER"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.code)}
                    aria-describedby={fieldErrors.code ? fieldErrorId("code") : fieldHelperId("code")}
                    value={tierDraft.code}
                    onChange={(event) =>
                      setTierDraft((current) => ({
                        ...current,
                        code: event.target.value.toUpperCase(),
                      }))
                    }
                    onBlur={() => handleFieldBlur("code")}
                  />
                  {fieldErrors.code ? (
                    <span id={fieldErrorId("code")} className="text-xs text-rose-700">
                      {fieldErrors.code}
                    </span>
                  ) : (
                    <span id={fieldHelperId("code")} className="text-xs text-stone-500">
                      Uppercase identifier, e.g. BRONZE, SILVER, GOLD.
                    </span>
                  )}
                </label>

                <label htmlFor="tier-name" className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Level name <span aria-hidden="true" className="text-rose-600">*</span>
                  </span>
                  <input
                    id="tier-name"
                    ref={nameRef}
                    className={`${ui.input} ${fieldErrors.name ? "border-rose-400 focus:border-rose-500" : ""}`}
                    placeholder="Silver"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={fieldErrors.name ? fieldErrorId("name") : fieldHelperId("name")}
                    value={tierDraft.name}
                    onChange={(event) =>
                      setTierDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    onBlur={() => handleFieldBlur("name")}
                  />
                  {fieldErrors.name ? (
                    <span id={fieldErrorId("name")} className="text-xs text-rose-700">
                      {fieldErrors.name}
                    </span>
                  ) : (
                    <span id={fieldHelperId("name")} className="text-xs text-stone-500">
                      Customer-facing label shown on receipts and profiles.
                    </span>
                  )}
                </label>

                <label htmlFor="tier-min-points" className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Minimum membership points <span aria-hidden="true" className="text-rose-600">*</span>
                  </span>
                  <input
                    id="tier-min-points"
                    ref={minPointsRef}
                    className={`${ui.input} ${fieldErrors.minMembershipPoints ? "border-rose-400 focus:border-rose-500" : ""}`}
                    min="0"
                    step="1"
                    type="number"
                    placeholder="300"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.minMembershipPoints)}
                    aria-describedby={
                      fieldErrors.minMembershipPoints
                        ? fieldErrorId("minMembershipPoints")
                        : fieldHelperId("minMembershipPoints")
                    }
                    value={tierDraft.minMembershipPoints}
                    onChange={(event) =>
                      setTierDraft((current) => ({
                        ...current,
                        minMembershipPoints: event.target.value,
                      }))
                    }
                    onBlur={() => handleFieldBlur("minMembershipPoints")}
                  />
                  {fieldErrors.minMembershipPoints ? (
                    <span id={fieldErrorId("minMembershipPoints")} className="text-xs text-rose-700">
                      {fieldErrors.minMembershipPoints}
                    </span>
                  ) : (
                    <span id={fieldHelperId("minMembershipPoints")} className="text-xs text-stone-500">
                      {draftThresholdPoints > 0
                        ? `${formatPoints(draftThresholdPoints)} ≈ ${formatCurrencyVnd(draftThresholdSpend)} paid spend at current earn rate.`
                        : `1 point = ${formatCurrencyVnd(VND_PER_POINT)} paid spend.`}
                    </span>
                  )}
                </label>

                <label htmlFor="tier-status" className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Status
                  </span>
                  <select
                    id="tier-status"
                    className={ui.input}
                    value={tierDraft.active ? "true" : "false"}
                    onChange={(event) =>
                      setTierDraft((current) => ({
                        ...current,
                        active: event.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Scope</p>
                  <p className="mt-2 text-base font-semibold text-tea-900">{draftScopeLabel}</p>
                </article>
                <article className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                    Equivalent paid spend
                  </p>
                  <p className="mt-2 text-base font-semibold text-tea-900">
                    {formatCurrencyVnd(draftThresholdSpend)}
                  </p>
                </article>
                <article className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                    Backend mapping
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    This page saves the membership threshold as the backend point ladder used for
                    global member tiers.
                  </p>
                </article>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className={ui.primaryButton} disabled={savingTier} type="submit">
                  {savingTier ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner />
                      {isEditingTier ? "Saving tier..." : "Adding tier..."}
                    </span>
                  ) : isEditingTier ? (
                    "Save tier"
                  ) : (
                    "Add tier"
                  )}
                </button>
                <button className={ui.secondaryButton} type="button" onClick={resetTierDraft}>
                  {isEditingTier ? "Cancel edit" : "Clear form"}
                </button>
              </div>
            </form>
          </section>

          <section className={ui.card} aria-labelledby="tier-list-heading">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={eyebrowAccent}>Tier structure</p>
                <h2 id="tier-list-heading" className="mt-2 text-2xl font-semibold text-tea-900">
                  Membership tiers from backend
                </h2>
              </div>
              <span className={ui.pill}>Admin API sourced</span>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {membershipTiers.length ? (
                membershipTiers.map((tier) => (
                  <article
                    key={tier.key}
                    className="overflow-hidden rounded-[1.6rem] border border-matcha-900/10 bg-white/75"
                  >
                    <div className={`bg-gradient-to-r ${tier.accent} px-5 py-4 text-white`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/80">
                            {tier.codeLabel}
                          </p>
                          <h3 className="mt-1 text-2xl font-semibold">{tier.label}</h3>
                        </div>
                        <span className="rounded-full bg-white/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
                          {formatPoints(tier.thresholdPoints)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 p-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.2rem] bg-stone-50 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                            Minimum spend
                          </p>
                          <p className="mt-2 text-lg font-semibold text-tea-900">
                            {formatCurrencyVnd(tier.thresholdSpend)}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] bg-stone-50 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                            Point threshold
                          </p>
                          <p className="mt-2 text-lg font-semibold text-tea-900">
                            {formatPoints(tier.thresholdPoints)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                          Backend fields available
                        </p>
                        <div className="mt-3 grid gap-2">
                          <div className="rounded-[1.1rem] border border-matcha-900/10 bg-white px-4 py-3 text-sm leading-6 text-stone-600">
                            Scope: {tier.storeName || "Toan he thong"}
                          </div>
                          <div className="rounded-[1.1rem] border border-matcha-900/10 bg-white px-4 py-3 text-sm leading-6 text-stone-600">
                            Status: {tier.active ? "Active" : "Inactive"}
                          </div>
                          <div className="rounded-[1.1rem] border border-matcha-900/10 bg-white px-4 py-3 text-sm leading-6 text-stone-600">
                            Backend does not return benefits metadata for this tier yet.
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          className={ui.secondaryButton}
                          type="button"
                          onClick={() => handleEditTier(tier)}
                        >
                          Edit tier
                        </button>
                        <button
                          className={dangerButtonClass}
                          disabled={deletingTierId === String(tier.id)}
                          type="button"
                          onClick={() => requestDeleteTier(tier)}
                        >
                          {deletingTierId === String(tier.id) ? (
                            <>
                              <Spinner />
                              Deleting...
                            </>
                          ) : (
                            "Delete tier"
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <article className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600 xl:col-span-2">
                  No membership tiers were returned from backend.
                </article>
              )}
            </div>
          </section>

          <section className={ui.card} aria-labelledby="rules-heading">
            <p className={eyebrowAccent}>Operating rules</p>
            <h2 id="rules-heading" className="sr-only">Operating rules</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-5">
                <h3 className="text-lg font-semibold text-tea-900">How points are earned</h3>
                <div className="mt-3 grid gap-2 text-sm leading-7 text-stone-600">
                  <p>Only paid orders should count toward membership points.</p>
                  <p>Current rule: 1 point for every 1,000 VND of paid revenue.</p>
                  <p>Cancelled or refunded orders should not contribute points.</p>
                </div>
              </article>

              <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-5">
                <h3 className="text-lg font-semibold text-tea-900">Backend integration notes</h3>
                <div className="mt-3 grid gap-2 text-sm leading-7 text-stone-600">
                  <p>Thresholds now come from backend user-level definitions.</p>
                  <p>Tier benefits are not provided by the API yet.</p>
                  <p>This page is admin-only and reads directly from /api/admin/user-levels.</p>
                </div>
              </article>
            </div>
          </section>
        </div>

        <aside
          className={`${ui.card} h-fit xl:sticky xl:top-6`}
          aria-labelledby="calculator-heading"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={eyebrowAccent}>Point calculator</p>
              <h2 id="calculator-heading" className="mt-2 text-2xl font-semibold text-tea-900">
                Preview the resulting tier
              </h2>
            </div>
            <span className={ui.pill}>
              {calculator.tier ? calculator.tier.label : "No tier data"}
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <label htmlFor="calc-spend" className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Paid spend
              </span>
              <input
                id="calc-spend"
                className={ui.input}
                min="0"
                step="1000"
                type="number"
                value={calculatorSpend}
                onChange={(event) => setCalculatorSpend(event.target.value)}
              />
            </label>

            <label htmlFor="calc-orders" className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Order count
              </span>
              <input
                id="calc-orders"
                className={ui.input}
                min="0"
                step="1"
                type="number"
                value={calculatorOrders}
                onChange={(event) => setCalculatorOrders(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3">
            <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/75 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                Earned points
              </p>
              <strong className="mt-3 block text-3xl font-semibold text-tea-900">
                {formatPoints(calculator.points)}
              </strong>
            </article>

            <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/75 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                Average order value
              </p>
              <strong className="mt-3 block text-2xl font-semibold text-tea-900">
                {formatCurrencyVnd(calculator.averageOrderValue)}
              </strong>
            </article>

            <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/75 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                Points per order
              </p>
              <strong className="mt-3 block text-2xl font-semibold text-tea-900">
                {formatPoints(calculator.pointsPerOrder)}
              </strong>
            </article>

            <article className="rounded-[1.4rem] bg-[#203228] p-5 text-white shadow-[0_20px_44px_rgba(32,50,40,0.22)]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">
                Next tier
              </p>
              <strong className="mt-3 block text-3xl font-semibold">
                {calculator.nextTier ? calculator.nextTier.label : "Top tier reached"}
              </strong>
              <p className="mt-3 text-sm leading-7 text-white/85">
                {calculator.nextTier
                  ? `${formatPoints(calculator.pointsNeeded)} more to reach the next tier. ${formatCurrencyVnd(calculator.spendNeeded)} more paid spend at the current earn rate.`
                  : "The current spend already sits at the highest membership tier."}
              </p>
            </article>
          </div>
        </aside>
      </section>

      <Dialog
        open={Boolean(confirmTier)}
        onClose={cancelDeleteTier}
        title="Delete membership tier?"
        description={
          confirmTier
            ? `This will permanently remove "${normalizeTierName(confirmTier)}" from the backend. This action cannot be undone.`
            : ""
        }
        size="sm"
      >
        <div className="flex flex-wrap justify-end gap-3">
          <button className={ui.secondaryButton} type="button" onClick={cancelDeleteTier}>
            Cancel
          </button>
          <button className={dangerButtonClass} type="button" onClick={confirmDeleteTier}>
            Delete tier
          </button>
        </div>
      </Dialog>
    </div>
  );
}
