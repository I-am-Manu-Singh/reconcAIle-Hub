export type TallyConnectionState =
  | {
      readonly status: "reachable";
      readonly host: string;
      readonly port: number;
      readonly checkedAt: string;
      readonly companies: readonly TallyCompany[];
    }
  | {
      readonly status: "unreachable";
      readonly host: string;
      readonly port: number;
      readonly checkedAt: string;
      readonly reason: string;
    };

export type TallyCompany = {
  readonly name: string;
};

export type TallyLedger = {
  readonly name: string;
  readonly parent: string | null;
  readonly guid: string | null;
  readonly openingBalance: string | null;
  readonly closingBalance: string | null;
};

export type TallyVoucherType = {
  readonly name: string;
  readonly parent: string | null;
};

export type TallyVoucherSummary = {
  readonly date: string | null;
  readonly voucherTypeName: string | null;
  readonly voucherNumber: string | null;
  readonly guid: string | null;
  readonly narration: string | null;
};

export type TallyParty = {
  readonly name: string;
  readonly parent: string | null;
  readonly guid: string | null;
  readonly gstin: string | null;
  readonly pan: string | null;
  readonly address: string | null;
  readonly stateCode: string | null;
  readonly partyType: "SUNDRY_DEBTOR" | "SUNDRY_CREDITOR" | "OTHER";
};

export type TallyUnit = {
  readonly name: string;
  readonly formalName: string | null;
  readonly unitType: "SIMPLE" | "COMPOUND";
};

export type TallyInventoryItem = {
  readonly name: string;
  readonly parent: string | null;
  readonly unitName: string | null;
  readonly openingQtyText: string | null;
  readonly closingQtyText: string | null;
};

export type TallyResponseStatus = {
  readonly status: 0 | 1 | null;
  readonly errors: readonly string[];
};

export type TallyImportResult = {
  readonly status: 0 | 1 | null;
  readonly created: number;
  readonly altered: number;
  readonly deleted: number;
  readonly combined: number;
  readonly ignored: number;
  readonly errorsCount: number;
  readonly cancelled: number;
  readonly lastVoucherId: string | null;
  readonly lastMasterId: string | null;
  readonly voucherNumber: string | null;
  readonly errors: readonly string[];
};

export type TallyRequestResult<T> = {
  readonly ok: true;
  readonly requestXml: string;
  readonly responseXml: string;
  readonly data: T;
} | {
  readonly ok: false;
  readonly requestXml: string;
  readonly responseXml: string | null;
  readonly error: string;
};
