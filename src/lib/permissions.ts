export enum TeamPermission {
  MANAGE_SETTINGS = "MANAGE_SETTINGS",
  MANAGE_MEMBERS = "MANAGE_MEMBERS",
  
  // Services
  VIEW_SERVICES = "VIEW_SERVICES",
  MANAGE_SERVICES = "MANAGE_SERVICES",
  
  // Bookings
  VIEW_BOOKINGS = "VIEW_BOOKINGS",
  MANAGE_BOOKINGS = "MANAGE_BOOKINGS", // Accept/Reject, Cancel
  
  // Financials
  VIEW_FINANCIALS = "VIEW_FINANCIALS", // Wallet, Earnings
  MANAGE_PAYMENTS = "MANAGE_PAYMENTS", // Withdraw, Buy Credits
  
  // Communication
  VIEW_MESSAGES = "VIEW_MESSAGES",
  REPLY_MESSAGES = "REPLY_MESSAGES",
}

export const OWNER_PERMISSIONS = Object.values(TeamPermission);

export const DEFAULT_MEMBER_PERMISSIONS = [
  TeamPermission.VIEW_SERVICES,
  TeamPermission.VIEW_BOOKINGS,
  TeamPermission.VIEW_MESSAGES,
];

export const ADMIN_PERMISSIONS = [
  ...DEFAULT_MEMBER_PERMISSIONS,
  TeamPermission.MANAGE_SERVICES,
  TeamPermission.MANAGE_BOOKINGS,
  TeamPermission.REPLY_MESSAGES,
];
