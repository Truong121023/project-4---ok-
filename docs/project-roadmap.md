# Project Roadmap

Living document tracking Kamatcha e-commerce platform milestones, phases, and progress.

---

## Executive Summary

Kamatcha is a full-stack e-commerce platform for premium matcha stores. The platform currently spans three frontend targets (React web, Flutter mobile, web-based employee/admin dashboards) with a centralized Spring Boot API.

**Current Status:** Frontend redesign (Kamatcha Zen) **COMPLETE**. System entering integration and end-to-end testing phase.

**Next Priority:** Real-time features (WebSocket orders), push notifications, and E2E test coverage.

---

## Release Timeline

### Phase 1: Foundation & Core Features (✅ Complete)

**Status:** 100% — Released v1.0.0 (2026-04-19)

**Milestones:**
- [x] Spring Boot API scaffolding (users, dishes, orders, cart, stores)
- [x] React.js initial pages (home, product detail, checkout, admin dashboard)
- [x] Flutter mobile app (basic product listing, checkout, order tracking)
- [x] Database schema (PostgreSQL with JPA entities)
- [x] Authentication (JWT tokens, user roles: CUSTOMER/ADMIN/EMPLOYEE)

**Deliverables:**
- REST API with 15+ endpoints
- Customer checkout flow (single-page & mobile)
- Admin resource management UI
- Employee order dashboard

---

### Phase 2: Kamatcha Zen Frontend Redesign (✅ Complete)

**Status:** 100% — Released 2026-04-19

**Scope:** Comprehensive 7-phase UX/UI overhaul reflecting premium matcha brand identity.

**Design System Delivered:**
- [x] Color palette (matcha green, cream, beige, ink scales — no gold)
- [x] Typography system (Noto Serif Display, Inter, JetBrains Mono)
- [x] Spacing/Ma system with density modes (airy for customers, compact for admin/employee)
- [x] Border radii, shadows, and motion primitives
- [x] 26 UI component primitives (button, card, input, table, dialog, etc.)
- [x] 13 domain-specific components (dish/news/store cards, admin tables, employee panels)
- [x] 6 page templates (home, product detail, checkout, admin, employee, store locator)

**Pages Restyled:** 33 total
- Customer (8): Home, Products, Orders, Checkout, Loyalty, Feedback, Profile, Account
- Admin (4): Dashboard, Dishes, Users, Orders, Stores
- Employee (6): Active Orders, Notifications, Order Detail, Delivery Proof, Shift Info, Map
- Public (3): Store Locator, Login, Payment Status

**Technical Details:**
- Tailwind CSS v4 with `@theme` custom properties (no config file)
- 271.71 kB gzipped bundle
- Zero new runtime dependencies
- Full WCAG 2.1 AA accessibility compliance
- Cross-browser tested (Chrome, Safari, Firefox, Edge)

**Status on Phase 2:**
- [x] Design tokens finalized
- [x] UI component library built and tested
- [x] All pages restyled and integrated
- [x] Accessibility audit passed
- [x] Performance review completed
- [ ] E2E test coverage (in progress, Phase 3)
- [ ] Figma design system sync (planned)

---

### Phase 3: Integration & Testing (🔄 In Progress)

**Status:** 20% — Started 2026-04-19

**Duration:** 4 weeks (estimated)

**Goals:**
- Comprehensive E2E testing of redesigned UI
- Real-time order update system
- Push notification setup (Flutter)
- Performance optimization

**Milestones:**

#### 3.1: E2E Test Coverage
- [ ] Checkout flow (React)
- [ ] Admin CRUD operations
- [ ] Employee order fulfillment workflow
- [ ] Payment processing (mock gateway)
- [ ] Target: >80% page flow coverage

**Owner:** QA Lead  
**Timeline:** Week 1–2  
**Tools:** Cypress or Playwright

#### 3.2: Real-Time Features
- [ ] WebSocket server setup (Spring Boot)
- [ ] Order status push (backend → clients)
- [ ] Delivery map live updates
- [ ] Order timeline animations
- [ ] Connection fallback to polling

**Owner:** Backend Lead  
**Timeline:** Week 2–3  
**Acceptance:** <500ms latency for status updates

#### 3.3: Push Notifications (Flutter)
- [ ] Firebase Cloud Messaging (FCM) integration
- [ ] Notification permissions flow
- [ ] Silent background notifications
- [ ] Deep linking to order detail
- [ ] Local notification fallback

**Owner:** Mobile Lead  
**Timeline:** Week 3  
**Platforms:** Android (FCM native), iOS (APNs via FCM)

#### 3.4: Performance Audit
- [ ] Bundle analysis (React)
- [ ] Lighthouse scores (target: 90+ on all metrics)
- [ ] Database query optimization
- [ ] Image asset optimization (WEBP, lazy loading)
- [ ] API response time benchmarking

**Owner:** DevOps Lead  
**Timeline:** Week 4  
**Deliverable:** Performance report with optimization roadmap

---

### Phase 4: Advanced Features (🔜 Planned)

**Status:** 0% — Estimated Start: May 2026

**Duration:** 6 weeks

**Feature Set:**

#### 4.1: AI Chat Integration (Matcha Knowledge Bot)
- [ ] Chat widget on customer pages
- [ ] Product recommendation engine
- [ ] FAQ automation (brewing, flavor pairing, storage)
- [ ] Integration with order history for personalized suggestions
- [ ] Admin dashboard for chat analytics

**Priority:** High  
**Owner:** AI/ML Specialist (external or internal)

#### 4.2: Loyalty Program Enhancement
- [ ] Tiered rewards (bronze, silver, gold, platinum)
- [ ] Point redemption system
- [ ] Referral bonuses
- [ ] Seasonal promotions integration
- [ ] Loyalty card visualization (digital & printable)

**Priority:** High  
**Owner:** Product Manager + Backend

#### 4.3: Inventory Management
- [ ] Real-time stock levels (admin)
- [ ] Low-stock alerts
- [ ] Automated reorder suggestions
- [ ] SKU tracking with batch numbers
- [ ] Seasonal item management

**Priority:** Medium  
**Owner:** Backend Lead

#### 4.4: Advanced Analytics
- [ ] Customer lifetime value (CLV) tracking
- [ ] Product performance dashboard
- [ ] Conversion funnel analysis
- [ ] Heatmaps for customer behavior
- [ ] Cohort analysis (retention, churn)

**Priority:** Medium  
**Owner:** Data Analyst + Backend

---

### Phase 5: Expansion & Localization (🔜 Planned)

**Status:** 0% — Estimated Start: June 2026

**Duration:** 8 weeks

**Features:**

#### 5.1: Internationalization (i18n)
- [ ] Multi-language support: Japanese, English, Chinese (Simplified/Traditional), Korean
- [ ] Locale-aware currency and date formatting
- [ ] RTL text support (if expanding to Arabic markets)
- [ ] Translated design system documentation

**Priority:** High  
**Owner:** Localization Specialist + Frontend

#### 5.2: Multi-Currency & Regional Pricing
- [ ] Currency conversion and display
- [ ] Region-specific pricing and taxes
- [ ] Local payment methods (WeChat Pay, AliPay, JCB, etc.)
- [ ] Shipping cost calculation by region

**Priority:** High  
**Owner:** Backend Lead

#### 5.3: Store Expansion Tools
- [ ] Multi-store management (central admin)
- [ ] Store-specific menus and inventory
- [ ] Staff management per location
- [ ] Store hours and localized content
- [ ] Store-to-store transfers

**Priority:** Medium  
**Owner:** Product Manager + Backend

---

### Phase 6: Mobile App Enhancement (🔜 Planned)

**Status:** 0% — Estimated Start: July 2026

**Duration:** 6 weeks

**Features:**

#### 6.1: Native Mobile Optimizations
- [ ] Biometric authentication (Touch ID, Face ID, fingerprint)
- [ ] Offline mode (cached product data, queued orders)
- [ ] Mobile payment wallets (Apple Pay, Google Pay)
- [ ] Augmented reality (AR) product visualization
- [ ] Camera-based loyalty card scanning

**Priority:** Medium  
**Owner:** Mobile Lead

#### 6.2: App Store Releases
- [ ] Google Play Store listing (Android)
- [ ] Apple App Store listing (iOS)
- [ ] App Store Optimization (ASO) — keywords, screenshots, descriptions
- [ ] Beta testing program (TestFlight for iOS, Google Play Beta)
- [ ] Review management and rating optimization

**Priority:** High  
**Owner:** Product Manager + Mobile

---

### Phase 7: Maturity & Optimization (🔜 Planned)

**Status:** 0% — Estimated Start: September 2026

**Duration:** Ongoing

**Focus Areas:**

- Performance optimization (bundle splits, code caching, CDN)
- Security hardening (penetration testing, OWASP compliance, data encryption)
- Database scaling (sharding, read replicas, caching layer)
- DevOps automation (CI/CD improvements, infrastructure as code)
- Customer support tooling (help desk integration, live chat)
- Advanced analytics and reporting

---

## Dependency Map

```
Phase 1: Foundation
    ↓
Phase 2: Kamatcha Zen Redesign (COMPLETE)
    ↓
Phase 3: Integration & Testing (IN PROGRESS)
    ├→ 3.1: E2E Tests
    ├→ 3.2: Real-Time Features (WebSocket)
    ├→ 3.3: Push Notifications (Flutter)
    └→ 3.4: Performance Audit
    ↓ (unblocks)
Phase 4: Advanced Features (May 2026)
    ├→ 4.1: AI Chat
    ├→ 4.2: Loyalty Enhancement
    ├→ 4.3: Inventory Management
    └→ 4.4: Analytics
    ↓
Phase 5: Expansion & Localization (June 2026)
    ├→ 5.1: i18n
    ├→ 5.2: Multi-Currency
    └→ 5.3: Store Expansion
    ↓
Phase 6: Mobile Enhancement (July 2026)
    ├→ 6.1: Native Features (AR, Biometric, Offline)
    └→ 6.2: App Store Releases
    ↓
Phase 7: Maturity (Sept 2026+)
```

---

## Success Metrics

### Phase 2 (Kamatcha Zen) — Completed
- [x] All 33 pages restyled with unified design system
- [x] Bundle size ≤275 kB gzipped ✅ (271.71 kB)
- [x] Accessibility: WCAG 2.1 AA compliance ✅
- [x] Component library: 26 primitives + 13 domain components ✅
- [x] Zero new runtime dependencies ✅
- [x] Build exit code: 0 ✅

### Phase 3 (Integration & Testing) — In Progress
- [ ] E2E test coverage: >80% critical paths
- [ ] Lighthouse scores: >90 on Performance, Accessibility, Best Practices, SEO
- [ ] API response time: <200ms p95
- [ ] WebSocket latency: <500ms for order updates
- [ ] Push notification delivery: >95% success rate

### Phase 4 (Advanced Features) — Planned
- [ ] AI chat: <3s response time, >80% user satisfaction
- [ ] Loyalty program: >40% of customers enrolled
- [ ] Inventory tracking: 99.9% accuracy
- [ ] Analytics dashboard: <5s load time for reports

### Phase 5 (Expansion) — Planned
- [ ] i18n: Support 4+ languages, <2% translation lag
- [ ] Multi-currency: Accurate rates updated hourly
- [ ] Store management: Support 10+ locations with independent menus

### Phase 6 (Mobile) — Planned
- [ ] App store ratings: >4.5 stars (1,000+ reviews)
- [ ] App size: <150 MB (iOS), <100 MB (Android)
- [ ] Crash rate: <0.1%
- [ ] Monthly active users (MAU): >50,000

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Real-time WebSocket scalability | High | Medium | Load testing before prod; connection pooling; fallback to polling |
| i18n scope creep (Phase 5) | Medium | High | Define MVP language set; use key-value store for easy additions |
| Mobile app store approval delays | Medium | Medium | Start submission 6 weeks before launch; follow guidelines early |
| Database scaling bottleneck | High | Low | Plan for read replicas; monitor query performance; optimize indexes now |
| Design system maintenance burden | Low | Medium | Automate token sync (Figma → CSS); Storybook setup; clear contribution guidelines |

---

## Budget & Resource Allocation

| Phase | Duration | Team Size | Est. Budget* |
|-------|----------|-----------|--------------|
| Phase 2 (Redesign) | 7 weeks | 5–6 | Done |
| Phase 3 (Testing) | 4 weeks | 4–5 | $15–25K |
| Phase 4 (Advanced) | 6 weeks | 6–7 | $30–50K |
| Phase 5 (Localization) | 8 weeks | 5–6 | $40–60K |
| Phase 6 (Mobile) | 6 weeks | 4–5 | $25–40K |

*Estimates include eng, design, QA, PM; exclude infrastructure.

---

## Key Stakeholders & DRI (Directly Responsible Individual)

| Role | Responsible Party | Contact |
|------|-------------------|---------|
| Product Manager | — | (assign) |
| Design Lead | — | (assign) |
| Backend Lead | — | (assign) |
| Frontend Lead | — | (assign) |
| Mobile Lead | — | (assign) |
| QA Lead | — | (assign) |
| DevOps Lead | — | (assign) |

---

## How to Use This Roadmap

1. **For Planning:** Reference timeline and dependencies when scheduling sprints
2. **For Prioritization:** Use phase order and success metrics to guide backlog
3. **For Communication:** Share phase summaries in stakeholder updates
4. **For Tracking:** Update phase status and milestone dates monthly
5. **For Unblocking:** Identify if delays in earlier phases impact downstream work

---

## Updates & Revisions

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-19 | 1.0 | Phase 2 (Kamatcha Zen redesign) marked complete; Phase 3 started |
| — | — | — |

**Last Updated:** 2026-04-19  
**Next Review:** 2026-05-17 (monthly cadence)
