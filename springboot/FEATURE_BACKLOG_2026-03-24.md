# Backlog Tinh Nang 2026-03-24

Tai lieu nay chot lai hien trang backend Spring Boot va quy doi cac yeu cau moi thanh hang muc ky thuat co the trien khai theo sprint.

## 1. Hien trang da co

- `don hang / thanh toan / gan nhan vien / shipper`: da co model `Order`, `OrderItem`, `OrderStatus`, `PaymentStatus`
- `dia chi giao hang`: da co CRUD `UserDeliveryAddress`
- `feedback user + admin reply`: da co `CustomerFeedback` va API tra loi cua admin/manager
- `review`: da co cho `STORE`, `EVENT`, `DISH`; luong public va user da chan `CATEGORY`
- `promotion`: hien chi ho tro `ORDER` va `DISH`
- `auth + OTP`: hien chi co OTP dang ky/xac minh email, chua co doi mat khau quen mat khau qua OTP
- `phan quyen`: da co `ADMIN`, `MANAGER`, `STAFF`, `SHIPPER`, `USER`

## 2. Mapping yeu cau USER

| Yeu cau | Hien trang | Can lam |
| --- | --- | --- |
| Thong bao cap nhat trang thai don hang | Chua co notification center, chi co email nhac thanh toan/thanh cong | Tao `Notification` luu thong bao, push realtime khi `OrderStatus`/`PaymentStatus` doi, them API danh dau da doc |
| Chat voi nguoi ho tro realtime | Chua co | Them `spring-boot-starter-websocket`, tao `SupportConversation` + `SupportMessage`, room theo user/store/order |
| 1 dia chi - thong tin lien he chinh, dia chi da dat 1 lan thi nhay len va danh dau da xac minh | Moi co CRUD dia chi | Them `isPrimary`, `verifiedAt`, `lastUsedAt`, `successfulOrderCount`; khi don thanh cong thi cap nhat dia chi; them endpoint dat dia chi mac dinh |
| Phan level user dua tren so tien da thanh toan cho cua hang, ap dung cho quy sau | Chua co | Them `UserLevelPolicy`, `UserQuarterLevelSnapshot`, tinh tren don `PAID + COMPLETED`, level moi co hieu luc tu quy ke tiep |
| Bo danh gia cho category | Public/user backend da chan, nhung doc va UI van con dau vet | Da don lai tai lieu cong khai va bo hang so UI thua; giu lai xu ly legacy de khong vo du lieu cu |
| Feedback cho don dat hang | Chua co target order trong feedback | Mo rong `CustomerFeedback` them `targetType`, `targetId`, `orderId` |
| Feedback chung cho website hoac tro cac item cu the | Hien feedback moi gan `relatedStoreId` + `category` | Dung chung luong feedback, cho phep `targetType = WEBSITE/ORDER/STORE/DISH/EVENT` va `relatedStoreId` la tuy chon |
| Thay doi password, gui OTP | Chua co | Them `PasswordOtp` hoac mo rong `EmailOtp` theo purpose `PASSWORD_RESET`, tao 2 API request OTP + confirm password |
| Admin reply feedback | Da co | Giu nguyen model hien tai, mo rong de reply duoc feedback co `targetType/orderId` |

## 3. Mapping yeu cau ADMIN

| Yeu cau | Hien trang | Can lam |
| --- | --- | --- |
| Don nhay dong, trang tu refresh khi co thay doi + thong bao | Chua co realtime | Dung chung tang WebSocket cho order events + notification badge, frontend subscribe theo role/store |
| Loc don hang theo giai doan: chua thanh toan, da thanh toan, dang giao, da giao... | API list order hien chua co bo loc giai doan | Them filter `status`, `paymentStatus`, `storeId`, `assignedStage`, `createdFrom`, `createdTo` |
| Khuyen mai ap dung cho cua hang | Promotion hien khong rang buoc store | Them `eligibleStoreIds` hoac `PromotionStore` join table |
| Khuyen mai theo level user | Chua co user level | Them `eligibleUserLevels` vao promotion |
| Khuyen mai theo hoa don toi thieu cua tong bill nhieu cua hang | Hien co tinh tong bill khi checkout nhung promotion chua ho tro scope nay | Them scope `MULTI_STORE_TOTAL` + dieu kien `minCrossStoreBillAmount` |
| Khuyen mai theo tong bill 1 cua hang | Hien logic khuyen mai dang ap tren tung store bill nhung khong phan biet rule ro rang | Them scope `STORE_BILL` + `minStoreBillAmount`, `eligibleStoreIds` |
| Trang lien ket, tong thong tin | Chua ro nghia, tam hieu la dashboard tong hop co link nhanh | Tao dashboard tong hop order/feedback/chat/promotion theo store va toan he thong |

## 4. Mapping yeu cau NHAN VIEN

| Yeu cau | Hien trang | Can lam |
| --- | --- | --- |
| Nhan vien quet ma de nhan don o tung giai doan lam viec (pha che - giao hang) | Hien chi co gan `preparingStaff` va `deliveringShipper` bang API cap nhat tay | Them QR token theo order-stage, endpoint scan claim, log lich su scan, validate dung vai tro va dung store |

## 5. De xuat mo hinh du lieu moi

- `Notification`
  - `id`, `userId`, `type`, `title`, `body`, `targetType`, `targetId`, `readAt`, `createdAt`
- `SupportConversation`
  - `id`, `userId`, `storeId`, `orderId`, `status`, `lastMessageAt`
- `SupportMessage`
  - `id`, `conversationId`, `senderUserId`, `senderRole`, `message`, `createdAt`, `seenAt`
- `UserLevelPolicy`
  - `id`, `code`, `name`, `minPaidAmount`, `priority`, `active`
- `UserQuarterLevelSnapshot`
  - `id`, `userId`, `storeId`, `year`, `quarter`, `paidAmount`, `achievedLevel`, `effectiveFrom`, `effectiveTo`
- `PasswordOtp`
  - `id`, `userId`, `otpCode`, `purpose`, `expiresAt`, `usedAt`
- Mo rong `UserDeliveryAddress`
  - `isPrimary`, `verifiedAt`, `lastUsedAt`, `successfulOrderCount`
- Mo rong `CustomerFeedback`
  - `targetType`, `targetId`, `orderId`, `status`
- Mo rong `Promotion`
  - `scope`, `eligibleStoreIds`, `eligibleUserLevels`, `minStoreBillAmount`, `minCrossStoreBillAmount`
- `OrderStageClaim`
  - `id`, `orderId`, `stage`, `claimedByUserId`, `claimedAt`, `scanCode`, `scanExpiresAt`

## 6. De xuat API moi / mo rong

### Notifications

- `GET /api/user/notifications`
- `POST /api/user/notifications/{id}/read`
- `POST /api/user/notifications/read-all`

### Realtime

- WebSocket endpoint: `/ws`
- Topic user: `/topic/users/{userId}`
- Topic store orders: `/topic/stores/{storeId}/orders`
- Topic support chat: `/topic/support/conversations/{conversationId}`

### Password OTP

- `POST /api/auth/password/reset/request-otp`
- `POST /api/auth/password/reset/confirm`
- `POST /api/auth/password/change-with-otp`

### Delivery address

- `PUT /api/user/delivery-addresses/{id}/primary`
- response bo sung `isPrimary`, `verifiedAt`, `lastUsedAt`, `successfulOrderCount`

### Order filter cho admin

- `GET /api/admin/orders?status=&paymentStatus=&storeId=&assignedStage=&createdFrom=&createdTo=`

### Feedback

- `POST /api/user/feedbacks`
  - bo sung `targetType`, `targetId`, `orderId`
- `GET /api/admin/feedbacks`
  - them filter `targetType`, `orderId`, `status`

### Support chat

- `GET /api/user/support/conversations`
- `POST /api/user/support/conversations`
- `GET /api/user/support/conversations/{id}/messages`
- `POST /api/user/support/conversations/{id}/messages`

### Staff scan

- `POST /api/staff/orders/{id}/claim-by-scan`
- `POST /api/shipper/orders/{id}/claim-by-scan`

## 7. Luong realtime de xuat

Dung mot tang WebSocket chung cho ca chat va thong bao he thong:

1. Order/payment thay doi trang thai
2. Service phat `OrderStatusChangedEvent`
3. Notification service luu ban ghi thong bao
4. Gateway push den:
   - user dat hang
   - manager/admin cua store
   - nhan vien/shipper lien quan neu da duoc assign
5. Frontend cap nhat table/order detail ma khong can F5

Ly do chon WebSocket:

- Chat can 2 chieu thoi gian thuc
- Order dashboard va badge thong bao co the dung chung channel
- Giam viec gop 2 giai phap SSE + polling rieng le

## 8. Thu tu trien khai de xuat

### Sprint 1 - it rui ro, de thay doi UI ngay

- Bo danh gia category khoi hop dong cong khai
- Them doi mat khau bang OTP
- Them dia chi mac dinh + dia chi da xac minh
- Them bo loc don hang cho admin

### Sprint 2 - feedback va order experience

- Mo rong feedback theo `WEBSITE/ORDER/STORE/DISH/EVENT`
- Them thong bao cap nhat don hang
- Them inbox thong bao cho user va admin

### Sprint 3 - realtime

- Chat realtime user <-> support
- Order board auto refresh theo store/role

### Sprint 4 - loyalty va promotion

- User level theo quy
- Promotion theo store, level user, tong bill 1 store, tong bill nhieu store

### Sprint 5 - van hanh tai cua hang

- QR scan nhan don cho `STAFF` va `SHIPPER`
- Dashboard tong hop, trang lien ket va thong tin van hanh

## 9. Cac quy tac nghiep vu can khoa som

- Level user tinh tren `PAID` hay `COMPLETED`?
  - De xuat: chi tinh tren don `PAID` va `COMPLETED` de tranh hoan/huy
- Dia chi "da xac minh" tinh khi nao?
  - De xuat: sau it nhat 1 don `COMPLETED` dung dia chi do
- Chat ho tro theo user hay theo order?
  - De xuat: conversation co the gan `orderId` neu user chat tu man don hang, nguoc lai la conversation chung
- "Trang lien ket, tong thong tin" co phai dashboard tong hop?
  - Tam thoi duoc hieu la dashboard tong hop co quick links, KPI, don moi, feedback moi, chat moi

## 10. Ghi chu thuc hien trong code hien tai

- Khong nen xoa enum `ReviewTargetType.CATEGORY` o giai doan dau vi co the con du lieu cu trong DB
- Nen xoa no khoi contract cong khai va user flow truoc, sau do migration du lieu legacy roi moi tinh tiep
- Promotion can doi model truoc khi doi UI, vi yeu cau moi tac dong truc tiep den logic checkout
- Realtime chat va realtime order nen di chung 1 tang event de tranh lam hai he thong song song
