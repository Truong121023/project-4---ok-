# Frontend User API Guide

Scope: this file covers user-facing APIs and public catalog APIs for the Tea Matcha backend.
The frontend should treat this as the main integration guide for the storefront app.
Quick endpoint-to-sample lookup is available in `API_QUICK_REFERENCE.md`.

Relation and frontend expectation gaps are tracked separately in `BACKEND_RELATION_AUDIT.md`.

## Common Rules

- Base path: `/api`
- Protected endpoints require `Authorization: Bearer <accessToken>`
- Send JSON with `Content-Type: application/json`
- Dates use ISO-8601
  - `Instant`: full timestamp in UTC
  - `LocalTime`: `HH:mm[:ss]`
- Pagination uses `PageResponse<T>`:
  - `items`
  - `page`
  - `size`
  - `totalItems`
  - `totalPages`
  - `hasNext`
  - `hasPrevious`
- Common enums used by the user API:
  - `DeliveryType`: `IMMEDIATE`, `SCHEDULED`
  - `OrderStatus`: `PENDING`, `CONFIRMED`, `PREPARING`, `READY_FOR_SHIPPER`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELLED`
  - `PaymentStatus`: `PENDING`, `PAID`, `CANCELLED`, `FAILED`
  - `UserNotificationType`: `BRAND_EVENT`, `NEWS_ARTICLE`, `ORDER_STATUS`
  - `FavoriteTargetType`: `STORE`, `DISH`, `EVENT`
  - `ReviewTargetType`: `STORE`, `EVENT`, `DISH`
  - `FeedbackCategory`: `GENERAL`, `STORE_SERVICE`, `PRODUCT_QUALITY`, `DELIVERY`, `ORDER_EXPERIENCE`, `APP_EXPERIENCE`, `OTHER`
- Error payload shape:
  - `timestamp`
  - `status`
  - `error`
  - `message`
  - `path`
  - `validationErrors`

### Shared Content Sections

- `ContentSectionResponse`
  - `title`
  - `content`
  - `imagePath`

### Frontend Migration Note

- Updated on 2026-03-26: backend storage for store, dish, event, and news sections has been unified into the shared DB table `content_sections`.
- Storefront API contract does not change: frontend still reads `sections` as `List<ContentSectionResponse>` with only `title`, `content`, and `imagePath`.
- There is no public API that exposes raw `content_sections` rows; always read sections through the parent payload such as `store.sections`, `dish.sections`, event `sections`, or news `sections`.
- Frontend should not assume a section `id` exists because backend responses still do not expose one.
- `Category` still has `imagePaths` only and still does not support `sections`.
- Existing demo data now includes populated sections for all 20 stores, 20 dishes, 20 events, and 20 news articles.

## 0. Public APIs

| Method | Path | Query | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/public/home` | none | `PublicHomeResponse` | Home page payload |
| `GET` | `/api/public/stores` | `search`, `sort`, `minRating`, `lat`, `lng`, `page`, `size` | `PageResponse<PublicStoreCardResponse>` | Store listing |
| `GET` | `/api/public/stores/{storeKey}` | none | `PublicStoreDetailResponse` | `storeKey` can be store id or slug |
| `GET` | `/api/public/dishes` | `search`, `sort`, `minRating`, `categoryId`, `franchiseRequired`, `lat`, `lng`, `page`, `size` | `PageResponse<PublicDishCardResponse>` | Dish listing |
| `GET` | `/api/public/dishes/{dishId}` | `lat`, `lng` | `PublicDishDetailResponse` | Dish detail |
| `GET` | `/api/public/events` | `search`, `sort`, `lat`, `lng`, `page`, `size` | `PageResponse<PublicEventCardResponse>` | Event listing |
| `GET` | `/api/public/events/{eventKey}` | `lat`, `lng` | `PublicEventCardResponse` | `eventKey` can be event id or slug |
| `GET` | `/api/public/news` | `search`, `featured`, `page`, `size` | `PageResponse<PublicNewsCardResponse>` | News list |
| `GET` | `/api/public/news/{newsKey}` | none | `PublicNewsDetailResponse` | `newsKey` can be news id or slug |
| `GET` | `/api/public/reviews` | `targetType`, `targetId`, `sort`, `page`, `size` | `PageResponse<PublicReviewItemResponse>` | Approved reviews only |

### Public Query Cheatsheet

- Stores: `rating_desc`, `rating_asc`, `distance_asc`, `name_asc`
- Dishes: `top_rated`, `most_reviewed`, `most_ordered`, `distance_asc`, `price_asc`, `price_desc`
- Events: `date_asc`, `date_desc`, `rating_asc`, `rating_desc`, `distance_asc`
- Reviews: `date_desc`, `date_asc`, `rating_asc`, `rating_desc`

### Public Response Shapes

- `PublicHomeResponse`
  - `brand`
  - `featuredStores`
  - `featuredDishes`
  - `upcomingEvents`
  - `storeLocations`
  - `latestNews`
- `PublicStoreCardResponse`
  - `id`
  - `slug`
  - `name`
  - `description`
  - `address`
  - `area`
  - `positionLabel`
  - `latitude`
  - `longitude`
  - `imagePaths`
  - `highlightSummary`
  - `highlightTags`
  - `averageRating`
  - `reviewCount`
  - `favoriteCount`
  - `availableItemCount`
  - `distanceKm`
  - `open`
  - `disabled`
  - `disabledReason`
- `PublicStoreDetailResponse`
  - `store`
  - `stats`
  - `categories`
  - `events`
  - `reviews`
  - `store.sections` uses `List<ContentSectionResponse>`
  - `CategorySection`
    - `id`
    - `title`
    - `name`
    - `description`
    - `imagePaths`
    - `averageRating`
    - `reviewCount`
    - `items`
  - `StoreDishItem`
    - `id`
    - `categoryId`
    - `name`
    - `description`
    - `note`
    - `price`
    - `priceDisplay`
    - `franchiseRequired`
    - `franchiseNote`
    - `imagePaths`
    - `highlightSummary`
    - `highlightTags`
    - `averageRating`
    - `reviewCount`
    - `orderCount`
    - `favoriteCount`
    - `stock`
    - `available`
    - `disabled`
    - `schedulable`
- `PublicDishCardResponse`
  - `id`
  - `categoryId`
  - `categoryName`
  - `name`
  - `description`
  - `note`
  - `price`
  - `priceDisplay`
  - `status`
  - `franchiseRequired`
  - `franchiseNote`
  - `imagePaths`
  - `highlightSummary`
  - `highlightTags`
  - `averageRating`
  - `reviewCount`
  - `orderCount`
  - `favoriteCount`
  - `stock`
  - `available`
  - `disabled`
  - `active`
  - `storeId`
  - `storeName`
  - `bestStore`
  - `BestStore`
    - `id`
    - `storeId`
    - `slug`
    - `storeSlug`
    - `name`
    - `storeName`
    - `address`
    - `area`
    - `distanceKm`
    - `stock`
    - `open`
    - `available`
    - `disabled`
    - `schedulable`
    - `price`
    - `imagePaths`
- `PublicDishDetailResponse`
  - `dish`
  - `category`
  - `stats`
  - `stores`
  - `reviews`
  - `relatedDishes`
  - `dish.sections` uses `List<ContentSectionResponse>`
  - `StoreAvailability`
    - `id`
    - `storeId`
    - `slug`
    - `storeSlug`
    - `name`
    - `storeName`
    - `address`
    - `area`
    - `distanceKm`
    - `storeOpen`
    - `storeDisabled`
    - `stock`
    - `available`
    - `disabled`
    - `schedulable`
    - `price`
    - `imagePaths`
- `PublicEventCardResponse`
  - `id`
  - `slug`
  - `storeId`
  - `storeSlug`
  - `storeName`
  - `storeAddress`
  - `storeArea`
  - `title`
  - `name`
  - `summary`
  - `description`
  - `location`
  - `scheduleText`
  - `imagePaths`
  - `sections`
  - `highlightSummary`
  - `highlightTags`
  - `startsAt`
  - `endsAt`
  - `averageRating`
  - `reviewCount`
  - `favoriteCount`
  - `capacity`
  - `bookedCount`
  - `remainingSlots`
  - `disabled`
  - `disabledReason`
  - `distanceKm`
  - `store`
  - `reviews`
  - `featuredDishes`
  - `StorePreview`
    - `id`
    - `slug`
    - `storeSlug`
    - `name`
    - `storeName`
    - `address`
    - `area`
    - `open`
    - `disabled`
    - `disabledReason`
    - `imagePaths`
  - `FeaturedDishPreview`
    - `id`
    - `name`
    - `price`
    - `imagePaths`
- `PublicNewsCardResponse`
  - `id`
  - `title`
  - `slug`
  - `summary`
  - `relatedStoreId`
  - `relatedStoreSlug`
  - `relatedStoreName`
  - `tags`
  - `imagePaths`
  - `featured`
  - `publishedAt`
  - `createdAt`
- `PublicNewsDetailResponse`
  - `id`
  - `title`
  - `slug`
  - `summary`
  - `content`
  - `relatedStoreId`
  - `relatedStoreSlug`
  - `relatedStoreName`
  - `tags`
  - `imagePaths`
  - `sections`
  - `featured`
  - `publishedAt`
  - `createdAt`
  - `updatedAt`
- `PublicReviewItemResponse`
  - `id`
  - `userId`
  - `userName`
  - `userEmail`
  - `targetType`
  - `targetId`
  - `targetSlug`
  - `targetLabel`
  - `targetImagePaths`
  - `rating`
  - `title`
  - `comment`
  - `createdAt`
  - `updatedAt`

## 1. Auth

| Method | Path | Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | `RegisterRequest` | `RegisterResponse` | Returns `202 Accepted` |
| `POST` | `/api/auth/verify-otp` | `VerifyOtpRequest` | `VerifyOtpResponse` | Returns `201 Created` |
| `POST` | `/api/auth/password/request-otp` | `PasswordResetOtpRequest` | `PasswordResetOtpResponse` | Returns `202 Accepted` |
| `POST` | `/api/auth/password/reset` | `PasswordResetConfirmRequest` | `MessageResponse` | Reset password with OTP |
| `POST` | `/api/auth/login` | `LoginRequest` | `LoginResponse` | Returns access token |
| `POST` | `/api/auth/google/login` | `GoogleLoginRequest` | `LoginResponse` | Returns access token for linked users or newly created Google users |
| `POST` | `/api/auth/google/complete-profile` | `GoogleCompleteProfileRequest` | `GoogleCompleteProfileResponse` | Completes required fields for a new Google user |
| `GET` | `/api/auth/me` | Header only | `MeResponse` | Current logged-in user |
| `POST` | `/api/auth/logout` | Header only | `LogoutResponse` | Invalidates current token |

### Auth request DTOs

- `RegisterRequest`
  - `fullName`
  - `email`
  - `password`
- `VerifyOtpRequest`
  - `email`
  - `otp`
- `PasswordResetOtpRequest`
  - `email`
- `PasswordResetConfirmRequest`
  - `email`
  - `otp`
  - `newPassword`
- `LoginRequest`
  - `email`
  - `password`
- `GoogleLoginRequest`
  - `idToken`
- `GoogleCompleteProfileRequest`
  - `fullName`
  - `password`

### Auth response DTOs

- `RegisterResponse`
  - `message`
  - `userId`
  - `email`
  - `role`
  - `otpExpiresAt`
- `VerifyOtpResponse`
  - `message`
  - `user`
- `PasswordResetOtpResponse`
  - `message`
  - `email`
  - `otpExpiresAt`
- `LoginResponse`
  - `message`
  - `tokenType`
  - `accessToken`
  - `expiresAt`
  - `user`
- `GoogleCompleteProfileResponse`
  - `message`
  - `user`
- `MeResponse`
  - `message`
  - `expiresAt`
  - `user`
- `LogoutResponse`
  - `message`
- `UserResponse`
  - `id`
  - `fullName`
  - `email`
  - `role`
  - `workingStoreId`
  - `workingStoreName`
  - `workingStoreAddress`
  - `verified`
  - `profileCompleted`
  - `createdAt`
  - `verifiedAt`

### Frontend Auth Flow

1. Register with `fullName`, `email`, and `password`.
2. Show the OTP screen after `POST /api/auth/register`.
3. Verify the email with `POST /api/auth/verify-otp` using `email` and `otp`.
4. Only call `POST /api/auth/login` after the account is verified.
5. For Google Sign-In, call `POST /api/auth/google/login` with the Google `idToken`.
6. Store `accessToken` from `LoginResponse` and send it as `Authorization: Bearer <accessToken>`.
7. If `loginResponse.user.profileCompleted` is `false`, immediately show the complete-profile form and call `POST /api/auth/google/complete-profile` with the same bearer token.
8. After `POST /api/auth/google/complete-profile` succeeds, keep using the same session token because the user is already logged in.
9. Use `GET /api/auth/me` on app reload to restore the session.
10. Call `POST /api/auth/logout` to invalidate the token on sign out.
11. If the user forgets the password, call `POST /api/auth/password/request-otp` then `POST /api/auth/password/reset`.

### Login Notes

- The backend uses a session token, not JWT.
- If the account is not verified, login fails with an error like `Email is not verified. Please verify OTP before login.`
- If the OTP expires, the user must register again to receive a new OTP.
- If a password reset OTP expires, the user must request a new OTP.
- If the password or email is wrong, the backend returns `Email or password is incorrect`.
- `tokenType` is `Bearer`, but the frontend should still build the header exactly as `Authorization: Bearer <accessToken>`.
- `POST /api/auth/google/login` now auto-creates a `USER` when the Google email does not exist in the database yet.
- New Google users still receive a valid `accessToken` immediately, but `user.profileCompleted` will be `false` until the app calls `POST /api/auth/google/complete-profile`.
- `POST /api/auth/google/complete-profile` currently requires `fullName` and `password`.

## 1A. Employee Workflow

Scope: this section is for the staff/shipper app, not the customer storefront.

### Employee Order APIs

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/employee/orders` | `?mine=true&search=123&page=0&size=10` | `PageResponse<OrderResponse>` | `mine=false` or omitted returns available tasks plus the current employee's active task |
| `GET` | `/api/employee/orders/{id}` | Header only | `OrderResponse` | Opens the order from an employee notification |
| `POST` | `/api/employee/orders/{id}/accept-preparing` | Header only | `OrderResponse` | `STAFF` only |
| `POST` | `/api/employee/orders/{id}/mark-ready` | Header only | `OrderResponse` | `STAFF` only |
| `POST` | `/api/employee/orders/{id}/accept-delivery` | Header only | `OrderResponse` | `SHIPPER` only |
| `POST` | `/api/employee/orders/{id}/complete-delivery` | Header only | `OrderResponse` | `SHIPPER` only |

### Employee Notification APIs

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/employee/notifications` | `?read=false&page=0&size=10` | `PageResponse<UserNotificationResponse>` | Employee inbox for order tasks |
| `GET` | `/api/employee/notifications/unread-count` | Header only | `UserNotificationUnreadCountResponse` | Unread task count |
| `PUT` | `/api/employee/notifications/{id}/read` | Header only | `UserNotificationResponse` | Marks one task notification as read |
| `PUT` | `/api/employee/notifications/{id}/unread` | Header only | `UserNotificationResponse` | Marks one task notification as unread |
| `PUT` | `/api/employee/notifications/read-all` | Header only | `MessageResponse` | Marks all employee notifications as read |

### Employee Workflow Notes

- `STAFF` and `SHIPPER` must use the same bearer token pattern: `Authorization: Bearer <accessToken>`.
- Employee accounts must be enabled and must have `workingStoreId`.
- When an order becomes paid, the store's `STAFF` receives an `ORDER_TASK` notification.
- If the order already has `preparingStaffId`, only that staff member receives and sees the task.
- `POST /api/employee/orders/{id}/accept-preparing` sets `preparingStaffId` to the current staff and moves the order to `PREPARING`.
- `POST /api/employee/orders/{id}/mark-ready` keeps the assigned staff and moves the order to `READY_FOR_SHIPPER`.
- When an order becomes `READY_FOR_SHIPPER`, the store's `SHIPPER` receives an `ORDER_TASK` notification.
- If the order already has `deliveringShipperId`, only that shipper receives and sees the task.
- `POST /api/employee/orders/{id}/accept-delivery` sets `deliveringShipperId` to the current shipper and moves the order to `OUT_FOR_DELIVERY`.
- `POST /api/employee/orders/{id}/complete-delivery` moves the order to `COMPLETED`.
- Employee notifications use the same `UserNotificationResponse` shape as customer notifications, but `type` is `ORDER_TASK` and `actionUrl` points to `/employee/orders/{id}`.
- For `GET /api/employee/orders`, `mine=true` returns only the current employee's active accepted work. Without `mine`, the API returns both available work and the employee's own in-progress task.
- Work schedule and attendance APIs are disabled and should not be used by frontend/mobile.

### Employee Response DTOs

- `OrderResponse`
  - `id`
  - `userId`
  - `storeId`
  - `storeSlug`
  - `storeName`
  - `status`
  - `paymentStatus`
  - `paymentProvider`
  - `payosOrderCode`
  - `paymentLinkId`
  - `paymentCheckoutUrl`
  - `paymentQrCode`
  - `paymentExpiresAt`
  - `paidAt`
  - `paymentReference`
  - `subtotalAmount`
  - `discountAmount`
  - `totalAmount`
  - `promotionCode`
  - `promotionScope`
  - `promotionEligibleAmount`
  - `promotionDishIds`
  - `deliveryType`
  - `scheduledDeliveryAt`
  - `deliveryFullName`
  - `deliveryPhoneNumber`
  - `deliveryAddress`
  - `preparingStaffId`
  - `preparingStaffName`
  - `deliveringShipperId`
  - `deliveringShipperName`
  - `statusSummary`
  - `items`
  - `createdAt`
  - `updatedAt`
- `UserNotificationResponse`
  - `id`
  - `type`
  - `title`
  - `message`
  - `relatedOrderId`
  - `orderId`
  - `relatedStoreId`
  - `relatedStoreName`
  - `actionUrl`
  - `read`
  - `readAt`
  - `createdAt`
  - `updatedAt`

### Employee Frontend Flow

1. Poll `GET /api/employee/notifications/unread-count` or `GET /api/employee/notifications?read=false` to show the task badge.
2. When the employee taps a task notification, open `GET /api/employee/orders/{id}` using `relatedOrderId` or `actionUrl`.
3. In the `STAFF` app:
   - show `Nhan viec` when `status=CONFIRMED`
   - call `POST /api/employee/orders/{id}/accept-preparing`
   - show `Hoan tat mon` when `status=PREPARING` and `preparingStaffId` is the current user
   - call `POST /api/employee/orders/{id}/mark-ready`
4. In the `SHIPPER` app:
   - show `Nhan giao` when `status=READY_FOR_SHIPPER`
   - call `POST /api/employee/orders/{id}/accept-delivery`
   - show `Da giao xong` when `status=OUT_FOR_DELIVERY` and `deliveringShipperId` is the current user
   - call `POST /api/employee/orders/{id}/complete-delivery`
5. After each action, refresh both `/api/employee/orders` and `/api/employee/notifications/unread-count`.

## 2. Cart And Checkout

| Method | Path | Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/user/cart` | Header only | `CartResponse` | Load current cart |
| `POST` | `/api/user/cart/items` | `CartItemRequest` | `CartResponse` | Add an item |
| `PUT` | `/api/user/cart/items/{id}` | `CartItemRequest` | `CartResponse` | Update quantity/item |
| `DELETE` | `/api/user/cart/items/{id}` | Header only | `CartResponse` | Remove one cart item |
| `DELETE` | `/api/user/cart` | Header only | `MessageResponse` | Clear cart |
| `POST` | `/api/user/cart/checkout` | `CheckoutRequest` | `CheckoutResponse` | Create payment + order(s) |

### Cart request DTOs

- `CartItemRequest`
  - `storeId`
  - `dishId`
  - `quantity`
- `CheckoutRequest`
  - `deliveryAddressId`
  - `promotionCode`
  - `deliveryType`
  - `scheduledDeliveryAt`
  - `returnUrl`
  - `cancelUrl`

### Cart and checkout response DTOs

- `CartResponse`
  - `id`
  - `userId`
  - `status`
  - `items`
  - `totalItems`
  - `subtotal`
  - `createdAt`
  - `updatedAt`
- `CartItemResponse`
  - `id`
  - `storeId`
  - `storeSlug`
  - `storeName`
  - `dishId`
  - `dishName`
  - `quantity`
  - `unitPrice`
  - `totalPrice`
  - `imagePaths`
  - `stock`
  - `available`
  - `disabled`
  - `schedulable`
  - `createdAt`
  - `updatedAt`
- `CheckoutResponse`
  - `id`
  - `status`
  - `paymentStatus`
  - `paymentProvider`
  - `payosOrderCode`
  - `paymentLinkId`
  - `paymentCheckoutUrl`
  - `paymentQrCode`
  - `paymentExpiresAt`
  - `paidAt`
  - `paymentReference`
  - `subtotalAmount`
  - `discountAmount`
  - `totalAmount`
  - `promotionCode`
  - `deliveryType`
  - `scheduledDeliveryAt`
  - `deliveryFullName`
  - `deliveryPhoneNumber`
  - `deliveryAddress`
  - `statusSummary`
  - `orders`
  - `createdAt`
  - `updatedAt`
- `OrderResponse`
  - `id`
  - `userId`
  - `storeId`
  - `storeSlug`
  - `storeName`
  - `status`
  - `paymentStatus`
  - `paymentProvider`
  - `payosOrderCode`
  - `paymentLinkId`
  - `paymentCheckoutUrl`
  - `paymentQrCode`
  - `paymentExpiresAt`
  - `paidAt`
  - `paymentReference`
  - `subtotalAmount`
  - `discountAmount`
  - `totalAmount`
  - `promotionCode`
  - `promotionScope`
  - `promotionEligibleAmount`
  - `promotionDishIds`
  - `deliveryType`
  - `scheduledDeliveryAt`
  - `deliveryFullName`
  - `deliveryPhoneNumber`
  - `deliveryAddress`
  - `preparingStaffId`
  - `preparingStaffName`
  - `deliveringShipperId`
  - `deliveringShipperName`
  - `statusSummary`
  - `items`
  - `createdAt`
  - `updatedAt`
- `OrderItemResponse`
  - `id`
  - `storeId`
  - `storeSlug`
  - `storeName`
  - `dishId`
  - `dishName`
  - `quantity`
  - `unitPrice`
  - `totalPrice`
  - `imagePaths`
  - `createdAt`
  - `updatedAt`

### Checkout Notes

- `deliveryType` defaults to `IMMEDIATE` when omitted.
- If `deliveryType = SCHEDULED`, `scheduledDeliveryAt` is required and must be in the future.
- `scheduledDeliveryAt` is only allowed when `deliveryType = SCHEDULED`.
- `returnUrl` and `cancelUrl` are required because the checkout flow creates a PayOS payment link.
- `CheckoutResponse.orders` can contain multiple orders when the cart has items from multiple stores.
- Promotion eligibility can now also depend on the store, the user's current store level, `minStoreBillAmount`, and `minCrossStoreBillAmount`.

## 3. Delivery Addresses

| Method | Path | Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/user/delivery-addresses` | Header only | `List<DeliveryAddressResponse>` | My addresses |
| `GET` | `/api/user/delivery-addresses/primary` | Header only | `DeliveryAddressResponse` | Current primary contact address |
| `GET` | `/api/user/delivery-addresses/{id}` | Header only | `DeliveryAddressResponse` | One address |
| `POST` | `/api/user/delivery-addresses` | `DeliveryAddressRequest` | `DeliveryAddressResponse` | Create address |
| `PUT` | `/api/user/delivery-addresses/{id}` | `DeliveryAddressRequest` | `DeliveryAddressResponse` | Update address |
| `PUT` | `/api/user/delivery-addresses/{id}/primary` | Header only | `DeliveryAddressResponse` | Promote one address to primary |
| `DELETE` | `/api/user/delivery-addresses/{id}` | Header only | `MessageResponse` | Delete address |

### Delivery address DTOs

- `DeliveryAddressRequest`
  - `fullName`
  - `phoneNumber`
  - `deliveryAddress`
  - Optional: `primary`
- `DeliveryAddressResponse`
  - `id`
  - `userId`
  - `fullName`
  - `phoneNumber`
  - `deliveryAddress`
  - `primary`
  - `verified`
  - `verifiedAt`
  - `lastUsedAt`
  - `createdAt`
  - `updatedAt`

### Delivery address notes

- The list is returned with primary and recently-used verified addresses first
- The address selected during checkout is promoted to the main contact address
- `verified` / `verifiedAt` are filled automatically after the user creates the first order with that address
- `lastUsedAt` is updated during checkout when the user selects the address

## 4. Favorites

| Method | Path | Body / Query | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/user/favorites` | `targetType`, `purchasedOnly=false` | `List<FavoriteResponse>` | Filter is optional |
| `POST` | `/api/user/favorites` | `FavoriteRequest` | `FavoriteResponse` | Add favorite |
| `DELETE` | `/api/user/favorites` | `FavoriteRequest` | `MessageResponse` | Delete favorite uses body, not path |

### Favorite DTOs

- `FavoriteRequest`
  - `targetType`
  - `targetId`
- `FavoriteResponse`
  - `id`
  - `targetType`
  - `targetId`
  - `targetSlug`
  - `targetLabel`
  - `targetImagePaths`
  - `purchased`
  - `createdAt`

### Favorites notes

- `targetType` values: `STORE`, `DISH`, `EVENT`
- `purchasedOnly=true` returns only items already purchased by the user

## 5. Orders

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/user/orders` | `page`, `size` | `PageResponse<OrderResponse>` | List my orders |
| `GET` | `/api/user/orders/{id}` | Header only | `OrderResponse` | One order |
| `POST` | `/api/user/orders/{id}/refresh-payment` | Header only | `OrderResponse` | Refresh payment status |

### Order notes

- Use `PageResponse<T>` on the list endpoint.
- `statusSummary` is a server-generated text that is useful for UI badges/messages.

## 5A. User Levels

| Method | Path | Query | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/user/levels/current` | `storeId` | `List<UserCurrentLevelResponse>` | `storeId` is optional |

### User level response DTO

- `UserCurrentLevelResponse`
  - `storeId`
  - `storeSlug`
  - `storeName`
  - `currentYear`
  - `currentQuarter`
  - `evaluatedYear`
  - `evaluatedQuarter`
  - `qualifyingPaidAmount`
  - `levelId`
  - `levelCode`
  - `levelName`
  - `levelMinPaidAmount`

### User level notes

- Current level is calculated for the current quarter based on the user's `PAID` amount in the previous quarter for that store.
- If no level threshold is matched yet, `levelId`, `levelCode`, `levelName`, and `levelMinPaidAmount` are `null`.
- Use `storeId` when the storefront needs to show the current level for one specific store page.

## 6. Reviews

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/reviews` or `/api/user/reviews` | `targetType`, `sort`, `page`, `size` | `PageResponse<ReviewResponse>` | `GET` also works on `/mine` and `/me` |
| `POST` | `/api/reviews` or `/api/user/reviews` | `UserReviewRequest` | `ReviewResponse` | Create review |
| `PUT` | `/api/reviews/{id}` or `/api/user/reviews/{id}` | `UserReviewRequest` | `ReviewResponse` | Update own review |
| `DELETE` | `/api/reviews/{id}` or `/api/user/reviews/{id}` | Header only | `MessageResponse` | Delete own review |

### Review DTOs

- `UserReviewRequest`
  - `targetType`
  - `targetId`
  - `rating`
  - `title`
  - `comment`
- `ReviewResponse`
  - `id`
  - `userId`
  - `userName`
  - `userEmail`
  - `targetType`
  - `targetId`
  - `targetSlug`
  - `targetLabel`
  - `targetImagePaths`
  - `rating`
  - `title`
  - `comment`
  - `approved`
  - `createdAt`
  - `updatedAt`

### Review notes

- `rating` is 1 to 5
- `sort` accepts:
  - `date_desc`
  - `date_asc`
  - `rating_asc`
  - `rating_desc`
- `approved` is controlled by backend moderation
- `targetType CATEGORY` is no longer supported; use only `STORE`, `EVENT`, or `DISH`

## 7. Customer Feedback

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/user/feedbacks` | `page`, `size` | `PageResponse<CustomerFeedbackResponse>` | My feedback list |
| `GET` | `/api/user/feedbacks/{id}` | Header only | `CustomerFeedbackResponse` | One feedback |
| `POST` | `/api/user/feedbacks` | `CustomerFeedbackRequest` | `CustomerFeedbackResponse` | Create feedback |
| `DELETE` | `/api/user/feedbacks/{id}` | Header only | `MessageResponse` | Delete feedback |

### Feedback DTOs

- `CustomerFeedbackRequest`
  - `category`
  - `relatedStoreId`
  - `relatedOrderId`
  - `subject`
  - `message`
- `CustomerFeedbackResponse`
  - `id`
  - `userId`
  - `userName`
  - `userEmail`
  - `category`
  - `relatedStoreId`
  - `relatedStoreSlug`
  - `relatedStoreName`
  - `relatedStoreAddress`
  - `relatedOrderId`
  - `relatedOrderStatus`
  - `relatedOrderPaymentStatus`
  - `relatedOrderPaymentReference`
  - `subject`
  - `message`
  - `replyMessage`
  - `repliedAt`
  - `repliedByUserId`
  - `repliedByUserName`
  - `repliedByUserRole`
  - `createdAt`
  - `updatedAt`

### Feedback reply note

- When admin or manager replies, the user will see the reply directly inside `GET /api/user/feedbacks` and `GET /api/user/feedbacks/{id}`.
- Frontend can show responder identity from `repliedByUserName` and `repliedByUserRole`.
- If `relatedOrderId` is sent, the backend validates that the order belongs to the current user and automatically infers the related store from that order.

## 8. Notifications

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/user/notifications` | `read`, `page`, `size` | `PageResponse<UserNotificationResponse>` | `read` is optional |
| `GET` | `/api/user/notifications/unread-count` | Header only | `UserNotificationUnreadCountResponse` | Badge/count endpoint |
| `PUT` | `/api/user/notifications/{id}/read` | Header only | `UserNotificationResponse` | Mark one notification as read |
| `PUT` | `/api/user/notifications/{id}/unread` | Header only | `UserNotificationResponse` | Mark one notification as unread |
| `PUT` | `/api/user/notifications/read-all` | Header only | `MessageResponse` | Marks all unread notifications as read |

### Notification DTOs

- `UserNotificationResponse`
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
- `UserNotificationUnreadCountResponse`
  - `unreadCount`

### Notification notes

- `read` filter is optional:
  - omit `read` to get all notifications
  - `read=false` for unread only
  - `read=true` for read only
- New active events created by admin generate `BRAND_EVENT` notifications for all enabled `USER` accounts.
- News articles generate `NEWS_ARTICLE` notifications when an admin makes the article publicly visible for the first time.
- Order notifications use `ORDER_STATUS` and are generated when:
  - a new order is created from checkout
  - payment status changes
  - order status changes like `PREPARING`, `OUT_FOR_DELIVERY`, `COMPLETED`, or `CANCELLED`
- Frontend can deep-link from notification cards by:
  - opening `actionUrl` when it is present
  - or falling back to `relatedNewsSlug` / `newsSlug`
  - or falling back to `relatedOrderId` / `orderId`
  - or falling back to `relatedEventSlug` / `eventSlug`
  - or falling back to `relatedEventId` / `eventId`

## 9. Frontend Checklist

- Save `accessToken` from `LoginResponse` and send it in the `Authorization` header.
- Use `tokenType` from login, it is expected to be `Bearer`.
- Checkout must supply `returnUrl` and `cancelUrl`.
- The checkout flow may return multiple orders in one call.
- Use `deliveryType = SCHEDULED` only when the user picks a future delivery time.
- Use `GET /api/user/levels/current?storeId=<storeId>` when the storefront needs to show the current loyalty level for one store.
- Use the same `UserReviewRequest` shape for create and update.
- `DELETE /api/user/favorites` requires a request body.
- `CustomerFeedbackRequest.relatedOrderId` is optional and is the preferred way to attach feedback to a specific order.
- Poll `GET /api/user/notifications/unread-count` and `GET /api/user/notifications?read=false` if the current frontend does not yet use realtime updates.

## Sample Payloads

### Public Home And Store List

```json
{
  "home": {
    "brand": "Tea Matcha",
    "featuredStores": [
      {
        "id": 1,
        "slug": "tea-house-q1",
        "name": "Tea House Q1",
        "averageRating": 4.8,
        "reviewCount": 128,
        "favoriteCount": 240,
        "availableItemCount": 18,
        "open": true,
        "disabled": false,
        "disabledReason": null
      }
    ],
    "featuredDishes": [
      {
        "id": 88,
        "categoryId": 9,
        "categoryName": "Drinks",
        "name": "Matcha Latte",
        "price": 90000,
        "status": "ACTIVE",
        "averageRating": 4.9,
        "reviewCount": 88,
        "orderCount": 340,
        "favoriteCount": 210,
        "bestStore": {
          "storeId": 1,
          "storeSlug": "tea-house-q1",
          "storeName": "Tea House Q1",
          "distanceKm": 1.4,
          "stock": 20,
          "open": true,
          "disabled": false,
          "price": 90000
        }
      }
    ]
  },
  "storePage": {
    "items": [
      {
        "id": 1,
        "slug": "tea-house-q1",
        "name": "Tea House Q1",
        "address": "12 Nguyen Trai, District 1",
        "averageRating": 4.8,
        "reviewCount": 128,
        "favoriteCount": 240,
        "availableItemCount": 18,
        "distanceKm": 1.4,
        "open": true,
        "disabled": false
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

### Auth Flow

```json
{
  "registerRequest": {
    "fullName": "Nguyen Van A",
    "email": "a@example.com",
    "password": "12345678"
  },
  "googleLoginRequest": {
    "idToken": "google-id-token-from-frontend"
  },
  "loginResponse": {
    "message": "Login successful",
    "tokenType": "Bearer",
    "accessToken": "f8f8a9d0c2e1411b9f3d8d5f9e10c001",
    "expiresAt": "2026-03-30T07:00:00Z",
    "user": {
      "id": 12,
      "fullName": "Nguyen Van A",
      "email": "a@example.com",
      "role": "USER",
      "workingStoreId": null,
      "workingStoreName": null,
      "workingStoreAddress": null,
      "verified": true,
      "profileCompleted": true,
      "createdAt": "2026-03-23T06:55:00Z",
      "verifiedAt": "2026-03-23T07:00:00Z"
    }
  },
  "googleFirstLoginResponse": {
    "message": "Google login successful. Please complete your profile.",
    "tokenType": "Bearer",
    "accessToken": "9cd7e1d2f5a84e90bb89aa3c07c12211",
    "expiresAt": "2026-03-30T07:00:00Z",
    "user": {
      "id": 44,
      "fullName": "Google User",
      "email": "google.user@example.com",
      "role": "USER",
      "workingStoreId": null,
      "workingStoreName": null,
      "workingStoreAddress": null,
      "verified": true,
      "profileCompleted": false,
      "createdAt": "2026-03-28T08:00:00Z",
      "verifiedAt": "2026-03-28T08:00:00Z"
    }
  },
  "googleCompleteProfileRequest": {
    "fullName": "Nguyen Van A",
    "password": "Password123"
  },
  "googleCompleteProfileResponse": {
    "message": "Google profile completed successfully",
    "user": {
      "id": 44,
      "fullName": "Nguyen Van A",
      "email": "google.user@example.com",
      "role": "USER",
      "workingStoreId": null,
      "workingStoreName": null,
      "workingStoreAddress": null,
      "verified": true,
      "profileCompleted": true,
      "createdAt": "2026-03-28T08:00:00Z",
      "verifiedAt": "2026-03-28T08:00:00Z"
    }
  }
}
```

### Employee Flow

```json
{
  "employeeTaskNotificationResponse": {
    "id": 91,
    "type": "ORDER_TASK",
    "title": "Don hang da thanh toan #701",
    "message": "Don hang #701 tai Tea House Q1 da thanh toan. Nhan vien vui long nhan xu ly.",
    "relatedOrderId": 701,
    "orderId": 701,
    "relatedStoreId": 1,
    "relatedStoreName": "Tea House Q1",
    "actionUrl": "/employee/orders/701",
    "read": false,
    "readAt": null,
    "createdAt": "2026-03-28T08:00:00Z",
    "updatedAt": "2026-03-28T08:00:00Z"
  },
  "employeeTaskNotificationPageResponse": {
    "items": [
      {
        "id": 91,
        "type": "ORDER_TASK",
        "title": "Don hang da thanh toan #701",
        "relatedOrderId": 701,
        "actionUrl": "/employee/orders/701",
        "read": false
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "employeeOrderResponse": {
    "id": 701,
    "userId": 44,
    "storeId": 1,
    "storeSlug": "tea-house-q1",
    "storeName": "Tea House Q1",
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "paymentProvider": "PAYOS",
    "paidAt": "2026-03-28T08:00:00Z",
    "subtotalAmount": 65000,
    "discountAmount": 0,
    "totalAmount": 65000,
    "deliveryType": "IMMEDIATE",
    "deliveryFullName": "Nguyen Van A",
    "deliveryPhoneNumber": "0901234567",
    "deliveryAddress": "12 Nguyen Hue, Quan 1, TP HCM",
    "preparingStaffId": null,
    "preparingStaffName": null,
    "deliveringShipperId": null,
    "deliveringShipperName": null,
    "statusSummary": "Khach da thanh toan",
    "items": [
      {
        "id": 801,
        "storeId": 1,
        "storeSlug": "tea-house-q1",
        "storeName": "Tea House Q1",
        "dishId": 88,
        "dishName": "Iced Matcha Latte",
        "quantity": 1,
        "unitPrice": 65000,
        "lineTotal": 65000
      }
    ],
    "createdAt": "2026-03-28T07:58:00Z",
    "updatedAt": "2026-03-28T08:00:00Z"
  },
  "employeeOrderPageResponse": {
    "items": [
      {
        "id": 701,
        "storeId": 1,
        "storeName": "Tea House Q1",
        "status": "CONFIRMED",
        "paymentStatus": "PAID",
        "preparingStaffId": null,
        "deliveringShipperId": null,
        "statusSummary": "Khach da thanh toan"
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "staffAcceptedOrderResponse": {
    "id": 701,
    "status": "PREPARING",
    "paymentStatus": "PAID",
    "preparingStaffId": 15,
    "preparingStaffName": "Barista A",
    "statusSummary": "Nhan vien Barista A dang lam mon"
  },
  "staffReadyOrderResponse": {
    "id": 701,
    "status": "READY_FOR_SHIPPER",
    "paymentStatus": "PAID",
    "preparingStaffId": 15,
    "preparingStaffName": "Barista A",
    "statusSummary": "Da lam xong - cho shipper"
  },
  "shipperAcceptedOrderResponse": {
    "id": 701,
    "status": "OUT_FOR_DELIVERY",
    "paymentStatus": "PAID",
    "deliveringShipperId": 16,
    "deliveringShipperName": "Shipper B",
    "statusSummary": "Shipper B dang giao hang"
  },
  "shipperCompletedOrderResponse": {
    "id": 701,
    "status": "COMPLETED",
    "paymentStatus": "PAID",
    "deliveringShipperId": 16,
    "deliveringShipperName": "Shipper B",
    "statusSummary": "Shipper B da giao hang thanh cong"
  }
}
```

### Checkout And Order

```json
{
  "checkoutRequest": {
    "deliveryAddressId": 101,
    "promotionCode": "MATCHA10",
    "deliveryType": "IMMEDIATE",
    "scheduledDeliveryAt": null,
    "returnUrl": "https://frontend.example.com/checkout/success",
    "cancelUrl": "https://frontend.example.com/checkout/cancel"
  },
  "checkoutResponse": {
    "id": 501,
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "paymentProvider": "PAYOS",
    "payosOrderCode": 900001,
    "paymentLinkId": "plink_123",
    "paymentCheckoutUrl": "https://payos.vn/checkout/123",
    "paymentQrCode": "data:image/png;base64,...",
    "paymentExpiresAt": "2026-03-23T08:00:00Z",
    "paidAt": null,
    "paymentReference": "TM-501",
    "subtotalAmount": 180000,
    "discountAmount": 18000,
    "totalAmount": 162000,
    "promotionCode": "MATCHA10",
    "deliveryType": "IMMEDIATE",
    "scheduledDeliveryAt": null,
    "deliveryFullName": "Nguyen Van A",
    "deliveryPhoneNumber": "0909123456",
    "deliveryAddress": "12 Nguyen Trai, Q1",
    "statusSummary": "Khach chua thanh toan",
    "orders": [
      {
        "id": 701,
        "userId": 12,
        "storeId": 1,
        "storeSlug": "tea-house-q1",
        "storeName": "Tea House Q1",
        "status": "PENDING",
        "paymentStatus": "PENDING",
        "paymentProvider": "PAYOS",
        "payosOrderCode": 900001,
        "paymentLinkId": "plink_123",
        "paymentCheckoutUrl": "https://payos.vn/checkout/123",
        "paymentQrCode": "data:image/png;base64,...",
        "paymentExpiresAt": "2026-03-23T08:00:00Z",
        "paidAt": null,
        "paymentReference": "TM-501-1",
        "subtotalAmount": 180000,
        "discountAmount": 18000,
        "totalAmount": 162000,
        "promotionCode": "MATCHA10",
        "promotionScope": "ORDER",
        "promotionEligibleAmount": 180000,
        "promotionDishIds": [],
        "deliveryType": "IMMEDIATE",
        "scheduledDeliveryAt": null,
        "deliveryFullName": "Nguyen Van A",
        "deliveryPhoneNumber": "0909123456",
        "deliveryAddress": "12 Nguyen Trai, Q1",
        "preparingStaffId": null,
        "preparingStaffName": null,
        "deliveringShipperId": null,
        "deliveringShipperName": null,
        "statusSummary": "Khach chua thanh toan",
        "items": [
          {
            "id": 9001,
            "storeId": 1,
            "storeSlug": "tea-house-q1",
            "storeName": "Tea House Q1",
            "dishId": 88,
            "dishName": "Matcha Latte",
            "quantity": 2,
            "unitPrice": 90000,
            "totalPrice": 180000,
            "imagePaths": ["/uploads/dishes/matcha-latte.jpg"],
            "createdAt": "2026-03-23T07:00:00Z",
            "updatedAt": "2026-03-23T07:00:00Z"
          }
        ],
        "createdAt": "2026-03-23T07:00:00Z",
        "updatedAt": "2026-03-23T07:00:00Z"
      }
    ],
    "createdAt": "2026-03-23T07:00:00Z",
    "updatedAt": "2026-03-23T07:00:00Z"
  }
}
```

### Common User Request Bodies

```json
{
  "deliveryAddressRequest": {
    "fullName": "Nguyen Van A",
    "phoneNumber": "0909123456",
    "deliveryAddress": "12 Nguyen Trai, District 1",
    "primary": true
  },
  "passwordResetOtpRequest": {
    "email": "user.anna@teamatcha.local"
  },
  "passwordResetConfirmRequest": {
    "email": "user.anna@teamatcha.local",
    "otp": "472915",
    "newPassword": "NewPassword123"
  },
  "favoriteRequest": {
    "targetType": "DISH",
    "targetId": 88
  },
  "userReviewRequest": {
    "targetType": "STORE",
    "targetId": 1,
    "rating": 5,
    "title": "Great service",
    "comment": "Fast service, drinks are fresh and tasty."
  },
  "customerFeedbackRequest": {
    "category": "DELIVERY",
    "relatedOrderId": 701,
    "relatedStoreId": 1,
    "subject": "Late delivery",
    "message": "My order arrived 20 minutes late."
  },
  "customerFeedbackResponse": {
    "id": 12,
    "userId": 8,
    "userName": "Anna Nguyen",
    "userEmail": "user.anna@teamatcha.local",
    "category": "DELIVERY",
    "relatedStoreId": 1,
    "relatedStoreSlug": "district-1",
    "relatedStoreName": "Tea Matcha District 1",
    "relatedStoreAddress": "12 Nguyen Hue, Quan 1",
    "relatedOrderId": 701,
    "relatedOrderStatus": "COMPLETED",
    "relatedOrderPaymentStatus": "PAID",
    "relatedOrderPaymentReference": "TM-501-1",
    "subject": "Late delivery",
    "message": "My order arrived 20 minutes late.",
    "replyMessage": "Tea Matcha da ghi nhan va se bo sung nhan su gio cao diem.",
    "repliedAt": "2026-03-24T08:00:00Z",
    "repliedByUserId": 1,
    "repliedByUserName": "Platform Admin",
    "repliedByUserRole": "ADMIN",
    "createdAt": "2026-03-24T07:30:00Z",
    "updatedAt": "2026-03-24T08:00:00Z"
  },
  "userCurrentLevelResponse": [
    {
      "storeId": 1,
      "storeSlug": "tea-house-q1",
      "storeName": "Tea House Q1",
      "currentYear": 2026,
      "currentQuarter": 1,
      "evaluatedYear": 2025,
      "evaluatedQuarter": 4,
      "qualifyingPaidAmount": 320000,
      "levelId": 5,
      "levelCode": "SILVER",
      "levelName": "Silver",
      "levelMinPaidAmount": 300000
    }
  ],
  "userNotificationResponse": {
    "id": 21,
    "type": "ORDER_STATUS",
    "title": "Cap nhat don hang #701",
    "message": "Don hang #701 dang duoc giao den ban.",
    "relatedOrderId": 701,
    "relatedEventId": null,
    "relatedStoreId": 1,
    "relatedStoreName": "Tea House Q1",
    "read": false,
    "readAt": null,
    "createdAt": "2026-03-24T09:15:00Z"
  },
  "userNotificationUnreadCountResponse": {
    "unreadCount": 3
  }
}
```
