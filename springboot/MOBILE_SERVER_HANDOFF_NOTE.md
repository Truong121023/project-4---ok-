# Mobile Server Handoff Note

Updated on 2026-04-04.

Purpose: this file is the current backend and infra handoff for the mobile app after the latest server fixes.

This note focuses on:
- what backend already supports today
- what mobile should call now
- what still needs environment or deployment setup

Related docs:
- `MOBILE_ORDER_QR_NOTE.md`
- `FRONTEND_USER_ROLE_NOTE.md`
- `FRONTEND_ORDER_INVOICE_QR_NOTE.md`

## 1. Current Backend Status

Backend now already supports:
- user storefront APIs
- employee order workflow APIs
- mobile QR resolve flow
- shipper delivery-proof upload
- QR entry page for deep link plus browser fallback
- Android App Links endpoint at `/.well-known/assetlinks.json`

## 2. Mobile QR Flow Already Supported

### `USER`

- scan invoice QR
- open app via:
  - direct token
  - `teamatcha://order-qr/{token}`
  - `http(s)://<host>/api/public/order-qr-entry/{token}`
- app calls:
  - `GET /api/mobile/order-qr/{token}`
- backend verifies order ownership
- backend returns:
  - `targetScreen = USER_ORDER_STATUS`
  - full `order`

### `STAFF`

- scan QR
- app calls:
  - `GET /api/mobile/order-qr/{token}`
- backend auto-claims preparing when valid
- app opens employee order detail

### `SHIPPER`

- scan QR
- app calls:
  - `GET /api/mobile/order-qr/{token}`
- backend auto-claims delivery when valid
- app opens employee order detail

## 3. Delivery Proof Upload Is Now Implemented

### Endpoint

```http
POST /api/employee/orders/{id}/delivery-proof
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

### Multipart fields

- `file`: required image file
- `capturedAt`: optional ISO-8601 instant
- `note`: optional string

### Backend validation rules

- role must be `SHIPPER`
- shipper must belong to the same `workingStoreId` as the order
- order must already be assigned to the current shipper
- order must currently be `OUT_FOR_DELIVERY`

### Success response shape

```json
{
  "message": "Delivery proof uploaded successfully",
  "orderId": 701,
  "imagePath": "/uploads/delivery-proofs/order-701-proof.jpg",
  "capturedAt": "2026-04-04T10:25:00Z",
  "note": "Delivered to apartment lobby",
  "uploadedAt": "2026-04-04T10:30:00Z"
}
```

### Failure examples

Wrong role:

```json
{
  "status": 403,
  "message": "Only STAFF and SHIPPER accounts can manage employee orders"
}
```

Wrong stage:

```json
{
  "status": 409,
  "message": "Delivery proof can only be uploaded while the order is out for delivery."
}
```

Wrong assignee:

```json
{
  "status": 409,
  "message": "Order is assigned to another shipper."
}
```

## 4. Recommended Mobile Sequence For Shipper

Preferred flow:
1. shipper scans QR
2. app calls `GET /api/mobile/order-qr/{token}`
3. backend auto-claims delivery if valid
4. app opens employee order detail
5. shipper captures proof photo
6. app uploads proof to `POST /api/employee/orders/{id}/delivery-proof`
7. app calls `POST /api/employee/orders/{id}/complete-delivery`

Backward-compatible behavior:
- if proof upload fails because of network or server issue, mobile may still keep a local retry or fallback policy
- `complete-delivery` endpoint is unchanged and still works independently

## 5. Order Payload Now Includes Proof Fields

`OrderResponse` now includes:
- `deliveryProofImagePath`
- `deliveryProofCapturedAt`
- `deliveryProofUploadedAt`
- `deliveryProofNote`

Example:

```json
{
  "id": 701,
  "status": "OUT_FOR_DELIVERY",
  "deliveryProofImagePath": "/uploads/delivery-proofs/order-701-proof.jpg",
  "deliveryProofCapturedAt": "2026-04-04T10:25:00Z",
  "deliveryProofUploadedAt": "2026-04-04T10:30:00Z",
  "deliveryProofNote": "Delivered to apartment lobby"
}
```

This lets mobile:
- reload proof after app restart
- show proof in completed delivery detail
- stop depending only on local device storage

## 6. Android App Links Support

Backend now exposes:

```text
/.well-known/assetlinks.json
```

Current behavior:
- if Android package name and SHA-256 fingerprints are configured, backend returns a valid asset links JSON payload
- if those values are still blank, backend returns `[]`

Server config keys:

```properties
app.mobile.android-package-name=
app.mobile.asset-link-sha256-fingerprints=
app.mobile.public-base-url=
```

### What still needs to be finalized

- real public HTTPS host
- final Android package name
- final release SHA-256 fingerprint
- optional debug SHA-256 fingerprint for debug builds
- production value for `app.mobile.public-base-url`

### Required QR host behavior

Invoice QR entry should resolve through:

```text
https://<public-host>/api/public/order-qr-entry/{token}
```

Do not use in production:
- `localhost`
- LAN IP only
- plain `http://`

## 7. APIs Mobile Can Use Right Now

### QR and invoice

- `GET /api/public/order-qr-entry/{token}`
- `GET /api/public/order-qr/{token}`
- `GET /api/mobile/order-qr/{token}`

### Employee workflow

- `GET /api/employee/orders`
- `GET /api/employee/orders/{id}`
- `POST /api/employee/orders/{id}/accept-preparing`
- `POST /api/employee/orders/{id}/mark-ready`
- `POST /api/employee/orders/{id}/accept-delivery`
- `POST /api/employee/orders/{id}/delivery-proof`
- `POST /api/employee/orders/{id}/complete-delivery`

### User order flow

- `GET /api/user/orders`
- `GET /api/user/orders/{id}`
- `POST /api/user/orders/{id}/refresh-payment`
- `GET /api/user/orders/{id}/invoice`

## 8. What Backend Or Infra Still Needs To Send Mobile Team

Please confirm these final values to mobile:
- public API base URL
- public QR/app-link host
- Android package name
- release SHA-256 fingerprint
- debug SHA-256 fingerprint if debug app links are also needed

## 9. Short Conclusion

Server is now aligned with the mobile handoff more closely:
- QR resolve flow is live
- delivery proof upload is live
- proof metadata is returned in order payloads
- `assetlinks.json` endpoint exists

The remaining work is mostly deployment and environment setup, not core backend feature work.
