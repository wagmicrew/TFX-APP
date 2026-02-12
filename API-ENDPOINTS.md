# TFX Mobile (React Native / Expo) – API Endpoints & Call Flow

This document lists the API endpoints you need to set up the TFX mobile app (Expo) against this Next.js backend.

## Base URL

- Production example: `https://<school-domain>`
- API base: `https://<school-domain>/api/mobile`

Most mobile endpoints live under `/api/mobile/*`.

## Authentication Models (Important)

This codebase currently contains **two mobile auth styles**:

1) **OTP Session Token (recommended for LMS + student APIs)**
- Token type: opaque `sessionToken`
- Header: `Authorization: Bearer <sessionToken>`
- Refresh: opaque `refreshToken`

2) **JWT Token (used by some "legacy mobile app" endpoints)**
- Token type: signed JWT
- Header: `Authorization: Bearer <jwt>`
- Created by: `/api/mobile/auth/login` and `/api/mobile/auth/quick-login`

If you're building a new Expo client today, prefer **OTP** for "student & LMS" endpoints.

## Setup / Boot Sequence (Expo)

### 1) Fetch tenant/app config
- `GET /api/mobile/config?domain=<school-domain>`
  - Returns theme/branding/features.

### 2) Load translations
- `GET /api/mobile/i18n?locale=sv-SE&version=1.0.0`
  - Uses ETag caching (supports `If-None-Match`).

### 3) Authenticate (OTP flow)

#### Request OTP
- `POST /api/mobile/auth/request-otp`
  - Body:
    ```json
    {
      "email": "student@example.com",
      "deviceInfo": {
        "deviceId": "expo-installation-id",
        "platform": "ios",
        "deviceName": "iPhone",
        "deviceModel": "iPhone15,3",
        "osVersion": "17.2",
        "appVersion": "1.0.0",
        "pushToken": "expo-or-fcm-token"
      }
    }
    ```

#### Verify OTP (creates session)
- `POST /api/mobile/auth/verify-otp`
  - Body:
    ```json
    {
      "email": "student@example.com",
      "otpCode": "123456",
      "deviceInfo": {
        "deviceId": "expo-installation-id",
        "platform": "ios",
        "deviceName": "iPhone",
        "deviceModel": "iPhone15,3",
        "osVersion": "17.2",
        "appVersion": "1.0.0",
        "pushToken": "expo-or-fcm-token"
      }
    }
    ```
  - Response includes:
    - `sessionToken`
    - `refreshToken`
    - `expiresAt`
    - `user { id, email, name, role, phone }`

#### Refresh session
- `POST /api/mobile/auth/refresh`
  - Body:
    ```json
    { "refreshToken": "..." }
    ```
  - Response: `{ sessionToken, expiresAt }`

#### Logout
- `POST /api/mobile/auth/logout`
  - Header: `Authorization: Bearer <sessionToken>`

## Core Student Endpoints (OTP)

- `GET /api/mobile/student/profile`
  - Header: `Authorization: Bearer <sessionToken>`

- `GET /api/mobile/bookings?upcoming=true`
  - Header: `Authorization: Bearer <sessionToken>`

- `GET /api/mobile/invoices?status=all|paid|unpaid|overdue`
  - Header: `Authorization: Bearer <sessionToken>`

## LMS Endpoints (OTP + RBAC + App visibility)

### List courses visible in app
- `GET /api/mobile/lms/courses?locale=sv-SE`
  - Header: `Authorization: Bearer <sessionToken>`
  - Filters by:
    - course RBAC/entitlement (`lms_access_service`)
    - app toggle (`lms_app_visibility.enabled = true`)
    - published status

### Fetch a course structure (chapters + pages metadata)
- `GET /api/mobile/lms/courses/<courseId>/structure?locale=sv-SE`
  - Header: `Authorization: Bearer <sessionToken>`

### Fetch a lesson (full content + progress)
- `GET /api/mobile/lms/lessons/<lessonId>`
  - Header: `Authorization: Bearer <sessionToken>`

## Notifications (JWT)

- `GET /api/mobile/notifications?since=<iso>&limit=20`
  - Header: `Authorization: Bearer <jwt>`

## Device Registration + Sync (JWT)

These endpoints currently validate a **JWT** (not the OTP session token).

### Login (JWT)
- `POST /api/mobile/auth/login`
  - Body: `{ email, password, domain, deviceInfo }`
  - Returns `{ accessToken, refreshToken }`.

### Quick login (JWT)
- `POST /api/mobile/auth/quick-login`
  - Requires app secret header (see `requireAppSecret`)
  - Body: `{ token }`

### Register device (push token)
- `POST /api/mobile/device/register`
  - Header: `Authorization: Bearer <jwt>`

### Sync queue
- `POST /api/mobile/sync`
  - Header: `Authorization: Bearer <jwt>`
  - Body: `{ deviceId, operations: [...] }`

- `GET /api/mobile/sync/status?deviceId=<deviceId>`
  - Header: `Authorization: Bearer <jwt>`

## Payments (OTP)

- `GET /api/mobile/invoices/<invoiceId>`
- `POST /api/mobile/invoices/<invoiceId>/payment/initiate`
- `GET /api/mobile/invoices/<invoiceId>/payment/<paymentId>/status`

(These are invoice-specific routes; see their route files for exact payloads.)

## Admin Control: LMS app visibility

To control what shows up in the app, admins can toggle per-course app visibility:

- `GET /api/admin/lms/courses/<courseId>/app-visibility`
- `PUT /api/admin/lms/courses/<courseId>/app-visibility`

This powers the toggles in the LMS admin course list.

## Recommended Expo client storage

Store:
- `sessionToken` (short-lived session token)
- `refreshToken` (long-lived)
- `deviceId` (stable Expo installation ID)
- last-used `domain`

Use SecureStore/Keychain equivalents.
