import type { AccountingMirrorRepository } from "../local-db/accountingMirrorRepository.js";
import type { RawPayloadRepository } from "../local-db/rawPayloadRepository.js";
import type { SyncCommand, SyncRepository } from "../local-db/syncRepository.js";
import type { TallyService } from "../tally/tallyService.js";

export type ConnectorRunResult = {
  readonly command: SyncCommand | null;
  readonly executed: boolean;
  readonly message: string;
};

export class ConnectorRuntime {
  public constructor(
    private readonly syncRepository: SyncRepository,
    private readonly tallyService: TallyService,
    private readonly rawPayloadRepository: RawPayloadRepository,
    private readonly accountingMirrorRepository: AccountingMirrorRepository,
  ) {}

  public async runNext(): Promise<ConnectorRunResult> {
    const command = this.syncRepository.claimNext();

    if (!command) {
      return {
        command: null,
        executed: false,
        message: "No pending sync commands.",
      };
    }

    this.syncRepository.markRunning(command.commandId);

    try {
      const resultMessage = await this.execute(command);
      this.syncRepository.markSuccess(command.commandId, resultMessage);

      return {
        command,
        executed: true,
        message: resultMessage,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown connector runtime failure.";
      this.syncRepository.markFailed(command.commandId, message);

      return {
        command,
        executed: true,
        message,
      };
    }
  }

  private async execute(command: SyncCommand): Promise<string> {
    const payload = parsePayload(command.payloadJson);

    switch (command.commandType) {
      case "PULL_COMPANIES": {
        const result = await this.tallyService.listCompanies();
        this.storePayloads(command.commandId, result.requestXml, result.responseXml);
        if (!result.ok) {
          throw new Error(result.error);
        }
        const stored = this.accountingMirrorRepository.upsertTallyCompanies(result.data);
        return `${stored} companies pulled from Tally and stored in the accounting mirror.`;
      }
      case "PULL_LEDGERS": {
        const companyName = readCompanyName(payload);
        const result = await this.tallyService.listLedgers(companyName);
        this.storePayloads(command.commandId, result.requestXml, result.responseXml);
        if (!result.ok) {
          throw new Error(result.error);
        }
        const stored = this.accountingMirrorRepository.upsertTallyLedgers(companyName, result.data);
        return `${stored} ledgers pulled from Tally and stored in the accounting mirror.`;
      }
      case "PULL_VOUCHER_TYPES": {
        const companyName = readCompanyName(payload);
        const result = await this.tallyService.listVoucherTypes(companyName);
        this.storePayloads(command.commandId, result.requestXml, result.responseXml);
        if (!result.ok) {
          throw new Error(result.error);
        }
        const stored = this.accountingMirrorRepository.upsertTallyVoucherTypes(companyName, result.data);
        return `${stored} voucher types pulled from Tally and stored in the accounting mirror.`;
      }
      case "PULL_VOUCHER_SUMMARIES": {
        const companyName = readCompanyName(payload);
        const fromDate = readString(payload, "fromDate");
        const toDate = readString(payload, "toDate");
        const result = await this.tallyService.listVoucherSummaries(companyName, fromDate, toDate);
        this.storePayloads(command.commandId, result.requestXml, result.responseXml);
        if (!result.ok) {
          throw new Error(result.error);
        }
        const stored = this.accountingMirrorRepository.upsertTallyVoucherSummaries(companyName, result.data);
        return `${stored} voucher summaries pulled from Tally and stored in the accounting mirror.`;
      }
      case "PULL_PARTIES": {
        const companyName = readCompanyName(payload);
        const result = await this.tallyService.listParties(companyName);
        this.storePayloads(command.commandId, result.requestXml, result.responseXml);
        if (!result.ok) {
          throw new Error(result.error);
        }
        const stored = this.accountingMirrorRepository.upsertTallyParties(companyName, result.data);
        return `${stored} parties pulled from Tally and stored in the accounting mirror.`;
      }
      case "PULL_UNITS": {
        const companyName = readCompanyName(payload);
        const result = await this.tallyService.listUnits(companyName);
        this.storePayloads(command.commandId, result.requestXml, result.responseXml);
        if (!result.ok) {
          throw new Error(result.error);
        }
        const stored = this.accountingMirrorRepository.upsertTallyUnits(companyName, result.data);
        return `${stored} units pulled from Tally and stored in the accounting mirror.`;
      }
      case "PULL_INVENTORY_ITEMS": {
        const companyName = readCompanyName(payload);
        const result = await this.tallyService.listInventoryItems(companyName);
        this.storePayloads(command.commandId, result.requestXml, result.responseXml);
        if (!result.ok) {
          throw new Error(result.error);
        }
        const stored = this.accountingMirrorRepository.upsertTallyInventoryItems(companyName, result.data);
        return `${stored} inventory items pulled from Tally and stored in the accounting mirror.`;
      }
      case "PUSH_VOUCHER": {
        const companyName = readCompanyName(payload);
        const voucherData = readObject(payload, "voucher");
        const result = await this.tallyService.createVoucher(companyName, voucherData as any);
        this.storePayloads(command.commandId, result.requestXml, result.responseXml);
        if (!result.ok) {
          throw new Error(result.error);
        }
        if (result.data.errorsCount > 0 || result.data.status === 0) {
          throw new Error(`Tally reported import errors: ${result.data.errors.join("; ")}`);
        }
        return `Voucher successfully created in Tally company "${companyName}". Created: ${result.data.created}, Altered: ${result.data.altered}.`;
      }
      case "PUSH_LEDGER": {
        const companyName = readCompanyName(payload);
        const ledgerData = readObject(payload, "ledger");
        const result = await this.tallyService.createLedger(companyName, ledgerData as any);
        this.storePayloads(command.commandId, result.requestXml, result.responseXml);
        if (!result.ok) {
          throw new Error(result.error);
        }
        if (result.data.errorsCount > 0 || result.data.status === 0) {
          throw new Error(`Tally reported ledger import errors: ${result.data.errors.join("; ")}`);
        }
        return `Ledger "${String(ledgerData["name"] ?? "New Ledger")}" created/synced in Tally company "${companyName}".`;

      }
    }
  }




  private storePayloads(commandId: string, requestXml: string, responseXml: string | null): void {
    this.rawPayloadRepository.store({
      commandId,
      provider: "TALLY",
      direction: "REQUEST",
      contentType: "application/xml",
      body: requestXml,
    });

    if (responseXml !== null) {
      this.rawPayloadRepository.store({
        commandId,
        provider: "TALLY",
        direction: "RESPONSE",
        contentType: "application/xml",
        body: responseXml,
      });
    }
  }
}

function parsePayload(payloadJson: string): unknown {
  try {
    return JSON.parse(payloadJson) as unknown;
  } catch {
    throw new Error("Sync command payload is not valid JSON.");
  }
}

function readCompanyName(payload: unknown): string {
  return readString(payload, "companyName");
}

function readObject(payload: unknown, key: string): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || !(key in payload)) {
    throw new Error(`Sync command payload is missing ${key}.`);
  }

  const value = (payload as Record<string, unknown>)[key];
  if (typeof value !== "object" || value === null) {
    throw new Error(`Sync command payload has invalid ${key}.`);
  }

  return value as Record<string, unknown>;
}

function readString(payload: unknown, key: string): string {

  if (typeof payload !== "object" || payload === null || !(key in payload)) {
    throw new Error(`Sync command payload is missing ${key}.`);
  }

  const value = (payload as Record<string, unknown>)[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Sync command payload has invalid ${key}.`);
  }

  return value.trim();
}
