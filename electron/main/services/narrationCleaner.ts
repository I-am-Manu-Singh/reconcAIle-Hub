/**
 * Indian Bank Narration Tokenizer and Cleaner
 * Strips payment channel prefixes, UTRs, timestamps, and gateway routing codes
 * to extract clean party candidate names.
 */

export function cleanNarrationParty(rawNarration: string): string {
  if (!rawNarration || !rawNarration.trim()) {
    return "Unknown Party";
  }

  let text = rawNarration.trim();

  // Pass 1: Strip common payment mode prefixes and protocol labels
  const prefixRegex = /^(?:UPI\/|NEFT[-/ ]|RTGS[-/ ]|IMPS[-/ ]|POS\/|ACH[-/ ]|INB\/|INF\/|NACH\/|BIL\/|VPS\/|MMT\/|ECS\/|EFT\/|CLG\/|ATM[-/ ]WDL\/|CASH[-/ ]DEP\/|TPT[-/ ])/i;
  text = text.replace(prefixRegex, "");

  // Pass 2: Remove 10-18 digit numeric reference numbers (UTRs, RRNs, transaction IDs)
  text = text.replace(/\b\d{10,22}\b/g, " ");

  // Pass 3: Remove timestamp patterns (e.g. 09:15:32 or 14:30)
  text = text.replace(/\b\d{2}:\d{2}(?::\d{2})?\b/g, " ");

  // Pass 4: Remove date stamps inside narration (e.g. 28-JUL-26 or 15/07/2026)
  text = text.replace(/\b(?:\d{2}[-/.]\d{2}[-/.]\d{2,4}|\d{2}-[A-Za-z]{3}-\d{2,4})\b/g, " ");

  // Pass 5: Remove common payment gateway handles and bank routing codes
  const vpaHandles = /\b(?:PAYTM|RAZORPAY|PHONEPE|BHIM|GPAY|OKAXIS|OKHDFCBANK|OKSBI|OKICICI|YESB|ICIC|HDFC|UTIB|BARB|AIRTEL|AMAZONPAY|CRED)\b/gi;
  text = text.replace(vpaHandles, " ");

  // Pass 6: Strip common noisy banking terms
  const noiseTerms = /\b(?:REF\s*(?:NO|NUM)?|UTR|RRN|DR|CR|TRF|TRANSFER|MOB|PAYMENT|VALUE\s*DATE|CHEQUE|CHQ|CLG)\b/gi;
  text = text.replace(noiseTerms, " ");

  // Pass 7: Replace punctuation and slashes with spaces
  text = text.replace(/[/\\:;*_\-=+@#$|]/g, " ");

  // Pass 8: Collapse multiple spaces and trim
  text = text.replace(/\s+/g, " ").trim();

  // If text became too short after stripping, return original trimmed string
  if (text.length < 3) {
    const fallback = rawNarration.replace(/[/\\_]/g, " ").replace(/\s+/g, " ").trim();
    return fallback.length > 2 ? fallback : "Bank Transaction";
  }

  return text;
}
