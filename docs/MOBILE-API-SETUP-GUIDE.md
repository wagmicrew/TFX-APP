# TFX Mobile App — Server API Setup Guide

This document explains **why the app isn't showing live data** and exactly what needs to be done on the server (V25 / Next.js + Drizzle) to fix it — including the Quiz system.

---

## 🔴 ROOT CAUSE: Why No Live Data Is Showing

### The `apiBaseUrl` Path Mismatch

~~**This is the #1 reason nothing works.**~~

**FIXED** — The server's `/api/app-config` endpoint now correctly returns:

```json
{
  "data": {
    "apiBaseUrl": "https://dev.dintrafikskolahlm.se/api/mobile"
  }
}
```

But the mobile app's service functions append paths like `/bookings`, `/invoices`, `/lms/courses`, etc. to this base URL. So the app is calling:

| App calls (WRONG) | Server route (CORRECT) |
|---|---|
| `GET /api/bookings` | `GET /api/mobile/bookings` |
| `GET /api/invoices` | `GET /api/mobile/invoices` |
| `GET /api/lms/courses` | `GET /api/mobile/lms/courses` |
| `GET /api/lms/quizzes/:id` | ❌ Does not exist yet |
| `POST /api/auth/refresh` | `POST /api/mobile/auth/refresh` |

**Every single API call is going to the wrong URL.**

### The Fix (choose ONE):

#### Option A — Fix `/api/app-config` response (RECOMMENDED)

In `app/api/app-config/route.ts`, change the `apiBaseUrl` to include `/mobile`:

```typescript
// BEFORE:
const apiBaseUrl = `${protocol}://${host}/api`;

// AFTER:
const apiBaseUrl = `${protocol}://${host}/api/mobile`;
```

This is a one-line server fix and everything else will start working.

#### Option B — Fix the app to add `/mobile` prefix

Not recommended — the server should return the correct base URL.

---

## 🔴 Server Currently Returns 502

When I tried to hit `https://dev.dintrafikskolahlm.se/api/app-config` just now, it returned **HTTP 502 (Bad Gateway)**. This means:

- The server is either **down** or **not deployed**
- Or the DNS/proxy (Nginx, Cloudflare, Vercel) is misconfigured

**The app cannot fetch any data if the server is down.** Verify the server is running first.

---

## Existing Mobile Endpoints (Already Built in V25)

These endpoints **already exist** on the server. Once you fix the `apiBaseUrl`, they should start working:

| Endpoint | Server File | Status |
|---|---|---|
| `GET /api/mobile/bookings` | `app/api/mobile/bookings/route.ts` | ✅ Exists |
| `GET /api/mobile/invoices` | `app/api/mobile/invoices/route.ts` | ✅ Exists |
| `GET /api/mobile/lms/courses` | `app/api/mobile/lms/courses/route.ts` | ✅ Exists |
| `GET /api/mobile/lms/courses/:id/structure` | `app/api/mobile/lms/courses/[id]/structure/route.ts` | ✅ Exists |
| `GET /api/mobile/lms/lessons/:id` | `app/api/mobile/lms/lessons/[id]/route.ts` | ✅ Exists |
| `GET /api/mobile/korklar` | `app/api/mobile/korklar/route.ts` | ✅ Exists |
| `GET /api/mobile/student/profile` | `app/api/mobile/student/` | ✅ Exists |
| `POST /api/mobile/auth/*` | `app/api/mobile/auth/` | ✅ Exists |
| `GET /api/mobile/notifications` | `app/api/mobile/notifications/` | ✅ Exists |

---

## ✅ Mobile Quiz Endpoints (Built)

Both quiz endpoints now **exist** on the server:

### 1. `GET /api/mobile/lms/quizzes/:quizId` — Fetch quiz for taking

**File:** `app/api/mobile/lms/quizzes/[quizId]/route.ts` (192 lines)

- Fetches quiz activity + questions from `lms_quiz_question_bank`
- Supports i18n with locale fallback via `lms_activity_i18n`
- Maps question types: `multiple_choice` → `single`, `true_false` → `true-false`, `multi_select` → `multiple`
- Returns randomized questions with generated option IDs

### 2. `POST /api/mobile/lms/quizzes/:quizId/submit` — Submit quiz answers

**File:** `app/api/mobile/lms/quizzes/[quizId]/submit/route.ts` (158 lines)

- Grades answers against `lms_quiz_question_bank.optionsJson[].isCorrect`
- Records attempt in `lms_quiz_sessions`
- Returns per-question results with correct answers and explanations

---

## ✅ Standalone Theory Quiz (Practice Mode) — Built

The standalone theory quiz system using `q_questions` / `q_answers` tables is now **fully built** on both server and app sides.

### Database Schema Recap

**`q_questions`** table:
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Question ID |
| `question` | text | Swedish question text |
| `questionEn` | text | English question text |
| `questionType` | enum | `single` or `multiple` |
| `category` | text | Swedish category name |
| `categoryEn` | text | English category name |
| `imageUrl` | text | Optional question image |
| `explanation` | text | Swedish explanation |
| `explanationEn` | text | English explanation |
| `bookReference` | text | Book reference (Swedish) |
| `isActive` | boolean | Whether question is active |

**`q_answers`** table:
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Answer ID |
| `questionId` | UUID (FK → q_questions) | Parent question |
| `answerText` | text | Swedish answer text |
| `answerTextEn` | text | English answer text |
| `isCorrect` | boolean | Whether this is the correct answer |
| `sortOrder` | integer | Display order |

**`q_results`** table:
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Result ID |
| `userId` | UUID (FK → users) | Who took the quiz |
| `quizSessionId` | text | Session identifier |
| `totalQuestions` | integer | Total questions in session |
| `correctAnswers` | integer | How many were correct |
| `score` | float | Percentage score |
| `timeTaken` | integer | Seconds spent |
| `completedAt` | timestamp | When completed |

### Server Endpoints (V25)

| Endpoint | File | Status |
|---|---|---|
| `GET /api/mobile/lms/quizzes/practice` | `app/api/mobile/lms/quizzes/practice/route.ts` | ✅ Built |
| `POST /api/mobile/lms/quizzes/practice/submit` | `app/api/mobile/lms/quizzes/practice/submit/route.ts` | ✅ Built |
| `GET /api/mobile/lms/quizzes/practice/categories` | `app/api/mobile/lms/quizzes/practice/categories/route.ts` | ✅ Built |

### App Components (TFX-APP)

| Component | File | Status |
|---|---|---|
| Practice Quiz Screen | `app/lms/practice-quiz.tsx` | ✅ Built |
| API Service Functions | `services/lms-api.ts` | ✅ Added `fetchPracticeCategories`, `fetchPracticeQuiz`, `submitPracticeQuiz` |
| Types | `types/lms.ts` | ✅ Added `PracticeCategory`, `PracticeCategoriesResponse` |
| LMS Tab Entry Point | `app/(tabs)/lms.tsx` | ✅ Practice Quiz card added |
| Route Registration | `app/lms/_layout.tsx` | ✅ `practice-quiz` screen registered |

### Practice Quiz Flow

1. User taps "Övningsprov" card on LMS tab
2. Setup screen: choose question count (10/20/30/50) and optional category filter
3. Quiz: randomized questions from `q_questions` bank, same UI as LMS quiz
4. Submit: answers graded against `q_answers.isCorrect`, saved to `q_results`
5. Results: score, pass/fail (65% threshold), review with explanations

---

## Response Format Reference

The mobile app expects all responses in this format. All existing mobile endpoints already follow this, but double-check:

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "MACHINE_CODE"
}
```

### Quiz Fetch Response (GET /api/mobile/lms/quizzes/:id)

```json
{
  "success": true,
  "data": {
    "id": "activity-uuid",
    "title": "Kapitel 1 Quiz",
    "description": "Testa dina kunskaper",
    "chapterId": "module-uuid",
    "courseId": "course-uuid",
    "timeLimit": 600,
    "passingScore": 70,
    "questions": [
      {
        "id": "question-uuid",
        "text": "Vad betyder detta vägmärke?",
        "imageUrl": "https://cdn.example.com/signs/stop.png",
        "type": "single",
        "options": [
          { "id": "question-uuid_opt_0", "text": "Stopp", "imageUrl": null },
          { "id": "question-uuid_opt_1", "text": "Varning", "imageUrl": null },
          { "id": "question-uuid_opt_2", "text": "Väjningsplikt", "imageUrl": null }
        ],
        "explanation": "Stoppskylten innebär att du måste stanna."
      }
    ]
  }
}
```

### Quiz Submit Response (POST /api/mobile/lms/quizzes/:id/submit)

```json
{
  "success": true,
  "data": {
    "quizId": "activity-uuid",
    "score": 80,
    "passed": true,
    "totalQuestions": 10,
    "correctAnswers": 8,
    "wrongAnswers": 2,
    "results": [
      {
        "questionId": "question-uuid",
        "correct": true,
        "correctOptionIds": ["question-uuid_opt_0"],
        "selectedOptionIds": ["question-uuid_opt_0"],
        "explanation": "Stoppskylten innebär att du måste stanna."
      }
    ]
  }
}
```

---

## Invoices Response Format

The existing `app/api/mobile/invoices/route.ts` already returns the correct format. The app expects:

```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "inv-uuid",
        "invoiceNumber": "INV-2025001",
        "date": "2025-01-15",
        "dueDate": "2025-02-15",
        "amount": 4500,
        "currency": "SEK",
        "status": "unpaid",
        "description": "Övningskörning 10 timmar",
        "items": [],
        "pdfUrl": null,
        "paymentMethods": ["swish", "qliro"]
      }
    ],
    "summary": {
      "totalUnpaid": 4500,
      "totalOverdue": 0,
      "nextDueDate": "2025-02-15"
    }
  }
}
```

---

## Bookings Response Format

The existing `app/api/mobile/bookings/route.ts` returns `success: true, bookings: [...]` but the app dashboard expects `success: true, data: { bookings: [...] }`. This might need a small fix in the server:

```typescript
// CURRENT (in V25):
return NextResponse.json({ success: true, bookings: userBookings });

// EXPECTED by the app:
return NextResponse.json({ success: true, data: { bookings: userBookings } });
```

---

## Complete Checklist

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | **Fix `apiBaseUrl` in `/api/app-config`** — add `/mobile` suffix | 🔴 Critical | ✅ Done |
| 2 | **Ensure server is running** (was 502) | 🔴 Critical | ⚠️ Ops task |
| 3 | **Quiz fetch endpoint** `/api/mobile/lms/quizzes/[quizId]/route.ts` | 🔴 For Quiz | ✅ Done |
| 4 | **Quiz submit endpoint** `/api/mobile/lms/quizzes/[quizId]/submit/route.ts` | 🔴 For Quiz | ✅ Done |
| 5 | Fix bookings response to wrap in `data: {}` | 🟡 Medium | ⚠️ TODO |
| 6 | **Practice quiz endpoints** from `q_questions` | 🟢 Nice-to-have | ✅ Done |
| 7 | **Practice quiz app screen** with category picker | 🟢 Nice-to-have | ✅ Done |
| 8 | **Practice quiz categories endpoint** | 🟢 Nice-to-have | ✅ Done |
| 9 | Enable quiz feature flag (`lms_enable_quiz = 'true'` in `site_settings`) | 🟡 Medium | ⚠️ DB task |
| 10 | Add `lms_app_visibility` rows for courses | 🟡 Medium | ⚠️ SQL task |

### Step 8 Detail: Enable Courses in App

The mobile LMS courses endpoint filters by `lms_app_visibility.enabled = true`. If no rows exist in this table, no courses will show in the app. Run:

```sql
-- Enable all published courses in the mobile app
INSERT INTO lms_app_visibility (id, course_id, enabled, offline_enabled, priority)
SELECT 
  gen_random_uuid(),
  id,
  true,
  false,
  0
FROM lms_courses
WHERE status = 'published'
ON CONFLICT (course_id) DO UPDATE SET enabled = true;
```

### Step 7 Detail: Enable Quiz Feature Flag

In your app-config response, ensure `enableQuiz: true` is set in the features object or add `"quiz"` to the `enabledFeatures` array:

```json
{
  "features": {
    "enableQuiz": true,
    "enableLessons": true,
    "enableBookings": true,
    "enableInvoices": true,
    "enableLms": true,
    "enableProfile": true
  }
}
```

---

## Auth Note

All mobile endpoints use `verifyMobileSession()` which checks:
1. First: DB session lookup in `mobile_app_sessions` table
2. Fallback: JWT verification (stateless)

The mobile app sends `Authorization: Bearer <token>` + `X-App-Secret` on every request. This already works — the auth flow is fine once the base URL is corrected.
