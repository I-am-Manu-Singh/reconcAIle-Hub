import { contextBridge, ipcRenderer } from "electron";

type DesktopAppInfo = {
  readonly appName: string;
  readonly appVersion: string;
  readonly platform: NodeJS.Platform;
  readonly mode: "development" | "production";
  readonly localConnectorAvailable: boolean;
};

type ConnectorCapabilityStatus = {
  readonly localConnectorAvailable: boolean;
  readonly tallyLocalIntegrationAvailable: boolean;
  readonly reason: string | null;
};

type DeviceIdentity = {
  readonly id: string;
  readonly deviceName: string;
  readonly platform: NodeJS.Platform;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type ConnectorSettings = {
  readonly tallyHost: string;
  readonly tallyPort: number;
  readonly enableLocalTallyConnector: boolean;
  readonly enableBackgroundSync: boolean;
  readonly rawPayloadRetentionDays: number;
  readonly updatedAt: string;
};

type ConnectorSettingsUpdate = Partial<Omit<ConnectorSettings, "updatedAt">>;

type CredentialAvailability = {
  readonly cloudAccessToken: boolean;
  readonly cloudRefreshToken: boolean;
  readonly connectorDeviceToken: boolean;
};

type BackendSettings = {
  readonly apiBaseUrl: string | null;
  readonly websocketUrl: string | null;
  readonly updatedAt: string;
};

type ConnectorPairing = {
  readonly connectorId: string | null;
  readonly organizationId: string | null;
  readonly workspaceId: string | null;
  readonly pairedAt: string | null;
  readonly lastHeartbeatAt: string | null;
  readonly status: "UNPAIRED" | "PAIRED" | "ERROR";
  readonly updatedAt: string;
};

type MirrorStats = {
  readonly companies: number;
  readonly ledgers: number;
  readonly voucherTypes: number;
  readonly vouchers: number;
  readonly mappings: number;
};

type StoredDocument = {
  readonly id: string;
  readonly originalFileName: string;
  readonly storedFilePath: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly sha256: string;
  readonly status: "IMPORTED" | "OCR_PENDING" | "OCR_PROCESSING" | "OCR_FAILED" | "EXTRACTED" | "REVIEWED" | "REJECTED";
  readonly createdAt: string;
  readonly updatedAt: string;
};

type DocumentStats = {
  readonly documents: number;
  readonly imported: number;
  readonly ocrPending: number;
};

type DocumentExtraction = {
  readonly id: string;
  readonly documentId: string;
  readonly rawOcrText: string | null;
  readonly partyName: string | null;
  readonly partyGstin: string | null;
  readonly invoiceNumber: string | null;
  readonly invoiceDate: string | null;
  readonly taxableAmount: number | null;
  readonly cgstAmount: number | null;
  readonly sgstAmount: number | null;
  readonly igstAmount: number | null;
  readonly totalAmount: number | null;
  readonly confidenceScore: number;
  readonly extractedAt: string;
};

type DraftVoucher = {
  readonly id: string;
  readonly documentId: string;
  readonly companyId: string | null;
  readonly voucherTypeName: string;
  readonly voucherDate: string;
  readonly voucherNumber: string | null;
  readonly partyName: string;
  readonly partyLedgerId: string | null;
  readonly taxableAmount: number;
  readonly cgstAmount: number;
  readonly sgstAmount: number;
  readonly igstAmount: number;
  readonly totalAmount: number;
  readonly status: "DRAFT" | "APPROVED" | "REJECTED";
  readonly validationStatus: "BALANCED" | "UNBALANCED" | "MISSING_LEDGER";
  readonly validationErrors: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
};



type TallyCompany = {
  readonly name: string;
};

type TallyLedger = {
  readonly name: string;
  readonly parent: string | null;
  readonly guid: string | null;
  readonly openingBalance: string | null;
  readonly closingBalance: string | null;
};

type TallyVoucherType = {
  readonly name: string;
  readonly parent: string | null;
};

type TallyVoucherSummary = {
  readonly date: string | null;
  readonly voucherTypeName: string | null;
  readonly voucherNumber: string | null;
  readonly guid: string | null;
  readonly narration: string | null;
};

type TallyConnectionState =
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

type TallyRequestResult<T> =
  | {
      readonly ok: true;
      readonly requestXml: string;
      readonly responseXml: string;
      readonly data: T;
    }
  | {
      readonly ok: false;
      readonly requestXml: string;
      readonly responseXml: string | null;
      readonly error: string;
    };

type MirrorCompany = {
  readonly id: string;
  readonly displayName: string;
  readonly name?: string;
  readonly sourceProvider: string;
  readonly sourceName: string;
  readonly gstin?: string;
  readonly stateName?: string;
  readonly booksFrom?: string;
  readonly iconName?: string;
  readonly updatedAt: string;
};

type MirrorLedger = {
  readonly id: string;
  readonly companyId: string;
  readonly name: string;
  readonly parentName: string | null;
  readonly openingBalanceText: string | null;
  readonly closingBalanceText: string | null;
  readonly gstin?: string | null;
  readonly pan?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly stateName?: string | null;
  readonly pincode?: string | null;
  readonly bankAccountNumber?: string | null;
  readonly bankIfsc?: string | null;
  readonly bankName?: string | null;
  readonly creditLimit?: number | null;
  readonly creditDays?: number | null;
  readonly isBillWise?: number | null;
};

type MirrorVoucher = {
  readonly id: string;
  readonly voucherDate: string | null;
  readonly voucherTypeName: string | null;
  readonly voucherNumber: string | null;
  readonly narration: string | null;
};

type SyncCommand = {
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly workspaceId: string | null;
  readonly companyId: string | null;
  readonly provider: "TALLY";
  readonly commandType:
    | "PULL_COMPANIES"
    | "PULL_LEDGERS"
    | "PULL_VOUCHER_TYPES"
    | "PULL_VOUCHER_SUMMARIES"
    | "PULL_PARTIES"
    | "PULL_UNITS"
    | "PULL_INVENTORY_ITEMS"
    | "PUSH_VOUCHER"
    | "PUSH_LEDGER";
  readonly payloadJson: string;


  readonly status: "PENDING" | "CLAIMED" | "RUNNING" | "SUCCESS" | "FAILED" | "CONFLICT" | "CANCELLED";
  readonly attempts: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastError: string | null;
};


type ConnectorRunResult = {
  readonly command: SyncCommand | null;
  readonly executed: boolean;
  readonly message: string;
};

const desktopApi = {
  app: {
    getInfo: (): Promise<DesktopAppInfo> => ipcRenderer.invoke("app:get-info") as Promise<DesktopAppInfo>,
    getVersion: (): Promise<DesktopAppInfo> => ipcRenderer.invoke("app:get-info") as Promise<DesktopAppInfo>,
    getDiagnostics: (): Promise<any> => ipcRenderer.invoke("app:get-diagnostics") as Promise<any>,
    testBusy: (): Promise<any> => ipcRenderer.invoke("app:test-busy") as Promise<any>,
  },

  device: {
    getIdentity: (): Promise<DeviceIdentity> => ipcRenderer.invoke("device:get-identity") as Promise<DeviceIdentity>,
    rename: (deviceName: string): Promise<DeviceIdentity> =>
      ipcRenderer.invoke("device:rename", { deviceName }) as Promise<DeviceIdentity>,
  },
  settings: {
    getConnectorSettings: (): Promise<ConnectorSettings> =>
      ipcRenderer.invoke("settings:get-connector-settings") as Promise<ConnectorSettings>,
    updateConnectorSettings: (update: ConnectorSettingsUpdate): Promise<ConnectorSettings> =>
      ipcRenderer.invoke("settings:update-connector-settings", update) as Promise<ConnectorSettings>,
  },
  preferences: {
    get: (key: string, defaultValue?: string): Promise<string | null> =>
      ipcRenderer.invoke("preferences:get", { key, defaultValue }),
    getAll: (category?: string): Promise<Record<string, string>> =>
      ipcRenderer.invoke("preferences:get-all", { category }),
    set: (key: string, value: string, category?: string): Promise<boolean> =>
      ipcRenderer.invoke("preferences:set", { key, value, category }),
    setBatch: (entries: Record<string, string>, category?: string): Promise<boolean> =>
      ipcRenderer.invoke("preferences:set-batch", { entries, category }),
  },
  models: {
    getStatus: (modelId?: string): Promise<any> =>
      ipcRenderer.invoke("models:get-status", { modelId }),
    getEngineStatus: (): Promise<any> =>
      ipcRenderer.invoke("models:get-engine-status"),
    preload: (modelId?: string): Promise<boolean> =>
      ipcRenderer.invoke("models:preload", { modelId }),
    download: (modelId?: string): Promise<string> =>
      ipcRenderer.invoke("models:download", { modelId }),
    cancelDownload: (): Promise<boolean> =>
      ipcRenderer.invoke("models:cancel-download"),
    list: (): Promise<any[]> =>
      ipcRenderer.invoke("models:list"),
    pickImport: (): Promise<any> =>
      ipcRenderer.invoke("models:pick-import"),
    chat: (messages: any[], options?: any): Promise<any> =>
      ipcRenderer.invoke("models:chat", { messages, options }),
    onProgress: (callback: (progress: any) => void): (() => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on("models:download-progress", listener);
      return () => ipcRenderer.removeListener("models:download-progress", listener);
    },
  },
  aiChat: {
    listConversations: (): Promise<any[]> =>
      ipcRenderer.invoke("chat:list-conversations"),
    createConversation: (payload?: { title?: string; modelId?: string }): Promise<any> =>
      ipcRenderer.invoke("chat:create-conversation", payload),
    updateTitle: (id: string, title: string): Promise<boolean> =>
      ipcRenderer.invoke("chat:update-title", { id, title }),
    deleteConversation: (id: string): Promise<boolean> =>
      ipcRenderer.invoke("chat:delete-conversation", { id }),
    getMessages: (conversationId: string): Promise<any[]> =>
      ipcRenderer.invoke("chat:get-messages", { conversationId }),
    saveMessage: (payload: {
      conversationId: string;
      role: "system" | "user" | "assistant";
      content: string;
      provider?: string | null;
      model?: string | null;
    }): Promise<any> =>
      ipcRenderer.invoke("chat:save-message", payload),
    getMentionsContext: (): Promise<{
      documents: any[];
      companies: any[];
      bankSessions: any[];
    }> =>
      ipcRenderer.invoke("chat:get-mentions-context"),
  },
  credentials: {
    getAvailability: (): Promise<CredentialAvailability> =>
      ipcRenderer.invoke("credentials:get-availability") as Promise<CredentialAvailability>,
  },
  backend: {
    getSettings: (): Promise<BackendSettings> => ipcRenderer.invoke("backend:get-settings") as Promise<BackendSettings>,
    updateSettings: (settings: { readonly apiBaseUrl: string | null; readonly websocketUrl: string | null }): Promise<BackendSettings> =>
      ipcRenderer.invoke("backend:update-settings", settings) as Promise<BackendSettings>,
    getPairing: (): Promise<ConnectorPairing> => ipcRenderer.invoke("backend:get-pairing") as Promise<ConnectorPairing>,
    pairConnector: (pairingCode: string): Promise<ConnectorPairing> =>
      ipcRenderer.invoke("backend:pair-connector", { pairingCode }) as Promise<ConnectorPairing>,
  },
  accountingMirror: {
    getStats: (): Promise<MirrorStats> => ipcRenderer.invoke("accounting-mirror:get-stats") as Promise<MirrorStats>,
    listCompanies: (): Promise<readonly MirrorCompany[]> =>
      ipcRenderer.invoke("accounting-mirror:list-companies") as Promise<readonly MirrorCompany[]>,
    listLedgers: (companyId: string): Promise<readonly MirrorLedger[]> =>
      ipcRenderer.invoke("accounting-mirror:list-ledgers", { companyId }) as Promise<readonly MirrorLedger[]>,
    listInventoryItems: (companyId?: string): Promise<readonly any[]> =>
      ipcRenderer.invoke("accounting-mirror:list-inventory-items", { companyId }) as Promise<readonly any[]>,
    listVouchers: (companyId: string, limit?: number): Promise<readonly MirrorVoucher[]> =>
      ipcRenderer.invoke("accounting-mirror:list-vouchers", { companyId, limit }) as Promise<readonly MirrorVoucher[]>,
    listBankTransactions: (companyId?: string): Promise<readonly any[]> =>
      ipcRenderer.invoke("accounting-mirror:list-bank-transactions", { companyId }) as Promise<readonly any[]>,
    listGstr2bRecords: (companyId?: string): Promise<readonly any[]> =>
      ipcRenderer.invoke("accounting-mirror:list-gstr2b-records", { companyId }) as Promise<readonly any[]>,
    saveCompany: (company: {
      readonly id?: string;
      readonly displayName: string;
      readonly sourceProvider?: string;
      readonly gstin?: string;
      readonly stateName?: string;
      readonly booksFrom?: string;
      readonly iconName?: string;
    }): Promise<MirrorCompany> =>
      ipcRenderer.invoke("accounting-mirror:save-company", { company }) as Promise<MirrorCompany>,
    deleteCompany: (companyId: string): Promise<boolean> =>
      ipcRenderer.invoke("accounting-mirror:delete-company", { companyId }) as Promise<boolean>,
    importTallyXmlDump: (companyName: string, xmlContent: string): Promise<{ ledgers: number; vouchers: number; parties: number }> =>
      ipcRenderer.invoke("accounting-mirror:import-tally-xml-dump", { companyName, xmlContent }) as Promise<{ ledgers: number; vouchers: number; parties: number }>,
    markBankTransactionsReconciled: (
      transactions: readonly {
        readonly transactionId: string;
        readonly voucherId?: string;
        readonly companyId?: string;
        readonly voucherTypeName?: string;
        readonly voucherDate?: string;
        readonly narration?: string;
      }[]
    ): Promise<number> =>
      ipcRenderer.invoke("accounting-mirror:mark-bank-transactions-reconciled", { transactions }) as Promise<number>,
    exportGstr1Json: (companyId?: string): Promise<object> =>
      ipcRenderer.invoke("accounting-mirror:export-gstr1-json", { companyId }) as Promise<object>,
    setCompanyPassword: (companyId: string, password: string | null): Promise<boolean> =>
      ipcRenderer.invoke("accounting-mirror:set-company-password", { companyId, password }) as Promise<boolean>,
    verifyCompanyPassword: (companyId: string, password: string): Promise<boolean> =>
      ipcRenderer.invoke("accounting-mirror:verify-company-password", { companyId, password }) as Promise<boolean>,
    saveLedger: (ledger: any): Promise<{ id: string; name: string; companyId: string }> =>
      ipcRenderer.invoke("accounting-mirror:save-ledger", { ledger }) as Promise<{ id: string; name: string; companyId: string }>,
    deleteLedger: (ledgerId: string): Promise<boolean> =>
      ipcRenderer.invoke("accounting-mirror:delete-ledger", { ledgerId }) as Promise<boolean>,
    saveVoucher: (voucher: any): Promise<{ id: string; companyId: string; voucherTypeName: string; voucherNumber: string }> =>
      ipcRenderer.invoke("accounting-mirror:save-voucher", { voucher }) as Promise<{ id: string; companyId: string; voucherTypeName: string; voucherNumber: string }>,
    deleteVoucher: (voucherId: string): Promise<boolean> =>
      ipcRenderer.invoke("accounting-mirror:delete-voucher", { voucherId }) as Promise<boolean>,
    saveInventoryItem: (item: any): Promise<{ id: string; name: string; companyId: string }> =>
      ipcRenderer.invoke("accounting-mirror:save-inventory-item", { item }) as Promise<{ id: string; name: string; companyId: string }>,
    listStockGroups: (companyId?: string): Promise<readonly any[]> =>
      ipcRenderer.invoke("accounting-mirror:list-stock-groups", { companyId }) as Promise<readonly any[]>,
    saveStockGroup: (group: any): Promise<any> =>
      ipcRenderer.invoke("accounting-mirror:save-stock-group", { group }) as Promise<any>,
    listStockCategories: (companyId?: string): Promise<readonly any[]> =>
      ipcRenderer.invoke("accounting-mirror:list-stock-categories", { companyId }) as Promise<readonly any[]>,
    saveStockCategory: (category: any): Promise<any> =>
      ipcRenderer.invoke("accounting-mirror:save-stock-category", { category }) as Promise<any>,
    listGodowns: (companyId?: string): Promise<readonly any[]> =>
      ipcRenderer.invoke("accounting-mirror:list-godowns", { companyId }) as Promise<readonly any[]>,
    saveGodown: (godown: any): Promise<any> =>
      ipcRenderer.invoke("accounting-mirror:save-godown", { godown }) as Promise<any>,
    listStockBatches: (companyId?: string, stockItemName?: string): Promise<readonly any[]> =>
      ipcRenderer.invoke("accounting-mirror:list-stock-batches", { companyId, stockItemName }) as Promise<readonly any[]>,
    saveStockBatch: (batch: any): Promise<any> =>
      ipcRenderer.invoke("accounting-mirror:save-stock-batch", { batch }) as Promise<any>,
    listUnits: (companyId?: string): Promise<readonly any[]> =>
      ipcRenderer.invoke("accounting-mirror:list-units", { companyId }) as Promise<readonly any[]>,
    saveUnit: (unit: any): Promise<any> =>
      ipcRenderer.invoke("accounting-mirror:save-unit", { unit }) as Promise<any>,
  },

  documents: {
    pickAndImport: (): Promise<readonly StoredDocument[]> =>
      ipcRenderer.invoke("documents:pick-and-import") as Promise<readonly StoredDocument[]>,
    pickFiles: (): Promise<readonly StoredDocument[]> =>
      ipcRenderer.invoke("documents:pick-and-import") as Promise<readonly StoredDocument[]>,
    importBuffer: (fileName: string, buffer: ArrayBuffer): Promise<StoredDocument> =>
      ipcRenderer.invoke("documents:import-buffer", { fileName, buffer }) as Promise<StoredDocument>,
    listRecent: (): Promise<readonly StoredDocument[]> =>
      ipcRenderer.invoke("documents:list-recent") as Promise<readonly StoredDocument[]>,
    getFileBuffer: (documentIdOrPath: string): Promise<{ buffer: ArrayBuffer; mimeType: string; fileName: string } | null> =>
      ipcRenderer.invoke("documents:get-file-buffer", { documentIdOrPath }) as Promise<{ buffer: ArrayBuffer; mimeType: string; fileName: string } | null>,
    getStats: (): Promise<DocumentStats> => ipcRenderer.invoke("documents:get-stats") as Promise<DocumentStats>,
    processOcr: (documentId: string): Promise<DocumentExtraction> =>
      ipcRenderer.invoke("documents:process-ocr", { documentId }) as Promise<DocumentExtraction>,
    getExtraction: (documentId: string): Promise<DocumentExtraction | null> =>
      ipcRenderer.invoke("documents:get-extraction", { documentId }) as Promise<DocumentExtraction | null>,
    generateDraftVoucher: (documentId: string, companyId?: string): Promise<DraftVoucher> =>
      ipcRenderer.invoke("documents:generate-draft-voucher", { documentId, companyId }) as Promise<DraftVoucher>,
    approveDraftVoucher: (documentId: string): Promise<DraftVoucher> =>
      ipcRenderer.invoke("documents:approve-draft-voucher", { documentId }) as Promise<DraftVoucher>,
    getDraftVoucher: (documentId: string): Promise<DraftVoucher | null> =>
      ipcRenderer.invoke("documents:get-draft-voucher", { documentId }) as Promise<DraftVoucher | null>,
    parseBankStatement: (documentId: string, companyId?: string, password?: string): Promise<any> =>
      ipcRenderer.invoke("documents:parse-bank-statement", { documentId, companyId, password }),
    classifyTransactions: (companyId: string, transactions: readonly any[], aiOptions?: any): Promise<any> =>
      ipcRenderer.invoke("documents:classify-transactions", { 
        companyId, 
        transactions, 
        aiOptions: typeof aiOptions === "object" ? aiOptions : { apiKey: aiOptions, provider: "groq" } 
      }),
    saveLedgerRule: (companyId: string, rule: any): Promise<void> =>
      ipcRenderer.invoke("documents:save-ledger-rule", { companyId, rule }),
    listLedgerRules: (companyId?: string): Promise<readonly any[]> =>
      ipcRenderer.invoke("documents:list-ledger-rules", { companyId }) as Promise<readonly any[]>,
    deleteLedgerRule: (ruleId: string): Promise<boolean> =>
      ipcRenderer.invoke("documents:delete-ledger-rule", { ruleId }) as Promise<boolean>,
  },

  bankSessions: {
    list: (companyId: string, options?: {
      sortBy?: string; sortDir?: "ASC" | "DESC";
      financialYear?: string; bankName?: string;
      limit?: number; offset?: number;
    }): Promise<any[]> =>
      ipcRenderer.invoke("bank-sessions:list", { companyId, options }) as Promise<any[]>,
    get: (sessionId: string): Promise<any | null> =>
      ipcRenderer.invoke("bank-sessions:get", { sessionId }) as Promise<any | null>,
    getTransactions: (sessionId: string, options?: {
      sortBy?: string; sortDir?: "ASC" | "DESC"; limit?: number; offset?: number;
    }): Promise<any[]> =>
      ipcRenderer.invoke("bank-sessions:get-transactions", { sessionId, options }) as Promise<any[]>,
    updateTransaction: (txId: string, updates: {
      description?: string; referenceNo?: string;
      debit?: number; credit?: number; balance?: number;
      category?: string; reconciliationStatus?: string;
    }): Promise<any | null> =>
      ipcRenderer.invoke("bank-sessions:update-transaction", { txId, updates }) as Promise<any | null>,
    updateNotes: (sessionId: string, notes: string): Promise<any | null> =>
      ipcRenderer.invoke("bank-sessions:update-notes", { sessionId, notes }) as Promise<any | null>,
    deleteSession: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke("bank-sessions:delete", { sessionId }) as Promise<void>,
    summaries: (companyId: string): Promise<any[]> =>
      ipcRenderer.invoke("bank-sessions:summaries", { companyId }) as Promise<any[]>,
  },


  connector: {
    getCapabilityStatus: (): Promise<ConnectorCapabilityStatus> =>
      ipcRenderer.invoke("connector:get-capability-status") as Promise<ConnectorCapabilityStatus>,
  },

  tally: {
    checkConnection: (): Promise<TallyConnectionState> =>
      ipcRenderer.invoke("tally:check-connection") as Promise<TallyConnectionState>,
    testConnection: (): Promise<TallyConnectionState> =>
      ipcRenderer.invoke("tally:check-connection") as Promise<TallyConnectionState>,
    getStatus: (): Promise<TallyConnectionState> =>
      ipcRenderer.invoke("tally:check-connection") as Promise<TallyConnectionState>,
    syncNow: (): Promise<ConnectorRunResult> => ipcRenderer.invoke("sync:run-next") as Promise<ConnectorRunResult>,
    listCompanies: (): Promise<TallyRequestResult<readonly TallyCompany[]>> =>
      ipcRenderer.invoke("tally:list-companies") as Promise<TallyRequestResult<readonly TallyCompany[]>>,
    listLedgers: (companyName: string): Promise<TallyRequestResult<readonly TallyLedger[]>> =>
      ipcRenderer.invoke("tally:list-ledgers", { companyName }) as Promise<TallyRequestResult<readonly TallyLedger[]>>,
    listVoucherTypes: (companyName: string): Promise<TallyRequestResult<readonly TallyVoucherType[]>> =>
      ipcRenderer.invoke("tally:list-voucher-types", { companyName }) as Promise<
        TallyRequestResult<readonly TallyVoucherType[]>
      >,
    listVoucherSummaries: (
      companyName: string,
      fromDate: string,
      toDate: string,
    ): Promise<TallyRequestResult<readonly TallyVoucherSummary[]>> =>
      ipcRenderer.invoke("tally:list-voucher-summaries", { companyName, fromDate, toDate }) as Promise<
        TallyRequestResult<readonly TallyVoucherSummary[]>
      >,
    importStatementVouchers: (
      companyName: string,
      vouchers: readonly any[]
    ): Promise<{ success: boolean; createdCount: number; errorCount: number; lineErrors: readonly string[]; rawResponse: string }> =>
      ipcRenderer.invoke("tally:import-statement-vouchers", { companyName, vouchers }),
    exportStatementVouchersXml: (
      companyName: string,
      vouchers: readonly any[],
      suggestedFileName?: string
    ): Promise<{ canceled: boolean; filePath: string | null; exportedCount: number }> =>
      ipcRenderer.invoke("tally:export-statement-vouchers-xml", { companyName, vouchers, suggestedFileName }),
  },
  sync: {
    enqueuePullCompanies: (): Promise<SyncCommand> =>
      ipcRenderer.invoke("sync:enqueue", {
        commandType: "PULL_COMPANIES",
        payload: {},
      }) as Promise<SyncCommand>,
    runNext: (): Promise<ConnectorRunResult> => ipcRenderer.invoke("sync:run-next") as Promise<ConnectorRunResult>,
    getQueue: (): Promise<readonly SyncCommand[]> =>
      ipcRenderer.invoke("sync:list-recent-commands") as Promise<readonly SyncCommand[]>,
    retryCommand: (): Promise<ConnectorRunResult> => ipcRenderer.invoke("sync:run-next") as Promise<ConnectorRunResult>,
    listRecentCommands: (): Promise<readonly SyncCommand[]> =>
      ipcRenderer.invoke("sync:list-recent-commands") as Promise<readonly SyncCommand[]>,
    pushVoucherToTally: (companyName: string, voucher: { readonly date: string; readonly voucherTypeName: string; readonly partyName: string; readonly amount: number; readonly voucherNumber?: string; readonly narration?: string }): Promise<SyncCommand> =>
      ipcRenderer.invoke("sync:enqueue", {
        commandType: "PUSH_VOUCHER",
        payload: { companyName, voucher },
      }) as Promise<SyncCommand>,
    pushLedgerToTally: (companyName: string, ledger: { readonly name: string; readonly parentGroup: string; readonly openingBalance?: number }): Promise<SyncCommand> =>
      ipcRenderer.invoke("sync:enqueue", {
        commandType: "PUSH_LEDGER",
        payload: { companyName, ledger },
      }) as Promise<SyncCommand>,
  },
  reconciliation: {
    runAutoBrs: (payload: {
      readonly companyId?: string;
      readonly companyName?: string;
      readonly bankLedgerName?: string;
      readonly fromDate?: string;
      readonly toDate?: string;
      readonly options?: {
        readonly dateToleranceDays?: number;
        readonly amountToleranceRupees?: number;
        readonly fuzzyThreshold?: number;
      };
    }): Promise<any> =>
      ipcRenderer.invoke("reconciliation:run-auto-brs", payload),
    linkManualMatch: (payload: {
      readonly bankTransactionId: string;
      readonly tallyVoucherId: string;
      readonly companyId?: string;
    }): Promise<number> =>
      ipcRenderer.invoke("reconciliation:link-manual-match", payload),
  },
  print: {
    getPrinters: (): Promise<readonly any[]> => ipcRenderer.invoke("print:get-printers"),
    printToPdf: (options?: {
      readonly marginsType?: number;
      readonly printBackground?: boolean;
      readonly printSelectionOnly?: boolean;
      readonly landscape?: boolean;
      readonly pageSize?: string;
      readonly scaleFactor?: number;
      readonly suggestedFileName?: string;
      readonly html?: string;
      readonly header?: string;
      readonly footer?: string;
    }): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> =>
      ipcRenderer.invoke("print:to-pdf", options),
    execute: (options?: {
      readonly silent?: boolean;
      readonly printBackground?: boolean;
      readonly deviceName?: string;
      readonly color?: boolean;
      readonly margins?: any;
      readonly landscape?: boolean;
      readonly pagesPerSheet?: number;
      readonly collate?: boolean;
      readonly copies?: number;
      readonly header?: string;
      readonly footer?: string;
      readonly pageSize?: string;
    }): Promise<{ success: boolean; failureReason?: string }> =>
      ipcRenderer.invoke("print:execute", options),
  },
};

contextBridge.exposeInMainWorld("desktop", desktopApi);

export type DesktopApi = typeof desktopApi;
