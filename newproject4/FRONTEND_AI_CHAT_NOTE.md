# Frontend AI Chat Note

Updated on 2026-04-11.

Purpose: this file explains the AI chat APIs that all authenticated roles can use to ask about stores, dishes, news, events, promotions, account status, and for `USER` role, shopping assistant guidance. AI chat history is now stored in the backend database, so frontend can render old conversations without depending on local-only storage.

## Endpoints

- `POST /api/ai/chat/query`
- `GET /api/ai/chat/threads`
- `GET /api/ai/chat/threads/{threadId}`

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
- For `USER`, backend also behaves like a shopping assistant:
  - drink consultation
  - dish recommendations
  - similar dish suggestions in the same chat response
  - cart / buy guidance
  - recent order lookup
- Backend now persists chat threads and chat messages in database tables:
  - `ai_chat_threads`
  - `ai_chat_messages`
- Backend returns:
  - `threadId` and `threadTitle`
  - `answer` for the chat bubble
  - `references` for quick links / quick cards
  - `actions` for direct frontend buttons such as add-to-cart or open-cart
  - `currentUserStatus` for profile/account state

## Recommended Frontend Flow

1. User opens AI chat screen.
2. Frontend loads sidebar/history with:
   - `GET /api/ai/chat/threads?page=0&size=20`
3. If user starts a brand-new conversation:
   - call `POST /api/ai/chat/query` without `threadId`
   - backend creates a new thread automatically
   - response returns `threadId`
4. If user opens an old conversation:
   - call `GET /api/ai/chat/threads/{threadId}`
   - render all saved messages in the chat window
5. When user sends a new message inside an existing conversation:
   - call `POST /api/ai/chat/query` with that `threadId`
   - backend appends both the user message and assistant reply into the same thread

Frontend no longer needs to persist the full AI chat history locally in order to restore old conversations. Local cache is still optional for faster UX, but the source of truth should now be backend thread APIs.

## Request Body For `POST /api/ai/chat/query`

```json
{
  "message": "Goi y cho minh mon matcha it ngot de de uong buoi chieu",
  "history": [
    {
      "role": "user",
      "content": "Mình muốn uống gì dễ uống"
    },
    {
      "role": "assistant",
      "content": "Bạn có thể thử nhóm latte hoặc cooler dịu vị."
    }
  ],
  "threadId": 18
}
```

Fields:

- `message`: required current user message
- `history`: optional recent chat history
  - backend now mainly uses persisted thread messages when `threadId` exists
  - frontend may still send recent history for a new thread or temporary UI continuity
- `threadId`: optional
  - omit for a new chat
  - include for continuing an existing chat

## Response Body For `POST /api/ai/chat/query`

```json
{
  "threadId": 18,
  "threadTitle": "Goi y cho minh mon matcha it ngot de de uong buoi chieu",
  "answer": "Nếu bạn muốn dễ uống vào buổi chiều, mình gợi ý Jasmine Matcha Cooler hoặc Matcha Latte ít ngọt. Mình cũng kèm thêm các món tương tự để bạn xem nhanh.",
  "references": [
    {
      "referenceKey": "dish:88",
      "entityType": "DISH",
      "tableName": "dishes",
      "id": 88,
      "slug": null,
      "title": "Jasmine Matcha Cooler",
      "subtitle": "Tea Matcha Rivergate Terrace - ACTIVE",
      "imagePath": "/uploads/dishes/jasmine-matcha-cooler.jpg",
      "publicApiPath": "/api/public/dishes/88",
      "adminApiPath": "/api/admin/dishes/88",
      "userApiPath": null
    },
    {
      "referenceKey": "store:14",
      "entityType": "STORE",
      "tableName": "stores",
      "id": 14,
      "slug": "tea-matcha-rivergate-terrace",
      "title": "Tea Matcha Rivergate Terrace",
      "subtitle": "District 6 - 23 Hau Giang, District 6, Ho Chi Minh City",
      "imagePath": "/uploads/stores/rivergate-terrace.jpg",
      "publicApiPath": "/api/public/stores/tea-matcha-rivergate-terrace",
      "adminApiPath": "/api/admin/stores/14",
      "userApiPath": null
    }
  ],
  "actions": [
    {
      "actionKey": "add-to-cart:14:88",
      "actionType": "ADD_TO_CART",
      "label": "Them vao gio",
      "description": "Them Jasmine Matcha Cooler vao gio tai Tea Matcha Rivergate Terrace",
      "method": "POST",
      "apiPath": "/api/user/cart/items",
      "referenceKey": "dish:88",
      "payload": {
        "storeId": 14,
        "dishId": 88,
        "quantity": 1
      }
    },
    {
      "actionKey": "open-cart",
      "actionType": "OPEN_CART",
      "label": "Mo gio hang",
      "description": "Xem gio hang hien tai va tiep tuc dat mon",
      "method": "GET",
      "apiPath": "/api/user/cart",
      "referenceKey": null,
      "payload": null
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

## Response Body For `GET /api/ai/chat/threads`

```json
{
  "items": [
    {
      "threadId": 18,
      "title": "Goi y cho minh mon matcha it ngot de de uong buoi chieu",
      "messageCount": 6,
      "lastMessageRole": "assistant",
      "lastMessagePreview": "Nếu bạn muốn dễ uống vào buổi chiều, mình gợi ý Jasmine Matcha Cooler hoặc Matcha Latte ít ngọt...",
      "lastMessageAt": "2026-04-11T04:15:10Z",
      "updatedAt": "2026-04-11T04:15:10Z"
    },
    {
      "threadId": 15,
      "title": "Voucher nao dang dung tot cho don tren 100k",
      "messageCount": 4,
      "lastMessageRole": "user",
      "lastMessagePreview": "Voucher nao dang dung tot cho don tren 100k",
      "lastMessageAt": "2026-04-10T13:10:00Z",
      "updatedAt": "2026-04-10T13:10:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalItems": 2,
  "totalPages": 1,
  "hasNext": false,
  "hasPrevious": false
}
```

Use this endpoint for:

- chat sidebar
- recent conversations list
- search-by-title UI on frontend side if desired

## Response Body For `GET /api/ai/chat/threads/{threadId}`

```json
{
  "threadId": 18,
  "title": "Goi y cho minh mon matcha it ngot de de uong buoi chieu",
  "messages": [
    {
      "id": 101,
      "role": "user",
      "content": "Mình muốn uống gì dễ uống",
      "references": [],
      "actions": [],
      "model": null,
      "createdAt": "2026-04-11T04:12:00Z"
    },
    {
      "id": 102,
      "role": "assistant",
      "content": "Bạn có thể thử nhóm latte hoặc cooler dịu vị.",
      "references": [
        {
          "referenceKey": "dish:88",
          "entityType": "DISH",
          "tableName": "dishes",
          "id": 88,
          "slug": null,
          "title": "Jasmine Matcha Cooler",
          "subtitle": "Tea Matcha Rivergate Terrace - ACTIVE",
          "imagePath": "/uploads/dishes/jasmine-matcha-cooler.jpg",
          "publicApiPath": "/api/public/dishes/88",
          "adminApiPath": "/api/admin/dishes/88",
          "userApiPath": null
        }
      ],
      "actions": [
        {
          "actionKey": "open:dish:88",
          "actionType": "OPEN_DISH",
          "label": "Xem mon",
          "description": "Jasmine Matcha Cooler",
          "method": "GET",
          "apiPath": "/api/public/dishes/88",
          "referenceKey": "dish:88",
          "payload": null
        }
      ],
      "model": "gpt-5.4-nano",
      "createdAt": "2026-04-11T04:12:03Z"
    }
  ],
  "createdAt": "2026-04-11T04:12:00Z",
  "updatedAt": "2026-04-11T04:15:10Z"
}
```

Use this endpoint when:

- user clicks a conversation in the sidebar
- frontend needs to rehydrate the full message list
- mobile/web restores a previous AI chat session

## Meaning Of `references`

Every reference is a quick-link candidate.

Fields:

- `referenceKey`: stable key selected by backend
- `entityType`: one of `STORE`, `DISH`, `EVENT`, `NEWS`, `PROMOTION`, `USER`, `CART`, `ORDER`
- `tableName`: database table name related to the record
- `id`: primary key if available
- `slug`: slug when the entity has one
- `title`: main label to show
- `subtitle`: small secondary line
- `imagePath`: preview image if any
- `publicApiPath`: public detail endpoint if available
- `adminApiPath`: admin detail endpoint if current role is allowed to see it
- `userApiPath`: user/self endpoint when relevant, for example `/api/auth/me`

## Meaning Of `actions`

- `actionType` can currently be:
  - `ADD_TO_CART`
  - `OPEN_CART`
  - `OPEN_ORDER`
  - `OPEN_ORDERS`
  - `OPEN_STORE`
  - `OPEN_DISH`
  - `OPEN_EVENT`
  - `OPEN_NEWS`
  - `OPEN_PROMOTION`
  - `OPEN_ACCOUNT`
- `method` and `apiPath` tell frontend how to execute the action
- `payload` is most important for `ADD_TO_CART`
- `referenceKey` links the action back to the related quick card when relevant

## Frontend Behavior

- Render the thread list from `GET /api/ai/chat/threads`
- Render `messages[]` from `GET /api/ai/chat/threads/{threadId}` when opening an old conversation
- Render `answer` from `POST /api/ai/chat/query` as the newest assistant bubble
- Use `threadId` returned by `POST /api/ai/chat/query` as the source of truth for the active conversation
- When sending the next message inside the same conversation, include the same `threadId`
- Render `references` as chips, cards, or quick actions
- Render `actions` as primary CTA buttons under the assistant reply when helpful
- For `ADD_TO_CART`, frontend can call:
  - `POST /api/user/cart/items`
  - with exactly the JSON body in `action.payload`
- For `OPEN_CART`, `OPEN_ORDER`, `OPEN_ORDERS`, `OPEN_STORE`, `OPEN_DISH`, `OPEN_EVENT`, `OPEN_NEWS`, `OPEN_PROMOTION`, `OPEN_ACCOUNT`, frontend can route directly from `apiPath`
- Show `currentUserStatus` in a side panel or account summary if the user asks about account status
- Optional UX improvement:
  - optimistically append the user bubble locally
  - replace/append the assistant bubble after `POST /query` returns
  - then refresh the thread list if the sidebar is visible

## Important Security And Scope Notes

- A user can only list and open their own AI chat threads
- Backend checks `threadId` ownership before appending messages or returning old messages
- `USER`, `STAFF`, and `SHIPPER` only get their own account status in `currentUserStatus`
- `MANAGER` can get quick links for staff/shipper accounts in their own store only
- `ADMIN` can get admin quick links to user records
- Public content is visible to all roles, but internal admin quick links are only filled when the role is allowed
- Backend does not let AI invent IDs or links; it only returns references from real database candidates
- For `USER`, chatbox AI does not place an order automatically. It only returns guidance and executable frontend actions such as `ADD_TO_CART` and links to cart/order screens
