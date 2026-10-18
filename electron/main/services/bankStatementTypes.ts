/**
 * Bank Statement Extraction Core Types
 * Synthesizes architecture from Bally-AI, Hisaabo & CA-Jyotsana
 */

export interface RawPdfTextItem {
  readonly str: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly pageNumber: number;
}

export type BankPreset = 
  | "HDFC" 
  | "ICICI" 
  | "SBI" 
  | "AXIS" 
  | "KOTAK" 
  | "BOB" 
  | "CANARA" 
  | "PNB" 
  | "IDFC" 
  | "INDUSIND" 
  | "UNION"
  | "GENERIC";

export interface ColumnBoundary {
  readonly name: "date" | "valueDate" | "narration" | "chqRef" | "withdrawal" | "deposit" | "balance" | "amount" | "drcr" | "ignore";
  readonly minX: number;
  readonly maxX: number;
}

export interface BankTemplateConfig {
  readonly preset: BankPreset;
  readonly label: string;
  readonly signatureKeywords: readonly string[];
  readonly datePatterns: readonly { readonly regex: RegExp; readonly format: string }[];
  readonly knownColumns?: readonly { readonly name: ColumnBoundary["name"]; readonly minX: number; readonly maxX: number }[];
  readonly headerYTolerance: number;
  readonly hasExplicitSummary: boolean;
}

export interface ParsedStatementTransaction {
  readonly id: string;
  readonly documentId?: string | undefined;
  readonly companyId?: string | undefined;
  readonly date: string;              // ISO YYYY-MM-DD
  readonly valueDate?: string | undefined;        // ISO YYYY-MM-DD
  readonly narration: string;         // Stitched multi-line clean narration
  readonly referenceNo: string;       // Chq / UTR / UPI Ref / IMPS
  readonly debit: number;             // Withdrawal Amount
  readonly credit: number;            // Deposit Amount
  readonly balance: number;           // Running Balance
  readonly pageNumber: number;
  readonly bankName: string;
  readonly accountNumber?: string | undefined;
  readonly validationWarning?: string | undefined;
}

export interface MonthlyBalanceBreakdown {
  readonly month: string; // "2025-04"
  readonly monthLabel: string; // "Apr 2025"
  readonly openingBalance: number;
  readonly totalDebits: number;
  readonly totalCredits: number;
  readonly closingBalance: number;
  readonly txCount: number;
  readonly isBalanced: boolean;
}

export interface PageBalanceBreakdown {
  readonly pageNumber: number;
  readonly startBalance: number;
  readonly totalDebits: number;
  readonly totalCredits: number;
  readonly endBalance: number;
  readonly txCount: number;
  readonly isBalanced: boolean;
}

export interface StatementExtractionResult {
  readonly bankName: BankPreset;
  readonly bankLabel: string;
  readonly accountHolderName?: string | null;
  readonly customerId?: string | null;
  readonly branchName?: string | null;
  readonly accountNumber: string | null;
  readonly ifscCode: string | null;
  readonly period: {
    readonly fromDate: string | null;
    readonly toDate: string | null;
  };
  readonly openingBalance: number;
  readonly closingBalance: number;
  readonly calculatedClosingBalance: number;
  readonly isBalanceReconciled: boolean;
  readonly totalDebits: number;
  readonly totalCredits: number;
  readonly transactions: readonly ParsedStatementTransaction[];
  readonly monthlyBreakdown: readonly MonthlyBalanceBreakdown[];
  readonly pageBreakdown: readonly PageBalanceBreakdown[];
  readonly confidence: number;
  readonly pageCount: number;
  readonly extractionMethod: "NATIVE_SPATIAL" | "POSITIONAL_OCR" | "GENERIC_HEURISTIC";
}
