# Admin Notifications - Debugging Guide

## Testing Admin Actions with Notifications

### Setup for Testing

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **Open browser console** (F12 or Right-click → Inspect → Console)

3. **Monitor the terminal** where `npm run dev` is running

### What to Look For

When you perform an admin action (e.g., ban a user), you should see **detailed logs** in your terminal:

#### Expected Console Output:

```
[Admin Action] Sending ban notification to user: clxyz123...
[Notification] Starting comprehensive notification for user: clxyz123... Type: ACCOUNT_SUSPENDED
[Notification] User found: user@example.com
[Notification] Creating database record...
[Notification] Database record created: not_abc123...
[Notification] Attempting to send push notification...
[Notification] Push notification sent successfully
[Notification] Attempting to send email to: user@example.com
[Notification] Email sent successfully to user@example.com MessageID: <...>
[Notification] Comprehensive notification completed successfully
[Admin Action] Ban/Unban notification result: { success: true, notificationId: 'not_abc123...' }
```

### Testing Each Action

#### 1. **Ban/Unban User**

- Navigate to `/admin/users/[userId]`
- Click "Admin Actions" → "Ban User" (or "Unban User")
- **Expected:**
  - Toast: "User banned successfully. Notifications sent."
  - Console logs showing notification process
  - Database: New record in `Notification` table
  - Email: User receives ban email
  - Push: User receives push notification (if FCM token exists)

#### 2. **Change User Role**

- Navigate to `/admin/users/[userId]`
- Click "Admin Actions" → "Change Role"
- Select new role → "Update Role"
- **Expected:**
  - Toast: "User role updated to PROVIDER. Notifications sent."
  - Console logs
  - Email with role change details
  - Push notification

#### 3. **Schedule Account Deletion**

- Navigate to `/admin/users/[userId]`
- Click "Admin Actions" → "Schedule Deletion"
- Enter reason → "Schedule Deletion"
- **Expected:**
  - Toast: "Account deletion scheduled. User has been notified."
  - Console logs
  - Email with 30-day warning
  - Push notification

#### 4. **Cancel Account Deletion**

- Navigate to `/admin/users/[userId]` (user must have deletion scheduled)
- Click "Admin Actions" → "Cancel Deletion"
- **Expected:**
  - Toast: "Account deletion cancelled. User has been notified."
  - Console logs
  - "Good news" email
  - Push notification

#### 5. **Send Password Reset**

- Navigate to `/admin/users/[userId]`
- Click "Admin Actions" → "Send Password Reset"
- **Expected:**
  - Toast: "Password reset email sent successfully."
  - Console logs
  - Email with reset link
  - Push notification with security alert

### Common Issues & Solutions

#### Issue 1: No Notifications Sent

**Check Terminal Logs:**

- Look for `[Notification] Failed to send...` errors
- Common errors:
  - **"User not found"**: Wrong userId
  - **Email error**: Check EMAIL\_\* env vars
  - **Push error**: User has no FCM token (expected if they haven't enabled notifications)

**Solution:**

1. Check `.env` file has:

   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASSWORD=your_app_password
   EMAIL_FROM=support@gtss.software
   NEXTAUTH_URL=http://localhost:3000
   ```

2. For Gmail, use an **App Password**:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use that as `EMAIL_PASSWORD`

#### Issue 2: Toast Shows Error

**Check the toast message** - it will include the error details

**Common errors:**

- "Failed to ban user: User not found" → Check userId
- "Failed to update role: Unauthorized" → Check admin permissions
- "Failed to send password reset: User has no email" → User needs email

#### Issue 3: Database Notification Created but No Email/Push

**This is OK!** The system is designed to be resilient:

- If email fails → DB + Push still sent
- If push fails → DB + Email still sent
- Check specific error logs for email/push

**For Email Issues:**

```
[Notification] Failed to send email notification: Error: Invalid login...
```

→ Check EMAIL_USER and EMAIL_PASSWORD

**For Push Issues:**

```
[Notification] Failed to send push notification: Error: No FCM token...
```

→ User hasn't enabled notifications (this is expected)

#### Issue 4: No Console Logs at All

**Possible causes:**

1. Admin action not being triggered
2. Server not running
3. Error happening before notification code

**Solution:**

1. Check terminal shows request: `POST /api/admin/...`
2. Check for TypeScript/build errors
3. Check browser console for client-side errors

### Verifying Success

#### 1. Check Database

```sql
-- Check notifications were created
SELECT * FROM "Notification" ORDER BY "createdAt" DESC LIMIT 5;

-- Check admin logs
SELECT * FROM "AdminLog" ORDER BY "createdAt" DESC LIMIT 5;
```

#### 2. Check Email

- Look in user's inbox (check spam folder too!)
- Email subject should match action:
  - "Account Status Update - JustInTime" (ban)
  - "Welcome Back - Account Reinstated" (unban)
  - "Your Account Role Has Been Updated" (role change)
  - etc.

#### 3. Check Push Notification

- User must have:
  - Enabled notifications (clicked overlay or toggled in settings)
  - Browser open (for foreground) or background notifications working
  - Valid FCM token registered

### Environment Variables Checklist

✅ **Required for Emails:**

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password  # Use App Password for Gmail!
EMAIL_FROM=support@gtss.software
```

✅ **Required for Push:**

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

✅ **Required for Links:**

```env
NEXTAUTH_URL=http://localhost:3000  # or your production URL
```

### Quick Test Script

Run this to test a ban action:

1. Go to `/admin/users`
2. Click any user
3. Click "Admin Actions"
4. Click "Ban User"
5. Confirm
6. Watch terminal for logs
7. Check toast notification
8. Verify in database

---

## Need Help?

If notifications still aren't working after checking above:

1. Share terminal logs from `[Notification]` and `[Admin Action]`
2. Share any error messages from toast
3. Confirm environment variables are set
4. Check if user has an email address in database
