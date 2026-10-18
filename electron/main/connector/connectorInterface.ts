export type ConnectionResult = {
  readonly connected: boolean;
  readonly provider: string;
  readonly message: string;
};

export type AccountingCompany = {
  readonly id: string;
  readonly displayName: string;
  readonly provider: string;
};

export type AccountingVoucher = {
  readonly number: string;
  readonly date: string;
  readonly total: number;
  readonly voucherTypeName?: string;
  readonly partyName?: string;
  readonly narration?: string;
};

export type SyncResult = {
  readonly success: boolean;
  readonly provider: string;
  readonly externalId: string;
  readonly message: string;
};
