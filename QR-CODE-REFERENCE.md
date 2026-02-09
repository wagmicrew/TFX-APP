# QR Code Integration Reference

This document explains the QR code formats used in TrafikskolaX for easy school setup and quick login.

## 1. School Configuration QR Code

Place this QR code on your school's website (e.g., on a "Download App" page) to allow students to quickly configure the app.

### QR Code Data Format

```json
{
  "type": "school_config",
  "domain": "dintrafikskolahlm.se"
}
```

### Implementation Example

**JavaScript (Browser)**
```javascript
// Using qrcode.js or similar library
const schoolConfigData = JSON.stringify({
  type: 'school_config',
  domain: 'dintrafikskolahlm.se'
});

QRCode.toCanvas(document.getElementById('school-qr'), schoolConfigData, {
  width: 300,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
});
```

**PHP (Backend)**
```php
<?php
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;

$data = json_encode([
    'type' => 'school_config',
    'domain' => 'dintrafikskolahlm.se'
]);

$qrCode = new QrCode($data);
$writer = new PngWriter();
$result = $writer->write($qrCode);

header('Content-Type: '.$result->getMimeType());
echo $result->getString();
```

**Python (Django)**
```python
import qrcode
import json

def generate_school_qr(request):
    data = json.dumps({
        'type': 'school_config',
        'domain': 'dintrafikskolahlm.se'
    })
    
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    # Save or return image
```

### Where to Display

1. **App Download Page**: Next to download buttons
2. **Student Portal**: On the dashboard or settings page
3. **Welcome Email**: Include in student onboarding emails
4. **Physical Materials**: Print on welcome packets or brochures

### User Experience

When students scan this QR code:
1. Open the TrafikskolaX app
2. Tap "Scan QR Code" on setup screen
3. Point camera at QR code
4. App automatically configures the school connection
5. Proceed to login

---

## 2. Quick Login QR Code

Display this QR code on logged-in student dashboards for instant mobile login without entering email/OTP.

### QR Code Data Format

```json
{
  "type": "quick_login",
  "token": "ql_8f3n29dk3n2kd93jd82nd9k39d",
  "expiresAt": 1708951200,
  "studentId": "12345"
}
```

### Field Descriptions

- **type**: Always `"quick_login"`
- **token**: One-time use token (generate unique per QR display)
- **expiresAt**: Unix timestamp (recommend 5 minutes expiry)
- **studentId**: The student's ID (optional, for logging)

### API Endpoint Required

**POST** `/api/auth/quick-login`

**Request:**
```json
{
  "quickToken": "ql_8f3n29dk3n2kd93jd82nd9k39d"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "12345",
      "email": "student@example.com",
      "name": "John Doe",
      "studentId": "STU-2024-001"
    }
  }
}
```

### Implementation Example

**PHP (Laravel)**
```php
// Generate QR token when student views dashboard
public function getDashboard(Request $request)
{
    $student = $request->user();
    
    // Generate one-time quick login token
    $quickToken = 'ql_' . bin2hex(random_bytes(32));
    $expiresAt = now()->addMinutes(5)->timestamp;
    
    // Store token in cache/redis with 5 min expiry
    Cache::put(
        "quick_login:{$quickToken}",
        [
            'student_id' => $student->id,
            'created_at' => now(),
        ],
        now()->addMinutes(5)
    );
    
    $qrData = json_encode([
        'type' => 'quick_login',
        'token' => $quickToken,
        'expiresAt' => $expiresAt,
        'studentId' => $student->id,
    ]);
    
    return view('dashboard', [
        'quickLoginQR' => $qrData,
        'student' => $student,
    ]);
}

// Handle quick login request
public function quickLogin(Request $request)
{
    $quickToken = $request->input('quickToken');
    
    // Validate and retrieve token data
    $tokenData = Cache::pull("quick_login:{$quickToken}");
    
    if (!$tokenData) {
        return response()->json([
            'success' => false,
            'error' => 'Invalid or expired token'
        ], 401);
    }
    
    $student = Student::findOrFail($tokenData['student_id']);
    
    // Generate session token
    $accessToken = $student->createToken('mobile-app')->plainTextToken;
    
    return response()->json([
        'success' => true,
        'data' => [
            'token' => $accessToken,
            'user' => [
                'id' => $student->id,
                'email' => $student->email,
                'name' => $student->name,
                'studentId' => $student->student_number,
            ],
        ],
    ]);
}
```

**JavaScript (React Dashboard)**
```javascript
import QRCode from 'qrcode.react';

function StudentDashboard({ quickLoginData }) {
  return (
    <div className="dashboard">
      <div className="quick-login-section">
        <h3>Quick Mobile Login</h3>
        <p>Scan this code with the TrafikskolaX app to login instantly</p>
        <QRCode
          value={quickLoginData}
          size={200}
          level="H"
          includeMargin={true}
        />
        <p className="text-sm text-gray-500">
          Code expires in 5 minutes
        </p>
      </div>
    </div>
  );
}
```

### Security Considerations

1. **One-Time Use**: Token must be invalidated after use
2. **Short Expiry**: Recommend 5 minutes maximum
3. **Secure Generation**: Use cryptographically secure random tokens
4. **Rate Limiting**: Limit QR generation per user
5. **IP Validation**: Optional - bind token to IP address
6. **Audit Logging**: Log all quick login attempts

### Where to Display

1. **Student Dashboard**: Main landing page after login
2. **Mobile Settings Page**: Under "Quick Login"
3. **Security Settings**: With refresh button

### User Experience

When students scan quick login QR:
1. Open TrafikskolaX app (must have school already configured)
2. Tap "Quick Login with QR" on login screen
3. Point camera at dashboard QR code
4. Instantly logged in - redirected to home

---

## Security Best Practices

### For Both QR Types

1. **HTTPS Only**: Only serve QR codes over HTTPS
2. **Content Security**: Validate JSON structure before displaying
3. **Rate Limiting**: Prevent QR generation spam
4. **Monitoring**: Track QR scan patterns for abuse

### Quick Login Specific

1. **Token Rotation**: Generate new token every page load
2. **Device Binding**: Consider binding to device fingerprint
3. **2FA Bypass Alert**: Notify user when quick login is used
4. **Revocation**: Allow users to disable quick login

---

## Testing QR Codes

### Online QR Generator
Use [qr-code-generator.com](https://www.qr-code-generator.com/) or similar to test:

**School Config Example:**
```
{"type":"school_config","domain":"dintrafikskolahlm.se"}
```

**Quick Login Example:**
```
{"type":"quick_login","token":"test_token_123","expiresAt":9999999999,"studentId":"test"}
```

### Testing Steps

1. Generate QR with test data
2. Open TrafikskolaX app
3. Navigate to appropriate screen
4. Tap QR scanner button
5. Scan generated QR
6. Verify correct behavior

---

## Troubleshooting

### QR Not Scanning

- Ensure JSON is valid (no trailing commas)
- Check QR size (minimum 200x200px recommended)
- Verify camera permissions granted
- Good lighting conditions required

### Quick Login Fails

- Check token hasn't expired
- Verify token exists in cache/database
- Confirm API endpoint is correct
- Check X-App-Secret header

### School Config Invalid

- Validate domain format (no https://)
- Ensure `type` field is exactly `"school_config"`
- Test API endpoint is accessible
- Verify CORS settings if needed
