import React, { useState, useEffect } from "react";
import {
  Package,
  Layers,
  MapPin,
  Tag,
  Hash,
  Scale,
  Calendar,
  Briefcase,
  X,
  Plus,
  Save,
  Check,
  RefreshCw,
  Search,
  AlertCircle
} from "lucide-react";
import { triggerToast } from "./ToastNotification";

export interface StockMasterModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly activeCompanyId: string;
  readonly activeCompanyName?: string;
  readonly onItemCreated?: (item: any) => void;
}

export function StockMasterModal({
  isOpen,
  onClose,
  activeCompanyId,
  activeCompanyName,
  onItemCreated,
}: StockMasterModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<"item" | "group" | "category" | "godown" | "uom" | "batch">("item");

  // Masters datasets
  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [stockCategories, setStockCategories] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states: Stock Item
  const [itemName, setItemName] = useState("");
  const [itemGroup, setItemGroup] = useState("Primary");
  const [itemCategory, setItemCategory] = useState("Primary Category");
  const [itemUom, setItemUom] = useState("pcs");
  const [itemHsn, setItemHsn] = useState("");
  const [itemRate, setItemRate] = useState<number>(0);
  const [itemGstRate, setItemGstRate] = useState<number>(18);
  const [itemGodown, setItemGodown] = useState("Main Location");
  const [itemBatch, setItemBatch] = useState("");
  const [itemMfgDate, setItemMfgDate] = useState("");
  const [itemExpDate, setItemExpDate] = useState("");
  const [itemJobCosting, setItemJobCosting] = useState("");
  const [itemOpeningQty, setItemOpeningQty] = useState("0 pcs");

  // Form states: Sub-masters
  const [simpleName, setSimpleName] = useState("");
  const [simpleParent, setSimpleParent] = useState("Primary");
  const [godownAddress, setGodownAddress] = useState("");
  const [uomFormal, setUomFormal] = useState("");
  const [batchStockItem, setBatchStockItem] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [batchMfg, setBatchMfg] = useState("");
  const [batchExp, setBatchExp] = useState("");
  const [batchQty, setBatchQty] = useState(0);
  const [batchRate, setBatchRate] = useState(0);

  // Load existing masters on mount or tab change
  const refreshMasters = async () => {
    try {
      if ((window as any).desktop?.accountingMirror) {
        const [groups, cats, gdns, uoms, items] = await Promise.all([
          (window as any).desktop.accountingMirror.listStockGroups?.(activeCompanyId).catch(() => []) || [],
          (window as any).desktop.accountingMirror.listStockCategories?.(activeCompanyId).catch(() => []) || [],
          (window as any).desktop.accountingMirror.listGodowns?.(activeCompanyId).catch(() => []) || [],
          (window as any).desktop.accountingMirror.listUnits?.(activeCompanyId).catch(() => []) || [],
          (window as any).desktop.accountingMirror.listInventoryItems?.(activeCompanyId).catch(() => []) || [],
        ]);
        setStockGroups(groups);
        setStockCategories(cats);
        setGodowns(gdns);
        setUnits(uoms);
        setInventoryItems(items);
      }
    } catch (e) {
      console.warn("Failed to load stock masters:", e);
    }
  };

  useEffect(() => {
    if (isOpen) void refreshMasters();
  }, [isOpen, activeCompanyId]);

  if (!isOpen) return null;

  // Handle Save
  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const mirror = (window as any).desktop?.accountingMirror;
      const compId = activeCompanyId || "default_company";

      if (activeTab === "item") {
        if (!itemName.trim()) throw new Error("Stock Item name is required.");
        const payload = {
          companyId: compId,
          name: itemName.trim(),
          parentName: itemGroup,
          categoryName: itemCategory,
          unitName: itemUom,
          hsnSac: itemHsn.trim(),
          defaultRate: Number(itemRate) || 0,
          gstRate: Number(itemGstRate) || 18,
          godownName: itemGodown,
          batchName: itemBatch.trim(),
          mfgDate: itemMfgDate,
          expDate: itemExpDate,
          jobCosting: itemJobCosting.trim(),
          openingQtyText: itemOpeningQty.trim(),
        };

        let saved: any = null;
        if (mirror?.saveInventoryItem) {
          saved = await mirror.saveInventoryItem(payload);
        }
        triggerToast(`Stock Item [${itemName}] created successfully!`, "success", "Inventory Master");
        onItemCreated?.(saved || payload);
        setItemName("");
        setItemHsn("");
        setItemBatch("");
      } else if (activeTab === "group") {
        if (!simpleName.trim()) throw new Error("Stock Group name is required.");
        if (mirror?.saveStockGroup) {
          await mirror.saveStockGroup({ companyId: compId, name: simpleName.trim(), parentName: simpleParent });
        }
        triggerToast(`Stock Group [${simpleName}] created!`, "success", "Stock Group");
        setSimpleName("");
      } else if (activeTab === "category") {
        if (!simpleName.trim()) throw new Error("Stock Category name is required.");
        if (mirror?.saveStockCategory) {
          await mirror.saveStockCategory({ companyId: compId, name: simpleName.trim(), parentName: simpleParent });
        }
        triggerToast(`Stock Category [${simpleName}] created!`, "success", "Stock Category");
        setSimpleName("");
      } else if (activeTab === "godown") {
        if (!simpleName.trim()) throw new Error("Godown / Location name is required.");
        if (mirror?.saveGodown) {
          await mirror.saveGodown({ companyId: compId, name: simpleName.trim(), parentName: simpleParent, locationAddress: godownAddress });
        }
        triggerToast(`Godown [${simpleName}] created!`, "success", "Godown Location");
        setSimpleName("");
        setGodownAddress("");
      } else if (activeTab === "uom") {
        if (!simpleName.trim()) throw new Error("Unit symbol is required.");
        if (mirror?.saveUnit) {
          await mirror.saveUnit({ companyId: compId, name: simpleName.trim(), formalName: uomFormal.trim() || simpleName.trim() });
        }
        triggerToast(`Unit of Measure [${simpleName}] created!`, "success", "Unit of Measure");
        setSimpleName("");
        setUomFormal("");
      } else if (activeTab === "batch") {
        if (!batchNumber.trim() || !batchStockItem.trim()) throw new Error("Batch Number and Stock Item are required.");
        if (mirror?.saveStockBatch) {
          await mirror.saveStockBatch({
            companyId: compId,
            stockItemName: batchStockItem.trim(),
            batchNumber: batchNumber.trim(),
            godownName: itemGodown,
            manufacturingDate: batchMfg,
            expiryDate: batchExp,
            openingQty: Number(batchQty) || 0,
            rate: Number(batchRate) || 0,
          });
        }
        triggerToast(`Batch [${batchNumber}] created for ${batchStockItem}!`, "success", "Stock Batch");
        setBatchNumber("");
      }

      await refreshMasters();
    } catch (err: any) {
      triggerToast(`Failed to save: ${err?.message || String(err)}`, "error", "Master Save Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10002,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "var(--surface)",
          borderRadius: "14px",
          border: "1px solid var(--line)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface-2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>
                Inventory Master & Stock Management
              </h3>
              <p style={{ margin: 0, fontSize: "11.5px", color: "var(--muted)" }}>
                Company: {activeCompanyName || "Active Workspace"} • Tally Standard Hierarchy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Master Type Sub-Navigation Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-2)",
            padding: "4px",
            gap: "2px",
            overflowX: "auto",
          }}
        >
          {[
            { id: "item", label: "Stock Item", icon: Package },
            { id: "group", label: "Stock Group", icon: Layers },
            { id: "category", label: "Category", icon: Tag },
            { id: "godown", label: "Godowns / Locations", icon: MapPin },
            { id: "uom", label: "Units of Measure (UoM)", icon: Scale },
            { id: "batch", label: "Batches & Expiry", icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "7px 11px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "11.5px",
                  fontWeight: isSel ? "700" : "500",
                  cursor: "pointer",
                  background: isSel ? "var(--surface)" : "transparent",
                  color: isSel ? "var(--accent)" : "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Master Creation Form */}
        <form onSubmit={handleSaveMaster} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "440px", overflowY: "auto" }}>
            {activeTab === "item" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Stock Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Parryware Pedestal Basin 22-inch"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      HSN / SAC Code
                    </label>
                    <input
                      type="text"
                      value={itemHsn}
                      onChange={(e) => setItemHsn(e.target.value)}
                      placeholder="6907"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontFamily: "monospace", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Stock Group
                    </label>
                    <input
                      type="text"
                      list="modal-stock-groups"
                      value={itemGroup}
                      onChange={(e) => setItemGroup(e.target.value)}
                      placeholder="Primary"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                    />
                    <datalist id="modal-stock-groups">
                      <option value="Primary" />
                      {stockGroups.map((g) => <option key={g.id || g.name} value={g.name} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Stock Category
                    </label>
                    <input
                      type="text"
                      list="modal-stock-cats"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      placeholder="Primary Category"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                    />
                    <datalist id="modal-stock-cats">
                      <option value="Primary Category" />
                      {stockCategories.map((c) => <option key={c.id || c.name} value={c.name} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Unit of Measure (UoM)
                    </label>
                    <input
                      type="text"
                      list="modal-uoms"
                      value={itemUom}
                      onChange={(e) => setItemUom(e.target.value)}
                      placeholder="pcs"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                    />
                    <datalist id="modal-uoms">
                      <option value="pcs" />
                      <option value="box" />
                      <option value="kgs" />
                      <option value="nos" />
                      {units.map((u) => <option key={u.id || u.name} value={u.name} />)}
                    </datalist>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Default Unit Rate (₹)
                    </label>
                    <input
                      type="number"
                      value={itemRate}
                      onChange={(e) => setItemRate(Number(e.target.value))}
                      placeholder="0.00"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", textAlign: "right", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      GST Rate %
                    </label>
                    <select
                      value={itemGstRate}
                      onChange={(e) => setItemGstRate(Number(e.target.value))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                    >
                      <option value={0}>0% (Exempt / Nil-Rated)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18% (Standard GST)</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Default Godown
                    </label>
                    <input
                      type="text"
                      list="modal-godowns"
                      value={itemGodown}
                      onChange={(e) => setItemGodown(e.target.value)}
                      placeholder="Main Location"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                    />
                    <datalist id="modal-godowns">
                      <option value="Main Location" />
                      {godowns.map((g) => <option key={g.id || g.name} value={g.name} />)}
                    </datalist>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Batch # / Lot
                    </label>
                    <input
                      type="text"
                      value={itemBatch}
                      onChange={(e) => setItemBatch(e.target.value)}
                      placeholder="BATCH-A1"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Mfg Date
                    </label>
                    <input
                      type="date"
                      value={itemMfgDate}
                      onChange={(e) => setItemMfgDate(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={itemExpDate}
                      onChange={(e) => setItemExpDate(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    Job Costing / Job Work Allocation
                  </label>
                  <input
                    type="text"
                    value={itemJobCosting}
                    onChange={(e) => setItemJobCosting(e.target.value)}
                    placeholder="e.g. Project Phase 2 - Machining Division"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>
              </>
            )}

            {/* Stock Group Form */}
            {activeTab === "group" && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    Stock Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={simpleName}
                    onChange={(e) => setSimpleName(e.target.value)}
                    placeholder="e.g. Sanitaryware, Hardware, Electronics..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    Under Parent Group
                  </label>
                  <input
                    type="text"
                    value={simpleParent}
                    onChange={(e) => setSimpleParent(e.target.value)}
                    placeholder="Primary"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>
              </>
            )}

            {/* Stock Category Form */}
            {activeTab === "category" && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    Stock Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={simpleName}
                    onChange={(e) => setSimpleName(e.target.value)}
                    placeholder="e.g. Ceramic, Stainless Steel, PVC..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    Under Parent Category
                  </label>
                  <input
                    type="text"
                    value={simpleParent}
                    onChange={(e) => setSimpleParent(e.target.value)}
                    placeholder="Primary Category"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>
              </>
            )}

            {/* Godown Form */}
            {activeTab === "godown" && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    Godown / Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={simpleName}
                    onChange={(e) => setSimpleName(e.target.value)}
                    placeholder="e.g. Warehouse 4B, Factory Floor, Central Godown..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    Location Address
                  </label>
                  <input
                    type="text"
                    value={godownAddress}
                    onChange={(e) => setGodownAddress(e.target.value)}
                    placeholder="Plot 12, Industrial Area, Sector 5"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>
              </>
            )}

            {/* UoM Form */}
            {activeTab === "uom" && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    Symbol *
                  </label>
                  <input
                    type="text"
                    required
                    value={simpleName}
                    onChange={(e) => setSimpleName(e.target.value)}
                    placeholder="e.g. pcs, box, kgs, ltr, mtr"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                    Formal Name
                  </label>
                  <input
                    type="text"
                    value={uomFormal}
                    onChange={(e) => setUomFormal(e.target.value)}
                    placeholder="Pieces, Boxes, Kilograms..."
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>
              </>
            )}

            {/* Batch Form */}
            {activeTab === "batch" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Stock Item *
                    </label>
                    <input
                      type="text"
                      required
                      list="batch-modal-stock-items"
                      value={batchStockItem}
                      onChange={(e) => setBatchStockItem(e.target.value)}
                      placeholder="Select Stock Item..."
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", boxSizing: "border-box" }}
                    />
                    <datalist id="batch-modal-stock-items">
                      {inventoryItems.map((si) => <option key={si.id || si.name} value={si.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Batch Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="BATCH-2026-X1"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Mfg Date
                    </label>
                    <input
                      type="date"
                      value={batchMfg}
                      onChange={(e) => setBatchMfg(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={batchExp}
                      onChange={(e) => setBatchExp(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "11.5px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--line)",
              background: "var(--surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: "transparent",
                border: "1px solid var(--line)",
                color: "var(--muted)",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Close
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#FFFFFF",
                border: "none",
                fontSize: "12px",
                fontWeight: "700",
                cursor: isSubmitting ? "wait" : "pointer",
              }}
            >
              <Save size={14} />
              <span>{isSubmitting ? "Saving Master..." : `Save ${activeTab.toUpperCase()}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StockMasterModal;
