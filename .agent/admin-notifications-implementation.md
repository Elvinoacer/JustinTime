# Admin User Actions - Comprehensive Notification System

## Overview

Implemented a complete notification system for all admin actions performed on users in `/admin/users/[id]`. When an admin performs any action, the affected user receives:

1. **Push Notification** (via FCM)
2. **Email Notification** (via Resend)
3. **Database Notification Record** (in the Notification table)

## Implementation Details

### Core Service

Created `/src/lib/notifications/adminNotifications.ts` which provides:

- `sendComprehensiveNotification()` - Main function that sends all three notification types
- `emailTemplates` - Beautiful HTML email templates for each admin action

### Integrated Admin Actions

All the following admin actions now send comprehensive notifications:

#### 1. **Ban/Unban User**

**Trigger:** Admin toggles the ban status of a user

**Notifications Sent:**

- **Ban Action:**
  - Title: "Account Suspended"
  - Email: Professional template explaining the suspension
  - Push: Alert about account restriction
  - DB Record: Type "ACCOUNT_SUSPENDED"
- **Unban Action:**
  - Title: "Account Reinstated"
  - Email: Welcome back message with restored access info
  - Push: Good news notification
  - DB Record: Type "ACCOUNT_REINSTATED"

#### 2. **Change User Role**

**Trigger:** Admin changes user role (CLIENT → PROVIDER → ADMIN, etc.)

**Notifications Sent:**

- Title: "Account Role Updated"
- Email: Detailed explanation of role change from OLD_ROLE to NEW_ROLE
- Push: Alert about role update
- DB Record: Type "ROLE_CHANGED"
- Includes: Visual before/after comparison in email

#### 3. **Schedule Account Deletion**

**Trigger:** Admin schedules user account for deletion (30-day grace period)

**Notifications Sent:**

- Title: "Account Deletion Scheduled"
- Email: Warning with deletion date, reason, and appeal instructions
- Push: Urgent notification about scheduled deletion
- DB Record: Type "ACCOUNT_DELETION_SCHEDULED"
- Includes: Countdown timer in email, reason for deletion

#### 4. **Cancel Account Deletion**

**Trigger:** Admin cancels a previously scheduled deletion

**Notifications Sent:**

- Title: "Account Deletion Cancelled"
- Email: Good news message confirming account is safe
- Push: Positive notification
- DB Record: Type "ACCOUNT_DELETION_CANCELLED"

#### 5. **Send Password Reset**

**Trigger:** Admin triggers password reset for user

**Notifications Sent:**

- Title: "Password Reset Requested"
- Email: Professional template with reset link (24-hour expiry)
- Push: Security alert about password reset
- DB Record: Type "PASSWORD_RESET"
- Includes: Reset link, expiry warning, security notice

## Email Templates

All email templates feature:

- **Professional Design**: Gradient headers, clean layout
- **Mobile Responsive**: Looks great on all devices
- **Branded**: Consistent JustInTime branding
- **Actionable**: Clear CTAs (Contact Support, Go to Dashboard, etc.)
- **Informative**: Full context about the action taken

### Template Features by Action:

**Ban Email:**

- ⚠️ Alert styling (red theme)
- Explanation of restrictions
- List of what user can't do while banned
- Support contact button

**Unban Email:**

- ✓ Success styling (green theme)
- Welcome back message
- List of restored features
- Dashboard access button

**Role Change Email:**

- 🔄 Info styling (blue theme)
- Before/after role badges
- Impact on permissions
- Dashboard exploration prompt

**Deletion Scheduled Email:**

- ⏰ Warning styling (orange theme)
- Countdown display
- Reason for deletion
- Appeal instructions
- Support contact button

**Deletion Cancelled Email:**

- ✅ Success styling (green theme)
- Confirmation message
- Reassurance about account status

**Password Reset Email:**

- 🔐 Security styling (purple theme)
- Reset link with button
- 24-hour expiry warning
- Security notice

## Database Schema

Notifications are stored in the `Notification` model:

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  type      String   // e.g., "ACCOUNT_SUSPENDED", "ROLE_CHANGED", etc.
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Error Handling

The notification system is resilient:

- If **push notification fails**: Email and DB notification still sent
- If **email fails**: Push and DB notification still sent
- If **DB record fails**: The action itself doesn't fail
- All errors are logged for debugging

## Environment Variables Required

```env
# Email Service (Nodemailer - already configured)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=support@gtss.software

# App URL (for links in emails)
NEXTAUTH_URL=https://yourapp.com

# Firebase (for push notifications - already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...
# ... other Firebase vars
```

## Testing Checklist

### 1. Ban User

- [ ] Admin bans user from `/admin/users/[id]`
- [ ] User receives push notification immediately
- [ ] User receives email explaining suspension
- [ ] Notification appears in database
- [ ] Email includes reason and support contact

### 2. Unban User

- [ ] Admin unbans previously banned user
- [ ] User receives "welcome back" push notification
- [ ] User receives reinstatement email
- [ ] Notification stored in DB

### 3. Change User Role

- [ ] Admin changes user role
- [ ] User notification shows old role → new role
- [ ] Email displays role change with badges
- [ ] Push notification sent
- [ ] DB record created

### 4. Schedule Deletion

- [ ] Admin schedules deletion with reason
- [ ] User receives urgent push notification
- [ ] Email includes countdown and reason
- [ ] DB notification created
- [ ] Email has appeal/support button

### 5. Cancel Deletion

- [ ] Admin cancels scheduled deletion
- [ ] User receives good news notification
- [ ] Email confirms account is safe
- [ ] DB record created

### 6. Password Reset

- [ ] Admin triggers password reset
- [ ] User receives secure email with reset link
- [ ] Push notification alerts about security action
- [ ] Link expires after 24 hours
- [ ] DB notification created

## User Experience Flow

### Example: User Gets Banned

1. **Admin Action**: Admin clicks "Ban User" on `/admin/users/123`
2. **Backend Processing**:
   - User banned in database
   - Admin action logged
   - `sendComprehensiveNotification()` called

3. **User Receives** (all within seconds):
   - **Push Notification** 🔔: "Account Suspended - Your account has been temporarily restricted..."
   - **Email** 📧: Professional email with full details
   - **DB Record** 💾: Stored for in-app notifications page

4. **User Can**:
   - Read notification in notification center
   - Check email for full details
   - Contact support via link in email
   - See notification badge in app

## API Integration

All notifications use the centralized system:

```typescript
import {
  sendComprehensiveNotification,
  emailTemplates,
} from "@/lib/notifications/adminNotifications";

// In any admin action
const template = emailTemplates.userBanned(userName);

await sendComprehensiveNotification({
  userId,
  title: "Account Suspended",
  message: "Your account has been restricted...",
  type: "ACCOUNT_SUSPENDED",
  emailSubject: template.subject,
  emailHtml: template.html,
});
```

## Benefits

✅ **Consistency**: All admin actions follow same notification pattern
✅ **Transparency**: Users always know what's happening with their account  
✅ **Professional**: Beautiful, branded email templates
✅ **Real-time**: Push notifications arrive immediately
✅ **Trackable**: All notifications logged in database
✅ **Resilient**: Graceful failure handling
✅ **Compliant**: Clear communication for moderation actions

## Future Enhancements

Potential improvements:

- [ ] SMS notifications for critical actions
- [ ] Custom notification preferences per user
- [ ] Notification aggregation (daily digest)
- [ ] In-app notification center UI
- [ ] Mark as read/unread functionality
- [ ] Notification sound/vibration settings

---

**Status**: ✅ **FULLY IMPLEMENTED AND READY**

All admin user actions now send comprehensive notifications (Push + Email + Database). Users receive real-time updates about account changes with professional, actionable communication.
