# Tea Matcha Phase 2 APIs

## Auth

- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/password/request-otp`
- `POST /api/auth/password/reset`

## User cart and checkout

- `GET /api/user/cart`
- `POST /api/user/cart/items`
- `PUT /api/user/cart/items/{id}`
- `DELETE /api/user/cart/items/{id}`
- `DELETE /api/user/cart`
- `POST /api/user/cart/checkout`

### Body add/update cart item

```json
{
  "storeId": 1,
  "dishId": 10,
  "quantity": 2
}
```

### Cart item bo sung

- `available`: giao ngay duoc ngay luc nay
- `disabled`: dang bi khoa cho giao ngay
- `schedulable`: van co the dua vao don hen gio

### Body checkout

```json
{
  "deliveryAddressId": 1,
  "promotionCode": "MATCHA10",
  "deliveryType": "SCHEDULED",
  "scheduledDeliveryAt": "2026-03-21T12:30:00Z",
  "returnUrl": "http://localhost:5173/payment/success",
  "cancelUrl": "http://localhost:5173/payment/cancel"
}
```

### Rules

- Chi role `USER` moi duoc checkout.
- Gio hang khong duoc rong.
- Tung item phai validate theo `store_dishes`.
- `deliveryType`:
  - `IMMEDIATE` mac dinh
  - `SCHEDULED`
- `scheduledDeliveryAt` bat buoc khi `deliveryType = SCHEDULED`.
- User van co the them mon vao gio hang khi cua hang dang dong, mien la mon do:
  - con stock
  - `store_dishes.available = true`
  - `dish/category/store` van active
- Khi checkout:
  - `IMMEDIATE`: moi cua hang trong don phai dang mo ngay luc checkout
  - `SCHEDULED`: `scheduledDeliveryAt` phai nam trong gio hoat dong cua moi cua hang trong don
- Sau khi tao payment link, backend gui email nhac thanh toan cho khach.
- Sau khi payment chuyen sang `PAID`, backend gui email cam on va nhac khach theo doi trang thai don hang.
- Checkout se tru `store_dishes.quantity`.
- Neu so luong con lai bang `0`, backend dat them `available = false`.

### Checkout response

```json
{
  "id": 1001,
  "userId": 5,
  "status": "PENDING",
  "paymentStatus": "PENDING",
  "paymentProvider": "PAYOS",
  "totalAmount": 136000,
  "deliveryType": "SCHEDULED",
  "scheduledDeliveryAt": "2026-03-21T12:30:00Z",
  "items": [
    {
      "id": 501,
      "storeId": 1,
      "storeName": "Downtown Matcha House",
      "dishId": 10,
      "dishName": "Iced Matcha Latte",
      "quantity": 2,
      "unitPrice": 68000,
      "totalPrice": 136000,
      "imagePaths": [
        "/uploads/dishes/iced-matcha-latte.jpg"
      ],
      "createdAt": "2026-03-20T00:00:00Z",
      "updatedAt": "2026-03-20T00:00:00Z"
    }
  ],
  "createdAt": "2026-03-20T00:00:00Z",
  "updatedAt": "2026-03-20T00:00:00Z"
}
```

## User delivery addresses

- `GET /api/user/delivery-addresses`
- `GET /api/user/delivery-addresses/{id}`
- `POST /api/user/delivery-addresses`
- `PUT /api/user/delivery-addresses/{id}`
- `PUT /api/user/delivery-addresses/{id}/primary`
- `DELETE /api/user/delivery-addresses/{id}`

### Body create/update delivery address

```json
{
  "fullName": "Nguyen Van A",
  "phoneNumber": "0909123456",
  "deliveryAddress": "12 Nguyen Trai, District 1",
  "primary": true
}
```

### Notes

- `primary` la optional trong request.
- `verifiedAt` duoc backend tu set sau khi dia chi nay duoc dung cho mot don thanh toan thanh cong.
- `lastUsedAt` duoc backend tu set luc checkout.
- List address duoc sort uu tien `primary`, sau do toi dia chi duoc dung/xac minh gan nhat.

## User orders

- `GET /api/user/orders`
- `GET /api/user/orders/{id}`
- `POST /api/user/orders/{id}/refresh-payment`

### Query

- `page`
- `size`

### Order status

- `PENDING`
- `CONFIRMED`
- `PREPARING`
- `READY_FOR_SHIPPER`
- `OUT_FOR_DELIVERY`
- `COMPLETED`
- `CANCELLED`

### Order response bo sung

- `preparingStaffId`
- `preparingStaffName`
- `deliveringShipperId`
- `deliveringShipperName`
- `statusSummary`

## User reviews

- `GET /api/user/reviews`
- `GET /api/user/reviews/me`
- `GET /api/reviews/mine`
- `POST /api/user/reviews`
- `POST /api/reviews`
- `PUT /api/user/reviews/{id}`
- `PUT /api/reviews/{id}`
- `DELETE /api/user/reviews/{id}`
- `DELETE /api/reviews/{id}`

### Body review

```json
{
  "targetType": "STORE",
  "targetId": 1,
  "rating": 5,
  "title": "Great service",
  "comment": "Fast and friendly"
}
```

### Rules

- Frontend nen goi `GET /api/user/reviews?page=0&size=10`.
- Backend tu lay user tu token, frontend khong truyen `userId`.
- Chi role `USER` moi duoc tao, sua, xoa review.
- User review chi support:
  - `STORE`
  - `DISH`
  - `EVENT`
- `CATEGORY` bi tu choi.
- Moi `userId + targetType + targetId` chi duoc co 1 review.
- Review moi hoac review sua hien thi ngay sau khi backend chap nhan.
- User phai co lich su mua hang truoc khi review:
  - `STORE`: da co it nhat 1 order item tu cua hang do
  - `DISH`: da co it nhat 1 order item cua mon do
  - `EVENT`: da co it nhat 1 order item tu cua hang to chuc su kien

## Admin and manager review management

- `GET /api/admin/reviews`
- `GET /api/admin/reviews/{id}`
- `DELETE /api/admin/reviews/{id}`

### Access

- `ADMIN`: duoc xem va xoa
- `MANAGER`: duoc xem va xoa

## Admin order filters

- `GET /api/admin/orders`

### Query

- `status`
- `paymentStatus`
- `stage`
- `storeId`
- `page`
- `size`

### Stage rules

- `UNPAID`: `paymentStatus = PENDING | FAILED` va chua huy
- `PAID`: `paymentStatus = PAID` va `status = PENDING | CONFIRMED`
- `PREPARING`: `status = PREPARING | READY_FOR_SHIPPER`
- `DELIVERING`: `status = OUT_FOR_DELIVERY`
- `COMPLETED`: `status = COMPLETED`
- `CANCELLED`: `status = CANCELLED` hoac `paymentStatus = CANCELLED`

## User favorites

- `GET /api/user/favorites`
- `POST /api/user/favorites`
- `DELETE /api/user/favorites`

### Body create/delete

```json
{
  "targetType": "STORE | DISH | EVENT",
  "targetId": 1
}
```

## Public APIs

- `GET /api/public/home`
- `GET /api/public/stores`
- `GET /api/public/stores/{storeId}`
- `GET /api/public/dishes`
- `GET /api/public/dishes/{dishId}`
- `GET /api/public/events`
- `GET /api/public/reviews`

### `GET /api/public/stores`

Query:

- `search`
- `sort`: `rating_desc | rating_asc | distance_asc | name_asc`
- `minRating`
- `lat`
- `lng`
- `page`
- `size`

### `GET /api/public/stores/{storeId}`

Response:

- `store`
- `stats`
- `categories[]`
- `events[]`
- `reviews[]`

Category item co:

- `price`
- `priceDisplay`
- `averageRating`
- `reviewCount`
- `orderCount`
- `favoriteCount`
- `stock`
- `available`
- `disabled`

### `GET /api/public/dishes`

Query:

- `search`
- `sort`: `top_rated | most_reviewed | most_ordered | distance_asc | price_asc | price_desc`
- `minRating`
- `categoryId`
- `franchiseRequired`
- `lat`
- `lng`
- `page`
- `size`

Item response co:

- thong tin dish co ban
- `averageRating`
- `reviewCount`
- `orderCount`
- `favoriteCount`
- `bestStore`

### `GET /api/public/dishes/{dishId}`

Response:

- `dish`
- `category`
- `stats`
- `stores[]`
- `reviews[]`
- `relatedDishes[]`

`stores[]` co:

- `storeId`
- `storeName`
- `address`
- `area`
- `distanceKm`
- `storeOpen`
- `storeDisabled`
- `stock`
- `available`
- `disabled`
- `price`

### `GET /api/public/events`

Query:

- `search`
- `sort`: `date_desc | date_asc | rating_desc | rating_asc | distance_asc`
- `lat`
- `lng`
- `page`
- `size`

## Admin store_dishes

- `GET /api/admin/store-dishes`
- `GET /api/admin/store-dishes/{id}`
- `POST /api/admin/store-dishes`
- `PUT /api/admin/store-dishes/{id}`
- `DELETE /api/admin/store-dishes/{id}`

### Body

```json
{
  "storeId": 1,
  "dishId": 10,
  "quantity": 12,
  "available": true,
  "priceOverride": 68000
}
```

## Admin orders

- `GET /api/admin/orders`
- `GET /api/admin/orders/{id}`
- `PUT /api/admin/orders/{id}/status`

### Access

- `ADMIN`: xem toan bo don
- `MANAGER`: chi xem va cap nhat don co item thuoc cua hang cua minh

### Body update status

```json
{
  "status": "PREPARING",
  "preparingStaffId": 12,
  "deliveringShipperId": null
}
```

### Rules

- `preparingStaffId` phai la user role `STAFF`
- `deliveringShipperId` phai la user role `SHIPPER`
- user duoc assign phai thuoc cung cua hang trong don
- manager chi duoc assign nhan su thuoc chinh cua hang cua manager
- don phai `paymentStatus = PAID` truoc khi chuyen qua `PREPARING`, `OUT_FOR_DELIVERY`, `COMPLETED`
- Frontend co the dung `statusSummary` de hien thi:
  - `Khach chua thanh toan`
  - `Khach da thanh toan`
  - `Nhan vien <ten> dang lam mon`
  - `Da lam xong - cho shipper`
  - `<ten shipper> dang giao hang`
  - `<ten shipper> da giao hang thanh cong`

## Manager admin page note

- Static admin page tai `/admin.html` ho tro `Store Dishes`.
- Neu login role la `MANAGER`, frontend admin page mo cac khu `orders` va `reviews`.
- Khu `orders` chi hien don hang thuoc cua hang dang duoc gan qua `workingStoreId`.

## Common paging

- `page`
- `size`
- `search` neu endpoint co ho tro

```json
{
  "items": [],
  "page": 0,
  "size": 10,
  "totalItems": 42,
  "totalPages": 5,
  "hasNext": true,
  "hasPrevious": false
}
```

## Quan he du lieu Phase 2

- `dish` la mon goc cap thuong hieu
- `store_dishes` giu ton kho, availability, gia theo tung cua hang
- `favorite` support `STORE | DISH | EVENT`
- `review` phia user support `STORE | DISH | EVENT`

## Ghi chu map voi frontend

- Anh dau trong `imagePaths[]` la cover
- Cac anh sau la gallery
- `CartPage` checkout xong se tao don va dieu huong qua `OrdersPage`
- Admin page co tab `Mon theo cua hang`, `Khuyen mai`, `Don hang`, `Danh gia`

## Store slug support cho backend

### Van de hien tai

- Frontend da dung URL cua hang theo dang dep:
  - `/stores/downtown-matcha-house`
  - `/stores/airport`
- Neu backend public detail chi tim theo `id`, link nhu `/stores/airport` se khong mo duoc.
- Frontend hien dang co fallback tam:
  - goi `GET /api/public/stores/{storeKey}`
  - neu `404` va `storeKey` khong phai so, frontend moi goi tiep `GET /api/public/stores?page=0&size=100`
  - tim `slug` trong 100 cua hang dau
  - lay `id` roi goi lai detail
- Cach nay khong on dinh khi:
  - co hon `100` cua hang
  - cua hang nam o page sau
  - list endpoint co filter khac voi detail endpoint
  - slug ton tai nhung khong nam trong ket qua list dau tien

### Backend can ho tro

- Route public detail store nen ho tro ca `id` va `slug`:
  - `GET /api/public/stores/{storeKey}`
- Rule:
  - neu `storeKey` la so, tim theo `id`
  - neu `storeKey` khong phai so, tim theo `slug`

### Vi du

- `GET /api/public/stores/1`
- `GET /api/public/stores/airport`
- `GET /api/public/stores/downtown-matcha-house`

### Response detail store

- Response giu nguyen nhu hien tai, nhung `store` bat buoc co `slug`

```json
{
  "store": {
    "id": 7,
    "slug": "airport",
    "name": "Tea Matcha Airport",
    "description": "Cua hang gan san bay",
    "address": "Ga quoc noi, Tan Son Nhat",
    "area": "Tan Binh",
    "positionLabel": "Gan cong check-in",
    "hoursText": "Mo cua 06:00 - 22:00",
    "openTime": "06:00:00",
    "closeTime": "22:00:00",
    "imagePaths": [
      "/uploads/stores/airport-cover.jpg"
    ],
    "active": true
  },
  "stats": {},
  "categories": [],
  "events": [],
  "reviews": []
}
```

### Admin store

- `slug` da co trong payload store va can duoc xem la field chuan:
  - unique
  - not blank
  - uu tien kebab-case
- Vi du:
  - `airport`
  - `downtown-matcha-house`
  - `tea-matcha-thao-dien`

### Repository / service goi y

- Repository:
  - `findByIdAndActiveTrue(...)`
  - `findBySlugIgnoreCaseAndActiveTrue(...)`
  - neu admin can tim ca store inactive thi co the co them:
    - `findBySlugIgnoreCase(...)`
- Service:
  - viet 1 ham dung chung, vi du `findPublicStoreByKey(String storeKey)`
  - logic:
    - neu `storeKey` la numeric -> tim theo `id`
    - nguoc lai -> tim theo `slug`
  - neu khong thay -> throw `404`
- Controller:
  - giu route `GET /api/public/stores/{storeKey}`
  - khong can tach them route moi

### Cac response nen tra them slug

- De frontend tao link dep o moi noi, backend nen tra them `slug` hoac `storeSlug` tai cac API co thong tin cua hang:
  - `GET /api/public/home`
  - `GET /api/public/stores`
  - `GET /api/public/stores/{storeKey}`
  - `GET /api/public/dishes`
  - `GET /api/public/dishes/{id}` trong `stores[]`
  - `GET /api/public/events` trong `store`
  - `GET /api/user/orders`
  - `GET /api/user/orders/{id}`
  - `GET /api/public/reviews` neu review target la `STORE`
  - `POST /api/user/ai/chat` trong `suggestions` neu suggestion co `storeId`

### Contract goi y cho cac object co store

- Neu object da co:
  - `storeId`
  - `storeName`
- Nen them:
  - `storeSlug`

Vi du:

```json
{
  "storeId": 2,
  "storeSlug": "airport",
  "storeName": "Tea Matcha Airport"
}
```

### Rule validate slug

- `slug` unique toan he thong
- chi gom:
  - chu thuong `a-z`
  - so `0-9`
  - dau gach ngang `-`
- khong co khoang trang
- khong co ky tu dac biet
- nen auto-normalize khi tao/sua store:
  - lowercase
  - bo dau tieng Viet
  - space -> `-`
  - gom nhieu `-` lien tiep thanh 1

### Ket luan cho backend

- Frontend da san sang dung slug.
- De link nhu `http://localhost:5173/stores/airport` hoat dong on dinh, backend chi can sua 2 diem chinh:
  - public store detail doc duoc theo `slug`
  - cac response co store nen tra them `slug` hoac `storeSlug`
