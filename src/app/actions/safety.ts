'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// --- Trusted Contacts Management ---

export async function addTrustedContact(data: { name: string; phone: string; relation?: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const contact = await prisma.trustedContact.create({
      data: {
        userId: session.user.id,
        name: data.name,
        phone: data.phone,
        relation: data.relation,
      },
    });
    revalidatePath('/dashboard/safety');
    return { success: true, contact };
  } catch (error) {
    console.error('Failed to add trusted contact:', error);
    return { success: false, error: 'Failed to add contact' };
  }
}

export async function removeTrustedContact(contactId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    // Verify ownership
    const contact = await prisma.trustedContact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.userId !== session.user.id) {
      throw new Error('Unauthorized access to contact');
    }

    await prisma.trustedContact.delete({
      where: { id: contactId },
    });

    revalidatePath('/dashboard/safety');
    return { success: true };
  } catch (error) {
    console.error('Failed to remove trusted contact:', error);
    return { success: false, error: 'Failed to remove contact' };
  }
}

export async function getTrustedContacts() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  try {
    return await prisma.trustedContact.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Failed to fetch trusted contacts:', error);
    return [];
  }
}

// --- SOS Logic ---

export async function triggerSOS(location: { latitude: number; longitude: number; details?: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized'); // Or create anonymous alert if needed later
  }

  try {
    // 1. Create Active Alert
    const alert = await prisma.sOSAlert.create({
      data: {
        userId: session.user.id,
        latitude: location.latitude,
        longitude: location.longitude,
        locationDetails: location.details,
        status: 'ACTIVE',
      },
    });

    // 2. Fetch User & Contacts for Notification
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { trustedContacts: true },
    });

    const contacts = user?.trustedContacts || [];

    // 3. Stub: Send SMS/Push Notifications
    // TODO: Integrate actual SMS provider (e.g., Twilio/AfricasTalking)
    console.log(`[SOS TRIGGERED] User: ${user?.name} (${user?.phone})`);
    console.log(`[SOS LOCATION] https://maps.google.com/?q=${location.latitude},${location.longitude}`);
    contacts.forEach(contact => {
      console.log(`[NOTIFY CONTACT] Sending SMS to ${contact.name} (${contact.phone})...`);
    });

    return { success: true, alertId: alert.id };
  } catch (error) {
    console.error('Failed to trigger SOS:', error);
    return { success: false, error: 'Failed to trigger SOS' };
  }
}

export async function cancelSOS(alertId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
     // Verify ownership
     const alert = await prisma.sOSAlert.findUnique({
        where: { id: alertId },
      });
  
      if (!alert || alert.userId !== session.user.id) {
        throw new Error('Unauthorized access to alert');
      }

    await prisma.sOSAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });

    // Notify contacts effectively "I'm safe now"
    console.log(`[SOS RESOLVED] Alert ${alertId} marked as resolved.`);

    return { success: true };
  } catch (error) {
    console.error('Failed to cancel SOS:', error);
    return { success: false, error: 'Failed to cancel SOS' };
  }
}

export async function getActiveSOS() {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }
  
    try {
      const activeAlert = await prisma.sOSAlert.findFirst({
        where: {
            userId: session.user.id,
            status: 'ACTIVE'
        },
        orderBy: { triggeredAt: 'desc' }
      });
      return activeAlert;
    } catch (error) {
      console.error('Failed to get active SOS:', error);
      return null;
    }
  }
