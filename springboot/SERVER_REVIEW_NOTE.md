# Server Review Note

Updated on 2026-04-11.

Purpose: file nay dung de review nhanh backend hien tai.
Khong di sau vao field-level detail. Muc tieu la:
- biet server co nhung chuc nang gi
- biet database table nao dang chua nhom du lieu nao

## 1. Tong quan server

Server hien tai la Spring Boot backend cho he thong Tea Matcha.

Backend dang phu trach cac nhom chuc nang chinh:
- xac thuc va session token
- public catalog cho storefront
- user app: cart, checkout, order, payment, invoice, QR, favorites, reviews, feedback
- employee app: manager, shipper xu ly don
- admin/manager app: CRUD va dashboard
- notification center
- promotion va user levels
- AI form draft cho admin/manager
- AI chat assistant cho tat ca role
- support chat realtime user <-> admin/manager
- mobile deep link / order QR resolve
- upload anh va file proof giao hang

Luu y quan trong:
- auth dang dung opaque session token, khong dung JWT
- support chat realtime luu trong RAM, khong luu SQL
- AI chat assistant da luu lich su vao database
- upload file luu tren filesystem `uploads/`, khong luu blob trong database

## 2. Server co nhung chuc nang gi

### 2.1 Auth va session

Server xu ly:
- register
- verify OTP
- reset password bang OTP
- login email/password
- Google login
- logout
- validate token qua `GET /api/auth/me`

Database lien quan:
- `users`
- `user_sessions`
- `email_otps`

### 2.2 Public storefront

Server cung cap du lieu cho:
- home
- stores
- dishes
- events
- news
- reviews public

Database lien quan:
- `stores`
- `categories`
- `dishes`
- `events`
- `news_articles`
- `reviews`
- `content_sections`
- cac bang image/tags/phu tro

### 2.3 User app

Server xu ly:
- cart
- checkout
- delivery addresses
- orders cua user
- refresh payment / recreate PayOS payment
- invoice va QR cua order
- favorites
- reviews cua user
- feedback cua user
- notifications cua user
- loyalty / user levels
- support chat user mo hoi thoai voi cua hang
- AI chat assistant de hoi thong tin va goi y mua hang

Database lien quan:
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `favorites`
- `reviews`
- `customer_feedbacks`
- `user_notifications`
- `user_delivery_addresses`
- `user_level_definitions`
- `ai_chat_threads`
- `ai_chat_messages`

### 2.4 Manager va shipper

Server xu ly:
- manager nhan don khau chuan bi
- manager mark ready
- shipper nhan don giao
- shipper complete delivery
- scan QR order
- upload delivery proof
- doc notification employee

Database lien quan:
- `orders`
- `order_items`
- `order_scan_audits`
- `user_notifications`

### 2.5 Admin va manager

Server xu ly:
- dashboard
- summary
- revenue theo ngay / tuan / thang / nam
- top selling dishes
- CRUD users
- CRUD stores
- CRUD events
- CRUD categories
- CRUD dishes
- CRUD store-dishes
- CRUD news
- CRUD promotions
- CRUD user levels
- quan ly orders
- feedback moderation
- review moderation
- upload images
- AI form draft de goi y du lieu cho form admin
- xem support chat inbox
- manager duoc scope theo `workingStoreId`

Database lien quan:
- `users`
- `stores`
- `categories`
- `dishes`
- `store_dishes`
- `events`
- `news_articles`
- `promotions`
- `user_level_definitions`
- `orders`
- `order_items`
- `reviews`
- `customer_feedbacks`
- `user_notifications`

### 2.6 Payment, invoice, QR

Server xu ly:
- tao payment session PayOS
- webhook PayOS
- refresh payment link
- invoice HTML/printable
- QR cho order/invoice
- mobile resolve QR

Database lien quan:
- `orders`
- `order_items`
- `order_scan_audits`

### 2.7 Notification center

Server xu ly:
- thong bao cho user
- thong bao cho manager/shipper
- thong bao cho manager khi co don moi
- doc / danh dau da doc / unread / read all

Database lien quan:
- `user_notifications`

### 2.8 AI

Server dang co 2 nhanh AI:

- AI form draft cho admin/manager
  - khong co bang rieng
  - AI doc du lieu tham chieu tu DB hien co de tao draft form

- AI chat assistant
  - tra loi ve stores, dishes, events, news, promotions, account status, order/cart guidance
  - co thread-based history
  - moi user co lich su hoi thoai rieng

Database lien quan:
- `ai_chat_threads`
- `ai_chat_messages`

### 2.9 Support chat realtime

Server xu ly:
- user mo support session theo store
- admin/manager nhan va claim hoi thoai
- gui nhan tin realtime qua Socket.IO

Luu y:
- support chat nay hien tai luu RAM, khong co bang database rieng

## 3. Database table map theo nhom

### 3.1 Auth va user core

- `users`
  - tai khoan he thong
  - role, enabled, verified, working store

- `user_sessions`
  - token dang nhap dang con hieu luc
  - he thong dang theo huong single-session

- `email_otps`
  - OTP verify dang ky va reset password

### 3.2 AI chat

- `ai_chat_threads`
  - danh sach cuoc tro chuyen AI cua tung user
  - title, so message, preview message cuoi, thoi gian update

- `ai_chat_messages`
  - tung tin nhan trong mot thread
  - role `user` / `assistant`
  - content
  - references JSON
  - actions JSON
  - model da dung de tra loi

### 3.3 Catalog va noi dung cua hang

- `stores`
  - thong tin cua hang
  - vi tri, gio mo cua, hinh anh, brand identity, highlight

- `store_image_paths`
  - danh sach anh cua store

- `store_highlight_tags`
  - highlight tags cua store

- `store_service_tags`
  - service tags cua store

- `categories`
  - nhom mon theo store

- `category_image_paths`
  - anh cua category

- `dishes`
  - thong tin mon / do uong

- `dish_image_paths`
  - anh cua dish

- `dish_highlight_tags`
  - tags noi bat cua dish

- `store_dishes`
  - bang noi giua store va dish
  - ton kho, availability, price override theo cua hang

- `events`
  - su kien cua store

- `event_image_paths`
  - anh cua event

- `event_highlight_tags`
  - highlight tags cua event

- `event_featured_dish_ids`
  - danh sach mon noi bat trong event

- `news_articles`
  - bai viet news / editorial content

- `news_article_image_paths`
  - anh cua news

- `news_article_tags`
  - tags cua news

- `content_sections`
  - cac section content dung chung cho store, dish, event, news
  - day la bang section chinh sau migration

- `content_section_image_paths`
  - nhieu anh cho moi content section

### 3.4 Order, cart, payment, invoice

- `carts`
  - gio hang dang mo cua user

- `cart_items`
  - item trong gio hang

- `orders`
  - order chinh
  - tong tien, discount, payment status, order status
  - assignee manager/shipper
  - invoice fields
  - QR token
  - delivery proof

- `order_items`
  - mon nam trong tung order

- `order_promotion_dish_ids`
  - dish ids lien quan promotion trong order

- `order_scan_audits`
  - log scan QR nhan don
  - ai scan, role gi, action nao, thanh cong hay that bai

### 3.5 Promotion va loyalty

- `promotions`
  - voucher / chuong trinh khuyen mai

- `promotion_applicable_dishes`
  - dish IDs ma promotion ap dung

- `promotion_eligible_stores`
  - store IDs duoc ap dung promotion

- `promotion_eligible_user_levels`
  - user level IDs hop le cho promotion

- `user_level_definitions`
  - level theo tung store
  - vi du Silver, Gold...

### 3.6 Reviews, feedback, favorites

- `reviews`
  - review cua user cho store/event/dish

- `favorites`
  - cac doi tuong user da thich

- `customer_feedbacks`
  - feedback tong quat cua user
  - co the gan voi store va order
  - co admin reply ngay trong cung bang

### 3.7 Notifications

- `user_notifications`
  - dung chung cho user, employee, manager/admin notifications
  - luu order notifications, event/news notifications, task notifications

### 3.8 Delivery va dia chi user

- `user_delivery_addresses`
  - so tay dia chi giao hang cua user

### 3.9 Legacy / hien van ton tai trong schema

- `employee_work_schedules`
  - lich lam viec nhan vien (legacy, da bo khoi contract chinh)
  - hien API da bo khoi contract chinh, nhung entity/table van con trong code schema

- `employee_attendances`
  - cham cong nhan vien (legacy, da bo khoi contract chinh)
  - hien API da bo khoi contract chinh, nhung entity/table van con trong code schema

## 4. Diem review nhanh cho team docs

Neu review o muc tong quan, co the nho backend theo 5 lop:
- auth + users
- catalog + content
- commerce: cart / order / payment / invoice
- operations: admin / manager / shipper
- engagement: notifications / feedback / reviews / support chat / AI

Neu review o muc database, co the nho:
- `users`, `user_sessions`, `email_otps` = auth
- `stores`, `categories`, `dishes`, `events`, `news_articles`, `content_sections` = noi dung kinh doanh
- `carts`, `cart_items`, `orders`, `order_items` = mua hang
- `promotions`, `user_level_definitions` = khuyen mai va loyalty
- `reviews`, `favorites`, `customer_feedbacks`, `user_notifications` = tuong tac nguoi dung
- `ai_chat_threads`, `ai_chat_messages` = lich su AI chat
- support chat live = RAM only, khong co table

## 5. Tai lieu lien quan

- `BACKEND_DATABASE_NOTE.md`
- `FRONTEND_ROLE_API_NOTE.md`
- `FRONTEND_AI_CHAT_NOTE.md`
- `FRONTEND_ADMIN_API.md`
- `FRONTEND_USER_API.md`
- `API_QUICK_REFERENCE.md`
