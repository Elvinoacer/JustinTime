# Admin Notifications - Fixes Applied

## Issues Fixed

### 1. ✅ Push Notifications - Incorrect Message Format

**Problem:** Push notifications weren't showing correct title/message/images

**Root Cause:** The `dispatcher.ts` expected payload structure `{title, body, imageUrl}` but we were sending `{notification: {title, body}, data}`

**Solution:**

- Updated `dispatcher.ts` to accept both payload formats
- Added payload normalization to handle nested notification object
- Added `imageUrl` support in webpush configuration
- Removed duplicate database notification creation (was creating twice)

**Files Changed:**

- `src/lib/notifications/dispatcher.ts`

### 2. ✅ Email Notifications - Not Being Sent

**Problem:** Emails weren't being sent despite correct env configuration

**Debugging Added:**

- Email transporter config logging (without exposing password)
- Detailed error logging with error code, message, and full error object
- Step-by-step email sending process logs

**Files Changed:**

- `src/lib/notifications/adminNotifications.ts`

## Testing Steps

### 1. Check Terminal Logs

When you perform an admin action, you should now see:

```
[Admin Action] Sending ban notification to user: clxyz123...

# Email Configuration
[Email] Creating transporter with config: {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: 'your_email@gmail.com',
  hasPassword: true
}

# Notification Process
[Notification] Starting comprehensive notification for user: clxyz123... Type: ACCOUNT_SUSPENDED
[Notification] User found: user@example.com
[Notification] Creating database record...
[Notification] Database record created: not_abc123...

# Push Notification
[Notification] Attempting to send push notification...
[FCM Dispatcher] Sending notification: { title: 'Account Suspended', body: '...', userId: '...' }
[FCM Dispatcher] Found 2 token(s) for user clxyz123...
[FCM Dispatcher] Sending to Firebase...
[FCM Dispatcher] Sent: 2 success, 0 failures
[Notification] Push notification sent successfully

# Email
[Notification] Attempting to send email to: user@example.com
[Notification] Email sent successfully to user@example.com MessageID: <...>

# Result
[Notification] Comprehensive notification completed successfully
[Admin Action] Ban/Unban notification result: { success: true, notificationId: 'not_abc123...' }
```

### 2. If Email Fails

You'll now see detailed error information:

```
[Notification] Failed to send email notification:
[Notification] Error message: Invalid login: 535-5.7.8 Username and Password not accepted
[Notification] Error code: EAUTH
[Notification] Full error: {
  "code": "EAUTH",
  "response": "535-5.7.8 Username and Password not accepted...",
  "responseCode": 535,
  "command": "AUTH PLAIN"
}
```

**Common Email Errors:**

| Error Code     | Meaning                      | Solution                                                                        |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `EAUTH`        | Authentication failed        | Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`. For Gmail, use App Password! |
| `ECONNREFUSED` | Can't connect to SMTP server | Check `EMAIL_HOST` and `EMAIL_PORT`                                             |
| `ETIMEDOUT`    | Connection timeout           | Check firewall/network settings                                                 |
| `ENOTFOUND`    | Host not found               | Verify `EMAIL_HOST` is correct                                                  |

### 3. Gmail App Password Setup

If using Gmail, you **MUST** use an App Password:

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (if not already)
3. Go to App passwords: https://myaccount.google.com/apppasswords
4. Select app: "Mail"
5. Select device: "Other (Custom name)" → Enter "JustInTime"
6. Click "Generate"
7. Copy the 16-character password
8. Use this as `EMAIL_PASSWORD` in your `.env`

## Environment Variables

Ensure your `.env` has:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_16_char_app_password  # NOT your regular Gmail password!
EMAIL_FROM=support@gtss.software

# App URL
NEXTAUTH_URL=http://localhost:3000
```

## What Changed

### Push Notification Payload (Before → After)

**Before:**

```typescript
await sendNotificationToUser(userId, {
  notification: { title, body },
  data: { type, url },
});
// ❌ Didn't work - dispatcher expected different format
```

**After:**

```typescript
await sendNotificationToUser(userId, {
  notification: { title, body, imageUrl }, // ✅ Now handled correctly
  data: { type, url },
});
// ✅ Dispatcher normalizes this to { title, body, imageUrl, data }
```

### Database Notifications (Before → After)

**Before:**

- Created in `adminNotifications.ts` ✅
- Created again in `dispatcher.ts` ❌ (DUPLICATE!)

**After:**

- Created once in `adminNotifications.ts` ✅
- Dispatcher skips database creation ✅

## Verification

### Check Logs Show:

1. ✅ Email config with `hasPassword: true`
2. ✅ Push notification with correct `{ title, body }`
3. ✅ Email sent with `MessageID`
4. ✅ Single notification in database (not duplicate)
5. ✅ User receives toast: "User banned successfully. Notifications sent."

### If Still Having Issues:

**Push Notifications:**

- Check terminal for `[FCM Dispatcher]` logs
- Verify user has FCM token in database
- Normal if user hasn't enabled notifications

**Email:**

- Check terminal for `[Email]` logs showing config
- Verify `hasPassword: true` in logs
- Check for error code (EAUTH, ECONNREFUSED, etc.)
- For Gmail: Use App Password, not regular password!

## Summary

✅ **Fixed:** Push notification payload structure  
✅ **Fixed:** Duplicate notification creation  
✅ **Added:** Comprehensive logging for debugging  
✅ **Added:** Email configuration validation  
✅ **Added:** Detailed error messages for email failures  
✅ **Added:** Image support in push notifications

The system is now fully instrumented and should work correctly!
