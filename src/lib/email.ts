import nodemailer from "nodemailer";

// Create email transporter
export const createTransporter = () => {
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

// Send password reset email
export const sendPasswordResetEmail = async (
  userEmail: string,
  userName: string,
  resetUrl: string
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"JustInTime Security" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Reset Your Password - JustInTime",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .button:hover { background: #059669; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #d1d5db; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .security-icon { font-size: 48px; margin-bottom: 10px; }
            .alert-box { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="security-icon">🔑</div>
              <h1 style="margin: 0;">Reset Your Password</h1>
            </div>
            <div class="content">
              <h2 style="color: #059669;">Hi ${userName},</h2>
              
              <p>We received a request to reset your password for your JustInTime account.</p>
              
              <p>Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">
                  Reset My Password
                </a>
              </div>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>⏱️ This link will expire in 1 hour</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">For security reasons, please reset your password as soon as possible.</p>
              </div>

              <div class="alert-box">
                <h3 style="margin-top: 0; color: #f59e0b;">🔐 Didn't Request This?</h3>
                <p style="margin-bottom: 0;">
                  If you didn't request a password reset, please ignore this email or contact our support team if you have concerns about your account security.
                </p>
              </div>

              <h3 style="color: #059669;">Can't Click The Button?</h3>
              <p style="font-size: 14px;">Copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: white; padding: 15px; border-radius: 5px; font-size: 12px; color: #6b7280;">
                ${resetUrl}
              </p>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                This is an automated security email. Please do not reply to this email.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              <p>Need help? Contact us at <a href="mailto:support@justintime.com" style="color: #10b981;">support@justintime.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

We received a request to reset your password for your JustInTime account.

Click the link below to create a new password:
${resetUrl}

⏱️ This link will expire in 1 hour. For security reasons, please reset your password as soon as possible.

DIDN'T REQUEST THIS?
If you didn't request a password reset, please ignore this email or contact our support team if you have concerns about your account security.

Need help? Contact us at support@justintime.com

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
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

// Send booking confirmation email to client
export const sendBookingConfirmationEmail = async (
  clientEmail: string,
  clientName: string,
  providerName: string,
  providerEmail: string,
  serviceTitle: string,
  bookingDate: Date,
  startTime: string,
  endTime: string,
  location: string,
  price: number,
  bookingId: string
) => {
  try {
    const transporter = createTransporter();

    const formattedDate = bookingDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: clientEmail,
      subject: `Booking Confirmation - ${serviceTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-card { background: white; padding: 25px; margin: 20px 0; border-radius: 12px; border: 2px solid #10b981; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: 600; color: #6b7280; }
            .detail-value { font-weight: 700; color: #111827; }
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✅ Booking Confirmed!</h1>
            </div>
            <div class="content">
              <h2 style="color: #059669;">Hi ${clientName},</h2>
              
              <p>Great news! Your booking request has been sent successfully. You'll receive a notification once ${providerName} confirms your booking.</p>
              
              <div class="booking-card">
                <h3 style="margin-top: 0; color: #10b981;">📋 Booking Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">${serviceTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Provider:</span>
                  <span class="detail-value">${providerName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${startTime} - ${endTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">${location}</span>
                </div>
                <div class="detail-row" style="border-bottom: none; border-top: 2px solid #10b981; margin-top: 10px; padding-top: 15px;">
                  <span class="detail-label">Total Amount:</span>
                  <span class="detail-value" style="font-size: 20px; color: #10b981;">Kes ${price.toLocaleString()}</span>
                </div>
              </div>

              <p><strong>Provider Contact:</strong> ${providerEmail}</p>

              <a href="${process.env.NEXTAUTH_URL}/client/bookings" class="button">
                View My Bookings
              </a>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Need to make changes or have questions? Contact ${providerName} directly or reach out to our support team.
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
Hi ${clientName},

Great news! Your booking request has been sent successfully.

BOOKING DETAILS
Service: ${serviceTitle}
Provider: ${providerName}
Date: ${formattedDate}
Time: ${startTime} - ${endTime}
Location: ${location}
Total Amount: Kes ${price.toLocaleString()}

Provider Contact: ${providerEmail}

View your bookings: ${process.env.NEXTAUTH_URL}/client/bookings

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Booking confirmation email sent to ${clientEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
    return false;
  }
};

// Send booking notification email to provider
export const sendProviderBookingNotificationEmail = async (
  providerEmail: string,
  providerName: string,
  clientName: string,
  serviceTitle: string,
  bookingDate: Date,
  startTime: string,
  endTime: string,
  location: string,
  price: number,
  notes: string,
  bookingId: string
) => {
  try {
    const transporter = createTransporter();

    const formattedDate = bookingDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: providerEmail,
      subject: `New Booking Request - ${serviceTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fffbeb; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-card { background: white; padding: 25px; margin: 20px 0; border-radius: 12px; border: 2px solid #f59e0b; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: 600; color: #6b7280; }
            .detail-value { font-weight: 700; color: #111827; }
            .notes-box { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0; }
            .button { display: inline-block; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 10px 10px 10px 0; font-weight: bold; }
            .accept-btn { background: #10b981; color: white; }
            .reject-btn { background: #ef4444; color: white; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔔 New Booking Request!</h1>
            </div>
            <div class="content">
              <h2 style="color: #f59e0b;">Hi ${providerName},</h2>
              
              <p>You have a new booking request from <strong>${clientName}</strong>!</p>
              
              <div class="booking-card">
                <h3 style="margin-top: 0; color: #f59e0b;">📋 Booking Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span class="detail-value">${serviceTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Client:</span>
                  <span class="detail-value">${clientName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${startTime} - ${endTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">${location}</span>
                </div>
                <div class="detail-row" style="border-bottom: none; border-top: 2px solid #f59e0b; margin-top: 10px; padding-top: 15px;">
                  <span class="detail-label">Amount:</span>
                  <span class="detail-value" style="font-size: 20px; color: #f59e0b;">Kes ${price.toLocaleString()}</span>
                </div>
              </div>

              ${notes ? `
                <div class="notes-box">
                  <strong>📝 Client Notes:</strong>
                  <p style="margin: 5px 0 0 0;">${notes}</p>
                </div>
              ` : ""}

              <p><strong>Action Required:</strong> Please review and respond to this booking request.</p>

              <a href="${process.env.NEXTAUTH_URL}/dashboard/bookings" class="button accept-btn">
                View Booking
              </a>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Make sure to review your schedule before accepting. The client will be notified of your decision.
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
Hi ${providerName},

You have a new booking request from ${clientName}!

BOOKING DETAILS
Service: ${serviceTitle}
Client: ${clientName}
Date: ${formattedDate}
Time: ${startTime} - ${endTime}
Location: ${location}
Amount: Kes ${price.toLocaleString()}

${notes ? `Client Notes: ${notes}` : ""}

View and respond to this booking: ${process.env.NEXTAUTH_URL}/dashboard/bookings

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Provider booking notification sent to ${providerEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending provider booking notification:", error);
    return false;
  }
};

// Send negotiation request email
export const sendNegotiationRequestEmail = async (
  receiverEmail: string,
  receiverName: string,
  initiatorName: string,
  serviceTitle: string,
  originalPrice: number,
  proposedPrice?: number,
  proposedLocation?: string,
  message?: string,
  negotiationId?: string
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: receiverEmail,
      subject: `Negotiation Request - ${serviceTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #eff6ff; padding: 30px; border-radius: 0 0 10px 10px; }
            .proposal-card { background: white; padding: 25px; margin: 20px 0; border-radius: 12px; border: 2px solid #3b82f6; }
            .comparison { display: flex; justify-content: space-around; margin: 20px 0; }
            .price-box { text-align: center; padding: 15px; }
            .original-price { color: #6b7280; text-decoration: line-through; }
            .proposed-price { color: #3b82f6; font-size: 24px; font-weight: bold; }
            .message-box { background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 15px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">💬 Negotiation Request</h1>
            </div>
            <div class="content">
              <h2 style="color: #2563eb;">Hi ${receiverName},</h2>
              
              <p><strong>${initiatorName}</strong> has sent you a negotiation request for <strong>${serviceTitle}</strong>.</p>
              
              <div class="proposal-card">
                <h3 style="margin-top: 0; color: #3b82f6;">📊 Proposed Changes</h3>
                
                ${proposedPrice ? `
                  <div class="comparison">
                    <div class="price-box">
                      <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Original Price</div>
                      <div class="original-price" style="font-size: 20px;">Kes ${originalPrice.toLocaleString()}</div>
                    </div>
                    <div style="display: flex; align-items: center; font-size: 24px; color: #3b82f6;">→</div>
                    <div class="price-box">
                      <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Proposed Price</div>
                      <div class="proposed-price">Kes ${proposedPrice.toLocaleString()}</div>
                    </div>
                  </div>
                ` : ""}

                ${proposedLocation ? `
                  <div style="padding: 15px; background: #f3f4f6; border-radius: 8px; margin-top: 15px;">
                    <strong>📍 Proposed Location:</strong>
                    <div style="margin-top: 5px;">${proposedLocation}</div>
                  </div>
                ` : ""}
              </div>

              ${message ? `
                <div class="message-box">
                  <strong>💬 Message from ${initiatorName}:</strong>
                  <p style="margin: 5px 0 0 0;">${message}</p>
                </div>
              ` : ""}

              <p><strong>What would you like to do?</strong></p>
              <ul>
                <li>Accept the proposal</li>
                <li>Reject the proposal</li>
                <li>Send a counter-offer</li>
              </ul>

              <a href="${process.env.NEXTAUTH_URL}/dashboard/bookings" class="button">
                Respond to Negotiation
              </a>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Respond within 48 hours to keep the negotiation active.
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
Hi ${receiverName},

${initiatorName} has sent you a negotiation request for ${serviceTitle}.

PROPOSED CHANGES
${proposedPrice ? `Original Price: Kes ${originalPrice.toLocaleString()}
Proposed Price: Kes ${proposedPrice.toLocaleString()}` : ""}

${proposedLocation ? `Proposed Location: ${proposedLocation}` : ""}

${message ? `Message from ${initiatorName}: ${message}` : ""}

What would you like to do?
- Accept the proposal
- Reject the proposal
- Send a counter-offer

Respond to negotiation: ${process.env.NEXTAUTH_URL}/dashboard/bookings

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Negotiation request email sent to ${receiverEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending negotiation request email:", error);
    return false;
  }
};

// Send negotiation response email
export const sendNegotiationResponseEmail = async (
  receiverEmail: string,
  receiverName: string,
  responderName: string,
  serviceTitle: string,
  responseType: "ACCEPTED" | "REJECTED" | "COUNTERED",
  counterPrice?: number,
  counterLocation?: string,
  message?: string
) => {
  try {
    const transporter = createTransporter();

    const responseConfig = {
      ACCEPTED: {
        color: "#10b981",
        title: "✅ Negotiation Accepted!",
        text: `Great news! ${responderName} has accepted your negotiation proposal for ${serviceTitle}.`,
      },
      REJECTED: {
        color: "#ef4444",
        title: "❌ Negotiation Declined",
        text: `${responderName} has declined your negotiation proposal for ${serviceTitle}.`,
      },
      COUNTERED: {
        color: "#f59e0b",
        title: "🔄 Counter Offer Received",
        text: `${responderName} has sent you a counter offer for ${serviceTitle}.`,
      },
    };

    const config = responseConfig[responseType];

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: receiverEmail,
      subject: `${config.title} - ${serviceTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .response-card { background: white; padding: 25px; margin: 20px 0; border-radius: 12px; border: 2px solid ${config.color}; }
            .message-box { background: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid ${config.color}; margin: 15px 0; }
            .button { display: inline-block; background: ${config.color}; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${config.title}</h1>
            </div>
            <div class="content">
              <h2>Hi ${receiverName},</h2>
              
              <p>${config.text}</p>
              
              <div class="response-card">
                ${responseType === "COUNTERED" && (counterPrice || counterLocation) ? `
                  <h3 style="margin-top: 0; color: ${config.color};">📊 Counter Offer Details</h3>
                  ${counterPrice ? `<p><strong>Counter Price:</strong> Kes ${counterPrice.toLocaleString()}</p>` : ""}
                  ${counterLocation ? `<p><strong>Counter Location:</strong> ${counterLocation}</p>` : ""}
                ` : ""}

                ${message ? `
                  <div class="message-box">
                    <strong>💬 Message from ${responderName}:</strong>
                    <p style="margin: 5px 0 0 0;">${message}</p>
                  </div>
                ` : ""}
              </div>

              ${responseType === "ACCEPTED" ? `
                <p><strong>Next Steps:</strong></p>
                <p>Your booking has been updated with the agreed terms. You can now proceed with the payment.</p>
              ` : responseType === "COUNTERED" ? `
                <p><strong>What would you like to do?</strong></p>
                <ul>
                  <li>Accept the counter offer</li>
                  <li>Reject the counter offer</li>
                  <li>Send another counter offer</li>
                </ul>
              ` : ""}

              <a href="${process.env.NEXTAUTH_URL}/client/bookings" class="button">
                View Booking Details
              </a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${receiverName},

${config.text}

${responseType === "COUNTERED" && (counterPrice || counterLocation) ? `
COUNTER OFFER DETAILS
${counterPrice ? `Counter Price: Kes ${counterPrice.toLocaleString()}` : ""}
${counterLocation ? `Counter Location: ${counterLocation}` : ""}
` : ""}

${message ? `Message from ${responderName}: ${message}` : ""}

View booking details: ${process.env.NEXTAUTH_URL}/client/bookings

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Negotiation response email sent to ${receiverEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending negotiation response email:", error);
    return false;
  }
};

// Send booking status update email to client
export const sendBookingStatusUpdateEmail = async (
  clientEmail: string,
  clientName: string,
  providerName: string,
  serviceTitle: string,
  newStatus: string,
  bookingDate: Date,
  bookingId: string,
  slots?: Array<{ date: Date; startTime: string; endTime: string }>
) => {
  try {
    const transporter = createTransporter();

    const statusColors: Record<string, string> = {
      PENDING: "#f59e0b",
      CONFIRMED: "#3b82f6",
      IN_PROGRESS: "#8b5cf6",
      COMPLETED: "#10b981",
      CANCELLED: "#ef4444",
      DISPUTED: "#f97316",
    };

    const statusIcons: Record<string, string> = {
      PENDING: "⏳",
      CONFIRMED: "✅",
      IN_PROGRESS: "🔄",
      COMPLETED: "🎉",
      CANCELLED: "❌",
      DISPUTED: "⚠️",
    };

    const statusColor = statusColors[newStatus] || "#6b7280";
    const statusIcon = statusIcons[newStatus] || "📋";

    const formattedDate = bookingDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: clientEmail,
      subject: `Booking ${newStatus} - ${serviceTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .status-badge { display: inline-block; padding: 8px 20px; background: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; font-size: 16px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid ${statusColor}; }
            .button { display: inline-block; background: ${statusColor}; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .slots-list { list-style: none; padding: 0; }
            .slots-list li { background: #f3f4f6; padding: 10px; margin: 5px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">${statusIcon} Booking Status Update</h1>
            </div>
            <div class="content">
              <h2>Hi ${clientName},</h2>
              
              <p>Your booking with <strong>${providerName}</strong> has been updated.</p>
              
              <div class="info-box">
                <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${serviceTitle}</p>
                <p style="margin: 0 0 10px 0;"><strong>New Status:</strong> <span class="status-badge">${newStatus}</span></p>
                <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
                ${
                  slots && slots.length > 0
                    ? `
                  <p style="margin: 10px 0 5px 0;"><strong>Time Slots:</strong></p>
                  <ul class="slots-list">
                    ${slots
                      .map(
                        (slot) => `
                      <li>${new Date(slot.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })} • ${slot.startTime} - ${slot.endTime}</li>
                    `
                      )
                      .join("")}
                  </ul>
                `
                    : ""
                }
              </div>

              ${
                newStatus === "CONFIRMED"
                  ? `
                <p><strong>Great news!</strong> Your booking has been confirmed by ${providerName}. Please be ready at the scheduled time.</p>
              `
                  : ""
              }
              
              ${
                newStatus === "IN_PROGRESS"
                  ? `
                <p>Your service is currently <strong>in progress</strong>. ${providerName} is working on your request.</p>
              `
                  : ""
              }
              
              ${
                newStatus === "COMPLETED"
                  ? `
                <p><strong>All done!</strong> Your service has been completed. We hope you're satisfied with the result!</p>
                <p>Don't forget to leave a review for ${providerName} to help other clients make informed decisions.</p>
              `
                  : ""
              }
              
              ${
                newStatus === "CANCELLED"
                  ? `
                <p style="color: ${statusColor};"><strong>Important:</strong> This booking has been cancelled. If you have any questions, please contact ${providerName}.</p>
              `
                  : ""
              }

              <a href="${process.env.NEXTAUTH_URL}/client/bookings" class="button">
                View Booking Details
              </a>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Need help? Contact us at <a href="mailto:support@justintime.com" style="color: ${statusColor};">support@justintime.com</a>
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              <p>You're receiving this email because you have a booking with JustInTime.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${clientName},

Your booking with ${providerName} has been updated.

Service: ${serviceTitle}
New Status: ${newStatus}
Date: ${formattedDate}
${
  slots && slots.length > 0
    ? `\nTime Slots:\n${slots.map((slot) => `- ${new Date(slot.date).toLocaleDateString()} • ${slot.startTime} - ${slot.endTime}`).join("\n")}`
    : ""
}

${newStatus === "CONFIRMED" ? `Great news! Your booking has been confirmed by ${providerName}. Please be ready at the scheduled time.` : ""}
${newStatus === "IN_PROGRESS" ? `Your service is currently in progress. ${providerName} is working on your request.` : ""}
${newStatus === "COMPLETED" ? `All done! Your service has been completed. We hope you're satisfied with the result! Don't forget to leave a review for ${providerName}.` : ""}
${newStatus === "CANCELLED" ? `Important: This booking has been cancelled. If you have any questions, please contact ${providerName}.` : ""}

View booking details: ${process.env.NEXTAUTH_URL}/client/bookings

Need help? Contact us at support@justintime.com

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Booking status update email sent to ${clientEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending booking status update email:", error);
    return false;
  }
};

// Send review request email
export const sendReviewRequestEmail = async (
  clientEmail: string,
  clientName: string,
  providerName: string,
  serviceTitle: string,
  bookingId: string
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"JustInTime" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: clientEmail,
      subject: `How was your service with ${providerName}?`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .stars { color: #fbbf24; font-size: 24px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Rate Your Experience</h1>
            </div>
            <div class="content">
              <h2>Hi ${clientName},</h2>
              
              <p>Your service <strong>${serviceTitle}</strong> with <strong>${providerName}</strong> has been marked as completed.</p>
              
              <p>We'd love to hear about your experience! Your review helps ${providerName} build their reputation and helps other clients make informed decisions.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div class="stars">★★★★★</div>
                <p>How would you rate your service?</p>
                
                <a href="${process.env.NEXTAUTH_URL}/client/reviews/submit/${bookingId}" class="button">
                  Write a Review
                </a>
              </div>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                It only takes a minute to share your thoughts!
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
Hi ${clientName},

Your service ${serviceTitle} with ${providerName} has been marked as completed.

We'd love to hear about your experience! Your review helps ${providerName} build their reputation and helps other clients make informed decisions.

Write a review: ${process.env.NEXTAUTH_URL}/client/reviews/submit/${bookingId}

It only takes a minute to share your thoughts!

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Review request email sent to ${clientEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending review request email:", error);
    return false;
  }
};

// Send contact form submission email
export const sendContactFormEmail = async (
  name: string,
  email: string,
  subject: string,
  message: string
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"JustInTime Contact Form" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER || "support@justintime.com",
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #d1d5db; }
            .message-box { background: #f0fdf4; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📧 New Contact Form Submission</h1>
            </div>
            <div class="content">
              <p><strong>You have received a new message from your website contact form.</strong></p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>From:</strong> ${name}</p>
                <p style="margin: 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #10b981;">${email}</a></p>
                <p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>
                <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                })}</p>
              </div>

              <div class="message-box">
                <h3 style="margin-top: 0; color: #059669;">Message:</h3>
                <p style="margin: 0; white-space: pre-wrap;">${message}</p>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                You can reply directly to this email to respond to ${name}.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              <p>This email was sent from the contact form on your website.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
New Contact Form Submission

From: ${name}
Email: ${email}
Subject: ${subject}
Date: ${new Date().toLocaleString()}

Message:
${message}

---
You can reply directly to this email to respond to ${name}.

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Contact form email sent from ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending contact form email:", error);
    return false;
  }
};

// Send email verification email
export const sendVerificationEmail = async (
  userEmail: string,
  userName: string,
  verificationUrl: string
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"JustInTime Security" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Verify Your Email Address - JustInTime",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
            .button:hover { background: #059669; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #d1d5db; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .security-icon { font-size: 48px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="security-icon">✉️</div>
              <h1 style="margin: 0;">Verify Your Email</h1>
            </div>
            <div class="content">
              <h2 style="color: #059669;">Hi ${userName},</h2>
              
              <p>Welcome to JustInTime! We're excited to have you on board.</p>
              
              <p>Please verify your email address to secure your account and access all features.</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                  Verify Email Address
                </a>
              </div>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>⏱️ This link will expire in 24 hours</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">If you didn't create an account with JustInTime, you can safely ignore this email.</p>
              </div>

              <h3 style="color: #059669;">Can't Click The Button?</h3>
              <p style="font-size: 14px;">Copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: white; padding: 15px; border-radius: 5px; font-size: 12px; color: #6b7280;">
                ${verificationUrl}
              </p>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                This is an automated security email. Please do not reply to this email.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} JustInTime. All rights reserved.</p>
              <p>Need help? Contact us at <a href="mailto:support@justintime.com" style="color: #10b981;">support@justintime.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

Welcome to JustInTime! Please verify your email address to secure your account and access all features.

Click the link below to verify your email:
${verificationUrl}

⏱️ This link will expire in 24 hours.

If you didn't create an account with JustInTime, you can safely ignore this email.

Can't click the link? Copy and paste this URL into your browser:
${verificationUrl}

Need help? Contact us at support@justintime.com

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${userEmail}. Link: ${verificationUrl}`);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
};

// Send 2FA token email
export const sendTwoFactorTokenEmail = async (
  userEmail: string,
  userName: string,
  token: string
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"JustInTime Security" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Your Authentication Code - JustInTime",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #eff6ff; padding: 30px; border-radius: 0 0 10px 10px; }
            .code-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px dashed #3b82f6; text-align: center; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3b82f6; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .security-icon { font-size: 48px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="security-icon">🛡️</div>
              <h1 style="margin: 0;">Authentication Code</h1>
            </div>
            <div class="content">
              <h2 style="color: #2563eb;">Hi ${userName},</h2>
              
              <p>Here is your One-Time Password (OTP) to log in to your JustInTime account.</p>
              
              <div class="code-box">
                <div class="code">${token}</div>
              </div>
              
              <p style="text-align: center; font-size: 14px; color: #6b7280;">
                This code will expire in 10 minutes.
              </p>

              <p>If you didn't request this code, please secure your account immediately by resetting your password.</p>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                This is an automated security email. Please do not reply to this email.
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

Here is your One-Time Password (OTP) to log in to your JustInTime account:

${token}

This code will expire in 10 minutes.

If you didn't request this code, please secure your account immediately.

© ${new Date().getFullYear()} JustInTime. All rights reserved.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`2FA email sent to ${userEmail}. Token: ${token}`);
    return true;
  } catch (error) {
    console.error("Error sending 2FA email:", error);
    return false;
  }
};
