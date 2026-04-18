# API Quick Reference

Scope: quick lookup note for Tea Matcha backend APIs.
This file is optimized for frontend implementation speed: each endpoint maps to a sample request body and a sample response payload name.

Detailed guides:
- `FRONTEND_USER_API.md`
- `FRONTEND_ADMIN_API.md`
- `FRONTEND_ADMIN_AI_DRAFT_NOTE.md`
- `FRONTEND_AI_CHAT_NOTE.md`

## Common Rules

- Base path: `/api`
- Protected endpoints require `Authorization: Bearer <accessToken>`
- Send JSON with `Content-Type: application/json`
- Updated on 2026-03-26: `sections` for store, dish, event, and news are now backed by the shared DB table `content_sections`, but frontend request and response shapes stay the same.
- Pagination wrapper:
  - `items`
  - `page`
  - `size`
  - `totalItems`
  - `totalPages`
  - `hasNext`
  - `hasPrevious`

## Public APIs

| Method | Path | Request / Query Example | Response Example |
| --- | --- | --- | --- |
| `GET` | `/api/public/home` | none | `publicHomeResponse` |
| `GET` | `/api/public/stores` | `?search=matcha&sort=rating_desc&page=0&size=10` | `publicStorePageResponse` |
| `GET` | `/api/public/stores/{storeKey}` | `/api/public/stores/tea-house-q1` | `publicStoreDetailResponse` |
| `GET` | `/api/public/dishes` | `?search=latte&sort=top_rated&page=0&size=10` | `publicDishPageResponse` |
| `GET` | `/api/public/dishes/{dishId}` | `/api/public/dishes/88?lat=10.77&lng=106.70` | `publicDishDetailResponse` |
| `GET` | `/api/public/events` | `?search=launch&sort=date_asc&page=0&size=10` | `publicEventPageResponse` |
| `GET` | `/api/public/events/{eventKey}` | `/api/public/events/matcha-launch-week` | `publicEventDetailResponse` |
| `GET` | `/api/public/news` | `?featured=true&page=0&size=10` | `publicNewsPageResponse` |
| `GET` | `/api/public/news/{newsKey}` | `/api/public/news/matcha-guide-thang-4` | `publicNewsDetailResponse` |
| `GET` | `/api/public/reviews` | `?targetType=STORE&targetId=1&sort=date_desc&page=0&size=10` | `publicReviewPageResponse` |

## Auth APIs

| Method | Path | Request Example | Response Example |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | `registerRequest` | `registerResponse` |
| `POST` | `/api/auth/verify-otp` | `verifyOtpRequest` | `verifyOtpResponse` |
| `POST` | `/api/auth/password/request-otp` | `passwordResetOtpRequest` | `passwordResetOtpResponse` |
| `POST` | `/api/auth/password/reset` | `passwordResetConfirmRequest` | `messageResponse` |
| `POST` | `/api/auth/login` | `loginRequest` | `loginResponse` |
| `POST` | `/api/auth/google/login` | `googleLoginRequest` | `loginResponse` |
| `POST` | `/api/auth/google/complete-profile` | `googleCompleteProfileRequest` | `googleCompleteProfileResponse` |
| `GET` | `/api/auth/me` | Header only | `meResponse` |
| `POST` | `/api/auth/logout` | Header only | `logoutResponse` |

## User APIs

### AI Chat

| Method | Path | Request Example | Response Example |
| --- | --- | --- | --- |
| `POST` | `/api/ai/chat/query` | `aiChatQueryRequest` | `aiChatResponse` |

### Cart And Checkout

| Method | Path | Request Example | Response Example |
| --- | --- | --- | --- |
| `GET` | `/api/user/cart` | Header only | `cartResponse` |
| `POST` | `/api/user/cart/items` | `cartItemRequest` | `cartResponse` |
| `PUT` | `/api/user/cart/items/{id}` | `cartItemRequest` | `cartResponse` |
| `DELETE` | `/api/user/cart/items/{id}` | Header only | `cartResponse` |
| `DELETE` | `/api/user/cart` | Header only | `messageResponse` |
| `POST` | `/api/user/cart/checkout` | `checkoutRequest` | `checkoutResponse` |

### Delivery Addresses

| Method | Path | Request Example | Response Example |
| --- | --- | --- | --- |
| `GET` | `/api/user/delivery-addresses` | Header only | `deliveryAddressListResponse` |
| `GET` | `/api/user/delivery-addresses/primary` | Header only | `deliveryAddressResponse` |
| `GET` | `/api/user/delivery-addresses/{id}` | Header only | `deliveryAddressResponse` |
| `POST` | `/api/user/delivery-addresses` | `deliveryAddressRequest` | `deliveryAddressResponse` |
| `PUT` | `/api/user/delivery-addresses/{id}` | `deliveryAddressRequest` | `deliveryAddressResponse` |
| `PUT` | `/api/user/delivery-addresses/{id}/primary` | Header only | `deliveryAddressResponse` |
| `DELETE` | `/api/user/delivery-addresses/{id}` | Header only | `messageResponse` |

### Favorites

| Method | Path | Request Example | Response Example |
| --- | --- | --- | --- |
| `GET` | `/api/user/favorites` | `?targetType=DISH&purchasedOnly=true` | `favoriteListResponse` |
| `POST` | `/api/user/favorites` | `favoriteRequest` | `favoriteResponse` |
| `DELETE` | `/api/user/favorites` | `favoriteRequest` | `messageResponse` |

### Orders, Levels, Reviews, Feedbacks, Notifications

| Method | Path | Request Example | Response Example |
| --- | --- | --- | --- |
| `GET` | `/api/user/orders` | `?page=0&size=10` | `orderPageResponse` |
| `GET` | `/api/user/orders/{id}` | Header only | `orderResponse` |
| `POST` | `/api/user/orders/{id}/refresh-payment` | Header only | `orderResponse` |
| `GET` | `/api/user/levels/current` | `?storeId=1` | `userCurrentLevelResponse` |
| `GET` | `/api/employee/orders` | `?mine=true&search=123&page=0&size=10` | `orderPageResponse` |
| `GET` | `/api/employee/orders/{id}` | Header only | `orderResponse` |
| `POST` | `/api/employee/orders/{id}/accept-preparing` | Header only | `orderResponse` |
| `POST` | `/api/employee/orders/{id}/mark-ready` | Header only | `orderResponse` |
| `POST` | `/api/employee/orders/{id}/accept-delivery` | Header only | `orderResponse` |
| `POST` | `/api/employee/orders/{id}/complete-delivery` | Header only | `orderResponse` |
| `GET` | `/api/employee/notifications` | `?read=false&page=0&size=10` | `notificationPageResponse` |
| `GET` | `/api/employee/notifications/unread-count` | Header only | `userNotificationUnreadCountResponse` |
| `PUT` | `/api/employee/notifications/{id}/read` | Header only | `userNotificationResponse` |
| `PUT` | `/api/employee/notifications/{id}/unread` | Header only | `userNotificationResponse` |
| `PUT` | `/api/employee/notifications/read-all` | Header only | `messageResponse` |
| `GET` | `/api/reviews` or `/api/user/reviews` | `?targetType=STORE&sort=date_desc&page=0&size=10` | `reviewPageResponse` |
| `POST` | `/api/reviews` or `/api/user/reviews` | `userReviewRequest` | `reviewResponse` |
| `PUT` | `/api/reviews/{id}` or `/api/user/reviews/{id}` | `userReviewRequest` | `reviewResponse` |
| `DELETE` | `/api/reviews/{id}` or `/api/user/reviews/{id}` | Header only | `messageResponse` |
| `GET` | `/api/user/feedbacks` | `?page=0&size=10` | `feedbackPageResponse` |
| `GET` | `/api/user/feedbacks/{id}` | Header only | `customerFeedbackResponse` |
| `POST` | `/api/user/feedbacks` | `customerFeedbackRequest` | `customerFeedbackResponse` |
| `DELETE` | `/api/user/feedbacks/{id}` | Header only | `messageResponse` |
| `GET` | `/api/user/notifications` | `?read=false&page=0&size=10` | `notificationPageResponse` |
| `GET` | `/api/user/notifications/unread-count` | Header only | `userNotificationUnreadCountResponse` |
| `PUT` | `/api/user/notifications/{id}/read` | Header only | `userNotificationResponse` |
| `PUT` | `/api/user/notifications/{id}/unread` | Header only | `userNotificationResponse` |
| `PUT` | `/api/user/notifications/read-all` | Header only | `messageResponse` |

## Admin APIs

| Method | Path | Request Example | Response Example |
| --- | --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Optional `?storeId=1` | `adminDashboardResponse` |
| `GET` | `/api/admin/summary` | Optional `?storeId=1` | `adminSummaryResponse` |
| `POST` | `/api/admin/ai/form-drafts/{formType}` | `adminAiFormDraftRequest` | `adminAiFormDraftResponse` |
| `POST` | `/api/admin/uploads/images` | multipart `files`, optional `folder` | `uploadImagesResponse` |
| `GET` | `/api/admin/users` | `?page=0&size=10&search=anna` | `adminUserPageResponse` |
| `GET` | `/api/admin/users/{id}` | Header only | `adminUserResponse` |
| `POST` | `/api/admin/users` | `adminUserRequest` | `adminUserResponse` |
| `PUT` | `/api/admin/users/{id}` | `adminUserRequest` | `adminUserResponse` |
| `PUT` | `/api/admin/users/{id}/verification` | `adminUserVerificationRequest` | `adminUserResponse` |
| `DELETE` | `/api/admin/users/{id}` | Header only | `messageResponse` |
| `GET` | `/api/admin/stores` | `?page=0&size=10&search=q1` | `storePageResponse` |
| `GET` | `/api/admin/stores/{id}` | Header only | `storeResponse` |
| `POST` | `/api/admin/stores` | `storeRequest` | `storeResponse` |
| `PUT` | `/api/admin/stores/{id}` | `storeRequest` | `storeResponse` |
| `PUT` | `/api/admin/stores/{id}/highlights` | `highlightMetadataRequest` | `storeResponse` |
| `DELETE` | `/api/admin/stores/{id}` | Header only | `messageResponse` |
| `GET` | `/api/admin/events` | `?page=0&size=10&search=launch` | `eventPageResponse` |
| `GET` | `/api/admin/events/{id}` | Header only | `eventItemResponse` |
| `POST` | `/api/admin/events` | `eventItemRequest` | `eventItemResponse` |
| `PUT` | `/api/admin/events/{id}` | `eventItemRequest` | `eventItemResponse` |
| `PUT` | `/api/admin/events/{id}/highlights` | `highlightMetadataRequest` | `eventItemResponse` |
| `DELETE` | `/api/admin/events/{id}` | Header only | `messageResponse` |
| `GET` | `/api/admin/categories` | `?page=0&size=10&search=drink` | `categoryPageResponse` |
| `GET` | `/api/admin/categories/{id}` | Header only | `categoryResponse` |
| `POST` | `/api/admin/categories` | `categoryRequest` | `categoryResponse` |
| `PUT` | `/api/admin/categories/{id}` | `categoryRequest` | `categoryResponse` |
| `DELETE` | `/api/admin/categories/{id}` | Header only | `messageResponse` |
| `GET` | `/api/admin/dishes` | `?page=0&size=10&search=matcha` | `dishPageResponse` |
| `GET` | `/api/admin/dishes/{id}` | Header only | `dishResponse` |
| `POST` | `/api/admin/dishes` | `dishRequest` | `dishResponse` |
| `PUT` | `/api/admin/dishes/{id}` | `dishRequest` | `dishResponse` |
| `PUT` | `/api/admin/dishes/{id}/highlights` | `highlightMetadataRequest` | `dishResponse` |
| `DELETE` | `/api/admin/dishes/{id}` | Header only | `messageResponse` |
| `GET` | `/api/admin/news` | `?page=0&size=10&search=guide` | `newsPageResponse` |
| `GET` | `/api/admin/news/{id}` | Header only | `newsArticleResponse` |
| `POST` | `/api/admin/news` | `newsArticleRequest` | `newsArticleResponse` |
| `PUT` | `/api/admin/news/{id}` | `newsArticleRequest` | `newsArticleResponse` |
| `DELETE` | `/api/admin/news/{id}` | Header only | `messageResponse` |
| `GET` | `/api/admin/store-dishes` | `?page=0&size=10&search=matcha` | `storeDishPageResponse` |
| `GET` | `/api/admin/store-dishes/{id}` | Header only | `storeDishResponse` |
| `POST` | `/api/admin/store-dishes` | `storeDishRequest` | `storeDishResponse` |
| `PUT` | `/api/admin/store-dishes/{id}` | `storeDishRequest` | `storeDishResponse` |
| `DELETE` | `/api/admin/store-dishes/{id}` | Header only | `messageResponse` |
| `GET` | `/api/admin/orders` | `?page=0&size=10&stage=PAID` | `orderPageResponse` |
| `GET` | `/api/admin/orders/{id}` | Header only | `orderResponse` |
| `PUT` | `/api/admin/orders/{id}/status` | `orderStatusUpdateRequest` | `orderResponse` |
| `GET` | `/api/admin/promotions` | Header only | `promotionListResponse` |
| `GET` | `/api/admin/promotions/{id}` | Header only | `promotionResponse` |
| `POST` | `/api/admin/promotions` | `promotionRequest` | `promotionResponse` |
| `PUT` | `/api/admin/promotions/{id}` | `promotionRequest` | `promotionResponse` |
| `DELETE` | `/api/admin/promotions/{id}` | Header only | `messageResponse` |
| `GET` | `/api/admin/user-levels` | Header only | `userLevelDefinitionListResponse` |
| `GET` | `/api/admin/user-levels/{id}` | Header only | `userLevelDefinitionResponse` |
| `POST` | `/api/admin/user-levels` | `userLevelDefinitionRequest` | `userLevelDefinitionResponse` |
| `PUT` | `/api/admin/user-levels/{id}` | `userLevelDefinitionRequest` | `userLevelDefinitionResponse` |
| `DELETE` | `/api/admin/user-levels/{id}` | Header only | `messageResponse` |
| `GET` | `/api/admin/feedbacks` | `?page=0&size=10&search=late` | `feedbackPageResponse` |
| `GET` | `/api/admin/feedbacks/{id}` | Header only | `customerFeedbackResponse` |
| `GET` | `/api/admin/feedbacks/{id}/reply` | Header only | `adminFeedbackReplyResponse` |
| `PUT` | `/api/admin/feedbacks/{id}/reply` | `adminFeedbackReplyRequest` | `adminFeedbackReplyResponse` |
| `DELETE` | `/api/admin/feedbacks/{id}/reply` | Header only | `messageResponse` |
| `DELETE` | `/api/admin/feedbacks/{id}` | Header only | `messageResponse` |

## Sample Payloads

### Shared Simple Responses

```json
{
  "messageResponse": {
    "message": "Operation completed successfully"
  },
  "logoutResponse": {
    "message": "Logout successful"
  },
  "userNotificationUnreadCountResponse": {
    "unreadCount": 3
  }
}
```

### Auth

```json
{
  "registerRequest": {
    "fullName": "Nguyen Van A",
    "email": "a@example.com",
    "password": "12345678"
  },
  "registerResponse": {
    "message": "Registration successful. Please verify OTP.",
    "userId": 12,
    "email": "a@example.com",
    "role": "USER",
    "otpExpiresAt": "2026-03-30T07:00:00Z"
  },
  "verifyOtpRequest": {
    "email": "a@example.com",
    "otp": "472915"
  },
  "verifyOtpResponse": {
    "message": "Email verified successfully",
    "user": {
      "id": 12,
      "fullName": "Nguyen Van A",
      "email": "a@example.com",
      "role": "USER",
      "verified": true,
      "verifiedAt": "2026-03-23T07:00:00Z"
    }
  },
  "passwordResetOtpRequest": {
    "email": "user.anna@teamatcha.local"
  },
  "passwordResetOtpResponse": {
    "message": "Password reset OTP sent successfully",
    "email": "user.anna@teamatcha.local",
    "otpExpiresAt": "2026-03-30T08:00:00Z"
  },
  "passwordResetConfirmRequest": {
    "email": "user.anna@teamatcha.local",
    "otp": "472915",
    "newPassword": "NewPassword123"
  },
  "loginRequest": {
    "email": "a@example.com",
    "password": "12345678"
  },
  "googleLoginRequest": {
    "idToken": "google-id-token-from-frontend"
  },
  "googleCompleteProfileRequest": {
    "fullName": "Nguyen Van A",
    "password": "Password123"
  },
  "loginResponse": {
    "message": "Login successful",
    "tokenType": "Bearer",
    "accessToken": "f8f8a9d0c2e1411b9f3d8d5f9e10c001",
    "expiresAt": "2026-03-30T07:00:00Z",
    "user": {
      "id": 12,
      "fullName": "Nguyen Van A",
      "email": "a@example.com",
      "role": "USER",
      "verified": true,
      "profileCompleted": true
    }
  },
  "googleFirstLoginResponse": {
    "message": "Google login successful. Please complete your profile.",
    "tokenType": "Bearer",
    "accessToken": "9cd7e1d2f5a84e90bb89aa3c07c12211",
    "expiresAt": "2026-03-30T07:00:00Z",
    "user": {
      "id": 44,
      "fullName": "Google User",
      "email": "google.user@example.com",
      "role": "USER",
      "verified": true,
      "profileCompleted": false
    }
  },
  "googleCompleteProfileResponse": {
    "message": "Google profile completed successfully",
    "user": {
      "id": 12,
      "fullName": "Nguyen Van A",
      "email": "a@example.com",
      "role": "USER",
      "verified": true,
      "profileCompleted": true
    }
  },
  "meResponse": {
    "message": "Token is valid",
    "expiresAt": "2026-03-30T07:00:00Z",
    "user": {
      "id": 12,
      "fullName": "Nguyen Van A",
      "email": "a@example.com",
      "role": "USER",
      "verified": true,
      "profileCompleted": true
    }
  }
}
```

### Public

```json
{
  "publicHomeResponse": {
    "brand": "Tea Matcha",
    "featuredStores": [
      {
        "id": 1,
        "slug": "tea-house-q1",
        "name": "Tea House Q1",
        "averageRating": 4.8,
        "reviewCount": 128,
        "favoriteCount": 240,
        "availableItemCount": 18
      }
    ],
    "featuredDishes": [
      {
        "id": 88,
        "name": "Matcha Latte",
        "price": 90000,
        "averageRating": 4.9
      }
    ],
    "upcomingEvents": [],
    "storeLocations": [],
    "latestNews": []
  },
  "publicStorePageResponse": {
    "items": [
      {
        "id": 1,
        "slug": "tea-house-q1",
        "name": "Tea House Q1",
        "address": "12 Nguyen Trai, District 1",
        "distanceKm": 1.4,
        "open": true
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "publicStoreDetailResponse": {
    "store": {
      "id": 1,
      "slug": "tea-house-q1",
      "name": "Tea House Q1",
      "description": "Fresh matcha drinks in District 1",
      "sections": [
        {
          "title": "Khong gian workshop",
          "content": "Co slow bar va workshop cuoi tuan.",
          "imagePath": "/uploads/stores/workshop.jpg"
        }
      ]
    },
    "stats": {
      "averageRating": 4.8,
      "reviewCount": 128,
      "favoriteCount": 240,
      "availableItemCount": 18
    },
    "categories": [],
    "events": [],
    "reviews": []
  },
  "publicDishDetailResponse": {
    "dish": {
      "id": 88,
      "name": "Matcha Latte",
      "description": "Creamy matcha latte",
      "sections": [
        {
          "title": "Huong vi",
          "content": "Kem sua va bot matcha xay moi.",
          "imagePath": "/uploads/dishes/flavor.jpg"
        }
      ]
    },
    "stats": {
      "averageRating": 4.9,
      "reviewCount": 88,
      "orderCount": 340,
      "favoriteCount": 210,
      "totalStock": 20
    },
    "stores": [],
    "reviews": [],
    "relatedDishes": []
  },
  "publicEventDetailResponse": {
    "id": 301,
    "slug": "matcha-launch-week",
    "storeId": 1,
    "storeSlug": "tea-house-q1",
    "storeName": "Tea House Q1",
    "title": "Matcha Launch Week",
    "description": "Su kien gioi thieu menu moi",
    "sections": [
      {
        "title": "Lich trinh",
        "content": "Mo dau bang tasting set.",
        "imagePath": "/uploads/events/schedule.jpg"
      }
    ]
  },
  "publicNewsDetailResponse": {
    "id": 901,
    "title": "Matcha Guide Thang 4",
    "slug": "matcha-guide-thang-4",
    "summary": "Huong dan pha matcha va goi y thuc don",
    "content": "Noi dung bai viet chi tiet",
    "sections": [
      {
        "title": "Nguon cam hung",
        "content": "Bai viet mang tinh editorial ngan.",
        "imagePath": "/uploads/news/inspiration.jpg"
      }
    ]
  },
  "publicReviewPageResponse": {
    "items": [
      {
        "id": 1,
        "targetType": "STORE",
        "targetId": 1,
        "targetLabel": "Store: Tea House Q1",
        "rating": 5,
        "title": "Great service",
        "comment": "Fast service, drinks are fresh and tasty."
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

### User APIs

```json
{
  "aiChatQueryRequest": {
    "message": "Cua hang nao o Quan 1 co matcha latte va voucher giam gia?",
    "history": [
      {
        "role": "user",
        "content": "Cho minh xem tin tuc moi"
      }
    ]
  },
  "aiChatResponse": {
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
  },
  "cartItemRequest": {
    "storeId": 1,
    "dishId": 88,
    "quantity": 2
  },
  "cartResponse": {
    "id": 101,
    "userId": 12,
    "status": "OPEN",
    "items": [
      {
        "id": 5001,
        "storeId": 1,
        "dishId": 88,
        "dishName": "Matcha Latte",
        "quantity": 2,
        "unitPrice": 90000,
        "totalPrice": 180000
      }
    ],
    "totalItems": 2,
    "subtotal": 180000
  },
  "checkoutRequest": {
    "deliveryAddressId": 101,
    "promotionCode": "MATCHA10",
    "deliveryType": "IMMEDIATE",
    "scheduledDeliveryAt": null,
    "returnUrl": "https://frontend.example.com/checkout/success",
    "cancelUrl": "https://frontend.example.com/checkout/cancel"
  },
  "checkoutResponse": {
    "id": 501,
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "paymentCheckoutUrl": "https://payos.vn/checkout/123",
    "totalAmount": 162000,
    "orders": [
      {
        "id": 701,
        "storeId": 1,
        "storeName": "Tea House Q1",
        "status": "PENDING",
        "paymentStatus": "PENDING",
        "totalAmount": 162000
      }
    ]
  },
  "deliveryAddressRequest": {
    "fullName": "Nguyen Van A",
    "phoneNumber": "0909123456",
    "deliveryAddress": "12 Nguyen Trai, District 1",
    "primary": true
  },
  "deliveryAddressResponse": {
    "id": 101,
    "userId": 12,
    "fullName": "Nguyen Van A",
    "phoneNumber": "0909123456",
    "deliveryAddress": "12 Nguyen Trai, District 1",
    "primary": true,
    "verified": true
  },
  "favoriteRequest": {
    "targetType": "DISH",
    "targetId": 88
  },
  "favoriteResponse": {
    "id": 1,
    "targetType": "DISH",
    "targetId": 88,
    "targetLabel": "Dish: Matcha Latte",
    "purchased": true
  },
  "orderResponse": {
    "id": 701,
    "storeId": 1,
    "storeName": "Tea House Q1",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "totalAmount": 162000,
    "statusSummary": "Khach chua thanh toan"
  },
  "orderPageResponse": {
    "items": [
      {
        "id": 701,
        "storeId": 1,
        "storeName": "Tea House Q1",
        "status": "PENDING",
        "paymentStatus": "PENDING",
        "totalAmount": 162000
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "userCurrentLevelResponse": [
    {
      "storeId": 1,
      "storeSlug": "tea-house-q1",
      "storeName": "Tea House Q1",
      "currentYear": 2026,
      "currentQuarter": 1,
      "evaluatedYear": 2025,
      "evaluatedQuarter": 4,
      "qualifyingPaidAmount": 320000,
      "levelId": 5,
      "levelCode": "SILVER",
      "levelName": "Silver",
      "levelMinPaidAmount": 300000
    }
  ],
  "employeeTaskNotificationResponse": {
    "id": 91,
    "type": "ORDER_TASK",
    "title": "Don hang da thanh toan #701",
    "message": "Don hang #701 tai Tea House Q1 da thanh toan. Nhan vien vui long nhan xu ly.",
    "relatedOrderId": 701,
    "orderId": 701,
    "relatedStoreId": 1,
    "relatedStoreName": "Tea House Q1",
    "actionUrl": "/employee/orders/701",
    "read": false,
    "readAt": null,
    "createdAt": "2026-03-28T08:00:00Z",
    "updatedAt": "2026-03-28T08:00:00Z"
  },
  "employeeTaskNotificationPageResponse": {
    "items": [
      {
        "id": 91,
        "type": "ORDER_TASK",
        "title": "Don hang da thanh toan #701",
        "relatedOrderId": 701,
        "actionUrl": "/employee/orders/701",
        "read": false
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "employeeOrderResponse": {
    "id": 701,
    "userId": 44,
    "storeId": 1,
    "storeSlug": "tea-house-q1",
    "storeName": "Tea House Q1",
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "paymentProvider": "PAYOS",
    "paidAt": "2026-03-28T08:00:00Z",
    "subtotalAmount": 65000,
    "discountAmount": 0,
    "totalAmount": 65000,
    "deliveryType": "IMMEDIATE",
    "deliveryFullName": "Nguyen Van A",
    "deliveryPhoneNumber": "0901234567",
    "deliveryAddress": "12 Nguyen Hue, Quan 1, TP HCM",
    "preparingStaffId": null,
    "preparingStaffName": null,
    "deliveringShipperId": null,
    "deliveringShipperName": null,
    "statusSummary": "Khach da thanh toan",
    "items": [
      {
        "id": 801,
        "storeId": 1,
        "storeSlug": "tea-house-q1",
        "storeName": "Tea House Q1",
        "dishId": 88,
        "dishName": "Iced Matcha Latte",
        "quantity": 1,
        "unitPrice": 65000,
        "lineTotal": 65000
      }
    ]
  },
  "employeeOrderPageResponse": {
    "items": [
      {
        "id": 701,
        "storeId": 1,
        "storeName": "Tea House Q1",
        "status": "CONFIRMED",
        "paymentStatus": "PAID",
        "preparingStaffId": null,
        "deliveringShipperId": null,
        "statusSummary": "Khach da thanh toan"
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "staffAcceptedOrderResponse": {
    "id": 701,
    "status": "PREPARING",
    "paymentStatus": "PAID",
    "preparingStaffId": 15,
    "preparingStaffName": "Barista A",
    "statusSummary": "Nhan vien Barista A dang lam mon"
  },
  "staffReadyOrderResponse": {
    "id": 701,
    "status": "READY_FOR_SHIPPER",
    "paymentStatus": "PAID",
    "preparingStaffId": 15,
    "preparingStaffName": "Barista A",
    "statusSummary": "Da lam xong - cho shipper"
  },
  "shipperAcceptedOrderResponse": {
    "id": 701,
    "status": "OUT_FOR_DELIVERY",
    "paymentStatus": "PAID",
    "deliveringShipperId": 16,
    "deliveringShipperName": "Shipper B",
    "statusSummary": "Shipper B dang giao hang"
  },
  "shipperCompletedOrderResponse": {
    "id": 701,
    "status": "COMPLETED",
    "paymentStatus": "PAID",
    "deliveringShipperId": 16,
    "deliveringShipperName": "Shipper B",
    "statusSummary": "Shipper B da giao hang thanh cong"
  },
  "userReviewRequest": {
    "targetType": "STORE",
    "targetId": 1,
    "rating": 5,
    "title": "Great service",
    "comment": "Fast service, drinks are fresh and tasty."
  },
  "reviewResponse": {
    "id": 21,
    "targetType": "STORE",
    "targetId": 1,
    "targetLabel": "Store: Tea House Q1",
    "rating": 5,
    "title": "Great service",
    "comment": "Fast service, drinks are fresh and tasty.",
    "approved": true
  },
  "customerFeedbackRequest": {
    "category": "DELIVERY",
    "relatedOrderId": 701,
    "relatedStoreId": 1,
    "subject": "Late delivery",
    "message": "My order arrived 20 minutes late."
  },
  "customerFeedbackResponse": {
    "id": 12,
    "category": "DELIVERY",
    "relatedStoreId": 1,
    "relatedOrderId": 701,
    "relatedOrderStatus": "COMPLETED",
    "relatedOrderPaymentStatus": "PAID",
    "subject": "Late delivery",
    "message": "My order arrived 20 minutes late.",
    "replyMessage": "Tea Matcha da ghi nhan va se bo sung nhan su gio cao diem."
  },
  "feedbackPageResponse": {
    "items": [
      {
        "id": 12,
        "category": "DELIVERY",
        "subject": "Late delivery",
        "relatedOrderId": 701
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "userNotificationResponse": {
    "id": 21,
    "type": "ORDER_STATUS",
    "title": "Cap nhat don hang #701",
    "message": "Don hang #701 dang duoc giao den ban.",
    "relatedOrderId": 701,
    "relatedStoreId": 1,
    "relatedStoreName": "Tea House Q1",
    "actionUrl": "/orders/701",
    "read": false
  },
  "notificationPageResponse": {
    "items": [
      {
        "id": 21,
        "type": "ORDER_STATUS",
        "title": "Cap nhat don hang #701",
        "read": false
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "employeeAttendanceSummaryResponse": "disabled"
}
```

### Admin APIs

```json
{
  "adminUserRequest": {
    "fullName": "Staff A",
    "email": "staff@example.com",
    "password": "12345678",
    "role": "STAFF",
    "workingStoreId": 1,
    "enabled": true
  },
  "adminUserVerificationRequest": {
    "verified": true
  },
  "adminUserResponse": {
    "id": 15,
    "fullName": "Staff A",
    "email": "staff@example.com",
    "role": "STAFF",
    "workingStoreId": 1,
    "workingStoreName": "Tea House Q1",
    "enabled": true,
    "verified": true
  },
  "highlightMetadataRequest": {
    "highlightSummary": "Best seller matcha drinks",
    "highlightTags": ["Matcha", "Fresh"]
  },
  "storeRequest": {
    "name": "Tea House Q1",
    "description": "Fresh matcha drinks in District 1",
    "address": "12 Nguyen Trai, District 1",
    "contactEmail": "store@example.com",
    "phoneNumber": "0909123456",
    "slug": "tea-house-q1",
    "imagePaths": ["/uploads/stores/tea-house-q1.jpg"],
    "sections": [
      {
        "title": "Khong gian workshop",
        "content": "Co slow bar va workshop cuoi tuan.",
        "imagePath": "/uploads/stores/workshop.jpg"
      }
    ],
    "active": true
  },
  "storeResponse": {
    "id": 1,
    "slug": "tea-house-q1",
    "name": "Tea House Q1",
    "sections": [
      {
        "title": "Khong gian workshop",
        "content": "Co slow bar va workshop cuoi tuan.",
        "imagePath": "/uploads/stores/workshop.jpg"
      }
    ],
    "active": true
  },
  "eventItemRequest": {
    "storeId": 1,
    "name": "Spring Matcha Party",
    "description": "Limited event for spring menu",
    "location": "Tea House Q1",
    "imagePaths": ["/uploads/events/spring-party.jpg"],
    "sections": [
      {
        "title": "Lich trinh",
        "content": "Mo dau bang tasting set.",
        "imagePath": "/uploads/events/schedule.jpg"
      }
    ],
    "startsAt": "2026-03-25T10:00:00Z",
    "endsAt": "2026-03-30T10:00:00Z",
    "active": true
  },
  "eventItemResponse": {
    "id": 301,
    "slug": "spring-matcha-party",
    "storeId": 1,
    "storeName": "Tea House Q1",
    "name": "Spring Matcha Party",
    "sections": [
      {
        "title": "Lich trinh",
        "content": "Mo dau bang tasting set.",
        "imagePath": "/uploads/events/schedule.jpg"
      }
    ]
  },
  "categoryRequest": {
    "storeId": 1,
    "name": "Drinks",
    "description": "Matcha and tea drinks",
    "imagePaths": ["/uploads/categories/drinks.jpg"],
    "sortOrder": 1,
    "active": true
  },
  "categoryResponse": {
    "id": 9,
    "storeId": 1,
    "storeName": "Tea House Q1",
    "name": "Drinks",
    "active": true
  },
  "dishRequest": {
    "categoryId": 9,
    "name": "Matcha Latte",
    "description": "Creamy matcha latte",
    "note": "Less sugar by default",
    "price": 90000,
    "status": "ACTIVE",
    "available": true,
    "highlightTags": ["Popular"],
    "sections": [
      {
        "title": "Huong vi",
        "content": "Kem sua va bot matcha xay moi.",
        "imagePath": "/uploads/dishes/flavor.jpg"
      }
    ],
    "active": true
  },
  "dishResponse": {
    "id": 88,
    "categoryId": 9,
    "categoryName": "Drinks",
    "name": "Matcha Latte",
    "price": 90000,
    "sections": [
      {
        "title": "Huong vi",
        "content": "Kem sua va bot matcha xay moi.",
        "imagePath": "/uploads/dishes/flavor.jpg"
      }
    ],
    "active": true,
    "available": true
  },
  "newsArticleRequest": {
    "title": "Tea Matcha Airport Hub khai truong",
    "slug": "tea-matcha-airport-hub-khai-truong",
    "summary": "Chi nhanh moi gan san bay da san sang don khach.",
    "content": "Tea Matcha chinh thuc mo them diem ban tai khu vuc san bay.",
    "relatedStoreId": 3,
    "tags": ["khai-truong", "san-bay"],
    "imagePaths": ["/uploads/news/airport-hub-1.jpg"],
    "sections": [
      {
        "title": "Nguon cam hung",
        "content": "Bai viet mang tinh editorial ngan.",
        "imagePath": "/uploads/news/inspiration.jpg"
      }
    ],
    "featured": true,
    "published": true
  },
  "newsArticleResponse": {
    "id": 901,
    "title": "Tea Matcha Airport Hub khai truong",
    "slug": "tea-matcha-airport-hub-khai-truong",
    "summary": "Chi nhanh moi gan san bay da san sang don khach.",
    "relatedStoreId": 3,
    "relatedStoreSlug": "airport-hub",
    "relatedStoreName": "Tea Matcha Airport Hub",
    "sections": [
      {
        "title": "Nguon cam hung",
        "content": "Bai viet mang tinh editorial ngan.",
        "imagePath": "/uploads/news/inspiration.jpg"
      }
    ],
    "featured": true,
    "published": true
  },
  "storeDishRequest": {
    "storeId": 1,
    "dishId": 88,
    "quantity": 20,
    "available": true,
    "priceOverride": 88000
  },
  "storeDishResponse": {
    "id": 31,
    "storeId": 1,
    "storeName": "Tea House Q1",
    "dishId": 88,
    "dishName": "Matcha Latte",
    "quantity": 20,
    "available": true,
    "effectivePrice": 88000
  },
  "orderStatusUpdateRequest": {
    "status": "PREPARING",
    "paymentStatus": "PAID",
    "preparingStaffId": 21,
    "deliveringShipperId": null
  },
  "promotionRequest": {
    "code": "MATCHA10",
    "name": "Matcha Festival Promo",
    "description": "10 percent off for orders",
    "scope": "ORDER",
    "discountType": "PERCENT",
    "discountValue": 10,
    "minimumOrderAmount": 100000,
    "maximumDiscountAmount": 30000,
    "minStoreBillAmount": 100000,
    "minCrossStoreBillAmount": 250000,
    "eligibleStoreIds": [1, 2],
    "eligibleUserLevelIds": [5, 6],
    "active": true
  },
  "promotionResponse": {
    "id": 41,
    "code": "MATCHA10",
    "name": "Matcha Festival Promo",
    "scope": "ORDER",
    "discountType": "PERCENT",
    "discountValue": 10,
    "eligibleStoreIds": [1, 2],
    "eligibleUserLevelIds": [5, 6],
    "active": true
  },
  "promotionListResponse": [
    {
      "id": 41,
      "code": "MATCHA10",
      "name": "Matcha Festival Promo",
      "scope": "ORDER",
      "active": true
    }
  ],
  "userLevelDefinitionRequest": {
    "storeId": 1,
    "code": "SILVER",
    "name": "Silver",
    "minPaidAmount": 300000,
    "active": true
  },
  "userLevelDefinitionResponse": {
    "id": 5,
    "storeId": 1,
    "storeSlug": "tea-house-q1",
    "storeName": "Tea House Q1",
    "code": "SILVER",
    "name": "Silver",
    "minPaidAmount": 300000,
    "active": true
  },
  "userLevelDefinitionListResponse": [
    {
      "id": 5,
      "storeId": 1,
      "code": "SILVER",
      "name": "Silver",
      "minPaidAmount": 300000,
      "active": true
    }
  ],
  "adminFeedbackReplyRequest": {
    "replyMessage": "Tea Matcha da ghi nhan feedback va se xu ly trong ca lam viec tiep theo."
  },
  "adminFeedbackReplyResponse": {
    "feedbackId": 12,
    "replyMessage": "Tea Matcha da ghi nhan feedback va se xu ly trong ca lam viec tiep theo.",
    "repliedAt": "2026-03-24T05:10:00Z",
    "repliedByUserId": 1,
    "repliedByUserName": "Platform Admin",
    "repliedByUserRole": "ADMIN"
  },
  "uploadImagesResponse": {
    "message": "Uploaded 2 image(s) successfully.",
    "paths": [
      "/uploads/stores/store-1.jpg",
      "/uploads/stores/store-2.jpg"
    ]
  },
  "adminAiFormDraftRequest": {
    "prompt": "Tao mot cua hang phong cach Nhat tai Quan 1, tone go am, co workshop cuoi tuan",
    "storeId": 1,
    "currentForm": {}
  },
  "adminAiFormDraftResponse": {
    "formType": "STORE",
    "draft": {
      "name": "Tea Matcha Sakura Q1",
      "description": "Khong gian matcha phong cach Nhat voi tone go am va workshop cuoi tuan.",
      "address": "25 Nguyen Hue, District 1, Ho Chi Minh City",
      "area": "District 1",
      "hoursText": "08:00 - 22:00",
      "openTime": "08:00:00",
      "closeTime": "22:00:00",
      "personality": "Tinh te va am ap",
      "designSignature": "Go sang mau va ban workshop",
      "specialty": "Usucha va matcha latte",
      "highlightSummary": "Chi nhanh tap trung workshop va menu matcha thu cong",
      "highlightTags": ["Workshop", "Matcha", "Japanese style"],
      "serviceTags": ["Dine-in", "Takeaway"],
      "imagePaths": [],
      "sections": [],
      "active": true
    },
    "warnings": [],
    "missingFields": [],
    "scopeStoreId": 1,
    "scopeStoreName": "Tea House Q1",
    "model": "gpt-5.4-nano"
  },
  "adminDashboardResponse": {
    "users": [],
    "stores": [],
    "events": [],
    "categories": [],
    "dishes": [],
    "storeDishes": [],
    "orders": [],
    "reviews": [],
    "feedbacks": [],
    "promotions": [],
    "news": [],
    "topSellingDishes": [
      {
        "storeId": 1,
        "storeName": "Tea House Q1",
        "dishId": 88,
        "dishName": "Matcha Latte",
        "imagePaths": ["/uploads/dishes/matcha-latte.jpg"],
        "quantitySold": 124,
        "orderCount": 98,
        "revenue": 11160000
      }
    ],
    "revenue": {
      "scopeStoreId": null,
      "scopeStoreName": "All stores",
      "todayRevenue": 3500000,
      "weekRevenue": 18900000,
      "monthRevenue": 74400000,
      "yearRevenue": 311250000
    }
  },
  "adminSummaryResponse": {
    "userCount": 24,
    "storeCount": 5,
    "eventCount": 12,
    "categoryCount": 8,
    "dishCount": 42,
    "storeDishCount": 60,
    "promotionCount": 4,
    "orderCount": 280,
    "reviewCount": 180,
    "newsCount": 16,
    "revenue": {
      "scopeStoreId": null,
      "scopeStoreName": "All stores",
      "todayRevenue": 3500000,
      "weekRevenue": 18900000,
      "monthRevenue": 74400000,
      "yearRevenue": 311250000
    }
  },
  "adminUserPageResponse": {
    "items": [
      {
        "id": 15,
        "fullName": "Staff A",
        "email": "staff@example.com",
        "role": "STAFF"
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "storePageResponse": {
    "items": [
      {
        "id": 1,
        "slug": "tea-house-q1",
        "name": "Tea House Q1"
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "eventPageResponse": {
    "items": [
      {
        "id": 301,
        "slug": "spring-matcha-party",
        "name": "Spring Matcha Party"
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "categoryPageResponse": {
    "items": [
      {
        "id": 9,
        "name": "Drinks"
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "dishPageResponse": {
    "items": [
      {
        "id": 88,
        "name": "Matcha Latte"
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "newsPageResponse": {
    "items": [
      {
        "id": 901,
        "title": "Matcha Guide Thang 4",
        "slug": "matcha-guide-thang-4"
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "storeDishPageResponse": {
    "items": [
      {
        "id": 31,
        "storeId": 1,
        "dishId": 88,
        "quantity": 20
      }
    ],
    "page": 0,
    "size": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```
