import { RawPdfTextItem } from "./bankStatementTypes.js";

/**
 * Extracts all text fragments from a PDF buffer with spatial (x, y, width, height) coordinates.
 * Uses pdfjs-dist legacy build for Node.js compatibility.
 */
export async function extractPdfSpatialItems(
  pdfBuffer: Buffer,
  password?: string
): Promise<{
  pages: { pageNumber: number; width: number; height: number; items: RawPdfTextItem[] }[];
  fullText: string;
  structuredText: string;
}> {
  // Use legacy build of pdfjs-dist for Node runtime
  // @ts-ignore - dynamic import for node pdfjs-dist
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const uint8Data = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Data,
    password: password || undefined,
    useSystemFonts: true,
    disableFontFace: true,
  });

  let pdfDoc: any;
  try {
    pdfDoc = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === "PasswordException") {
      throw new Error("PASSWORD_REQUIRED: This bank statement PDF is password-protected. Please provide the statement password to unlock and parse.");
    }
    throw err;
  }
  const numPages = pdfDoc.numPages;

  const pagesResult: { pageNumber: number; width: number; height: number; items: RawPdfTextItem[] }[] = [];
  const fullTextParts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const pageItems: RawPdfTextItem[] = [];

    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;

      // Transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
      // In PDF coordinate space, (0,0) is bottom-left. We convert to top-left origin:
      const tx = item.transform[4] ?? 0;
      const ty = item.transform[5] ?? 0;
      const h = item.height || 10;
      const w = item.width || (item.str.length * 6);

      // Convert to top-left coordinate system:
      const yFromTop = Math.max(0, viewport.height - ty);

      pageItems.push({
        str: item.str,
        x: Math.round(tx * 100) / 100,
        y: Math.round(yFromTop * 100) / 100,
        width: Math.round(w * 100) / 100,
        height: Math.round(h * 100) / 100,
        pageNumber: pageNum,
      });

      fullTextParts.push(item.str);
    }

    // Sort page items primarily by Y (top to bottom), then by X (left to right)
    pageItems.sort((a, b) => {
      if (Math.abs(a.y - b.y) <= 3) {
        return a.x - b.x;
      }
      return a.y - b.y;
    });

    pagesResult.push({
      pageNumber: pageNum,
      width: viewport.width,
      height: viewport.height,
      items: pageItems,
    });
  }

  // CA-Jyotsana layout reconstruction: Group items on each page by Y to form lines
  const structuredLines: string[] = [];
  for (const page of pagesResult) {
    const lines: RawPdfTextItem[][] = [];
    let currentLine: RawPdfTextItem[] = [];
    let currentY = -999;
    for (const item of page.items) {
      if (Math.abs(item.y - currentY) > 3.5) {
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [item];
        currentY = item.y;
      } else {
        currentLine.push(item);
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);
    for (const line of lines) {
      structuredLines.push(line.map(it => it.str).join("\t"));
    }
  }

  return {
    pages: pagesResult,
    fullText: fullTextParts.join(" "),
    structuredText: structuredLines.join("\n"),
  };
}

/**
 * CA-Jyotsana technique: Merges split date tokens (e.g. Tesseract or PDF stream
 * splitting "19", "Jan", "2024" or "01", "/", "04", "/", "2025" into separate tokens)
 */
export function mergeSplitDateTokens(items: RawPdfTextItem[], yTol = 4.0, xGap = 60.0): RawPdfTextItem[] {
  if (items.length === 0) return items;

  // Step 1: Vertical 2-line date merge (DD Mon on line 1, YYYY on line 2, e.g. State Bank of India)
  const step1: RawPdfTextItem[] = [];
  const usedVertical = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    if (usedVertical.has(i)) continue;
    const it = items[i];
    if (!it) continue;

    if (/^\d{1,2}\s+[A-Za-z]{3}$/i.test(it.str.trim())) {
      const belowIdx = items.findIndex((o, oi) =>
        !usedVertical.has(oi) &&
        Math.abs(o.x - it.x) <= 25 &&
        (o.y - it.y) > 4 &&
        (o.y - it.y) <= 15 &&
        /^\d{4}\s*$/.test(o.str.trim())
      );
      if (belowIdx !== -1) {
        const below = items[belowIdx]!;
        step1.push({
          str: `${it.str.trim()} ${below.str.trim()}`,
          x: it.x,
          y: it.y,
          width: Math.max(it.width, below.width),
          height: (below.y + below.height) - it.y,
          pageNumber: it.pageNumber,
        });
        usedVertical.add(i);
        usedVertical.add(belowIdx);
        continue;
      }
    }
    step1.push(it);
    usedVertical.add(i);
  }

  // Step 2: Horizontal 3-part date merge (DD Mon YYYY or DD / MM / YYYY on same horizontal row)
  const result: RawPdfTextItem[] = [];
  const used = new Set<number>();

  const dayRegex = /^\d{1,2}$/;
  const monthRegex = /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1]?\d)$/i;
  const yearRegex = /^(?:19|20)?\d{2,4}$/;

  for (let i = 0; i < step1.length; i++) {
    if (used.has(i)) continue;

    const b0 = step1[i];
    if (!b0) continue;

    // Check if next 2 items form a 3-part date triplet
    if (i + 2 < step1.length) {
      const b1 = step1[i + 1];
      const b2 = step1[i + 2];

      if (
        b1 && b2 &&
        dayRegex.test(b0.str.trim()) &&
        monthRegex.test(b1.str.trim()) &&
        yearRegex.test(b2.str.trim()) &&
        Math.abs(b1.y - b0.y) <= yTol &&
        Math.abs(b2.y - b0.y) <= yTol &&
        (b1.x - (b0.x + b0.width)) <= xGap &&
        (b2.x - (b1.x + b1.width)) <= xGap
      ) {
        // Merge into single date block
        const mergedDate = `${b0.str.trim()} ${b1.str.trim()} ${b2.str.trim()}`;
        result.push({
          str: mergedDate,
          x: b0.x,
          y: b0.y,
          width: (b2.x + b2.width) - b0.x,
          height: Math.max(b0.height, b1.height, b2.height),
          pageNumber: b0.pageNumber,
        });

        used.add(i);
        used.add(i + 1);
        used.add(i + 2);
        continue;
      }
    }

    result.push(b0);
    used.add(i);
  }

  return result;
}
