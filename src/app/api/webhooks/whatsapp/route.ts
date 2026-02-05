import { NextRequest, NextResponse } from 'next/server';
import { parseIncomingMessage } from '@/lib/whatsapp-service';

// Verify Webhook (GET)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'justintime_secure_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse(null, { status: 403 });
    }
  }
  
  return new NextResponse('Missing parameters', { status: 400 });
}

// Receive Messages (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if it's a WhatsApp status update or message
    // Meta sends object: { object: 'whatsapp_business_account', entry: [...] }
    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from; // Sender phone number
        const msgBody = message.text?.body || ""; // Text content

        console.log(`[Webhook] Received message from ${from}: ${msgBody}`);

        // Process asynchronously
        await parseIncomingMessage({ from, body: msgBody });
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse(null, { status: 404 });
    }

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
