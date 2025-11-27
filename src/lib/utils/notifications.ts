import prisma from "@/lib/prisma";

/**
 * Create booking notifications for both client and provider
 */
export async function createBookingNotifications(
  bookingId: string,
  clientId: string,
  providerId: string,
  type: "CREATED" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED",
  serviceTitle: string
) {
  const notifications = [];

  switch (type) {
    case "CREATED":
      // Notification for provider
      notifications.push(
        prisma.notification.create({
          data: {
            userId: providerId,
            title: "New Booking Request",
            message: `You have a new booking request for ${serviceTitle}`,
            type: "BOOKING_CREATED",
          },
        })
      );
      // Notification for client
      notifications.push(
        prisma.notification.create({
          data: {
            userId: clientId,
            title: "Booking Request Sent",
            message: `Your booking request for ${serviceTitle} has been sent`,
            type: "BOOKING_PENDING",
          },
        })
      );
      break;

    case "CONFIRMED":
      notifications.push(
        prisma.notification.create({
          data: {
            userId: clientId,
            title: "Booking Confirmed",
            message: `Your booking for ${serviceTitle} has been confirmed!`,
            type: "BOOKING_CONFIRMED",
          },
        })
      );
      break;

    case "REJECTED":
      notifications.push(
        prisma.notification.create({
          data: {
            userId: clientId,
            title: "Booking Declined",
            message: `Your booking request for ${serviceTitle} was declined`,
            type: "BOOKING_REJECTED",
          },
        })
      );
      break;

    case "CANCELLED":
      notifications.push(
        prisma.notification.create({
          data: {
            userId: providerId,
            title: "Booking Cancelled",
            message: `A booking for ${serviceTitle} has been cancelled`,
            type: "BOOKING_CANCELLED",
          },
        })
      );
      break;

    case "COMPLETED":
      notifications.push(
        prisma.notification.create({
          data: {
            userId: clientId,
            title: "Booking Completed",
            message: `Your booking for ${serviceTitle} is complete. Please leave a review!`,
            type: "BOOKING_COMPLETED",
          },
        })
      );
      notifications.push(
        prisma.notification.create({
          data: {
            userId: providerId,
            title: "Booking Completed",
            message: `Booking for ${serviceTitle} is marked as complete`,
            type: "BOOKING_COMPLETED",
          },
        })
      );
      break;
  }

  await Promise.all(notifications);
}

/**
 * Create negotiation notification
 */
export async function createNegotiationNotification(
  negotiationId: string,
  receiverId: string,
  initiatorName: string,
  action: "REQUEST" | "ACCEPTED" | "REJECTED" | "COUNTERED",
  serviceTitle: string,
  proposedPrice?: number,
  proposedLocation?: string
) {
  let title = "";
  let message = "";
  let type = "";

  switch (action) {
    case "REQUEST":
      title = "New Negotiation Request";
      message = `${initiatorName} sent a negotiation request for ${serviceTitle}`;
      if (proposedPrice) message += ` with proposed price: Kes ${proposedPrice}`;
      if (proposedLocation) message += ` at ${proposedLocation}`;
      type = "NEGOTIATION_REQUEST";
      break;

    case "ACCEPTED":
      title = "Negotiation Accepted";
      message = `${initiatorName} accepted your negotiation for ${serviceTitle}`;
      type = "NEGOTIATION_ACCEPTED";
      break;

    case "REJECTED":
      title = "Negotiation Declined";
      message = `${initiatorName} declined your negotiation for ${serviceTitle}`;
      type = "NEGOTIATION_REJECTED";
      break;

    case "COUNTERED":
      title = "Counter Offer Received";
      message = `${initiatorName} sent a counter offer for ${serviceTitle}`;
      if (proposedPrice) message += ` - New price: Kes ${proposedPrice}`;
      if (proposedLocation) message += ` - Location: ${proposedLocation}`;
      type = "NEGOTIATION_COUNTERED";
      break;
  }

  await prisma.notification.create({
    data: {
      userId: receiverId,
      title,
      message,
      type,
    },
  });
}
