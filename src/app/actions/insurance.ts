'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
// @ts-ignore
import { revalidatePath } from 'next/cache';

export async function submitInsuranceClaim(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const bookingId = formData.get('bookingId') as string;
  const amount = Number(formData.get('amount'));
  const description = formData.get('description') as string;
  const evidence = formData.get('evidence') as string; // Comma separated URLs

  if (!bookingId || !amount || !description) {
      return { error: "Missing fields" };
  }

  try {
      await prisma.insuranceClaim.create({
          data: {
              bookingId,
              claimantId: session.user.id,
              amount,
              description,
              evidence: evidence ? evidence.split(',').map(e => e.trim()) : [],
              status: 'PENDING'
          }
      });

      revalidatePath(`/bookings/${bookingId}`);
      return { success: true };
  } catch (error) {
      console.error("Failed to submit claim:", error);
      return { error: "Submission failed" };
  }
}

export async function getClaims() {
    const session = await auth();
    // In real app, check if admin
    if (!session?.user) return { error: "Unauthorized" };

    try {
        const claims = await prisma.insuranceClaim.findMany({
            include: {
                claimant: { select: { name: true, email: true } },
                booking: { select: { id: true, date: true, totalAmount: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, claims };
    } catch (error) {
        return { error: "Failed to fetch claims" };
    }
}
