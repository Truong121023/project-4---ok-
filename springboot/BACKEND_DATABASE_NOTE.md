# Backend And Database Note

Updated on 2026-03-30.
Scope: this file describes the current Tea Matcha backend in this repo, including backend modules, role behavior, persistence model, and the actual database shape produced by the Spring Boot application.

## 1. System Overview

- Framework: Spring Boot `3.5.11`
- Language: Java `17`
- Build tool: Maven wrapper via `mvnw.cmd`
- Main app: `com.example.registrationotp.RegistrationOtpApplication`
- Base REST path: `/api`
- Upload static path: `/uploads/**`
- Realtime path: Socket.IO on `/socket.io`
- Database engine: MySQL
- Active database name in local config: `matcha_tea`
- ORM: Spring Data JPA + Hibernate
- Schema mode: `spring.jpa.hibernate.ddl-auto=update`
- Auth model: opaque session token stored in database, not JWT
- Password hashing: BCrypt
- Email: SMTP Gmail for OTP and payment-related mail
- Payment: PayOS integration
- Support chat persistence: RAM only, not SQL

## 2. Backend Package Structure

- `config`: app config, CORS, upload config, mail/session/payment properties, Socket.IO wiring
- `controller`: REST entrypoints for auth, public APIs, user APIs, employee APIs, admin APIs, PayOS webhook, support chat store list
- `service`: business logic
- `repository`: Spring Data JPA repositories
- `model`: JPA entities and enums
- `dto`: request/response DTOs
- `handler`: global exception mapping
- `seed`: demo data reseed logic
- `support`: helper normalizers and utility classes

## 3. Runtime Configuration

Current `application.properties` behavior:

- App runs on port `8080`
- CORS allows local frontend origins:
  - `http://localhost:3000`
  - `http://127.0.0.1:3000`
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
  - `http://localhost:4173`
  - `http://127.0.0.1:4173`
- Uploads are saved under local folder `uploads`
- Multipart limits:
  - max file size `10MB`
  - max request size `50MB`
- Session expiry is controlled by `app.session.exp-days`
- OTP expiry is controlled by `app.otp.exp-minutes`
- PayOS can be turned on/off with `app.payos.enabled`

## 4. Authentication And Session Model

- `POST /api/auth/register`: create account
- `POST /api/auth/verify-otp`: verify email OTP
- `POST /api/auth/password/request-otp`: request password reset OTP
- `POST /api/auth/password/reset`: reset password with OTP
- `POST /api/auth/login`: email/password login
- `POST /api/auth/google/login`: Google login
- `POST /api/auth/google/complete-profile`: complete profile after Google login
- `GET /api/auth/me`: validate token and fetch current user
- `POST /api/auth/logout`: invalidate current session

Important behavior:

- Backend returns `Authorization: Bearer <accessToken>` style session token
- Token is stored in table `user_sessions`
- `GET /api/auth/me` checks DB-backed session validity
- Non-admin users can still log in successfully; frontend must check role for admin UI
- User must be verified before normal login
- `workingStoreId` is important for `MANAGER` and `SHIPPER`

## 5. Backend Functional Domains

### 5.1 Public Catalog Domain

Purpose:

- provide storefront data for users before or after login
- expose home page, stores, dishes, events, news, and public reviews

Main endpoints:

- `GET /api/public/home`
- `GET /api/public/stores`
- `GET /api/public/stores/{storeKey}`
- `GET /api/public/dishes`
- `GET /api/public/dishes/{dishId}`
- `GET /api/public/events`
- `GET /api/public/events/{eventKey}`
- `GET /api/public/news`
- `GET /api/public/news/{newsKey}`
- `GET /api/public/reviews`

Main backend behavior:

- supports store lookup by numeric id or slug
- supports event lookup by numeric id or slug
- supports news lookup by numeric id or slug
- calculates storefront availability such as `open`, `disabled`, `disabledReason`, and effective store-dish price
- returns related data like store info, featured dishes, reviews, and nearby/best-store hints

### 5.2 User Domain

Purpose:

- authenticated customer features after login

Main features:

- cart and checkout
- delivery addresses
- favorites
- user orders and payment refresh
- reviews
- feedback submission
- notifications
- current level lookup
- support chat entrypoint

Main endpoints:

- `GET/POST/PUT/DELETE /api/user/cart...`
- `GET/POST/PUT/DELETE /api/user/delivery-addresses...`
- `GET/POST/DELETE /api/user/favorites`
- `GET /api/user/orders`
- `GET /api/user/orders/{id}`
- `POST /api/user/orders/{id}/refresh-payment`
- `GET /api/user/levels/current`
- `GET/POST/PUT/DELETE /api/reviews` and `/api/user/reviews`
- `GET/POST/DELETE /api/user/feedbacks`
- `GET/PUT /api/user/notifications...`
- `GET /api/support-chat/stores`

Main backend behavior:

- cart groups items by store at checkout time
- one checkout can create multiple store-level orders
- selected delivery address can be promoted to primary automatically
- user can favorite and review supported targets
- review targets currently supported in active flows:
  - `STORE`
  - `EVENT`
  - `DISH`
- feedback can be linked to store and/or order
- notifications support read/unread flow
- support chat lets user start one live chat session for one chosen store

### 5.3 Employee Domain

Purpose:

- daily operations for `MANAGER` and `SHIPPER`

Main endpoints:

- `GET /api/employee/orders`
- `GET /api/employee/orders/{id}`
- `POST /api/employee/orders/{id}/accept-preparing`
- `POST /api/employee/orders/{id}/mark-ready`
- `POST /api/employee/orders/{id}/complete-preparing`
- `POST /api/employee/orders/{id}/accept-delivery`
- `POST /api/employee/orders/{id}/complete-delivery`
- `GET/PUT /api/employee/notifications...`

Main backend behavior:

- `MANAGER` can accept orders in `CONFIRMED` state and move them into preparing flow
- `MANAGER` completes preparing flow by moving order to `READY_FOR_SHIPPER`
- `SHIPPER` can accept orders in `READY_FOR_SHIPPER`
- `SHIPPER` completes delivery by moving order to `COMPLETED`
- employee notifications are stored in the same notification table as user notifications, but filtered by employee use case
- work schedule and attendance APIs are disabled

### 5.4 Admin And Manager Domain

Purpose:

- operational CRUD and moderation

Main endpoints:

- `GET /api/admin/dashboard`
- `GET /api/admin/summary`
- `POST /api/admin/uploads/images`
- `/api/admin/users`
- `/api/admin/stores`
- `/api/admin/events`
- `/api/admin/categories`
- `/api/admin/dishes`
- `/api/admin/store-dishes`
- `/api/admin/news`
- `/api/admin/orders`
- `/api/admin/promotions`
- `/api/admin/user-levels`
- `/api/admin/feedbacks`
- `/api/admin/reviews`

Main backend behavior:

- admin dashboard returns big preview payload for management screens
- admin summary returns lightweight counts
- uploads return image paths that frontend can save directly
- admin manages users, stores, events, categories, dishes, store inventories, news, promotions, orders, feedback replies, and reviews
- manager access is store-scoped by `workingStoreId`

### 5.5 Payment Domain

Purpose:

- create and refresh payment links for checkout orders
- process payment status callbacks

Main endpoints:

- `POST /api/user/cart/checkout`
- `POST /api/user/orders/{id}/refresh-payment`
- `POST /api/payos/webhook`

Main backend behavior:

- checkout creates one or more orders from cart data
- backend can create PayOS payment link data
- webhook can update payment state
- order payment fields are stored directly on `orders`

### 5.6 Notification Domain

Purpose:

- notify users and employees about new events, news, and order state changes

Main backend behavior:

- new active event can trigger brand event notifications
- newly published news can trigger notifications
- order creation and order status changes can trigger notifications
- paid orders can trigger waiting-for-manager notifications
- ready orders can trigger waiting-for-shipper notifications

### 5.7 Support Chat Domain

Purpose:

- realtime support inbox between user and admin/manager

REST:

- `GET /api/support-chat/stores`

Socket events received from client:

- `support:user_session:start`
- `support:message:send`

Socket events pushed from server:

- `support:user_state`
- `support:admin_state`

Main backend behavior:

- Socket.IO runs on same host as API
- socket auth uses handshake token
- user chat sessions are stored only in memory
- first admin/manager reply claims the chat
- manager only sees chats for their assigned store
- admin can see all or store-scoped sessions depending on backend filtering logic
- user disconnect deletes chat session from RAM immediately
- admin disconnect releases claim if user is still online

Important database note:

- support chat has no SQL table in current backend

## 6. Role Behavior

- `ADMIN`: full system access. Can manage all stores, all users, all admin resources, all orders, promotions, levels, schedules, feedback moderation, reviews, and support inbox.
- `MANAGER`: store-scoped operational access for their `workingStoreId`. Can manage their own store's operational data and their own shipper accounts. Cannot create/delete branches and cannot create or promote anyone to `ADMIN` or `MANAGER`.

- `SHIPPER`: receives orders waiting for shipper, starts delivery, and marks delivery complete.
- `USER`: storefront role. Can browse catalog, place orders, manage addresses, reviews, favorites, feedback, notifications, and support chat.

## 7. Database Strategy

- Main database is MySQL
- Hibernate auto-updates schema from entity classes
- Most arrays and ordered lists are stored through `@ElementCollection` tables
- Files are not stored in MySQL; only file paths are stored
- Support chat is not persisted in database
- Notifications have an extra schema initializer for MySQL compatibility

## 8. Main Entity Tables

### 8.1 Identity And Access Tables

- `users`: main account table with name, email, password hash, role, enabled flag, verification timestamp, optional `working_store_id`
- `user_sessions`: opaque access token table with expiry time
- `email_otps`: OTP codes for registration verification and password reset
- `user_delivery_addresses`: saved delivery addresses per user
- `user_level_definitions`: store-specific customer level thresholds
- `user_notifications`: notifications for users and employees

### 8.2 Catalog And Brand Tables

- `stores`: branch/store master data
- `categories`: menu categories, optionally store-scoped
- `dishes`: product master data, linked to category
- `store_dishes`: store-specific stock, availability, and price override for a dish
- `events`: store event data
- `news_articles`: news and editorial content
- `content_sections`: shared long-form section table for store, dish, event, and news

### 8.3 Commerce Tables

- `carts`: open cart per user context
- `cart_items`: store-level items inside cart
- `orders`: order header, payment state, delivery info, assignments, discounts
- `order_items`: order lines
- `promotions`: promotion master data and eligibility rules

### 8.4 Experience And Moderation Tables

- `favorites`: user favorites by polymorphic target
- `reviews`: user reviews by polymorphic target
- `customer_feedbacks`: feedback tickets plus admin reply fields

### 8.5 Workforce Tables

- `employee_work_schedules`: legacy workforce scheduling table, no active API contract
- `employee_attendances`: legacy attendance table, no active API contract

## 9. Collection Tables And Auxiliary Tables

These tables exist because several entities store ordered arrays or tag lists.

- `store_image_paths`
- `store_highlight_tags`
- `store_service_tags`
- `category_image_paths`
- `dish_image_paths`
- `dish_highlight_tags`
- `event_image_paths`
- `event_highlight_tags`
- `event_featured_dish_ids`
- `news_article_image_paths`
- `news_article_tags`
- `content_section_image_paths`
- `promotion_applicable_dishes`
- `promotion_eligible_stores`
- `promotion_eligible_user_levels`
- `order_promotion_dish_ids`

## 10. Core Database Relationships

- `users.working_store_id -> stores.id`
- `user_sessions.user_id -> users.id`
- `email_otps.user_id -> users.id`
- `user_delivery_addresses.user_id -> users.id`
- `user_notifications.user_id -> users.id`
- `user_level_definitions.store_id -> stores.id`
- `categories.store_id -> stores.id`
- `dishes.category_id -> categories.id`
- `store_dishes.store_id -> stores.id`
- `store_dishes.dish_id -> dishes.id`
- `events.store_id -> stores.id`
- `news_articles.related_store_id -> stores.id`
- `content_sections.store_id -> stores.id`
- `content_sections.dish_id -> dishes.id`
- `content_sections.event_id -> events.id`
- `content_sections.news_article_id -> news_articles.id`
- `carts.user_id -> users.id`
- `cart_items.cart_id -> carts.id`
- `cart_items.store_id -> stores.id`
- `cart_items.dish_id -> dishes.id`
- `orders.user_id -> users.id`
- `orders.preparing_staff_id -> users.id`
- `orders.delivering_shipper_id -> users.id`
- `order_items.order_id -> orders.id`
- `order_items.store_id -> stores.id`
- `order_items.dish_id -> dishes.id`
- `customer_feedbacks.user_id -> users.id`
- `customer_feedbacks.related_store_id -> stores.id`
- `customer_feedbacks.related_order_id -> orders.id`
- `employee_work_schedules.user_id -> users.id`
- `employee_work_schedules.store_id -> stores.id`
- `employee_attendances.user_id -> users.id`
- `employee_attendances.store_id -> stores.id`
- `employee_attendances.work_schedule_id -> employee_work_schedules.id`

## 11. Important Database Design Notes

- `orders` does not store direct `store_id` on the header; store-related fields in responses are derived from `order_items`
- `store_dishes` is the real source of truth for store inventory, sellable availability, and price override
- `dishes` belong to `categories`; store scoping for a dish is usually inferred through `category.store`
- `content_sections` replaced older separate section tables and now acts as one shared section table
- `favorites` and `reviews` are polymorphic records using `target_type` + `target_id`, not foreign keys to every target table
- `customer_feedbacks` stores admin reply directly in the same table, not in a separate reply table
- `user_notifications` stores denormalized related ids and links for fast client rendering

## 12. Important Constraints And Uniqueness Rules

- `users.email` is unique
- `user_sessions.token` is unique
- `store_dishes` is unique on `(store_id, dish_id)`
- `favorites` is unique on `(user_id, target_type, target_id)`
- `reviews` is unique on `(user_id, target_type, target_id)`
- `user_level_definitions` is unique on `(store_id, code)`
- `employee_work_schedules` is unique per `(user_id, work_date)`
- `employee_attendances` is unique per `(user_id, work_date)`

## 13. Status And Enum Concepts Used Across Backend

- `Role`: `ADMIN`, `MANAGER`, `SHIPPER`, `USER`
- `OrderStatus`: `PENDING`, `CONFIRMED`, `PREPARING`, `READY_FOR_SHIPPER`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELLED`
- `PaymentStatus`: `PENDING`, `PAID`, `CANCELLED`, `FAILED`
- `DeliveryType`: `IMMEDIATE`, `SCHEDULED`
- `PromotionScope`: `ORDER`, `DISH`
- `PromotionDiscountType`: `PERCENT`, `FIXED_AMOUNT`
- `ReviewTargetType`: `STORE`, `EVENT`, `CATEGORY`, `DISH`
- `FavoriteTargetType`: target enum for favorites
- `FeedbackCategory`: feedback classification enum
- `UserNotificationType`: `BRAND_EVENT`, `NEWS_ARTICLE`, `ORDER_STATUS`, `ORDER_TASK`

Note:

- current active review flows only support `STORE`, `EVENT`, and `DISH`
- legacy `CATEGORY` review data may still exist historically

## 14. File Storage And Upload Model

- image binaries are written to local disk under the configured upload directory
- backend returns relative paths such as `/uploads/...`
- database stores only string paths in image collection tables
- admin upload API is `POST /api/admin/uploads/images`

## 15. Demo Data And Local Development

- demo reseed logic is implemented in `DemoDataSeeder`
- reseed runner can be triggered by property `app.demo.reseed=true`
- reseed flow seeds expected tables, sample catalog data, sample users, orders, reviews, feedbacks, notifications, schedules, and attendance data
- seeded content volume is designed around `20` stores and related records
- default seeded password in seeder is `12312345`

Important local behavior:

- backend expects MySQL database `matcha_tea`
- because schema uses `ddl-auto=update`, missing tables are created or updated from entities on startup
- if MySQL is not available, app will not boot successfully

## 16. Backend Responsibilities In One Summary

The backend is responsible for:

- account registration, verification, login, logout, and Google login
- session management with opaque DB tokens
- public catalog serving for stores, dishes, events, news, and reviews
- user commerce flow from cart to checkout to payment refresh
- promotion calculation and discount allocation
- delivery address management
- user reviews, favorites, feedbacks, and notifications
- employee schedule, attendance, and order handling
- admin CRUD for all business content and operational resources
- manager store-scoped operations
- PayOS webhook processing
- SMTP email sending for OTP and payment communication
- image upload and path persistence
- realtime support chat without SQL persistence

## 17. Related Reference Files

- `API_QUICK_REFERENCE.md`
- `FRONTEND_USER_API.md`
- `FRONTEND_ADMIN_API.md`
- `FRONTEND_ROLE_API_NOTE.md`
- `BACKEND_RELATION_AUDIT.md`
