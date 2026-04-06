# Frontend AI Chat Note

Updated on 2026-04-06.

Purpose: this file explains the AI chat API that all authenticated roles can use to ask about stores, dishes, news, events, promotions, and user/account status.

## Endpoint

- `POST /api/ai/chat/query`

## Auth

- Requires `Authorization: Bearer <accessToken>`
- Supported roles:
  - `ADMIN`
  - `MANAGER`
  - `STAFF`
  - `SHIPPER`
  - `USER`

## Main Capability

- Ask natural-language questions about:
  - stores
  - dishes
  - news
  - events
  - promotions / vouchers
  - current user/account status
- Backend returns:
  - `answer` for the chat bubble
  - `references` for quick links / quick cards
  - `currentUserStatus` for profile/account state

## Request Body

```json
{
  "message": "Cua hang nao o Quan 1 co matcha latte va voucher giam gia?",
  "history": [
    {
      "role": "user",
      "content": "Cho minh xem tin tuc moi"
    },
    {
      "role": "assistant",
      "content": "Mình đã tìm thấy một số bài viết mới."
    }
  ]
}
```

Fields:

- `message`: required current user message
- `history`: optional recent chat history

## Response Body

```json
{
  "answer": "Tea House Q1 dang co Matcha Latte va co the kiem tra them voucher MATCHA10 trong danh sach khuyen mai hien tai.",
  "references": [
    {
      "referenceKey": "store:1",
      "entityType": "STORE",
      "tableName": "stores",
      "id": 1,
      "slug": "tea-house-q1",
      "title": "Tea House Q1",
      "subtitle": "District 1 - 12 Nguyen Trai, District 1",
      "imagePath": "/uploads/stores/tea-house-q1.jpg",
      "publicApiPath": "/api/public/stores/tea-house-q1",
      "adminApiPath": "/api/admin/stores/1",
      "userApiPath": null
    },
    {
      "referenceKey": "dish:88",
      "entityType": "DISH",
      "tableName": "dishes",
      "id": 88,
      "slug": null,
      "title": "Matcha Latte",
      "subtitle": "Tea House Q1 - ACTIVE",
      "imagePath": "/uploads/dishes/matcha-latte.jpg",
      "publicApiPath": "/api/public/dishes/88",
      "adminApiPath": "/api/admin/dishes/88",
      "userApiPath": null
    },
    {
      "referenceKey": "promotion:41",
      "entityType": "PROMOTION",
      "tableName": "promotions",
      "id": 41,
      "slug": null,
      "title": "MATCHA10",
      "subtitle": "Matcha Festival Promo - 10 percent off for orders",
      "imagePath": null,
      "publicApiPath": null,
      "adminApiPath": "/api/admin/promotions/41",
      "userApiPath": null
    }
  ],
  "currentUserStatus": {
    "id": 12,
    "fullName": "Nguyen Van A",
    "email": "a@example.com",
    "role": "USER",
    "enabled": true,
    "verified": true,
    "profileCompleted": true,
    "workingStoreId": null,
    "workingStoreName": null
  },
  "model": "gpt-5.4-nano"
}
```

## Meaning Of `references`

Every reference is a quick-link candidate.

Fields:

- `referenceKey`: stable key selected by backend
- `entityType`: one of `STORE`, `DISH`, `EVENT`, `NEWS`, `PROMOTION`, `USER`
- `tableName`: database table name related to the record
- `id`: primary key if available
- `slug`: slug when the entity has one
- `title`: main label to show
- `subtitle`: small secondary line
- `imagePath`: preview image if any
- `publicApiPath`: public detail endpoint if available
- `adminApiPath`: admin detail endpoint if current role is allowed to see it
- `userApiPath`: user/self endpoint when relevant, for example `/api/auth/me`

## Frontend Behavior

- Render `answer` as the assistant chat message
- Render `references` as chips, cards, or quick actions
- Use `entityType`, `id`, `slug`, and API paths to route users to the correct screen
- Show `currentUserStatus` in a side panel or account summary if the user asks about account status
- Keep sending recent `history` so the assistant can answer follow-up questions

## Important Security And Scope Notes

- `USER`, `STAFF`, and `SHIPPER` only get their own account status in `currentUserStatus`
- `MANAGER` can get quick links for staff/shipper accounts in their own store only
- `ADMIN` can get admin quick links to user records
- Public content is visible to all roles, but internal admin quick links are only filled when the role is allowed
- Backend does not let AI invent IDs or links; it only returns references from real database candidates
