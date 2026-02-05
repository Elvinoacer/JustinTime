// Simulate WhatsApp Webhook Event
const fetch = require('node-fetch'); // Needs node-fetch installed or use native fetch in node 18+

async function simulateWebhook() {
  const payload = {
    object: "whatsapp_business_account",
    entry: [{
      id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "1234567890", phone_number_id: "1234567890" },
          contacts: [{ profile: { name: "Test User" }, wa_id: "254700000000" }],
          messages: [{
            from: "254700000000",
            id: "wamid.HBgM...",
            timestamp: "1770135...",
            text: { body: "Book Cleaning" },
            type: "text"
          }]
        },
        field: "messages"
      }]
    }]
  };

  try {
    const response = await fetch('http://localhost:3000/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text}`);
  } catch (error) {
    console.error('Error simulating webhook:', error);
  }
}

// Check if server is running first, or just log instructions
console.log("Make sure the Next.js dev server is running on port 3000.");
simulateWebhook();
