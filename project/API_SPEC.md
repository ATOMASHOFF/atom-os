# API_SPEC.md

## Base URL
- Dev: `http://localhost:4000`
- Prod: `https://atom-os-api.railway.app`

## Auth Headers
All protected routes require:
```
Authorization: Bearer <supabase_jwt>
```

---

## AUTH ROUTES `/api/auth`

### POST /api/auth/signup
Body: `{ email, password, full_name }`
Response: `{ user, session }` | Role always defaults to `member`

### POST /api/auth/login
Body: `{ email, password }`
Response: `{ user, session, role }`

### GET /api/auth/me
Auth: Required
Response: `{ id, email, role, full_name, gym_id }`

---

## GYM ROUTES `/api/gyms` — super_admin only

### GET /api/gyms
Response: `{ gyms: Gym[] }`

### POST /api/gyms
Body: `{ name, city, state, phone, email }`
Response: `{ gym }` (gym_code auto-generated)

### PATCH /api/gyms/:id
Body: Partial Gym
Response: `{ gym }`

### PATCH /api/gyms/:id/status
Body: `{ status: 'active' | 'inactive' | 'suspended' }`
Response: `{ gym }`

### POST /api/gyms/:id/assign-admin
Body: `{ user_id }`
Response: `{ ok: true }`

---

## MEMBERSHIP ROUTES `/api/membership`

### GET /api/membership/gyms
Auth: member
Desc: Browse active gyms (for join)
Response: `{ gyms: { id, name, city, gym_code }[] }`

### POST /api/membership/join
Auth: member
Body: `{ gym_code }`
Response: `{ membership }` — status: 'pending'

### GET /api/membership/status
Auth: member
Response: `{ memberships: GymMember[] }`

### GET /api/membership/requests — gym_admin
Auth: gym_admin
Response: `{ requests: JoinRequest[] }`

### PATCH /api/membership/requests/:id
Auth: gym_admin
Body: `{ status: 'approved' | 'rejected' }`
Response: `{ membership }`

### GET /api/membership/members — gym_admin
Auth: gym_admin
Response: `{ members: Member[] }`

---

## QR ROUTES `/api/qr`

### GET /api/qr/current — gym_admin
Auth: gym_admin
Desc: Get current active QR token for gym (rotates automatically)
Response: `{ token, expires_at, qr_data_url }`

### POST /api/qr/rotate — gym_admin
Auth: gym_admin
Desc: Force-rotate QR token
Response: `{ token, expires_at }`

---

## CHECKIN ROUTES `/api/checkins`

### POST /api/checkins/scan — member
Auth: member
Body: `{ token }`
Response: `{ checkin }` | 409 if already checked in today

### GET /api/checkins/my — member
Auth: member
Response: `{ checkins: Checkin[] }`

### GET /api/checkins/gym — gym_admin
Auth: gym_admin
Query: `?date=YYYY-MM-DD&page=1&limit=50`
Response: `{ checkins: CheckinWithUser[], total }`

---

## WORKOUT ROUTES `/api/workouts`

### GET /api/workouts
Auth: member
Response: `{ logs: WorkoutLog[] }`

### POST /api/workouts
Auth: member
Body: `{ title, notes, workout_date }`
Response: `{ log }`

### GET /api/workouts/:id
Auth: member
Response: `{ log, sets: WorkoutSet[] }`

### PATCH /api/workouts/:id
Auth: member
Body: Partial WorkoutLog
Response: `{ log }`

### DELETE /api/workouts/:id
Auth: member
Response: `{ ok: true }`

### POST /api/workouts/:id/sets
Auth: member
Body: `{ exercise_id, set_number, reps, weight_kg, notes }`
Response: `{ set }`

### DELETE /api/workouts/:id/sets/:setId
Auth: member
Response: `{ ok: true }`

---

## SUPER ADMIN ROUTES `/api/admin`

### GET /api/admin/stats
Auth: super_admin
Response: `{ total_gyms, active_gyms, total_members, total_checkins_today }`

### GET /api/admin/gyms
Auth: super_admin
Response: `{ gyms: GymWithStats[] }`

---

## ERROR FORMAT
```json
{ "error": "message", "code": "ERROR_CODE", "details": {} }
```

## Status Codes
- 200 OK
- 201 Created
- 400 Bad Request (validation)
- 401 Unauthorized
- 403 Forbidden (wrong role)
- 404 Not Found
- 409 Conflict
- 429 Rate Limited
- 500 Server Error
