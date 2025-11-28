import { NextResponse } from 'next/server';
import { checkAdmin } from '@/app/actions/admin';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { sendNotificationToUser } from '@/lib/notifications/dispatcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Security Check
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      config: {},
      tests: {}
    };

    // 2. Config Check (Masked)
    const emailConfig = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD,
      from: process.env.EMAIL_FROM,
    };

    results.config.email = {
      ...emailConfig,
      passwordLength: process.env.EMAIL_PASSWORD?.length || 0
    };

    results.config.appUrl = process.env.NEXTAUTH_URL;
    
    results.config.firebase = {
      hasServiceAccount: !!process.env.FIREBASE_PRIVATE_KEY,
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    // 3. Test Email Connection
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: parseInt(process.env.EMAIL_PORT || "587") === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      await transporter.verify();
      results.tests.emailConnection = { success: true, message: 'SMTP connection verified' };

      // Send test email to admin
      const adminUser = await prisma.user.findUnique({ where: { id: admin.id } });
      if (adminUser?.email) {
        await transporter.sendMail({
          from: `"Debug Tool" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
          to: adminUser.email,
          subject: 'Production Debug Test Email',
          text: 'If you received this, email sending is working correctly in production.'
        });
        results.tests.emailSend = { success: true, recipient: adminUser.email };
      }
    } catch (error: any) {
      results.tests.emailConnection = { 
        success: false, 
        error: error.message,
        code: error.code,
        response: error.response
      };
    }

    // 4. Test Push Notification
    try {
      const tokens = await prisma.userToken.findMany({ where: { userId: admin.id } });
      results.tests.pushTokens = { count: tokens.length };

      if (tokens.length > 0) {
        const pushResult = await sendNotificationToUser(admin.id, {
          title: 'Debug Test',
          body: 'If you see this, push notifications are working.',
          data: { type: 'DEBUG' }
        });
        results.tests.pushSend = pushResult;
      } else {
        results.tests.pushSend = { skipped: true, reason: 'No tokens found for admin' };
      }
    } catch (error: any) {
      results.tests.pushSend = { 
        success: false, 
        error: error.message 
      };
    }

    return NextResponse.json(results);

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message 
    }, { status: 500 });
  }
}
