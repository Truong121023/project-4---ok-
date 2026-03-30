# Frontend Admin API Guide

Scope: this file covers only admin-facing APIs for the Tea Matcha backend.
All endpoints expect an authenticated admin token in the `Authorization` header.
Quick endpoint-to-sample lookup is available in `API_QUICK_REFERENCE.md`.
Latest role matrix and manager scope note is available in `FRONTEND_ROLE_API_NOTE.md`.

## Common Rules

- Base path: `/api`
- Protected endpoints require `Authorization: Bearer <accessToken>`
- Send JSON with `Content-Type: application/json`
- Multipart uploads use `multipart/form-data`
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
- Common enums used by the admin API:
  - `Role`: `ADMIN`, `MANAGER`, `SHIPPER`, `STAFF`, `USER`
  - `OrderStatus`: `PENDING`, `CONFIRMED`, `PREPARING`, `READY_FOR_SHIPPER`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELLED`
  - `PaymentStatus`: `PENDING`, `PAID`, `CANCELLED`, `FAILED`
  - `OrderStageFilter`: `UNPAID`, `PAID`, `PREPARING`, `DELIVERING`, `COMPLETED`, `CANCELLED`
  - `PromotionScope`: `ORDER`, `DISH`
  - `PromotionDiscountType`: `PERCENT`, `FIXED_AMOUNT`

### Shared Content Sections

- `ContentSectionRequest`
  - `title`
  - `content`
  - Optional legacy alias: `imagePath`
  - Optional preferred field: `imagePaths`
- `ContentSectionResponse`
  - `title`
  - `content`
  - `imagePath`
  - `imagePaths`

### Frontend Migration Note

- Updated on 2026-03-26: backend persistence for store, dish, event, and news sections now uses one shared DB table: `content_sections`.
- Admin API contract does not change. Continue sending and receiving `sections` on `Store`, `Dish`, `EventItem`, and `NewsArticle`.
- Section order is meaningful. Keep the array in the same visual order the editor shows because backend persists that order into `sort_order`.
- `PUT` and `POST` should send the full final `sections` array. If the UI removes a section, omit it from the next payload. If the UI sends `[]`, backend clears all sections for that resource.
- Each section still has no section `id` in request or response.
- `sections[].imagePaths` now supports multiple uploaded images per section. `sections[].imagePath` still works as a backward-compatible alias for the first image.
- If both `imagePath` and `imagePaths` are sent, backend prefers `imagePaths`.
- Upload images first through `/api/admin/uploads/images`, then place the returned paths into `sections[].imagePaths`.
- `Category` is unchanged and still does not support `sections`.
- Existing demo data now includes populated sections for all 20 stores, 20 dishes, 20 events, and 20 news articles.

## Admin Login Flow

1. Use the same `POST /api/auth/login` endpoint as the normal user flow.
2. Store the returned `accessToken` and send it as `Authorization: Bearer <accessToken>`.
3. Call `GET /api/auth/me` right after login to confirm the session and read the current role.
4. Allow admin navigation only when the role is `ADMIN` or `MANAGER`.
5. If the role is `MANAGER`, show only store-scoped admin resources for `workingStoreId`, plus staff/shipper management for that store.
6. If `GET /api/auth/me` fails, clear the token and force the login screen.

## Admin Login Notes

- The backend does not issue JWTs here; it issues an opaque session token.
- `POST /api/auth/login` will still succeed for non-admin users, so the frontend must check the returned role.
- If the account is not verified, login fails with `Email is not verified. Please verify OTP before login.`
- If the account is not `ADMIN` or `MANAGER`, the admin UI should show an access error even if login itself succeeded.
- `MANAGER` access is intentionally narrower than `ADMIN` access and is scoped to `workingStoreId`.

## 1. Dashboard And Upload

| Method | Path | Body / Query | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Header only | `AdminDashboardResponse` | Big dashboard payload |
| `GET` | `/api/admin/summary` | Header only | `AdminSummaryResponse` | Lightweight counts |
| `POST` | `/api/admin/uploads/images` | `files`, optional `folder` | `UploadImagesResponse` | Multipart upload |

### Upload DTOs

- `UploadImagesResponse`
  - `message`
  - `paths`
  - `files`
- `UploadedFileResponse`
  - `originalName`
  - `storedName`
  - `path`
  - `contentType`
  - `size`

### Dashboard DTOs

- `AdminDashboardResponse`
  - `users`
  - `stores`
  - `events`
  - `categories`
  - `dishes`
  - `reviews`
  - `news`
- `AdminSummaryResponse`
  - `userCount`
  - `storeCount`
  - `eventCount`
  - `categoryCount`
  - `dishCount`
  - `reviewCount`
  - `newsCount`

## 2. Users

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/users` | `page`, `size`, `search` | `PageResponse<AdminUserResponse>` | User list |
| `GET` | `/api/admin/users/{id}` | Header only | `AdminUserResponse` | One user |
| `POST` | `/api/admin/users` | `AdminUserRequest` | `AdminUserResponse` | Create user |
| `PUT` | `/api/admin/users/{id}` | `AdminUserRequest` | `AdminUserResponse` | Update user |
| `PUT` | `/api/admin/users/{id}/verification` | `AdminUserVerificationRequest` | `AdminUserResponse` | Mark account as verified or unverified |
| `DELETE` | `/api/admin/users/{id}` | Header only | `MessageResponse` | Delete user |

### User DTOs

- `AdminUserRequest`
  - `fullName`
  - `email`
  - `password`
  - `role`
  - `workingStoreId`
  - `enabled`
- `AdminUserVerificationRequest`
  - `verified`
- `AdminUserResponse`
  - `id`
  - `fullName`
  - `email`
  - `role`
  - `workingStoreId`
  - `workingStoreName`
  - `workingStoreAddress`
  - `enabled`
  - `verified`
  - `createdAt`
  - `updatedAt`
  - `verifiedAt`

### User form notes

- `password` is required when creating a user.
- `password` is optional on update; if sent and not blank, the backend updates the password.
- `workingStoreId` is used for staff-like roles that need a store assignment.
- `enabled` is a required boolean in the request body.
- `PUT /api/admin/users/{id}/verification` is the explicit endpoint to toggle account verification status for existing users.

## 3. Stores

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/stores` | `page`, `size`, `search` | `PageResponse<StoreResponse>` | Store list |
| `GET` | `/api/admin/stores/{id}` | Header only | `StoreResponse` | One store |
| `POST` | `/api/admin/stores` | `StoreRequest` | `StoreResponse` | Create store |
| `PUT` | `/api/admin/stores/{id}` | `StoreRequest` | `StoreResponse` | Update store |
| `PUT` | `/api/admin/stores/{id}/highlights` | `HighlightMetadataRequest` | `StoreResponse` | Update highlight section |
| `DELETE` | `/api/admin/stores/{id}` | Header only | `MessageResponse` | Delete store |

### Store DTOs

- `StoreRequest`
  - Required: `name`, `active`
  - Optional: `description`, `address`, `contactEmail`, `phoneNumber`, `slug`, `latitude`, `longitude`, `area`, `positionLabel`, `hoursText`, `openTime`, `closeTime`, `personality`, `designSignature`, `franchiseMood`, `specialty`, `highlightSummary`, `highlightTags`, `serviceTags`, `imagePaths`, `sections`
- `HighlightMetadataRequest`
  - `highlightSummary`
  - `highlightTags`
- `StoreResponse`
  - `id`
  - `slug`
  - `name`
  - `description`
  - `address`
  - `contactEmail`
  - `phoneNumber`
  - `latitude`
  - `longitude`
  - `area`
  - `positionLabel`
  - `hoursText`
  - `openTime`
  - `closeTime`
  - `personality`
  - `designSignature`
  - `franchiseMood`
  - `specialty`
  - `highlightSummary`
  - `highlightTags`
  - `serviceTags`
  - `imagePaths`
  - `sections`
  - `active`
  - `createdAt`
  - `updatedAt`

## 4. Events

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/events` | `page`, `size`, `search` | `PageResponse<EventItemResponse>` | Event list |
| `GET` | `/api/admin/events/{id}` | Header only | `EventItemResponse` | One event |
| `POST` | `/api/admin/events` | `EventItemRequest` | `EventItemResponse` | Create event |
| `PUT` | `/api/admin/events/{id}` | `EventItemRequest` | `EventItemResponse` | Update event |
| `PUT` | `/api/admin/events/{id}/highlights` | `HighlightMetadataRequest` | `EventItemResponse` | Update highlight section |
| `DELETE` | `/api/admin/events/{id}` | Header only | `MessageResponse` | Delete event |

### Event DTOs

- `EventItemRequest`
  - Required: `storeId`, `name`, `startsAt`, `endsAt`, `active`
  - Optional: `slug`, `description`, `location`, `scheduleText`, `highlightSummary`, `highlightTags`, `capacity`, `bookedCount`, `featuredDishIds`, `imagePaths`, `sections`
- `EventItemResponse`
  - `id`
  - `slug`
  - `storeId`
  - `storeName`
  - `name`
  - `description`
  - `location`
  - `scheduleText`
  - `highlightSummary`
  - `highlightTags`
  - `capacity`
  - `bookedCount`
  - `featuredDishIds`
  - `imagePaths`
  - `sections`
  - `startsAt`
  - `endsAt`
  - `active`
  - `createdAt`
  - `updatedAt`

### Event notes

- Creating a new active event with `POST /api/admin/events` automatically generates user notifications in the storefront notification center.
- `slug` is optional on write. If omitted, backend generates it from `name`.
- Storefront deep links can use `GET /api/public/events/{eventKey}` with either event id or slug.

## 5. Categories

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/categories` | `page`, `size`, `search` | `PageResponse<CategoryResponse>` | Category list |
| `GET` | `/api/admin/categories/{id}` | Header only | `CategoryResponse` | One category |
| `POST` | `/api/admin/categories` | `CategoryRequest` | `CategoryResponse` | Create category |
| `PUT` | `/api/admin/categories/{id}` | `CategoryRequest` | `CategoryResponse` | Update category |
| `DELETE` | `/api/admin/categories/{id}` | Header only | `MessageResponse` | Delete category |

### Category DTOs

- `CategoryRequest`
  - `storeId`
  - `name`
  - `description`
  - `imagePaths`
  - `sortOrder`
  - `active`
- `CategoryResponse`
  - `id`
  - `storeId`
  - `storeName`
  - `name`
  - `description`
  - `imagePaths`
  - `sortOrder`
  - `active`
  - `createdAt`
  - `updatedAt`

## 6. Dishes

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/dishes` | `page`, `size`, `search` | `PageResponse<DishResponse>` | Dish list |
| `GET` | `/api/admin/dishes/{id}` | Header only | `DishResponse` | One dish |
| `POST` | `/api/admin/dishes` | `DishRequest` | `DishResponse` | Create dish |
| `PUT` | `/api/admin/dishes/{id}` | `DishRequest` | `DishResponse` | Update dish |
| `PUT` | `/api/admin/dishes/{id}/highlights` | `HighlightMetadataRequest` | `DishResponse` | Update highlight section |
| `DELETE` | `/api/admin/dishes/{id}` | Header only | `MessageResponse` | Delete dish |

### Dish DTOs

- `DishRequest`
  - Required: `categoryId`, `name`, `price`
  - Optional: `description`, `note`, `status`, `available`, `franchiseRequired`, `franchiseNote`, `highlightSummary`, `highlightTags`, `imagePaths`, `sections`, `active`
- `DishResponse`
  - `id`
  - `categoryId`
  - `categoryName`
  - `name`
  - `description`
  - `note`
  - `price`
  - `status`
  - `franchiseRequired`
  - `franchiseNote`
  - `highlightSummary`
  - `highlightTags`
  - `active`
  - `available`
  - `storeId`
  - `storeName`
  - `imagePaths`
  - `sections`
  - `createdAt`
  - `updatedAt`

## 7. Reviews

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/reviews` | `page`, `size`, `search` | `PageResponse<ReviewResponse>` | Review list |
| `GET` | `/api/admin/reviews/{id}` | Header only | `ReviewResponse` | One review |
| `DELETE` | `/api/admin/reviews/{id}` | Header only | `MessageResponse` | Delete review |

### Review DTOs

- `ReviewResponse`
  - `id`
  - `userId`
  - `userName`
  - `userEmail`
  - `targetType`
  - `targetId`
  - `targetLabel`
  - `targetImagePaths`
  - `rating`
  - `title`
  - `comment`
  - `approved`
  - `createdAt`
  - `updatedAt`

### Review notes

- Review APIs now only operate on `STORE`, `EVENT`, or `DISH`
- Legacy `CATEGORY` reviews are filtered out from normal admin list/detail flows and should be cleaned up separately if they still exist in old data

## 8. News

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/news` | `page`, `size`, `search` | `PageResponse<NewsArticleResponse>` | News list |
| `GET` | `/api/admin/news/{id}` | Header only | `NewsArticleResponse` | One article |
| `POST` | `/api/admin/news` | `NewsArticleRequest` | `NewsArticleResponse` | Create article |
| `PUT` | `/api/admin/news/{id}` | `NewsArticleRequest` | `NewsArticleResponse` | Update article |
| `DELETE` | `/api/admin/news/{id}` | Header only | `MessageResponse` | Delete article |

### News DTOs

- `NewsArticleRequest`
  - `title`
  - `slug`
  - `summary`
  - `content`
  - `relatedStoreId`
  - `tags`
  - `imagePaths`
  - `sections`
  - `featured`
  - `published`
  - `publishedAt`
- `NewsArticleResponse`
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
  - `published`
  - `publishedAt`
  - `createdAt`
  - `updatedAt`

### News form notes

- Admin edit routes use numeric `id`, not `slug`.
- Public detail pages use `GET /api/public/news/{newsKey}` where `{newsKey}` is the article slug.
- `slug` can be omitted on create or update; backend will normalize it from `title`.
- `featured` and `published` are required booleans in the request body.
- `publishedAt` can be `null` for drafts. If `published=true` and `publishedAt=null`, backend will auto-fill the current time.
- `sections` lets admin build long-form editorial content for stores, dishes, events, and news using multiple titled blocks with optional images.
- Those sections are now stored in shared backend table `content_sections`, but frontend still works only with the normal `sections` array in the article payload.

## 9. Store Dishes

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/store-dishes` | `page`, `size`, `search` | `PageResponse<StoreDishResponse>` | Store-dish list |
| `GET` | `/api/admin/store-dishes/{id}` | Header only | `StoreDishResponse` | One record |
| `POST` | `/api/admin/store-dishes` | `StoreDishRequest` | `StoreDishResponse` | Create record |
| `PUT` | `/api/admin/store-dishes/{id}` | `StoreDishRequest` | `StoreDishResponse` | Update record |
| `DELETE` | `/api/admin/store-dishes/{id}` | Header only | `MessageResponse` | Delete record |

### Store-dish DTOs

- `StoreDishRequest`
  - `storeId`
  - `dishId`
  - `quantity`
  - `available`
  - `priceOverride`
- `StoreDishResponse`
  - `id`
  - `storeId`
  - `storeName`
  - `dishId`
  - `dishName`
  - `categoryId`
  - `categoryName`
  - `basePrice`
  - `priceOverride`
  - `effectivePrice`
  - `quantity`
  - `available`
  - `createdAt`
  - `updatedAt`

## 10. Orders

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/orders` | `status`, `paymentStatus`, `stage`, `storeId`, `page`, `size` | `PageResponse<OrderResponse>` | Order list with optional stage filters |
| `GET` | `/api/admin/orders/{id}` | Header only | `OrderResponse` | One order |
| `PUT` | `/api/admin/orders/{id}/status` | `OrderStatusUpdateRequest` | `OrderResponse` | Update status/payment |

### Order DTOs

- `OrderStatusUpdateRequest`
  - `status`
  - `paymentStatus`
  - `preparingStaffId`
  - `deliveringShipperId`
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

### Order notes

- `stage` accepts `UNPAID`, `PAID`, `PREPARING`, `DELIVERING`, `COMPLETED`, `CANCELLED`
- `status` and `paymentStatus` can still be combined with `stage` for stricter filtering
- `storeId` is optional for `ADMIN`; `MANAGER` accounts are always restricted to their own store

## Work Schedules And Attendance

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `PUT` | `/api/admin/work-schedules/monthly` | `EmployeeWorkScheduleMonthlyUpsertRequest` | `EmployeeWorkScheduleMonthResponse` | Admin assigns the full final monthly schedule for one store |
| `GET` | `/api/admin/work-schedules/monthly` | `storeId`, `month`, optional `userId`, `role`, `search` | `EmployeeWorkScheduleMonthResponse` | `MANAGER` can read only their own store |
| `GET` | `/api/admin/attendances` | `storeId`, `userId`, `role`, `workDate`, `checkedOut`, `search`, `page`, `size` | `PageResponse<EmployeeAttendanceResponse>` | Attendance log |
| `GET` | `/api/admin/attendances/summary` | `storeId`, `workDate` | `EmployeeAttendanceSummaryResponse` | Daily summary based on scheduled staff/shipper for that date |

### Work schedule request DTOs

- `EmployeeWorkScheduleMonthlyUpsertRequest`
  - `storeId`
  - `month`
  - `entries`
- `EmployeeWorkScheduleEntryRequest`
  - `userId`
  - `workDate`
  - `scheduledStartTime`
  - `scheduledEndTime`
  - `note`

### Work schedule response DTOs

- `EmployeeWorkScheduleMonthResponse`
  - `month`
  - `storeId`
  - `storeName`
  - `items`
- `EmployeeWorkScheduleResponse`
  - `id`
  - `userId`
  - `fullName`
  - `email`
  - `role`
  - `storeId`
  - `storeName`
  - `storeAddress`
  - `workDate`
  - `scheduledStartTime`
  - `scheduledEndTime`
  - `scheduledMinutes`
  - `note`
  - `attendanceId`
  - `checkInAt`
  - `checkOutAt`
  - `workedMinutes`
  - `checkedIn`
  - `checkedOut`
  - `currentlyWorking`

### Attendance response DTOs

- `EmployeeAttendanceResponse`
  - `id`
  - `workScheduleId`
  - `userId`
  - `fullName`
  - `email`
  - `role`
  - `storeId`
  - `storeName`
  - `storeAddress`
  - `workDate`
  - `scheduledStartTime`
  - `scheduledEndTime`
  - `scheduleNote`
  - `checkInAt`
  - `checkOutAt`
  - `workedMinutes`
  - `checkedIn`
  - `checkedOut`
  - `currentlyWorking`
- `EmployeeAttendanceSummaryResponse`
  - `workDate`
  - `storeId`
  - `storeName`
  - `totalAssignedEmployees`
  - `totalAssignedStaff`
  - `totalAssignedShippers`
  - `presentCount`
  - `presentStaffCount`
  - `presentShipperCount`
  - `checkedOutCount`
  - `currentlyWorkingCount`

### Work schedule and attendance notes

- `PUT /api/admin/work-schedules/monthly` is replace-style for one store and one month.
- The frontend should send the full final `entries` array for that store/month, not only diffs.
- Each employee can have at most one schedule per day.
- Only users with role `STAFF` or `SHIPPER` and `workingStoreId` matching `storeId` can be scheduled.
- `scheduledEndTime` must be after `scheduledStartTime`.
- If attendance already exists for a removed schedule entry, backend rejects the update instead of deleting historical references.
- Employee check-in now requires a schedule for that day, so the admin UI should publish the monthly roster before staff/shipper start using attendance.

## 11. Promotions

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/promotions` | Header only | `List<PromotionResponse>` | Not paginated |
| `GET` | `/api/admin/promotions/{id}` | Header only | `PromotionResponse` | One promotion |
| `POST` | `/api/admin/promotions` | `PromotionRequest` | `PromotionResponse` | Create promotion |
| `PUT` | `/api/admin/promotions/{id}` | `PromotionRequest` | `PromotionResponse` | Update promotion |
| `DELETE` | `/api/admin/promotions/{id}` | Header only | `MessageResponse` | Delete promotion |

### Promotion DTOs

- `PromotionRequest`
  - `code`
  - `name`
  - `description`
  - `scope`
  - `discountType`
  - `discountValue`
  - `minOrderAmount`
  - `minimumOrderAmount`
  - `maxDiscountAmount`
  - `maximumDiscountAmount`
  - `minStoreBillAmount`
  - `minCrossStoreBillAmount`
  - `usageLimit`
  - `startsAt`
  - `endsAt`
  - `applicableDishIds`
  - `promotionDishIds`
  - `eligibleStoreIds`
  - `eligibleUserLevelIds`
  - `active`
- `PromotionResponse`
  - `id`
  - `code`
  - `name`
  - `description`
  - `scope`
  - `discountType`
  - `discountValue`
  - `minOrderAmount`
  - `minimumOrderAmount`
  - `maxDiscountAmount`
  - `maximumDiscountAmount`
  - `minStoreBillAmount`
  - `minCrossStoreBillAmount`
  - `usageLimit`
  - `usedCount`
  - `startsAt`
  - `endsAt`
  - `applicableDishIds`
  - `promotionDishIds`
  - `eligibleStoreIds`
  - `eligibleUserLevelIds`
  - `active`
  - `createdAt`
  - `updatedAt`

### Promotion notes

- Backend accepts both legacy request names and frontend aliases:
  - `minOrderAmount` or `minimumOrderAmount`
  - `maxDiscountAmount` or `maximumDiscountAmount`
  - `applicableDishIds` or `promotionDishIds`
- If both alias and legacy fields are sent together, they must match.
- `name` is now a first-class field and is returned in responses.
- `eligibleStoreIds` limits the promotion to specific store bills in checkout.
- `eligibleUserLevelIds` limits the promotion to users who currently match one of those store-level definitions.
- `minStoreBillAmount` is checked against each store bill.
- `minCrossStoreBillAmount` is checked against the combined subtotal of all store bills that are otherwise eligible.

## 11A. User Levels

| Method | Path | Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/user-levels` | Header only | `List<UserLevelDefinitionResponse>` | List all store levels |
| `GET` | `/api/admin/user-levels/{id}` | Header only | `UserLevelDefinitionResponse` | One level |
| `POST` | `/api/admin/user-levels` | `UserLevelDefinitionRequest` | `UserLevelDefinitionResponse` | Create level |
| `PUT` | `/api/admin/user-levels/{id}` | `UserLevelDefinitionRequest` | `UserLevelDefinitionResponse` | Update level |
| `DELETE` | `/api/admin/user-levels/{id}` | Header only | `MessageResponse` | Delete level |

### User level DTOs

- `UserLevelDefinitionRequest`
  - `storeId`
  - `code`
  - `name`
  - `minPaidAmount`
  - `active`
- `UserLevelDefinitionResponse`
  - `id`
  - `storeId`
  - `storeSlug`
  - `storeName`
  - `code`
  - `name`
  - `minPaidAmount`
  - `active`
  - `createdAt`
  - `updatedAt`

### User level notes

- Levels are configured per store.
- The user's current level for a store is calculated from the previous quarter's `PAID` amount and becomes effective in the current quarter.

## 12. Feedback Moderation

| Method | Path | Query / Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/feedbacks` | `page`, `size`, `search` | `PageResponse<CustomerFeedbackResponse>` | Feedback list |
| `GET` | `/api/admin/feedbacks/{id}` | Header only | `CustomerFeedbackResponse` | One feedback |
| `GET` | `/api/admin/feedbacks/{id}/reply` | Header only | `AdminFeedbackReplyResponse` | Reply detail only |
| `PUT` | `/api/admin/feedbacks/{id}/reply` | `AdminFeedbackReplyRequest` | `AdminFeedbackReplyResponse` | Create or update admin reply |
| `DELETE` | `/api/admin/feedbacks/{id}/reply` | Header only | `MessageResponse` | Remove admin reply |
| `DELETE` | `/api/admin/feedbacks/{id}` | Header only | `MessageResponse` | Delete feedback |

### Feedback DTOs

- `AdminFeedbackReplyRequest`
  - `replyMessage`
- `AdminFeedbackReplyResponse`
  - `feedbackId`
  - `replyMessage`
  - `repliedAt`
  - `repliedByUserId`
  - `repliedByUserName`
  - `repliedByUserRole`
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

### Feedback reply notes

- `GET /api/admin/feedbacks/{id}` already includes reply metadata, so the detail screen can render the reply without a second request.
- `GET /api/admin/feedbacks/{id}/reply` is useful when the UI edits only the reply box.
- If a feedback has no reply yet, `GET /api/admin/feedbacks/{id}/reply` returns `404` with message `Feedback reply not found`.
- `DELETE /api/admin/feedbacks/{id}/reply` only clears the reply, not the original feedback.
- Order-linked feedbacks now expose `relatedOrderId`, `relatedOrderStatus`, and `relatedOrderPaymentStatus` directly on the feedback detail.

## 13. Frontend Checklist

- Use the same `Authorization` header format for all admin requests.
- `GET /api/admin/promotions` returns a plain list, not `PageResponse<T>`.
- Use `/api/admin/user-levels` to manage store-specific level thresholds before wiring promotions that depend on `eligibleUserLevelIds`.
- `StoreRequest`, `CategoryRequest`, `DishRequest`, `EventItemRequest`, `NewsArticleRequest`, `StoreDishRequest`, and `PromotionRequest` are the main admin edit forms.
- `HighlightMetadataRequest` is reused for store, event, and dish highlight updates.
- `UploadImagesResponse.paths` is the quickest field to persist into image-path arrays.
- Do not build admin forms against old tables such as `store_sections`, `dish_sections`, `event_sections`, or `news_article_sections`; all of those have been replaced by shared backend storage in `content_sections`.

## Sample Payloads

### Admin Login And Session

```json
{
  "loginResponse": {
    "message": "Login successful",
    "tokenType": "Bearer",
    "accessToken": "f8f8a9d0c2e1411b9f3d8d5f9e10c001",
    "expiresAt": "2026-03-30T07:00:00Z",
    "user": {
      "id": 1,
      "fullName": "Admin User",
      "email": "admin@example.com",
      "role": "ADMIN",
      "workingStoreId": null,
      "workingStoreName": null,
      "workingStoreAddress": null,
      "verified": true,
      "createdAt": "2026-03-23T06:00:00Z",
      "verifiedAt": "2026-03-23T06:10:00Z"
    }
  },
  "meResponse": {
    "message": "Token is valid",
    "expiresAt": "2026-03-30T07:00:00Z",
    "user": {
      "id": 1,
      "fullName": "Admin User",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  }
}
```

### Main Admin Form Bodies

```json
{
  "adminUserRequest": {
    "fullName": "Staff A",
    "email": "staff@example.com",
    "password": "12345678",
    "role": "STAFF",
    "workingStoreId": 1,
    "enabled": true
  },
  "adminUserVerificationRequest": {
    "verified": true
  },
  "storeRequest": {
    "name": "Tea House Q1",
    "description": "Fresh matcha drinks in District 1",
    "address": "12 Nguyen Trai, District 1",
    "contactEmail": "store@example.com",
    "phoneNumber": "0909123456",
    "slug": "tea-house-q1",
    "latitude": 10.775,
    "longitude": 106.703,
    "area": "District 1",
    "positionLabel": "Center",
    "hoursText": "08:00 - 22:00",
    "openTime": "08:00:00",
    "closeTime": "22:00:00",
    "personality": "Modern and cozy",
    "designSignature": "Warm wood interior",
    "franchiseMood": "Premium, youthful",
    "specialty": "Matcha latte",
    "highlightSummary": "Best seller matcha drinks",
    "highlightTags": ["Matcha", "Fresh"],
    "serviceTags": ["Dine-in", "Takeaway"],
    "imagePaths": ["/uploads/stores/tea-house-q1.jpg"],
    "active": true
  },
  "eventItemRequest": {
    "storeId": 1,
    "name": "Spring Matcha Party",
    "description": "Limited event for spring menu",
    "location": "Tea House Q1",
    "scheduleText": "Every weekend in March",
    "highlightSummary": "Special event drinks",
    "highlightTags": ["Event", "Limited"],
    "capacity": 100,
    "bookedCount": 20,
    "featuredDishIds": [88, 89],
    "imagePaths": ["/uploads/events/spring-party.jpg"],
    "startsAt": "2026-03-25T10:00:00Z",
    "endsAt": "2026-03-30T10:00:00Z",
    "active": true
  },
  "categoryRequest": {
    "storeId": 1,
    "name": "Drinks",
    "description": "Matcha and tea drinks",
    "imagePaths": ["/uploads/categories/drinks.jpg"],
    "sortOrder": 1,
    "active": true
  },
  "dishRequest": {
    "categoryId": 9,
    "name": "Matcha Latte",
    "description": "Creamy matcha latte",
    "note": "Less sugar by default",
    "price": 90000,
    "status": "ACTIVE",
    "available": true,
    "franchiseRequired": false,
    "franchiseNote": null,
    "highlightSummary": "Top rated drink",
    "highlightTags": ["Popular"],
    "imagePaths": ["/uploads/dishes/matcha-latte.jpg"],
    "active": true
  },
  "storeDishRequest": {
    "storeId": 1,
    "dishId": 88,
    "quantity": 20,
    "available": true,
    "priceOverride": 88000
  },
  "newsArticleRequest": {
    "title": "Tea Matcha Airport Hub khai truong",
    "slug": "tea-matcha-airport-hub-khai-truong",
    "summary": "Chi nhanh moi gan san bay da san sang don khach.",
    "content": "Tea Matcha chinh thuc mo them diem ban tai khu vuc san bay voi menu bottled brew va tea fizz.",
    "relatedStoreId": 3,
    "tags": ["khai-truong", "san-bay", "airport-hub"],
    "imagePaths": ["/uploads/news/airport-hub-1.jpg"],
    "featured": true,
    "published": true,
    "publishedAt": "2026-03-20T02:00:00Z"
  },
  "orderStatusUpdateRequest": {
    "status": "PREPARING",
    "paymentStatus": "PAID",
    "preparingStaffId": 21,
    "deliveringShipperId": null
  },
  "promotionRequest": {
    "code": "MATCHA10",
    "name": "Matcha Festival Promo",
    "description": "10 percent off for orders",
    "scope": "ORDER",
    "discountType": "PERCENT",
    "discountValue": 10,
    "minimumOrderAmount": 100000,
    "maximumDiscountAmount": 30000,
    "minStoreBillAmount": 100000,
    "minCrossStoreBillAmount": 250000,
    "usageLimit": 100,
    "startsAt": "2026-03-23T00:00:00Z",
    "endsAt": "2026-04-30T23:59:59Z",
    "promotionDishIds": [],
    "eligibleStoreIds": [1, 2],
    "eligibleUserLevelIds": [5, 6],
    "active": true
  },
  "userLevelDefinitionRequest": {
    "storeId": 1,
    "code": "SILVER",
    "name": "Silver",
    "minPaidAmount": 300000,
    "active": true
  },
  "adminFeedbackReplyRequest": {
    "replyMessage": "Tea Matcha da ghi nhan feedback va se xu ly trong ca lam viec tiep theo."
  },
  "adminFeedbackReplyResponse": {
    "feedbackId": 12,
    "replyMessage": "Tea Matcha da ghi nhan feedback va se xu ly trong ca lam viec tiep theo.",
    "repliedAt": "2026-03-24T05:10:00Z",
    "repliedByUserId": 1,
    "repliedByUserName": "Platform Admin",
    "repliedByUserRole": "ADMIN"
  }
}
```

### Upload And Dashboard Samples

```json
{
  "uploadImagesResponse": {
    "message": "Uploaded 2 image(s) successfully.",
    "paths": [
      "/uploads/stores/store-1.jpg",
      "/uploads/stores/store-2.jpg"
    ],
    "files": [
      {
        "originalName": "store-1.jpg",
        "storedName": "3f2d-store-1.jpg",
        "path": "/uploads/stores/store-1.jpg",
        "contentType": "image/jpeg",
        "size": 245812
      }
    ]
  },
  "adminSummaryResponse": {
    "userCount": 24,
    "storeCount": 5,
    "eventCount": 12,
    "categoryCount": 8,
    "dishCount": 42,
    "reviewCount": 180,
    "newsCount": 16
  },
  "pageResponse": {
    "items": [
      {
        "id": 1,
        "fullName": "Admin User"
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
