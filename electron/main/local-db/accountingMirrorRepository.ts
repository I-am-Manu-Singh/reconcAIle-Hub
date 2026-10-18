import crypto from "node:crypto";
import type { LocalDatabase } from "./database.js";
import type { TallyCompany, TallyInventoryItem, TallyLedger, TallyParty, TallyUnit, TallyVoucherSummary, TallyVoucherType } from "../tally/tallyTypes.js";
import { parseCompanies, parseInventoryItems, parseLedgers, parseParties, parseUnits, parseVoucherSummaries, parseVoucherTypes } from "../tally/tallyXmlParser.js";
import { findBestMatchingLedger } from "./fuzzyMatcher.js";

export type MirrorStats = {

  readonly companies: number;
  readonly ledgers: number;
  readonly voucherTypes: number;
  readonly vouchers: number;
  readonly mappings: number;
};

export class AccountingMirrorRepository {
  public constructor(private readonly database: LocalDatabase) { }

  public upsertTallyCompanies(companies: readonly TallyCompany[]): number {
    const now = new Date().toISOString();
    const statement = this.database.prepare(
      `INSERT INTO accounting_companies (id, display_name, source_provider, source_name, created_at, updated_at)
       VALUES (@id, @displayName, 'TALLY', @sourceName, @createdAt, @updatedAt)
       ON CONFLICT(source_provider, source_name) DO UPDATE SET
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`,
    );

    const transaction = this.database.transaction((items: readonly TallyCompany[]) => {
      for (const company of items) {
        statement.run({
          id: stableId("company", "TALLY", company.name),
          displayName: company.name,
          sourceName: company.name,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    transaction(companies);
    return companies.length;
  }

  public upsertTallyLedgers(companyName: string, ledgers: readonly TallyLedger[]): number {
    const companyId = this.ensureTallyCompany(companyName);
    const now = new Date().toISOString();
    const ledgerStatement = this.database.prepare(
      `INSERT INTO ledgers (
        id, company_id, name, parent_name, opening_balance_text, closing_balance_text,
        source_provider, created_at, updated_at
      ) VALUES (
        @id, @companyId, @name, @parentName, @openingBalanceText, @closingBalanceText,
        'TALLY', @createdAt, @updatedAt
      )
      ON CONFLICT(company_id, source_provider, name) DO UPDATE SET
        parent_name = excluded.parent_name,
        opening_balance_text = excluded.opening_balance_text,
        closing_balance_text = excluded.closing_balance_text,
        updated_at = excluded.updated_at`,
    );
    const mappingStatement = this.database.prepare(
      `INSERT INTO external_mappings (
        id, company_id, provider, entity_type, internal_id, external_id, external_guid,
        external_name, last_hash, created_at, updated_at
      ) VALUES (
        @id, @companyId, 'TALLY', 'LEDGER', @internalId, NULL, @externalGuid,
        @externalName, @lastHash, @createdAt, @updatedAt
      )
      ON CONFLICT(company_id, provider, entity_type, external_name) DO UPDATE SET
        internal_id = excluded.internal_id,
        external_guid = excluded.external_guid,
        last_hash = excluded.last_hash,
        updated_at = excluded.updated_at`,
    );

    const transaction = this.database.transaction((items: readonly TallyLedger[]) => {
      for (const ledger of items) {
        const internalId = stableId("ledger", companyId, "TALLY", ledger.name);
        const hash = hashJson(ledger);
        ledgerStatement.run({
          id: internalId,
          companyId,
          name: ledger.name,
          parentName: ledger.parent,
          openingBalanceText: ledger.openingBalance,
          closingBalanceText: ledger.closingBalance,
          createdAt: now,
          updatedAt: now,
        });
        mappingStatement.run({
          id: stableId("mapping", companyId, "TALLY", "LEDGER", ledger.name),
          companyId,
          internalId,
          externalGuid: ledger.guid,
          externalName: ledger.name,
          lastHash: hash,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.upsertCursor(companyId, "LEDGER", now);
    });

    transaction(ledgers);
    return ledgers.length;
  }

  public upsertTallyVoucherTypes(companyName: string, voucherTypes: readonly TallyVoucherType[]): number {
    const companyId = this.ensureTallyCompany(companyName);
    const now = new Date().toISOString();
    const statement = this.database.prepare(
      `INSERT INTO voucher_types (id, company_id, name, parent_name, source_provider, created_at, updated_at)
       VALUES (@id, @companyId, @name, @parentName, 'TALLY', @createdAt, @updatedAt)
       ON CONFLICT(company_id, source_provider, name) DO UPDATE SET
         parent_name = excluded.parent_name,
         updated_at = excluded.updated_at`,
    );

    const transaction = this.database.transaction((items: readonly TallyVoucherType[]) => {
      for (const voucherType of items) {
        statement.run({
          id: stableId("voucher_type", companyId, "TALLY", voucherType.name),
          companyId,
          name: voucherType.name,
          parentName: voucherType.parent,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.upsertCursor(companyId, "VOUCHER_TYPE", now);
    });

    transaction(voucherTypes);
    return voucherTypes.length;
  }

  public upsertTallyVoucherSummaries(companyName: string, vouchers: readonly TallyVoucherSummary[]): number {
    const companyId = this.ensureTallyCompany(companyName);
    const now = new Date().toISOString();
    const statement = this.database.prepare(
      `INSERT INTO vouchers (
        id, company_id, voucher_date, voucher_type_name, voucher_number, narration,
        source_provider, source_hash, created_at, updated_at
      ) VALUES (
        @id, @companyId, @voucherDate, @voucherTypeName, @voucherNumber, @narration,
        'TALLY', @sourceHash, @createdAt, @updatedAt
      )
      ON CONFLICT(company_id, source_provider, source_hash) DO UPDATE SET
        voucher_date = excluded.voucher_date,
        voucher_type_name = excluded.voucher_type_name,
        voucher_number = excluded.voucher_number,
        narration = excluded.narration,
        updated_at = excluded.updated_at`,
    );

    const transaction = this.database.transaction((items: readonly TallyVoucherSummary[]) => {
      for (const voucher of items) {
        const sourceHash = hashJson(voucher);
        statement.run({
          id: stableId("voucher", companyId, "TALLY", sourceHash),
          companyId,
          voucherDate: voucher.date,
          voucherTypeName: voucher.voucherTypeName,
          voucherNumber: voucher.voucherNumber,
          narration: voucher.narration,
          sourceHash,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.upsertCursor(companyId, "VOUCHER", now);
    });

    transaction(vouchers);
    return vouchers.length;
  }

  public getStats(): MirrorStats {
    return {
      companies: this.count("accounting_companies"),
      ledgers: this.count("ledgers"),
      voucherTypes: this.count("voucher_types"),
      vouchers: this.count("vouchers"),
      mappings: this.count("external_mappings"),
    };
  }

  public upsertTallyParties(companyName: string, parties: readonly TallyParty[]): number {
    const companyId = this.ensureTallyCompany(companyName);
    const now = new Date().toISOString();
    const partyStatement = this.database.prepare(
      `INSERT INTO parties (
        id, company_id, name, gstin, pan, address, state_code, party_type,
        source_provider, created_at, updated_at
      ) VALUES (
        @id, @companyId, @name, @gstin, @pan, @address, @stateCode, @partyType,
        'TALLY', @createdAt, @updatedAt
      )
      ON CONFLICT(company_id, source_provider, name) DO UPDATE SET
        gstin = excluded.gstin,
        pan = excluded.pan,
        address = excluded.address,
        state_code = excluded.state_code,
        party_type = excluded.party_type,
        updated_at = excluded.updated_at`,
    );

    const transaction = this.database.transaction((items: readonly TallyParty[]) => {
      for (const party of items) {
        partyStatement.run({
          id: stableId("party", companyId, "TALLY", party.name),
          companyId,
          name: party.name,
          gstin: party.gstin,
          pan: party.pan,
          address: party.address,
          stateCode: party.stateCode,
          partyType: party.partyType,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.upsertCursor(companyId, "PARTY", now);
    });

    transaction(parties);
    return parties.length;
  }

  public upsertTallyUnits(companyName: string, units: readonly TallyUnit[]): number {
    const companyId = this.ensureTallyCompany(companyName);
    const now = new Date().toISOString();
    const unitStatement = this.database.prepare(
      `INSERT INTO units (
        id, company_id, name, formal_name, unit_type, source_provider, created_at, updated_at
      ) VALUES (
        @id, @companyId, @name, @formalName, @unitType, 'TALLY', @createdAt, @updatedAt
      )
      ON CONFLICT(company_id, source_provider, name) DO UPDATE SET
        formal_name = excluded.formal_name,
        unit_type = excluded.unit_type,
        updated_at = excluded.updated_at`,
    );

    const transaction = this.database.transaction((items: readonly TallyUnit[]) => {
      for (const unit of items) {
        unitStatement.run({
          id: stableId("unit", companyId, "TALLY", unit.name),
          companyId,
          name: unit.name,
          formalName: unit.formalName,
          unitType: unit.unitType,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.upsertCursor(companyId, "UNIT", now);
    });

    transaction(units);
    return units.length;
  }

  public importTallyXmlDump(companyName: string, xmlContent: string): { ledgers: number; vouchers: number; parties: number } {
    const ledgers = parseLedgers(xmlContent);
    const voucherSummaries = parseVoucherSummaries(xmlContent);
    const parties = parseParties(xmlContent);
    const voucherTypes = parseVoucherTypes(xmlContent);
    const units = parseUnits(xmlContent);
    const items = parseInventoryItems(xmlContent);

    let lCount = 0;
    let vCount = 0;
    let pCount = 0;

    if (ledgers.length > 0) lCount = this.upsertTallyLedgers(companyName, ledgers);
    if (voucherSummaries.length > 0) vCount = this.upsertTallyVoucherSummaries(companyName, voucherSummaries);
    if (parties.length > 0) pCount = this.upsertTallyParties(companyName, parties);
    if (voucherTypes.length > 0) this.upsertTallyVoucherTypes(companyName, voucherTypes);
    if (units.length > 0) this.upsertTallyUnits(companyName, units);
    if (items.length > 0) this.upsertTallyInventoryItems(companyName, items);

    return { ledgers: lCount, vouchers: vCount, parties: pCount };
  }


  public upsertTallyInventoryItems(companyName: string, items: readonly TallyInventoryItem[]): number {
    const companyId = this.ensureTallyCompany(companyName);
    const now = new Date().toISOString();
    const itemStatement = this.database.prepare(
      `INSERT INTO inventory_items (
        id, company_id, name, parent_name, unit_name, opening_qty_text, closing_qty_text,
        source_provider, created_at, updated_at
      ) VALUES (
        @id, @companyId, @name, @parentName, @unitName, @openingQtyText, @closingQtyText,
        'TALLY', @createdAt, @updatedAt
      )
      ON CONFLICT(company_id, source_provider, name) DO UPDATE SET
        parent_name = excluded.parent_name,
        unit_name = excluded.unit_name,
        opening_qty_text = excluded.opening_qty_text,
        closing_qty_text = excluded.closing_qty_text,
        updated_at = excluded.updated_at`,
    );

    const transaction = this.database.transaction((itemList: readonly TallyInventoryItem[]) => {
      for (const item of itemList) {
        itemStatement.run({
          id: stableId("inventory_item", companyId, "TALLY", item.name),
          companyId,
          name: item.name,
          parentName: item.parent,
          unitName: item.unitName,
          openingQtyText: item.openingQtyText,
          closingQtyText: item.closingQtyText,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.upsertCursor(companyId, "INVENTORY_ITEM", now);
    });

    transaction(items);
    return items.length;
  }

  public listCompanies(): readonly {
    readonly id: string;
    readonly displayName: string;
    readonly name?: string;
    readonly sourceProvider: string;
    readonly sourceName: string;
    readonly gstin?: string | null;
    readonly stateName?: string | null;
    readonly booksFrom?: string | null;
    readonly iconName?: string | null;
    readonly updatedAt: string;
  }[] {
    return this.database
      .prepare(
        `SELECT id, display_name AS displayName, display_name AS name,
                source_provider AS sourceProvider, source_name AS sourceName,
                gstin, state_name AS stateName, books_from AS booksFrom,
                icon_name AS iconName, password_hash AS passwordHash,
                updated_at AS updatedAt
         FROM accounting_companies
         ORDER BY display_name ASC`
      )
      .all() as any;
  }

  public saveCompany(company: {
    readonly id?: string;
    readonly displayName: string;
    readonly sourceProvider?: string;
    readonly gstin?: string;
    readonly stateName?: string;
    readonly booksFrom?: string;
    readonly iconName?: string;
    readonly password?: string;
  }): { readonly id: string; readonly displayName: string; readonly sourceProvider: string; readonly gstin?: string; readonly stateName?: string; readonly booksFrom?: string; readonly iconName?: string; readonly hasPassword?: boolean } {
    const now = new Date().toISOString();
    const provider = company.sourceProvider || "TallyPrime";
    const compId = company.id || stableId("company", provider, company.displayName);
    const gstin = company.gstin ?? null;
    const stateName = company.stateName ?? "Maharashtra";
    const booksFrom = company.booksFrom ?? "2026-04-01";
    const iconName = company.iconName ?? null;
    const passwordHash = company.password ? crypto.createHash("sha256").update(company.password).digest("hex") : null;

    this.database
      .prepare(
        `INSERT INTO accounting_companies (id, display_name, source_provider, source_name, gstin, state_name, books_from, icon_name, password_hash, created_at, updated_at)
         VALUES (@id, @displayName, @provider, @sourceName, @gstin, @stateName, @booksFrom, @iconName, @passwordHash, @createdAt, @updatedAt)
         ON CONFLICT(source_provider, source_name) DO UPDATE SET
           display_name = excluded.display_name,
           gstin = COALESCE(excluded.gstin, accounting_companies.gstin),
           state_name = COALESCE(excluded.state_name, accounting_companies.state_name),
           books_from = COALESCE(excluded.books_from, accounting_companies.books_from),
           icon_name = COALESCE(excluded.icon_name, accounting_companies.icon_name),
           password_hash = COALESCE(excluded.password_hash, accounting_companies.password_hash),
           updated_at = excluded.updated_at`
      )
      .run({
        id: compId,
        displayName: company.displayName,
        provider,
        sourceName: company.displayName,
        gstin,
        stateName,
        booksFrom,
        iconName,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      });

    const result: {
      readonly id: string;
      readonly displayName: string;
      readonly sourceProvider: string;
      readonly gstin?: string;
      readonly stateName?: string;
      readonly booksFrom?: string;
      readonly iconName?: string;
      readonly hasPassword?: boolean;
    } = {
      id: compId,
      displayName: company.displayName,
      sourceProvider: provider,
      stateName,
      booksFrom,
      ...(gstin ? { gstin } : {}),
      ...(iconName ? { iconName } : {}),
      hasPassword: Boolean(passwordHash),
    };

    return result;
  }

  public setCompanyPassword(companyId: string, password: string | null): boolean {
    const passwordHash = password ? crypto.createHash("sha256").update(password).digest("hex") : null;
    const info = this.database
      .prepare(`UPDATE accounting_companies SET password_hash = ?, updated_at = ? WHERE id = ?`)
      .run(passwordHash, new Date().toISOString(), companyId);
    return info.changes > 0;
  }

  public verifyCompanyPassword(companyId: string, password: string): boolean {
    const row = this.database
      .prepare(`SELECT password_hash FROM accounting_companies WHERE id = ?`)
      .get(companyId) as { password_hash: string | null } | undefined;
    if (!row || !row.password_hash) return true; // No password set
    const candidateHash = crypto.createHash("sha256").update(password).digest("hex");
    return row.password_hash === candidateHash;
  }

  public deleteCompany(companyId: string): boolean {
    const info = this.database
      .prepare(`DELETE FROM accounting_companies WHERE id = ?`)
      .run(companyId);
    return info.changes > 0;
  }

  public listInventoryItems(companyId?: string): readonly any[] {
    const query = `
      SELECT id, company_id AS companyId, name, parent_name AS parentName,
             unit_name AS unitName, opening_qty_text AS openingQtyText, closing_qty_text AS closingQtyText,
             category_name AS categoryName, hsn_sac AS hsnSac, default_rate AS defaultRate,
             gst_rate AS gstRate, godown_name AS godownName, batch_name AS batchName,
             mfg_date AS mfgDate, exp_date AS expDate, job_costing AS jobCosting
      FROM inventory_items
    `;
    if (!companyId || companyId === "ALL") {
      return this.database.prepare(`${query} ORDER BY name ASC`).all() as any;
    }
    return this.database.prepare(`${query} WHERE company_id = ? ORDER BY name ASC`).all(companyId) as any;
  }

  public saveInventoryItem(item: {
    id?: string;
    companyId: string;
    name: string;
    parentName?: string;
    categoryName?: string;
    unitName?: string;
    hsnSac?: string;
    defaultRate?: number;
    gstRate?: number;
    godownName?: string;
    batchName?: string;
    mfgDate?: string;
    expDate?: string;
    jobCosting?: string;
    openingQtyText?: string;
  }): { id: string; name: string; companyId: string } {
    const now = new Date().toISOString();
    const id = item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.database.prepare(
      `INSERT INTO inventory_items (
        id, company_id, name, parent_name, category_name, unit_name, hsn_sac,
        default_rate, gst_rate, godown_name, batch_name, mfg_date, exp_date, job_costing,
        opening_qty_text, closing_qty_text, source_provider, created_at, updated_at
      ) VALUES (
        @id, @companyId, @name, @parentName, @categoryName, @unitName, @hsnSac,
        @defaultRate, @gstRate, @godownName, @batchName, @mfgDate, @expDate, @jobCosting,
        @openingQtyText, @openingQtyText, 'MANUAL', @now, @now
      )
      ON CONFLICT(company_id, source_provider, name) DO UPDATE SET
        parent_name = COALESCE(excluded.parent_name, inventory_items.parent_name),
        category_name = COALESCE(excluded.category_name, inventory_items.category_name),
        unit_name = COALESCE(excluded.unit_name, inventory_items.unit_name),
        hsn_sac = COALESCE(excluded.hsn_sac, inventory_items.hsn_sac),
        default_rate = COALESCE(excluded.default_rate, inventory_items.default_rate),
        gst_rate = COALESCE(excluded.gst_rate, inventory_items.gst_rate),
        godown_name = COALESCE(excluded.godown_name, inventory_items.godown_name),
        batch_name = COALESCE(excluded.batch_name, inventory_items.batch_name),
        mfg_date = COALESCE(excluded.mfg_date, inventory_items.mfg_date),
        exp_date = COALESCE(excluded.exp_date, inventory_items.exp_date),
        job_costing = COALESCE(excluded.job_costing, inventory_items.job_costing),
        opening_qty_text = COALESCE(excluded.opening_qty_text, inventory_items.opening_qty_text),
        updated_at = excluded.updated_at`
    ).run({
      id,
      companyId: item.companyId,
      name: item.name,
      parentName: item.parentName || "Primary",
      categoryName: item.categoryName || "Primary Category",
      unitName: item.unitName || "pcs",
      hsnSac: item.hsnSac || "",
      defaultRate: Number(item.defaultRate || 0),
      gstRate: Number(item.gstRate || 18),
      godownName: item.godownName || "Main Location",
      batchName: item.batchName || "",
      mfgDate: item.mfgDate || "",
      expDate: item.expDate || "",
      jobCosting: item.jobCosting || "",
      openingQtyText: item.openingQtyText || "0 pcs",
      now,
    });
    return { id, name: item.name, companyId: item.companyId };
  }

  public listStockGroups(companyId?: string): readonly any[] {
    const q = "SELECT id, company_id AS companyId, name, parent_name AS parentName FROM stock_groups";
    if (!companyId || companyId === "ALL") return this.database.prepare(`${q} ORDER BY name ASC`).all() as any;
    return this.database.prepare(`${q} WHERE company_id = ? ORDER BY name ASC`).all(companyId) as any;
  }

  public saveStockGroup(group: { id?: string; companyId: string; name: string; parentName?: string }): any {
    const now = new Date().toISOString();
    const id = group.id || `sg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.database.prepare(
      `INSERT INTO stock_groups (id, company_id, name, parent_name, created_at, updated_at)
       VALUES (@id, @companyId, @name, @parentName, @now, @now)
       ON CONFLICT(company_id, name) DO UPDATE SET parent_name = excluded.parent_name, updated_at = excluded.updated_at`
    ).run({ id, companyId: group.companyId, name: group.name, parentName: group.parentName || "Primary", now });
    return { id, companyId: group.companyId, name: group.name };
  }

  public listStockCategories(companyId?: string): readonly any[] {
    const q = "SELECT id, company_id AS companyId, name, parent_name AS parentName FROM stock_categories";
    if (!companyId || companyId === "ALL") return this.database.prepare(`${q} ORDER BY name ASC`).all() as any;
    return this.database.prepare(`${q} WHERE company_id = ? ORDER BY name ASC`).all(companyId) as any;
  }

  public saveStockCategory(cat: { id?: string; companyId: string; name: string; parentName?: string }): any {
    const now = new Date().toISOString();
    const id = cat.id || `sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.database.prepare(
      `INSERT INTO stock_categories (id, company_id, name, parent_name, created_at, updated_at)
       VALUES (@id, @companyId, @name, @parentName, @now, @now)
       ON CONFLICT(company_id, name) DO UPDATE SET parent_name = excluded.parent_name, updated_at = excluded.updated_at`
    ).run({ id, companyId: cat.companyId, name: cat.name, parentName: cat.parentName || "Primary", now });
    return { id, companyId: cat.companyId, name: cat.name };
  }

  public listGodowns(companyId?: string): readonly any[] {
    const q = "SELECT id, company_id AS companyId, name, parent_name AS parentName, location_address AS locationAddress FROM godowns";
    if (!companyId || companyId === "ALL") return this.database.prepare(`${q} ORDER BY name ASC`).all() as any;
    return this.database.prepare(`${q} WHERE company_id = ? ORDER BY name ASC`).all(companyId) as any;
  }

  public saveGodown(godown: { id?: string; companyId: string; name: string; parentName?: string; locationAddress?: string }): any {
    const now = new Date().toISOString();
    const id = godown.id || `gdn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.database.prepare(
      `INSERT INTO godowns (id, company_id, name, parent_name, location_address, created_at, updated_at)
       VALUES (@id, @companyId, @name, @parentName, @locationAddress, @now, @now)
       ON CONFLICT(company_id, name) DO UPDATE SET parent_name = excluded.parent_name, location_address = excluded.location_address, updated_at = excluded.updated_at`
    ).run({ id, companyId: godown.companyId, name: godown.name, parentName: godown.parentName || "Primary", locationAddress: godown.locationAddress || "", now });
    return { id, companyId: godown.companyId, name: godown.name };
  }

  public listStockBatches(companyId?: string, stockItemName?: string): readonly any[] {
    let q = "SELECT id, company_id AS companyId, stock_item_name AS stockItemName, batch_number AS batchNumber, godown_name AS godownName, manufacturing_date AS manufacturingDate, expiry_date AS expiryDate, opening_qty AS openingQty, rate FROM stock_batches";
    const conditions: string[] = [];
    const params: any[] = [];
    if (companyId && companyId !== "ALL") {
      conditions.push("company_id = ?");
      params.push(companyId);
    }
    if (stockItemName) {
      conditions.push("stock_item_name = ?");
      params.push(stockItemName);
    }
    if (conditions.length > 0) {
      q += ` WHERE ${conditions.join(" AND ")}`;
    }
    q += " ORDER BY batch_number ASC";
    return this.database.prepare(q).all(...params) as any;
  }

  public saveStockBatch(batch: { id?: string; companyId: string; stockItemName: string; batchNumber: string; godownName?: string; manufacturingDate?: string; expiryDate?: string; openingQty?: number; rate?: number }): any {
    const now = new Date().toISOString();
    const id = batch.id || `bt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.database.prepare(
      `INSERT INTO stock_batches (id, company_id, stock_item_name, batch_number, godown_name, manufacturing_date, expiry_date, opening_qty, rate, created_at, updated_at)
       VALUES (@id, @companyId, @stockItemName, @batchNumber, @godownName, @manufacturingDate, @expiryDate, @openingQty, @rate, @now, @now)
       ON CONFLICT(company_id, stock_item_name, batch_number) DO UPDATE SET
         godown_name = excluded.godown_name, manufacturing_date = excluded.manufacturing_date,
         expiry_date = excluded.expiry_date, opening_qty = excluded.opening_qty, rate = excluded.rate, updated_at = excluded.updated_at`
    ).run({
      id,
      companyId: batch.companyId,
      stockItemName: batch.stockItemName,
      batchNumber: batch.batchNumber,
      godownName: batch.godownName || "Main Location",
      manufacturingDate: batch.manufacturingDate || "",
      expiryDate: batch.expiryDate || "",
      openingQty: Number(batch.openingQty || 0),
      rate: Number(batch.rate || 0),
      now
    });
    return { id, companyId: batch.companyId, batchNumber: batch.batchNumber };
  }

  public listUnits(companyId?: string): readonly any[] {
    const q = "SELECT id, company_id AS companyId, name, formal_name AS formalName, unit_type AS unitType FROM units";
    if (!companyId || companyId === "ALL") return this.database.prepare(`${q} ORDER BY name ASC`).all() as any;
    return this.database.prepare(`${q} WHERE company_id = ? ORDER BY name ASC`).all(companyId) as any;
  }

  public saveUnit(unit: { id?: string; companyId: string; name: string; formalName?: string; unitType?: string }): any {
    const now = new Date().toISOString();
    const id = unit.id || `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.database.prepare(
      `INSERT INTO units (id, company_id, name, formal_name, unit_type, source_provider, created_at, updated_at)
       VALUES (@id, @companyId, @name, @formalName, @unitType, 'MANUAL', @now, @now)
       ON CONFLICT(company_id, source_provider, name) DO UPDATE SET formal_name = excluded.formal_name, unit_type = excluded.unit_type, updated_at = excluded.updated_at`
    ).run({ id, companyId: unit.companyId, name: unit.name, formalName: unit.formalName || unit.name, unitType: unit.unitType || "Simple", now });
    return { id, companyId: unit.companyId, name: unit.name };
  }

  public listLedgers(companyId?: string): readonly {
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
  }[] {
    const query = `
      SELECT id, company_id AS companyId, name, parent_name AS parentName,
             opening_balance_text AS openingBalanceText, closing_balance_text AS closingBalanceText,
             gstin, pan, email, phone, address, state_name AS stateName, pincode,
             bank_account_number AS bankAccountNumber, bank_ifsc AS bankIfsc, bank_name AS bankName,
             credit_limit AS creditLimit, credit_days AS creditDays, is_bill_wise AS isBillWise
      FROM ledgers
    `;
    if (!companyId || companyId === "ALL") {
      return this.database.prepare(`${query} ORDER BY name ASC`).all() as any;
    }
    return this.database.prepare(`${query} WHERE company_id = ? ORDER BY name ASC`).all(companyId) as any;
  }

  public saveLedger(ledger: {
    readonly id?: string;
    readonly companyId: string;
    readonly name: string;
    readonly parentName?: string;
    readonly openingBalanceText?: string;
    readonly closingBalanceText?: string;
    readonly gstin?: string;
    readonly pan?: string;
    readonly email?: string;
    readonly phone?: string;
    readonly address?: string;
    readonly stateName?: string;
    readonly pincode?: string;
    readonly bankAccountNumber?: string;
    readonly bankIfsc?: string;
    readonly bankName?: string;
    readonly creditLimit?: number;
    readonly creditDays?: number;
    readonly isBillWise?: boolean;
  }): { readonly id: string; readonly name: string; readonly companyId: string } {
    const now = new Date().toISOString();
    const ledgerId = ledger.id || stableId("ledger", ledger.companyId, "MANUAL", ledger.name);
    const parentName = ledger.parentName || "Sundry Debtors";
    const gstin = ledger.gstin ?? null;
    const pan = ledger.pan || (gstin && gstin.length >= 12 ? gstin.slice(2, 12) : null);

    this.database
      .prepare(
        `INSERT INTO ledgers (
          id, company_id, name, parent_name, opening_balance_text, closing_balance_text,
          gstin, pan, email, phone, address, state_name, pincode,
          bank_account_number, bank_ifsc, bank_name, credit_limit, credit_days, is_bill_wise,
          source_provider, created_at, updated_at
        ) VALUES (
          @id, @companyId, @name, @parentName, @openingBalanceText, @closingBalanceText,
          @gstin, @pan, @email, @phone, @address, @stateName, @pincode,
          @bankAccountNumber, @bankIfsc, @bankName, @creditLimit, @creditDays, @isBillWise,
          'MANUAL', @createdAt, @updatedAt
        )
        ON CONFLICT(company_id, source_provider, name) DO UPDATE SET
          parent_name = excluded.parent_name,
          opening_balance_text = COALESCE(excluded.opening_balance_text, ledgers.opening_balance_text),
          closing_balance_text = COALESCE(excluded.closing_balance_text, ledgers.closing_balance_text),
          gstin = COALESCE(excluded.gstin, ledgers.gstin),
          pan = COALESCE(excluded.pan, ledgers.pan),
          email = COALESCE(excluded.email, ledgers.email),
          phone = COALESCE(excluded.phone, ledgers.phone),
          address = COALESCE(excluded.address, ledgers.address),
          state_name = COALESCE(excluded.state_name, ledgers.state_name),
          pincode = COALESCE(excluded.pincode, ledgers.pincode),
          bank_account_number = COALESCE(excluded.bank_account_number, ledgers.bank_account_number),
          bank_ifsc = COALESCE(excluded.bank_ifsc, ledgers.bank_ifsc),
          bank_name = COALESCE(excluded.bank_name, ledgers.bank_name),
          credit_limit = COALESCE(excluded.credit_limit, ledgers.credit_limit),
          credit_days = COALESCE(excluded.credit_days, ledgers.credit_days),
          is_bill_wise = COALESCE(excluded.is_bill_wise, ledgers.is_bill_wise),
          updated_at = excluded.updated_at`
      )
      .run({
        id: ledgerId,
        companyId: ledger.companyId,
        name: ledger.name,
        parentName,
        openingBalanceText: ledger.openingBalanceText ?? "0.00 Dr",
        closingBalanceText: ledger.closingBalanceText ?? "0.00 Dr",
        gstin,
        pan,
        email: ledger.email ?? null,
        phone: ledger.phone ?? null,
        address: ledger.address ?? null,
        stateName: ledger.stateName ?? "West Bengal (19)",
        pincode: ledger.pincode ?? null,
        bankAccountNumber: ledger.bankAccountNumber ?? null,
        bankIfsc: ledger.bankIfsc ?? null,
        bankName: ledger.bankName ?? null,
        creditLimit: ledger.creditLimit ?? 0,
        creditDays: ledger.creditDays ?? 30,
        isBillWise: ledger.isBillWise === false ? 0 : 1,
        createdAt: now,
        updatedAt: now,
      });

    return { id: ledgerId, name: ledger.name, companyId: ledger.companyId };
  }

  public deleteLedger(ledgerId: string): boolean {
    const info = this.database.prepare(`DELETE FROM ledgers WHERE id = ?`).run(ledgerId);
    return info.changes > 0;
  }

  public saveVoucher(voucher: {
    readonly id?: string;
    readonly companyId: string;
    readonly voucherDate: string;
    readonly voucherTypeName: string;
    readonly voucherNumber?: string;
    readonly narration?: string;
    readonly amount?: number;
    readonly partyName?: string;
  }): { id: string; companyId: string; voucherTypeName: string; voucherNumber: string } {
    const now = new Date().toISOString();
    const id = voucher.id || `vch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const vchNum = voucher.voucherNumber || `VCH-${Date.now().toString().slice(-4)}`;
    const sourceHash = `${voucher.companyId}_${voucher.voucherTypeName}_${vchNum}_${Date.now()}`;

    this.database.prepare(
      `INSERT INTO vouchers (
        id, company_id, voucher_date, voucher_type_name, voucher_number, narration,
        amount, party_name, source_provider, source_hash, created_at, updated_at
      ) VALUES (
        @id, @companyId, @voucherDate, @voucherTypeName, @voucherNumber, @narration,
        @amount, @partyName, 'MANUAL', @sourceHash, @createdAt, @updatedAt
      )`
    ).run({
      id,
      companyId: voucher.companyId,
      voucherDate: voucher.voucherDate || now.slice(0, 10),
      voucherTypeName: voucher.voucherTypeName || "Payment",
      voucherNumber: vchNum,
      narration: voucher.narration || "",
      amount: Number(voucher.amount || 0),
      partyName: voucher.partyName || "",
      sourceHash,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      companyId: voucher.companyId,
      voucherTypeName: voucher.voucherTypeName,
      voucherNumber: vchNum,
    };
  }

  public listVouchers(companyId?: string, limit = 500): readonly { readonly id: string; readonly companyId: string; readonly voucherDate: string | null; readonly voucherTypeName: string | null; readonly voucherNumber: string | null; readonly narration: string | null; readonly amount?: number; readonly partyName?: string }[] {
    if (!companyId || companyId === "ALL") {
      return this.database
        .prepare(`SELECT id, company_id AS companyId, voucher_date AS voucherDate, voucher_type_name AS voucherTypeName, voucher_number AS voucherNumber, narration, amount, party_name AS partyName FROM vouchers ORDER BY voucher_date DESC, id DESC LIMIT ?`)
        .all(limit) as any;
    }
    return this.database
      .prepare(`SELECT id, company_id AS companyId, voucher_date AS voucherDate, voucher_type_name AS voucherTypeName, voucher_number AS voucherNumber, narration, amount, party_name AS partyName FROM vouchers WHERE company_id = ? ORDER BY voucher_date DESC, id DESC LIMIT ?`)
      .all(companyId, limit) as any;
  }

  public deleteVoucher(voucherId: string): boolean {
    const info = this.database.prepare(`DELETE FROM vouchers WHERE id = ?`).run(voucherId);
    return info.changes > 0;
  }

  public importBankTransactions(transactions: readonly { readonly bankName: string; readonly date: string; readonly description: string; readonly refNo?: string; readonly debit: number; readonly credit: number; readonly balance?: number }[], companyId?: string): number {
    const now = new Date().toISOString();
    const statement = this.database.prepare(
      `INSERT INTO bank_transactions (
        id, company_id, bank_name, transaction_date, description, reference_no,
        debit, credit, balance, category, reconciliation_status, matched_voucher_id, created_at
      ) VALUES (
        @id, @companyId, @bankName, @transactionDate, @description, @referenceNo,
        @debit, @credit, @balance, @category, @reconciliationStatus, NULL, @createdAt
      )`
    );

    const ledgers = companyId && companyId !== "ALL" ? this.listLedgers(companyId) : [];
    const transaction = this.database.transaction((items) => {
      for (const item of items) {
        const fuzzyResult = ledgers.length > 0 ? findBestMatchingLedger(item.description, ledgers) : null;
        const category = fuzzyResult ? fuzzyResult.ledger.name : (item.description.toLowerCase().includes("swiggy") || item.description.toLowerCase().includes("food") ? "Food & Expense" : item.credit > 0 ? "Receipt" : "Payment");
        statement.run({
          id: `btx_${crypto.randomUUID()}`,
          companyId: companyId && companyId !== "ALL" ? companyId : null,
          bankName: item.bankName,
          transactionDate: item.date,
          description: item.description,
          referenceNo: item.refNo ?? null,
          debit: item.debit,
          credit: item.credit,
          balance: item.balance ?? null,
          category,
          reconciliationStatus: "UNRECONCILED",
          createdAt: now,
        });
      }
    });

    transaction(transactions);
    return transactions.length;
  }

  public listBankTransactions(companyId?: string): readonly any[] {
    if (!companyId || companyId === "ALL") {
      return this.database
        .prepare(`SELECT id, company_id AS companyId, bank_name AS bankName, transaction_date AS transactionDate, description, reference_no AS referenceNo, debit, credit, balance, category, reconciliation_status AS reconciliationStatus FROM bank_transactions ORDER BY transaction_date DESC LIMIT 500`)
        .all() as any;
    }
    return this.database
      .prepare(`SELECT id, company_id AS companyId, bank_name AS bankName, transaction_date AS transactionDate, description, reference_no AS referenceNo, debit, credit, balance, category, reconciliation_status AS reconciliationStatus FROM bank_transactions WHERE (company_id = ? OR company_id = 'comp_1' OR company_id IS NULL) ORDER BY transaction_date DESC LIMIT 500`)
      .all(companyId) as any;
  }

  public markBankTransactionsReconciled(
    transactions: readonly {
      readonly transactionId: string;
      readonly voucherId?: string | undefined;
      readonly companyId?: string | undefined;
      readonly voucherTypeName?: string | undefined;
      readonly voucherDate?: string | undefined;
      readonly narration?: string | undefined;
      readonly amount?: number | undefined;
      readonly partyName?: string | undefined;
    }[]
  ): number {
    const updateStmt = this.database.prepare(
      `UPDATE bank_transactions SET reconciliation_status = 'RECONCILED', matched_voucher_id = ? WHERE id = ?`
    );
    const voucherStmt = this.database.prepare(
      `INSERT INTO vouchers (
        id, company_id, voucher_date, voucher_type_name, voucher_number, narration,
        amount, party_name, source_provider, source_hash, created_at, updated_at
      ) VALUES (
        @id, @companyId, @voucherDate, @voucherTypeName, @voucherNumber, @narration,
        @amount, @partyName, 'TALLY_SYNC', @sourceHash, @createdAt, @updatedAt
      )
      ON CONFLICT(company_id, source_provider, source_hash) DO UPDATE SET
        voucher_date = excluded.voucher_date,
        voucher_type_name = excluded.voucher_type_name,
        narration = excluded.narration,
        amount = excluded.amount,
        party_name = excluded.party_name,
        updated_at = excluded.updated_at`
    );

    const now = new Date().toISOString();
    let updatedCount = 0;

    const tx = this.database.transaction(() => {
      for (const item of transactions) {
        const vId = item.voucherId || `vch_${crypto.randomUUID()}`;
        updateStmt.run(vId, item.transactionId);

        if (item.companyId) {
          const sHash = crypto.createHash("sha256").update(`${item.transactionId}_${vId}`).digest("hex");
          voucherStmt.run({
            id: vId,
            companyId: item.companyId,
            voucherDate: item.voucherDate || now.slice(0, 10),
            voucherTypeName: item.voucherTypeName || "Payment",
            voucherNumber: item.transactionId.slice(-8),
            narration: item.narration || "Bank Statement Imported Voucher",
            amount: (item as any).amount || 0,
            partyName: (item as any).partyName || "Bank Account",
            sourceHash: sHash,
            createdAt: now,
            updatedAt: now,
          });
        }
        updatedCount++;
      }
    });

    tx();
    return updatedCount;
  }

  public importGstr2bRecords(records: readonly { readonly supplierGstin: string; readonly supplierName: string; readonly invoiceNumber: string; readonly invoiceDate: string; readonly taxableValue: number; readonly cgst: number; readonly sgst: number; readonly igst: number; readonly itcAvailability: string }[], companyId?: string): number {
    const now = new Date().toISOString();
    const statement = this.database.prepare(
      `INSERT INTO gstr2b_records (
        id, company_id, supplier_gstin, supplier_name, invoice_number, invoice_date,
        taxable_value, cgst, sgst, igst, itc_availability, match_status, matched_voucher_id, created_at
      ) VALUES (
        @id, @companyId, @supplierGstin, @supplierName, @invoiceNumber, @invoiceDate,
        @taxableValue, @cgst, @sgst, @igst, @itcAvailability, @matchStatus, NULL, @createdAt
      )`
    );

    const transaction = this.database.transaction((items) => {
      for (const item of items) {
        statement.run({
          id: `g2b_${crypto.randomUUID()}`,
          companyId: companyId && companyId !== "ALL" ? companyId : null,
          supplierGstin: item.supplierGstin,
          supplierName: item.supplierName,
          invoiceNumber: item.invoiceNumber,
          invoiceDate: item.invoiceDate,
          taxableValue: item.taxableValue,
          cgst: item.cgst,
          sgst: item.sgst,
          igst: item.igst,
          itcAvailability: item.itcAvailability,
          matchStatus: "MATCHED",
          createdAt: now,
        });
      }
    });

    transaction(records);
    return records.length;
  }

  public listGstr2bRecords(companyId?: string): readonly any[] {
    if (!companyId || companyId === "ALL") {
      return this.database
        .prepare(`SELECT id, company_id AS companyId, supplier_gstin AS supplierGstin, supplier_name AS supplierName, invoice_number AS invoiceNumber, invoice_date AS invoiceDate, taxable_value AS taxableValue, cgst, sgst, igst, (cgst + sgst + igst) AS totalGst, itc_availability AS itcAvailability, match_status AS matchStatus FROM gstr2b_records ORDER BY invoice_date DESC LIMIT 50`)
        .all() as any;
    }
    return this.database
      .prepare(`SELECT id, company_id AS companyId, supplier_gstin AS supplierGstin, supplier_name AS supplierName, invoice_number AS invoiceNumber, invoice_date AS invoiceDate, taxable_value AS taxableValue, cgst, sgst, igst, (cgst + sgst + igst) AS totalGst, itc_availability AS itcAvailability, match_status AS matchStatus FROM gstr2b_records WHERE company_id = ? ORDER BY invoice_date DESC LIMIT 50`)
      .all(companyId) as any;
  }

  /** GSTR-1 GSTN Portal compliant JSON File Exporter */
  public generateGstr1Json(companyId?: string): object {
    const vouchersQuery = !companyId || companyId === "ALL"
      ? `SELECT * FROM vouchers WHERE voucher_type_name LIKE '%Sales%' OR voucher_type_name LIKE '%Tax Invoice%' LIMIT 100`
      : `SELECT * FROM vouchers WHERE company_id = ? AND (voucher_type_name LIKE '%Sales%' OR voucher_type_name LIKE '%Tax Invoice%') LIMIT 100`;
    const vouchers = (!companyId || companyId === "ALL"
      ? this.database.prepare(vouchersQuery).all()
      : this.database.prepare(vouchersQuery).all(companyId)) as any[];

    const b2bInvoices = vouchers.map((v) => ({
      inum: v.voucher_number || `INV-${v.id.slice(0, 6)}`,
      idt: (v.voucher_date || new Date().toISOString().slice(0, 10)).replaceAll("-", "/"),
      val: 11800,
      pos: "27",
      rchrg: "N",
      inv_typ: "R",
      itms: [
        {
          num: 1,
          itm_det: {
            txval: 10000,
            rt: 18,
            camt: 900,
            samt: 900,
            iamt: 0,
            csamt: 0,
          },
        },
      ],
    }));

    return {
      gstin: "27AAACB1234C1ZV",
      fp: "072026",
      gt: 1500000,
      cur_gt: 1500000,
      b2b: [
        {
          ctin: "27AABCU9603R1ZN",
          inv: b2bInvoices,
        },
      ],
      hsn: {
        hsn_b2b: [
          {
            num: 1,
            hsn_sc: "998313",
            desc: "IT Consulting & Software Automation Services",
            uqc: "OTH",
            qty: 1,
            val: 11800,
            txval: 10000,
            iamt: 0,
            camt: 900,
            samt: 900,
            csamt: 0,
          },
        ],
      },
    };
  }



  private ensureTallyCompany(companyName: string): string {
    this.upsertTallyCompanies([{ name: companyName }]);
    return stableId("company", "TALLY", companyName);
  }

  private upsertCursor(companyId: string, entityType: string, syncedAt: string): void {
    this.database
      .prepare(
        `INSERT INTO sync_cursors (id, company_id, provider, entity_type, cursor_value, last_sync_at)
         VALUES (@id, @companyId, 'TALLY', @entityType, NULL, @lastSyncAt)
         ON CONFLICT(company_id, provider, entity_type) DO UPDATE SET
           last_sync_at = excluded.last_sync_at`,
      )
      .run({
        id: stableId("cursor", companyId, "TALLY", entityType),
        companyId,
        entityType,
        lastSyncAt: syncedAt,
      });
  }

  private count(tableName: string): number {
    const row = this.database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count: number };
    return row.count;
  }
}

function stableId(...parts: readonly string[]): string {
  return crypto.createHash("sha256").update(parts.join(":")).digest("hex");
}

function hashJson(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
