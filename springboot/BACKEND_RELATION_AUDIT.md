# Backend Relation Audit

Updated on 2026-04-11.

Purpose: quick audit note for cross-module backend relationships.

## Auth and user scope

- `users` is the root identity table
- `user_sessions.user_id -> users.id`
- `users.working_store_id -> stores.id`
- active roles are:
  - `ADMIN`
  - `MANAGER`
  - `SHIPPER`
  - `USER`

## Store and catalog relations

- `categories.store_id -> stores.id`
- `dishes.category_id -> categories.id`
- `store_dishes.store_id -> stores.id`
- `store_dishes.dish_id -> dishes.id`
- `events.store_id -> stores.id`
- `news_articles.related_store_id -> stores.id`

## Order and workflow relations

- `orders.user_id -> users.id`
- `order_items.order_id -> orders.id`
- `order_items.store_id -> stores.id`
- `order_items.dish_id -> dishes.id`
- `orders.confirmed_by_user_id -> users.id`
- `orders.preparing_staff_id -> users.id`
- `orders.delivering_shipper_id -> users.id`

Important:
- `preparing_staff_id` is still the legacy column name
- in current backend flow it now points to the assigned `MANAGER`

## QR and invoice relations

- `orders.invoice_qr_token` backs public invoice and mobile QR flows
- `order_scan_audits.order_id -> orders.id`
- scan audit stores:
  - who scanned
  - which role scanned
  - what action was attempted
  - success or failure

## AI and support relations

- `ai_chat_threads.user_id -> users.id`
- `ai_chat_messages.thread_id -> ai_chat_threads.id`
- support chat is RAM-only and has no SQL relationship table
