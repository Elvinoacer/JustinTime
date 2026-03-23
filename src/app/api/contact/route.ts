import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/email";
import { VALIDATION } from "@/lib/constants/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }
    
    // Validate length limits
    if (name.length > VALIDATION.MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Name cannot exceed ${VALIDATION.MAX_NAME_LENGTH} characters` }, { status: 400 });
    }
    if (subject.length > VALIDATION.MAX_SUBJECT_LENGTH) {
      return NextResponse.json({ error: `Subject cannot exceed ${VALIDATION.MAX_SUBJECT_LENGTH} characters` }, { status: 400 });
    }
    if (message.length > VALIDATION.MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message cannot exceed ${VALIDATION.MAX_MESSAGE_LENGTH} characters` }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Send email
    const emailSent = await sendContactFormEmail(name, email, subject, message);

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Message sent successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
