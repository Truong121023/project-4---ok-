# Tea Matcha Mobile

Flutter mobile scaffold based on:

- `FRONTEND_USER_API.md`
- `API_QUICK_REFERENCE.md`

Current scope:

- Public storefront browsing: home, stores, dishes, news
- Real sign-in with `/api/auth/login` and `/api/auth/me`
- Register -> verify OTP -> auto sign-in
- Password reset with OTP
- Real cart sync with `/api/user/cart`
- Delivery address book with `/api/user/delivery-addresses`
- Real checkout with `/api/user/cart/checkout`
- Profile with order list from `/api/user/orders`

## Default backend

The app now defaults to the real backend:

```bash
http://192.168.123.5:8080
```

You can still force mock mode if needed:

```bash
flutter run --dart-define=USE_MOCK_DATA=true
```

Real API mode:

```bash
flutter run --dart-define=USE_MOCK_DATA=false --dart-define=API_BASE_URL=http://192.168.123.5:8080
```

## Notes

- `returnUrl` and `cancelUrl` for checkout currently default to:
  - `<API_BASE_URL>/checkout/success`
  - `<API_BASE_URL>/checkout/cancel`
- If your payment flow needs deep links instead, update `AppConfig`.
- Admin and employee mobile flows are not implemented yet in this app.

## If native folders are missing

If this folder does not yet contain `android/`, `ios/`, and other generated Flutter platform folders, install Flutter SDK and run:

```bash
flutter create --platforms=android,ios .
flutter pub get
```
