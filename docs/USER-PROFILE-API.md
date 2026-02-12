# User Profile & Avatar — Required Server Endpoints

The mobile app expects these endpoints under `/api/mobile/`. All authenticated endpoints require:
- `Authorization: Bearer <accessToken>`
- `X-App-Secret: sk_trafikskola_prod_...`

---

## 1. GET `/api/mobile/student/profile`

Returns the authenticated student's full profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "email": "anna@example.com",
    "firstName": "Anna",
    "lastName": "Svensson",
    "phone": "+46701234567",
    "address": "Storgatan 1, 111 22 Stockholm",
    "profileImageUrl": "https://cdn.example.com/avatars/usr_123.jpg",
    "personalNumber": "19950101-1234",
    "enrolledAt": "2025-09-01T00:00:00Z",
    "licenseType": "B",
    "instructor": {
      "id": "instr_1",
      "name": "Erik Johansson"
    },
    "progress": {
      "lessonsCompleted": 12,
      "totalLessons": 20,
      "examStatus": "not_booked"
    }
  }
}
```

**Key fields for avatar:**
- `profileImageUrl` — Full URL to the user's avatar image (JPEG/PNG). `null` if no avatar is set.

---

## 2. PUT `/api/mobile/student/profile`

Updates the student's editable profile fields. Only include fields that changed.

**Request body:**
```json
{
  "firstName": "Anna",
  "lastName": "Svensson",
  "phone": "+46701234567",
  "address": "Ny adress 5"
}
```

**Response:**
```json
{
  "success": true
}
```

**Server should:**
- Validate fields (e.g. phone format).
- Update the corresponding user record in the database.
- These changes should reflect on the website/admin dashboard too.

---

## 3. POST `/api/mobile/student/avatar`

Uploads a new profile image. Uses **multipart/form-data**.

**Request:**
- Content-Type: `multipart/form-data`
- Form field: `avatar` (the image file, JPEG or PNG, max ~5MB recommended)

**Example curl:**
```bash
curl -X POST https://trafikskola.se/api/mobile/student/avatar \
  -H "Authorization: Bearer <token>" \
  -H "X-App-Secret: sk_trafikskola_prod_..." \
  -F "avatar=@photo.jpg"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://cdn.example.com/avatars/usr_123_1708000000.jpg"
  }
}
```

**Server should:**
1. Accept the uploaded image file from the `avatar` form field.
2. Resize/optimize (recommended: 512×512 max, JPEG quality 85).
3. Store in your CDN/storage (S3, local uploads, etc.).
4. Update the user's `profileImageUrl` in the database.
5. **Also set the image as the user's website avatar** (same image URL used across web + mobile).
6. Delete the old avatar file if replacing.
7. Return the new public URL.

**Error response:**
```json
{
  "success": false,
  "error": "File too large. Maximum size is 5MB."
}
```

---

## 4. DELETE `/api/mobile/student/avatar`

Removes the user's avatar, reverting to default/no image.

**Response:**
```json
{
  "success": true
}
```

**Server should:**
1. Delete the avatar file from storage.
2. Set `profileImageUrl` to `null` in the database.
3. Clear the website avatar too (consistent across platforms).

---

## Server-Side Implementation Notes

### Express.js example (with multer):
```javascript
const multer = require('multer');
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG are allowed'));
    }
  },
});

// Upload avatar
router.post('/student/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  const userId = req.user.id;
  const file = req.file;

  // 1. Process image (resize with sharp, etc.)
  // 2. Upload to storage (S3, local, etc.)
  const avatarUrl = await uploadToStorage(file);

  // 3. Update user record — this URL is used on both web and mobile
  await db.user.update({
    where: { id: userId },
    data: { profileImageUrl: avatarUrl },
  });

  // 4. Clean up old avatar if needed
  res.json({ success: true, data: { avatarUrl } });
});

// Delete avatar
router.delete('/student/avatar', authenticate, async (req, res) => {
  const userId = req.user.id;
  const user = await db.user.findUnique({ where: { id: userId } });

  if (user.profileImageUrl) {
    await deleteFromStorage(user.profileImageUrl);
  }

  await db.user.update({
    where: { id: userId },
    data: { profileImageUrl: null },
  });

  res.json({ success: true });
});
```

### Feature flags (already implemented)

The app already respects server-side feature flags from `GET /api/mobile/config?domain=X`:

```json
{
  "features": {
    "bookings": true,
    "lms": true,
    "quiz": true,
    "certificates": false,
    "korklar": true,
    "invoices": true,
    "profile": true,
    "offlineMode": false
  }
}
```

Tabs and quick actions are shown/hidden based on these flags. No additional work needed on the server for this.
