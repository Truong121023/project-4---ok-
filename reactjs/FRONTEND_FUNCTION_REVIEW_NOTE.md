# Frontend Function Review Note

Updated on 2026-04-11.

Purpose: this note gives a high-level review map of the frontend codebase.
It is intentionally not API- or DTO-heavy. Use it when you need to know which frontend file or module is responsible for which main function.

## 1. App Shell And Entry

- `src/main.jsx`
  - App bootstrap
  - Mounts providers such as auth, site data, toast, and router entry
- `src/App.jsx`
  - Main route map
  - Splits the app into:
    - public storefront
    - authenticated account area
    - `USER` order/payment area
    - `STAFF`/`SHIPPER` workspace
    - `ADMIN`/`MANAGER` admin panel
- `src/components/SiteLayout.jsx`
  - Shared site layout
  - Header, navigation, account drawer, notification center, shared footer
  - Entry point for shared widgets such as support chat
- `src/components/ProtectedRoute.jsx`
  - Route guard
  - Session check, role check, profile-complete check
- `src/components/RouteErrorBoundary.jsx`
  - Route-level render error protection
- `src/components/SessionSecurityOverlay.jsx`
  - Session invalid/expired handling UI

## 2. Public Storefront Pages

- `src/pages/HomePage.jsx`
  - Landing/home experience
  - Featured content, brand intro, discovery entry
- `src/pages/StoresPage.jsx`
  - Store listing and browsing
- `src/pages/StoreDetailPage.jsx`
  - Store detail screen
  - Store profile, sections, related content
- `src/pages/MenuPage.jsx`
  - Dish/menu listing
- `src/pages/DishDetailPage.jsx`
  - Dish detail screen
  - Dish sections, store availability, related content
- `src/pages/EventsPage.jsx`
  - Event listing
- `src/pages/EventDetailPage.jsx`
  - Event detail screen
- `src/pages/NewsPage.jsx`
  - News/article listing
- `src/pages/NewsDetailPage.jsx`
  - News/article detail screen
- `src/pages/ReviewsPage.jsx`
  - Public review browsing

## 3. Auth And Session Pages

- `src/pages/LoginPage.jsx`
  - Email/password login
  - Google login entry
- `src/pages/RegisterPage.jsx`
  - User registration
- `src/pages/VerifyOtpPage.jsx`
  - OTP verification flow
- `src/pages/ForgotPasswordPage.jsx`
  - Password reset via OTP
- `src/pages/GoogleCompleteProfilePage.jsx`
  - First Google-login profile completion
- `src/pages/UnauthorizedPage.jsx`
  - Access denied / wrong role screen

## 4. User Shopping And Account Area

- `src/pages/CartPage.jsx`
  - Cart UI
  - Quantity update, remove item, checkout start
- `src/pages/OrdersPage.jsx`
  - `USER` order history and order detail
  - Payment refresh/retry, invoice access
- `src/pages/PaymentStatusPage.jsx`
  - Payment return/cancel screen
  - PayOS result handling and follow-up actions
- `src/pages/AccountPage.jsx`
  - Main authenticated user account area
  - Overview and self-service account functions
  - Own favorites, addresses, reviews, feedback, notifications, membership view

## 5. AI And Support

- `src/pages/AIChatPage.jsx`
  - Full-page AI assistant screen
- `src/components/AIChatWidget.jsx`
  - Main AI chat UI and flow
  - Thread list/history
  - Active conversation
  - AI references and quick actions
  - Add-to-cart and deep-link actions
- `src/components/SupportChatWidget.jsx`
  - User/admin/manager realtime support chat UI
- `src/context/SupportChatContext.jsx`
  - Support chat socket/session state

## 6. Employee Workspace

- `src/pages/EmployeePage.jsx`
  - `STAFF` and `SHIPPER` workspace
  - Employee notifications
  - Assigned and available orders
  - Kitchen/delivery actions
  - Delivery proof flow if enabled
  - QR/order action handling for employee-side workflow

## 7. Admin And Manager Panel

- `src/pages/AdminPage.jsx`
  - Main admin/manager dashboard and management workspace
  - Role-aware admin UI
  - Dashboard/summary
  - CRUD areas such as:
    - users
    - stores
    - events
    - categories
    - dishes
    - store dishes
    - news
    - promotions
    - user levels
    - orders
    - reviews
    - feedback moderation
  - AI draft assist integration
  - Invoice preview flow
  - Order workflow view and admin actions
- `src/components/admin/adminSchema.js`
  - Admin form definitions and draft hydrate/serialize logic
- `src/components/admin/AdminFormField.jsx`
  - Reusable admin form field renderer
  - Handles complex field types such as image gallery and content sections

## 8. Shared UI Components

- `src/components/ContentSectionsBlock.jsx`
  - Shared renderer for long-form `sections[]` content
- `src/components/InvoicePreviewModal.jsx`
  - Modal invoice preview and print flow
- `src/components/OrderStatusTracker.jsx`
  - Shared order stage/timeline visualization
- `src/components/OrderQrCard.jsx`
  - Shared order QR card UI
- `src/components/QuickAddToCartButton.jsx`
  - Reusable add-to-cart trigger
- `src/components/QuickFavoriteButton.jsx`
  - Reusable favorite toggle
- `src/components/UserReviewForm.jsx`
  - Reusable review form
- `src/components/UserFeedbackForm.jsx`
  - Reusable feedback form
- `src/components/DetailModal.jsx`
  - Shared modal for detail presentation
- `src/components/ImageGalleryModal.jsx`
  - Image preview/gallery modal
- `src/components/MediaLibrary.jsx`
  - Media/image selection utility UI
- `src/components/SmartImage.jsx`
  - Shared image rendering with fallback handling
- `src/components/AutoCarousel.jsx`
  - Shared rotating/slider-style visual block
- `src/components/DistanceOriginControls.jsx`
  - Distance/location origin control UI

## 9. State And Providers

- `src/context/AuthContext.jsx`
  - Auth/session source of truth
  - Login, logout, restore session, Google auth integration
- `src/context/SiteDataContext.jsx`
  - Shared app state for user-side features
  - Cart, favorites, reviews, feedbacks, notifications, checkout helpers
- `src/context/ToastContext.jsx`
  - App-wide custom toast/notification system
- `src/hooks/useToastMessage.js`
  - Convenience hook for toast-based feedback

## 10. Core Lib Modules

- `src/lib/api.js`
  - Base API request layer
  - Auth header/session error handling
- `src/lib/siteApi.js`
  - Main backend integration layer for app features
  - Request/response normalization for user, employee, admin, AI, notifications, orders
- `src/lib/authRedirects.js`
  - Role/profile-based redirect helpers
- `src/lib/googleIdentity.js`
  - Google Sign-In helper logic
- `src/lib/images.js`
  - Image URL normalization and asset helpers
- `src/lib/orderStatus.js`
  - Order status labels, allowed actions, and status helpers
- `src/lib/orderWorkflow.js`
  - Invoice, QR, and order workflow helpers
- `src/lib/paymentSession.js`
  - Payment-session-related helpers
- `src/lib/cartAvailability.js`
  - Cart availability decision rules
- `src/lib/demoAvailability.js`
  - Demo availability helpers/fallbacks
- `src/lib/demoCatalog.js`
  - Demo content/catalog helpers
- `src/lib/eventRouting.js`
  - Event route/path helpers
- `src/lib/newsRouting.js`
  - News route/path helpers
- `src/lib/storeRouting.js`
  - Store route/path helpers
- `src/lib/externalNavigation.js`
  - External redirect/navigation helpers
- `src/lib/locationLookup.js`
  - Location utilities
- `src/lib/timeFilters.js`
  - Time/date filter helpers
- `src/lib/feedbackCategories.js`
  - Feedback category definitions

## 11. App Styling And Static Content

- `src/ui.js`
  - Shared UI utility class presets
- `src/styles.css`
  - Global styles and animations
- `src/siteContent.js`
  - Shared navigation labels and static copy
- `src/data.js`
  - Local/static data helpers if needed

## 12. Role-Level Frontend Summary

- `USER`
  - Public browsing
  - Cart and checkout
  - Orders and payment
  - Account self-service
  - Reviews, feedback, notifications
  - AI chat
  - Support chat
- `STAFF`
  - Employee workspace
  - Order preparation flow
  - Employee notifications
  - AI chat
- `SHIPPER`
  - Employee workspace
  - Delivery flow
  - Employee notifications
  - AI chat
- `MANAGER`
  - Store-scoped admin panel
  - Moderation and order management
  - Employee management in own store
  - AI chat
  - Support inbox
- `ADMIN`
  - Full admin dashboard and system-wide management
  - AI draft assist
  - AI chat
  - Support inbox

## 13. Short Review Conclusion

If you need to review the frontend quickly:

- Start with `src/App.jsx` to understand app areas by route and role
- Use `src/pages/*` to understand end-user and role-specific screens
- Use `src/context/*` to understand app-wide state and auth/session behavior
- Use `src/lib/siteApi.js` and `src/lib/api.js` to understand backend integration boundaries
- Use `src/pages/AdminPage.jsx`, `src/pages/EmployeePage.jsx`, and `src/pages/AccountPage.jsx` as the three biggest feature hubs

## 14. Route Map

### Public routes

- `/`
  - Home page
  - File: `src/pages/HomePage.jsx`
- `/stores`
  - Store list
  - File: `src/pages/StoresPage.jsx`
- `/stores/:storeKey`
  - Store detail
  - File: `src/pages/StoreDetailPage.jsx`
- `/menu`
  - Dish/menu list
  - File: `src/pages/MenuPage.jsx`
- `/menu/:itemId`
  - Dish detail
  - File: `src/pages/DishDetailPage.jsx`
- `/events`
  - Event list
  - File: `src/pages/EventsPage.jsx`
- `/events/:eventKey`
  - Event detail
  - File: `src/pages/EventDetailPage.jsx`
- `/news`
  - News list
  - File: `src/pages/NewsPage.jsx`
- `/news/:newsKey`
  - News detail
  - File: `src/pages/NewsDetailPage.jsx`
- `/reviews`
  - Public review list
  - File: `src/pages/ReviewsPage.jsx`

### Auth routes

- `/login`
  - Login page
  - File: `src/pages/LoginPage.jsx`
- `/register`
  - Register page
  - File: `src/pages/RegisterPage.jsx`
- `/verify-otp`
  - OTP verification
  - File: `src/pages/VerifyOtpPage.jsx`
- `/forgot-password`
  - Password reset by OTP
  - File: `src/pages/ForgotPasswordPage.jsx`
- `/complete-profile`
  - Google first-login profile completion
  - File: `src/pages/GoogleCompleteProfilePage.jsx`
- `/unauthorized`
  - Unauthorized / wrong role
  - File: `src/pages/UnauthorizedPage.jsx`

### Shared authenticated routes

- `/account/*`
  - Main account area
  - File: `src/pages/AccountPage.jsx`
- `/ai-chat`
  - Full AI chat page
  - File: `src/pages/AIChatPage.jsx`
- `/cart`
  - Cart page
  - File: `src/pages/CartPage.jsx`

### USER-only routes

- `/orders`
  - User order history
  - File: `src/pages/OrdersPage.jsx`
- `/orders/:orderId`
  - User order detail
  - File: `src/pages/OrdersPage.jsx`
- `/payment/success`
  - Payment success return page
  - File: `src/pages/PaymentStatusPage.jsx`
- `/payment/cancel`
  - Payment cancel return page
  - File: `src/pages/PaymentStatusPage.jsx`

### STAFF / SHIPPER routes

- `/employee`
  - Employee workspace
  - File: `src/pages/EmployeePage.jsx`
- `/employee/orders/:orderId`
  - Employee order detail/workflow
  - File: `src/pages/EmployeePage.jsx`

### ADMIN / MANAGER routes

- `/admin`
  - Admin/manager panel main screen
  - File: `src/pages/AdminPage.jsx`
- `/admin/orders/:orderId`
  - Admin/manager order detail focus
  - File: `src/pages/AdminPage.jsx`
- `/admin.html`
  - Legacy admin entry route
  - File: `src/pages/AdminPage.jsx`
