# Doctor Accounts & Testing Guide

## How to View All Doctors

### Option 1: Via Admin Dashboard (Easiest)
1. Login as **Admin** (admins are created in Supabase: `update public.users set role = 'admin' where email = '...';`)
2. Go to: **http://localhost:3000/admin/doctors**
3. You'll see all doctors with:
   - Email addresses
   - Specialization
   - Availability status
   - Appointment counts

### Option 2: Via API Endpoint
```bash
# In browser or Postman:
GET http://localhost:3000/api/list-doctors   # admins only: send Authorization: Bearer <access token>

# Or using curl:
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/api/list-doctors
```

### Option 3: Using Script (Requires Node.js)
```bash
# Install tsx if needed:
npm install -g tsx

# Run the script:
npx tsx src/scripts/list-doctors.ts
```

---

## Fixing Doctors Missing Staff Entries

If doctors don't appear in the booking list, they might be missing staff entries. Fix this:

### Option 1: Via Script
```bash
npx tsx src/scripts/fix-doctors.ts
```

This will:
- Find all doctors without staff entries
- Create staff entries with default values:
  - Specialization: "General Medicine"
  - Shift Hours: 8
  - Available: true

### Option 2: Manual Fix via Supabase Dashboard
1. Go to your Supabase dashboard
2. Navigate to `staff` table
3. For each doctor missing an entry, insert:
   ```sql
   INSERT INTO staff (doctor_id, specialization, shift_hours, patients_handled_today, is_available)
   VALUES ('doctor_user_id_here', 'General Medicine', 8, 0, true);
   ```

---

## Testing Doctor-Patient Flow

### Step 1: Verify Doctor Exists
1. Login as Admin → Go to `/admin/doctors`
2. Note down a doctor's email (passwords are hashed by Supabase Auth and cannot be viewed)
3. Verify the doctor has:
   - ✅ Staff entry (green badge)
   - ✅ Available status (blue badge)

### Step 2: Book Appointment as Patient
1. Login/Register as Patient
2. Go to `/patient/book`
3. **Verify**: The doctor appears in the list (even if they don't have a staff entry - this is now fixed)
4. Select the doctor
5. Fill in symptoms and vitals
6. Complete booking

### Step 3: Verify Doctor Sees Patient
1. **Logout** from patient account
2. **Login as the doctor** (using the email from Step 1 and the password chosen at registration)
3. Go to `/doctor/dashboard`
4. **Verify**: Patient appears in queue with:
   - Patient name
   - Patient email (with mail icon)
   - Symptoms
   - Vitals (fever, BP, SpO2, age)
   - Severity badge
   - Token number

---

## Common Issues & Solutions

### Issue: Doctor doesn't appear in booking list
**Solution**: 
- Check if doctor has `is_available = true` in `staff` table
- Run `npx tsx src/scripts/fix-doctors.ts` to fix missing staff entries
- The booking page now shows ALL doctors, but unavailable ones appear at the bottom

### Issue: Doctor can't see patients after booking
**Check**:
1. Open browser console (F12)
2. Look for `[Booking]` logs when patient books
3. Verify `doctor_id` matches the doctor's `user_id`
4. Check Supabase `appointments` table:
   ```sql
   SELECT * FROM appointments WHERE doctor_id = 'doctor_user_id_here';
   ```

### Issue: Patient email not showing in doctor dashboard
**Solution**: 
- The doctor dashboard now has a fallback query system
- If Supabase FK join fails, it fetches patient data separately
- Check browser console for any errors

---

## Database Schema Reference

### `users` table
- `user_id` (UUID, primary key, = `auth.users.id`)
- `name` (text)
- `email` (text, unique)
- `role` (text: "patient" | "doctor" | "admin")
- `created_at` (timestamp)

### `staff` table
- `doctor_id` (UUID, foreign key → users.user_id)
- `specialization` (text)
- `shift_hours` (integer)
- `patients_handled_today` (integer)
- `is_available` (boolean)

### `appointments` table
- `appointment_id` (UUID, primary key)
- `patient_id` (UUID, foreign key → users.user_id)
- `doctor_id` (UUID, foreign key → users.user_id) ← **This must match!**
- `symptoms` (text)
- `severity_score` (integer, 1-5)
- `status` (text: "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show")
- `token_number` (integer)
- `queue_position` (integer)
- `created_at` (timestamp)

---

## Quick Commands

```bash
# Start dev server
npm run dev

# View doctors (via API)
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/api/list-doctors | jq

# List doctors (via script)
npx tsx src/scripts/list-doctors.ts

# Fix missing staff entries
npx tsx src/scripts/fix-doctors.ts
```

---

## Notes

- **Passwords**: Handled by Supabase Auth and stored only as bcrypt hashes in `auth.users`; they are never returned by the app or its API
- **Email Notifications**: Require `RESEND_API_KEY` in `.env.local` (optional)
- **Doctor Availability**: Only doctors with `is_available = true` are prioritized in booking list
- **All Doctors Visible**: The booking page now shows ALL doctors, regardless of staff entry status
