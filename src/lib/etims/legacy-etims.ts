
/**
 * Mock Service for KRA eTIMS Integration.
 * Simulates communication with the Tax Invoice Management System.
 */

export interface EtimsInvoiceData {
  cuNumber: string;
  qrUrl: string;
  signature: string;
}

/**
 * Generates mock eTIMS data for a given transaction.
 * In a real scenario, this would POST to the KRA middleware device.
 * 
 * @param transactionId - The internal unique ID of the booking/transaction
 * @param amount - The total amount of the transaction
 * @returns Object containing compliant eTIMS fields
 */
export async function generateEtimsData(transactionId: string, amount: number): Promise<EtimsInvoiceData> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate a mock Control Unit (CU) Number
  // Format typically: CU-[SerialNumber]-[Date]-[Counter]
  const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const cuNumber = `KRA-CU-001-${dateStr}-${randomSuffix}`;

  // Generate a mock Signature
  const signature = `SIG-${Buffer.from(`${transactionId}-${amount}-${Date.now()}`).toString('base64').substring(0, 20)}`;

  // Generate a mock QR Code URL (using a placeholder image service for visual demo)
  // In reality, this would be a string of data to be rendered as a QR code
  const qrData = JSON.stringify({
    cuName: "JustInTime Systems Ltd",
    cuPin: "P001234567Z",
    date: new Date().toISOString(),
    amt: amount,
    cuNum: cuNumber
  });
  const encodedQr = encodeURIComponent(qrData);
  // Using a robust placeholder or just returning a static URL for now because public QR generators might be flaky or rate limited.
  // Let's use a quick chart generic URL for demo purposes only.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedQr}`;

  return {
    cuNumber,
    qrUrl,
    signature
  };
}
