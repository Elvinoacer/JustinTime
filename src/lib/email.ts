import nodemailer from "nodemailer";

// Create email transporter
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT || "587");
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: port,
    secure: port === 465, // true for 465 (SSL), false for other ports like 587 (TLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send account deletion scheduled email
export const sendAccountDeletionScheduledEmail = async (
  userEmail: string,
  userName: string,
  deletionDate: Date,
  reason?: string
) => {
  try {
    const transporter = createTransporter();

    const formattedDate = deletionDate.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Account Deletion Scheduled - We're Sad to See You Go",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .warning-box { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>😢 We're Sad to See You Go</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>We received your request to delete your JustInTime account. We're sorry to see you leave!</p>
              
              <div class="warning-box">
                <strong>⏰ Your account is scheduled for deletion on:</strong><br>
                <span style="font-size: 18px; color: #dc2626;">${formattedDate}</span>
              </div>
              
              ${reason ? `<p><strong>You told us:</strong> "${reason}"</p>` : ""}
              
              <p><strong>Here's what will happen:</strong></p>
              <ul>
                <li>❌ All your data will be permanently deleted</li>
                <li>❌ Your services and listings will be removed</li>
                <li>❌ Your messages and history will be erased</li>
                <li>❌ This action cannot be undone after the scheduled time</li>
              </ul>
              
              <p><strong>Changed your mind?</strong></p>
              <p>You can restore your account anytime before ${formattedDate}. Simply log in and click "Restore Account" in your settings.</p>
              
              <a href="${process.env.NEXTAUTH_URL}/dashboard/settings" class="button">Restore My Account</a>
              
              <p style="margin-top: 30px;">If you're leaving because something wasn't working well, we'd love to hear your feedback to improve. Just reply to this email!</p>
              
              <p>Thank you for being part of JustInTime. We hope to see you again! 💚</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

We received your request to delete your JustInTime account. We're sorry to see you leave!

Your account is scheduled for deletion on: ${formattedDate}

${reason ? `You told us: "${reason}"` : ""}

Here's what will happen:
- All your data will be permanently deleted
- Your services and listings will be removed
- Your messages and history will be erased
- This action cannot be undone after the scheduled time

Changed your mind?
You can restore your account anytime before ${formattedDate}. Simply log in and click "Restore Account" in your settings.

Restore your account: ${process.env.NEXTAUTH_URL}/dashboard/settings

If you're leaving because something wasn't working well, we'd love to hear your feedback to improve. Just reply to this email!

Thank you for being part of JustInTime. We hope to see you again!

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Deletion scheduled email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending deletion scheduled email:", error);
    return false;
  }
};

// Send account deletion confirmed email
export const sendAccountDeletionConfirmedEmail = async (
  userEmail: string,
  userName: string
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Account Deleted - Thank You for Being With Us",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account Successfully Deleted</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>Your JustInTime account has been permanently deleted as requested.</p>
              
              <p><strong>What's been deleted:</strong></p>
              <ul>
                <li>✓ Personal profile and information</li>
                <li>✓ Service listings and portfolios</li>
                <li>✓ Messages and conversation history</li>
                <li>✓ Bookings and transaction records</li>
              </ul>
              
              <p>Thank you for being part of the JustInTime community. We're sorry to see you go, but we respect your decision.</p>
              
              <p><strong>Want to come back?</strong></p>
              <p>You're always welcome to create a new account anytime at ${process.env.NEXTAUTH_URL}/signup</p>
              
              <p style="margin-top: 30px;">We'd love to hear any feedback about your experience with us. Feel free to reply to this email!</p>
              
              <p>All the best in your future endeavors! 🌟</p>
            </div>
            <div class="footer">
              <p>This is the last email you'll receive from JustInTime.</p>
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

Your JustInTime account has been permanently deleted as requested.

What's been deleted:
- Personal profile and information
- Service listings and portfolios
- Messages and conversation history
- Bookings and transaction records

Thank you for being part of the JustInTime community. We're sorry to see you go, but we respect your decision.

Want to come back?
You're always welcome to create a new account anytime at ${process.env.NEXTAUTH_URL}/signup

We'd love to hear any feedback about your experience with us. Feel free to reply to this email!

All the best in your future endeavors!

This is the last email you'll receive from JustInTime.
© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Deletion confirmed email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending deletion confirmed email:", error);
    return false;
  }
};

// Send subscription expiration email
export const sendSubscriptionExpirationEmail = async (
  userEmail: string,
  userName: string,
  plan: string
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Your Premium Subscription Has Expired",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Expired</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>Your <strong>${plan}</strong> subscription has expired and your account has been downgraded to the FREE plan.</p>
              
              <p>Don't worry! You can upgrade anytime to continue enjoying premium features:</p>
              
              <ul>
                <li>✅ Unlimited service listings</li>
                <li>✅ Priority support</li>
                <li>✅ Advanced analytics</li>
                <li>✅ Featured profile badge</li>
                <li>✅ Priority in search results</li>
              </ul>
              
              <p>Ready to upgrade?</p>
              
              <a href="${process.env.NEXTAUTH_URL}/dashboard/premium" class="button">Renew Subscription</a>
              
              <p style="margin-top: 30px;">Thank you for being part of JustInTime!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              <p>You're receiving this email because you have an account with JustInTime.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

Your ${plan} subscription has expired and your account has been downgraded to the FREE plan.

Don't worry! You can upgrade anytime to continue enjoying premium features:
- Unlimited service listings
- Priority support
- Advanced analytics
- Featured profile badge
- Priority in search results

Renew your subscription: ${process.env.NEXTAUTH_URL}/dashboard/premium

Thank you for being part of JustInTime!

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Expiration email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending expiration email:", error);
    return false;
  }
};

// Send subscription activation email
export const sendSubscriptionActivationEmail = async (
  userEmail: string,
  userName: string,
  plan: string,
  endDate: Date
) => {
  try {
    const transporter = createTransporter();

    const formattedEndDate = endDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Welcome to ${plan} Plan! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fffbeb; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: #fbbf24; color: #78350f; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 12px; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Subscription Activated!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p><span class="badge">${plan} MEMBER</span></p>
              
              <p>Congratulations! Your <strong>${plan}</strong> subscription is now active. You now have access to all premium features!</p>
              
              <p><strong>Your subscription details:</strong></p>
              <ul>
                <li>Plan: ${plan}</li>
                <li>Valid until: ${formattedEndDate}</li>
                <li>Status: Active ✅</li>
              </ul>
              
              <p><strong>What you can do now:</strong></p>
              <ul>
                <li>✅ Create unlimited service listings</li>
                <li>✅ Get priority support</li>
                <li>✅ Access advanced analytics</li>
                <li>✅ Showcase your premium badge</li>
                <li>✅ Appear higher in search results</li>
              </ul>
              
              <a href="${process.env.NEXTAUTH_URL}/dashboard/profile" class="button">View Your Profile</a>
              
              <p style="margin-top: 30px;">Thank you for choosing JustInTime Premium!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

Congratulations! Your ${plan} subscription is now active!

Your subscription details:
- Plan: ${plan}
- Valid until: ${formattedEndDate}
- Status: Active ✅

What you can do now:
- Create unlimited service listings
- Get priority support
- Access advanced analytics
- Showcase your premium badge
- Appear higher in search results

View your profile: ${process.env.NEXTAUTH_URL}/dashboard/profile

Thank you for choosing JustInTime Premium!

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Activation email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending activation email:", error);
    return false;
  }
};

// Send password changed notification email
export const sendPasswordChangedEmail = async (
  userEmail: string,
  userName: string,
  changeDateTime: Date
) => {
  try {
    const transporter = createTransporter();

    const formattedDate = changeDateTime.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      timeZoneName: "short",
    });

    const mailOptions = {
      from: `"JustInTime Security" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Password Changed - JustInTime Account Security Alert",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #d1d5db; }
            .button { display: inline-block; background: #ef4444; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .security-icon { font-size: 48px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="security-icon">🔒</div>
              <h1 style="margin: 0;">Password Changed Successfully</h1>
            </div>
            <div class="content">
              <h2 style="color: #059669;">Hi ${userName},</h2>
              
              <p>This email confirms that your password was successfully changed.</p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>Account:</strong> ${userEmail}</p>
                <p style="margin: 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
              </div>

              <div class="alert-box">
                <h3 style="margin-top: 0; color: #f59e0b;">⚠️ Didn't Make This Change?</h3>
                <p style="margin-bottom: 0;">
                  If you did not change your password, please <strong>secure your account immediately</strong>:
                </p>
                <a href="${process.env.NEXTAUTH_URL}/settings?tab=security" class="button">
                  Secure My Account
                </a>
              </div>

              <h3 style="color: #059669;">Security Tips:</h3>
              <ul>
                <li>Use a unique password for your JustInTime account</li>
                <li>Enable Two-Factor Authentication for extra security (coming soon)</li>
                <li>Never share your password with anyone</li>
                <li>Avoid using the same password across multiple sites</li>
              </ul>

              <p>
                If you have any questions or concerns, please contact our support team at 
                <a href="mailto:support@justintime.com" style="color: #10b981;">support@justintime.com</a>
              </p>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                This is an automated security notification. Please do not reply to this email.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              <p>This email was sent because a password change was made to your account.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

This email confirms that your password was successfully changed.

Account: ${userEmail}
Date & Time: ${formattedDate}

DIDN'T MAKE THIS CHANGE?
If you did not change your password, please secure your account immediately by visiting:
${process.env.NEXTAUTH_URL}/settings?tab=security

SECURITY TIPS:
- Use a unique password for your JustInTime account
- Enable Two-Factor Authentication for extra security (coming soon)
- Never share your password with anyone
- Avoid using the same password across multiple sites

If you have any questions or concerns, please contact our support team at support@justintime.com

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password change notification sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending password change email:", error);
    return false;
  }
};

// Send support ticket created confirmation email
export const sendSupportTicketCreatedEmail = async (
  userEmail: string,
  userName: string,
  ticketId: string,
  subject: string,
  category: string
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"JustInTime Support" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Support Ticket Created - ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px; }
            .ticket-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #d1d5db; }
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✅ Support Ticket Created</h1>
            </div>
            <div class="content">
              <h2 style="color: #059669;">Hi ${userName},</h2>
              
              <p>Thank you for contacting JustInTime support. We've received your request and our team will get back to you as soon as possible.</p>
              
              <div class="ticket-box">
                <p style="margin: 0;"><strong>Ticket ID:</strong> #${ticketId}</p>
                <p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>
                <p style="margin: 0;"><strong>Category:</strong> ${category}</p>
                <p style="margin: 0;"><strong>Status:</strong> Open</p>
              </div>

              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Our support team will review your request</li>
                <li>We'll respond within 24 hours during business days</li>
                <li>You'll receive email updates on status changes</li>
                <li>You can track your ticket anytime in your dashboard</li>
              </ul>

              <a href="${process.env.NEXTAUTH_URL}/dashboard/help" class="button">
                View My Tickets
              </a>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Need immediate assistance? Contact us at <a href="mailto:support@justintime.com" style="color: #10b981;">support@justintime.com</a>
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

Thank you for contacting JustInTime support. We've received your request and our team will get back to you as soon as possible.

Ticket ID: #${ticketId}
Subject: ${subject}
Category: ${category}
Status: Open

WHAT HAPPENS NEXT?
- Our support team will review your request
- We'll respond within 24 hours during business days
- You'll receive email updates on status changes
- You can track your ticket anytime in your dashboard

View your ticket: ${process.env.NEXTAUTH_URL}/dashboard/help

Need immediate assistance? Contact us at support@justintime.com

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Support ticket created email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending support ticket created email:", error);
    return false;
  }
};

// Send support ticket status update email
export const sendSupportTicketStatusEmail = async (
  userEmail: string,
  userName: string,
  ticketId: string,
  subject: string,
  newStatus: string,
  adminNotes?: string,
  resolution?: string
) => {
  try {
    const transporter = createTransporter();

    const statusColors: Record<string, string> = {
      OPEN: "#3b82f6",
      IN_PROGRESS: "#f59e0b",
      RESOLVED: "#10b981",
      CLOSED: "#6b7280",
    };

    const statusColor = statusColors[newStatus] || "#6b7280";

    const mailOptions = {
      from: `"JustInTime Support" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Ticket Update - ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .ticket-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #d1d5db; }
            .status-badge { display: inline-block; padding: 8px 16px; background: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; font-size: 14px; }
            .button { display: inline-block; background: ${statusColor}; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔔 Ticket Status Updated</h1>
            </div>
            <div class="content">
              <h2>Hi ${userName},</h2>
              
              <p>Your support ticket has been updated by our team.</p>
              
              <div class="ticket-box">
                <p style="margin: 0;"><strong>Ticket ID:</strong> #${ticketId}</p>
                <p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>
                <p style="margin: 10px 0;"><strong>New Status:</strong> <span class="status-badge">${newStatus.replace(/_/g, " ")}</span></p>
              </div>

              ${
                adminNotes
                  ? `
                <div class="ticket-box">
                  <h3 style="margin-top: 0; color: ${statusColor};">📝 Support Team Notes</h3>
                  <p style="margin: 0;">${adminNotes}</p>
                </div>
              `
                  : ""
              }

              ${
                resolution
                  ? `
                <div class="ticket-box">
                  <h3 style="margin-top: 0; color: #10b981;">✅ Resolution</h3>
                  <p style="margin: 0;">${resolution}</p>
                </div>
              `
                  : ""
              }

              <a href="${process.env.NEXTAUTH_URL}/dashboard/help" class="button">
                View Ticket Details
              </a>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Have more questions? Feel free to reply to this email or create a new ticket.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

Your support ticket has been updated by our team.

Ticket ID: #${ticketId}
Subject: ${subject}
New Status: ${newStatus.replace(/_/g, " ")}

${adminNotes ? `SUPPORT TEAM NOTES:\n${adminNotes}\n` : ""}
${resolution ? `RESOLUTION:\n${resolution}\n` : ""}

View ticket details: ${process.env.NEXTAUTH_URL}/dashboard/help

Have more questions? Feel free to reply to this email or create a new ticket.

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Support ticket status email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending support ticket status email:", error);
    return false;
  }
};
