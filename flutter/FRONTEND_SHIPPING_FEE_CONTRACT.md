# Frontend Shipping Fee Contract

Updated on 2026-04-12.

Purpose: define one shared shipping fee contract for backend, web frontend, and mobile frontend.

This note is intentionally practical:
- backend is the final source of truth for money values
- web and mobile can still compute a local estimate for fast UX
- all final totals used for checkout and PayOS must come from backend response fields

## Scope

Endpoints covered by this contract:
- `GET /api/user/delivery-addresses`
- `GET /api/user/delivery-addresses/{id}`
- `GET /api/user/delivery-addresses/primary`
- `GET /api/user/cart`
- `POST /api/user/cart/checkout-preview`
- `POST /api/user/cart/checkout`
- `GET /api/user/orders/{id}`

## Shared Business Rules

- Shipping fee applies to delivery orders.
- For current frontend flows, treat both `DELIVERY` and `SCHEDULED` as delivery orders with shipping fee.
- If a future `PICKUP` flow is introduced, shipping fee must be `0`.
- Formula: `shippingFeeAmount = round(distanceKm * 4000)`
- Unit: VND
- Distance unit: kilometers
- Distance algorithm for both backend and frontend estimate: haversine using store coordinates and delivery address coordinates
- Backend is the final source of truth for:
  - `shippingFeeAmount`
  - `shippingDistanceKm`
  - `shippingFeeBreakdown`
  - `totalAmount`
- Multi-store checkout rule:
  - compute shipping per store order
  - total shipping fee is the sum of all store-level shipping fees
  - total shipping distance is the sum of all store-level distances

## Required Coordinate Fields

Frontend can only estimate shipping if both address and store coordinates are available.

### Delivery Address Response

All delivery address APIs should return:

```json
{
  "id": 12,
  "fullName": "Nguyen Van A",
  "phoneNumber": "0901234567",
  "deliveryAddress": "12 Nguyen Hue, District 1, Ho Chi Minh City",
  "latitude": 10.776889,
  "longitude": 106.700806,
  "primary": true
}
```

Required fields for shipping estimate:
- `latitude`
- `longitude`

If backend cannot geocode an address yet:
- return `latitude: null`
- return `longitude: null`
- frontend should show: `Shipping fee will be finalized after address coordinates are available.`

### Cart Response Store Coordinates

`GET /api/user/cart` should expose store coordinates in each line item or in grouped store metadata.

Minimum line-item shape:

```json
{
  "id": 501,
  "storeId": 1,
  "storeName": "Tea Matcha Q1",
  "storeLatitude": 10.78102,
  "storeLongitude": 106.69834,
  "dishId": 88,
  "dishName": "Matcha Latte",
  "quantity": 2,
  "unitPrice": 60000,
  "totalPrice": 120000
}
```

Required fields for shipping estimate:
- `storeId`
- `storeLatitude`
- `storeLongitude`

## Shared Shipping Types

### `shippingFeeBreakdownItem`

```json
{
  "storeId": 1,
  "storeName": "Tea Matcha Q1",
  "distanceKm": 3.124,
  "shippingFeeAmount": 12496
}
```

Rules:
- `distanceKm` is raw haversine distance in km
- backend may keep 3 decimal places
- `shippingFeeAmount` is integer VND after applying `round(distanceKm * 4000)`

### `shippingSummary`

```json
{
  "shippingDistanceKm": 3.124,
  "shippingFeeAmount": 12496,
  "shippingFeeBreakdown": [
    {
      "storeId": 1,
      "storeName": "Tea Matcha Q1",
      "distanceKm": 3.124,
      "shippingFeeAmount": 12496
    }
  ]
}
```

## Recommended Preview Endpoint

To keep web and mobile consistent, backend should expose:
- `POST /api/user/cart/checkout-preview`

Purpose:
- preview shipping fee
- preview promotion effect
- preview final payable total before checkout

### Request Body

Use the same core fields as checkout:

```json
{
  "deliveryAddressId": 12,
  "promotionCode": "MATCHA10",
  "deliveryType": "DELIVERY",
  "scheduledDeliveryAt": null
}
```

Notes:
- `deliveryAddressId`: required for delivery fee preview
- `promotionCode`: optional
- `deliveryType`: required
- `scheduledDeliveryAt`: required only when `deliveryType = "SCHEDULED"`

### Response Body

```json
{
  "subtotalAmount": 120000,
  "discountAmount": 10000,
  "shippingDistanceKm": 3.124,
  "shippingFeeAmount": 12496,
  "shippingFeeBreakdown": [
    {
      "storeId": 1,
      "storeName": "Tea Matcha Q1",
      "distanceKm": 3.124,
      "shippingFeeAmount": 12496
    }
  ],
  "totalAmount": 122496,
  "promotionCode": "MATCHA10",
  "statusSummary": "Preview ready"
}
```

## Checkout Contract

### Request Body For `POST /api/user/cart/checkout`

```json
{
  "deliveryAddressId": 12,
  "promotionCode": "MATCHA10",
  "deliveryType": "DELIVERY",
  "scheduledDeliveryAt": null,
  "returnUrl": "https://frontend.example.com/payment/success",
  "cancelUrl": "https://frontend.example.com/payment/cancel"
}
```

### Response Body

```json
{
  "id": 101,
  "status": "PENDING",
  "paymentStatus": "PENDING",
  "paymentProvider": "PAYOS",
  "paymentReference": "plink-123",
  "paymentCheckoutUrl": "https://pay.payos.vn/web/...",
  "paymentQrCode": "000201...",
  "paymentExpiresAt": "2026-04-12T10:30:00Z",
  "subtotalAmount": 120000,
  "discountAmount": 10000,
  "shippingDistanceKm": 3.124,
  "shippingFeeAmount": 12496,
  "shippingFeeBreakdown": [
    {
      "storeId": 1,
      "storeName": "Tea Matcha Q1",
      "distanceKm": 3.124,
      "shippingFeeAmount": 12496
    }
  ],
  "totalAmount": 122496,
  "promotionCode": "MATCHA10",
  "statusSummary": "Waiting for payment",
  "orders": [
    {
      "id": 201,
      "storeId": 1,
      "storeName": "Tea Matcha Q1",
      "promotionCode": "MATCHA10",
      "promotionEligibleAmount": 100000,
      "shippingDistanceKm": 3.124,
      "shippingFeeAmount": 12496
    }
  ]
}
```

Rules:
- `totalAmount = subtotalAmount - discountAmount + shippingFeeAmount`
- `shippingFeeAmount` in checkout response is the only value frontend should trust for final payment UI
- if backend recalculates a different fee than frontend estimate, frontend must replace the estimate immediately with backend values

## Order Detail Contract

`GET /api/user/orders/{id}` should return the same shipping fields so user can leave checkout and still see the final shipping fee later.

### Response Body

```json
{
  "id": 201,
  "storeId": 1,
  "storeName": "Tea Matcha Q1",
  "status": "CONFIRMED",
  "paymentStatus": "PENDING",
  "paymentProvider": "PAYOS",
  "paymentReference": "plink-123",
  "paymentCheckoutUrl": "https://pay.payos.vn/web/...",
  "paymentQrCode": "000201...",
  "paymentExpiresAt": "2026-04-12T10:30:00Z",
  "subtotalAmount": 120000,
  "discountAmount": 10000,
  "shippingDistanceKm": 3.124,
  "shippingFeeAmount": 12496,
  "shippingFeeBreakdown": [
    {
      "storeId": 1,
      "storeName": "Tea Matcha Q1",
      "distanceKm": 3.124,
      "shippingFeeAmount": 12496
    }
  ],
  "totalAmount": 122496,
  "promotionCode": "MATCHA10",
  "promotionScope": "ORDER",
  "promotionEligibleAmount": 100000,
  "statusSummary": "Waiting for payment",
  "items": []
}
```

## Frontend Responsibilities

### Web Frontend

- When user changes delivery address:
  - update local shipping estimate if coordinates are available
  - call `checkout-preview` if backend supports it
- During checkout:
  - send `deliveryAddressId`, `promotionCode`, `deliveryType`, `scheduledDeliveryAt`
  - render backend `shippingFeeAmount` and backend `totalAmount`
- On order detail:
  - show `shippingFeeAmount`
  - optionally show breakdown by store

### Mobile Frontend

Use exactly the same fields as web:
- same request body for preview and checkout
- same response fields for:
  - `shippingDistanceKm`
  - `shippingFeeAmount`
  - `shippingFeeBreakdown`
  - `totalAmount`

Mobile should not introduce a second shipping formula.

## Recommended UI Labels

- `Shipping fee`
- `Shipping distance`
- `Estimated shipping fee` for local frontend-only preview
- `Final shipping fee` is not needed if backend response is already loaded

## Error Messages Backend Should Return Clearly

Recommended backend messages:
- `Delivery address is missing coordinates`
- `Store coordinates are missing for shipping calculation`
- `Shipping fee could not be calculated for this address`
- `Selected address is outside the delivery area`

Frontend should show these messages directly when returned by backend.

## Fallback Behavior If Preview API Is Not Ready Yet

If `POST /api/user/cart/checkout-preview` is not implemented yet:
- web and mobile may calculate a local estimate from coordinates
- UI should label it as estimated
- checkout screen must replace that estimate with backend values from `POST /api/user/cart/checkout`

## Final Recommendation

The minimum backend payload needed to unblock both web and mobile is:
- delivery address coordinates in address APIs
- store coordinates in cart response
- `shippingFeeAmount` in checkout response
- `shippingFeeAmount` in order detail response

The recommended complete contract is:
- add `checkout-preview`
- add `shippingDistanceKm`
- add `shippingFeeBreakdown`
- keep backend as final pricing authority
