# Backend Relation Audit

## Scope

Tai lieu nay duoc tong hop tu source frontend trong `src/` va mock server trong `server/`.
Muc tieu la note lai:

- frontend dang goi endpoint nao
- frontend dang dung field nao khi truy xuat object
- relation nao backend can tra on dinh de frontend khong phai fallback
- cac diem dang lech nhau giua code frontend va note API cu

Tai lieu nay uu tien contract backend can chuan hoa, khong uu tien cac patch "chiu don" o frontend.

## Tong quan thuc te

- Frontend da duoc viet theo mot contract "Phase 2" lon hon mock server hien co.
- Mock server hien tai moi mount:
  - `/api/auth/*`
  - `/api/user/delivery-addresses/*`
  - `/api/admin/orders/*`
  - upload image
- Frontend thuc te dang ky vong them rat nhieu endpoint:
  - `/api/public/*`
  - `/api/user/cart/*`
  - `/api/user/orders/*`
  - `/api/user/favorites/*`
  - `/api/user/reviews/*`
  - `/api/user/feedbacks/*`
  - `/api/user/notifications/*`
  - `/api/admin/*` cho users, stores, events, categories, dishes, store-dishes, news, promotions, reviews, feedbacks, summary, dashboard

## Quy tac dinh danh va route ma frontend dang dung

### Store key

Frontend build link cua hang bang uu tien:

1. `slug`
2. `storeSlug`
3. `targetSlug`
4. `storeId`
5. `id`
6. `targetId`

He qua:

- bat ky object nao co the dan den trang store deu nen tra `slug` hoac `storeSlug`
- backend khong nen chi tra `storeId` neu muon deep link dep va on dinh
- public store detail nen ho tro ca `id` va `slug`

Noi frontend dang dung:

- `buildStorePath`
- Home, Stores, StoreDetail, Menu, DishDetail, Events, Reviews, News, Account, Cart

### News key

Frontend build link news detail bang:

1. `slug`

He qua:

- object news can co `slug`
- notification muon mo thang vao news thi backend nen tra `newsSlug` hoac `actionUrl`

### Target type

Frontend normalize target type:

- `item` -> `dish`
- `STORE` <-> `store`
- `DISH` <-> `dish`
- `EVENT` <-> `event`
- `CATEGORY` <-> `category`

He qua:

- backend nen dung target type on dinh, uu tien uppercase o API write/read
- frontend hien dang su dung `CATEGORY` trong luong review

## Auth va session

### Endpoint frontend dang dung

- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/password/request-otp`
- `POST /api/auth/password/reset`

### Contract frontend dang doc

#### Login response

- `accessToken` hoac `token`
- `tokenType` hoac `type`
- `expiresAt`
- `user`

#### Me response

- `user.id`
- `user.fullName`
- `user.email`
- `user.role`
- `user.workingStoreId`
- `expiresAt`

#### Register response

- `message`
- `userId`
- `email`
- `role`
- `otpExpiresAt`

#### Verify OTP response

- `message`
- `user`

#### Password reset OTP response

- `message`
- `email`
- `otpExpiresAt`

### Relation can ro rang

- `user.role` quyet dinh route sau login
- `user.workingStoreId` duoc admin page dung de scope user theo store

## Public domain

## Public home

### Endpoint

- `GET /api/public/home`

### Object relation frontend ky vong

- `featuredStores[]` la store list item
- `featuredDishes[]` la dish list item co `bestStore`
- `upcomingEvents[]` la event list item co relation sang store
- `storeLocations[]` la store list item
- `latestNews[]` la news list item co relation sang related store

## Store

### Store list

### Endpoint

- `GET /api/public/stores`

### Field frontend dang dung

- `id`
- `slug`
- `name`
- `description`
- `address`
- `area`
- `positionLabel`
- `latitude`
- `longitude`
- `imagePaths[]`
- `averageRating`
- `reviewCount`
- `favoriteCount`
- `availableItemCount`
- `distanceKm`
- `open`
- `disabled`
- `disabledReason`
- `contactEmail`
- `phoneNumber`
- `hoursText`
- `openTime`
- `closeTime`
- `highlightSummary`
- `highlightTags[]`
- `serviceTags[]`
- `active`

### Relation backend can tra on dinh

- `slug` bat buoc neu muon link dep
- `distanceKm` duoc dung khi frontend truyen `lat/lng`
- `open`, `openTime`, `closeTime` duoc dung de filter theo gio

### Store detail

### Endpoint

- `GET /api/public/stores/{storeKey}`

### Response root frontend dang dung

- `store`
- `stats`
- `categories[]`
- `events[]`
- `reviews[]`

### store

- phai la store object day du
- `slug` rat quan trong vi frontend se replace URL neu backend tra slug chuan

### stats

- `averageRating`
- `reviewCount`
- `favoriteCount`
- `availableItemCount`

### categories[]

Frontend dang xem category la object thuoc ve store.

Field dang dung:

- `id`
- `title`
- `name`
- `description`
- `imagePaths[]`
- `averageRating`
- `reviewCount`
- `items[]`

### categories[].items[]

Frontend dang xem day la menu item theo cua hang.

Field dang dung:

- `id`
- `name`
- `description`
- `note`
- `price`
- `priceDisplay`
- `averageRating`
- `reviewCount`
- `orderCount`
- `favoriteCount`
- `stock`
- `available`
- `disabled`
- `schedulable`
- `franchiseRequired`
- `franchiseNote`
- `imagePaths[]`
- `categoryId`
- `highlightSummary`
- `highlightTags[]`

### events[]

Frontend dang xem event la con cua store.

Field dang dung:

- `id`
- `storeId`
- `storeSlug`
- `storeName`
- `name`
- `title`
- `summary`
- `description`
- `location`
- `scheduleText`
- `imagePaths[]`
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
- `featuredDishes[]`
- `reviews[]`
- `store`

### reviews[]

Public review shape:

- `id`
- `userId`
- `userName`
- `userEmail`
- `targetType`
- `targetId`
- `targetSlug`
- `targetLabel`
- `targetImagePaths[]`
- `rating`
- `title`
- `comment`
- `createdAt`
- `updatedAt`

### Relation backend bat buoc

- category thuoc store
- category.items la menu item theo store
- event thuoc store
- review cua store detail phai map dung toi store
- neu frontend can filter review theo store context, store detail phai tra du categories + items + events

## Dish

### Dish list

### Endpoint

- `GET /api/public/dishes`

### Field frontend dang dung

- `id`
- `name`
- `description`
- `note`
- `price`
- `priceDisplay`
- `categoryId`
- `categoryName`
- `status`
- `franchiseRequired`
- `franchiseNote`
- `imagePaths[]`
- `highlightSummary`
- `highlightTags[]`
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

### bestStore relation

Frontend dang phu thuoc rat manh vao `bestStore`.

Field dang dung:

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
- `available`
- `disabled`
- `schedulable`
- `price`
- `imagePaths[]`

### Backend relation bat buoc

- dish list can co `bestStore` neu muon quick add va CTA "View store"
- `categoryId` + `categoryName` dang duoc dung de filter menu

### Dish detail

### Endpoint

- `GET /api/public/dishes/{dishId}`

### Response root frontend dang dung

- `dish`
- `category`
- `stats`
- `stores[]`
- `reviews[]`
- `relatedDishes[]`

### category

- `id`
- `title`
- `name`

### stats

- `averageRating`
- `reviewCount`
- `orderCount`
- `favoriteCount`
- `totalStock`

### stores[]

Frontend dang coi day la relation store-specific offer cua mon.

Field dang dung:

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
- `imagePaths[]`

### reviews[]

- dung review shape chung

### relatedDishes[]

- dung dish base shape

### Backend relation bat buoc

- `stores[]` la relation quan trong nhat cua dish detail
- frontend cho chon store cu the bang `storeId`
- quick add cua related dish se fetch lai dish detail va chon store phu hop trong `stores[]`

## Event

### Endpoint

- `GET /api/public/events`

### Field frontend dang dung

- `id`
- `storeId`
- `storeSlug`
- `storeName`
- `name`
- `title`
- `summary`
- `description`
- `location`
- `scheduleText`
- `imagePaths[]`
- `highlightSummary`
- `highlightTags[]`
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
- `featuredDishes[]`
- `reviews[]`
- `store`

### featuredDishes[]

Field dang dung:

- `id`
- `name`

### store relation

Frontend dang dung ca root-level va nested:

- `event.storeId`
- `event.storeSlug`
- `event.storeName`
- `event.store.id`
- `event.store.slug`
- `event.store.storeSlug`
- `event.store.name`
- `event.store.disabled`
- `event.store.open`

### Review relation cua event

Frontend co 2 cach:

- goi `GET /api/public/reviews?targetType=EVENT&targetId={id}`
- neu event object co san `reviews[]` thi dung lam fallback hien thi

### Backend relation bat buoc

- event phai thuoc 1 store
- featured dish phai tro dung dish id
- neu muon quick add tu event, frontend can `event.store.id` hoac `event.storeId`

## News

### News list

### Endpoint

- `GET /api/public/news`

### Field frontend dang dung

- `id`
- `slug`
- `title`
- `summary`
- `content`
- `relatedStoreId`
- `relatedStoreSlug`
- `relatedStoreName`
- `tags[]`
- `imagePaths[]`
- `featured`
- `published`
- `publishedAt`
- `createdAt`
- `updatedAt`

### News detail

### Endpoint

- `GET /api/public/news/{newsKey}`

### Backend relation bat buoc

- `slug` la key quan trong de mo detail page
- neu news co lien ket store, backend nen tra:
  - `relatedStoreId`
  - `relatedStoreSlug`
  - `relatedStoreName`

## Public review

### Endpoint

- `GET /api/public/reviews`

### Field frontend dang dung

- `id`
- `userId`
- `userName`
- `userEmail`
- `targetType`
- `targetId`
- `targetSlug`
- `targetLabel`
- `targetImagePaths[]`
- `rating`
- `title`
- `comment`
- `createdAt`
- `updatedAt`

### Relation backend bat buoc

- neu target la store, nen co `targetSlug`
- frontend ReviewsPage scope review theo store context bang cach:
  - `STORE`: `review.targetId === store.id`
  - `DISH`: `review.targetId` nam trong tap item ids cua store detail
  - `CATEGORY`: `review.targetId` nam trong tap category ids cua store detail
  - `EVENT`: `review.targetId` nam trong tap event ids cua store detail

He qua:

- store detail phai tra categories + category.items + events day du neu muon filter review theo store dung

## User domain

## Favorites

### Endpoint

- `GET /api/user/favorites`
- `POST /api/user/favorites`
- `DELETE /api/user/favorites`

### Field frontend dang dung

- `id`
- `targetType`
- `targetId`
- `targetSlug`
- `targetLabel`
- `targetImagePaths[]`
- `purchased`
- `createdAt`

### Relation backend bat buoc

- store favorite nen co `targetSlug`
- event favorite hien tai link chung toi `/events`, chua mo detail event
- purchased dish filter phu thuoc `purchased = true`

## User reviews

### Endpoint

- `GET /api/user/reviews`
- `POST /api/user/reviews`
- `PUT /api/user/reviews/{id}`
- `DELETE /api/user/reviews/{id}`

### Field frontend dang dung

- dung review shape chung
- them `approved`

### Luu y quan trong

Frontend hien tai co form review cho:

- `STORE`
- `DISH`
- `EVENT`
- `CATEGORY`

Do do backend can quyet dinh ro:

- ho tro `CATEGORY`
- hoac frontend phai bo form review category

Hien tai code frontend dang su dung `CATEGORY` that su o store detail.

## Feedback

### Endpoint

- `GET /api/user/feedbacks`
- `GET /api/user/feedbacks/{id}`
- `POST /api/user/feedbacks`
- `DELETE /api/user/feedbacks/{id}`

### Field frontend dang dung

- `id`
- `userId`
- `userName`
- `userEmail`
- `category`
- `relatedStoreId`
- `relatedStoreSlug`
- `relatedStoreName`
- `relatedStoreAddress`
- `subject`
- `message`
- `replyMessage`
- `repliedAt`
- `repliedByUserId`
- `repliedByUserName`
- `repliedByUserRole`
- `createdAt`
- `updatedAt`

### Relation backend bat buoc

- feedback phai thuoc 1 related store
- neu muon link store dung thi nen co `relatedStoreSlug`

## Delivery addresses

### Endpoint

- `GET /api/user/delivery-addresses`
- `GET /api/user/delivery-addresses/{id}`
- `POST /api/user/delivery-addresses`
- `PUT /api/user/delivery-addresses/{id}`
- `PUT /api/user/delivery-addresses/{id}/primary`
- `DELETE /api/user/delivery-addresses/{id}`

### Field frontend dang dung

- `id`
- `userId`
- `fullName`
- `phoneNumber`
- `deliveryAddress`
- `primary`
- `verifiedAt`
- `lastUsedAt`
- `createdAt`
- `updatedAt`

### Relation backend bat buoc

- address thuoc user
- frontend sort uu tien `primary`, sau do `lastUsedAt`, `verifiedAt`, `updatedAt`

## Cart

### Endpoint

- `GET /api/user/cart`
- `POST /api/user/cart/items`
- `PUT /api/user/cart/items/{id}`
- `DELETE /api/user/cart/items/{id}`
- `DELETE /api/user/cart`
- `POST /api/user/cart/checkout`

### Cart root frontend dang dung

- `id`
- `userId`
- `status`
- `items[]`
- `totalItems`
- `subtotal`
- `createdAt`
- `updatedAt`

### Cart item frontend dang dung

- `id`
- `storeId`
- `storeSlug`
- `storeName`
- `dishId`
- `dishName`
- `quantity`
- `unitPrice`
- `totalPrice`
- `imagePaths[]`
- `stock`
- `available`
- `disabled`
- `schedulable`
- `createdAt`
- `updatedAt`

### Relation backend bat buoc

- cart item phai tro duoc den store va dish
- `storeSlug` duoc dung de link sang store page
- `dishId` duoc dung de link sang dish detail
- guest cart merge vao server dung `(storeId, dishId, quantity)`

## Orders va checkout

### Endpoint

- `GET /api/user/orders`
- `GET /api/user/orders/{id}`
- `POST /api/user/orders/{id}/refresh-payment`
- `POST /api/user/cart/checkout`

### Order root frontend dang dung

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
- `promotionDishIds[]`
- `deliveryType`
- `scheduledDeliveryAt`
- `preparingStaffId`
- `preparingStaffName`
- `deliveringShipperId`
- `deliveringShipperName`
- `statusSummary`
- `deliveryFullName`
- `deliveryPhoneNumber`
- `deliveryAddress`
- `items[]`
- `orders[]`
- `createdAt`
- `updatedAt`

### Order item frontend dang dung

- `id`
- `storeId`
- `storeSlug`
- `storeName`
- `dishId`
- `dishName`
- `quantity`
- `unitPrice`
- `totalPrice`
- `imagePaths[]`
- `createdAt`
- `updatedAt`

### Relation backend bat buoc

- item phai tro duoc den dish va store
- neu checkout tach thanh nhieu don, frontend hien dang doc `orders[]`
- CartPage lay order dau tien trong `orders[]` de dieu huong
- OrdersPage hien `preparingStaffName`, `deliveringShipperName`, `statusSummary`
- Payment pages phu thuoc `paymentCheckoutUrl`, `paymentExpiresAt`, `paymentStatus`

## Notifications

### Endpoint

- `GET /api/user/notifications`
- `GET /api/user/notifications/unread-count`
- `PUT /api/user/notifications/{id}/read`
- `PUT /api/user/notifications/{id}/unread`
- `PUT /api/user/notifications/read-all`

### Field frontend dang dung

- `id`
- `type`
- `title`
- `message`
- `read`
- `readAt`
- `createdAt`
- `updatedAt`
- `orderId`
- `eventId`
- `eventSlug`
- `newsId`
- `newsKey`
- `newsSlug`
- `actionUrl`
- `metadata`

### Contract backend nen chuan hoa

Khong nen bat frontend suy tu tieu de.
Moi notification can co target explicit:

- order notification:
  - `type = ORDER_STATUS`
  - `orderId`
  - khuyen nghi them `actionUrl = /orders/{id}`
- news notification:
  - `type` co chua `NEWS`
  - `newsSlug` hoac `newsKey`
  - khuyen nghi them `actionUrl = /news/{slug}`
- event/brand notification:
  - `eventId` hoac `eventSlug`
  - hoac `actionUrl`

## Admin domain

## Summary va dashboard

### Endpoint

- `GET /api/admin/summary`
- `GET /api/admin/dashboard`

### Field frontend dang doc

#### summary

- `userCount`
- `storeCount`
- `eventCount`
- `categoryCount`
- `dishCount`
- `storeDishCount`
- `newsCount`
- `promotionCount`
- `orderCount`
- `reviewCount`

#### dashboard

Frontend hien tai chap nhan:

- array
- paged object
- hoac so dem truc tiep

Nhung backend nen tra on dinh mot object tong hop.

## Users

### Endpoint

- `GET /api/admin/users`
- `GET /api/admin/users/{id}`
- `POST /api/admin/users`
- `PUT /api/admin/users/{id}`
- `DELETE /api/admin/users/{id}`

### Field frontend dang dung

- `id`
- `fullName`
- `email`
- `role`
- `workingStoreId`
- `verified`

### Relation backend bat buoc

- `workingStoreId` bat buoc cho `MANAGER`, `STAFF`, `SHIPPER`
- admin page scope user theo `workingStoreId`

## Stores

### Endpoint

- CRUD `/api/admin/stores`

### Field frontend dang dung

- `id`
- `slug`
- `name`
- `description`
- `address`
- `contactEmail`
- `phoneNumber`
- `area`
- `positionLabel`
- `hoursText`
- `openTime`
- `closeTime`
- `latitude`
- `longitude`
- `personality`
- `designSignature`
- `franchiseMood`
- `specialty`
- `highlightSummary`
- `highlightTags[]`
- `serviceTags[]`
- `imagePaths[]`
- `active`

### Relation backend bat buoc

- store la parent cua event, category, store_dish
- news co the map den store qua `relatedStoreId`

## Events

### Endpoint

- CRUD `/api/admin/events`

### Field frontend dang dung

- `id`
- `storeId`
- `name`
- `title`
- `description`
- `summary`
- `location`
- `scheduleText`
- `highlightSummary`
- `highlightTags[]`
- `capacity`
- `bookedCount`
- `featuredDishIds[]`
- `imagePaths[]`
- `startsAt`
- `endsAt`
- `active`

### Relation backend bat buoc

- event phai thuoc 1 store qua `storeId`
- `featuredDishIds[]` phai tro sang dish

## Categories

### Endpoint

- CRUD `/api/admin/categories`

### Field frontend dang dung

- `id`
- `storeId`
- `name`
- `description`
- `imagePaths[]`
- `sortOrder`
- `active`

### Relation backend bat buoc

- category phai thuoc 1 store qua `storeId`

## Dishes

### Endpoint

- CRUD `/api/admin/dishes`

### Field frontend dang dung

- `id`
- `name`
- `description`
- `note`
- `price`
- `franchiseRequired`
- `franchiseNote`
- `categoryId`
- `highlightSummary`
- `highlightTags[]`
- `imagePaths[]`
- `active`

### Luu y quan trong ve model

Code frontend dang ghi:

- dish la mon cap thuong hieu
- stock, availability, price override nam o `store_dishes`

Nhung cung dong thoi:

- dish van co `categoryId`
- admin page scope dish theo `dish.storeId`, neu khong co thi fallback qua `category.storeId`

Day la diem mo ho. Backend can chot 1 trong 2 huong:

1. Dish brand-level that su:
   - thi category cung phai la brand-level
   - khong nen de category phu thuoc store
2. Dish van thuoc category cua store:
   - thi dish khong con hoan toan brand-level

Neu giu frontend nhu hien tai, backend phai tra du de admin scope dung:

- `dish.storeId`
- hoac `dish.categoryId` ma category do co `storeId`

## Store dishes

### Endpoint

- CRUD `/api/admin/store-dishes`

### Field frontend dang dung

- `id`
- `storeId`
- `dishId`
- `quantity`
- `available`
- `priceOverride`

### Relation backend bat buoc

- unique theo `(storeId, dishId)`
- day la source of truth cho:
  - stock
  - availability
  - price override

## News admin

### Endpoint

- CRUD `/api/admin/news`

### Field frontend dang dung

- `id`
- `title`
- `slug`
- `summary`
- `content`
- `relatedStoreId`
- `tags[]`
- `imagePaths[]`
- `featured`
- `published`
- `publishedAt`

### Relation backend bat buoc

- `relatedStoreId` map news toi store
- public detail page dung `slug`, admin CRUD dung `id`

## Promotions

### Endpoint

- CRUD `/api/admin/promotions`

### Field frontend dang dung

- `id`
- `code`
- `name`
- `description`
- `scope`
- `discountType`
- `discountValue`
- `minimumOrderAmount`
- `maximumDiscountAmount`
- `usageLimit`
- `usedCount`
- `startsAt`
- `endsAt`
- `active`
- `promotionDishIds[]`

### Relation backend bat buoc

- neu `scope = DISH` thi `promotionDishIds[]` phai tro sang dish ids

## Admin orders

### Endpoint

- `GET /api/admin/orders`
- `GET /api/admin/orders/{id}`
- `PUT /api/admin/orders/{id}/status`

### Field frontend dang dung

- order shape gan giong user order
- them scope/filter theo:
  - `status`
  - `paymentStatus`
  - `stage`
  - `storeId`
  - `page`
  - `size`
  - `search`

### Relation backend bat buoc

- order phai co `storeId` hoac toi thieu `items[].storeId`
- assign staff:
  - `preparingStaffId`
  - `deliveringShipperId`
- frontend hien:
  - `statusSummary`
  - `preparingStaffName`
  - `deliveringShipperName`

### Scope logic trong admin page

Frontend chi gui `storeId` len backend cho section `orders`.
Moi section admin khac deu dang scope client-side dua tren relation tra ve.

He qua:

- neu relation trong event/category/dish/news/review/feedback sai thi scope trong admin se sai

## Admin reviews

### Endpoint

- `GET /api/admin/reviews`
- `GET /api/admin/reviews/{id}`
- `DELETE /api/admin/reviews/{id}`

### Field frontend dang dung

- `id`
- `userId`
- `userName`
- `userEmail`
- `targetType`
- `targetId`
- `targetLabel`
- `targetImagePaths[]`
- `rating`
- `title`
- `comment`
- `approved`
- `createdAt`
- `updatedAt`

### Relation backend bat buoc

Admin page scope review theo store nhu sau:

- `STORE` -> `review.targetId`
- `EVENT` -> `event.storeId`
- `CATEGORY` -> `category.storeId`
- `DISH` -> `dish.storeId`, neu khong co thi fallback `category.storeId`

Backend can dam bao:

- `event.storeId` dung
- `category.storeId` dung
- `dish.storeId` dung hoac model dish/category phai du ro de suy ra

## Admin feedbacks

### Endpoint

- `GET /api/admin/feedbacks`
- `GET /api/admin/feedbacks/{id}`
- `DELETE /api/admin/feedbacks/{id}`
- `PUT /api/admin/feedbacks/{id}/reply`
- `DELETE /api/admin/feedbacks/{id}/reply`

### Field frontend dang dung

- dung feedback shape chung

### Relation backend bat buoc

- `relatedStoreId` la field quan trong nhat de scope theo store

## Ma tran relation backend can chot ro

- `User` -> `workingStoreId` -> `Store`
- `Store` -> `Event[]`
- `Store` -> `Category[]`
- `Store` -> `StoreDish[]`
- `News` -> `relatedStoreId` -> `Store`
- `Event` -> `storeId` -> `Store`
- `Event` -> `featuredDishIds[]` -> `Dish[]`
- `Category` -> `storeId` -> `Store`
- `Category` -> `items[]` (public store detail)
- `Dish` -> `categoryId`
- `StoreDish` -> `storeId + dishId`
- `Favorite` -> `(targetType, targetId)`
- `Review` -> `(targetType, targetId)`
- `Feedback` -> `relatedStoreId`
- `CartItem` -> `storeId + dishId`
- `Order` -> `storeId` hoac `items[].storeId`
- `OrderItem` -> `dishId`, `storeId`
- `Order` -> `preparingStaffId` -> `User`
- `Order` -> `deliveringShipperId` -> `User`
- `Notification` -> `orderId` hoac `newsSlug/newsKey` hoac `actionUrl`

## Cac mismatch dang ton tai giua code frontend va note API cu

### 1. CATEGORY review

Note API cu noi user review chi support:

- `STORE`
- `DISH`
- `EVENT`

Nhung frontend hien tai co review form cho `CATEGORY` o store detail.

Backend can chot:

- ho tro `CATEGORY`
- hoac yeu cau frontend bo luong nay

### 2. Manager admin capability

Note API cu noi manager vao admin page de xem:

- orders
- reviews

Nhung code frontend hien tai chi mo tab `reviews` cho manager.

Backend can chot lai voi frontend:

- manager co xem orders hay khong
- neu co thi frontend phai mo lai tab orders

### 3. Dish brand-level vs category store-scoped

Code admin dang mo ho giua:

- dish la brand-level
- category lai thuoc store
- dish lai can `categoryId`

Backend can chot model chinh thuc.

### 4. Notification target contract

Notification hien tai nen tra relation explicit, khong nen de frontend suy tu title/message.

### 5. Store slug contract

Frontend nhieu noi uu tien `slug`.
Backend can tra `slug/storeSlug` nhat quan o moi object co relation toi store.

## Danh sach field relation nen xuat hien on dinh trong response

### Moi object co store relation nen co

- `storeId`
- `storeSlug`
- `storeName`

### Moi object co target store/page nen co

- `targetId`
- `targetSlug`
- `targetLabel`

### News notification nen co

- `newsSlug` hoac `newsKey`
- hoac `actionUrl`

### Order notification nen co

- `orderId`
- hoac `actionUrl`

## Thu tu backend nen sua

1. Chot model `Store`, `Category`, `Dish`, `StoreDish`
2. Chot support hay khong support `CATEGORY` review
3. Tra `slug/storeSlug` nhat quan o toan bo object co relation toi store
4. Chot contract `News` detail theo `slug`
5. Tra notification target explicit (`orderId`, `newsSlug`, `actionUrl`)
6. Chot quyen va dataset manager trong admin
7. Bao dam admin scope client-side doc duoc relation dung:
   - `event.storeId`
   - `category.storeId`
   - `dish.storeId` hoac relation thay the ro rang
   - `news.relatedStoreId`
   - `feedback.relatedStoreId`

## Ket luan ngan

Frontend hien tai khong chi can endpoint ton tai, ma can relation on dinh de:

- build route dung
- filter dung theo store
- quick add vao cart dung store
- mo dung order/news/store
- scope admin dung theo store

Neu backend chot duoc 4 truc chinh sau, phan lon UI se on dinh:

- slug contract
- store relation contract
- target relation contract
- order / notification target contract
