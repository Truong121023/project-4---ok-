# Frontend Admin AI Draft Note

Updated on 2026-04-06.

Purpose: this file explains the AI-assisted admin form draft API for `ADMIN` and `MANAGER`.

## Endpoint

- `POST /api/admin/ai/form-drafts/{formType}`

Supported `formType` values:

- `STORE`
- `CATEGORY`
- `DISH`
- `EVENT`
- `NEWS`
- `STORE_DISH`

## Auth And Scope

- Requires `Authorization: Bearer <accessToken>`
- `ADMIN` can omit `storeId` or send `storeId` for tighter context
- `MANAGER` is always restricted to their own `workingStoreId`
- If `MANAGER` sends another `storeId`, backend returns `403`

## Request Body

```json
{
  "prompt": "Tao mot cua hang phong cach Nhat tai Quan 1, tone go am, co workshop cuoi tuan",
  "storeId": 1,
  "currentForm": {}
}
```

Fields:

- `prompt`: required natural-language instruction from admin/manager
- `storeId`: optional extra context for store-scoped forms
- `currentForm`: optional current form object so AI can continue from values already typed by the user

## Response Body

```json
{
  "formType": "STORE",
  "draft": {
    "name": "Tea Matcha Sakura Q1",
    "description": "Khong gian matcha phong cach Nhat voi tone go am va workshop cuoi tuan.",
    "address": "25 Nguyen Hue, District 1, Ho Chi Minh City",
    "contactEmail": "hello@tea-matcha-sakura-q1.teamatcha.local",
    "phoneNumber": "0901000014",
    "slug": "tea-matcha-sakura-q1",
    "latitude": 10.7768,
    "longitude": 106.7009,
    "area": "District 1",
    "positionLabel": "Ground floor corner",
    "hoursText": "08:00 - 22:00",
    "openTime": "08:00:00",
    "closeTime": "22:00:00",
    "personality": "Tinh te va am ap",
    "designSignature": "Go sang mau va ban workshop",
    "franchiseMood": "Premium, youthful, experience-led",
    "specialty": "Usucha va matcha latte",
    "highlightSummary": "Chi nhanh tap trung workshop va menu matcha thu cong",
    "highlightTags": ["Workshop", "Matcha", "Japanese style"],
    "serviceTags": ["Dine-in", "Takeaway", "Delivery"],
    "imagePaths": [],
    "sections": [
      {
        "title": "Store Story",
        "content": "Khong gian duoc thiet ke cho trai nghiem matcha thu cong, workshop cuoi tuan va ngoi lai lau.",
        "imagePaths": []
      }
    ],
    "active": true
  },
  "warnings": [
    "Auto-filled sample values for 8 field(s). Review before saving."
  ],
  "missingFields": [],
  "scopeStoreId": 1,
  "scopeStoreName": "Tea House Q1",
  "model": "gpt-5.4-nano"
}
```

## Meaning Of Response Fields

- `draft`: object to merge into the frontend form state
- Backend now tries to return every top-level field for the target form, including optional fields, by auto-filling safe sample values when AI leaves them blank
- `warnings`: list of backend adjustments after validation
  - example: invalid ID removed because it is outside current store scope
  - example: backend auto-filled sample values for blank fields
- `missingFields`: list of important fields still needing manual input
  - example: `categoryId`, `price`, `startsAt`
- `scopeStoreId` and `scopeStoreName`: store context that backend actually used
- `model`: current OpenAI model used for generation

## Frontend Behavior

- Call this endpoint only when the user explicitly clicks an AI-assist action
- Put `draft` into the form state
- Show `warnings` in a small toast or warning panel
- Highlight fields in `missingFields` so the user knows what still needs manual input
- Do not auto-submit after AI response
- Let the admin/manager review and edit before save
- Frontend can now expect `draft` to be much more complete, often with all top-level fields already present

## Important Notes

- Backend validates IDs against real database reference data before returning the final draft
- Backend now auto-fills sample values for blank fields after AI generation, so optional fields like `slug`, `hoursText`, `tags`, `sections`, `priceOverride`, `publishedAt` may be present even if the original prompt was short
- AI does not upload images, so `imagePaths` will usually stay empty
- For store-scoped forms, frontend should prefer sending `storeId` to get more accurate IDs and lower token cost
- For `MANAGER`, frontend does not need to guess scope; backend already locks to their own store
