/**
 * IntaSend Payment Gateway Client
 * Uses the official intasend-node SDK
 */
const IntaSend = require('intasend-node');

// Environment configuration
const PUBLISHABLE_KEY = process.env.INTASEND_PUBLISHABLE_KEY || '';
const SECRET_KEY = process.env.INTASEND_SECRET_KEY || '';
const IS_TEST_MODE = process.env.INTASEND_TEST_MODE === 'true';

// Create IntaSend instance
export const getIntasendClient = () => {
  if (!PUBLISHABLE_KEY || !SECRET_KEY) {
    throw new Error('IntaSend API keys not configured');
  }
  
  return new IntaSend(
    PUBLISHABLE_KEY,
    SECRET_KEY,
    IS_TEST_MODE // true = sandbox, false = live
  );
};

// Collection service for receiving payments
export const getCollectionService = () => {
  const intasend = getIntasendClient();
  return intasend.collection();
};

// Transfer service for sending money
export const getTransferService = () => {
  const intasend = getIntasendClient();
  return intasend.transfer();
};

// Wallet service
export const getWalletService = () => {
  const intasend = getIntasendClient();
  return intasend.wallets();
};

// Base URL for redirects
export const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'https://justintimeservices.vercel.app';
};

// Webhook challenge verification
export const verifyWebhookChallenge = (receivedChallenge: string): boolean => {
  const expectedChallenge = process.env.INTASEND_WEBHOOK_CHALLENGE;
  return receivedChallenge === expectedChallenge;
};

// Generate API reference with proper format (no underscores, alphanumeric + hyphens only)
export const generateApiRef = (prefix: string, userId: string): string => {
  const timestamp = Date.now().toString(36); // base36 for shorter string
  const userPart = userId.slice(0, 8).replace(/[^a-zA-Z0-9]/g, '');
  return `${prefix}-${userPart}-${timestamp}`;
};

export const PAYMENT_AMOUNTS = {
  ONBOARDING_FEE: 500, // KES 500
  MIN_TOPUP: 10, // KES 10
};
