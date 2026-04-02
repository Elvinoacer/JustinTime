import { prisma } from "./prisma";

// Mock WhatsApp Service

interface WhatsAppMessage {
  from: string;
  body?: string;
  type?: "text" | "image" | "document" | "audio" | "video" | "sticker" | string;
  mediaId?: string;
  mimeType?: string;
  providerMessageId?: string;
  timestamp?: string;
}

export async function sendWhatsAppMessage(to: string, content: string) {
  console.log(`[WhatsApp Mock] Sending to ${to}: ${content}`);
  // In production, this would call Axios to Meta Graph API
  return { success: true };
}

export async function parseIncomingMessage(message: WhatsAppMessage) {
  const { from, body, type = "text" } = message;
  const content = (body || "").toLowerCase().trim();

  if (type !== "text") {
    return handleMediaMessage(from, type, message.mediaId);
  }

  // Simple Intent Recognition
  if (content.includes("book") || content.includes("scheduler")) {
    return handleBookingIntent(from, content);
  }

  if (
    content.includes("help") ||
    content.includes("hi") ||
    content.includes("hello")
  ) {
    return handleGreeting(from);
  }

  if (!content) {
    await sendWhatsAppMessage(
      from,
      'I received your message. Reply with "Help" to see available actions.',
    );
    return;
  }

  // Specific flow for "qualify" or general inquiry
  return handleLeadQualification(from, content);
}

async function handleMediaMessage(
  from: string,
  type: string,
  mediaId?: string,
) {
  console.log(`[WhatsApp] Received ${type} media from ${from}`, {
    mediaId,
  });

  await sendWhatsAppMessage(
    from,
    `Thanks, I received your ${type}. Add a short text note so I can help you book the right provider.`,
  );
}

async function handleGreeting(from: string) {
  await sendWhatsAppMessage(
    from,
    "Hello! Welcome to Just-In-Time. \n\n" +
      "You can say:\n" +
      "- 'Book [Service]' to schedule an appointment\n" +
      "- 'Help' to see this menu",
  );
}

async function handleBookingIntent(from: string, content: string) {
  // 1. Identify User
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ whatsappNumber: from }, { phone: from }],
    },
  });

  if (!user) {
    await sendWhatsAppMessage(
      from,
      "We couldn't find an account linked to this number. Please sign up on our app first or reply with your registered email.",
    );
    return;
  }

  // 2. Mock Booking Flow (very simplified)
  // Check if content has "Book Cleaning"
  // mocked service lookup
  const serviceName = content.replace("book", "").trim();

  if (!serviceName) {
    await sendWhatsAppMessage(
      from,
      "Which service would you like to book? (e.g., 'Book Cleaning')",
    );
    return;
  }

  await sendWhatsAppMessage(
    from,
    `I found providers for ${serviceName}. Please reply with your preferred Date (YYYY-MM-DD).`,
  );
  // In a real bot, we'd store state in Redis or DB. using a "ConversationStatus" model.
}

async function handleLeadQualification(from: string, content: string) {
  // Determine if it's a date response or just chat
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegex.test(content)) {
    await sendWhatsAppMessage(
      from,
      `Great! I've scheduled your request for ${content}. A provider will confirm shortly.`,
    );

    // Create Mock Booking
    const user = await prisma.user.findFirst({
      where: { OR: [{ whatsappNumber: from }, { phone: from }] },
    });

    if (user) {
      // Mock booking creation logic here if we had a default provider
      console.log(
        `[WhatsApp] Creating booking for ${user.email} on ${content}`,
      );
    }
    return;
  }

  await sendWhatsAppMessage(
    from,
    "I didn't quite catch that. Try saying 'Book Cleaning' or 'Help'.",
  );
}
