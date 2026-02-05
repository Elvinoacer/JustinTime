'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { addHours } from 'date-fns';

// --- Phone Anonymization / Proxy Logic ---

/**
 * Initiates or retrieves a secure proxy session for a booking/context.
 * Allows users to call each other without exchanging real numbers.
 */
export async function initiateSecureCall(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    // 1. Check for existing active session
    const existingSession = await prisma.proxySession.findUnique({
      where: { bookingId },
    });

    if (existingSession && existingSession.activeUntil > new Date()) {
      return {
        success: true,
        data: {
          virtualNumber: existingSession.virtualNumber,
          accessCode: existingSession.accessCode,
          expiresAt: existingSession.activeUntil.toISOString()
        }
      };
    }

    // 2. Create new session (Mock Allocation)
    // In production, this would call Twilio/Plivo API to provision a masked number
    
    // Mock Logic:
    // Virtual Number is static for this demo environment
    const MOCK_VIRTUAL_NUMBER = "+254 20 255 1289"; 
    // Generate random 4-digit code
    const accessCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = addHours(new Date(), 2); // Valid for 2 hours

    // Cleanup old session if exists (expired)
    if (existingSession) {
        await prisma.proxySession.delete({ where: { bookingId } });
    }

    const newSession = await prisma.proxySession.create({
      data: {
        bookingId,
        virtualNumber: MOCK_VIRTUAL_NUMBER,
        accessCode: accessCode,
        activeUntil: expiresAt
      }
    });

    return {
      success: true,
      data: {
        virtualNumber: newSession.virtualNumber,
        accessCode: newSession.accessCode,
        expiresAt: newSession.activeUntil.toISOString()
      }
    };

  } catch (error) {
    console.error('Failed to initiate secure call:', error);
    return { success: false, error: 'Failed to connect secure line' };
  }
}
