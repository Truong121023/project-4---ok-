# Frontend Session Security Note

Updated on 2026-04-06.

Purpose: this file explains how frontend should handle session token invalidation when the same account logs in on another device.

Use this together with:
- `FRONTEND_ROLE_API_NOTE.md`
- `FRONTEND_USER_ROLE_NOTE.md`

## 1. Current Backend Behavior

Backend currently uses a single-session policy per account.

When a user logs in successfully through:
- `POST /api/auth/login`
- `POST /api/auth/google/login`

backend deletes all previous sessions of that user, then creates one new session token.

This means:
- login on device B will invalidate the old token on device A
- password reset also invalidates all old sessions
- token lifetime is still `7 days`, but an old token can become invalid immediately if a newer login replaces it

## 2. Exact Error Signals From Backend

Protected APIs use `Authorization: Bearer <accessToken>`.

If frontend sends an old token that was replaced by a newer login, backend returns:

```json
{
  "timestamp": "2026-04-06T03:10:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Token is invalid",
  "path": "/api/auth/me",
  "validationErrors": {}
}
```

If token is truly expired by time, backend returns:

```json
{
  "timestamp": "2026-04-06T03:10:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Token has expired",
  "path": "/api/auth/me",
  "validationErrors": {}
}
```

Important distinction:
- `Token is invalid` should be treated as session replaced, deleted, or otherwise no longer usable
- `Token has expired` should be treated as normal session timeout

## 3. Frontend Handling Rule

When app already has a saved token and previously considered the user logged in:

- if a protected request returns `401` with `message = "Token is invalid"`
- clear local auth state immediately
- redirect user to login
- show a security-focused message

Recommended user-facing message:

`Tài khoản của bạn đang được đăng nhập ở thiết bị khác hoặc phiên đăng nhập đã bị thay thế. Nếu đây không phải bạn, vui lòng ấn Quên mật khẩu để đổi mật khẩu ngay.`

Recommended actions:
- primary button: `Đăng nhập lại`
- secondary button: `Quên mật khẩu`

Reset password flow:
- `POST /api/auth/password/request-otp`
- `POST /api/auth/password/reset`

## 4. Do Not Show The Security Warning In These Cases

- user intentionally pressed logout and frontend already knows logout is in progress
- request had no token at all
- request failed with `401` and `message = "Authorization header must be Bearer token"`
- token simply expired with `message = "Token has expired"`

For those cases:
- clear auth state if needed
- route user to login
- use a normal session-expired or login-required message

## 5. Recommended Frontend Logic

Suggested heuristic:

1. Keep a local flag such as `hadAuthenticatedSession = true` after login success.
2. For every protected request, if response is `401`:
3. Read `response.message`.
4. If message is `Token is invalid` and app was previously authenticated:
5. Show the account-in-use/security warning.
6. Clear token and cached user profile.
7. Offer `Forgot password`.

Suggested pseudo-code:

```ts
if (response.status === 401) {
  const message = response.data?.message;

  if (message === "Token is invalid" && authStore.hadAuthenticatedSession && !authStore.logoutInProgress) {
    authStore.clear();
    showDialog({
      title: "Phiên đăng nhập không còn hợp lệ",
      description:
        "Tài khoản của bạn đang được đăng nhập ở thiết bị khác hoặc phiên đăng nhập đã bị thay thế. Nếu đây không phải bạn, vui lòng ấn Quên mật khẩu để đổi mật khẩu ngay.",
      primaryAction: "Đăng nhập lại",
      secondaryAction: "Quên mật khẩu"
    });
    navigate("/login");
    return;
  }

  if (message === "Token has expired") {
    authStore.clear();
    toast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    navigate("/login");
    return;
  }
}
```

## 6. Best Places To Check

Frontend should apply this handling in:
- global API interceptor
- app bootstrap call to `GET /api/auth/me`
- any protected page loader
- websocket reconnect/auth flow if the app reuses the same token

## 7. UX Recommendation

For better user trust:
- keep the warning modal short and clear
- do not say with absolute certainty that the account was hacked
- say the account is logged in elsewhere or the session was replaced
- always give a fast path to `Quên mật khẩu`

Recommended short title:

`Tài khoản đang đăng nhập ở nơi khác`

Recommended body:

`Phiên đăng nhập hiện tại không còn hợp lệ. Tài khoản của bạn có thể vừa được đăng nhập trên thiết bị khác. Nếu đây không phải bạn, vui lòng dùng Quên mật khẩu để đổi mật khẩu ngay.`
