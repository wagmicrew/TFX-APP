## Plan: Full TrafikskolaX Mobile Implementation

This plan covers every gap between the current codebase and the backend reference document — **34 missing/incomplete features** organized into 12 implementation steps. The app currently has strong scaffolding (config, feature flags, LMS, basic auth, bookings) but is missing critical runtime systems (API client, push, payments, several screens, dynamic theme, secure storage).

**Key decisions:** `expo-secure-store` for tokens, `@react-native-firebase/messaging` for FCM push, `react-native-video` for LMS video, full dynamic theme replacing all hardcoded `TFX.*` colors.

---

### Step 1 — Install Dependencies

Add all missing npm packages:
- `expo-secure-store` — encrypted token storage
- `@react-native-firebase/app` + `@react-native-firebase/messaging` — FCM push
- `expo-notifications` — local notification display, badges, channels
- `@react-native-community/netinfo` — offline detection
- `react-native-webview` — HTML lesson content + Qliro checkout
- `react-native-video` — LMS video player
- `expo-device` — richer device info for registration

Configure Firebase: add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) to the project. Update `app.json` with Firebase plugin config.

---

### Step 2 — Centralized API Client with Interceptors

Create `services/api-client.ts` — a single `apiClient` function wrapping `fetch` with:

1. **Auto auth header injection** — reads current token from secure store, attaches `Authorization: Bearer <token>`
2. **401 interceptor** — on 401, call `POST /api/mobile/auth/refresh` with the refresh token. If refresh succeeds, retry the original request once. If refresh fails, clear tokens and navigate to login.
3. **429 exponential backoff** — parse `Retry-After` header, wait, retry with backoff (1s → 2s → 4s → 8s → max 30s), up to 3 retries.
4. **Network error retry** — catch `TypeError: Network request failed`, retry up to 2 times with delay.
5. **`response.ok` checking** — throw typed `ApiError(status, message, errorCode)` for non-OK responses.
6. **Centralized `APP_SECRET`** — export from one constant instead of 7 hardcoded copies.

Then **migrate all existing API calls** in `services/mobile-api.ts`, `services/admin-api.ts`, `services/lms-api.ts`, `contexts/auth-context.tsx`, `app/book-lesson.tsx`, `app/(tabs)/index.tsx`, and `app/(tabs)/feedback.tsx` to use the new `apiClient` instead of raw `fetch()`.

---

### Step 3 — Secure Token Storage

Create `services/secure-storage.ts`:

1. Wrap `expo-secure-store` with helpers: `saveToken(key, value)`, `getToken(key)`, `deleteToken(key)`.
2. Define keys: `ACCESS_TOKEN`, `REFRESH_TOKEN`, `SESSION_TOKEN`.
3. **Migrate `contexts/auth-context.tsx`**: Replace all `AsyncStorage.getItem('@trafikskola_access_token')` / `setItem` calls with the secure storage equivalents.
4. Add a one-time migration on first launch: read from AsyncStorage, write to SecureStore, delete from AsyncStorage.
5. Keep non-sensitive data (config cache, sync queue, i18n cache, school domain) in AsyncStorage as-is.

---

### Step 4 — Complete Auth Flows

**4a. Email + Password Login**

Update `app/login.tsx`:
- Add a togglable "password mode" to the existing OTP-based login screen.
- New state: `authMode: 'otp' | 'password'` with a tab/segment switcher at the top.
- Password mode shows: email field + password field + "Logga in" button + "Glömt lösenord?" link.
- Call `POST /api/mobile/auth/login` with `{ email, password, domain, deviceInfo }`.
- Response includes JWT `accessToken` + `refreshToken` + `user` + `school`.

Add `loginWithPassword()` mutation to `contexts/auth-context.tsx` alongside existing `requestOTPMutation` and `verifyOTPMutation`.

**4b. Fix OTP deviceInfo**

Update `requestOTPMutation` to send `{ email, deviceInfo: { deviceId, platform } }`.
Update `verifyOTPMutation` to send `{ email, otpCode, deviceInfo: { deviceId, platform, deviceName, deviceModel, osVersion, appVersion, pushToken } }` (using `getDeviceId()` from device-service).

**4c. Server-side logout**

Update the logout mutation in `contexts/auth-context.tsx` to call `POST /api/mobile/auth/logout` with `Authorization: Bearer <sessionToken>` before clearing local data.

---

### Step 5 — Push Notifications (Firebase + Expo)

This is the highest-priority user request. The architecture: `@react-native-firebase/messaging` for FCM token acquisition + background handling, `expo-notifications` for foreground display + notification channels.

**5a. Create `services/push-notification-service.ts`** (replace current `services/push-service.ts`):

- `initializePush()` — request permission via Firebase, get FCM token, set up notification channels (via expo-notifications), register foreground + background handlers.
- `getFCMToken()` — get the current FCM device token (not Expo push token).
- `onTokenRefresh(callback)` — listen for `messaging().onTokenRefresh`, call `registerDevice()` with new token.
- `onNotificationReceived(callback)` — foreground notifications: display as local notification via `expo-notifications`.
- `onNotificationPressed(callback)` — background/quit tap: parse `data.deepLink` and navigate using `expo-router`.
- `subscribeToTopics(topics)` and `unsubscribeFromTopics(topics)` — for platform-specific targeting.

**5b. Update `services/device-service.ts`**:

- Change `registerThisDevice()` to use `getFCMToken()` instead of the Expo push token.
- Add `onTokenRefresh` listener that calls `registerDevice()` with the new FCM token whenever it changes.

**5c. Deep link routing from push:**

Create a notification handler map in the push service:

| `notificationType` | Action |
|---|---|
| `booking_reminder` | `router.push('/booking-detail', { bookingId: data.bookingId })` |
| `lesson_available` | `router.push('/lms/lesson', { lessonId: data.lessonId })` |
| `payment_reminder` | `router.push('/invoices', { invoiceId: data.invoiceId })` |
| `admin_broadcast` | `router.push('/notifications')` |
| `system_update` | Show alert |

**5d. Integrate in `app/_layout.tsx`**:

- Call `initializePush()` after successful authentication.
- Register the notification press listener with access to the router.
- Clean up listeners on unmount.

**5e. Update `app/settings.tsx`**:

- Make push preference toggles interactive (booking reminders, lesson alerts, payment reminders) — store locally and pass as data when registering the device.

---

### Step 6 — Dynamic Theme System

**6a. Create `contexts/theme-context.tsx`**:

- Reads `config.theme` from `useAppConfig()`.
- Merges with fallback `TFX` defaults for any missing values.
- Exposes `useTheme()` returning `{ colors, branding }`.
- `colors` maps to: `primary`, `secondary`, `background`, `text`, `accent`, `card`, `error`, `success`, `warning` — plus all existing structural colors (`navy`, `blueDeep`, `slate`, `grayLight`, etc.) as computed tints/shades of the primary.

**6b. Update `constants/colors.ts`**:

- Keep `TFX` as static fallback defaults.
- Export a `buildThemeColors(serverTheme)` function that merges server colors into the palette.

**6c. Migrate all screens** — every file that imports `TFX` directly (14+ files):

- Replace `TFX.blue` → `colors.primary`, `TFX.navy` → derived dark variant, etc.
- Apply via `useTheme()` hook inside components, passing colors into `StyleSheet.create` or inline styles.
- This affects: `app/_layout.tsx`, `app/login.tsx`, `app/settings.tsx`, `app/school-setup.tsx`, `app/book-lesson.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/lms.tsx`, `app/(tabs)/profile.tsx`, `app/(tabs)/feedback.tsx`, `app/lms/course-detail.tsx`, `app/lms/lesson.tsx`, `app/lms/quiz.tsx`.

**6d. Branding**: Use `branding.logo` in headers, `branding.name` as app title, `branding.tagline` in welcome screens.

---

### Step 7 — Missing Screens

**7a. Invoices Screen — create `app/(tabs)/invoices.tsx`**:

- Tab bar entry (feature-flagged on `featureInvoices`).
- Segment tabs: Alla / Obetalda / Betalda / Förfallna.
- Invoice card list with amount, due date, status badge.
- Summary bar (total unpaid, total overdue, next due date).
- Pull-to-refresh.
- Tap → invoice detail modal.

**7b. Invoice Detail — create `app/invoice-detail.tsx`**:

- Full invoice info: items, dates, PDF link.
- Payment buttons: "Betala med Swish" / "Betala med Qliro" (shown only for unpaid).
- **Swish flow**: Call `POST /invoices/:id/payment/initiate` with `method: 'swish'`. Try deep link `swishUrl` first. If Swish not installed, show QR code from `qrCode` field. Start polling `GET /invoices/:id/payment/:pid/status` every 3 seconds.
- **Qliro flow**: Call initiate with `method: 'qliro'`. Open `checkoutUrl` in a `react-native-webview`. Listen for success/cancel redirects.
- Show payment result (success/fail/cancelled).

**7c. Körklar Screen — create `app/(tabs)/korklar.tsx`**:

- Tab bar entry (feature-flagged on `featureKorklar`), replaces the Feedback tab or added alongside.
- Circular progress ring: readiness score 0-100.
- Readiness level label (`intermediate`, `advanced`, etc.).
- Category breakdown: horizontal chart or card grid for `categoryScores`.
- Strengths & Weaknesses lists with icons.
- `predictedReadinessDate` display.
- Personalized tips list from `personalizedTips`.
- Certificate card: shown when `eligibleForCertificate` is true, with download/view action.

**7d. Notifications Screen — create `app/notifications.tsx`**:

- Accessible from profile tab or home screen.
- List of push notifications from `GET /api/mobile/notifications`.
- Each item: title, body, type badge, timestamp.
- Tap to expand detail / navigate to deep link.
- Mark-as-read support.

**7e. Booking Detail Screen — create `app/booking-detail.tsx`**:

- Navigate here from home screen booking cards and from push notification deep links.
- Show full booking info: type, teacher, location, date/time, status.
- **Cancel booking** button (for future bookings): confirmation dialog → `DELETE /api/mobile/bookings/:id` → refresh list.

**7f. Student Profile Detail Screen — create `app/student-profile.tsx`**:

- Navigate from the Profile tab.
- Fetch `GET /api/mobile/student/profile` — show full profile data.
- Display: name, email, phone, personal number, address, license type, enrollment date, instructor card, progress stats (lessons completed/total, exam status), credits table.
- **Edit mode**: toggle to editable fields (firstName, lastName, phone, address) → `PUT /api/mobile/student/profile`.

---

### Step 8 — Update Tab Layout & Navigation

Update `app/(tabs)/_layout.tsx`:

- Add `invoices` tab (feature-flagged on `featureInvoices`).
- Add `korklar` tab (feature-flagged on `featureKorklar`).
- Reorder tabs: Home, Bokningar (new tab or quick action), Teori, Körklar, Profil.
- The feedback screen likely moves to a sub-screen accessible from profile rather than a top tab, unless the user wants to keep it.

Update navigation registration for new screens: `booking-detail`, `invoice-detail`, `notifications`, `student-profile`.

Add deep link routes in `app/+native-intent.tsx` for push notification navigation:
- `/bookings/:bookingId` → booking-detail
- `/invoices/:invoiceId` → invoice-detail
- `/lms/lessons/:lessonId` → lms/lesson
- `/notifications` → notifications

---

### Step 9 — LMS Enhancements

**9a. Video Player**

Update `app/lms/lesson.tsx`:
- When `lesson.contentType === 'video'` or `lesson.videoUrl` is present, render `react-native-video` player.
- Track `watchPercentage` and `lastPosition` — call `PUT /api/mobile/lms/lessons/:id/progress` with progress data.
- Enforce `requireFullWatch` / `minWatchPercentage` from course config before allowing progression.
- Resume from `lastPosition` on revisit.

**9b. HTML Content Rendering**

Update `app/lms/lesson.tsx`:
- Replace `content.replace(/<[^>]*>/g, '')` with `react-native-webview` rendering.
- Inject theme CSS into the WebView for consistent styling.
- Handle image URLs from `imageUrls` array.

---

### Step 10 — Offline Capabilities

**10a. NetInfo + Offline Banner**

Create `hooks/useNetworkStatus.ts`:
- Use `@react-native-community/netinfo` to track connectivity.
- Expose `isOnline`, `isInternetReachable`.

Create `components/OfflineBanner.tsx`:
- Persistent banner at top of screen: "Du är offline – data sparad lokalt".
- Show/hide based on `useNetworkStatus()`.
- Add to `app/_layout.tsx` so it appears globally.

**10b. Populate the Sync Queue**

Wire `queueSyncOperation()` into:
- `app/book-lesson.tsx` — queue `booking_create` when offline.
- `app/lms/quiz.tsx` — queue `quiz_attempt` when offline.
- `app/lms/lesson.tsx` — queue `lesson_progress` when offline.
- Feedback submission (if added) — queue `feedback_submit`.

**10c. Offline Data Caching**

In each screen's data-fetching logic, add cache writes after successful fetch and cache reads as fallback:
- Bookings: cache on fetch, serve from cache when offline.
- Profile: cache on fetch, serve from cache when offline.
- LMS courses/structure: cache on fetch (14-day retention).
- Invoices: cache on fetch (3-day retention).

---

### Step 11 — Settings & i18n Polish

**11a. Language Selector in Settings**

Add to `app/settings.tsx`:
- Language picker (Swedish / English) with flag icons.
- On change: call `i18n.changeLanguage(locale)`, refetch translations with new locale, persist preference.

**11b. Push Preference Toggles**

Make the booking/lesson/payment reminder toggles in settings interactive:
- Store preferences locally in AsyncStorage.
- On toggle, update push topic subscriptions via Firebase.
- When registering device, include preference flags in the payload.

---

### Step 12 — Security Hardening

**12a. Centralize APP_SECRET**

Create a constant in `constants/config.ts`:
```typescript
export const APP_SECRET = 'sk_trafikskola_prod_acbdca5a99ca581b2528d9da55d5be73';
```
Replace all 7 hardcoded instances across the codebase.

**12b. Global Error Boundary**

Add a React error boundary component in `components/ErrorBoundary.tsx`, wrap the root navigator in `app/_layout.tsx` with it.

---

### Verification

- **Push**: Send a test push via Admin Dashboard → verify FCM token registered, notification displayed foreground + background, deep link navigates correctly.
- **Auth**: Test all 3 login flows (password, OTP, QR), token refresh after 15min, automatic 401 retry, logout invalidates server session.
- **Payments**: Initiate Swish payment → verify deep link opens Swish app or shows QR → poll status returns `completed`. Qliro → WebView opens checkout → payment completes.
- **Offline**: Toggle airplane mode → verify offline banner appears, bookings/LMS load from cache, queued operations sync when back online.
- **Theme**: Change school theme colors in admin → app reflects new colors on next config refresh.
- **Feature flags**: Disable LMS in admin → verify tab disappears. Toggle invoices → tab appears/disappears.
- **i18n**: Switch language in settings → all strings update immediately. ETag caching returns 304 on second load.
- **Screens**: Navigate to every screen listed in Section 12.1 of the spec. Verify no dead ends.
- **Run**: `npx expo start` → verify no TypeScript errors, no red screens.

### Decisions

- **Firebase over Expo Push**: User chose `@react-native-firebase/messaging` — requires native build (`expo prebuild`), no more Expo Go for push testing. Use EAS Build or local dev client.
- **Video player**: `react-native-video` chosen over `expo-av` — better codec support, pip mode, but requires native build.
- **Feedback tab**: Will be moved out of the main tab bar to make room for Invoices and Körklar tabs. Accessible from Profile → Feedback.
- **Booking tab vs quick action**: Bookings accessed via Home screen's "Boka" quick action + upcoming bookings list — no dedicated tab to keep tab bar clean. Alternatively can be added as tab — needs user confirmation.
