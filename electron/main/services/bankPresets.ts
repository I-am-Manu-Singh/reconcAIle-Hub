import { BankPreset, BankTemplateConfig } from "./bankStatementTypes.js";

/**
 * Bank Template Presets
 * Calibrated using actual field coordinates and layout heuristics from CA practice
 * across 9 major Indian financial institutions.
 */
export const BANK_PRESETS: Record<BankPreset, BankTemplateConfig> = {
  HDFC: {
    preset: "HDFC",
    label: "HDFC Bank",
    signatureKeywords: ["HDFC BANK", "HDFC BANK LIMITED", "WWW.HDFCBANK.COM", "HDFC000"],
    datePatterns: [
      { regex: /^\d{2}\/\d{2}\/\d{2}$/, format: "dd/MM/yy" },
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
      { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: "dd-MMM-yyyy" },
    ],
    knownColumns: [
      { name: "date", minX: 15, maxX: 75 },
      { name: "narration", minX: 75, maxX: 290 },
      { name: "chqRef", minX: 290, maxX: 365 },
      { name: "valueDate", minX: 365, maxX: 410 },
      { name: "withdrawal", minX: 410, maxX: 475 },
      { name: "deposit", minX: 475, maxX: 540 },
      { name: "balance", minX: 540, maxX: 610 },
    ],
    headerYTolerance: 8.0,
    hasExplicitSummary: true,
  },

  ICICI: {
    preset: "ICICI",
    label: "ICICI Bank",
    signatureKeywords: ["ICICI BANK", "ICIC000", "WWW.ICICIBANK.COM"],
    datePatterns: [
      { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: "dd.MM.yyyy" },
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
      { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: "dd-MMM-yyyy" },
    ],
    knownColumns: [
      { name: "date", minX: 50, maxX: 115 },
      { name: "valueDate", minX: 115, maxX: 175 },
      { name: "chqRef", minX: 175, maxX: 240 },
      { name: "narration", minX: 240, maxX: 400 },
      { name: "withdrawal", minX: 400, maxX: 470 },
      { name: "deposit", minX: 470, maxX: 535 },
      { name: "balance", minX: 535, maxX: 610 },
    ],
    headerYTolerance: 6.0,
    hasExplicitSummary: true,
  },

  SBI: {
    preset: "SBI",
    label: "State Bank of India",
    signatureKeywords: ["STATE BANK OF INDIA", "SBIN000", "WWW.ONLINESBI.COM", "WWW.SBINETBANKING.COM"],
    datePatterns: [
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
      { regex: /^\d{2}-\d{2}-\d{4}$/, format: "dd-MM-yyyy" },
      { regex: /^\d{2}\s[A-Za-z]{3}\s\d{4}$/, format: "dd MMM yyyy" },
      { regex: /^\d{1}\s[A-Za-z]{3}\s\d{4}$/, format: "d MMM yyyy" },
    ],
    knownColumns: [
      { name: "date", minX: 20, maxX: 75 },
      { name: "valueDate", minX: 75, maxX: 130 },
      { name: "narration", minX: 130, maxX: 360 },
      { name: "chqRef", minX: 360, maxX: 410 },
      { name: "withdrawal", minX: 410, maxX: 475 },
      { name: "deposit", minX: 475, maxX: 535 },
      { name: "balance", minX: 535, maxX: 605 },
    ],
    headerYTolerance: 7.0,
    hasExplicitSummary: false,
  },

  AXIS: {
    preset: "AXIS",
    label: "Axis Bank",
    signatureKeywords: ["AXIS BANK", "UTIB000", "WWW.AXISBANK.COM"],
    datePatterns: [
      { regex: /^\d{2}-\d{2}-\d{4}$/, format: "dd-MM-yyyy" },
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
    ],
    knownColumns: [
      { name: "date", minX: 20, maxX: 85 },
      { name: "narration", minX: 85, maxX: 330 },
      { name: "chqRef", minX: 330, maxX: 400 },
      { name: "withdrawal", minX: 400, maxX: 470 },
      { name: "deposit", minX: 470, maxX: 540 },
      { name: "balance", minX: 540, maxX: 610 },
    ],
    headerYTolerance: 8.0,
    hasExplicitSummary: true,
  },

  KOTAK: {
    preset: "KOTAK",
    label: "Kotak Mahindra Bank",
    signatureKeywords: ["KOTAK MAHINDRA", "KKBK000", "KOTAK.COM", "KOTAK BANK"],
    datePatterns: [
      { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: "dd-MMM-yyyy" },
      { regex: /^\d{2}-[A-Za-z]{3}-\d{2}$/, format: "dd-MMM-yy" },
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
    ],
    knownColumns: [
      { name: "date", minX: 25, maxX: 95 },
      { name: "narration", minX: 95, maxX: 320 },
      { name: "chqRef", minX: 320, maxX: 390 },
      { name: "withdrawal", minX: 390, maxX: 460 },
      { name: "deposit", minX: 460, maxX: 530 },
      { name: "balance", minX: 530, maxX: 600 },
    ],
    headerYTolerance: 8.0,
    hasExplicitSummary: true,
  },

  BOB: {
    preset: "BOB",
    label: "Bank of Baroda",
    signatureKeywords: ["BANK OF BARODA", "BARB000", "BOB FINANCIAL", "BOB BANK"],
    datePatterns: [
      { regex: /^\d{2}-\d{2}-\d{4}$/, format: "dd-MM-yyyy" },
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
      { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: "dd.MM.yyyy" },
    ],
    knownColumns: [
      { name: "date", minX: 25, maxX: 85 },
      { name: "narration", minX: 85, maxX: 320 },
      { name: "chqRef", minX: 320, maxX: 395 },
      { name: "withdrawal", minX: 395, maxX: 465 },
      { name: "deposit", minX: 465, maxX: 535 },
      { name: "balance", minX: 535, maxX: 605 },
    ],
    headerYTolerance: 8.0,
    hasExplicitSummary: true,
  },

  CANARA: {
    preset: "CANARA",
    label: "Canara Bank",
    signatureKeywords: ["CANARA BANK", "CNRB000", "CNRB0", "CANARABANK"],
    datePatterns: [
      { regex: /^\d{2}-\d{2}-\d{4}$/, format: "dd-MM-yyyy" },
      { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: "dd-MMM-yyyy" },
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
    ],
    // Canara: Date | Narration | Ref/Chq | Withdrawal | Deposit | Balance
    // ValueDate sometimes present between date and narration
    knownColumns: [
      { name: "date", minX: 10, maxX: 75 },
      { name: "narration", minX: 75, maxX: 330 },
      { name: "chqRef", minX: 330, maxX: 415 },
      { name: "withdrawal", minX: 415, maxX: 500 },
      { name: "deposit", minX: 500, maxX: 575 },
      { name: "balance", minX: 575, maxX: 660 },
    ],
    headerYTolerance: 8.0,
    hasExplicitSummary: true,
  },

  PNB: {
    preset: "PNB",
    label: "Punjab National Bank",
    signatureKeywords: ["PUNJAB NATIONAL BANK", "PUNB000", "PUNB0", "PNB BANK"],
    datePatterns: [
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
      { regex: /^\d{2}-\d{2}-\d{4}$/, format: "dd-MM-yyyy" },
      { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: "dd-MMM-yyyy" },
    ],
    // PNB actual layout: Date | Cheque No | Narration/Particulars | Withdrawal | Deposit | Balance
    // The old preset had narration at x=560+ which is completely wrong
    knownColumns: [
      { name: "date", minX: 10, maxX: 90 },
      { name: "chqRef", minX: 90, maxX: 165 },
      { name: "narration", minX: 165, maxX: 330 },
      { name: "withdrawal", minX: 330, maxX: 430 },
      { name: "deposit", minX: 430, maxX: 530 },
      { name: "balance", minX: 530, maxX: 620 },
    ],
    headerYTolerance: 8.0,
    hasExplicitSummary: true,
  },

  IDFC: {
    preset: "IDFC",
    label: "IDFC FIRST Bank",
    signatureKeywords: ["IDFC FIRST", "IDFB000", "IDFC BANK", "IDFCFIRST"],
    datePatterns: [
      { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: "dd-MMM-yyyy" },
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
      { regex: /^\d{2}-\d{2}-\d{4}$/, format: "dd-MM-yyyy" },
    ],
    knownColumns: [
      { name: "date", minX: 30, maxX: 100 },
      { name: "valueDate", minX: 100, maxX: 165 },
      { name: "narration", minX: 165, maxX: 370 },
      { name: "chqRef", minX: 370, maxX: 445 },
      { name: "withdrawal", minX: 445, maxX: 520 },
      { name: "deposit", minX: 520, maxX: 580 },
      { name: "balance", minX: 580, maxX: 650 },
    ],
    headerYTolerance: 8.0,
    hasExplicitSummary: true,
  },

  INDUSIND: {
    preset: "INDUSIND",
    label: "IndusInd Bank",
    signatureKeywords: ["INDUSIND BANK", "INDB000", "INDUSIND"],
    datePatterns: [
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
      { regex: /^\d{2}-\d{2}-\d{4}$/, format: "dd-MM-yyyy" },
      { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: "dd-MMM-yyyy" },
    ],
    knownColumns: [
      { name: "date", minX: 25, maxX: 90 },
      { name: "narration", minX: 90, maxX: 325 },
      { name: "chqRef", minX: 325, maxX: 400 },
      { name: "withdrawal", minX: 400, maxX: 465 },
      { name: "deposit", minX: 465, maxX: 530 },
      { name: "balance", minX: 530, maxX: 610 },
    ],
    headerYTolerance: 8.0,
    hasExplicitSummary: true,
  },

  GENERIC: {
    preset: "GENERIC",
    label: "Standard Bank Format",
    signatureKeywords: [],
    datePatterns: [
      { regex: /^\d{2}[-/.]\d{2}[-/.]\d{4}$/, format: "universal" },
      { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: "universal" },
      { regex: /^\d{4}[-/.]\d{2}[-/.]\d{2}$/, format: "universal" },
    ],
    headerYTolerance: 9.0,
    hasExplicitSummary: false,
  },

  UNION: {
    preset: "UNION",
    label: "Union Bank of India",
    signatureKeywords: ["UNION BANK OF INDIA", "UNION BANK", "UBIN0", "UBIN", "WWW.UNIONBANKOFINDIA.CO.IN", "UNIONBANK"],
    datePatterns: [
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "dd/MM/yyyy" },
      { regex: /^\d{2}-\d{2}-\d{4}$/, format: "dd-MM-yyyy" },
      { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: "dd-MMM-yyyy" },
    ],
    knownColumns: [
      { name: "date", minX: 45, maxX: 100 },
      { name: "narration", minX: 100, maxX: 260 },
      { name: "chqRef", minX: 260, maxX: 330 },
      { name: "withdrawal", minX: 330, maxX: 410 },
      { name: "deposit", minX: 410, maxX: 500 },
      { name: "balance", minX: 500, maxX: 610 },
    ],
    headerYTolerance: 8.0,
    hasExplicitSummary: true,
  },
};

/**
 * Detects the Bank Template from extracted full-text content or IFSC codes.
 * Prioritizes header text and IFSC codes over transaction narration keywords.
 */
export function detectBankPreset(fullText: string, headerText?: string): BankPreset {
  const upper = fullText.toUpperCase();
  const headerUpper = (headerText ? headerText.toUpperCase() : upper.slice(0, 1500));

  // 1. First priority: Check IFSC code in the header (or first 1500 chars of header text)
  const headerIfscMatch = headerUpper.match(/\b([A-Z]{4})0[A-Z0-9]{6}\b/);
  if (headerIfscMatch && headerIfscMatch[1]) {
    const bankCode = headerIfscMatch[1];
    if (bankCode.startsWith("HDFC")) return "HDFC";
    if (bankCode.startsWith("ICIC")) return "ICICI";
    if (bankCode.startsWith("SBIN")) return "SBI";
    if (bankCode.startsWith("UTIB")) return "AXIS";
    if (bankCode.startsWith("KKBK")) return "KOTAK";
    if (bankCode.startsWith("BARB")) return "BOB";
    if (bankCode.startsWith("CNRB")) return "CANARA";
    if (bankCode.startsWith("PUNB")) return "PNB";
    if (bankCode.startsWith("IDFB")) return "IDFC";
    if (bankCode.startsWith("INDB")) return "INDUSIND";
    if (bankCode.startsWith("UBIN")) return "UNION";
  }

  // 2. Second priority: Check bank keywords strictly in the header section
  for (const [key, config] of Object.entries(BANK_PRESETS)) {
    if (key === "GENERIC") continue;
    for (const kw of config.signatureKeywords) {
      if (headerUpper.includes(kw)) {
        return key as BankPreset;
      }
    }
  }

  // 3. Third priority: Check entire document IFSC match (if not in header)
  const fullIfscMatch = upper.match(/\b([A-Z]{4})0[A-Z0-9]{6}\b/);
  if (fullIfscMatch && fullIfscMatch[1]) {
    const bankCode = fullIfscMatch[1];
    if (bankCode.startsWith("HDFC")) return "HDFC";
    if (bankCode.startsWith("ICIC")) return "ICICI";
    if (bankCode.startsWith("SBIN")) return "SBI";
    if (bankCode.startsWith("UTIB")) return "AXIS";
    if (bankCode.startsWith("KKBK")) return "KOTAK";
    if (bankCode.startsWith("BARB")) return "BOB";
    if (bankCode.startsWith("CNRB")) return "CANARA";
    if (bankCode.startsWith("PUNB")) return "PNB";
    if (bankCode.startsWith("IDFB")) return "IDFC";
    if (bankCode.startsWith("INDB")) return "INDUSIND";
    if (bankCode.startsWith("UBIN")) return "UNION";
  }

  // 4. Fourth priority: Check bank keywords across entire document (excluding short prefixes that easily collide in narrations)
  for (const [key, config] of Object.entries(BANK_PRESETS)) {
    if (key === "GENERIC") continue;
    for (const kw of config.signatureKeywords) {
      if (kw.length < 5) continue; // Avoid matching 4-letter codes like UBIN in NEFT narrations
      if (upper.includes(kw)) {
        return key as BankPreset;
      }
    }
  }

  return "GENERIC";
}
