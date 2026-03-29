# DiagnoAI REST API Reference

Complete API documentation for the DiagnoAI backend.

**Base URL:** `http://localhost:8000/api`  
**Authentication:** Bearer JWT token in `Authorization` header  
**CSRF:** Include `X-CSRF-Token` header (value from `csrf_token` cookie) on mutating requests

---

## Authentication

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "full_name": "Dr. Jane Smith",
  "password": "SecurePass1!",
  "admin_secret": "optional-admin-key"
}
```

**Responses:**
- `201 Created` — User registered successfully
- `400 Bad Request` — Email already exists or password too weak
- `422 Unprocessable Entity` — Validation error

---

### POST /auth/login
Login with email/password. Returns JWT token.

**Request Body (form-encoded):**
```
username=user@example.com&password=SecurePass1!
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

---

### POST /auth/google
Sign in with a Google ID token.

**Request Body:**
```json
{ "token": "<google-id-token>" }
```

---

### GET /auth/me
Get the current authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "Dr. Jane Smith",
  "role": "doctor",
  "is_active": true
}
```

---

### POST /auth/forgot-password
Request a password reset email.

**Request Body:**
```json
{ "email": "user@example.com" }
```

---

### POST /auth/reset-password
Reset password using the token from the email link.

**Request Body:**
```json
{
  "token": "<reset-token>",
  "new_password": "NewSecurePass1!"
}
```

---

## X-Ray Analysis

### POST /xray/analyze
Upload an X-ray image for AI-powered analysis. Returns results synchronously.

**Auth:** Required  
**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | X-ray image (JPEG, PNG, DICOM) |
| `xray_type` | string | Yes | Type: `chest`, `knee`, `hand` |
| `patient_first_name` | string | Doctor role: Yes | Patient first name |
| `patient_last_name` | string | Doctor role: Yes | Patient last name |
| `patient_date_of_birth` | string | No | ISO date `YYYY-MM-DD` |
| `patient_gender` | string | No | `M`, `F`, or `Other` |
| `patient_id` | int | No | Existing patient ID to link to |

**Response:**
```json
{
  "prediction": "Pneumonia",
  "confidence": 0.89,
  "probabilities": { "Pneumonia": 0.89, "Normal": 0.07, "COVID-19": 0.04 },
  "heatmap_b64": "<base64-png>",
  "region": "Lower Left Lobe",
  "findings": [
    { "condition": "Pneumonia", "score": 0.89, "severity": "high" }
  ],
  "xai_details": {
    "Pneumonia": {
      "radiological_finding": "...",
      "visual_pattern": "...",
      "visual_evidence": "...",
      "clinical_context": "...",
      "recommendation": "...",
      "severity": "high",
      "region": "Lower Left Lobe",
      "confidence_pct": 89.0
    }
  },
  "model_info": {
    "name": "DenseNet121",
    "trained_on": "CheXpert + NIH",
    "pathologies_count": 18,
    "xai_method": "Grad-CAM"
  }
}
```

---

## Lab Analysis

### POST /lab/upload-file
Upload a lab report image/PDF for OCR extraction only (returns extracted values, does NOT save to history).

**Auth:** Required  
**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Lab report image or PDF |

**Response:**
```json
{
  "extracted_data": [{ "Test": "WBC", "Value": "7200", "Unit": "/µL", "Reference": "4500-11000" }],
  "confidence": 0.94,
  "ocr_text": "...",
  "status": "success"
}
```

---

### POST /lab/analyze-manual
Analyze manually entered lab values. Saves report to history.

**Auth:** Required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "values": { "wbc": 7200, "rbc": 4.5, "hgb": 14.2 },
  "patient_id": null,
  "patient": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1985-06-15"
  }
}
```

**Response:** Same shape as `/xray/analyze` but for lab results.

---

### POST /lab/analyze-from-file
Upload and analyze a lab report end-to-end. Enqueues background Celery task.

**Auth:** Required  
**Content-Type:** `multipart/form-data`

**Response:**
```json
{
  "message": "Lab report analysis started in the background",
  "task_id": "abc123-...",
  "report_id": 42
}
```

Use `GET /tasks/status/{task_id}` to poll for results.

---

## Background Tasks

### GET /tasks/status/{task_id}
Check the status and result of a background Celery task.

**Auth:** Required

**Response:**
```json
{
  "task_id": "abc123",
  "status": "SUCCESS",
  "result": { "assessment": "Normal", "confidence": 0.95, "parameters": [...] }
}
```

---

## Reports & History

### GET /reports/history
Get the authenticated user's report history (newest first).

**Auth:** Required

**Response:** Array of `ReportResponse` objects.

---

### DELETE /reports/{report_id}
Delete a report. Only the report owner or an admin may delete.

**Auth:** Required

- `200 OK` — Deleted
- `403 Forbidden` — Not the owner and not admin
- `404 Not Found` — Report doesn't exist

---

## Feedback

### POST /feedback
Submit accuracy feedback for an AI analysis result.

**Auth:** Required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "report_id": 42,
  "report_type": "xray",
  "rating": "up",
  "comment": "The Pneumonia detection was accurate."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `rating` | `"up"` \| `"down"` | Yes | Thumbs up (accurate) or down (inaccurate) |
| `report_id` | int | No | Link to specific report |
| `report_type` | `"xray"` \| `"lab"` | No | Type of analysis |
| `comment` | string | No | Free-text comment |

**Response:**
```json
{ "message": "Feedback submitted successfully", "id": 1 }
```

---

## Admin Endpoints

All admin endpoints require the `admin` role.

### GET /admin/users
List all users.

### PATCH /admin/users/{user_id}/role
Update a user's role.

**Request Body:** `{ "role": "doctor" }`

### DELETE /admin/users/{user_id}
Delete a user. Cannot delete your own account.

### POST /admin/users/bulk-delete
Delete multiple users.

**Request Body:** `{ "ids": [1, 2, 3] }`

### GET /admin/reports
List all reports system-wide.

### DELETE /admin/reports/{report_id}
Delete any report.

### POST /admin/reports/bulk-delete
Delete multiple reports.

---

## WebSocket

### WS /ws/{client_id}
Connect to real-time task notifications.

**Events received:**
```json
{ "type": "task_update", "task_id": "abc123", "status": "SUCCESS", "result": {...} }
```

---

## Health

### GET /health
Health check endpoint (no auth required).

**Response:** `{ "status": "healthy", "project": "DiagnoAI" }`

---

## Error Format

All errors follow FastAPI's standard format:

```json
{ "detail": "Human-readable error message" }
```

Common HTTP status codes:
| Code | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 413 | File too large |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
