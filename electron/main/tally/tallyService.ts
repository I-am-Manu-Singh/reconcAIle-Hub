import type { SettingsRepository } from "../local-db/settingsRepository.js";
import { TallyHttpClient } from "./tallyHttpClient.js";
import type {
  TallyCompany,
  TallyConnectionState,
  TallyInventoryItem,
  TallyLedger,
  TallyParty,
  TallyRequestResult,
  TallyUnit,
  TallyVoucherSummary,
  TallyVoucherType,
} from "./tallyTypes.js";
import {
  buildCompanyListRequest,
  buildCreateLedgerRequest,
  buildCreateVoucherRequest,
  buildInventoryItemListRequest,
  buildLedgerListRequest,
  buildPartyListRequest,
  buildUnitListRequest,
  buildVoucherListRequest,
  buildVoucherTypeListRequest,
} from "./tallyXmlBuilder.js";

import {
  parseCompanies,
  parseImportResult,
  parseInventoryItems,
  parseLedgers,
  parseParties,
  parseTallyResponseStatus,
  parseUnits,
  parseVoucherSummaries,
  parseVoucherTypes,
} from "./tallyXmlParser.js";



export class TallyService {
  public constructor(private readonly settingsRepository: SettingsRepository) {}

  public async checkConnection(): Promise<TallyConnectionState> {
    const settings = this.settingsRepository.get();
    const requestXml = buildCompanyListRequest();

    try {
      const responseXml = await this.createClient().execute(requestXml);
      const responseStatus = parseTallyResponseStatus(responseXml);

      if (responseStatus.status === 0 || responseStatus.errors.length > 0) {
        return {
          status: "unreachable",
          host: settings.tallyHost,
          port: settings.tallyPort,
          checkedAt: new Date().toISOString(),
          reason: responseStatus.errors.join("; ") || "Tally returned failure status.",
        };
      }

      return {
        status: "reachable",
        host: settings.tallyHost,
        port: settings.tallyPort,
        checkedAt: new Date().toISOString(),
        companies: parseCompanies(responseXml),
      };
    } catch (error) {
      return {
        status: "unreachable",
        host: settings.tallyHost,
        port: settings.tallyPort,
        checkedAt: new Date().toISOString(),
        reason: error instanceof Error ? error.message : "Unknown Tally connection error.",
      };
    }
  }

  public async listCompanies(): Promise<TallyRequestResult<readonly TallyCompany[]>> {
    const requestXml = buildCompanyListRequest();
    return this.executeRequest(requestXml, parseCompanies);
  }

  public async listLedgers(companyName: string): Promise<TallyRequestResult<readonly TallyLedger[]>> {
    const requestXml = buildLedgerListRequest(companyName);
    return this.executeRequest(requestXml, parseLedgers);
  }

  public async listVoucherTypes(companyName: string): Promise<TallyRequestResult<readonly TallyVoucherType[]>> {
    const requestXml = buildVoucherTypeListRequest(companyName);
    return this.executeRequest(requestXml, parseVoucherTypes);
  }

  public async listVoucherSummaries(
    companyName: string,
    fromDate: string,
    toDate: string,
  ): Promise<TallyRequestResult<readonly TallyVoucherSummary[]>> {
    const requestXml = buildVoucherListRequest(companyName, fromDate, toDate);
    return this.executeRequest(requestXml, parseVoucherSummaries);
  }

  public async listParties(companyName: string): Promise<TallyRequestResult<readonly TallyParty[]>> {
    const requestXml = buildPartyListRequest(companyName);
    return this.executeRequest(requestXml, parseParties);
  }

  public async listUnits(companyName: string): Promise<TallyRequestResult<readonly TallyUnit[]>> {
    const requestXml = buildUnitListRequest(companyName);
    return this.executeRequest(requestXml, parseUnits);
  }

  public async listInventoryItems(companyName: string): Promise<TallyRequestResult<readonly TallyInventoryItem[]>> {
    const requestXml = buildInventoryItemListRequest(companyName);
    return this.executeRequest(requestXml, parseInventoryItems);
  }

  public async createVoucher(companyName: string, voucher: { readonly date: string; readonly voucherTypeName: string; readonly voucherNumber?: string; readonly partyName: string; readonly amount: number; readonly narration?: string }) {
    const requestXml = buildCreateVoucherRequest(companyName, voucher);
    return this.executeRequest(requestXml, parseImportResult);
  }

  public async createLedger(companyName: string, ledger: { readonly name: string; readonly parentGroup: string; readonly openingBalance?: number }) {
    const requestXml = buildCreateLedgerRequest(companyName, ledger);
    return this.executeRequest(requestXml, parseImportResult);
  }




  public async importStatementVouchers(
    companyName: string,
    vouchers: readonly import("./bankVoucherXmlBuilder.js").StatementVoucherPayload[]
  ): Promise<import("./tallyImportResponseParser.js").TallyImportResponseSummary> {
    const { buildBatchVoucherXml } = await import("./bankVoucherXmlBuilder.js");
    const { parseTallyImportResponse } = await import("./tallyImportResponseParser.js");

    const xml = buildBatchVoucherXml(companyName, vouchers);
    const client = this.createClient();
    const responseXml = await client.execute(xml);

    return parseTallyImportResponse(responseXml);
  }

  public async exportStatementVouchersXml(
    companyName: string,
    vouchers: readonly import("./bankVoucherXmlBuilder.js").StatementVoucherPayload[]
  ): Promise<string> {
    const { buildBatchVoucherXml } = await import("./bankVoucherXmlBuilder.js");
    return buildBatchVoucherXml(companyName, vouchers);
  }

  private async executeRequest<T>(requestXml: string, parse: (xml: string) => T): Promise<TallyRequestResult<T>> {
    try {
      const responseXml = await this.createClient().execute(requestXml);
      const responseStatus = parseTallyResponseStatus(responseXml);

      if (responseStatus.status === 0 || responseStatus.errors.length > 0) {
        return {
          ok: false,
          requestXml,
          responseXml,
          error: responseStatus.errors.join("; ") || "Tally returned failure status.",
        };
      }

      return {
        ok: true,
        requestXml,
        responseXml,
        data: parse(responseXml),
      };
    } catch (error) {
      return {
        ok: false,
        requestXml,
        responseXml: null,
        error: error instanceof Error ? error.message : "Unknown Tally request failure.",
      };
    }
  }

  private createClient(): TallyHttpClient {
    const settings = this.settingsRepository.get();

    return new TallyHttpClient({
      host: settings.tallyHost,
      port: settings.tallyPort,
      timeoutMs: 6000,
    });
  }
}
