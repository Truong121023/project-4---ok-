import { useState } from "react";
import {
  Button, IconButton, Badge, Tag, Avatar, Skeleton, SkeletonText, PriceTag,
  Input, Textarea, Select, Checkbox, Radio, Switch,
  Card, EmptyState, Breadcrumb, Pagination, Tabs,
  Tooltip, Dialog, Sheet, ToastProvider, useToast,
  Table, Stepper,
} from "../components/ui/index";
import { DishCard } from "../components/cards/dish-card";
import { StoreCard } from "../components/cards/store-card";
import { NewsCard } from "../components/cards/news-card";

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink-800 border-b border-beige-200 pb-2">{title}</h2>
      <div className="flex flex-wrap gap-3 items-start">{children}</div>
    </section>
  );
}

// ── Toast demo button (must be inside ToastProvider) ─────────────────────────
function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      {["default","success","danger","warn"].map((v) => (
        <Button key={v} size="sm" variant="secondary"
          onClick={() => toast(`${v} toast message`, { variant: v })}>
          {v}
        </Button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UiKitPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("a");
  const [page, setPage] = useState(3);
  const [checked, setChecked] = useState(false);
  const [radio, setRadio] = useState("a");
  const [toggled, setToggled] = useState(false);
  const [step, setStep] = useState("s2");

  const steps = [
    { id: "s1", label: "Cart" },
    { id: "s2", label: "Delivery" },
    { id: "s3", label: "Payment" },
    { id: "s4", label: "Confirm" },
  ];

  const tabs = [
    { id: "a", label: "Overview", content: <p className="text-sm text-ink-600">Overview content.</p> },
    { id: "b", label: "Details",  content: <p className="text-sm text-ink-600">Details content.</p> },
    { id: "c", label: "Reviews",  content: <p className="text-sm text-ink-600">Reviews content.</p> },
  ];

  const tableColumns = [
    { key: "name",   header: "Name" },
    { key: "status", header: "Status", render: (r) => <Badge variant={r.variant}>{r.status}</Badge> },
    { key: "price",  header: "Price",  render: (r) => <PriceTag price={r.price} /> },
  ];
  const tableRows = [
    { id: 1, name: "Matcha Latte",  status: "Active",  variant: "success", price: 55000 },
    { id: 2, name: "Hojicha",       status: "Pending", variant: "warn",    price: 45000 },
    { id: 3, name: "Genmaicha",     status: "Sold out",variant: "danger",  price: 50000 },
  ];

  return (
    <ToastProvider>
      <div className="mx-auto max-w-5xl px-4 py-12 flex flex-col gap-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-matcha-600 mb-1">Dev only</p>
          <h1 className="text-3xl font-bold text-ink-900">Kamatcha UI Kit</h1>
          <p className="text-sm text-ink-400 mt-1">All primitives × variants — Phase 02</p>
        </div>

        {/* BUTTONS */}
        <Section title="Buttons">
          {["primary","secondary","ghost","link","danger"].map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
          {["sm","md","lg"].map((s) => (
            <Button key={s} size={s} variant="primary">{s}</Button>
          ))}
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <IconButton aria-label="close" variant="ghost">✕</IconButton>
          <IconButton aria-label="add" variant="primary" size="sm">+</IconButton>
        </Section>

        {/* BADGES & TAGS */}
        <Section title="Badges & Tags">
          {["matcha","beige","ink","danger","success","warn"].map((v) => (
            <Badge key={v} variant={v}>{v}</Badge>
          ))}
          <Tag>Filter</Tag>
          <Tag onRemove={() => {}}>Removable</Tag>
        </Section>

        {/* AVATAR & PRICE */}
        <Section title="Avatar & PriceTag">
          {["sm","md","lg","xl"].map((s) => (
            <Avatar key={s} size={s} initials="KZ" />
          ))}
          <Avatar src="https://i.pravatar.cc/80" size="md" alt="User" />
          <PriceTag price={55000} />
          <PriceTag price={45000} original={60000} />
        </Section>

        {/* SKELETON */}
        <Section title="Skeleton">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="w-64"><SkeletonText lines={3} /></div>
        </Section>

        {/* FORMS */}
        <Section title="Forms">
          <div className="w-64 flex flex-col gap-4">
            <Input label="Name" placeholder="Your name" helper="Enter full name" />
            <Input label="Error" placeholder="..." error="This field is required" />
            <Textarea label="Message" placeholder="Type here…" rows={3} />
            <Select label="Size">
              <option value="">Choose…</option>
              <option value="s">Small</option>
              <option value="m">Medium</option>
              <option value="l">Large</option>
            </Select>
            <Checkbox label="I agree to terms" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <div className="flex flex-col gap-2">
              {["a","b","c"].map((v) => (
                <Radio key={v} label={`Option ${v.toUpperCase()}`} name="demo" value={v}
                  checked={radio === v} onChange={() => setRadio(v)} />
              ))}
            </div>
            <Switch label="Notifications" checked={toggled} onChange={setToggled} />
          </div>
        </Section>

        {/* CARD */}
        <Section title="Card variants">
          {["flat","raised","outlined"].map((v) => (
            <Card key={v} variant={v} padding="md" className="w-40 text-sm text-ink-700">{v}</Card>
          ))}
        </Section>

        {/* EMPTY STATE */}
        <Section title="EmptyState">
          <EmptyState icon="🍵" title="No items yet" description="Add something to get started."
            action={<Button size="sm">Add item</Button>} className="w-72" />
        </Section>

        {/* BREADCRUMB */}
        <Section title="Breadcrumb">
          <Breadcrumb items={[
            { label: "Home", href: "/" },
            { label: "Menu", href: "/menu" },
            { label: "Matcha Latte" },
          ]} />
        </Section>

        {/* PAGINATION */}
        <Section title="Pagination">
          <Pagination page={page} total={12} onChange={setPage} />
        </Section>

        {/* TABS */}
        <Section title="Tabs">
          <div className="w-full">
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          </div>
        </Section>

        {/* STEPPER */}
        <Section title="Stepper">
          <div className="w-full flex flex-col gap-4">
            <Stepper steps={steps} current={step} />
            <div className="flex gap-2">
              {steps.map((s) => (
                <Button key={s.id} size="sm" variant={s.id === step ? "primary" : "secondary"}
                  onClick={() => setStep(s.id)}>{s.label}</Button>
              ))}
            </div>
          </div>
        </Section>

        {/* TABLE */}
        <Section title="Table">
          <Table columns={tableColumns} rows={tableRows} stickyHeader className="w-full" />
        </Section>

        {/* OVERLAYS */}
        <Section title="Overlays">
          <Tooltip content="This is a tooltip" side="top">
            <Button size="sm" variant="secondary">Hover me</Button>
          </Tooltip>
          <Button size="sm" variant="secondary" onClick={() => setDialogOpen(true)}>Open Dialog</Button>
          <Button size="sm" variant="secondary" onClick={() => setSheetOpen(true)}>Open Sheet</Button>
        </Section>

        {/* TOAST */}
        <Section title="Toast">
          <ToastDemo />
        </Section>

        {/* DOMAIN CARDS */}
        <Section title="Domain Cards">
          <DishCard name="Matcha Latte" price={55000} originalPrice={65000}
            badges={["New"]} onAddToCart={() => {}} className="w-60" />
          <StoreCard name="Kamatcha Zen — Quận 1" address="12 Nguyễn Huệ, Q.1, TP.HCM"
            distance="0.8 km" hours="07:00 – 22:00" open className="w-60" />
          <NewsCard title="Kamatcha opens new Zen garden experience in District 3"
            category="News" date="Apr 2026"
            excerpt="Step into tranquility with our newest location featuring a rooftop matcha bar."
            className="w-60" />
        </Section>

        {/* Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}
          title="Confirm action" description="This action cannot be undone." size="sm">
          <div className="flex gap-3 pt-2">
            <Button variant="danger" onClick={() => setDialogOpen(false)}>Confirm</Button>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
          </div>
        </Dialog>

        {/* Sheet */}
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} side="right" title="Filters">
          <div className="flex flex-col gap-4">
            <Input label="Search" placeholder="Matcha…" />
            <Select label="Category">
              <option>All</option>
              <option>Drinks</option>
              <option>Food</option>
            </Select>
            <Button onClick={() => setSheetOpen(false)}>Apply</Button>
          </div>
        </Sheet>
      </div>
    </ToastProvider>
  );
}
