# Frontend User Role Note

Updated on 2026-04-11.

Purpose: this file is the current frontend handoff for role `USER`.

## 1. What USER Can Do

- register, login, logout
- use Google login
- browse stores, dishes, events, and news
- manage cart
- checkout and place orders
- refresh unpaid PayOS links
- view invoice and QR
- track own orders
- manage favorites
- create reviews
- create feedback
- read storefront notifications
- open support chat
- use AI chat as shopping assistant

## 2. What USER Cannot Do

- access admin dashboard
- access manager or shipper operation screens
- manage stores, dishes, events, news, promotions, or user levels
- view another user's order, invoice, or QR resolve result
- use employee task actions such as:
  - `ACCEPT_PREPARING`
  - `MARK_READY`
  - `ACCEPT_DELIVERY`
  - `MARK_COMPLETED`
- open internal manager/shipper scan-claim screens

## 3. Main APIs

- Auth
  - `POST /api/auth/login`
  - `POST /api/auth/google/login`
  - `POST /api/auth/google/complete-profile`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Public catalog
  - `GET /api/public/home`
  - `GET /api/public/stores`
  - `GET /api/public/stores/{storeKey}`
  - `GET /api/public/dishes`
  - `GET /api/public/dishes/{id}`
  - `GET /api/public/events`
  - `GET /api/public/events/{eventKey}`
  - `GET /api/public/news`
  - `GET /api/public/news/{newsKey}`
- Cart and checkout
  - `GET /api/user/cart`
  - `POST /api/user/cart/items`
  - `PUT /api/user/cart/items/{id}`
  - `DELETE /api/user/cart/items/{id}`
  - `POST /api/user/orders/checkout`
- Orders
  - `GET /api/user/orders`
  - `GET /api/user/orders/{id}`
  - `POST /api/user/orders/{id}/refresh-payment`
  - `GET /api/user/orders/{id}/invoice`
- Favorites and reviews
  - `GET|POST|DELETE /api/favorites/*`
  - `GET|POST|PUT|DELETE /api/reviews/*`
- Feedback and notifications
  - `GET|POST|DELETE /api/feedbacks/*`
  - `GET /api/notifications`
  - `GET /api/notifications/unread-count`
  - `PUT /api/notifications/{id}/read`
  - `PUT /api/notifications/{id}/unread`
  - `PUT /api/notifications/read-all`
- Support chat
  - `GET /api/support-chat/stores`
- AI chat
  - `POST /api/ai/chat/query`
  - `GET /api/ai/chat/threads`
  - `GET /api/ai/chat/threads/{threadId}`

## 4. Order And Invoice Rules

- `USER` can only open their own orders
- `POST /api/user/orders/{id}/refresh-payment` may return a recreated PayOS link if the old one expired
- `OrderResponse.allowedActions` is the source of truth for buttons
- `VIEW_INVOICE` appears only when invoice exists
- `REFRESH_PAYMENT` appears only when the order is not paid and not cancelled

## 5. QR Behavior For USER

- invoice QR can open the public entry route:
  - `/api/public/order-qr-entry/{token}`
- mobile app should eventually resolve that token through:
  - `GET /api/mobile/order-qr/{token}`
- for role `USER`, backend returns:
  - `targetScreen = USER_ORDER_STATUS`
  - the user's own `order`
- `USER` must not see internal claim actions from QR flow

## 6. AI Chat Behavior For USER

- AI chat can answer questions about:
  - stores
  - drinks and dishes
  - events
  - news
  - promotions
  - current account status
- AI chat also acts like a shopping assistant:
  - drink consultation
  - similar dish suggestions
  - cart guidance
  - recent order lookup
- AI chat history is now stored in backend database

## 7. Frontend Rules

- Route storefront UI only for `role = USER`
- Do not show admin or employee menus
- Do not expose employee QR-claim buttons
- Use `allowedActions` for order buttons
- Use backend thread APIs for AI conversation history, not local-only history
