import React, { useEffect, useState, useRef } from "react";
import { DashboardView } from "./DashboardView";
import { CompaniesView } from "./CompaniesView";
import { TransactionsView } from "./TransactionView";
import { ReconciliationView } from "./ReconciliationView";
import { GstView } from "./GstView";
import { ReportsView } from "./ReportsView";
import { SettingsView } from "./SettingsView";
import logoUrl from "../assets/logo.png";
import splashUrl from "../assets/splash.png";
import { ImportToolbar } from "../components/ImportToolbar";
import { ExportToolbar } from "../components/ExportToolbar";
import { UnifiedDataToolbar } from "../components/UnifiedDataToolbar";
import { GlobalSearchModal } from "../components/GlobalSearchModal";
import { BankStatementImportView } from "./BankStatementImportView";
import { BillImportView } from "./BillImportView";
import { LedgersView } from "./LedgersView";

import CompanySwitcher from "../components/CompanySelector";
import PeriodSelector from "../components/PeriodSelector"; 
import { CompanyPeriodSelector } from "../components/CompanyPeriodSelector";
import { LlmSidePanel } from "../components/LlmSidePanel"; 
import { CompanyLockModal } from "../components/CompanyLockModal";
import { VoucherCreationModal } from "../components/VoucherCreationModal"; 
import { triggerToast } from "../components/ToastNotification"; 

import {
  LayoutDashboard,
  Building2,
  FileText,
  BookOpen,
  Sparkles,
  Activity,
  Calendar,
  Server,
  ArrowLeftRight,
  Scale,
  ShieldCheck,
  ChevronsLeft,
  Cpu,
  IndianRupee,
  RefreshCw,
  BarChart3,
  FolderOpen,
  Bell,
  Settings,
  Database,
  Receipt,
  User,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  Network,
  Search,
  type LucideIcon,
} from "lucide-react";

type DesktopAppInfo = { readonly appName: string; readonly appVersion: string; readonly platform: string; readonly mode: string };
type ConnectorCapabilityStatus = { readonly localConnectorAvailable: boolean; readonly tallyLocalIntegrationAvailable: boolean; readonly reason: string };
type DeviceIdentity = { readonly id: string; readonly deviceName: string };
type ConnectorSettings = { readonly tallyHost: string; readonly tallyPort: number; readonly enableLocalTallyConnector: boolean; readonly enableBackgroundSync: boolean; readonly rawPayloadRetentionDays: number };
type CredentialAvailability = { readonly cloudAccessTokenAvailable: boolean; readonly cloudRefreshTokenAvailable: boolean; readonly connectorDeviceTokenAvailable: boolean };
type TallyConnectionState = { readonly status: string; readonly host: string; readonly port: number; readonly checkedAt: string; readonly companies?: readonly { readonly name: string }[]; readonly reason?: string };
type TallyCompanyListResult = { readonly ok: boolean; readonly requestXml: string; readonly responseXml: string | null; readonly data?: readonly { readonly name: string }[]; readonly error?: string };
type SyncCommand = { readonly commandId: string; readonly commandType: string; readonly payloadJson: string; readonly status: string; readonly attempts: number; readonly createdAt: string; readonly updatedAt: string; readonly lastError: string | null };
type ConnectorRunResult = { readonly command: SyncCommand | null; readonly executed: boolean; readonly message: string };
type BackendSettings = { readonly apiBaseUrl: string | null; readonly websocketUrl: string | null };
type ConnectorPairing = { readonly status: string; readonly connectorId: string | null; readonly workspaceId: string | null };
type MirrorStats = { readonly companies: number; readonly ledgers: number; readonly voucherTypes: number; readonly vouchers: number; readonly mappings: number };
type MirrorCompany = { readonly id: string; readonly displayName: string; readonly sourceProvider: string };
type MirrorLedger = { readonly id: string; readonly name: string; readonly parentName: string | null };
type MirrorVoucher = { readonly id: string; readonly voucherTypeName: string | null; readonly voucherNumber: string | null; readonly voucherDate: string | null };
type DocumentItem = { readonly id: string; readonly originalFileName: string; readonly storedFilePath: string; readonly mimeType: string; readonly byteSize: number; readonly status: string };
type DocumentExtraction = { readonly id: string; readonly documentId: string; readonly rawOcrText: string; readonly partyName: string | null; readonly partyGstin: string | null; readonly invoiceNumber: string | null; readonly invoiceDate: string | null; readonly taxableAmount: number | null; readonly cgstAmount: number | null; readonly sgstAmount: number | null; readonly igstAmount: number | null; readonly totalAmount: number | null; readonly confidenceScore: number };
type DraftVoucher = { readonly id: string; readonly documentId: string; readonly voucherTypeName: string; readonly voucherDate: string; readonly voucherNumber: string | null; readonly partyName: string; readonly taxableAmount: number; readonly cgstAmount: number; readonly sgstAmount: number; readonly igstAmount: number; readonly totalAmount: number; readonly status: string; readonly validationStatus: string; readonly validationErrors: readonly string[] };

const navigationItems = [
  "Dashboard",
  "Companies",
  "Ledgers",
  "Documents",
  "Invoice & Bills",
  "Vouchers",
  "Reconciliation",
  "GST",
  "Reports",
  "Settings"
] as const;

export function App(): React.JSX.Element {
  const [activeItem, setActiveItem] = useState<(typeof navigationItems)[number]>("Dashboard");
  const [appInfo, setAppInfo] = useState<DesktopAppInfo | null>(null);
  const [connectorStatus, setConnectorStatus] = useState<ConnectorCapabilityStatus | null>(null);
  const [deviceIdentity, setDeviceIdentity] = useState<DeviceIdentity | null>(null);
  const [connectorSettings, setConnectorSettings] = useState<ConnectorSettings | null>(null);
  const [credentialAvailability, setCredentialAvailability] = useState<CredentialAvailability | null>(null);
  const [tallyConnectionState, setTallyConnectionState] = useState<TallyConnectionState | null>(null);
  const [tallyCompanyListResult, setTallyCompanyListResult] = useState<TallyCompanyListResult | null>(null);
  const [tallyActionPending, setTallyActionPending] = useState(false);
  const [syncCommands, setSyncCommands] = useState<readonly SyncCommand[]>([]);
  const [syncRunResult, setSyncRunResult] = useState<ConnectorRunResult | null>(null);
  const [syncActionPending, setSyncActionPending] = useState(false);
  const [backendSettings, setBackendSettings] = useState<BackendSettings | null>(null);
  const [connectorPairing, setConnectorPairing] = useState<ConnectorPairing | null>(null);
  const [backendActionPending, setBackendActionPending] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [mirrorStats, setMirrorStats] = useState<MirrorStats | null>(null);
  const [mirrorCompanies, setMirrorCompanies] = useState<readonly MirrorCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mirrorLedgers, setMirrorLedgers] = useState<readonly MirrorLedger[]>([]);
  const [stockItems, setStockItems] = useState<readonly any[]>([]);
  const [mirrorVouchers, setMirrorVouchers] = useState<readonly MirrorVoucher[]>([]);
  const [documents, setDocuments] = useState<readonly DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeExtraction, setActiveExtraction] = useState<DocumentExtraction | null>(null);
  const [activeDraft, setActiveDraft] = useState<DraftVoucher | null>(null);
const [settingsDefaultTab, setSettingsDefaultTab] = useState<string>("general");
  const [bankTxs, setBankTxs] = useState<readonly any[]>([]);
  const [gstr2bRecords, setGstr2bRecords] = useState<readonly any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [busyStatus, setBusyStatus] = useState<any>(null);
  const [ocrPending, setOcrPending] = useState(false);
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("theme") as "light" | "dark") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    if (window.desktop?.preferences?.set) {
      void window.desktop.preferences.set("app.theme", theme).catch(() => {});
    }
  }, [theme]);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const [unlockedCompanyIds, setUnlockedCompanyIds] = useState<Set<string>>(new Set());
  const [pendingLockedCompany, setPendingLockedCompany] = useState<{ id: string; name: string } | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherModalCode, setVoucherModalCode] = useState<string>("PAYMENT");

  const [showSplash, setShowSplash] = useState(true);
  const [splashFadeOut, setSplashFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashFadeOut(true);
      const hideTimer = setTimeout(() => {
        setShowSplash(false);
      }, 500);
      return () => clearTimeout(hideTimer);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const [userFullName, setUserFullName] = useState<string>("User");
  const [username, setUsername] = useState<string>("user");
  const [userRole, setUserRole] = useState<string>("Principal Auditor / Administrator");

  // Global F4-F10 Shortcut Listener
  useEffect(() => {
    function handleGlobalKeys(e: KeyboardEvent) {
      // Don't trigger if typing in text inputs or textareas
      const target = e.target as HTMLElement;
      if (target && /input|textarea|select/i.test(target.tagName)) return;

      let code: string | null = null;
      if (e.key === "F4" && !e.ctrlKey && !e.altKey) code = "CONTRA";
      else if (e.key === "F4" && e.ctrlKey) code = "PAYROLL";
      else if (e.key === "F5" && !e.ctrlKey && !e.altKey) code = "PAYMENT";
      else if (e.key === "F5" && e.ctrlKey) code = "ATTENDANCE";
      else if (e.key === "F6" && !e.ctrlKey && !e.altKey) code = "RECEIPT";
      else if (e.key === "F6" && e.ctrlKey) code = "REJECTIONS_IN";
      else if (e.key === "F6" && e.altKey) code = "REJECTIONS_OUT";
      else if (e.key === "F7" && !e.ctrlKey && !e.altKey) code = "JOURNAL";
      else if (e.key === "F7" && e.ctrlKey) code = "PHYSICAL_STOCK";
      else if (e.key === "F7" && e.altKey) code = "STOCK_JOURNAL";
      else if (e.key === "F8" && !e.ctrlKey && !e.altKey) code = "SALES";
      else if (e.key === "F8" && e.ctrlKey) code = "CREDIT_NOTE";
      else if (e.key === "F8" && e.altKey) code = "DELIVERY_NOTE";
      else if (e.key === "F9" && !e.ctrlKey && !e.altKey) code = "PURCHASE";
      else if (e.key === "F9" && e.ctrlKey) code = "DEBIT_NOTE";
      else if (e.key === "F9" && e.altKey) code = "RECEIPT_NOTE";
      else if (e.key === "F10") code = "PAYMENT";

      if (code) {
        e.preventDefault();
        setVoucherModalCode(code);
        setIsVoucherModalOpen(true);
      }
    }

    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  // Dropdown states & refs for closing on outside click
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationTray, setShowNotificationTray] = useState(false);
  const [showLlmChat, setShowLlmChat] = useState(() => {
    return localStorage.getItem("app.showLlmChat") === "true";
  });
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Dynamic Real-Time System Notifications State
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: "success" | "warning" | "info" | "error";
    title: string;
    message: string;
    time: string;
    read: boolean;
    category: "SYNC" | "VOUCHER" | "BANK" | "GST" | "SYSTEM";
  }>>([
    {
      id: "notif_init_1",
      type: "success",
      title: "SQLite Mirror Online",
      message: "Local SQLite database synchronized with enterprise accounting repository.",
      time: "Just now",
      read: false,
      category: "SYSTEM",
    },
    {
      id: "notif_init_2",
      type: "info",
      title: "Connector Engine Ready",
      message: "TallyPrime XML bridge listening on port 9000 for instant two-way synchronization.",
      time: "2 mins ago",
      read: false,
      category: "SYNC",
    },
  ]);

  const addNotification = (
    title: string,
    message: string,
    type: "success" | "warning" | "info" | "error" = "info",
    category: "SYNC" | "VOUCHER" | "BANK" | "GST" | "SYSTEM" = "SYSTEM"
  ) => {
    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type,
      title,
      message,
      time: "Just now",
      read: false,
      category,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
    triggerToast(message, type, title);
  };
const [selectedFy, setSelectedFy] = useState<string>("FY 2026-27");
const [selectedQuarter, setSelectedQuarter] = useState<string>("ALL");
const [fromDate, setFromDate] = useState<string>("");
const [toDate, setToDate] = useState<string>("");

  const getFinancialYears = () => [
    { value: "ALL", label: "All Periods (Unified)" },
    { value: "FY 2026-27", label: "FY 2026-27" },
    { value: "FY 2025-26", label: "FY 2025-26" },
    { value: "FY 2024-25", label: "FY 2024-25" },
    { value: "FY 2023-24", label: "FY 2023-24" },
    { value: "FY 2022-23", label: "FY 2022-23" },
    { value: "FY 2021-22", label: "FY 2021-22" },
    { value: "FY 2020-21", label: "FY 2020-21" },
    { value: "FY 2019-20", label: "FY 2019-20" },
    { value: "FY 2018-19", label: "FY 2018-19" },
    { value: "FY 2017-18", label: "FY 2017-18" }
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadDesktopState(): Promise<void> {
      if (!window.desktop) {
        return;
      }

      try {
        const [info, capability] = await Promise.all([
          window.desktop.app.getInfo().catch(() => null),
          window.desktop.connector.getCapabilityStatus().catch(() => null),
        ]);
        const [device, settings, credentials] = await Promise.all([
          window.desktop.device.getIdentity().catch(() => null),
          window.desktop.settings.getConnectorSettings().catch(() => null),
          window.desktop.credentials.getAvailability().catch(() => null),
        ]);
        const commands = await window.desktop.sync.listRecentCommands().catch(() => []);
        const [backend, pairing] = await Promise.all([
          window.desktop.backend.getSettings().catch(() => null),
          window.desktop.backend.getPairing().catch(() => null),
        ]);
        const stats = await window.desktop.accountingMirror.getStats().catch(() => null);

        if (!cancelled) {
          if (info) setAppInfo(info);
          if (capability) setConnectorStatus(capability);
          if (device) setDeviceIdentity(device);
          if (settings) setConnectorSettings(settings);
          if (credentials) setCredentialAvailability(credentials);
          setSyncCommands(commands);
          if (backend) setBackendSettings(backend);
          if (pairing) setConnectorPairing(pairing);
          if (stats) setMirrorStats(stats);

          const companies = await window.desktop.accountingMirror.listCompanies().catch(() => []);
          setMirrorCompanies(companies);
          if (companies.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(companies[0].id);
          }
          const docs = await window.desktop.documents.listRecent().catch(() => []);
          setDocuments(docs);

          const [ledgers, vouchers, btxs, g2b] = await Promise.all([
            window.desktop.accountingMirror.listLedgers().catch(() => []),
            window.desktop.accountingMirror.listVouchers(undefined, 500).catch(() => []),
            window.desktop.accountingMirror.listBankTransactions().catch(() => []),
            window.desktop.accountingMirror.listGstr2bRecords().catch(() => []),
          ]);
          setMirrorLedgers(ledgers);
          setMirrorVouchers(vouchers);
          setBankTxs(btxs);
          setGstr2bRecords(g2b);

          // Restore UI Preferences from SQLite
          if (window.desktop.preferences) {
            try {
              const prefs = await window.desktop.preferences.getAll();
              if (prefs["app.activeItem"] && navigationItems.includes(prefs["app.activeItem"] as any)) {
                setActiveItem(prefs["app.activeItem"] as any);
              }
              if (prefs["app.selectedFy"]) setSelectedFy(prefs["app.selectedFy"]);
              if (prefs["app.selectedQuarter"]) setSelectedQuarter(prefs["app.selectedQuarter"]);
              if (prefs["app.fromDate"] !== undefined) setFromDate(prefs["app.fromDate"]);
              if (prefs["app.toDate"] !== undefined) setToDate(prefs["app.toDate"]);
              if (prefs["app.selectedCompanyId"]) {
                const targetComp = companies.find((c: any) => c.id === prefs["app.selectedCompanyId"]);
                if (targetComp?.passwordHash) {
                  setPendingLockedCompany({ id: targetComp.id, name: targetComp.displayName || targetComp.name });
                }
                setSelectedCompanyId(prefs["app.selectedCompanyId"]);
              } else if (companies.length > 0) {
                const first = companies[0];
                if (first?.passwordHash) {
                  setPendingLockedCompany({ id: first.id, name: first.displayName || first.name });
                }
              }
              if (prefs["app.isSidebarCollapsed"] !== undefined) {
                setIsSidebarCollapsed(prefs["app.isSidebarCollapsed"] === "true");
              }
              if (prefs["app.theme"] === "light" || prefs["app.theme"] === "dark") {
                setTheme(prefs["app.theme"]);
              }
              if (prefs["user.fullName"]) {
                setUserFullName(prefs["user.fullName"]);
              }
              if (prefs["user.username"]) {
                setUsername(prefs["user.username"]);
              }
              if (prefs["user.role"]) {
                setUserRole(prefs["user.role"]);
              }
            } catch (prefErr) {
              console.warn("Failed to restore preferences from SQLite:", prefErr);
            }
          } else if (companies.length > 0 && companies[0]?.passwordHash) {
            setPendingLockedCompany({ id: companies[0].id, name: companies[0].displayName || companies[0].name });
          }
        }
      } catch (err) {
        console.error("loadDesktopState error:", err);
      }
    }

    void loadDesktopState();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save Top-Level App UI State to SQLite on change
  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("app.activeItem", activeItem);
  }, [activeItem]);

  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("app.selectedFy", selectedFy);
  }, [selectedFy]);

  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("app.selectedQuarter", selectedQuarter);
  }, [selectedQuarter]);

  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("app.fromDate", fromDate);
  }, [fromDate]);

  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("app.toDate", toDate);
  }, [toDate]);

  useEffect(() => {
    if (!window.desktop?.preferences || !selectedCompanyId) return;
    void window.desktop.preferences.set("app.selectedCompanyId", selectedCompanyId);
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("app.isSidebarCollapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("app.theme", theme);
  }, [theme]);


  // Immediately clear and re-fetch company-scoped accounting data on company switch or mirror stats change
  useEffect(() => {
    if (!window.desktop) return;
    let cancelled = false;

    async function loadCompanyData() {
      // Clear data immediately when company changes to prevent cross-company leakage
      setMirrorLedgers([]);
      setStockItems([]);
      setMirrorVouchers([]);
      setBankTxs([]);
      setGstr2bRecords([]);

      const targetCompanyId = selectedCompanyId && selectedCompanyId !== "ALL" ? selectedCompanyId : undefined;
      const [ledgers, items, vouchers, btxs, g2b] = await Promise.all([
        window.desktop?.accountingMirror?.listLedgers(targetCompanyId || "ALL") ?? Promise.resolve([]),
        window.desktop?.accountingMirror?.listInventoryItems(targetCompanyId) ?? Promise.resolve([]),
        window.desktop?.accountingMirror?.listVouchers(targetCompanyId || "ALL", 500) ?? Promise.resolve([]),
        window.desktop?.accountingMirror?.listBankTransactions(targetCompanyId) ?? Promise.resolve([]),
        window.desktop?.accountingMirror?.listGstr2bRecords(targetCompanyId) ?? Promise.resolve([]),
      ]);

      if (!cancelled) {
        setMirrorLedgers(ledgers);
        setStockItems(items);
        setMirrorVouchers(vouchers);
        setBankTxs(btxs);
        setGstr2bRecords(g2b);
      }
    }

    void loadCompanyData();
    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId, mirrorStats]);

  // Period & date filtering effect on top of company-scoped vouchers
  useEffect(() => {
    let cancelled = false;

    async function loadAndFilterData() {
      try {
        let rawVouchers: any[] = [];
        const targetCompanyId = selectedCompanyId && selectedCompanyId !== "ALL" ? selectedCompanyId : undefined;

        if (window.desktop) {
          rawVouchers = await window.desktop.accountingMirror.listVouchers(targetCompanyId || "ALL", 500).catch(() => []);
        }

        if (cancelled) return;

        // Calculate start and end date boundaries based on selectedFy, selectedQuarter, or custom inputs
        let startTimestamp = 0;
        let endTimestamp = Number.MAX_SAFE_INTEGER;

        if (fromDate) startTimestamp = new Date(fromDate).getTime();
        if (toDate) endTimestamp = new Date(toDate).setHours(23, 59, 59, 999);

        // If not custom mode, compute boundaries from Financial Year & Quarter presets
        if (!fromDate && !toDate && selectedQuarter !== "CUSTOM") {
          if (selectedFy === "ALL" || selectedFy === "All Periods (Unified)") {
            startTimestamp = 0;
            endTimestamp = Number.MAX_SAFE_INTEGER;
          } else {
            const cleanFy = selectedFy.replace(/FY\s*/i, "").trim();
            const parts = cleanFy.split("-");
            let startYear = 2026;
            if (parts.length >= 1) {
              const yrStr = parts[0].trim();
              startYear = yrStr.length === 2 ? parseInt("20" + yrStr, 10) : parseInt(yrStr, 10);
            }

            const fyStartMonth = 3; // April (0-indexed: 3)
            const fyStartDate = new Date(startYear, fyStartMonth, 1).getTime();
            const fyEndDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999).getTime();

            if (selectedQuarter === "ALL") {
              startTimestamp = fyStartDate;
              endTimestamp = fyEndDate;
            } else {
              const qMap: Record<string, [number, number]> = {
                Q1: [new Date(startYear, 3, 1).getTime(), new Date(startYear, 5, 30, 23, 59, 59, 999).getTime()],
                Q2: [new Date(startYear, 6, 1).getTime(), new Date(startYear, 8, 30, 23, 59, 59, 999).getTime()],
                Q3: [new Date(startYear, 9, 1).getTime(), new Date(startYear, 11, 31, 23, 59, 59, 999).getTime()],
                Q4: [new Date(startYear + 1, 0, 1).getTime(), new Date(startYear + 1, 2, 31, 23, 59, 59, 999).getTime()],
              };
              if (qMap[selectedQuarter]) {
                startTimestamp = qMap[selectedQuarter][0];
                endTimestamp = qMap[selectedQuarter][1];
              }
            }
          }
        }

        // Filter vouchers matching the calculated time boundaries
        let filteredVouchers = rawVouchers.filter((v: any) => {
          const dateStr = v.voucherDate || v.date || v.transactionDate;
          if (!dateStr) return true;
          const vTime = new Date(dateStr).getTime();
          return vTime >= startTimestamp && vTime <= endTimestamp;
        });

        // Resilience: If filter wiped out all vouchers but raw vouchers exist outside current FY preset,
        // fallback to showing rawVouchers rather than leaving register empty
        if (filteredVouchers.length === 0 && rawVouchers.length > 0 && !fromDate && !toDate) {
          filteredVouchers = rawVouchers;
        }


        if (!cancelled) {
          setMirrorVouchers(filteredVouchers);
        }
      } catch (err) {
        console.error("Error filtering data by period:", err);
      }
    }

    void loadAndFilterData();
    return () => {
      cancelled = true;
    };
  }, [selectedFy, selectedQuarter, fromDate, toDate, selectedCompanyId]);
  async function pickAndImportDocs(_userFile?: File) {
    console.log("[App] pickAndImportDocs triggered.");

    if (!window.desktop) {
      console.warn("[App] window.desktop API unavailable.");
      return;
    }

    try {
      console.log("[App] Opening native file picker dialog via Electron IPC...");
      const imported = await window.desktop.documents.pickAndImport();
      console.log("[App] File picker result:", imported);
      if (imported.length > 0) {
        const docs = await window.desktop.documents.listRecent();
        console.log("[App] Updated documents list count:", docs.length);
        setDocuments(docs);
        const newlyImportedId = imported[0]?.id;
        if (newlyImportedId) {
          console.log("[App] Auto-triggering OCR processing for document:", newlyImportedId);
          void runOcr(newlyImportedId);
        }
      } else {
        console.log("[App] File selection cancelled or no files chosen.");
      }
    } catch (err) {
      console.error("[App] pickAndImportDocs IPC error:", err);
    }
  }

  async function runOcr(documentId: string) {
    console.log("[App] Starting OCR extraction pipeline for document ID:", documentId);
    if (!window.desktop) {
      console.warn("[App] window.desktop unavailable for runOcr.");
      return;
    }
    setOcrPending(true);
    try {
      const extraction = await window.desktop.documents.processOcr(documentId);
      console.log("[App] OCR extraction result:", extraction);
      setActiveExtraction(extraction);
      const draft = await window.desktop.documents.generateDraftVoucher(documentId, selectedCompanyId ?? undefined);
      console.log("[App] Draft voucher generated:", draft);
      setActiveDraft(draft);
      setSelectedDocId(documentId);
      setDocuments(await window.desktop.documents.listRecent());
    } catch (err) {
      console.error("[App] runOcr error for document " + documentId + ":", err);
    } finally {
      setOcrPending(false);
    }
  }
  
  async function refreshBankData() {
    if (!window.desktop) return;
    try {
      const updatedTxs = await window.desktop.accountingMirror.listBankTransactions();
      console.log("[App] Bank feed updated count:", updatedTxs.length);
      setBankTxs(updatedTxs);
    } catch (err) {
      console.error("[App] refreshBankData error:", err);
    }
  }

  async function syncBankLedgerToTally(bankName: string) {
    if (!window.desktop) return;
    setSyncActionPending(true);
    try {
      if (mirrorCompanies.length === 0) throw new Error("No Tally company is available in the accounting mirror.");
      const companyName = mirrorCompanies[0].displayName;
      await window.desktop.sync.pushLedgerToTally(companyName, {
        name: bankName,
        parentGroup: "Bank Accounts",
      });
      setSyncCommands(await window.desktop.sync.listRecentCommands());
    } finally {
      setSyncActionPending(false);
    }
  }

  async function postBankTxToTally(tx: any) {
    if (!window.desktop) return;
    setSyncActionPending(true);
    try {
      if (mirrorCompanies.length === 0) throw new Error("No Tally company is available in the accounting mirror.");
      const companyName = mirrorCompanies[0].displayName;
      const isReceipt = tx.credit > 0;
      await window.desktop.sync.pushVoucherToTally(companyName, {
        date: tx.transactionDate,
        voucherTypeName: isReceipt ? "Receipt" : "Payment",
        partyName: tx.description,
        amount: isReceipt ? tx.credit : tx.debit,
        narration: `Auto-posted from Bank Statement (${tx.bankName}) Ref: ${tx.referenceNo ?? "N/A"}`,
      });
      setSyncCommands(await window.desktop.sync.listRecentCommands());
    } finally {
      setSyncActionPending(false);
    }
  }

  async function refreshGstr2bData() {
    if (!window.desktop) return;
    setGstr2bRecords(await window.desktop.accountingMirror.listGstr2bRecords());
  }

  async function handleImportTallyXmlDump(event: React.ChangeEvent<HTMLInputElement>) {
    if (!window.desktop) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const companyName = mirrorCompanies.length > 0 ? mirrorCompanies[0].displayName : "Imported Company";
    const res = await window.desktop?.accountingMirror?.importTallyXmlDump(companyName, text);
    if (res) {
      alert(`Successfully imported Tally XML Data Dump! Ledgers: ${res.ledgers}, Vouchers: ${res.vouchers}, Parties: ${res.parties}`);
      setMirrorStats(await window.desktop.accountingMirror.getStats());
      setMirrorCompanies(await window.desktop.accountingMirror.listCompanies());
    }
  }

  async function generateDraft(documentId: string) {
    if (!window.desktop) return;
    setOcrPending(true);
    try {
      const draft = await window.desktop.documents.generateDraftVoucher(documentId, selectedCompanyId ?? undefined);
      setActiveDraft(draft);
      setSelectedDocId(documentId);
      setDocuments(await window.desktop.documents.listRecent());
    } finally {
      setOcrPending(false);
    }
  }

  async function approveDraft(documentId: string) {
    if (!window.desktop) return;
    setOcrPending(true);
    try {
      const approved = await window.desktop.documents.approveDraftVoucher(documentId);
      setActiveDraft(approved);
      setDocuments(await window.desktop.documents.listRecent());
    } finally {
      setOcrPending(false);
    }
  }

  async function pushToSyncQueue(draft: NonNullable<typeof activeDraft>) {
    if (!window.desktop) return;
    setSyncActionPending(true);
    try {
      if (mirrorCompanies.length === 0) throw new Error("No Tally company is available in the accounting mirror.");
      const companyName = mirrorCompanies[0].displayName;
      await window.desktop.sync.pushVoucherToTally(companyName, {
        date: draft.voucherDate,
        voucherTypeName: draft.voucherTypeName,
        voucherNumber: draft.voucherNumber ?? undefined,
        partyName: draft.partyName,
        amount: draft.totalAmount,
      });
      setSyncCommands(await window.desktop.sync.listRecentCommands());
      setMirrorStats(await window.desktop.accountingMirror.getStats());
    } finally {
      setSyncActionPending(false);
    }
  }

  const navIcons: Record<string, LucideIcon> = {
    "Dashboard": LayoutDashboard,
    "Companies": Building2,
    "Ledgers": BookOpen,
    "Documents": FileText,
    "Invoice & Bills": Receipt,
    "Vouchers": ArrowLeftRight,
    "Reconciliation": Scale,
    "GST": IndianRupee,
    "Reports": BarChart3,
    "Settings": Settings
  };

  return (
    <>
      {showSplash && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: splashFadeOut ? 0 : 1,
            transform: splashFadeOut ? "scale(1.03)" : "scale(1)",
            transition: "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: splashFadeOut ? "none" : "auto",
            userSelect: "none",
          }}
        >
          {/* Subtle ambient background glow */}
          <div
            style={{
              position: "absolute",
              width: "500px",
              height: "280px",
              background: "radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, rgba(6, 182, 212, 0.1) 40%, transparent 70%)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          {/* Splash banner graphic */}
          <div
            style={{
              position: "relative",
              maxWidth: "620px",
              width: "82vw",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <img
              src={splashUrl}
              alt="ReconcAILe Hub"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 12px 30px rgba(0, 0, 0, 0.6))",
              }}
            />

            {/* Modern launch progress indicator */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                marginTop: "4px",
              }}
            >
              <div
                style={{
                  width: "180px",
                  height: "3px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: "45%",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, #0d9488, #06b6d4, #10b981)",
                    animation: "splashProgress 1.4s infinite ease-in-out",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  letterSpacing: "0.8px",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                }}
              >
                Initializing Intelligent Workspace...
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="app-shell" style={{ display: "grid", gridTemplateColumns: isSidebarCollapsed ? "60px 1fr" : "200px 1fr", gridTemplateRows: "65px 1fr", height: "100vh", overflow: "hidden", transition: "grid-template-columns 0.2s ease" }}>      
 <aside className="sidebar" style={{ gridRow: "1 / -1", borderRight: "1px solid var(--line)", background: "var(--surface)", display: "flex", flexDirection: "column", padding: "6px 6px", boxShadow: "4px 0 16px rgba(0, 0, 0, 0.06)", zIndex: 30, overflowY: "auto", transition: "width 0.2s ease" }}>
  {/* Brand Header / Toggle Trigger */}
<div 
  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
  className="brand" 
  title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
  style={{ 
    display: "flex", 
    alignItems: "center",
    justifyContent: isSidebarCollapsed ? "center" : "center", 
    width: "100%", 
    background: "var(--sidebar-active)", 
    borderRadius: "8px", 
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    boxSizing: "border-box",
    cursor: "pointer",
    minWidth: 0, 
    marginTop: "8px",
    transition: "all 0.2s ease-in-out" 
  }}
>
  {isSidebarCollapsed && (
    <img 
      src={logoUrl} 
      alt="ReconcAILe Logo" 
      style={{ 
        width: "48px", 
        height: "48px", 
        boxSizing: "border-box", 
        objectFit: "contain", 
        borderRadius: "6px", 
        background: "rgba(255, 255, 255, 0.05)", // Soft translucent backdrop for contrast
        border: "1px solid rgba(255, 255, 255, 0.1)",
        flexShrink: 0
      }} 
    />  
  )}

  {!isSidebarCollapsed && (
    <img 
      src={splashUrl} 
      alt="ReconcAILe Logo" 
      style={{ 
        width: "100%", // Takes up full available width of the container
        height: "auto", // Maintains aspect ratio
        maxHeight: "48px", // Limits height to match your layout grid
        boxSizing: "border-box", 
        objectFit: "contain", 
        borderRadius: "6px", 
        background: "rgba(255, 255, 255, 0.05)", 
        border: "1px solid rgba(255, 255, 255, 0.1)",
        flexShrink: 1
      }} 
    />
  )}
  </div>

  {/* Navigation Items List */}
  <nav className="nav-list" style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, paddingRight: "0px" }}>
    {navigationItems.map((item) => {
      const Icon = navIcons[item];
      const isActive = activeItem === item;
      return (
        <button
          key={item}
          className={isActive ? "nav-item active" : "nav-item"}
          onClick={() => setActiveItem(item)}
          type="button"
          title={isSidebarCollapsed ? item : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "flex-start",
            width: "100%",
            padding: isSidebarCollapsed ? "10px 0" : "10px 14px",
            borderRadius: "10px",
            background: isActive ? "var(--accent-subtle)" : "transparent",
            color: isActive ? "var(--accent)" : "var(--text)",
            border: isActive ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent",
            fontWeight: isActive ? "700" : "500",
            fontSize: "13.5px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {Icon && (
            <span style={{ color: isActive ? "var(--accent)" : "var(--muted)", display: "flex", flexShrink: "0" }}>
              <Icon size={18} />
            </span>
          )}
          {!isSidebarCollapsed && (
            <span style={{ marginLeft: "12px", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden" }}>{item}</span>
          )}
        </button>
      );
    })}
  </nav>
{/* Sidebar Collapse / Expand Toggle Button Wrapper */}
<button
  type="button"
  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
  title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
  aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
  style={{
    marginTop: "auto",
    // Forces the card block to remain anchored strictly to the left edge when expanded
    marginRight: isSidebarCollapsed ? "0" : "auto", 
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // Hard structural limits ensure a perfect square background footprint at all times
    width: "48px", 
    height: "48px",
    borderRadius: "8px",
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
    color: "var(--muted)",
    cursor: "pointer",
    transition: "transform 0.2s ease-in-out, margin-right 0.2s ease-in-out"
  }}
>
  {/* Icon container handling smooth 180-degree rotation when toggled */}
  <span 
    style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      transform: isSidebarCollapsed ? "rotate(180deg)" : "none", 
      transition: "transform 0.2s ease-in-out" 
    }}
  >
    <ChevronsLeft size={18} strokeWidth={2} />
  </span>
</button>

</aside>
<header className="topbar" style={{ gridColumn: "2 / 3", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 18px", height: "65px", minHeight: "65px", borderBottom: "1px solid var(--line)", background: "var(--surface)", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)", zIndex: 30, gap: "10px", position: "relative" }}>
  
  {/* Left Side: Title & Date / Breadcrumb */}
  <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, minWidth: "130px" }}>
    <p className="eyebrow" style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "600", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "3px" }}>
      <Calendar size={12} style={{ color: "var(--accent)" }} />
      {new Date().toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
    </p>
    <h1 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text)", letterSpacing: "-0.02em", margin: 0 }}>{activeItem}</h1>
  </div>

  {/* Center: Global Search Bar - Expanded Decent Width */}
  <div style={{ flex: 1, display: "flex", justifyContent: "center", maxWidth: "460px", minWidth: "260px", margin: "0 10px", position: "relative" }}>
    <div style={{
      width: "100%", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between", 
      padding: "0 10px",
      background: "var(--surface-2)", 
      border: "1px solid var(--line)", 
      borderRadius: "10px",
      height: "36px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
        <Search size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.trim().length > 0) {
              setIsSearchOpen(true);
            } else {
              setIsSearchOpen(false);
            }
          }}
          onFocus={() => {
            if (searchQuery.trim().length > 0) setIsSearchOpen(true);
          }}
          placeholder="Search ledgers, vouchers, docs..."
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: "12.5px",
            fontWeight: "600",
            padding: 0
          }}
        />
      </div>
      <kbd style={{ flexShrink: 0, background: "var(--surface)", border: "1px solid var(--line)", padding: "1px 5px", borderRadius: "4px", fontSize: "10px", fontFamily: "monospace", color: "var(--muted)" }}>Ctrl+K</kbd>
    </div>

    {/* Dropdown search modal positioned right beneath the input */}
    <GlobalSearchModal
      isOpen={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
      query={searchQuery}
      setQuery={setSearchQuery}
      onNavigate={(module) => {
        setActiveItem(module as typeof activeItem);
        setIsSearchOpen(false);
      }}
      mirrorLedgers={mirrorLedgers}
      mirrorVouchers={mirrorVouchers}
      documents={documents}
    />
  </div>

  {/* Right Side Actions: Company Selector, Period Selector, Theme, Notifications, Profile */}
  <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "nowrap" }}>
 
    {/* Consolidated Company & Period Context Bar */}
    <CompanyPeriodSelector 
      mirrorCompanies={mirrorCompanies}
      selectedCompanyId={selectedCompanyId ?? "ALL"}
      unlockedCompanyIds={unlockedCompanyIds}
      selectedFy={selectedFy}
      setSelectedFy={setSelectedFy}
      selectedQuarter={selectedQuarter}
      setSelectedQuarter={setSelectedQuarter}
      fromDate={fromDate}
      setFromDate={setFromDate}
      toDate={toDate}
      setToDate={setToDate}
      getFinancialYears={getFinancialYears}
      onSelectCompany={async (id) => {
        if (id !== "ALL") {
          const comp = mirrorCompanies.find((c: any) => c.id === id);
          if (comp?.passwordHash && !unlockedCompanyIds.has(id)) {
            setPendingLockedCompany({ id: comp.id, name: comp.displayName || comp.name });
            return;
          }
        }

        setSelectedCompanyId(id);
        if (window.desktop) {
          const [ledgers, vouchers, btxs, g2b, docs] = await Promise.all([
            window.desktop.accountingMirror.listLedgers(id === "ALL" ? undefined : id).catch(() => []),
            window.desktop.accountingMirror.listVouchers(id === "ALL" ? undefined : id, 500).catch(() => []),
            window.desktop.accountingMirror.listBankTransactions().catch(() => []),
            window.desktop.accountingMirror.listGstr2bRecords().catch(() => []),
            window.desktop.documents.listRecent().catch(() => []),
          ]);
          setMirrorLedgers(ledgers);
          setMirrorVouchers(vouchers);
          setBankTxs(btxs);
          setGstr2bRecords(g2b);
          setDocuments(docs);
        }
      }}
    />

    {/* Context-Aware Dynamic Export & Import Toolbars */}
{(() => {
  let exportData: any[] = mirrorVouchers ?? [];
  let exportFilename = `${activeItem.replace(/\s+/g, "_")}_Export`;
  let acceptFilter: string | undefined = undefined;

  switch (activeItem) {
    case "Dashboard":
      exportData = [
        { Metric: "Vouchers Total", Count: mirrorVouchers.length },
        { Metric: "Ledgers Total", Count: mirrorLedgers.length },
        { Metric: "Bank Feed Total", Count: bankTxs.length },
        { Metric: "Documents Total", Count: documents.length },
      ];
      exportFilename = "Dashboard_Executive_Summary";
      break;
    case "Companies":
      exportData = mirrorCompanies;
      exportFilename = "Connected_Companies_Master";
      acceptFilter = ".xml,.json";
      break;
    case "Vouchers":
      exportData = mirrorVouchers;
      exportFilename = "Master_Voucher_Register";
      break;
    case "Documents":
      exportData = documents;
      exportFilename = "Document_OCR_Repository";
      acceptFilter = ".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.xml,.json";
      break;
    case "Reconciliation":
      exportData = bankTxs;
      exportFilename = "Bank_Reconciliation_Feed";
      acceptFilter = ".xlsx,.xls,.csv,.pdf,.json";
      break;
    case "GST":
      exportData = gstr2bRecords;
      exportFilename = "GSTR2B_Compliance_Register";
      acceptFilter = ".json,.xlsx,.csv,.xml";
      break;
    case "Reports":
      exportData = [
        { Metric: "Gross Sales Revenue", Value: mirrorVouchers.filter(v => (v?.voucherTypeName || "").toLowerCase().includes("sales")).reduce((s, v) => s + Number(v?.totalAmount || 0), 0) },
        { Metric: "Purchase Expenses", Value: mirrorVouchers.filter(v => (v?.voucherTypeName || "").toLowerCase().includes("purchase")).reduce((s, v) => s + Number(v?.totalAmount || 0), 0) },
      ];
      exportFilename = "Statutory_Executive_Audit_Report";
      break;
  }

  return (
    <div 
      onClick={() => {
        // Automatically close profile menu & notifications whenever data toolbar area is interacted with
        setShowProfileMenu(false);
        setShowNotificationTray(false);
      }}
      style={{ display: "flex", alignItems: "center" }}
    >
      <UnifiedDataToolbar
        onImportFile={(file) => void pickAndImportDocs(file)}
        accept={acceptFilter}
        filename={exportFilename}
        data={exportData}
      />
    </div>
  );
})()}

    {/* AI Co-Pilot Side Panel Toggle */}
    <button
      type="button"
      onClick={() => {
        const nextState = !showLlmChat;
        setShowLlmChat(nextState);
        localStorage.setItem("app.showLlmChat", String(nextState));
      }}
      title="Open Local Offline AI Co-Pilot"
      style={{
        background: showLlmChat ? "var(--accent)" : "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: "8px",
        height: "34px",
        padding: "0 10px",
        cursor: "pointer",
        color: showLlmChat ? "#FFFFFF" : "var(--text)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontWeight: "700",
        fontSize: "12px",
        transition: "all 0.2s ease",
      }}
    >
      <Sparkles size={14} style={{ color: showLlmChat ? "#FFFFFF" : "var(--accent)" }} />
      <span>AI Chat</span>
    </button>

    {/* Notification Tray Dropdown Container */}
    <div ref={notificationRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => {
          setShowNotificationTray(!showNotificationTray);
          setShowProfileMenu(false); // Closes profile dropdown when opening/toggling notifications
        }}
        title="System Alerts & Notifications"
        style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "8px", width: "34px", height: "34px", cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s", position: "relative", padding: 0 }}
      >
        <Bell size={15} />
        <span style={{ position: "absolute", top: "5px", right: "5px", width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
      </button>

      {showNotificationTray && (
        <div style={{ position: "absolute", right: 0, top: "44px", width: "360px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 100, overflow: "hidden", animation: "fadeIn 0.15s ease" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: "800", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "8px", color: "var(--text)" }}>
              <Bell size={16} style={{ color: "var(--accent)" }} /> System Notifications
            </div>
            {notifications.filter((n) => !n.read).length > 0 ? (
              <span style={{ fontSize: "11px", background: "var(--accent-subtle)", color: "var(--accent)", padding: "2px 8px", borderRadius: "6px", fontWeight: "700" }}>
                {notifications.filter((n) => !n.read).length} New
              </span>
            ) : (
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>All caught up</span>
            )}
          </div>

          <div style={{ maxHeight: "340px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                No active notifications
              </div>
            ) : (
              notifications.map((notif) => {
                const isSuccess = notif.type === "success";
                const isWarning = notif.type === "warning";
                const isError = notif.type === "error";

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                      );
                    }}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--line)",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                      background: notif.read ? "transparent" : "var(--surface-2)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ flexShrink: 0, marginTop: "2px" }}>
                      {isSuccess && <CheckCircle2 size={16} style={{ color: "var(--success)" }} />}
                      {isWarning && <AlertCircle size={16} style={{ color: "var(--warning)" }} />}
                      {isError && <AlertCircle size={16} style={{ color: "var(--danger)" }} />}
                      {!isSuccess && !isWarning && !isError && <Sparkles size={16} style={{ color: "var(--accent)" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "12.5px", fontWeight: notif.read ? "600" : "800", color: "var(--text)" }}>
                          {notif.title}
                        </div>
                        <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--muted)", fontWeight: "600" }}>
                          {notif.category}
                        </span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "2px", lineHeight: "1.4" }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={10} /> {notif.time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ padding: "10px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", background: "var(--surface-2)" }}>
            <button
              type="button"
              onClick={() => {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              }}
              style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "11.5px", fontWeight: "700", cursor: "pointer", padding: "4px 8px" }}
            >
              Mark all as read
            </button>
            <button
              type="button"
              onClick={() => {
                setNotifications([]);
                setShowNotificationTray(false);
              }}
              style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: "11.5px", fontWeight: "600", cursor: "pointer", padding: "4px 8px" }}
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>

    {/* Profile Menu Dropdown Container */}
    {(() => {
      const getInitials = (nameString: string) => {
        if (!nameString) return "U";
        const parts = nameString.trim().split(/\s+/);
        if (parts.length > 1) {
          return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
      };

      const initials = getInitials(userFullName || username);

      return (
        <div ref={profileRef} style={{ position: "relative" }}>
          <button 
            className="profile-button" 
            type="button" 
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotificationTray(false); // Closes notification tray when opening/toggling profile menu
            }}
            title="User Account" 
            style={{ width: "34px", height: "34px", borderRadius: "8px", background: "var(--accent-subtle)", border: "1px solid rgba(13,148,136,0.3)", color: "var(--accent)", fontWeight: "800", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            {initials}
          </button>

          {showProfileMenu && (
            <div style={{ 
              position: "absolute", 
              right: 0, 
              top: "44px", 
              width: "280px", 
              maxWidth: "calc(100vw - 32px)", 
              background: "var(--surface)", 
              border: "1px solid var(--line)", 
              borderRadius: "14px", 
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)", 
              zIndex: 100, 
              overflow: "hidden", 
              animation: "fadeIn 0.15s ease" 
            }}>
             
              {/* Quick Actions Bar (Identity column + Sync & Theme Toggle) */}
              <div style={{ padding: "12px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", gap: "10px" }}>
                
                {/* Identity Column */}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {userFullName}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {username}
                  </div>        
                </div>

                {/* Action Group */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  {/* Screen-Aware Contextual Live Sync Action Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      setSyncActionPending(true);
                      console.log(`[App] Context-Aware Live Sync triggered for active view: ${activeItem}`);
                      try {
                        if (window.desktop) {
                          if (activeItem === "GST") {
                            await window.desktop.accountingMirror.listGstr2bRecords().catch(() => []);
                          } else if (activeItem === "Companies") {
                            await window.desktop.sync.listRecentCommands().catch(() => []);
                          }
                          
                          const [ledgers, vouchers, btxs, g2b, docs] = await Promise.all([
                            window.desktop.accountingMirror.listLedgers(selectedCompanyId ?? undefined).catch(() => []),
                            window.desktop.accountingMirror.listVouchers(selectedCompanyId ?? undefined, 500).catch(() => []),
                            window.desktop.accountingMirror.listBankTransactions().catch(() => []),
                            window.desktop.accountingMirror.listGstr2bRecords().catch(() => []),
                            window.desktop.documents.listRecent().catch(() => []),
                          ]);

                          setMirrorLedgers(ledgers);
                          setMirrorVouchers(vouchers);
                          setBankTxs(btxs);
                          setGstr2bRecords(g2b);
                          setDocuments(docs);
                        }
                      } finally {
                        setTimeout(() => setSyncActionPending(false), 600);
                      }
                    }}
                    disabled={syncActionPending}
                    title={`Trigger Real-time Sync for ${activeItem}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "700",
                      background: "var(--accent)",
                      color: "#FFFFFF",
                      border: "none",
                      cursor: syncActionPending ? "not-allowed" : "pointer",
                      opacity: syncActionPending ? 0.7 : 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <RefreshCw size={13} className={syncActionPending ? "spin" : ""} />
                    {syncActionPending ? "Syncing..." : "Sync"}
                  </button>

                  {/* Dark / Light Theme Toggle Switcher */}
                  <button
                    type="button"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`}
                    style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "6px", width: "30px", height: "30px", cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", padding: 0 }}
                  >
                    {theme === "dark" ? <Sun size={14} style={{ color: "#f59e0b" }} /> : <Moon size={14} style={{ color: "#3b82f6" }} />}
                  </button>
                </div>
              </div>

              <div style={{ padding: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                <button 
                  type="button"
                  onClick={() => {
                    setSettingsDefaultTab("profile");
                    setActiveItem("Settings");
                    setShowProfileMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", background: "transparent", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text)", cursor: "pointer", textAlign: "left" }}
                >
                  <User size={15} style={{ color: "var(--muted)" }} /> Profile & Account
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setSettingsDefaultTab("connector");
                    setActiveItem("Settings");
                    setShowProfileMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", background: "transparent", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text)", cursor: "pointer", textAlign: "left" }}
                >
                  <Settings size={15} style={{ color: "var(--muted)" }} /> Connector Preferences
                </button>
              </div>

              <div style={{ padding: "6px", borderTop: "1px solid var(--line)" }}>
                <button 
                  type="button"
                  onClick={() => {
                    alert("Logged out from desktop session.");
                    setShowProfileMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", background: "transparent", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "var(--danger)", cursor: "pointer", textAlign: "left" }}
                >
                  <LogOut size={15} /> Sign Out Session
                </button>
              </div>
            </div>
          )}
        </div>
      );
    })()}

  </div>
</header>
      <main className="main" style={{ gridColumn: "2 / 3", display: "flex", flexDirection: "column", background: "var(--background)", overflowY: "auto", overflowX: "hidden" }}>
       <section className="workspace" style={{ padding: "24px 32px" }}>
{activeItem === "Dashboard" && (
  <DashboardView
    mirrorStats={mirrorStats}
    connectorStatus={connectorStatus}
    deviceIdentity={deviceIdentity}
    appInfo={appInfo}
    connectorSettings={connectorSettings}
    mirrorCompanies={mirrorCompanies}
    mirrorLedgers={mirrorLedgers}
    selectedCompanyId={selectedCompanyId}
    onSelectCompany={async (id) => {
      setSelectedCompanyId(id);
      if (window.desktop) {
        const [ledgers, vouchers] = await Promise.all([
          window.desktop.accountingMirror.listLedgers(id).catch(() => []),
          window.desktop.accountingMirror.listVouchers(id, 500).catch(() => []),
        ]);
        setMirrorLedgers(ledgers);
        setMirrorVouchers(vouchers);
      }
    }}
    mirrorVouchers={mirrorVouchers}
    syncCommands={syncCommands}
    documents={documents}
    bankTxs={bankTxs}
    gstr2bRecords={gstr2bRecords}
    onPickDocs={() => void pickAndImportDocs()}
    onLoadBank={() => void refreshBankData()}
    onPullFromTally={async () => {
      if (!window.desktop) return;
      try {
        await window.desktop.sync.enqueuePullCompanies();
        const res = await window.desktop.sync.runNext();
        const [stats, comps, ledgers, vouchers, cmds] = await Promise.all([
          window.desktop.accountingMirror.getStats(),
          window.desktop.accountingMirror.listCompanies(),
          window.desktop.accountingMirror.listLedgers(selectedCompanyId ?? undefined),
          window.desktop.accountingMirror.listVouchers(selectedCompanyId ?? undefined, 500),
          window.desktop.sync.listRecentCommands(),
        ]);
        setMirrorStats(stats);
        setMirrorCompanies(comps);
        setMirrorLedgers(ledgers);
        setMirrorVouchers(vouchers);
        setSyncCommands(cmds);
        alert(res?.message || "Tally company mirror synchronization completed successfully!");
      } catch (err: any) {
        alert(`Tally pull sync notice: ${err?.message || "Ensure Tally is active on port 9000."}`);
      }
    }}
    onNavigate={(moduleName) => setActiveItem(moduleName as any)}
    selectedFy={selectedFy}
    selectedQuarter={selectedQuarter}
    fromDate={fromDate}
    toDate={toDate}
  />
)}
{activeItem === "Companies" && (
  <CompaniesView
    mirrorCompanies={mirrorCompanies}
    selectedCompanyId={selectedCompanyId}
    onSelectCompany={(id) => {
      if (id !== "ALL") {
        const comp = mirrorCompanies.find((c: any) => c.id === id);
        if (comp?.passwordHash && !unlockedCompanyIds.has(id)) {
          setPendingLockedCompany({ id: comp.id, name: comp.displayName || comp.name });
          return;
        }
      }
      setSelectedCompanyId(id);
    }}
    onCompaniesChanged={async () => {
      if (window.desktop) {
        const comps = await window.desktop.accountingMirror.listCompanies().catch(() => []);
        setMirrorCompanies(comps);
      }
    }}
    onImportXml={(e) => void handleImportTallyXmlDump(e)}
    syncCommands={syncCommands}
    selectedFy={selectedFy}
    selectedQuarter={selectedQuarter}
    fromDate={fromDate}
    toDate={toDate}
  />
)}
{activeItem === "Ledgers" && (
  <LedgersView
    mirrorLedgers={mirrorLedgers}
    selectedCompanyId={selectedCompanyId}
    mirrorCompanies={mirrorCompanies}
    onSelectCompany={async (id) => {
      setSelectedCompanyId(id);
      if (window.desktop) {
        const ledgers = await window.desktop.accountingMirror.listLedgers(id === "ALL" ? undefined : id).catch(() => []);
        setMirrorLedgers(ledgers);
      }
    }}
    onRefreshLedgers={async () => {
      if (window.desktop) {
        const ledgers = await window.desktop.accountingMirror.listLedgers(selectedCompanyId === "ALL" ? undefined : selectedCompanyId ?? undefined).catch(() => []);
        setMirrorLedgers(ledgers);
      }
    }}
  />
)}
      {activeItem === "Documents" && (
        <BankStatementImportView
          activeCompanyId={selectedCompanyId || mirrorCompanies[0]?.id || ""}
          mirrorCompanies={mirrorCompanies}
          defaultTab="repository"
          onImportComplete={() => {
            void refreshBankData();
            if (window.desktop?.documents?.listRecent) {
              window.desktop.documents.listRecent().then(setDocuments).catch(() => {});
            }
          }}
        />
      )}

{activeItem === "Vouchers" && (
  <TransactionsView 
    mirrorLedgers={mirrorLedgers} 
    stockItems={stockItems}
    mirrorVouchers={mirrorVouchers} 
    bankTxs={bankTxs}
    selectedCompanyId={selectedCompanyId}
    mirrorCompanies={mirrorCompanies}
    onSelectCompany={async (id) => {
      setSelectedCompanyId(id);
      if (window.desktop) {
        const [ledgers, vouchers] = await Promise.all([
          window.desktop.accountingMirror.listLedgers(id).catch(() => []),
          window.desktop.accountingMirror.listVouchers(id, 500).catch(() => []),
        ]);
        setMirrorLedgers(ledgers);
        setMirrorVouchers(vouchers);
      }
    }}
    onVoucherCreated={async () => {
      if (window.desktop) {
        const [vouchers, stats] = await Promise.all([
          window.desktop.accountingMirror.listVouchers(selectedCompanyId && selectedCompanyId !== "ALL" ? selectedCompanyId : undefined, 500).catch(() => []),
          window.desktop.accountingMirror.getStats().catch(() => null),
        ]);
        setMirrorVouchers(vouchers);
        if (stats) setMirrorStats(stats);
      }
    }}
    selectedFy={selectedFy}
    selectedQuarter={selectedQuarter}
    fromDate={fromDate}
    toDate={toDate}
    onPickDocs={() => void pickAndImportDocs()}
  />
)}

          {activeItem === "Reconciliation" && (
            <ReconciliationView
              bankTxs={bankTxs}
              mirrorLedgers={mirrorLedgers}
              syncActionPending={syncActionPending}
              onLoadBankFeed={() => void refreshBankData()}
              onSyncBankLedger={(name) => void syncBankLedgerToTally(name)}
              onPostBankTx={(tx) => void postBankTxToTally(tx)}
              selectedCompanyId={selectedCompanyId}
              activeCompanyName={mirrorCompanies.find((c) => c.id === selectedCompanyId)?.name || mirrorCompanies[0]?.name || "Primary Company"}
              selectedFy={selectedFy}
              selectedQuarter={selectedQuarter}
              fromDate={fromDate}
              toDate={toDate}
            />
          )}

          {activeItem === "GST" && (
            <GstView
              gstr2bRecords={gstr2bRecords}
              onLoadGstr2b={() => void refreshGstr2bData()}
              selectedCompanyId={selectedCompanyId}
              selectedFy={selectedFy}
              selectedQuarter={selectedQuarter}
              fromDate={fromDate}
              toDate={toDate}
            />
          )}

      {activeItem === "Reports" && (
    <ReportsView
      syncCommands={syncCommands}
      documents={documents}
      bankTxs={bankTxs}
      gstr2bRecords={gstr2bRecords}
      mirrorStats={mirrorStats}
      mirrorVouchers={mirrorVouchers}
      mirrorLedgers={mirrorLedgers}
      selectedCompanyId={selectedCompanyId}
      mirrorCompanies={mirrorCompanies}
      onSelectCompany={async (id) => {
        setSelectedCompanyId(id);
        if (window.desktop) {
          const [ledgers, vouchers] = await Promise.all([
            window.desktop.accountingMirror.listLedgers(id).catch(() => []),
            window.desktop.accountingMirror.listVouchers(id, 50).catch(() => []),
          ]);
          setMirrorLedgers(ledgers);
          setMirrorVouchers(vouchers);
        }
      }}
      selectedFy={selectedFy}
      selectedQuarter={selectedQuarter}
      fromDate={fromDate}
      toDate={toDate}
    />
  )}

      {activeItem === "Invoice & Bills" && (
        <BillImportView
          activeCompanyId={selectedCompanyId || mirrorCompanies[0]?.id || ""}
          onImportComplete={() => {
            void refreshBankData();
            if (window.desktop?.documents?.listRecent) {
              window.desktop.documents.listRecent().then(setDocuments).catch(() => {});
            }
          }}
        />
      )}

   
      
          {activeItem === "Settings" && (
            <SettingsView
              defaultTab={settingsDefaultTab}
              connectorSettings={connectorSettings}
              connectorStatus={connectorStatus}
              backendSettings={backendSettings}
              connectorPairing={connectorPairing}
              deviceIdentity={deviceIdentity}
              appInfo={appInfo}
              credentialAvailability={credentialAvailability}
              backendError={backendError}
              backendActionPending={backendActionPending}
              onUpdateConnector={async (enabled) => {
                if (!window.desktop) return;
                await window.desktop.settings.updateConnectorSettings({ enableLocalTallyConnector: enabled });
                setConnectorSettings(await window.desktop.settings.getConnectorSettings());
              }}
              onUpdateBackground={async (enabled) => {
                if (!window.desktop) return;
                await window.desktop.settings.updateConnectorSettings({ enableBackgroundSync: enabled });
                setConnectorSettings(await window.desktop.settings.getConnectorSettings());
              }}
              onSaveBackend={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const apiBaseUrl = (form.elements.namedItem("apiBaseUrl") as HTMLInputElement)?.value;
                const websocketUrl = (form.elements.namedItem("websocketUrl") as HTMLInputElement)?.value;
                if (!window.desktop) return;
                setBackendActionPending(true);
                setBackendError(null);
                try {
                  await window.desktop.backend.saveSettings({ apiBaseUrl, websocketUrl });
                  setBackendSettings(await window.desktop.backend.getSettings());
                } catch (err: any) {
                  setBackendError(err?.message ?? "Failed to save backend settings");
                } finally {
                  setBackendActionPending(false);
                }
              }}
              onPairConnector={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const pairingCode = (form.elements.namedItem("pairingCode") as HTMLInputElement)?.value;
                if (!window.desktop || !pairingCode) return;
                setBackendActionPending(true);
                setBackendError(null);
                try {
                  await window.desktop.backend.pairConnector(pairingCode);
                  setConnectorPairing(await window.desktop.backend.getPairing());
                } catch (err: any) {
                  setBackendError(err?.message ?? "Pairing failed");
                } finally {
                  setBackendActionPending(false);
                }
              }}
            />
          )}
        </section>

        {/* Global Workspace Search Modal Overlay */}
        <GlobalSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          mirrorLedgers={mirrorLedgers}
          mirrorVouchers={mirrorVouchers}
          documents={documents}
          onNavigate={(item) => setActiveItem(item as any)}
        />

        {/* Local Offline AI Chat Co-Pilot Side Panel */}
        <LlmSidePanel
          isOpen={showLlmChat}
          onClose={() => {
            setShowLlmChat(false);
            localStorage.setItem("app.showLlmChat", "false");
          }}
          activeCompanyId={selectedCompanyId || mirrorCompanies[0]?.id || ""}
        />

        {/* Global Company Password Security Lock Screen */}
        {pendingLockedCompany && (
          <CompanyLockModal
            isOpen={Boolean(pendingLockedCompany)}
            companyName={pendingLockedCompany.name}
            companyId={pendingLockedCompany.id}
            onSuccess={async () => {
              const compId = pendingLockedCompany.id;
              setUnlockedCompanyIds((prev) => new Set([...prev, compId]));
              setSelectedCompanyId(compId);
              setPendingLockedCompany(null);

              if (window.desktop) {
                const [ledgers, vouchers, btxs, g2b, docs] = await Promise.all([
                  window.desktop.accountingMirror.listLedgers(compId).catch(() => []),
                  window.desktop.accountingMirror.listVouchers(compId, 500).catch(() => []),
                  window.desktop.accountingMirror.listBankTransactions().catch(() => []),
                  window.desktop.accountingMirror.listGstr2bRecords().catch(() => []),
                  window.desktop.documents.listRecent().catch(() => []),
                ]);
                setMirrorLedgers(ledgers);
                setMirrorVouchers(vouchers);
                setBankTxs(btxs);
                setGstr2bRecords(g2b);
                setDocuments(docs);
              }
            }}
            onCancel={() => {
              setPendingLockedCompany(null);
            }}
          />
        )}

        {/* Global F4-F10 Voucher Creation Modal */}
        <VoucherCreationModal
          isOpen={isVoucherModalOpen}
          onClose={() => setIsVoucherModalOpen(false)}
          initialVoucherCode={voucherModalCode}
          activeCompanyId={selectedCompanyId || mirrorCompanies[0]?.id || ""}
          activeCompanyName={mirrorCompanies.find((c: any) => c.id === selectedCompanyId)?.name || mirrorCompanies[0]?.name || "Primary Company"}
          mirrorLedgers={mirrorLedgers}
          stockItems={stockItems}
          stockGroups={Array.from(new Set(stockItems.map((i: any) => i.parentName).filter(Boolean)))}
          stockCategories={Array.from(new Set(stockItems.map((i: any) => i.categoryName || i.category).filter(Boolean)))}
          onSaveVoucher={async () => {
            setIsVoucherModalOpen(false);
            if (window.desktop) {
              const [vouchers, stats] = await Promise.all([
                window.desktop.accountingMirror.listVouchers(selectedCompanyId ?? undefined, 500).catch(() => []),
                window.desktop.accountingMirror.getStats().catch(() => null),
              ]);
              setMirrorVouchers(vouchers);
              if (stats) setMirrorStats(stats);
            }
          }}
        />
      </main>
    </div>
    </>
  );
}
