# Project Overview & PDR (Product Development Requirements)

---

## Project Overview

### Vision
Kamatcha is a full-stack e-commerce platform for premium matcha stores, combining traditional Japanese aesthetics with modern digital commerce. The platform enables customers to discover and purchase premium matcha tea, allows staff to manage orders and inventory, and provides owners with operational insights.

### Mission
Deliver a seamless, culturally-grounded shopping experience that reflects the craftsmanship and mindfulness of matcha ceremony, while providing efficient operational tools for store teams.

### Brand
- **Name:** Kamatcha (premium matcha retailer)
- **Aesthetic:** Japanese Zen minimalism
- **Color Palette:** Matcha green (primary), cream/beige (neutral), ink (text) — NO gold
- **Typography:** Serif for display (Noto Serif Display), sans-serif for body (Inter), mono for code (JetBrains Mono)
- **Density:** Airy customer experience, compact efficient admin/employee UX

### Platform Scope
- **Web Frontend:** React.js (customer, admin, employee, public pages)
- **Mobile App:** Flutter (iOS/Android)
- **Backend API:** Spring Boot (REST)
- **Database:** PostgreSQL
- **Design System:** Kamatcha Zen (v1.0 complete, April 2026)

### Target Users
1. **Customers** — Online shoppers discovering and purchasing matcha products
2. **Store Staff** — Order fulfillment, delivery coordination, customer service
3. **Administrators** — Resource management (products, inventory, users, stores, analytics)
4. **Store Owners** — Business insights, multi-location management, reporting

---

## Product Development Requirements (PDR)

### 1. Functional Requirements

#### 1.1 Customer Features (MVP)
- **Product Discovery:** Browse matcha products, filter by category, search
- **Product Details:** View images, description, price, reviews, brewing tips
- **Shopping Cart:** Add/remove items, quantity adjustment, persist across sessions
- **Checkout:** Shipping address, shipping method selection, payment method selection
- **Payment Processing:** Integration with payment gateway (Stripe, Square, local methods)
- **Order History:** View past orders, track status, reorder frequently purchased items
- **Loyalty Program:** Earn points on purchases, view tier status, redeem rewards
- **User Account:** Profile management (name, email, preferences), saved addresses
- **Notifications:** Order status updates (email, in-app), promotional emails (opt-in)
- **AI Chat:** Product recommendations, brewing guidance, FAQ automation

#### 1.2 Admin Features (MVP)
- **Product Management:** Create, read, update, delete (CRUD) dishes/products
  - Fields: Name, description, price, images, category, in-stock flag, SKU
  - Bulk operations: import/export, batch pricing updates
- **Order Management:** View all orders, filter by status/date/customer, export reports
  - Statuses: PENDING, CONFIRMED, PACKED, SHIPPED, DELIVERED, CANCELLED
  - Actions: assign to employee, mark delivered, refund
- **User Management:** View customers, filter/search, manage roles, reset passwords
- **Store Management:** CRUD stores, set hours, manage staff assignments
- **Analytics Dashboard:** KPIs (revenue, orders, customers, avg order value)
  - Time-series charts, comparison periods, export functionality
- **Inventory Tracking:** Stock levels, low-stock alerts, reorder suggestions
- **Promotional Management:** Create/manage discounts, coupon codes, seasonal offers

#### 1.3 Employee Features (MVP)
- **Active Orders:** Real-time list of orders assigned to current shift
  - Filters: status, customer, item count, priority
  - Quick actions: view details, start delivery, mark delivered
- **Delivery Details:** Full order context (items, customer address, phone, notes)
- **Delivery Proof:** Photo upload, timestamp, signature capture (optional)
- **Notifications:** Real-time alerts for new orders, customer messages
- **Shift Management:** Clock in/out, shift status, break tracking
- **Performance Metrics:** Orders completed, delivery time, customer ratings
- **Map Integration:** Real-time delivery route, distance to destination, turn-by-turn directions

#### 1.4 Public Features
- **Store Locator:** Interactive map, store cards (hours, address, phone)
- **Login/Authentication:** Email/password, password reset, role-based redirect
- **Payment Status:** Confirmation page after transaction, receipt download

---

### 2. Non-Functional Requirements

#### 2.1 Performance
- **Page Load Time:** <3 seconds on 4G, <1 second on broadband (Lighthouse)
- **API Response Time:** <200ms p95 for GET requests, <500ms for complex queries
- **Bundle Size:** <300 kB gzipped (React.js)
- **Database Query:** <100ms for top 10 most frequent queries
- **WebSocket Latency:** <500ms for real-time updates (order status, delivery tracking)
- **Mobile App Size:** <150 MB (iOS), <100 MB (Android)

#### 2.2 Scalability
- **Concurrent Users:** Support 10,000 concurrent checkout sessions
- **Database:** PostgreSQL with read replicas for scaling read traffic
- **API:** Stateless Spring Boot services, deployable to Kubernetes for auto-scaling
- **File Storage:** Images and documents on cloud storage (AWS S3, Google Cloud Storage, etc.)
- **Caching:** Redis for session storage, product catalog caching

#### 2.3 Reliability & Availability
- **Uptime SLA:** 99.9% (9 hours downtime/year)
- **Backup Strategy:** Daily automated backups, 30-day retention, tested recovery
- **Disaster Recovery:** RTO 4 hours, RPO 1 hour
- **Monitoring:** Real-time alerts for errors, performance degradation, resource exhaustion

#### 2.4 Security
- **Authentication:** JWT tokens, refresh tokens, secure cookie storage
- **Authorization:** Role-based access control (RBAC) — CUSTOMER, ADMIN, EMPLOYEE
- **Data Protection:** HTTPS everywhere, TLS 1.3+
- **Password Security:** Bcrypt hashing (cost factor 10+), no plaintext storage
- **PCI Compliance:** PCI DSS v3.2.1 if handling card data (recommended: delegate to payment gateway)
- **GDPR Compliance:** User data deletion, consent management, privacy policy
- **Input Validation:** Server-side validation for all inputs, protection against SQL injection, XSS
- **CORS:** Configured for trusted origins only
- **Rate Limiting:** API rate limits to prevent abuse (e.g., 100 req/min per IP for checkout)

#### 2.5 Accessibility
- **WCAG 2.1 Level AA:** All customer-facing pages
- **Keyboard Navigation:** Full keyboard support for all interactive elements
- **Screen Reader:** Semantic HTML, ARIA labels, alt text for images
- **Color Contrast:** Minimum 4.5:1 for normal text, 3:1 for large text
- **Motion:** Respect `prefers-reduced-motion`, disable animations for affected users
- **Mobile Accessibility:** Touch targets ≥44×44px, readable on all screen sizes

#### 2.6 Localization & Internationalization
- **Multi-Language Support:** English, Japanese, Chinese, Korean (Phase 5)
- **Locale-Aware Formatting:** Currency, date, time, numbers per locale
- **RTL Support:** Future-proofed for right-to-left languages
- **Translation Management:** Key-value store (JSON, YAML) for easy translation updates

#### 2.7 Cross-Platform Compatibility
- **Web Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile OS:** iOS 13+, Android 8+
- **Devices:** Responsive design from 320px (mobile) to 2560px (desktop)
- **Network:** Works on 3G (slow); degrades gracefully on poor connectivity

#### 2.8 Maintainability & Code Quality
- **Code Coverage:** ≥80% unit test coverage
- **Documentation:** API docs (OpenAPI/Swagger), architecture diagrams, README files
- **Code Standards:** Linting (ESLint, Prettier), consistent formatting
- **Version Control:** Git with conventional commits, clear PR workflows
- **Dependency Management:** Regular security updates, vulnerability scanning (Snyk, Dependabot)

---

### 3. Acceptance Criteria

#### Phase 2: Kamatcha Zen Redesign (✅ Complete)
- [x] Design system tokens finalized and documented
- [x] 26 UI primitives built and tested
- [x] 13 domain components created
- [x] 6 page templates integrated
- [x] All 33 pages restyled with new design
- [x] Bundle size ≤275 kB gzipped
- [x] WCAG 2.1 AA accessibility compliance
- [x] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [x] Zero new runtime dependencies
- [x] Build exit code: 0

#### Phase 3: Integration & Testing (In Progress)
- [ ] E2E tests cover >80% of critical user paths
- [ ] Lighthouse scores >90 (Performance, Accessibility, Best Practices, SEO)
- [ ] API response time <200ms p95
- [ ] WebSocket latency <500ms
- [ ] Push notification delivery >95% success rate
- [ ] All 15+ API endpoints tested and documented
- [ ] Mobile app tested on iOS and Android
- [ ] QA sign-off on all pages

#### Phase 4: Advanced Features (Planned)
- [ ] AI chat responds in <3s
- [ ] Loyalty program members >40% of customer base
- [ ] Inventory accuracy >99.9%
- [ ] Admin analytics dashboard loads in <5s

---

### 4. User Stories & Workflows

#### Customer Journey: Purchase Matcha
1. User lands on home page → sees featured products, seasonal specials
2. Clicks product card → views product detail (images, description, reviews, price)
3. Selects quantity, customization options (if any) → clicks "Add to Cart"
4. Views cart, adjusts quantities → clicks "Checkout"
5. Enters shipping address → selects shipping method → sees updated total
6. Selects payment method → enters payment details
7. Confirms order → sees order confirmation with order number
8. Receives email with order summary
9. Can track order status in "My Orders"

**Success Metric:** Checkout completion rate >70%

#### Employee Workflow: Fulfill Order
1. Employee logs in → sees "Active Orders" dashboard
2. Sees list of orders assigned to current shift, sorted by priority/time
3. Clicks order → views full details (items, customer address, special notes)
4. Packs items → marks "Ready for Delivery"
5. Picks up items → starts delivery (location tracking begins)
6. Arrives at customer location → takes delivery proof photo
7. Marks order "Delivered" → system sends customer confirmation
8. Completes shift → clock out, view performance metrics

**Success Metric:** Average delivery time <30 minutes, customer rating >4.5/5

#### Admin Workflow: Manage Inventory
1. Admin logs in → clicks "Products" or "Inventory"
2. Views current stock levels, filters by category, sees low-stock items
3. Updates product details (price, description, images)
4. Creates bulk discount for seasonal promotion
5. Exports inventory report for auditing
6. Sets low-stock alert threshold
7. Reviews analytics dashboard (revenue, top products, customer retention)

**Success Metric:** Inventory accuracy >99.9%, reporting latency <5s

---

### 5. Technical Architecture

#### Frontend Stack
- **React.js:** UI library (v18+)
- **Tailwind CSS:** Styling (v4 with `@theme` tokens)
- **State Management:** Context API or Zustand (TBD)
- **HTTP Client:** Fetch API or Axios
- **Routing:** React Router
- **Form Handling:** React Hook Form with Zod/Yup validation
- **Animations:** CSS transitions, React Transition Group (optional)
- **UI Components:** Custom Zen component library (26 primitives)

#### Mobile Stack
- **Flutter:** Cross-platform (iOS/Android)
- **State Management:** Provider or BLoC
- **HTTP:** http or dio package
- **Local Storage:** shared_preferences or hive
- **Notifications:** firebase_messaging
- **Maps:** google_maps_flutter

#### Backend Stack
- **Framework:** Spring Boot (v3.0+)
- **Language:** Java 17+
- **ORM:** Spring Data JPA with Hibernate
- **Database:** PostgreSQL 14+
- **Cache:** Redis (optional, for session storage)
- **Authentication:** Spring Security with JWT
- **Testing:** JUnit 5, Mockito, TestContainers
- **Build:** Maven or Gradle
- **Logging:** SLF4J with Logback

#### Infrastructure
- **Hosting:** Cloud platform (AWS, GCP, Azure) or on-premises
- **Containerization:** Docker
- **Orchestration:** Kubernetes (for scaling)
- **CI/CD:** GitHub Actions, GitLab CI, or Jenkins
- **Monitoring:** Prometheus, Grafana, ELK stack
- **CDN:** Cloudflare or AWS CloudFront
- **Storage:** Cloud blob storage (S3, GCS, Azure Blob)

---

### 6. Data Models (Entity Relationships)

```
User (1) ─── (*) Order
  ├─ email: String
  ├─ password: String (bcrypt)
  ├─ role: Enum(CUSTOMER, ADMIN, EMPLOYEE)
  └─ createdAt: DateTime

Order (1) ─── (*) OrderItem ─── (1) Dish
  ├─ userId: FK
  ├─ storeId: FK
  ├─ status: Enum(PENDING, CONFIRMED, SHIPPED, DELIVERED)
  ├─ totalPrice: Decimal
  ├─ shippingAddress: String
  └─ createdAt: DateTime

Dish (*) ─── (1) Category
  ├─ name: String
  ├─ description: Text
  ├─ price: Decimal
  ├─ imageUrl: String
  ├─ inStock: Boolean
  └─ sku: String

Store (1) ─── (*) Employee
  ├─ name: String
  ├─ address: String
  ├─ hoursOpen: String
  └─ geolocation: Point

Cart (1) ─── (1) User
  └─ (*) CartItem ─── (1) Dish

Review (*) ─── (1) User, Dish
  ├─ rating: Int(1-5)
  ├─ comment: Text
  └─ createdAt: DateTime
```

---

### 7. API Contract (OpenAPI/Swagger)

#### Authentication Endpoints

```
POST /auth/login
  Request: { email, password }
  Response: { accessToken, refreshToken, user: { id, email, role } }

POST /auth/refresh
  Request: { refreshToken }
  Response: { accessToken }

POST /auth/logout
  Request: { refreshToken }
  Response: { message: "Logged out" }
```

#### Product Endpoints

```
GET /dishes?category=matcha&inStock=true&limit=20&offset=0
  Response: { dishes: [{id, name, price, image, category}], total }

GET /dishes/{id}
  Response: { id, name, price, description, images[], reviews[], ingredients }

POST /dishes (ADMIN only)
  Request: { name, description, price, imageUrl, category, sku }
  Response: { id, createdAt }
```

#### Order Endpoints

```
POST /orders
  Request: { dishIds: [{id, quantity}], shippingAddress, shippingMethod, paymentMethod }
  Response: { orderId, status, totalPrice, estimatedDelivery }

GET /orders/{id}
  Response: { id, items, customer, status, timeline: [{status, timestamp}] }

GET /users/{id}/orders
  Response: { orders: [{id, date, status, total}], count }

PATCH /orders/{id}/status
  Request: { status: "CONFIRMED" | "SHIPPED" | "DELIVERED" }
  Response: { updated order object }
```

#### User Endpoints

```
GET /users/{id}
  Response: { id, email, name, phone, addresses[], loyaltyTier, points }

PATCH /users/{id}
  Request: { name, phone, preferences }
  Response: { updated user object }

DELETE /users/{id}
  Response: { message: "User deleted" }
```

#### Store Endpoints

```
GET /stores
  Response: { stores: [{id, name, address, hours, coords}] }

GET /stores/{id}/inventory
  Response: { dishes: [{id, name, stock}] }
```

---

### 8. Success Metrics & KPIs

#### Business Metrics
- **Monthly Revenue:** Target growth >20% YoY
- **Order Volume:** >10,000 orders/month by end of year
- **Customer Acquisition Cost (CAC):** <$20
- **Customer Lifetime Value (CLV):** >$500
- **Repeat Purchase Rate:** >40%
- **Average Order Value (AOV):** >$35

#### User Metrics
- **Conversion Rate:** >5% (visitor → customer)
- **Checkout Abandonment:** <30%
- **Order Tracking View Rate:** >60% of customers
- **Loyalty Program Enrollment:** >35%
- **Customer Satisfaction (NPS):** >40

#### Technical Metrics
- **Page Load Time:** <3s (4G), <1s (broadband)
- **API Availability:** >99.9%
- **Error Rate:** <0.1%
- **Mobile App Rating:** >4.5 stars
- **Crash Rate:** <0.1%
- **E2E Test Coverage:** >80%

---

### 9. Constraints & Assumptions

#### Constraints
- **Budget:** Limited to $150K for phases 3–6 (engineering, design, ops)
- **Team Size:** 8–10 people across eng, design, QA, PM
- **Timeline:** Phase 3–7 over 24 weeks (6 months)
- **Regulatory:** GDPR, local e-commerce laws (Japan, target markets)
- **Hosting:** Must run on standard cloud platforms (AWS, GCP) or on-premises

#### Assumptions
- **Customer Base:** Starting with local market (Japan), expanding regionally in Phase 5
- **Payment Gateway:** Third-party provider (Stripe, Square, local methods) handles card processing
- **Shipping:** Integrated with logistics partner for tracking
- **Technology:** Team has experience with React, Spring Boot, Flutter (no major training budget)
- **Third-Party APIs:** Google Maps, Firebase, payment gateway available and reliable

---

### 10. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| WebSocket scalability (Phase 3) | High | Medium | Load test early; fallback to polling; use connection pooling |
| Payment gateway downtime | High | Low | Use backup processor; implement retry logic; customer notifications |
| Design system maintenance | Medium | Medium | Automate token sync (Figma→CSS); Storybook setup; clear contribution guidelines |
| Mobile app store approval delays | Medium | Medium | Start submission 6 weeks early; follow guidelines closely; prepare for resubmission |
| Database scaling bottleneck | High | Low | Monitor queries; optimize indexes; plan read replicas; cache frequently accessed data |
| Key person dependency | Medium | Medium | Cross-train team; document architecture; knowledge sharing sessions |

---

### 11. Phase Checklist & Exit Criteria

#### Phase 2: Kamatcha Zen Redesign (✅ Complete)
- [x] Design finalized and approved by stakeholders
- [x] UI component library built (26 primitives)
- [x] All pages restyled
- [x] Accessibility audit passed
- [x] Performance review completed
- [x] Code review approved
- [x] Merged to `main` branch
- **Exit:** Production deploy ready (pending Phase 3 testing)

#### Phase 3: Integration & Testing (In Progress)
- [ ] E2E tests written and passing (>80% coverage)
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Mobile testing completed
- [ ] Documentation updated
- [ ] Staging environment validated
- [ ] Production deployment checklist completed
- **Exit:** Ready for Phase 4 feature development

---

## References

- **Design System:** `docs/design-guidelines.md`
- **Codebase:** `docs/codebase-summary.md`
- **Code Standards:** `docs/code-standards.md`
- **System Architecture:** `docs/system-architecture.md`
- **Roadmap:** `docs/project-roadmap.md`
- **Changelog:** `docs/project-changelog.md`

---

**Version:** 1.0  
**Last Updated:** 2026-04-19  
**Next Review:** 2026-05-17
