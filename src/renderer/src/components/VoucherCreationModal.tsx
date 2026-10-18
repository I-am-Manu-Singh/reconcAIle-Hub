import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Check,
  Send,
  Download,
  FileSpreadsheet,
  FileCode,
  FileText,
  Calculator,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag,
  Hash,
  Sparkles,
  CreditCard,
  Building2,
  Package,
  Boxes,
  Truck,
  Users,
  Percent,
  Clock,
  Printer
} from "lucide-react";
import { exportToCsv } from "../utils/csvExporter";
import { generateTallyVoucherXml, downloadXmlFile } from "../utils/tallyXmlGenerator";
import { triggerToast } from "./ToastNotification";
import { PrintSettingsModal } from "./PrintSettingsModal";
import { StockMasterModal } from "./StockMasterModal";
import {
  VoucherCategory,
  VoucherTypeCode,
  GstSupplyType,
  BillAllocation,
  BankAllocationDetails,
  CashDenomination,
  ItemBatchAllocation,
  VoucherLineItem,
  AdditionalSurchargeItem,
  StatutoryTdsTcsEntry,
  EmployeePayHeadAllocation,
  AttendanceRecordingEntry,
  StockJournalConsumptionProduction,
  TallyVoucherPayload,
  calculateVoucherTaxSummary
} from "../types/voucherModels";

export interface VoucherTypeConfig {
  code: VoucherTypeCode;
  name: string;
  category: VoucherCategory;
  shortcut: string;
  description: string;
  defaultDebitLedger?: string;
  defaultCreditLedger?: string;
  hasInventory: boolean;
  hasOrderRef?: boolean;
}

export const VOUCHER_TYPE_DEFINITIONS: VoucherTypeConfig[] = [
  // Accounting Vouchers
  { code: "CONTRA", name: "Contra", category: "ACCOUNTING", shortcut: "F4", description: "Internal bank-to-bank or cash deposit/withdrawal transfers", hasInventory: false },
  { code: "PAYMENT", name: "Payment", category: "ACCOUNTING", shortcut: "F5", description: "Outward disbursements for supplier dues, expenses, or statutory taxes", hasInventory: false },
  { code: "RECEIPT", name: "Receipt", category: "ACCOUNTING", shortcut: "F6", description: "Inward receipts from debtors, customer collections, and incomes", hasInventory: false },
  { code: "JOURNAL", name: "Journal", category: "ACCOUNTING", shortcut: "F7", description: "Non-cash adjustments, provisions, year-end entries, depreciation", hasInventory: false },
  { code: "SALES", name: "Sales", category: "ACCOUNTING", shortcut: "F8", description: "Tax invoice billing for outward sales of goods and services", hasInventory: true },
  { code: "PURCHASE", name: "Purchase", category: "ACCOUNTING", shortcut: "F9", description: "Purchase inward bills for goods, inventory, and input credit", hasInventory: true },
  { code: "CREDIT_NOTE", name: "Credit Note", category: "ACCOUNTING", shortcut: "Ctrl + F8", description: "Sales returns, rate differences, discount allowances to buyers", hasInventory: true },
  { code: "DEBIT_NOTE", name: "Debit Note", category: "ACCOUNTING", shortcut: "Ctrl + F9", description: "Purchase returns, seller rate corrections, supplier debit notes", hasInventory: true },

  // Inventory Vouchers
  { code: "PHYSICAL_STOCK", name: "Physical Stock", category: "INVENTORY", shortcut: "Ctrl + F7", description: "Physical verification discrepancy adjustments for stock counts", hasInventory: true },
  { code: "STOCK_JOURNAL", name: "Stock Journal / Mfg", category: "INVENTORY", shortcut: "Alt + F7", description: "Inter-godown transfers, consumption of raw materials, manufacturing output", hasInventory: true },
  { code: "DELIVERY_NOTE", name: "Delivery Note", category: "INVENTORY", shortcut: "Alt + F8", description: "Dispatch of goods to customer prior to tax invoice generation", hasInventory: true },
  { code: "RECEIPT_NOTE", name: "Receipt Note", category: "INVENTORY", shortcut: "Alt + F9", description: "Goods received from supplier against purchase order / challan", hasInventory: true },
  { code: "REJECTIONS_IN", name: "Rejections In", category: "INVENTORY", shortcut: "Ctrl + F6", description: "Inventory rejected and returned inward by customer before invoice", hasInventory: true },
  { code: "REJECTIONS_OUT", name: "Rejections Out", category: "INVENTORY", shortcut: "Alt + F6", description: "Inventory rejected and returned outward to vendor before billing", hasInventory: true },

  // Order Vouchers
  { code: "SALES_ORDER", name: "Sales Order", category: "ORDER", shortcut: "Ctrl + F8 (Order)", description: "Customer sales orders, fulfillment schedules, delivery tracking", hasInventory: true, hasOrderRef: true },
  { code: "PURCHASE_ORDER", name: "Purchase Order", category: "ORDER", shortcut: "Ctrl + F9 (Order)", description: "Formal purchase orders issued to vendors with pricing agreements", hasInventory: true, hasOrderRef: true },
  { code: "JOB_WORK_IN", name: "Job Work In Order", category: "ORDER", shortcut: "F10 → Order", description: "Inward job work processing orders from external principal manufacturers", hasInventory: true, hasOrderRef: true },
  { code: "JOB_WORK_OUT", name: "Job Work Out Order", category: "ORDER", shortcut: "F10 → Order", description: "Outward job work processing orders assigned to subcontracting jobbers", hasInventory: true, hasOrderRef: true },

  // Specialized & Non-Accounting Vouchers
  { code: "PAYROLL", name: "Payroll Voucher", category: "SPECIALIZED", shortcut: "Ctrl + F4", description: "Salary, wages, provident fund, ESIC, professional tax distributions", hasInventory: false },
  { code: "ATTENDANCE", name: "Attendance Voucher", category: "SPECIALIZED", shortcut: "Ctrl + F5", description: "Production types, present days, overtime recording for employees", hasInventory: false },
  { code: "MEMO", name: "Memorandum (Memo)", category: "SPECIALIZED", shortcut: "Ctrl + F10", description: "Non-accounting reminder entries with zero financial impact on books", hasInventory: false },
  { code: "REVERSING_JOURNAL", name: "Reversing Journal", category: "SPECIALIZED", shortcut: "F10 → Reversing", description: "Automatic reversal vouchers on subsequent date for temporary forecasts", hasInventory: false },
];

export interface VoucherCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVoucherCode?: string;
  activeCompanyId?: string;
  activeCompanyName?: string;
  mirrorLedgers?: readonly any[];
  stockItems?: readonly any[];
  stockGroups?: readonly any[];
  stockCategories?: readonly any[];
  onSaveVoucher?: (voucher: any) => Promise<void> | void;
}

export function VoucherCreationModal({
  isOpen,
  onClose,
  initialVoucherCode = "PAYMENT",
  activeCompanyId = "",
  activeCompanyName = "Primary Company",
  mirrorLedgers = [],
  stockItems = [],
  stockGroups = [],
  stockCategories = [],
  onSaveVoucher,
}: VoucherCreationModalProps): React.JSX.Element | null {
  const [selectedCode, setSelectedCode] = useState<VoucherTypeCode>(initialVoucherCode as VoucherTypeCode);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"PARTICULARS" | "BANK_BILL" | "TAX_SURCHARGE" | "PAYROLL_ATTENDANCE">("PARTICULARS");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isStockMasterOpen, setIsStockMasterOpen] = useState(false);

  // Dynamic local stock master cache for immediate dropdown updates
  const [localStockItems, setLocalStockItems] = useState<any[]>(stockItems as any[]);
  const [localStockGroups, setLocalStockGroups] = useState<any[]>(stockGroups as any[]);
  const [localStockCategories, setLocalStockCategories] = useState<any[]>(stockCategories as any[]);

  useEffect(() => {
    // Sync stock masters from SQLite mirror if available
    if ((window as any).desktop?.accountingMirror?.listInventoryItems) {
      (window as any).desktop.accountingMirror.listInventoryItems(activeCompanyId).then((items: any[]) => {
        if (items && items.length > 0) setLocalStockItems(items);
      }).catch(() => {});
    }
    if ((window as any).desktop?.accountingMirror?.listStockGroups) {
      (window as any).desktop.accountingMirror.listStockGroups(activeCompanyId).then((groups: any[]) => {
        if (groups && groups.length > 0) setLocalStockGroups(groups);
      }).catch(() => {});
    }
    if ((window as any).desktop?.accountingMirror?.listStockCategories) {
      (window as any).desktop.accountingMirror.listStockCategories(activeCompanyId).then((cats: any[]) => {
        if (cats && cats.length > 0) setLocalStockCategories(cats);
      }).catch(() => {});
    }
  }, [activeCompanyId]);

  const activeConfig = VOUCHER_TYPE_DEFINITIONS.find((v) => v.code === selectedCode) || VOUCHER_TYPE_DEFINITIONS[0]!;

  // Primary Voucher Header State
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [voucherNumber, setVoucherNumber] = useState<string>(`VCH-${Date.now().toString().slice(-4)}`);
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [referenceDate, setReferenceDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [partyLedger, setPartyLedger] = useState<string>("");
  const [partyGstin, setPartyGstin] = useState<string>("");
  const [partyState, setPartyState] = useState<string>("West Bengal (19)");
  const [placeOfSupplyState, setPlaceOfSupplyState] = useState<string>("West Bengal (19)");
  const [costCenter, setCostCenter] = useState<string>("Primary Cost Center");
  const [narration, setNarration] = useState<string>("");
  const [gstSupplyType, setGstSupplyType] = useState<GstSupplyType>("REGULAR_TAXABLE");
  const [isReverseCharge, setIsReverseCharge] = useState<boolean>(false);

  // Bank Allocation Details
  const [bankDetails, setBankDetails] = useState<BankAllocationDetails>({
    instrumentType: "e-Fund Transfer",
    instrumentNumber: "",
    instrumentDate: new Date().toISOString().substring(0, 10),
    favoringName: "",
    transferBankName: "",
    ifscCode: "",
    utrRefNumber: "",
  });

  // Bill Allocations Table
  const [billAllocations, setBillAllocations] = useState<BillAllocation[]>([
    {
      id: "bill_1",
      type: "New Ref",
      referenceName: `REF-${Date.now().toString().slice(-4)}`,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
      amount: 1000,
      drCr: "Dr",
    },
  ]);

  // Cash Denominations (For Contra & Cash Receipts)
  const [cashDenominations, setCashDenominations] = useState<CashDenomination[]>([
    { denomination: 500, count: 0 },
    { denomination: 200, count: 0 },
    { denomination: 100, count: 0 },
    { denomination: 50, count: 0 },
    { denomination: 20, count: 0 },
    { denomination: 10, count: 0 },
  ]);

  // Surcharges & Extra Freight/Discounts
  const [surcharges, setSurcharges] = useState<AdditionalSurchargeItem[]>([
    { id: "sur_1", ledgerName: "Freight & Delivery Charges", isPreGst: true, isDiscount: false, amount: 0, gstRate: 18 }
  ]);

  // TDS / TCS Statutory Withholding
  const [tdsTcsEntries, setTdsTcsEntries] = useState<StatutoryTdsTcsEntry[]>([
    {
      type: "TDS",
      section: "194C",
      deducteeLedger: "TDS on Contractor / Sub-Contractor",
      natureOfPayment: "Works Contract",
      ratePercentage: 1.0,
      taxableBaseAmount: 0,
      taxWithheldAmount: 0,
    }
  ]);

  // Payroll Allocations
  const [payrollAllocations, setPayrollAllocations] = useState<EmployeePayHeadAllocation[]>([
    { id: "emp_1", employeeId: "EMP-001", employeeName: "Devin Sharma", payHeadName: "Basic Salary", type: "EARNING", amount: 45000, attendanceDays: 26 },
    { id: "emp_2", employeeId: "EMP-001", employeeName: "Devin Sharma", payHeadName: "House Rent Allowance (HRA)", type: "EARNING", amount: 15000 },
    { id: "emp_3", employeeId: "EMP-001", employeeName: "Devin Sharma", payHeadName: "Provident Fund (PF)", type: "DEDUCTION", amount: 1800 }
  ]);

  // Attendance Records
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceRecordingEntry[]>([
    { id: "att_1", employeeId: "EMP-001", employeeName: "Devin Sharma", attendanceType: "PRESENT", value: 26, unit: "DAYS" },
    { id: "att_2", employeeId: "EMP-001", employeeName: "Devin Sharma", attendanceType: "OVERTIME", value: 12, unit: "HOURS" }
  ]);

  // Line Items List
  const [items, setItems] = useState<VoucherLineItem[]>([
    {
      id: "line_1",
      itemOrLedgerName: "",
      drCr: "Dr",
      hsnSacCode: "6907",
      godownName: "Main Location",
      batchName: "BATCH-A1",
      quantity: 1,
      actualQuantity: 1,
      unitOfMeasure: "pcs",
      rate: 1000,
      discountPercentage: 0,
      taxableAmount: 1000,
      gstRate: 18,
      cgst: 90,
      sgst: 90,
      igst: 0,
      cess: 0,
      totalAmount: 1180,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCode(initialVoucherCode as VoucherTypeCode);
    const cfg = VOUCHER_TYPE_DEFINITIONS.find((v) => v.code === initialVoucherCode) || VOUCHER_TYPE_DEFINITIONS[0]!;
    setVoucherNumber(`${cfg.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
  }, [initialVoucherCode]);

  // Global Keyboard Shortcuts handler for F4-F10
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isSelectorOpen) {
          setIsSelectorOpen(false);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === "F10") {
        e.preventDefault();
        setIsSelectorOpen((prev) => !prev);
        return;
      }

      // Check shortcuts
      let matchedCode: VoucherTypeCode | null = null;
      if (e.key === "F4" && !e.ctrlKey && !e.altKey) matchedCode = "CONTRA";
      else if (e.key === "F4" && e.ctrlKey) matchedCode = "PAYROLL";
      else if (e.key === "F5" && !e.ctrlKey && !e.altKey) matchedCode = "PAYMENT";
      else if (e.key === "F5" && e.ctrlKey) matchedCode = "ATTENDANCE";
      else if (e.key === "F6" && !e.ctrlKey && !e.altKey) matchedCode = "RECEIPT";
      else if (e.key === "F6" && e.ctrlKey) matchedCode = "REJECTIONS_IN";
      else if (e.key === "F6" && e.altKey) matchedCode = "REJECTIONS_OUT";
      else if (e.key === "F7" && !e.ctrlKey && !e.altKey) matchedCode = "JOURNAL";
      else if (e.key === "F7" && e.ctrlKey) matchedCode = "PHYSICAL_STOCK";
      else if (e.key === "F7" && e.altKey) matchedCode = "STOCK_JOURNAL";
      else if (e.key === "F8" && !e.ctrlKey && !e.altKey) matchedCode = "SALES";
      else if (e.key === "F8" && e.ctrlKey) matchedCode = "CREDIT_NOTE";
      else if (e.key === "F8" && e.altKey) matchedCode = "DELIVERY_NOTE";
      else if (e.key === "F9" && !e.ctrlKey && !e.altKey) matchedCode = "PURCHASE";
      else if (e.key === "F9" && e.ctrlKey) matchedCode = "DEBIT_NOTE";
      else if (e.key === "F9" && e.altKey) matchedCode = "RECEIPT_NOTE";
      else if (e.key === "F10" && e.ctrlKey) matchedCode = "MEMO";

      if (matchedCode) {
        e.preventDefault();
        setSelectedCode(matchedCode);
        const cfg = VOUCHER_TYPE_DEFINITIONS.find((v) => v.code === matchedCode);
        if (cfg) {
          setVoucherNumber(`${cfg.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSelectorOpen, onClose]);

  if (!isOpen) return null;

  // Real-time calculation engine invocation
  const summary = calculateVoucherTaxSummary(items, surcharges, tdsTcsEntries);

  const handleLineChange = (index: number, field: keyof VoucherLineItem, value: any) => {
    setItems((prev) => {
      const nextItems = [...prev];
      const cur = { ...nextItems[index]!, [field]: value };

      if (field === "quantity" || field === "rate" || field === "discountPercentage") {
        const q = field === "quantity" ? Number(value) || 0 : Number(cur.quantity) || 0;
        const r = field === "rate" ? Number(value) || 0 : Number(cur.rate) || 0;
        const disc = field === "discountPercentage" ? Number(value) || 0 : Number(cur.discountPercentage) || 0;
        const gross = q * r;
        const discAmt = (gross * disc) / 100;
        cur.taxableAmount = Math.round((gross - discAmt) * 100) / 100;
      }

      if (
        field === "taxableAmount" ||
        field === "gstRate" ||
        field === "quantity" ||
        field === "rate" ||
        field === "discountPercentage"
      ) {
        const amt = Number(cur.taxableAmount) || 0;
        const gst = Number(cur.gstRate) || 0;
        const tax = Math.round(((amt * gst) / 100) * 100) / 100;

        // If inter-state supply, apply IGST, else CGST + SGST split
        const isInterState = gstSupplyType === "INTER_STATE_IGST";
        if (isInterState) {
          cur.igst = tax;
          cur.cgst = 0;
          cur.sgst = 0;
        } else {
          cur.cgst = Math.round((tax / 2) * 100) / 100;
          cur.sgst = Math.round((tax / 2) * 100) / 100;
          cur.igst = 0;
        }
        cur.totalAmount = amt + (cur.cgst || 0) + (cur.sgst || 0) + (cur.igst || 0);
      }

      nextItems[index] = cur;
      return nextItems;
    });
  };

  const addLine = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `line_${Date.now()}_${prev.length}`,
        itemOrLedgerName: "",
        drCr: "Dr",
        hsnSacCode: "6907",
        godownName: "Main Location",
        batchName: "BATCH-A1",
        quantity: 1,
        actualQuantity: 1,
        unitOfMeasure: "pcs",
        rate: 1000,
        discountPercentage: 0,
        taxableAmount: 1000,
        gstRate: 18,
        cgst: gstSupplyType === "INTER_STATE_IGST" ? 0 : 90,
        sgst: gstSupplyType === "INTER_STATE_IGST" ? 0 : 90,
        igst: gstSupplyType === "INTER_STATE_IGST" ? 180 : 0,
        cess: 0,
        totalAmount: 1180,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildPayload = (): TallyVoucherPayload => ({
    id: `vch_${Date.now()}`,
    companyId: activeCompanyId,
    companyDisplayName: activeCompanyName,
    voucherCategory: activeConfig.category,
    voucherTypeCode: activeConfig.code,
    voucherTypeName: activeConfig.name,
    voucherNumber,
    voucherDate,
    effectiveDate,
    referenceNumber: referenceNo,
    referenceDate,
    partyLedgerName: partyLedger || (mirrorLedgers[0]?.name ?? "Cash"),
    partyGstin,
    partyState,
    placeOfSupplyState,
    gstSupplyType,
    isReverseCharge,
    bankDetails,
    cashDenominations,
    lineItems: items,
    additionalSurcharges: surcharges,
    tdsTcsDetails: tdsTcsEntries,
    payrollAllocations,
    attendanceEntries,
    totalTaxableAmount: summary.taxableSubtotal,
    totalCgstAmount: summary.totalCgst,
    totalSgstAmount: summary.totalSgst,
    totalIgstAmount: summary.totalIgst,
    totalCessAmount: summary.totalCess,
    totalTdsTcsWithheld: summary.totalTdsTcs,
    roundOffAmount: summary.roundOff,
    grandTotalAmount: summary.grandTotal,
    narration: narration || `${activeConfig.name} #${voucherNumber} recorded manually`,
    status: "READY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessNotice(null);

    const payload = buildPayload();

    try {
      if ((window as any).desktop?.accountingMirror?.saveVoucher) {
        await (window as any).desktop.accountingMirror.saveVoucher({
          companyId: activeCompanyId,
          voucherDate: payload.voucherDate,
          voucherTypeName: payload.voucherTypeName,
          voucherNumber: payload.voucherNumber,
          narration: payload.narration,
          amount: payload.grandTotalAmount,
          partyName: payload.partyLedgerName,
        });
      }
      if (onSaveVoucher) {
        await onSaveVoucher(payload);
      }
      triggerToast(`Voucher [${activeConfig.name} #${voucherNumber}] successfully created and saved.`, "success", "Voucher Saved");
      onClose();
    } catch (err: any) {
      triggerToast(`Failed to save voucher: ${err?.message || String(err)}`, "error", "Save Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportStatement = () => {
    const exportRows = items.map((it, idx) => ({
      VoucherType: activeConfig.name,
      VoucherNumber: voucherNumber,
      Date: voucherDate,
      Party: partyLedger,
      LineNo: idx + 1,
      Description: it.itemOrLedgerName,
      HSN_SAC: it.hsnSacCode,
      Godown: it.godownName,
      Batch: it.batchName,
      Quantity: it.quantity,
      Rate: it.rate,
      TaxableAmount: it.taxableAmount,
      CGST: it.cgst,
      SGST: it.sgst,
      IGST: it.igst,
      TotalAmount: it.totalAmount,
      Narration: narration,
    }));
    exportToCsv(`${activeConfig.name}_${voucherNumber}_Statement.csv`, exportRows);
  };

  const handleExportTallyXml = () => {
    const payload = buildPayload();
    const xml = generateTallyVoucherXml([payload], activeCompanyName);
    downloadXmlFile(`${activeConfig.name}_${voucherNumber}_TallyPrime.xml`, xml);
  };

  const filteredVoucherDefs = VOUCHER_TYPE_DEFINITIONS.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(selectorSearch.toLowerCase()) ||
      v.shortcut.toLowerCase().includes(selectorSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(selectorSearch.toLowerCase());
    const matchesCat = activeCategory === "ALL" || v.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "1060px",
          maxHeight: "94vh",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                background: "var(--accent-subtle)",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontWeight: "800",
                fontSize: "13px",
              }}
            >
              {activeConfig.shortcut}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
                  Create {activeConfig.name} Voucher
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--muted)",
                  }}
                >
                  {activeConfig.category}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                  }}
                >
                  Company: {activeCompanyName}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
                {activeConfig.description}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setIsSelectorOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              <Layers size={14} /> F10: Change Type
            </button>
            <button
              type="button"
              onClick={() => setIsStockMasterOpen(true)}
              title="Add / Manage Stock Items, Groups, Categories, Godowns, UoM, and Batches"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid #10b981",
                color: "#10b981",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              <Package size={14} /> + Stock Master
            </button>
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              title="Print voucher or save to PDF with printer discovery and page setup"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid #3b82f6",
                color: "#3b82f6",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              <Printer size={14} /> Print Voucher
            </button>
            <button
              type="button"
              onClick={handleExportTallyXml}
              title="Generate & Download TallyPrime XML Envelope"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid #3b82f6",
                color: "#3b82f6",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              <FileCode size={14} /> Tally XML
            </button>
            <button
              type="button"
              onClick={handleExportStatement}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            padding: "8px 20px 0",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("PARTICULARS")}
            style={{
              padding: "8px 14px",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              border: "1px solid var(--line)",
              borderBottom: activeTab === "PARTICULARS" ? "2px solid var(--accent)" : "1px solid var(--line)",
              background: activeTab === "PARTICULARS" ? "var(--surface)" : "transparent",
              color: activeTab === "PARTICULARS" ? "var(--text)" : "var(--muted)",
              fontWeight: "700",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <Boxes size={14} /> Particulars & Inventory ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BANK_BILL")}
            style={{
              padding: "8px 14px",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              border: "1px solid var(--line)",
              borderBottom: activeTab === "BANK_BILL" ? "2px solid var(--accent)" : "1px solid var(--line)",
              background: activeTab === "BANK_BILL" ? "var(--surface)" : "transparent",
              color: activeTab === "BANK_BILL" ? "var(--text)" : "var(--muted)",
              fontWeight: "700",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <CreditCard size={14} /> Bank & Bill Allocations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TAX_SURCHARGE")}
            style={{
              padding: "8px 14px",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              border: "1px solid var(--line)",
              borderBottom: activeTab === "TAX_SURCHARGE" ? "2px solid var(--accent)" : "1px solid var(--line)",
              background: activeTab === "TAX_SURCHARGE" ? "var(--surface)" : "transparent",
              color: activeTab === "TAX_SURCHARGE" ? "var(--text)" : "var(--muted)",
              fontWeight: "700",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <Percent size={14} /> Statutory Taxes, TDS/TCS & Surcharges
          </button>
          {activeConfig.category === "SPECIALIZED" && (
            <button
              type="button"
              onClick={() => setActiveTab("PAYROLL_ATTENDANCE")}
              style={{
                padding: "8px 14px",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
                border: "1px solid var(--line)",
                borderBottom: activeTab === "PAYROLL_ATTENDANCE" ? "2px solid var(--accent)" : "1px solid var(--line)",
                background: activeTab === "PAYROLL_ATTENDANCE" ? "var(--surface)" : "transparent",
                color: activeTab === "PAYROLL_ATTENDANCE" ? "var(--text)" : "var(--muted)",
                fontWeight: "700",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Users size={14} /> Payroll & Attendance
            </button>
          )}
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Header Metadata Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: activeConfig.code === "CONTRA" || activeConfig.code === "JOURNAL" || activeConfig.category === "SPECIALIZED" 
                ? "repeat(4, 1fr)" 
                : "repeat(5, 1fr)",
              gap: "10px",
              background: "var(--surface-2)",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid var(--line)",
            }}
          >
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Voucher Date
              </label>
              <input
                type="date"
                required
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Effective Date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Voucher No.
              </label>
              <input
                type="text"
                required
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                {activeConfig.code === "CONTRA" ? "Transfer Ref / Cheque No." : activeConfig.code === "JOURNAL" ? "Journal Ref / Doc No." : "Ref / Bill No."}
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder={activeConfig.code === "CONTRA" ? "e.g. TRF-88219" : "e.g. 19-20/363"}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px" }}
              />
            </div>
            {activeConfig.code !== "CONTRA" && activeConfig.code !== "JOURNAL" && activeConfig.category !== "SPECIALIZED" && (
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  GST Supply Type
                </label>
                <select
                  value={gstSupplyType}
                  onChange={(e) => setGstSupplyType(e.target.value as GstSupplyType)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12px", fontWeight: "600" }}
                >
                  <option value="REGULAR_TAXABLE">Intra-State (CGST + SGST)</option>
                  <option value="INTER_STATE_IGST">Inter-State (IGST)</option>
                  <option value="EXEMPT">Exempted Supply</option>
                  <option value="NIL_RATED">Nil Rated Supply</option>
                  <option value="REVERSE_CHARGE_RCM">Reverse Charge (RCM)</option>
                </select>
              </div>
            )}
          </div>

          {/* Party Details Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: activeConfig.code === "CONTRA" || activeConfig.code === "JOURNAL" || activeConfig.category === "SPECIALIZED"
                ? "1.8fr 1.2fr"
                : "1.4fr 1fr 1fr 0.8fr",
              gap: "10px",
              background: "var(--surface-2)",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid var(--line)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>
                  {activeConfig.code === "CONTRA" 
                    ? "Source Account (Cash / Bank) [Credit]" 
                    : activeConfig.code === "PAYMENT" 
                    ? "Paid To / Beneficiary Party Ledger [Debit]" 
                    : activeConfig.code === "RECEIPT" 
                    ? "Received From Party / Customer Ledger [Credit]" 
                    : activeConfig.code === "SALES" 
                    ? "Buyer / Customer Party Ledger [Debit]" 
                    : activeConfig.code === "PURCHASE" 
                    ? "Supplier / Vendor Party Ledger [Credit]" 
                    : activeConfig.code === "JOURNAL" 
                    ? "Primary Adjustment Ledger [Debit]" 
                    : "Party / Account Ledger (Dr / Cr)"}
                </label>
                <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: "700" }}>
                  ⚡ Auto-fills Master
                </span>
              </div>
              <input
                type="text"
                required
                list="mirror-ledgers-list"
                value={partyLedger}
                onChange={(e) => {
                  const val = e.target.value;
                  setPartyLedger(val);
                  // Find matched ledger and auto-fill statutory & banking details!
                  const matched = (mirrorLedgers as any[]).find(
                    (l) => l.name?.toLowerCase() === val.toLowerCase()
                  );
                  if (matched) {
                    if (matched.gstin) setPartyGstin(matched.gstin);
                    if (matched.stateName) {
                      setPartyState(matched.stateName);
                      setPlaceOfSupplyState(matched.stateName);
                    }
                    if (matched.bankAccountNumber || matched.bankIfsc) {
                      setBankDetails((prev) => ({
                        ...prev,
                        favoringName: matched.name,
                        transferBankName: matched.bankName || prev.transferBankName,
                        instrumentNumber: matched.bankAccountNumber || prev.instrumentNumber,
                        ifscCode: matched.bankIfsc || prev.ifscCode,
                      }));
                    }
                  }
                }}
                placeholder={activeConfig.code === "CONTRA" ? "Select Source Bank / Cash A/c..." : "Type or select ledger (e.g. Kailash Hardware)..."}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700" }}
              />
              <datalist id="mirror-ledgers-list">
                {(mirrorLedgers as any[]).map((l, lidx) => (
                  <option key={`${l.id || l.name}_${lidx}`} value={l.name}>
                    {l.parentName ? `[${l.parentName}]` : ""} {l.gstin ? `(${l.gstin})` : ""}
                  </option>
                ))}
              </datalist>
              <datalist id="stock-items-list">
                {localStockItems.map((si, sidx) => (
                  <option key={`${si.id || si.name}_${sidx}`} value={si.name}>
                    {si.parentName ? `[${si.parentName}]` : ""} {si.unitName ? `(${si.unitName})` : ""} {si.defaultRate ? `• ₹${si.defaultRate}` : ""}
                  </option>
                ))}
              </datalist>
              <datalist id="stock-groups-list">
                {localStockGroups.map((sg, sgidx) => (
                  <option key={`${sg.id || sg.name || sg}_${sgidx}`} value={typeof sg === "string" ? sg : sg.name} />
                ))}
              </datalist>
              <datalist id="stock-categories-list">
                {localStockCategories.map((sc, scidx) => (
                  <option key={`${sc.id || sc.name || sc}_${scidx}`} value={typeof sc === "string" ? sc : sc.name} />
                ))}
              </datalist>
            </div>
            {activeConfig.code !== "CONTRA" && activeConfig.code !== "JOURNAL" && activeConfig.category !== "SPECIALIZED" && (
              <>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Party GSTIN / UIN
                  </label>
                  <input
                    type="text"
                    value={partyGstin}
                    onChange={(e) => setPartyGstin(e.target.value.toUpperCase())}
                    placeholder="19AGDPK0803A1Z4"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px", fontFamily: "monospace" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    State / Place of Supply
                  </label>
                  <input
                    type="text"
                    value={placeOfSupplyState}
                    onChange={(e) => setPlaceOfSupplyState(e.target.value)}
                    placeholder="West Bengal (19)"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px" }}
                  />
                </div>
              </>
            )}
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Cost Center / Dept
              </label>
              <input
                type="text"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px" }}
              />
            </div>
          </div>

          {/* TAB 1: PARTICULARS & INVENTORY */}
          {activeTab === "PARTICULARS" && (
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "10px",
                border: "1px solid var(--line)",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text)" }}>
                  {activeConfig.hasInventory 
                    ? `Particulars & Stock Items Breakdown (${items.length})` 
                    : activeConfig.code === "CONTRA"
                    ? `Destination Account(s) & Amount (${items.length})`
                    : `Particulars & Ledger Line Entries (${items.length})`}
                </span>
                <button
                  type="button"
                  onClick={addLine}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    background: "var(--accent-subtle)",
                    border: "1px solid var(--accent)",
                    color: "var(--accent)",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={13} /> Add Particular Line
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                      <th style={{ padding: "8px", textAlign: "left", color: "var(--muted)", width: "30px" }}>#</th>
                      <th style={{ padding: "8px", textAlign: "left", color: "var(--muted)", minWidth: "170px" }}>
                        {activeConfig.hasInventory ? "Stock Item / Ledger Particulars" : activeConfig.code === "CONTRA" ? "Destination Bank / Cash Ledger" : "Expense / Income / Party Ledger"}
                      </th>
                      {activeConfig.hasInventory && (
                        <>
                          <th style={{ padding: "8px", textAlign: "left", color: "var(--muted)", width: "110px" }}>Stock Group</th>
                          <th style={{ padding: "8px", textAlign: "left", color: "var(--muted)", width: "110px" }}>Stock Category</th>
                          <th style={{ padding: "8px", textAlign: "left", color: "var(--muted)", width: "90px" }}>HSN/SAC</th>
                          <th style={{ padding: "8px", textAlign: "left", color: "var(--muted)", width: "100px" }}>Godown</th>
                          <th style={{ padding: "8px", textAlign: "left", color: "var(--muted)", width: "90px" }}>Batch #</th>
                          <th style={{ padding: "8px", textAlign: "right", color: "var(--muted)", width: "70px" }}>Qty</th>
                          <th style={{ padding: "8px", textAlign: "right", color: "var(--muted)", width: "90px" }}>Rate (₹)</th>
                          <th style={{ padding: "8px", textAlign: "right", color: "var(--muted)", width: "65px" }}>Disc %</th>
                        </>
                      )}
                      <th style={{ padding: "8px", textAlign: "right", color: "var(--muted)", width: "110px" }}>
                        {activeConfig.hasInventory ? "Taxable (₹)" : "Amount (₹)"}
                      </th>
                      {activeConfig.code !== "CONTRA" && activeConfig.code !== "JOURNAL" && activeConfig.category !== "SPECIALIZED" && (
                        <>
                          <th style={{ padding: "8px", textAlign: "right", color: "var(--muted)", width: "65px" }}>GST %</th>
                          <th style={{ padding: "8px", textAlign: "right", color: "var(--muted)", width: "95px" }}>Total Tax</th>
                        </>
                      )}
                      <th style={{ padding: "8px", textAlign: "center", color: "var(--muted)", width: "35px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((line, idx) => (
                      <tr key={line.id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "8px", color: "var(--muted)" }}>{idx + 1}</td>
                        <td style={{ padding: "8px" }}>
                          <input
                            type="text"
                            required
                            list={activeConfig.hasInventory ? "stock-items-list" : "mirror-ledgers-list"}
                            value={line.itemOrLedgerName}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleLineChange(idx, "itemOrLedgerName", val);
                              if (activeConfig.hasInventory) {
                                const matchedItem = localStockItems.find((si) => si.name?.toLowerCase() === val.toLowerCase());
                                if (matchedItem) {
                                  if (matchedItem.parentName) handleLineChange(idx, "stockGroup", matchedItem.parentName);
                                  if (matchedItem.categoryName) handleLineChange(idx, "stockCategory", matchedItem.categoryName);
                                  if (matchedItem.unitName) handleLineChange(idx, "unitOfMeasure", matchedItem.unitName);
                                  if (matchedItem.hsnSac) handleLineChange(idx, "hsnSacCode", matchedItem.hsnSac);
                                  if (matchedItem.defaultRate) handleLineChange(idx, "rate", matchedItem.defaultRate);
                                  if (matchedItem.gstRate !== undefined) handleLineChange(idx, "gstRate", matchedItem.gstRate);
                                  if (matchedItem.godownName) handleLineChange(idx, "godownName", matchedItem.godownName);
                                  if (matchedItem.batchName) handleLineChange(idx, "batchName", matchedItem.batchName);
                                }
                              }
                            }}
                            placeholder={activeConfig.hasInventory ? "Type or select Stock Item (e.g. Parryware Pedestal)..." : activeConfig.code === "CONTRA" ? "Destination Bank A/c..." : "e.g. Rent Expense / Audit Fee"}
                            style={{ width: "100%", padding: "5px 8px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px" }}
                          />
                        </td>
                        {activeConfig.hasInventory && (
                          <>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                list="stock-groups-list"
                                value={line.stockGroup || ""}
                                onChange={(e) => handleLineChange(idx, "stockGroup", e.target.value)}
                                placeholder="Stock Group"
                                style={{ width: "100%", padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                list="stock-categories-list"
                                value={line.stockCategory || ""}
                                onChange={(e) => handleLineChange(idx, "stockCategory", e.target.value)}
                                placeholder="Stock Category"
                                style={{ width: "100%", padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                value={line.hsnSacCode || ""}
                                onChange={(e) => handleLineChange(idx, "hsnSacCode", e.target.value)}
                                style={{ width: "100%", padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", fontFamily: "monospace" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                value={line.godownName || "Main Location"}
                                onChange={(e) => handleLineChange(idx, "godownName", e.target.value)}
                                style={{ width: "100%", padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                value={line.batchName || "BATCH-A1"}
                                onChange={(e) => handleLineChange(idx, "batchName", e.target.value)}
                                style={{ width: "100%", padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="number"
                                value={line.quantity || 1}
                                onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                                style={{ width: "100%", padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", textAlign: "right" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="number"
                                value={line.rate || 0}
                                onChange={(e) => handleLineChange(idx, "rate", e.target.value)}
                                style={{ width: "100%", padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", textAlign: "right" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="number"
                                value={line.discountPercentage || 0}
                                onChange={(e) => handleLineChange(idx, "discountPercentage", e.target.value)}
                                style={{ width: "100%", padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", textAlign: "right" }}
                              />
                            </td>
                          </>
                        )}
                        <td style={{ padding: "8px" }}>
                          <input
                            type="number"
                            required
                            value={line.taxableAmount}
                            onChange={(e) => handleLineChange(idx, "taxableAmount", e.target.value)}
                            style={{ width: "100%", padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", textAlign: "right", fontWeight: "700" }}
                          />
                        </td>
                        {activeConfig.code !== "CONTRA" && activeConfig.code !== "JOURNAL" && activeConfig.category !== "SPECIALIZED" && (
                          <>
                            <td style={{ padding: "8px" }}>
                              <select
                                value={line.gstRate || 0}
                                onChange={(e) => handleLineChange(idx, "gstRate", Number(e.target.value))}
                                style={{ width: "100%", padding: "5px 4px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px" }}
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                            </td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: "600", color: "var(--text)" }}>
                              ₹{((line.cgst || 0) + (line.sgst || 0) + (line.igst || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </>
                        )}
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: BANK & BILL ALLOCATIONS */}
          {activeTab === "BANK_BILL" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Bank Allocation Details */}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                  <CreditCard size={16} color="var(--accent)" />
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text)" }}>
                    Bank Instrument Allocation
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Instrument Type
                    </label>
                    <select
                      value={bankDetails.instrumentType}
                      onChange={(e) => setBankDetails({ ...bankDetails, instrumentType: e.target.value as any })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px" }}
                    >
                      <option value="e-Fund Transfer">e-Fund Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="Cheque">Cheque / Demand Draft</option>
                      <option value="UPI">UPI Transaction</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Instrument / Cheque #
                    </label>
                    <input
                      type="text"
                      value={bankDetails.instrumentNumber || ""}
                      onChange={(e) => setBankDetails({ ...bankDetails, instrumentNumber: e.target.value })}
                      placeholder="e.g. CHQ-991024 or UTR1298492"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Payment Favouring
                    </label>
                    <input
                      type="text"
                      value={bankDetails.favoringName || ""}
                      onChange={(e) => setBankDetails({ ...bankDetails, favoringName: e.target.value })}
                      placeholder="Beneficiary Account Name"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Bank IFSC Code
                    </label>
                    <input
                      type="text"
                      value={bankDetails.ifscCode || ""}
                      onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                      placeholder="SBIN0001824"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                {/* Cash Denominations (For Contra / Cash entries) */}
                {activeConfig.code === "CONTRA" && (
                  <div style={{ marginTop: "10px", borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--text)", display: "block", marginBottom: "8px" }}>
                      Cash Denominations Counter
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                      {cashDenominations.map((cd, cidx) => (
                        <div key={cd.denomination} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", padding: "4px 8px", borderRadius: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", width: "45px" }}>₹{cd.denomination} ×</span>
                          <input
                            type="number"
                            min="0"
                            value={cd.count}
                            onChange={(e) => {
                              const nextC = [...cashDenominations];
                              nextC[cidx] = { ...cd, count: Number(e.target.value) || 0 };
                              setCashDenominations(nextC);
                            }}
                            style={{ width: "45px", padding: "2px 4px", fontSize: "11px", textAlign: "right" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bill-Wise Settlement Allocations */}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileText size={16} color="var(--accent)" />
                    <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text)" }}>
                      Bill-Wise Allocation Details
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setBillAllocations([
                        ...billAllocations,
                        { id: `bill_${Date.now()}`, type: "Agst Ref", referenceName: `INV-${Date.now().toString().slice(-4)}`, amount: 500, drCr: "Dr" }
                      ])
                    }
                    style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "11.5px", fontWeight: "700", cursor: "pointer" }}
                  >
                    + Add Reference
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                  {billAllocations.map((bill, bidx) => (
                    <div key={bill.id} style={{ display: "grid", gridTemplateColumns: "100px 1.2fr 90px 45px 30px", gap: "6px", alignItems: "center" }}>
                      <select
                        value={bill.type}
                        onChange={(e) => {
                          const nb = [...billAllocations];
                          nb[bidx] = { ...bill, type: e.target.value as any };
                          setBillAllocations(nb);
                        }}
                        style={{ padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11px" }}
                      >
                        <option value="Agst Ref">Agst Ref</option>
                        <option value="Advance">Advance</option>
                        <option value="New Ref">New Ref</option>
                        <option value="On Account">On Account</option>
                      </select>
                      <input
                        type="text"
                        value={bill.referenceName}
                        onChange={(e) => {
                          const nb = [...billAllocations];
                          nb[bidx] = { ...bill, referenceName: e.target.value };
                          setBillAllocations(nb);
                        }}
                        placeholder="Ref # (e.g. INV-1002)"
                        style={{ padding: "5px 8px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px" }}
                      />
                      <input
                        type="number"
                        value={bill.amount}
                        onChange={(e) => {
                          const nb = [...billAllocations];
                          nb[bidx] = { ...bill, amount: Number(e.target.value) || 0 };
                          setBillAllocations(nb);
                        }}
                        style={{ padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px", textAlign: "right", fontWeight: "700" }}
                      />
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>{bill.drCr}</span>
                      <button
                        type="button"
                        onClick={() => setBillAllocations(billAllocations.filter((_, i) => i !== bidx))}
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STATUTORY TAXES, TDS/TCS & SURCHARGES */}
          {activeTab === "TAX_SURCHARGE" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Additional Surcharges & Trade Discounts */}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Truck size={16} color="var(--accent)" />
                    <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text)" }}>
                      Freight, Packaging & Surcharges
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSurcharges([
                        ...surcharges,
                        { id: `sur_${Date.now()}`, ledgerName: "Packaging Charges", isPreGst: true, isDiscount: false, amount: 0, gstRate: 18 }
                      ])
                    }
                    style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "11.5px", fontWeight: "700", cursor: "pointer" }}
                  >
                    + Add Charge
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {surcharges.map((sur, sidx) => (
                    <div key={sur.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 90px 70px 30px", gap: "6px", alignItems: "center" }}>
                      <input
                        type="text"
                        value={sur.ledgerName}
                        onChange={(e) => {
                          const ns = [...surcharges];
                          ns[sidx] = { ...sur, ledgerName: e.target.value };
                          setSurcharges(ns);
                        }}
                        style={{ padding: "5px 8px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px" }}
                      />
                      <input
                        type="number"
                        value={sur.amount}
                        onChange={(e) => {
                          const ns = [...surcharges];
                          ns[sidx] = { ...sur, amount: Number(e.target.value) || 0 };
                          setSurcharges(ns);
                        }}
                        placeholder="₹ Amount"
                        style={{ padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px", textAlign: "right" }}
                      />
                      <select
                        value={sur.isDiscount ? "DISC" : "ADD"}
                        onChange={(e) => {
                          const ns = [...surcharges];
                          ns[sidx] = { ...sur, isDiscount: e.target.value === "DISC" };
                          setSurcharges(ns);
                        }}
                        style={{ padding: "5px 4px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11px" }}
                      >
                        <option value="ADD">+ Add</option>
                        <option value="DISC">- Disc</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setSurcharges(surcharges.filter((_, i) => i !== sidx))}
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* TDS / TCS Statutory Withholding Section */}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                  <ShieldCheck size={16} color="var(--accent)" />
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text)" }}>
                    Statutory TDS / TCS Withholding (Section 194C / 194J / 206C)
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "80px 1.2fr 80px 90px", gap: "8px", alignItems: "center" }}>
                  <select
                    value={tdsTcsEntries[0]?.section || "194C"}
                    onChange={(e) => {
                      const nt = [...tdsTcsEntries];
                      nt[0] = { ...nt[0]!, section: e.target.value };
                      setTdsTcsEntries(nt);
                    }}
                    style={{ padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11px" }}
                  >
                    <option value="194C">194C (1%)</option>
                    <option value="194J">194J (10%)</option>
                    <option value="194I">194I (10%)</option>
                    <option value="194Q">194Q (0.1%)</option>
                    <option value="206C">206C (1H)</option>
                  </select>
                  <input
                    type="text"
                    value={tdsTcsEntries[0]?.deducteeLedger || ""}
                    onChange={(e) => {
                      const nt = [...tdsTcsEntries];
                      nt[0] = { ...nt[0]!, deducteeLedger: e.target.value };
                      setTdsTcsEntries(nt);
                    }}
                    placeholder="TDS Ledger Name"
                    style={{ padding: "5px 8px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11px" }}
                  />
                  <input
                    type="number"
                    value={tdsTcsEntries[0]?.ratePercentage || 1}
                    onChange={(e) => {
                      const nt = [...tdsTcsEntries];
                      nt[0] = { ...nt[0]!, ratePercentage: Number(e.target.value) || 0 };
                      setTdsTcsEntries(nt);
                    }}
                    placeholder="Rate %"
                    style={{ padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11px", textAlign: "right" }}
                  />
                  <input
                    type="number"
                    value={tdsTcsEntries[0]?.taxWithheldAmount || 0}
                    onChange={(e) => {
                      const nt = [...tdsTcsEntries];
                      nt[0] = { ...nt[0]!, taxWithheldAmount: Number(e.target.value) || 0 };
                      setTdsTcsEntries(nt);
                    }}
                    placeholder="Withheld (₹)"
                    style={{ padding: "5px 6px", borderRadius: "5px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px", textAlign: "right", fontWeight: "700" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYROLL & ATTENDANCE */}
          {activeTab === "PAYROLL_ATTENDANCE" && activeConfig.category === "SPECIALIZED" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
              <div style={{ background: "var(--surface)", borderRadius: "10px", border: "1px solid var(--line)", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text)" }}>
                  Employee Pay Head Allocations
                </span>
                {payrollAllocations.map((pay, pidx) => (
                  <div key={pay.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 90px 90px", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--text)" }}>{pay.payHeadName}</span>
                    <span style={{ fontSize: "11px", color: pay.type === "EARNING" ? "#10b981" : "#ef4444", fontWeight: "700" }}>{pay.type}</span>
                    <input
                      type="number"
                      value={pay.amount}
                      onChange={(e) => {
                        const np = [...payrollAllocations];
                        np[pidx] = { ...pay, amount: Number(e.target.value) || 0 };
                        setPayrollAllocations(np);
                      }}
                      style={{ padding: "4px 6px", fontSize: "12px", textAlign: "right", fontWeight: "700" }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--surface)", borderRadius: "10px", border: "1px solid var(--line)", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--text)" }}>
                  Attendance Recording (Days / Overtime)
                </span>
                {attendanceEntries.map((att, aidx) => (
                  <div key={att.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 70px 60px", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--text)" }}>{att.attendanceType}</span>
                    <input
                      type="number"
                      value={att.value}
                      onChange={(e) => {
                        const na = [...attendanceEntries];
                        na[aidx] = { ...att, value: Number(e.target.value) || 0 };
                        setAttendanceEntries(na);
                      }}
                      style={{ padding: "4px 6px", fontSize: "12px", textAlign: "right" }}
                    />
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>{att.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Narration & Calculation Summary Footer */}
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Narration / Accounting Remarks
              </label>
              <textarea
                rows={3}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Enter transaction narration, bank reference, or payment remarks..."
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", resize: "none" }}
              />
            </div>

            <div
              style={{
                background: "var(--surface-2)",
                borderRadius: "10px",
                border: "1px solid var(--line)",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                <span>Taxable Subtotal:</span>
                <span style={{ fontWeight: "700", color: "var(--text)" }}>₹{summary.taxableSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {summary.totalCgst > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                  <span>Central Tax (CGST):</span>
                  <span>₹{summary.totalCgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {summary.totalSgst > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                  <span>State Tax (SGST):</span>
                  <span>₹{summary.totalSgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {summary.totalIgst > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                  <span>Integrated Tax (IGST):</span>
                  <span>₹{summary.totalIgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {summary.totalTdsTcs > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}>
                  <span>TDS / TCS Withheld:</span>
                  <span>-₹{summary.totalTdsTcs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {Math.abs(summary.roundOff) > 0.001 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                  <span>Round Off:</span>
                  <span>₹{summary.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "6px",
                  borderTop: "1px solid var(--line)",
                  fontSize: "14px",
                  fontWeight: "900",
                  color: "var(--success)",
                }}
              >
                <span>Total Amount:</span>
                <span>₹{summary.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "8px 18px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 22px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                fontSize: "12.5px",
                fontWeight: "800",
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              <Send size={14} /> {isSubmitting ? "Posting..." : "Save Voucher to Tally Prime"}
            </button>
          </div>
        </form>

        {/* F10 Voucher Type Selector Popover Modal */}
        {isSelectorOpen && (
          <div
            onClick={() => setIsSelectorOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "540px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "20px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "var(--text)" }}>
                    Change Voucher Type (F10)
                  </h4>
                  <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                    Select from all 16 TallyPrime voucher types or press assigned shortcut
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSelectorOpen(false)}
                  style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Category Filter Chips */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["ALL", "ACCOUNTING", "INVENTORY", "ORDER", "SPECIALIZED"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                      background: activeCategory === cat ? "var(--accent)" : "var(--surface-2)",
                      color: activeCategory === cat ? "#fff" : "var(--muted)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <input
                autoFocus
                type="text"
                value={selectorSearch}
                onChange={(e) => setSelectorSearch(e.target.value)}
                placeholder="Search voucher type or shortcut (e.g. F8, Contra, Order)..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  fontSize: "12.5px",
                }}
              />

              {/* List */}
              <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {filteredVoucherDefs.map((v) => {
                  const isCurrent = v.code === selectedCode;
                  return (
                    <div
                      key={v.code}
                      onClick={() => {
                        setSelectedCode(v.code);
                        setVoucherNumber(`${v.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
                        setIsSelectorOpen(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: isCurrent ? "var(--accent-subtle)" : "var(--surface-2)",
                        border: isCurrent ? "1px solid var(--accent)" : "1px solid var(--line)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text)" }}>
                          {v.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {v.description}
                        </div>
                      </div>
                      <kbd
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--line)",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontFamily: "monospace",
                          color: "var(--accent)",
                          fontWeight: "800",
                          flexShrink: 0,
                        }}
                      >
                        {v.shortcut}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Inventory Master (Stock Items, Groups, Categories, Godowns, UoM, Batches) Modal */}
        <StockMasterModal
          isOpen={isStockMasterOpen}
          onClose={() => setIsStockMasterOpen(false)}
          activeCompanyId={activeCompanyId}
          activeCompanyName={activeCompanyName}
          onItemCreated={(newItem) => {
            setLocalStockItems((prev) => {
              if (prev.some((it) => it.name?.toLowerCase() === newItem.name?.toLowerCase())) return prev;
              return [...prev, newItem];
            });
          }}
        />

        {/* Voucher Print Service & Page Setup Modal */}
        <PrintSettingsModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          defaultFileName={`${activeConfig.name.replace(/\s+/g, "_")}_${voucherNumber}`}
          documentTitle={`${activeConfig.name} — ${voucherNumber}`}
          reportData={items.map((item, idx) => ({
            ItemOrLedger: item.itemOrLedgerName || `Line ${idx + 1}`,
            DrCr: item.drCr,
            Quantity: item.quantity,
            Unit: item.unitOfMeasure,
            Rate: item.rate,
            TaxableAmount: item.taxableAmount,
            GstRate: `${item.gstRate}%`,
            Total: item.taxableAmount * (1 + item.gstRate / 100)
          }))}
        />
      </div>
    </div>
  );
}
