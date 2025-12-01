import { NextResponse } from 'next/server';
import { checkAdmin } from '@/app/actions/admin';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
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
      hasApiKey: !!process.env.RESEND_API_KEY,
      from: process.env.ADMIN_EMAIL || process.env.EMAIL_FROM,
    };

    results.config.email = {
      ...emailConfig,
      apiKeyLength: process.env.RESEND_API_KEY?.length || 0
    };

    results.config.appUrl = process.env.NEXTAUTH_URL;
    
    results.config.firebase = {
      hasServiceAccount: !!process.env.FIREBASE_PRIVATE_KEY,
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    // 3. Test Email Connection
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is missing');
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Send test email to admin
      const adminUser = await prisma.user.findUnique({ where: { id: admin.id } });
      if (adminUser?.email) {
        const data = await resend.emails.send({
          from: `Debug Tool <${process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'noreply@justintime.com'}>`,
          to: adminUser.email,
          subject: 'Production Debug Test Email',
          text: 'If you received this, email sending is working correctly in production via Resend.'
        });
        results.tests.emailSend = { success: true, recipient: adminUser.email, id: data.data?.id };
      } else {
        results.tests.emailSend = { skipped: true, reason: 'Admin has no email' };
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
