# Codebase Summary

## Project Overview

**Kamatcha** is a full-stack e-commerce platform for a premium matcha store chain. The platform includes customer-facing web apps, admin dashboards, and employee delivery/order management tools across three technology stacks: React.js (web), Flutter (mobile), and Spring Boot (backend).

**Current Status:** Frontend redesign (Kamatcha Zen) completed. Phase: Integration & Testing.

---

## Directory Structure

```
project-4---ok-/
├── reactjs/                          # React.js web frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # 26 design primitives
│   │   │   ├── cards/                # 3 domain cards (dish, news, store)
│   │   │   ├── admin/                # 4 admin-specific components
│   │   │   ├── employee/             # 6 employee-specific components
│   │   │   ├── templates/            # 6 page templates
│   │   │   └── [global components]   # Layouts, modals, sidebars
│   │   ├── pages/                    # Page components
│   │   ├── lib/                      # API client, utilities
│   │   ├── styles.css                # Kamatcha Zen tokens & utilities
│   │   └── ui.js                     # Utility functions
│   ├── tailwind.config.js            # (Tailwind v4, no custom config needed)
│   ├── index.html                    # Entry point
│   └── pubspec.yaml
│
├── flutter/                          # Flutter mobile app
│   ├── lib/
│   │   ├── app/                      # App initialization
│   │   ├── core/                     # Models, services, utils
│   │   ├── screens/                  # Page components
│   │   └── widgets/                  # Reusable widgets
│   ├── test/                         # Unit/widget tests
│   └── pubspec.yaml
│
├── springboot/                       # Spring Boot API backend
│   ├── src/main/java/com/example/
│   │   ├── controller/               # REST endpoints
│   │   ├── service/                  # Business logic
│   │   ├── model/                    # Entity models
│   │   ├── repository/               # Data access
│   │   └── config/                   # Framework config
│   ├── src/main/resources/
│   │   └── application.properties    # Database, auth config
│   └── pom.xml
│
└── docs/                             # Project documentation
    ├── design-guidelines.md          # Kamatcha Zen design system
    ├── codebase-summary.md           # This file
    ├── code-standards.md             # Coding patterns & conventions
    ├── system-architecture.md        # System design & data flow
    ├── project-overview-pdr.md       # PDR & requirements
    └── project-roadmap.md            # Milestones & progress
```

---

## React.js Frontend (`reactjs/`)

### Design System
- **Tokens:** Kamatcha Zen colors (matcha-500 primary accent), typography (Noto Serif Display, Inter, JetBrains Mono), spacing (Ma system)
- **Framework:** Tailwind CSS v4 with `@theme` custom properties
- **Build:** 271.71 kB gzipped; 0 new runtime dependencies
- **Coverage:** 33 pages restyled (customer, admin, employee domains)

### Component Architecture

#### UI Primitives (`src/components/ui/`, 26 total)
Foundational building blocks following Zen design language.

| Category | Components |
|----------|------------|
| **Forms** | Button, IconButton, Input, Textarea, Checkbox, Radio, Select, Switch |
| **Feedback** | Toast, Tooltip, Badge, Tag |
| **Layout** | Card, Dialog, Sheet, Breadcrumb, Pagination, Table |
| **Content** | Avatar, Empty State, Skeleton, Stepper |
| **Navigation** | Tabs |
| **Commerce** | Price Tag |

**Key properties:** Rounded corners (6–28px), soft shadows, matcha accents, full accessibility (focus rings, motion preferences).

#### Domain Cards (`src/components/cards/`, 3 total)
Specialized multi-element components for common content patterns.

- **dish-card.jsx** — Product with image, title, description, price, action buttons
- **news-card.jsx** — Promotional content with headline, metadata, image
- **store-card.jsx** — Location info (address, hours, distance, contact)

#### Admin Components (`src/components/admin/`, 4 total)
High-density tools for resource management and analytics.

- **admin-data-table.jsx** — Paginated, filterable, sortable data grid
- **admin-form-grid.jsx** — Multi-column form for CRUD operations
- **admin-page-header.jsx** — Section title, breadcrumb, actions
- **admin-stat-card.jsx** — KPI display (value, trend, label)
- **AdminFormField.jsx** — Controlled input wrapper with validation
- **adminSchema.js** — Form validation and default values

**Density:** Compact (14px font, reduced spacing) for efficiency.

#### Employee Components (`src/components/employee/`, 6 total)
Delivery and order management for field staff.

- **employee-order-card.jsx** — Order summary (items, status, quick actions)
- **employee-order-detail-panel.jsx** — Full context (items, customer, delivery, timeline)
- **employee-orders-panel.jsx** — Paginated active/recent orders
- **employee-header-section.jsx** — User greeting, shift status, notifications
- **employee-notifications-panel.jsx** — Alerts and messages
- **employee-delivery-proof-section.jsx** — Photo upload, timestamp, verification

**Density:** Airy on mobile, compact in web dashboard. Real-time updates via WebSocket.

#### Page Templates (`src/components/templates/`, 6 total)
Full-page layouts orchestrating primitives and domain components.

- **Customer Home** — Hero, featured products carousel, store locator, loyalty CTA
- **Customer Product Detail** — Image gallery, info panel, customization, reviews, related items
- **Customer Checkout** — Cart review, shipping, payment, order summary
- **Admin Dashboard** — Analytics, resource tables, system health
- **Employee Dashboard** — Active orders, map, notifications, shift timer
- **Store Locator** — Interactive map, store cards, hours, directions

#### Global Components (`src/components/`)
Framework-level layouts and utilities.

- **SiteLayout.jsx** — Root layout with nav, sidebar, footer
- **AdminLayout.jsx** — Admin-specific layout with sidebar, breadcrumb
- **LeftSidebar.jsx** — Navigation sidebar (role-aware)
- **DetailModal.jsx** / **ImageGalleryModal.jsx** — Reusable modals
- **AIChatWidget.jsx** / **FloatingAIChatWidget.jsx** — AI assistant (matcha knowledge)
- **PaymentQrCard.jsx** — QR code payment display
- **AutoCarousel.jsx** — Image/product carousel with auto-advance
- **MediaLibrary.jsx** — File upload and management
- **InvoicePreviewModal.jsx** — Order/receipt preview

### Styling & Tokens

**File:** `src/styles.css` (243 lines)

**Contents:**
1. **Tokens** (`@theme` block) — Colors (matcha, cream, beige, ink scales), typography (fonts), spacing (Ma system), radii, shadows
2. **Base layer** — HTML/body defaults, heading scales (fluid), focus rings, selections, scrollbar
3. **Utilities layer** — Gradients (matcha-mist, stone), motion (scroll reveal, toast), density modes (airy/compact)

**No Tailwind config file** — All customization via CSS custom properties; Tailwind v4 reads `@theme` automatically.

### Pages (`src/pages/`)
Functional page components consuming templates and primitives.

- **HomePage.jsx** — Customer landing
- **DishDetailPage.jsx** — Product view with reviews
- **OrdersPage.jsx** — Order history and tracking
- **CheckoutPage.jsx** — Multi-step checkout
- **LoginPage.jsx** — Authentication
- **AccountPage.jsx** — Profile, preferences, loyalty
- **AdminPage.jsx** — Admin resource management
- **PaymentStatusPage.jsx** — Payment confirmation/error
- **FeedbacksScreen.jsx** — Review submissions

### API & Services (`src/lib/`)

**siteApi.js** — REST client for backend communication

Endpoints (examples):
- `GET /dishes` — Product listing
- `POST /orders` — Create order
- `GET /users/{id}` — User profile
- `POST /auth/login` — Authentication
- `GET /stores` — Location list
- `POST /feedback` — Review submission

**UI Utilities** (`ui.js`)
- Format currency, dates, phone numbers
- Validation helpers
- Toast/notification dispatch

---

## Flutter Mobile App (`flutter/`)

### Architecture

```
lib/
├── app/
│   ├── app_controller.dart        # App-level state (auth, user, theme)
│   └── app.dart                   # Root widget, routing
├── core/
│   ├── models/
│   │   ├── auth_models.dart       # LoginRequest, UserProfile, Token
│   │   ├── commerce_models.dart   # Dish, Order, CartItem
│   │   └── user_front_models.dart # FrontendUser, Preferences
│   ├── services/
│   │   ├── api_service.dart       # HTTP client wrapper
│   │   ├── auth_service.dart      # Login, logout, token refresh
│   │   └── mock_data.dart         # Demo data for development
│   └── utils/
│       ├── formatters.dart        # Currency, date, phone formatters
│       ├── shipping_fee_estimator.dart
│       └── [other utils]
├── screens/
│   ├── home_screen.dart
│   ├── product_detail_screen.dart
│   ├── checkout_screen.dart
│   ├── order_detail_screen.dart
│   ├── profile_screen.dart
│   ├── loyalty_levels_screen.dart
│   ├── feedbacks_screen.dart
│   ├── ai_chat_screen.dart
│   ├── checkout_result_screen.dart
│   ├── admin/
│   ├── employee/
│   └── [other screens]
├── widgets/
│   ├── order_processing_timeline.dart
│   ├── payment_widgets.dart
│   └── [other reusable widgets]
└── test/
    └── widget_test.dart
```

### Key Components

**App Controller** — Manages authentication state, user session, theme (tied to design tokens)

**Models** — Type-safe representations of API contracts (Dishes, Orders, Users, Cart)

**Services** — Business logic layer (API calls, authentication, data caching)

**Formatters** — Consistent number/date/phone formatting across screens

**Shipping Fee Estimator** — Distance-based calculation logic

### UI Patterns
- Material Design 3 principles adapted to Kamatcha Zen tokens
- Real-time order tracking with timeline widget
- Payment QR code display and status polling
- Review/feedback submission
- Loyalty level progression visualization
- AI chat integration for product recommendations

---

## Spring Boot Backend (`springboot/`)

### Architecture

```
src/main/java/com/example/registrationotp/
├── controller/                # REST endpoints
│   ├── CartController.java
│   ├── DishController.java
│   ├── OrderController.java
│   ├── UserController.java
│   ├── AuthController.java
│   ├── StoreController.java
│   └── [other controllers]
├── service/                   # Business logic
│   ├── CartService.java
│   ├── OrderService.java
│   ├── UserService.java
│   └── [other services]
├── model/                     # JPA entities
│   ├── User.java
│   ├── Dish.java
│   ├── Order.java
│   ├── OrderItem.java
│   ├── Cart.java
│   └── [other entities]
├── repository/                # Data access (JPA)
│   ├── UserRepository.java
│   ├── DishRepository.java
│   ├── OrderRepository.java
│   └── [other repos]
├── config/                    # Framework setup
│   ├── SecurityConfig.java    # JWT auth
│   ├── CorsConfig.java        # CORS headers
│   └── [other configs]
└── RegistrationOtpApplication.java  # Entry point

src/main/resources/
├── application.properties      # DB, auth, server config
├── application-dev.properties  # Development overrides
└── [other config files]
```

### API Contracts

**Core Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Authenticate, return JWT |
| GET | `/dishes` | List all products |
| POST | `/orders` | Create order |
| GET | `/orders/{id}` | Get order details |
| GET | `/users/{id}` | User profile |
| POST | `/cart` | Add item to cart |
| GET | `/stores` | List locations |

**Auth:** JWT tokens in `Authorization: Bearer {token}` header

**Response Format:** JSON with status codes (200, 201, 400, 401, 404, 500)

### Data Models

**User** — Email, password (bcrypt), profile, loyalty points, role (CUSTOMER/ADMIN/EMPLOYEE)

**Dish** — Name, description, price, image URL, category, in-stock flag

**Order** — User ref, items list, total, status (PENDING/CONFIRMED/DELIVERED), created/updated timestamps

**Cart** — User ref, items (dish + quantity), session-scoped

**Store** — Location, hours, contact, geolocation

### Database
- **Type:** PostgreSQL (assumed from config)
- **ORM:** Hibernate via Spring Data JPA
- **Migrations:** Managed via Flyway or Liquibase (confirm in `application.properties`)

### Security
- **Auth:** JWT (stateless)
- **Password:** Bcrypt hashing
- **CORS:** Configured for React/Flutter client origins
- **Rate limiting:** (if enabled in config)

---

## Build & Deployment

### React.js
- **Build tool:** Vite (inferred from build size)
- **Output:** Static assets to `dist/`
- **Size:** 271.71 kB gzipped
- **Deploy:** Serve from CDN or static host (Vercel, Netlify, S3)

### Flutter
- **Build targets:** Android (APK), iOS (IPA), Web
- **State management:** (confirm in `app_controller.dart`)
- **API:** HTTP client wrapping Spring Boot backend

### Spring Boot
- **Build tool:** Maven (`pom.xml`)
- **Runtime:** Java 11+ (confirm in `pom.xml`)
- **Deploy:** Docker container or traditional app server (Tomcat, embedded)
- **Database:** PostgreSQL (connection in `application.properties`)

---

## Testing

### React.js
- Unit tests for utilities (`src/lib/ui.js`)
- Component snapshot tests (Vitest/Jest)
- E2E tests for checkout flow (Cypress/Playwright recommended)
- Accessibility audits (axe-core) on critical pages

### Flutter
- **File:** `flutter/test/widget_test.dart`
- Unit tests for models, services, formatters
- Widget tests for screens
- Golden file tests for UI consistency

### Spring Boot
- Unit tests for services (JUnit, Mockito)
- Integration tests for endpoints
- Database tests (H2 in-memory for fast CI)
- Security tests for JWT and role-based access

---

## Development Workflow

### Git Strategy
- **Main branch:** Production releases
- **Develop branch:** Integration point for features
- **Feature branches:** `feature/{ticket-id}-{description}`
- **Commit messages:** Conventional format (feat:, fix:, docs:, refactor:, test:)

### Environment Variables

**React.js** (`.env`)
```
VITE_API_URL=https://api.kamatcha.local
VITE_AI_CHAT_ENABLED=true
```

**Flutter** (`.env` or `pubspec.yaml`)
```
API_BASE_URL=https://api.kamatcha.local
ANDROID_VERSION_CODE=1
IOS_BUILD_NUMBER=1
```

**Spring Boot** (`application.properties`)
```
spring.datasource.url=jdbc:postgresql://localhost:5432/kamatcha
spring.datasource.username=kamatcha_user
spring.datasource.password=${DB_PASSWORD}
jwt.secret=${JWT_SECRET}
cors.allowed-origins=http://localhost:3000,https://kamatcha.local
```

### Local Development

**React.js:**
```bash
cd reactjs
npm install
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # Lint & format
npm run test         # Unit tests
```

**Flutter:**
```bash
cd flutter
flutter pub get
flutter run          # Run on connected device/emulator
flutter test         # Unit/widget tests
```

**Spring Boot:**
```bash
cd springboot
mvn clean install
mvn spring-boot:run
# or import into IDE (IntelliJ, Eclipse)
```

---

## Integration Points

### Frontend → Backend
- React/Flutter clients call Spring Boot REST API
- Authentication: JWT in Authorization header
- Data format: JSON request/response
- Error handling: Standardized error response format

### State Management
- **React:** Context API or Zustand (TBD, check package.json)
- **Flutter:** InheritedWidget or Provider package
- **Cross-device:** Persistent storage via local API sync

### Real-time Features
- Order status updates: WebSocket or polling every 10s
- Notifications: Push (Firebase Cloud Messaging for Flutter)
- Delivery map: WebSocket for location updates

---

## Documentation Resources

- **Design System:** `docs/design-guidelines.md`
- **Code Standards:** `docs/code-standards.md`
- **System Architecture:** `docs/system-architecture.md`
- **Project PDR:** `docs/project-overview-pdr.md`
- **Roadmap:** `docs/project-roadmap.md`
- **Changelog:** `docs/project-changelog.md`

---

## Key Metrics

| Metric | Value |
|--------|-------|
| **Frontend bundle (React)** | 271.71 kB gz |
| **UI primitives** | 26 |
| **Domain components** | 13 (3 cards + 4 admin + 6 employee) |
| **Page templates** | 6 |
| **Pages restyled** | 33 |
| **Design tokens** | 50+ (colors, spacing, radii, shadows, fonts) |
| **Density modes** | 2 (airy, compact) |
| **API endpoints** | 15+ |
| **Database entities** | 6+ (User, Dish, Order, OrderItem, Cart, Store) |

---

## Known Issues & TODOs

- [ ] E2E test coverage for checkout flow (React)
- [ ] WebSocket implementation for real-time order updates
- [ ] Firebase setup for Flutter push notifications
- [ ] Database migration tooling (Flyway/Liquibase setup)
- [ ] API rate limiting configuration
- [ ] Analytics integration (Mixpanel, GA4)
- [ ] CDN configuration for image assets

---

**Last Updated:** April 2026  
**Redesign Version:** Kamatcha Zen (Phase 1 complete)
