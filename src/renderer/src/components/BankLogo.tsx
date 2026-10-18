import React from "react";

// Dynamically import all downloaded SVG bank logos via Vite glob
const svgModules = import.meta.glob<string>("../assets/banks/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

// Build code-to-URL lookup map
const bankSvgMap: Record<string, string> = {};
for (const path in svgModules) {
  const match = path.match(/\/([^/]+)\.svg$/);
  if (match) {
    bankSvgMap[match[1].toLowerCase()] = svgModules[path];
  }
}

/**
 * Maps arbitrary Indian bank string/narration/IFSC code to the exact code from praveenpuglia/indian-banks
 */
export function getBankCode(rawName?: string | null, ifsc?: string | null): string | null {
  const query = `${rawName || ""} ${ifsc || ""}`.trim().toLowerCase();
  if (!query) return null;

  // Exact 4-letter IFSC prefix match
  if (ifsc && ifsc.length >= 4) {
    const ifscPrefix = ifsc.slice(0, 4).toLowerCase();
    if (bankSvgMap[ifscPrefix]) return ifscPrefix;
  }
  if (bankSvgMap[query]) return query;

  // Keyword / Substring match against major Indian banks
  if (query.includes("hdfc")) return "hdfc";
  if (query.includes("icici")) return "icic";
  if (query.includes("sbi") || query.includes("state bank")) return "sbin";
  if (query.includes("axis") || query.includes("utib")) return "utib";
  if (query.includes("kotak")) return "kkbk";
  if (query.includes("baroda") || query.includes("bob") || query.includes("barb")) return "barb";
  if (query.includes("canara") || query.includes("cnrb")) return "cnrb";
  if (query.includes("punjab national") || query.includes("pnb") || query.includes("punb")) return "punb";
  if (query.includes("punjab & sind") || query.includes("psib")) return "psib";
  if (query.includes("indusind") || query.includes("indb")) return "indb";
  if (query.includes("yes bank") || query.includes("yesb")) return "yesb";
  if (query.includes("idfc")) return "idfb";
  if (query.includes("idbi") || query.includes("ibkl")) return "ibkl";
  if (query.includes("union") || query.includes("ubin") || /\bubi\b/i.test(query) || query.startsWith("ubi")) return "ubin";
  if (query.includes("bank of india") || query.includes("bkid")) return "bkid";
  if (query.includes("central bank") || query.includes("cbin")) return "cbin";
  if (query.includes("federal") || query.includes("fdrl")) return "fdrl";
  if (query.includes("bandhan") || query.includes("bdbl")) return "bdbl";
  if (query.includes("rbl") || query.includes("ratn")) return "ratn";
  if (query.includes("standard chartered") || query.includes("scbl")) return "scbl";
  if (query.includes("paytm") || query.includes("pytm")) return "pytm";
  if (query.includes("airtel") || query.includes("airp")) return "airp";
  if (query.includes("au small") || query.includes("aubl")) return "aubl";
  if (query.includes("ujjivan") || query.includes("ujvn")) return "ujvn";
  if (query.includes("south indian") || query.includes("sibl")) return "sibl";
  if (query.includes("karur") || query.includes("kvbl")) return "kvbl";
  if (query.includes("karnataka") || query.includes("karb")) return "karb";
  if (query.includes("city union") || query.includes("ciub")) return "ciub";
  if (query.includes("uco") || query.includes("ucba")) return "ucba";
  if (query.includes("maharashtra") || query.includes("mahb")) return "mahb";
  if (query.includes("indian overseas") || query.includes("ioba")) return "ioba";
  if (query.includes("indian bank") || query.includes("idib")) return "idib";
  if (query.includes("dhanlaxmi") || query.includes("dlxb")) return "dlxb";
  if (query.includes("dcb") || query.includes("dcbl")) return "dcbl";
  if (query.includes("esaf") || query.includes("esmf")) return "esmf";
  if (query.includes("fino")) return "fino";
  if (query.includes("j&k") || query.includes("jammu") || query.includes("jaka")) return "jaka";

  return null;
}

interface BankLogoProps {
  bankName?: string | null;
  ifsc?: string | null;
  size?: number;
  className?: string;
  showBadge?: boolean;
}

export function BankLogo({ bankName, ifsc, size = 26, className, showBadge = false }: BankLogoProps): React.JSX.Element {
  const code = getBankCode(bankName, ifsc);
  const logoUrl = code ? bankSvgMap[code] : null;

  const renderIcon = () => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt={bankName || "Bank Logo"}
          style={{
            width: size,
            height: size,
            objectFit: "contain",
            borderRadius: "6px",
            background: "#FFFFFF",
            padding: "2px",
            boxSizing: "border-box",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            flexShrink: 0,
          }}
        />
      );
    }

    // Check if the query indicates an invoice, bill, receipt, or non-bank document
    const query = `${bankName || ""} ${ifsc || ""}`.trim().toLowerCase();
    const isDoc = query.includes("invoice") || query.includes("bill") || query.includes("receipt") || query.includes("tax_invoice") || query.includes("challan");
    if (isDoc) {
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "6px",
            background: "linear-gradient(135deg, rgba(13, 148, 136, 0.2) 0%, rgba(15, 118, 110, 0.25) 100%)",
            border: "1px solid rgba(13, 148, 136, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent, #0d9488)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            flexShrink: 0,
          }}
        >
          <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
      );
    }

    // Modern clean SVG fallback for unknown/generic banks
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "6px",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#0d9488",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          flexShrink: 0,
        }}
      >
        <svg width={Math.round(size * 0.65)} height={Math.round(size * 0.65)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 7 10-5 10 5" />
          <path d="M12 22V7" />
          <path d="M4 10v11" />
          <path d="M20 10v11" />
          <path d="M2 22h20" />
        </svg>
      </div>
    );
  };

  if (!showBadge) {
    return (
      <div className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title={bankName || "Bank Account"}>
        {renderIcon()}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "3px 10px 3px 4px",
        background: "var(--surface-2, #1e293b)",
        border: "1px solid var(--line, rgba(255,255,255,0.1))",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: "700",
        color: "var(--text, #f8fafc)",
        maxWidth: "100%",
      }}
      title={bankName || "Bank Account"}
    >
      {renderIcon()}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {bankName || "Bank Account"}
      </span>
    </div>
  );
}
