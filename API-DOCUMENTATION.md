# TrafikskolaX - School API Documentation

This document describes the complete API specification that driving schools need to implement to integrate with the TrafikskolaX mobile app. The API covers authentication, student management, bookings, LMS, payments, and app configuration.

## Overview

The TrafikskolaX mobile app communicates with each driving school's API to provide a unified experience. Each school must implement these endpoints on their domain to support:

- **Authentication**: Email-based OTP login and session management
- **Student Management**: Profile, details, and personal information
- **Bookings**: Schedule and manage driving lessons and theory sessions
- **LMS**: Learning platform for reading materials and quizzes (if enabled)
- **Payments**: View and pay invoices via Qliro or Swish
- **App Configuration**: Theme, branding, and feature flags

## Security & Authentication

### App Secret (Required for All Requests)

All API requests from the mobile app include a hardcoded app secret in the request headers. This prevents unauthorized access from non-official clients.

**Header Name**: `X-App-Secret`  
**Value**: A unique secret key you generate (minimum 32 characters)  
**Example**: `sk_trafikskola_live_a8f3n29dk3n2kd93jd82nd9`

```http
X-App-Secret: sk_trafikskola_live_a8f3n29dk3n2kd93jd82nd9
```

**Implementation Notes**:
- Generate a strong, random secret (use a password generator)
- Store the secret securely in your backend environment variables
- Validate this header on every API request (except `/api/app-config`)
- Return `401 Unauthorized` if the secret is missing or invalid
- Share this secret with the TrafikskolaX team through a secure channel

### Encryption Requirements

All API communication must use:
- **HTTPS/TLS 1.3** for transport encryption
- **Certificate pinning** recommended for production
- **Encrypted sensitive fields** in database (personal details, invoices)

### Session Management

After successful authentication, the API issues:
- **Access Token**: Short-lived JWT (15 minutes)
- **Refresh Token**: Long-lived token (30 days) stored securely on device

Tokens must be included in subsequent requests:
```http
Authorization: Bearer <access_token>
```

## API Base URL

All endpoints are relative to your school's domain:
```
https://{school-domain}/api/
```

**Example**:
```
https://dintrafikskolahlm.se/api/
```

---

# 1. App Configuration API

## GET /api/translations/:locale

Returns localized translations for the mobile app. The app will use device locale (Swedish if device is set to Swedish, otherwise English) and fetch translations from the server.

### URL Pattern
```
https://{school-domain}/api/translations/{locale}
```

**Supported Locales:**
- `en` - English
- `sv` - Swedish (svenska)

**Example:**
```
https://dintrafikskolahlm.se/api/translations/sv
```

### HTTP Method
`GET`

### Request Headers
```
Accept: application/json
Content-Type: application/json
```

### Response Format

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "common": {
      "loading": "Laddar...",
      "error": "Fel",
      "retry": "Försök igen",
      "cancel": "Avbryt",
      "save": "Spara",
      "continue": "Fortsätt",
      "back": "Tillbaka"
    },
    "schoolSetup": {
      "title": "Anslut till din skola",
      "subtitle": "Skanna QR-koden från din skolas webbplats eller ange domänen manuellt",
      "scanQR": "Skanna QR-kod",
      "enterDomain": "Ange skoldomän",
      "domainPlaceholder": "dintrafikskolahlm.se",
      "domainHint": "Exempel: dintrafikskolahlm.se eller dinskola.com",
      "invalidDomain": "Vänligen ange en giltig domän",
      "scanTitle": "Skanna skolans QR-kod",
      "scanInstructions": "Placera QR-koden inom ramen",
      "firstTimeTitle": "Första gången installation",
      "firstTimeText": "Du behöver bara göra detta en gång. Appen kommer att komma ihåg din skola och tillämpa dess tema automatiskt.",
      "changeSchoolText": "Du kan byta skola senare i Inställningar."
    },
    "login": {
      "welcomeTitle": "Välkommen tillbaka",
      "otpTitle": "Ange OTP",
      "welcomeSubtitle": "Logga in för att komma åt ditt körskole-konto",
      "otpSubtitle": "Vi skickade en kod till",
      "quickLogin": "Snabbinloggning med QR",
      "emailLabel": "E-postadress",
      "emailPlaceholder": "din.epost@exempel.se",
      "sendOTP": "Skicka OTP",
      "resendOTP": "Skicka igen OTP",
      "resendTimer": "Skicka igen om {{seconds}}s",
      "changeEmail": "Ändra e-post",
      "verifying": "Verifierar...",
      "invalidOTP": "Ogiltig OTP-kod",
      "failedOTP": "Misslyckades att skicka OTP",
      "scanInstructions": "Skanna QR-koden från din studentpanel",
      "loggingIn": "Loggar in..."
    }
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "Translations not found for locale: de"
}
```

**Note:** If translations endpoint is not available, the app will use built-in fallback translations.

---

## GET /api/app-config

Returns the school's branding, theme, and feature flags. This is the only endpoint that does NOT require the `X-App-Secret` header.

### URL Pattern
```
https://{school-domain}/api/app-config
```

**Example:**
```
https://dintrafikskolahlm.se/api/app-config
```

### HTTP Method
`GET`

### Request Headers
```
Accept: application/json
Content-Type: application/json
```

### Response Format

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "domain": "dintrafikskolahlm.se",
    "apiBaseUrl": "https://dintrafikskolahlm.se/api",
    "theme": {
      "primaryColor": "#000000",
      "secondaryColor": "#DC2626",
      "backgroundColor": "#FFFFFF",
      "textColor": "#000000",
      "accentColor": "#DC2626",
      "cardBackground": "#F9FAFB",
      "errorColor": "#DC2626",
      "successColor": "#10B981",
      "warningColor": "#F59E0B"
    },
    "branding": {
      "logoUrl": "https://dintrafikskolahlm.se/logo.png",
      "iconUrl": "https://dintrafikskolahlm.se/icon.png",
      "splashImageUrl": "https://dintrafikskolahlm.se/splash.png",
      "schoolName": "Din Trafikskola HLM",
      "tagline": "Drive with confidence"
    },
    "contact": {
      "email": "info@dintrafikskolahlm.se",
      "phone": "+46 123 456 789",
      "address": "Example Street 123, Stockholm",
      "website": "https://dintrafikskolahlm.se"
    },
    "features": {
      "enableQuiz": true,
      "enableLessons": true,
      "enableCertificates": true,
      "enableKorklar": true
    }
  }
}
```

#### Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

## Field Specifications

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `domain` | string | School domain without protocol | `"dintrafikskolahlm.se"` |
| `apiBaseUrl` | string | Base URL for all API calls | `"https://dintrafikskolahlm.se/api"` |
| `theme.primaryColor` | string (hex) | Primary brand color (header, buttons) | `"#000000"` |
| `theme.secondaryColor` | string (hex) | Secondary accent color | `"#DC2626"` |
| `theme.backgroundColor` | string (hex) | Main background color | `"#FFFFFF"` |
| `theme.textColor` | string (hex) | Primary text color | `"#000000"` |
| `theme.accentColor` | string (hex) | Accent/highlight color | `"#DC2626"` |
| `theme.cardBackground` | string (hex) | Card/surface background | `"#F9FAFB"` |
| `branding.logoUrl` | string (URL) | School logo (PNG/SVG, min 300x300px) | `"https://..."` |
| `branding.schoolName` | string | Official school name | `"Din Trafikskola HLM"` |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `theme.errorColor` | string (hex) | Error/danger color | `"#DC2626"` |
| `theme.successColor` | string (hex) | Success state color | `"#10B981"` |
| `theme.warningColor` | string (hex) | Warning state color | `"#F59E0B"` |
| `branding.iconUrl` | string (URL) | App icon override | `"https://..."` |
| `branding.splashImageUrl` | string (URL) | Splash screen image | `"https://..."` |
| `branding.tagline` | string | School tagline/slogan | `"Drive with confidence"` |
| `contact.*` | object | Contact information | See example |
| `features.*` | object | Feature flags | See example |

## Image Requirements

### Logo (`branding.logoUrl`)
- **Format:** PNG or SVG
- **Minimum size:** 300x300 pixels
- **Recommended:** 512x512 pixels or vector SVG
- **Transparent background:** Recommended
- **Usage:** Header, onboarding, settings

### Icon (`branding.iconUrl`)
- **Format:** PNG
- **Size:** 1024x1024 pixels
- **Transparent background:** No
- **Usage:** App icon (optional override)

### Splash Image (`branding.splashImageUrl`)
- **Format:** PNG or JPG
- **Size:** 1242x2688 pixels (portrait)
- **Usage:** App launch screen

## Color Guidelines

### For Black/Red Theme (like dintrafikskolahlm.se)
```json
{
  "primaryColor": "#000000",    // Pure black
  "secondaryColor": "#DC2626",  // Red 600
  "backgroundColor": "#FFFFFF", // White
  "textColor": "#000000",       // Black
  "accentColor": "#DC2626",     // Red 600
  "cardBackground": "#F9FAFB"   // Gray 50
}
```

### Color Usage in App

- **primaryColor**: Navigation headers, primary buttons, active tab indicators
- **secondaryColor**: Important CTAs, error states, notifications
- **backgroundColor**: Screen backgrounds
- **textColor**: Body text, headings
- **accentColor**: Links, highlights, focus states
- **cardBackground**: Card components, surfaces

## Implementation Examples

### PHP (Laravel)
```php
Route::get('/api/app-config', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'domain' => 'dintrafikskolahlm.se',
            'apiBaseUrl' => 'https://dintrafikskolahlm.se/api',
            'theme' => [
                'primaryColor' => '#000000',
                'secondaryColor' => '#DC2626',
                'backgroundColor' => '#FFFFFF',
                'textColor' => '#000000',
                'accentColor' => '#DC2626',
                'cardBackground' => '#F9FAFB',
            ],
            'branding' => [
                'logoUrl' => asset('images/logo.png'),
                'schoolName' => config('app.school_name'),
                'tagline' => config('app.tagline'),
            ],
            'features' => [
                'enableQuiz' => true,
                'enableLessons' => true,
                'enableCertificates' => true,
                'enableKorklar' => true,
            ],
        ],
    ]);
});
```

### Node.js (Express)
```javascript
app.get('/api/app-config', (req, res) => {
  res.json({
    success: true,
    data: {
      domain: 'dintrafikskolahlm.se',
      apiBaseUrl: 'https://dintrafikskolahlm.se/api',
      theme: {
        primaryColor: '#000000',
        secondaryColor: '#DC2626',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        accentColor: '#DC2626',
        cardBackground: '#F9FAFB',
      },
      branding: {
        logoUrl: 'https://dintrafikskolahlm.se/logo.png',
        schoolName: 'Din Trafikskola HLM',
        tagline: 'Drive with confidence',
      },
      features: {
        enableQuiz: true,
        enableLessons: true,
        enableCertificates: true,
        enableKorklar: true,
      },
    },
  });
});
```

### Python (Django)
```python
from django.http import JsonResponse

def app_config(request):
    return JsonResponse({
        'success': True,
        'data': {
            'domain': 'dintrafikskolahlm.se',
            'apiBaseUrl': 'https://dintrafikskolahlm.se/api',
            'theme': {
                'primaryColor': '#000000',
                'secondaryColor': '#DC2626',
                'backgroundColor': '#FFFFFF',
                'textColor': '#000000',
                'accentColor': '#DC2626',
                'cardBackground': '#F9FAFB',
            },
            'branding': {
                'logoUrl': 'https://dintrafikskolahlm.se/logo.png',
                'schoolName': 'Din Trafikskola HLM',
                'tagline': 'Drive with confidence',
            },
            'features': {
                'enableQuiz': True,
                'enableLessons': True,
                'enableCertificates': True,
                'enableKorklar': True,
            },
        },
    })
```

## CORS Configuration

The endpoint must allow requests from the mobile app. Configure CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept
```

## Caching

The app caches the configuration for 1 hour. Users can manually refresh from Settings. Consider:
- Setting appropriate `Cache-Control` headers
- Using CDN for logo/image assets
- Implementing versioning if you frequently update branding

## Testing Your Implementation

### 1. Test with curl
```bash
curl -H "Accept: application/json" \
     https://yourdomain.se/api/app-config
```

### 2. Validate JSON Response
Ensure the response matches the schema exactly.

### 3. Test Images
- All image URLs must be accessible publicly
- Test loading images in a browser
- Verify HTTPS is used for all URLs

### 4. Test Colors
- All colors must be valid hex codes (e.g., `#000000`)
- Test contrast ratios for accessibility
- Ensure colors work in both light mode contexts

## Security Considerations

- ✅ Use HTTPS for all URLs
- ✅ Ensure images are served over HTTPS
- ✅ Validate that image URLs don't leak sensitive information
- ✅ Keep the endpoint public (no authentication required)
- ✅ Rate limit the endpoint to prevent abuse

## Support

If schools need help implementing this endpoint, contact the TrafikskolaX development team.

---

# 2. Authentication API

## POST /api/auth/request-otp

Initiates email-based OTP authentication. Sends a 6-digit code to the student's email.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Content-Type: application/json
```

**Body**:
```json
{
  "email": "student@example.com"
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "OTP sent to your email",
    "expiresIn": 300,
    "otpId": "otp_abc123xyz"
  }
}
```

**Error (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Email not found in our system"
}
```

**Error (429 Too Many Requests)**:
```json
{
  "success": false,
  "error": "Too many attempts. Please wait 60 seconds."
}
```

### Business Rules
- OTP must be 6 digits
- OTP expires after 5 minutes
- Maximum 3 OTP requests per email per hour
- Resend timer: 60 seconds between requests

---

## POST /api/auth/verify-otp

Verifies the OTP code and returns access + refresh tokens.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Content-Type: application/json
```

**Body**:
```json
{
  "email": "student@example.com",
  "otp": "123456",
  "otpId": "otp_abc123xyz"
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "rt_a8f3n29dk3n2kd93jd82nd9",
    "expiresIn": 900,
    "user": {
      "id": "student_123",
      "email": "student@example.com",
      "firstName": "Anna",
      "lastName": "Andersson"
    }
  }
}
```

**Error (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Invalid or expired OTP"
}
```

**Error (401 Unauthorized)**:
```json
{
  "success": false,
  "error": "Maximum verification attempts exceeded"
}
```

### Business Rules
- Maximum 5 verification attempts per OTP
- OTP becomes invalid after successful verification
- Access token valid for 15 minutes
- Refresh token valid for 30 days

---

## POST /api/auth/refresh-token

Exchanges a refresh token for a new access token.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Content-Type: application/json
```

**Body**:
```json
{
  "refreshToken": "rt_a8f3n29dk3n2kd93jd82nd9"
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error (401 Unauthorized)**:
```json
{
  "success": false,
  "error": "Invalid or expired refresh token"
}
```

---

## POST /api/auth/logout

Invalidates the current refresh token.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body**:
```json
{
  "refreshToken": "rt_a8f3n29dk3n2kd93jd82nd9"
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

# 3. Student Details API

## GET /api/student/profile

Returns the authenticated student's profile and details.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "student_123",
    "firstName": "Anna",
    "lastName": "Andersson",
    "email": "anna.andersson@example.com",
    "phone": "+46701234567",
    "personalNumber": "19950315-1234",
    "address": {
      "street": "Storgatan 1",
      "postalCode": "123 45",
      "city": "Stockholm"
    },
    "licenseType": "B",
    "studentNumber": "TS2024-001",
    "enrollmentDate": "2024-01-15",
    "instructor": {
      "id": "instructor_456",
      "name": "Erik Eriksson",
      "phone": "+46709876543",
      "email": "erik@dintrafikskolahlm.se"
    },
    "progress": {
      "theoryLessonsCompleted": 12,
      "theoryLessonsTotal": 15,
      "drivingLessonsCompleted": 8,
      "drivingLessonsTotal": 20,
      "examStatus": "theory_passed"
    }
  }
}
```

---

## PUT /api/student/profile

Updates the student's profile information.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body**:
```json
{
  "firstName": "Anna",
  "lastName": "Andersson",
  "phone": "+46701234567",
  "address": {
    "street": "Storgatan 1",
    "postalCode": "123 45",
    "city": "Stockholm"
  }
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully",
    "profile": { /* updated profile object */ }
  }
}
```

---

# 4. Bookings API

## GET /api/bookings/today

Returns all bookings for today.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "date": "2026-02-05",
    "bookings": [
      {
        "id": "booking_789",
        "type": "driving_lesson",
        "startTime": "2026-02-05T10:00:00Z",
        "endTime": "2026-02-05T11:00:00Z",
        "duration": 60,
        "instructor": {
          "id": "instructor_456",
          "name": "Erik Eriksson",
          "phone": "+46709876543"
        },
        "location": {
          "name": "School Parking Lot",
          "address": "Storgatan 10, Stockholm"
        },
        "status": "confirmed",
        "vehicle": "ABC123",
        "notes": "Focus on highway driving"
      },
      {
        "id": "booking_790",
        "type": "theory_session",
        "startTime": "2026-02-05T14:00:00Z",
        "endTime": "2026-02-05T15:30:00Z",
        "duration": 90,
        "topic": "Traffic Rules and Signs",
        "location": {
          "name": "Classroom 2",
          "address": "Storgatan 10, Stockholm"
        },
        "status": "confirmed",
        "instructor": {
          "id": "instructor_789",
          "name": "Maria Svensson"
        }
      }
    ]
  }
}
```

---

## GET /api/bookings

Returns all bookings for the student with optional filtering.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `startDate` (optional): ISO date string (e.g., `2026-02-01`)
- `endDate` (optional): ISO date string (e.g., `2026-02-28`)
- `type` (optional): `driving_lesson` | `theory_session`
- `status` (optional): `confirmed` | `pending` | `cancelled` | `completed`

**Example**:
```
GET /api/bookings?startDate=2026-02-01&endDate=2026-02-28&type=driving_lesson
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "bookings": [
      { /* booking object */ },
      { /* booking object */ }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "perPage": 20
    }
  }
}
```

---

## GET /api/bookings/available-slots

Returns available time slots for booking.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `type` (required): `driving_lesson` | `theory_session`
- `date` (required): ISO date string (e.g., `2026-02-10`)
- `instructorId` (optional): Filter by specific instructor

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "date": "2026-02-10",
    "type": "driving_lesson",
    "slots": [
      {
        "startTime": "2026-02-10T09:00:00Z",
        "endTime": "2026-02-10T10:00:00Z",
        "instructor": {
          "id": "instructor_456",
          "name": "Erik Eriksson"
        },
        "available": true
      },
      {
        "startTime": "2026-02-10T10:00:00Z",
        "endTime": "2026-02-10T11:00:00Z",
        "instructor": {
          "id": "instructor_456",
          "name": "Erik Eriksson"
        },
        "available": false,
        "reason": "Already booked"
      }
    ]
  }
}
```

---

## POST /api/bookings

Creates a new booking.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body (Driving Lesson)**:
```json
{
  "type": "driving_lesson",
  "startTime": "2026-02-10T09:00:00Z",
  "duration": 60,
  "instructorId": "instructor_456",
  "notes": "Focus on parking"
}
```

**Body (Theory Session)**:
```json
{
  "type": "theory_session",
  "startTime": "2026-02-12T14:00:00Z",
  "duration": 90,
  "topic": "Traffic Rules"
}
```

### Response

**Success (201 Created)**:
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "booking_new123",
      "type": "driving_lesson",
      "startTime": "2026-02-10T09:00:00Z",
      "endTime": "2026-02-10T10:00:00Z",
      "status": "confirmed",
      "instructor": {
        "id": "instructor_456",
        "name": "Erik Eriksson"
      }
    },
    "message": "Booking created successfully"
  }
}
```

**Error (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Time slot is no longer available"
}
```

---

## PUT /api/bookings/:bookingId

Reschedules an existing booking.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body**:
```json
{
  "startTime": "2026-02-12T10:00:00Z",
  "notes": "Updated notes"
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "booking": { /* updated booking object */ },
    "message": "Booking rescheduled successfully"
  }
}
```

**Error (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Cannot reschedule less than 24 hours before start time"
}
```

---

## DELETE /api/bookings/:bookingId

Cancels a booking.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body**:
```json
{
  "reason": "Personal emergency"
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Booking cancelled successfully",
    "refundAmount": 0,
    "cancellationFee": 200
  }
}
```

---

# 5. LMS (Learning Management System) API

## GET /api/lms/status

Checks if LMS is enabled for this school.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "version": "2.1.0",
    "features": {
      "materials": true,
      "quizzes": true,
      "videos": true,
      "certificates": true
    }
  }
}
```

---

## GET /api/lms/materials

Returns all learning materials organized by category.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_1",
        "name": "Traffic Rules",
        "description": "Basic traffic rules and regulations",
        "icon": "https://school.se/icons/traffic-rules.png",
        "materials": [
          {
            "id": "material_101",
            "title": "Road Signs and Meanings",
            "type": "article",
            "duration": 15,
            "completed": true,
            "progress": 100,
            "url": "https://school.se/materials/road-signs",
            "thumbnail": "https://school.se/thumbnails/road-signs.jpg"
          },
          {
            "id": "material_102",
            "title": "Right of Way Rules",
            "type": "video",
            "duration": 20,
            "completed": false,
            "progress": 45,
            "url": "https://school.se/videos/right-of-way.mp4",
            "thumbnail": "https://school.se/thumbnails/right-of-way.jpg"
          }
        ]
      }
    ]
  }
}
```

---

## POST /api/lms/materials/:materialId/progress

Tracks progress for a learning material.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body**:
```json
{
  "progress": 75,
  "completed": false,
  "timeSpent": 600
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Progress saved"
  }
}
```

---

## GET /api/lms/quizzes

Returns all available quizzes.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "quizzes": [
      {
        "id": "quiz_201",
        "title": "Traffic Signs Quiz",
        "category": "Traffic Rules",
        "questionCount": 20,
        "duration": 15,
        "difficulty": "easy",
        "passingScore": 80,
        "attempts": [
          {
            "attemptId": "attempt_301",
            "date": "2026-01-20T10:00:00Z",
            "score": 85,
            "passed": true
          }
        ],
        "bestScore": 85,
        "thumbnail": "https://school.se/thumbnails/quiz-traffic-signs.jpg"
      }
    ]
  }
}
```

---

## GET /api/lms/quizzes/:quizId

Returns quiz details and questions.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "quiz": {
      "id": "quiz_201",
      "title": "Traffic Signs Quiz",
      "instructions": "Answer all questions. You need 80% to pass.",
      "questions": [
        {
          "id": "q_1",
          "type": "multiple_choice",
          "question": "What does this sign mean?",
          "imageUrl": "https://school.se/signs/stop.png",
          "options": [
            { "id": "a", "text": "Stop" },
            { "id": "b", "text": "Yield" },
            { "id": "c", "text": "No Entry" },
            { "id": "d", "text": "Speed Limit" }
          ]
        },
        {
          "id": "q_2",
          "type": "true_false",
          "question": "You must always yield to pedestrians at a crosswalk.",
          "options": [
            { "id": "true", "text": "True" },
            { "id": "false", "text": "False" }
          ]
        }
      ]
    }
  }
}
```

---

## POST /api/lms/quizzes/:quizId/submit

Submits quiz answers for grading.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body**:
```json
{
  "answers": [
    { "questionId": "q_1", "answerId": "a" },
    { "questionId": "q_2", "answerId": "true" }
  ],
  "timeSpent": 480
}
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "attemptId": "attempt_302",
    "score": 90,
    "passed": true,
    "totalQuestions": 20,
    "correctAnswers": 18,
    "incorrectAnswers": 2,
    "results": [
      {
        "questionId": "q_1",
        "correct": true,
        "selectedAnswer": "a",
        "correctAnswer": "a",
        "explanation": "Correct! This is a stop sign."
      },
      {
        "questionId": "q_2",
        "correct": true,
        "selectedAnswer": "true",
        "correctAnswer": "true",
        "explanation": "Yes, pedestrians always have right of way at crosswalks."
      }
    ]
  }
}
```

---

# 6. Invoices and Payments API

## GET /api/invoices

Returns all invoices for the student.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `status` (optional): `paid` | `unpaid` | `overdue` | `all`

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "invoice_501",
        "invoiceNumber": "TS-2026-001",
        "date": "2026-01-15",
        "dueDate": "2026-02-15",
        "amount": 2500,
        "currency": "SEK",
        "status": "unpaid",
        "description": "Driving lessons (5 hours)",
        "items": [
          {
            "description": "Driving lesson",
            "quantity": 5,
            "unitPrice": 500,
            "total": 2500
          }
        ],
        "pdfUrl": "https://school.se/invoices/TS-2026-001.pdf",
        "paymentMethods": ["swish", "qliro", "card"]
      },
      {
        "id": "invoice_502",
        "invoiceNumber": "TS-2026-002",
        "date": "2026-01-25",
        "dueDate": "2026-02-25",
        "amount": 800,
        "currency": "SEK",
        "status": "paid",
        "paidDate": "2026-01-26",
        "paidAmount": 800,
        "paymentMethod": "swish",
        "description": "Theory materials",
        "pdfUrl": "https://school.se/invoices/TS-2026-002.pdf"
      }
    ],
    "summary": {
      "totalUnpaid": 2500,
      "totalOverdue": 0,
      "nextDueDate": "2026-02-15"
    }
  }
}
```

---

## GET /api/invoices/:invoiceId

Returns detailed information for a specific invoice.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "invoice": { /* full invoice object */ }
  }
}
```

---

## POST /api/invoices/:invoiceId/payment/initiate

Initiates payment for an invoice via Swish or Qliro.

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body**:
```json
{
  "method": "swish",
  "phoneNumber": "+46701234567"
}
```

or for Qliro:
```json
{
  "method": "qliro"
}
```

### Response

**Success (200 OK) - Swish**:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_601",
    "method": "swish",
    "swishUrl": "swish://paymentrequest?token=abc123xyz",
    "qrCode": "https://school.se/qr/payment_601.png",
    "expiresAt": "2026-02-05T10:15:00Z",
    "status": "pending"
  }
}
```

**Success (200 OK) - Qliro**:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_602",
    "method": "qliro",
    "checkoutUrl": "https://checkout.qliro.com/checkout?orderId=abc123",
    "deepLink": "qliro://checkout?orderId=abc123",
    "expiresAt": "2026-02-05T10:30:00Z",
    "status": "pending"
  }
}
```

### Implementation Notes

**For Swish**:
- Return a `swish://` deep link that opens the Swish app
- Provide a QR code as fallback
- App will poll `/api/invoices/:invoiceId/payment/:paymentId/status` for updates

**For Qliro**:
- Return both web checkout URL and deep link
- App will open Qliro app if installed, otherwise open web checkout
- Use webhook for payment confirmation

---

## GET /api/invoices/:invoiceId/payment/:paymentId/status

Checks payment status (for polling).

### Request

**Headers**:
```http
X-App-Secret: <your_app_secret>
Authorization: Bearer <access_token>
```

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_601",
    "status": "completed",
    "completedAt": "2026-02-05T10:05:30Z",
    "transactionId": "swish_tx_abc123"
  }
}
```

Possible statuses:
- `pending`: Payment initiated, waiting for user
- `processing`: Payment being processed
- `completed`: Payment successful
- `failed`: Payment failed
- `cancelled`: Payment cancelled by user
- `expired`: Payment request expired

---

# 7. Error Handling

## Standard Error Response

All errors follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "ERROR_CODE",
  "details": {
    "field": "Additional context if applicable"
  }
}
```

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing/invalid app secret or token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., booking slot taken) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Temporary maintenance |

## Common Error Codes

```typescript
INVALID_APP_SECRET = "The app secret is missing or invalid"
INVALID_TOKEN = "Access token is missing, invalid, or expired"
INVALID_OTP = "OTP is incorrect or expired"
EMAIL_NOT_FOUND = "Email address not registered"
BOOKING_UNAVAILABLE = "Time slot is no longer available"
INSUFFICIENT_CREDITS = "Not enough credits for this booking"
CANCELLATION_NOT_ALLOWED = "Too late to cancel without fee"
PAYMENT_FAILED = "Payment processing failed"
LMS_NOT_ENABLED = "LMS is not enabled for this school"
```

---

# 8. Testing Your API

## Generate Your App Secret

```bash
# Generate a secure random secret (32 characters minimum)
openssl rand -hex 32
```

Example output: `a8f3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1`

## Test with curl

### 1. Test app-config (no auth required)
```bash
curl https://dintrafikskolahlm.se/api/app-config
```

### 2. Test OTP request
```bash
curl -X POST https://dintrafikskolahlm.se/api/auth/request-otp \
  -H "X-App-Secret: your_secret_here" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 3. Test OTP verification
```bash
curl -X POST https://dintrafikskolahlm.se/api/auth/verify-otp \
  -H "X-App-Secret: your_secret_here" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456", "otpId": "otp_abc123"}'
```

### 4. Test authenticated endpoint
```bash
curl https://dintrafikskolahlm.se/api/student/profile \
  -H "X-App-Secret: your_secret_here" \
  -H "Authorization: Bearer your_access_token_here"
```

## Postman Collection

A Postman collection is recommended for testing. Include:
- Environment variables for `base_url`, `app_secret`, `access_token`
- All endpoints documented above
- Pre-request scripts for token refresh
- Tests for response validation

---

# 9. Mobile & Tablet Support

The API is platform-agnostic and works identically on:
- iOS phones (iPhone)
- Android phones
- iOS tablets (iPad)
- Android tablets

**No special handling required** - the app handles responsive UI based on screen size. Just ensure:
- All image URLs return appropriately sized images
- PDFs are mobile-friendly
- Deep links (Swish/Qliro) work on both platforms

---

# 10. Implementation Checklist

## For School Website Developers

### Phase 1: Core Setup
- [ ] Generate and securely store app secret
- [ ] Implement app secret validation middleware
- [ ] Configure HTTPS/TLS
- [ ] Set up CORS for mobile app
- [ ] Implement JWT token generation and validation

### Phase 2: Authentication
- [ ] `/api/app-config` endpoint
- [ ] `/api/auth/request-otp` with email validation
- [ ] Email delivery system for OTP codes
- [ ] `/api/auth/verify-otp` with attempt limits
- [ ] `/api/auth/refresh-token` endpoint
- [ ] `/api/auth/logout` endpoint

### Phase 3: Core Features
- [ ] `/api/student/profile` GET and PUT
- [ ] `/api/bookings/*` all endpoints
- [ ] `/api/invoices/*` all endpoints
- [ ] Payment gateway integration (Swish/Qliro)

### Phase 4: LMS (if applicable)
- [ ] `/api/lms/status` endpoint
- [ ] `/api/lms/materials` endpoints
- [ ] `/api/lms/quizzes` endpoints
- [ ] Progress tracking implementation

### Phase 5: Testing & Security
- [ ] Unit tests for all endpoints
- [ ] Integration tests for payment flows
- [ ] Security audit
- [ ] Rate limiting implementation
- [ ] Error handling and logging
- [ ] Performance testing

---

# 11. Changelog

- **v2.0** (2026-02-05): Complete API specification with authentication, bookings, LMS, and payments
- **v1.0** (2026-02-05): Initial API specification (app-config only)
