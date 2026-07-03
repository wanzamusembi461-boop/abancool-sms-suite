/**
 * M-Pesa Utilities
 * Helper functions for M-Pesa integration
 */

/**
 * Validate phone number format (Kenyan mobile only)
 * Valid: 0712345678, 254712345678
 * Formats:
 * - 07XXXXXXXX (mobile - Safaricom, Airtel, Telkom)
 * - 2547XXXXXXXX (E.164 format - mobile only)
 * Rejects all landlines (01*, 2541*, etc.)
 */
export function validatePhoneNumber(phone: string): boolean {
  const trimmed = phone.trim();
  
  // Reject any landline numbers (01* or 2541*)
  if (trimmed.startsWith("01") || trimmed.startsWith("2541")) {
    return false;
  }
  
  // Valid patterns:
  // 07XXXXXXXX (10 digits, mobile)
  // 2547XXXXXXXX (12 digits, E.164 mobile only)
  const regex = /^(07\d{8}|2547\d{8})$/;
  return regex.test(trimmed);
}

/**
 * Normalize phone number to international format (2547XXXXXXXX)
 * Rejects all landline numbers (01*, 2541*, etc.)
 */
export function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  
  // Reject all landlines
  if (trimmed.startsWith("01") || trimmed.startsWith("2541")) {
    throw new Error("Landline numbers are not supported for SMS. Please use a mobile number (07* or 254712*)");
  }
  
  // Already in 2547XXXXXXXX format
  if (trimmed.match(/^2547\d{8}$/)) {
    return trimmed;
  }
  
  // Convert from 07XXXXXXXX to 2547XXXXXXXX
  if (trimmed.startsWith("0")) {
    return "254" + trimmed.slice(1);
  }
  
  // Assume already normalized or invalid
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

