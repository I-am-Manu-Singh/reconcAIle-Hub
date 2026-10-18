import { XMLParser } from "fast-xml-parser";
import type {
  TallyCompany,
  TallyImportResult,
  TallyInventoryItem,
  TallyLedger,
  TallyParty,
  TallyResponseStatus,
  TallyUnit,
  TallyVoucherSummary,
  TallyVoucherType,
} from "./tallyTypes.js";

// Audit #76: processEntities + htmlEntities prevents crashes on malformed XML
// containing unescaped & or < characters from Tally responses.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
});

/** Audit #76: Safe parse wrapper — never throws on malformed Tally XML */
function safeParse(xml: string): unknown {
  try {
    return parser.parse(xml) as unknown;
  } catch (err) {
    const sanitized = xml
      .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/g, "&amp;")
      .replace(/<([^a-zA-Z/!?])/g, "&lt;$1");
    try {
      return parser.parse(sanitized) as unknown;
    } catch {
      console.error("[TallyXmlParser] Failed to parse XML even after sanitization:", String(err));
      return {};
    }
  }
}

export function parseCompanies(xml: string): readonly TallyCompany[] {
  const parsed = safeParse(xml);
  const companyNodes = findNodesByKey(parsed, "COMPANY");

  return companyNodes
    .map((node) => readName(node))
    .filter((name): name is string => name !== null)
    .map((name) => ({ name }));
}

export function parseLedgers(xml: string): readonly TallyLedger[] {
  const ledgerNodes = findNodesByKey(safeParse(xml), "LEDGER");

  return ledgerNodes.map((node) => ({
    name: readName(node) ?? "",
    parent: readTextProperty(node, "PARENT"),
    guid: readTextProperty(node, "GUID"),
    openingBalance: readTextProperty(node, "OPENINGBALANCE"),
    closingBalance: readTextProperty(node, "CLOSINGBALANCE"),
  })).filter((ledger) => ledger.name.length > 0);
}

export function parseVoucherTypes(xml: string): readonly TallyVoucherType[] {
  const voucherTypeNodes = findNodesByKey(safeParse(xml), "VOUCHERTYPE");

  return voucherTypeNodes.map((node) => ({
    name: readName(node) ?? "",
    parent: readTextProperty(node, "PARENT"),
  })).filter((voucherType) => voucherType.name.length > 0);
}

export function parseVoucherSummaries(xml: string): readonly TallyVoucherSummary[] {
  const voucherNodes = findNodesByKey(safeParse(xml), "VOUCHER");

  return voucherNodes.map((node) => ({
    date: readTextProperty(node, "DATE"),
    voucherTypeName: readTextProperty(node, "VOUCHERTYPENAME"),
    voucherNumber: readTextProperty(node, "VOUCHERNUMBER"),
    guid: readTextProperty(node, "GUID"),
    narration: readTextProperty(node, "NARRATION"),
  }));
}

export function parseParties(xml: string): readonly TallyParty[] {
  const ledgerNodes = findNodesByKey(safeParse(xml), "LEDGER");

  return ledgerNodes.map((node): TallyParty => {
    const parent = readTextProperty(node, "PARENT") ?? "";
    const partyType =
      parent === "Sundry Debtors"
        ? "SUNDRY_DEBTOR"
        : parent === "Sundry Creditors"
          ? "SUNDRY_CREDITOR"
          : "OTHER";

    return {
      name: readName(node) ?? "",
      parent: parent.length > 0 ? parent : null,
      guid: readTextProperty(node, "GUID"),
      gstin: readTextProperty(node, "PARTYGSTIIN") ?? readTextProperty(node, "PARTYGSTIN"),
      pan: readTextProperty(node, "INCOMETAXNUMBER"),
      address: readTextProperty(node, "LEDGERADDRESS"),
      stateCode: readTextProperty(node, "STATENAME"),
      partyType,
    };
  }).filter((p) => p.name.length > 0);
}

export function parseUnits(xml: string): readonly TallyUnit[] {
  const unitNodes = findNodesByKey(safeParse(xml), "UNIT");

  return unitNodes.map((node): TallyUnit => {
    const unitTypeRaw = readTextProperty(node, "UNITTYPE") ?? "";
    return {
      name: readName(node) ?? "",
      formalName: readTextProperty(node, "FORMALNAME"),
      unitType: unitTypeRaw.toUpperCase() === "COMPOUND" ? "COMPOUND" : "SIMPLE",
    };
  }).filter((u) => u.name.length > 0);
}

export function parseInventoryItems(xml: string): readonly TallyInventoryItem[] {
  const itemNodes = findNodesByKey(safeParse(xml), "STOCKITEM");

  return itemNodes.map((node): TallyInventoryItem => ({
    name: readName(node) ?? "",
    parent: readTextProperty(node, "PARENT"),
    unitName: readTextProperty(node, "BASEUNITS"),
    openingQtyText: readTextProperty(node, "OPENINGBALANCE"),
    closingQtyText: readTextProperty(node, "CLOSINGBALANCE"),
  })).filter((item) => item.name.length > 0);
}

export function parseTallyErrors(xml: string): readonly string[] {
  const parsed = safeParse(xml);
  const lineErrors = findTextValuesByKey(parsed, "LINEERROR");
  const importResultErrors = findTextValuesByKey(parsed, "ERRORS");
  const statusDescriptions = findTextValuesByKey(parsed, "DESC");

  return [...lineErrors, ...statusDescriptions, ...importResultErrors].filter((error) => error.length > 0);
}

export function parseTallyResponseStatus(xml: string): TallyResponseStatus {
  const parsed = safeParse(xml);
  const statusText = findTextValuesByKey(parsed, "STATUS")[0] ?? null;
  const status = statusText === "1" ? 1 : statusText === "0" ? 0 : null;

  return {
    status,
    errors: parseTallyErrors(xml),
  };
}

export function parseImportResult(xml: string): TallyImportResult {
  const parsed = safeParse(xml);

  return {
    status: parseTallyResponseStatus(xml).status,
    created: readNumberByKey(parsed, "CREATED"),
    altered: readNumberByKey(parsed, "ALTERED"),
    deleted: readNumberByKey(parsed, "DELETED"),
    combined: readNumberByKey(parsed, "COMBINED"),
    ignored: readNumberByKey(parsed, "IGNORED"),
    errorsCount: readNumberByKey(parsed, "ERRORS"),
    cancelled: readNumberByKey(parsed, "CANCELLED"),
    lastVoucherId: findTextValuesByKey(parsed, "LASTVCHID")[0] ?? null,
    lastMasterId: findTextValuesByKey(parsed, "LASTMID")[0] ?? null,
    voucherNumber: findTextValuesByKey(parsed, "VCHNUMBER")[0] ?? null,
    errors: parseTallyErrors(xml),
  };
}

function findNodesByKey(value: unknown, key: string): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findNodesByKey(item, key));
  }

  if (!isRecord(value)) {
    return [];
  }

  const direct = value[key];
  const directNodes = direct === undefined ? [] : Array.isArray(direct) ? direct : [direct];
  const nestedNodes = Object.values(value).flatMap((item) => findNodesByKey(item, key));

  return [...directNodes, ...nestedNodes];
}

function findTextValuesByKey(value: unknown, key: string): string[] {
  return findNodesByKey(value, key).map(readText).filter((text): text is string => text !== null);
}

function readName(node: unknown): string | null {
  if (!isRecord(node)) {
    return null;
  }

  const attributeName = node["NAME"];
  if (typeof attributeName === "string" && attributeName.trim().length > 0) {
    return attributeName.trim();
  }

  return readTextProperty(node, "NAME");
}

function readTextProperty(node: unknown, key: string): string | null {
  if (!isRecord(node)) {
    return null;
  }

  return readText(node[key]);
}

function readText(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }

  if (isRecord(value)) {
    const text = value["#text"];
    if (typeof text === "string" || typeof text === "number") {
      const normalized = String(text).trim();
      return normalized.length > 0 ? normalized : null;
    }
  }

  return null;
}

function readNumberByKey(value: unknown, key: string): number {
  const text = findTextValuesByKey(value, key)[0];
  const number = text === undefined ? 0 : Number.parseInt(text, 10);
  return Number.isFinite(number) ? number : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}