export interface TallyImportResponseSummary {
  readonly success: boolean;
  readonly createdCount: number;
  readonly alteredCount: number;
  readonly deletedCount: number;
  readonly combinedCount: number;
  readonly ignoredCount: number;
  readonly errorCount: number;
  readonly lineErrors: readonly string[];
  readonly rawResponse: string;
}

/**
 * Parses Tally's XML response envelope returned after voucher import:
 * <RESPONSE>
 *   <CREATED>12</CREATED>
 *   <ALTERED>0</ALTERED>
 *   <ERRORS>1</ERRORS>
 *   <LINEERROR>Ledger 'Acme' does not exist!</LINEERROR>
 * </RESPONSE>
 */
export function parseTallyImportResponse(responseXml: string): TallyImportResponseSummary {
  const getTagValue = (tagName: string): number => {
    const match = responseXml.match(new RegExp(`<${tagName}>(\\d+)<\\/${tagName}>`, "i"));
    return match && match[1] ? parseInt(match[1], 10) : 0;
  };

  const createdCount = getTagValue("CREATED");
  const alteredCount = getTagValue("ALTERED");
  const deletedCount = getTagValue("DELETED");
  const combinedCount = getTagValue("COMBINED");
  const ignoredCount = getTagValue("IGNORED");
  const errorCount = getTagValue("ERRORS");

  const lineErrors: string[] = [];
  const lineErrorRegex = /<LINEERROR>(.*?)<\/LINEERROR>/gi;
  let lineMatch: RegExpExecArray | null;
  while ((lineMatch = lineErrorRegex.exec(responseXml)) !== null) {
    if (lineMatch[1] && lineMatch[1].trim()) {
      lineErrors.push(lineMatch[1].trim());
    }
  }

  // Check for root level exception messages or fatal status
  if (responseXml.includes("<STATUS>0</STATUS>") || responseXml.includes("<PARSEERROR>")) {
    const errorMatch = responseXml.match(/<(?:DESC|PARSEERROR)>(.*?)<\/(?:DESC|PARSEERROR)>/i);
    if (errorMatch && errorMatch[1]) {
      lineErrors.push(errorMatch[1].trim());
    }
  }

  const isSuccess = errorCount === 0 && (createdCount > 0 || responseXml.includes("<STATUS>1</STATUS>"));

  return {
    success: isSuccess,
    createdCount,
    alteredCount,
    deletedCount,
    combinedCount,
    ignoredCount,
    errorCount: errorCount > 0 ? errorCount : lineErrors.length,
    lineErrors,
    rawResponse: responseXml,
  };
}
