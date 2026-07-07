/**
 * M-Pesa Utilities
 * Helper functions for M-Pesa integration
 */

/**
 * Validate Kenyan mobile numbers.
 * Accepts Safaricom / Airtel / Telkom prefixes (07*, 01*) and their E.164 forms (2547*, 2541*).
 */
export function validatePhoneNumber(phone: string): boolean {
  const trimmed = phone.trim().replace(/\s+/g, "");
  const regex = /^(0(7|1)\d{8}|254(7|1)\d{8})$/;
  return regex.test(trimmed);
}

/**
 * Normalize to international format 2547XXXXXXXX / 2541XXXXXXXX
 */
export function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim().replace(/\s+/g, "");
  if (/^254(7|1)\d{8}$/.test(trimmed)) return trimmed;
  if (/^0(7|1)\d{8}$/.test(trimmed)) return "254" + trimmed.slice(1);
  if (/^(7|1)\d{8}$/.test(trimmed)) return "254" + trimmed;
  return trimmed;
}

/**
 * Calculate timestamp for M-Pesa password (YYYYMMDDHHMMSS format)
 */
export function calculateTimestamp(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate M-Pesa STK Push password
 * Password = base64(Shortcode + Passkey + Timestamp)
 */
export function generateMpesaPassword(
  shortcode: string,
  passkey: string,
  timestamp: string
): string {
  const raw = shortcode + passkey + timestamp;
  return btoa(raw); // base64 encode
}

/**
 * Format phone number for display (show last 6 digits)
 * Example: 2547XXXXXXXX → 7XXXXXXXX
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.startsWith("254")) {
    return "0" + normalized.slice(3);
  }
  return phone;
}

/**
 * Parse M-Pesa error code and return user-friendly message
 */
export function parseMpesaError(code: number | string): string {
  const errorMap: Record<string | number, string> = {
    1: "Unable to process your transaction. Please try again.",
    17: "Invalid amount. Minimum is KES 10.",
    25: "Invalid API request. Please check your phone number.",
    500: "M-Pesa service temporarily unavailable. Please try again.",
    1001: "Unable to process request. Please try again.",
  };
  
  return (
    errorMap[code] ||
    "An error occurred during payment. Please try again or contact support."
  );
}

