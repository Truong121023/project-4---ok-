# Backend Relation Audit

Validated against the current Spring Boot backend in `src/main/java`.
This file captures what the backend actually returns today, where the relation contract is already stable, and where the frontend is still expecting a richer shape than the backend currently exposes.

## Scope

- Focus on contract stability, relation fields, routing keys, and store scoping.
- Source of truth for this audit is the backend code in this repo.
- This document is not a frontend patch plan. It is a backend contract cleanup list.

## Executive Summary

- Auth, session, delivery addresses, checkout core, user orders, admin orders core, admin feedbacks, and admin reviews are mostly aligned.
- The largest remaining relation gaps are now around a few public store-card fields and the still-plain-list promotion admin API.
- `CATEGORY` reviews are no longer supported in user/public flows; only `STORE`, `EVENT`, and `DISH` remain active.
- Manager access is already supported for orders, reviews, and feedbacks, with store scoping enforced on the backend.
- The current data model is still store-scoped through `Category -> Store`, while `Dish -> Category`. That means `dish.storeId` is derived through category, not stored directly on `Dish`.

## Confirmed Relation Model

- `User -> workingStoreId -> Store` exists and is returned in user DTOs.
- `Store -> Event[]`, `Store -> Category[]`, and `Store -> StoreDish[]` exist.
- `Category -> storeId` exists and is nullable.
- `Dish -> categoryId` exists. `dish.storeId` is derived from `dish.category.store`.
- `StoreDish -> (storeId, dishId)` is the source of truth for stock, availability, and price override.
- `StoreDish` is unique on `(store_id, dish_id)`.
- `Favorite` is unique on `(user_id, target_type, target_id)`.
- `Review` is unique on `(user_id, target_type, target_id)`.
- `Order` does not persist a direct `storeId` field. `OrderResponse.storeId/storeSlug/storeName` are derived from `items[]`.
- `News -> relatedStoreId` exists and public/admin DTOs already expose `relatedStoreSlug`.
- `Feedback -> relatedStoreId` still exists and can now also be inferred from `relatedOrderId`.

## Public Domain

### Home and Stores

- Status: partial
- `GET /api/public/home` exists and returns `featuredStores`, `featuredDishes`, `upcomingEvents`, `storeLocations`, and `latestNews`.
- `GET /api/public/stores` and `GET /api/public/stores/{storeKey}` already support both store id and slug keys.
- Public store list items include `slug`, `distanceKm`, `open`, `disabled`, and `disabledReason`.
- Public store detail returns `store` as full `StoreResponse`, so detail pages do get `contactEmail`, `phoneNumber`, `hoursText`, `openTime`, `closeTime`, `serviceTags`, and `active`.
- Gap: `PublicStoreCardResponse` does not include `contactEmail`, `phoneNumber`, `hoursText`, `openTime`, `closeTime`, `serviceTags`, or `active`.
- Gap: `storeLocations[]` is a lightweight location object, not a full store card.

### Store Detail Categories and Store Items

- Status: mostly aligned
- `store.categories[]` exists.
- `store.categories[].items[]` exists and is store-specific inventory under the current store.
- Backend now exposes `categoryId`, `franchiseNote`, and `schedulable` on category items.
- Backend now exposes a `title` alias on category sections.

### Dishes

- Status: mostly aligned
- `GET /api/public/dishes` exists.
- Public dish list already returns `bestStore`.
- `GET /api/public/dishes/{dishId}` returns `dish`, `category`, `stats`, `stores`, `reviews`, and `relatedDishes`.
- `PublicDishCardResponse` now includes `priceDisplay`, `stock`, `available`, `disabled`, `active`, `storeId`, and `storeName`.
- `bestStore` now includes `id`, `slug`, `address`, `area`, `available`, `schedulable`, and `imagePaths`.
- Dish detail `stores[]` now includes `id`, `slug`, `name`, `schedulable`, and `imagePaths`.

### Events

- Status: mostly aligned
- `GET /api/public/events` exists.
- `GET /api/public/events/{eventKey}` now exists and supports both event id and slug.
- Public event DTO already exposes `storeId`, `storeSlug`, `storeName`, and store address/area at the root.
- Public event DTO now exposes `slug`.
- `featuredDishes[]` already carries `id`, `name`, `price`, and `imagePaths`.
- Public event DTO now exposes nested `store`, `title`, `summary`, `capacity`, `bookedCount`, and `reviews[]`.

### News

- Status: mostly aligned
- `GET /api/public/news` and `GET /api/public/news/{newsKey}` exist.
- Backend already supports `newsKey` by id or slug.
- Public news list/detail already expose `slug`, `relatedStoreId`, `relatedStoreSlug`, and `relatedStoreName`.
- Gap: public news DTOs do not expose `published` on public endpoints.

### Public Reviews

- Status: mostly aligned
- `GET /api/public/reviews` exists.
- Public reviews expose `targetType` and `targetId`.
- Public review DTO now exposes `targetSlug`, `targetLabel`, and `targetImagePaths`.
- Public review APIs now only support `STORE`, `EVENT`, and `DISH`.

## User Domain

### Auth and Session

- Status: aligned
- `register`, `verify-otp`, `login`, `me`, `logout`, password reset OTP request, and password reset confirm all exist.
- `LoginResponse` returns `accessToken`, `tokenType`, `expiresAt`, and `user`.
- Backend does not return fallback aliases like `token` or `type`.
- Session model is DB-backed token, not JWT.

### Favorites

- Status: mostly aligned
- `GET/POST/DELETE /api/user/favorites` exist.
- Favorites return `id`, `targetType`, `targetId`, `targetLabel`, `targetImagePaths`, `purchased`, and `createdAt`.
- Favorite DTO now exposes `targetSlug`.

### User Reviews

- Status: mostly aligned
- `GET/POST/PUT/DELETE /api/user/reviews` exist.
- Review routes are also mounted on `/api/reviews`.
- Backend now rejects `ReviewTargetType.CATEGORY`; active review targets are `STORE`, `EVENT`, and `DISH`.
- User review DTO now exposes `targetSlug`.

### Feedback

- Status: mostly aligned
- `GET/POST/DELETE /api/user/feedbacks` and admin reply flows exist.
- Feedback response already exposes `relatedStoreSlug`.
- Feedback now also exposes `relatedOrderId`, `relatedOrderStatus`, `relatedOrderPaymentStatus`, and `relatedOrderPaymentReference`.
- If `relatedOrderId` is provided, backend derives `relatedStoreId` from that order for manager/admin access control.

### User Levels

- Status: aligned
- Admin CRUD for store-specific level definitions exists at `/api/admin/user-levels`.
- User current-level lookup exists at `/api/user/levels/current`.
- Current level is evaluated from previous-quarter `PAID` amount per store.

### Delivery Addresses

- Status: aligned
- All CRUD endpoints plus `GET /primary` and `PUT /primary` exist.
- Address DTO now exposes `primary`, `verified`, `verifiedAt`, and `lastUsedAt`.
- The address selected during checkout is promoted to primary and marked verified on first order creation.
- Backend ordering today is `primary desc`, then `verifiedAt desc`, then `lastUsedAt desc`, then `updatedAt desc`.

### Cart

- Status: mostly aligned
- `GET /api/user/cart`, cart item CRUD, clear cart, and checkout all exist.
- Cart items already expose `storeId`, `storeName`, `dishId`, `dishName`, `quantity`, pricing, image paths, stock, `available`, `disabled`, and `schedulable`.
- Cart item DTO now exposes `storeSlug`.

### Orders and Checkout

- Status: mostly aligned
- `GET /api/user/orders`, `GET /api/user/orders/{id}`, and `POST /api/user/orders/{id}/refresh-payment` exist.
- Checkout returns grouped `orders[]` and shared PayOS fields as expected.
- `OrderResponse` includes `storeId`, `storeSlug`, `storeName`, staff assignments, and `statusSummary`.
- Gap: `orders[]` exists on `CheckoutResponse`, not on standalone `OrderResponse`.

### Notifications

- Status: mostly aligned
- `GET /api/user/notifications`, `GET /unread-count`, `PUT /read`, `PUT /unread`, and `PUT /read-all` all exist.
- Notification DTO exposes:
  - `id`
  - `type`
  - `title`
  - `message`
  - `relatedOrderId`
  - `orderId`
  - `relatedEventId`
  - `eventId`
  - `relatedEventSlug`
  - `eventSlug`
  - `relatedNewsId`
  - `newsId`
  - `relatedNewsSlug`
  - `newsSlug`
  - `relatedStoreId`
  - `relatedStoreName`
  - `actionUrl`
  - `read`
  - `readAt`
  - `createdAt`
  - `updatedAt`
- Backend supports `BRAND_EVENT`, `NEWS_ARTICLE`, and `ORDER_STATUS`.
- Backend now creates news notifications when an article becomes public for the first time.
- Event notifications now expose `eventSlug` and default `actionUrl` to `/events/{slug}` when available.
- Gap: no free-form `metadata`.

## Admin Domain

### Summary and Dashboard

- Status: mostly aligned
- `GET /api/admin/summary` exists and includes `userCount`, `storeCount`, `eventCount`, `categoryCount`, `dishCount`, `storeDishCount`, `newsCount`, `promotionCount`, `orderCount`, and `reviewCount`.
- `GET /api/admin/dashboard` exists and includes preview sections for `users`, `stores`, `events`, `categories`, `dishes`, `storeDishes`, `news`, `reviews`, `feedbacks`, `promotions`, and `orders`.

### Users

- Status: mostly aligned
- Admin user DTO now exposes `workingStoreId`, `workingStoreName`, `workingStoreAddress`, `enabled`, `verified`, and `verifiedAt`.
- Admin also has an explicit verification endpoint at `PUT /api/admin/users/{id}/verification`.

### Stores

- Status: aligned
- Admin store CRUD exists.
- Store DTO already exposes the current set of descriptive and operational fields needed by admin.

### Events

- Status: partial
- Admin event CRUD exists.
- Event DTO already exposes `storeId`, `featuredDishIds`, `capacity`, and `bookedCount`.
- Gap: admin event DTO does not expose `title` or `summary` aliases.

### Categories

- Status: aligned
- Admin category CRUD exists.
- Category DTO already exposes `storeId`, `storeName`, `sortOrder`, and `active`.

### Dishes

- Status: mostly aligned
- Admin dish CRUD exists.
- Dish DTO exposes `categoryId`, `categoryName`, `storeId`, and `storeName`.
- Current backend interpretation is: dish belongs to category, category may belong to store, therefore store scoping is derived through category.
- Gap: the brand-level dish vs store-scoped category ambiguity still exists at model level.

### Store Dishes

- Status: aligned
- Admin store-dish CRUD exists.
- `StoreDish` is the current source of truth for stock, availability, and price override.
- Unique constraint already enforces `(storeId, dishId)`.

### News

- Status: aligned
- Admin news CRUD exists.
- Admin news DTO already exposes `slug`, `relatedStoreId`, `relatedStoreSlug`, and `relatedStoreName`.

### Promotions

- Status: mostly aligned
- Admin promotion CRUD exists.
- Backend returns promotions as a plain list, not a paged response.
- Promotion DTO now exposes both legacy and frontend alias fields:
  - `name`
  - `description`
  - `minOrderAmount`
  - `minimumOrderAmount`
  - `maxDiscountAmount`
  - `maximumDiscountAmount`
  - `applicableDishIds`
  - `promotionDishIds`
  - `eligibleStoreIds`
  - `eligibleUserLevelIds`
  - `minStoreBillAmount`
  - `minCrossStoreBillAmount`
- Backend accepts either legacy request names or frontend alias names and normalizes them server-side.
- Checkout promotion logic now supports store filtering, user-level filtering, per-store minimum bill, and cross-store minimum bill.
- Gap: promotions are still returned as a plain list, not a paged response.

### Admin Orders

- Status: mostly aligned
- `GET /api/admin/orders`, `GET /api/admin/orders/{id}`, and `PUT /api/admin/orders/{id}/status` exist.
- Backend supports filters for `status`, `paymentStatus`, `stage`, `storeId`, `search`, `page`, and `size`.

### Admin Reviews

- Status: aligned for manager access
- Admin review list/get/delete all exist.
- Backend already allows `ADMIN` and `MANAGER`.
- Manager review access is store-scoped through review target resolution.

### Admin Feedbacks

- Status: aligned for manager access
- Admin feedback list/get/delete/reply flows all exist.
- Backend already allows `ADMIN` and `MANAGER`.
- Manager feedback access is store-scoped through `relatedStoreId`.
- Order-linked feedback keeps that same manager scope because `relatedStoreId` is populated from the order's store.

## Confirmed Mismatches Vs Frontend Expectations

- Public store cards are still leaner than some frontend usages because contact and hours fields only exist on store detail, not store list.
- General app feedback can still omit `relatedStoreId`, but order-linked feedback is now normalized through `relatedOrderId`.

## Backend Priority Order

1. Decide whether public store cards should stay lightweight or expose more detail fields like contact and hours.
2. Decide the final public store-card shape for list pages versus detail pages.
3. Decide whether plain non-order feedback should eventually require a store, or whether optional store linkage should remain supported for app-wide feedback.

## Short Conclusion

The backend already has most routes the frontend audit expects, and the highest-impact relation gaps from the first audit have been closed.
The highest-risk gaps are:

- store list DTOs are still leaner than some relation-heavy UI wants
- general app feedback without an order is still allowed to omit `relatedStoreId`
