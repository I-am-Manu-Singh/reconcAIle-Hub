import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Download,
  FolderInput,
  Bot,
  User,
  Cpu,
  Trash2,
  RefreshCw,
  Plus,
  MessageSquare,
  ChevronDown,
  AtSign,
  FileText,
  Building2,
  Landmark,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
}

interface LlmSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompanyId?: string;
}

export const LlmSidePanel: React.FC<LlmSidePanelProps> = ({
  isOpen,
  onClose,
  activeCompanyId = "",
}) => {
  // Conversation Management
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showConvList, setShowConvList] = useState(false);

  // Messages & Input State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Model Engine & Diagnostics State
  const [selectedModel, setSelectedModel] = useState("smollm2-135m");
  const [installedModels, setInstalledModels] = useState<Array<{ modelId: string; name: string; path: string; sizeBytes: number; isCustom: boolean }>>([]);
  const [engineStatus, setEngineStatus] = useState<{ status: "UNLOADED" | "LOADING" | "READY" | "ERROR"; modelName: string | null; error: string | null }>({
    status: "UNLOADED",
    modelName: null,
    error: null,
  });
  const [downloadProgress, setDownloadProgress] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Dropdown States for '@' (Functions/Commands) and '/' (Documents/Files/Attachments)
  const [menuMode, setMenuMode] = useState<"@" | "/" | null>(null);
  const [filterText, setFilterText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: number; contentSummary?: string }>>([]);
  const [mentionContextData, setMentionContextData] = useState<{
    documents: any[];
    companies: any[];
    bankSessions: any[];
  }>({ documents: [], companies: [], bankSessions: [] });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileAttachmentRef = useRef<HTMLInputElement>(null);

  // App Functions accessible via '@'
  const APP_FUNCTIONS = [
    { key: "@audit_balances", label: "Audit Bank Balances", desc: "Check monthly & per-page debit/credit balance continuity" },
    { key: "@reconcile_gstr2b", label: "Reconcile GSTR-2B", desc: "Match purchase invoices against GST portal ITC" },
    { key: "@classify_narration", label: "Classify Statement Narration", desc: "Categorize UPI/NEFT/IMPS transactions into Tally ledgers" },
    { key: "@check_health", label: "System Health Diagnostics", desc: "Test SQLite, Tally connector, and offline model engine" },
    { key: "@detect_anomalies", label: "Detect Voucher Discrepancies", desc: "Find missing GSTINs, round-off gaps, or duplicate references" },
    { key: "@tally_sync", label: "Tally Live Connector Sync", desc: "Trigger bidirectional ledger and voucher sync" },
  ];

  // Initial Load & SQLite restore
  useEffect(() => {
    if (!isOpen) return;

    async function init() {
      await loadConversations();
      await refreshInstalledModels();
      await checkEngineStatus();
      await fetchMentionContext();
    }
    void init();
  }, [isOpen]);

  // Listen to model download progress
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).desktop?.models?.onProgress) return;
    const unsub = (window as any).desktop.models.onProgress((p: any) => {
      setDownloadProgress(p);
      if (p.status === "READY") {
        setIsDownloading(false);
        refreshInstalledModels();
        checkEngineStatus();
      } else if (p.status === "DOWNLOADING") {
        setIsDownloading(true);
      } else if (p.status === "ERROR") {
        setIsDownloading(false);
        checkEngineStatus();
      }
    });
    return () => unsub?.();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Load Conversations from SQLite
  const loadConversations = async () => {
    if (typeof window === "undefined" || !(window as any).desktop?.aiChat?.listConversations) return;
    try {
      const convList: ConversationItem[] = await (window as any).desktop.aiChat.listConversations();
      setConversations(convList);
      if (convList.length > 0) {
        const targetId = activeConversationId && convList.some(c => c.id === activeConversationId)
          ? activeConversationId
          : convList[0]!.id;
        setActiveConversationId(targetId);
        await loadMessagesForConversation(targetId);
      } else {
        await handleNewConversation("Accounting & Bank Audit Assistant");
      }
    } catch (err) {
      console.warn("[LlmSidePanel] Could not list conversations:", err);
    }
  };

  const loadMessagesForConversation = async (convId: string) => {
    if (typeof window === "undefined" || !(window as any).desktop?.aiChat?.getMessages) return;
    try {
      const msgs = await (window as any).desktop.aiChat.getMessages(convId);
      setMessages(msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider: m.provider,
        model: m.model,
      })));
    } catch (err) {
      console.warn("[LlmSidePanel] Failed to fetch messages:", err);
    }
  };

  const handleSelectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setShowConvList(false);
    await loadMessagesForConversation(convId);
  };

  const handleNewConversation = async (defaultTitle?: string) => {
    if (typeof window === "undefined" || !(window as any).desktop?.aiChat?.createConversation) return;
    try {
      const title = defaultTitle || `Chat ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      const created = await (window as any).desktop.aiChat.createConversation({ title, modelId: selectedModel });
      if (created) {
        setConversations(prev => [created, ...prev]);
        setActiveConversationId(created.id);
        setMessages([]);
        setShowConvList(false);
      }
    } catch (err) {
      console.warn("[LlmSidePanel] Failed to create new conversation:", err);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation and its messages?")) return;
    try {
      if ((window as any).desktop?.aiChat?.deleteConversation) {
        await (window as any).desktop.aiChat.deleteConversation(convId);
        const nextList = conversations.filter(c => c.id !== convId);
        setConversations(nextList);
        if (activeConversationId === convId) {
          if (nextList.length > 0) {
            setActiveConversationId(nextList[0]!.id);
            await loadMessagesForConversation(nextList[0]!.id);
          } else {
            await handleNewConversation();
          }
        }
      }
    } catch (err) {
      console.warn("[LlmSidePanel] Failed to delete conversation:", err);
    }
  };

  const checkEngineStatus = async () => {
    if (typeof window === "undefined" || !(window as any).desktop?.models?.getEngineStatus) return;
    try {
      const status = await (window as any).desktop.models.getEngineStatus();
      setEngineStatus(status || { status: "UNLOADED", modelName: null, error: null });
    } catch (err) {
      console.warn("[LlmSidePanel] Error getting engine status:", err);
    }
  };

  const refreshInstalledModels = async () => {
    if (typeof window === "undefined" || !(window as any).desktop?.models?.list) return;
    try {
      const list = await (window as any).desktop.models.list();
      setInstalledModels(list || []);
      if (list && list.length > 0 && !list.some((m: any) => m.modelId === selectedModel)) {
        setSelectedModel(list[0].modelId);
      }
    } catch (err) {
      console.warn("[LlmSidePanel] Failed to list models:", err);
    }
  };

  const fetchMentionContext = async () => {
    if (typeof window === "undefined" || !(window as any).desktop?.aiChat?.getMentionsContext) return;
    try {
      const ctx = await (window as any).desktop.aiChat.getMentionsContext();
      setMentionContextData(ctx || { documents: [], companies: [], bankSessions: [] });
    } catch (err) {
      console.warn("[LlmSidePanel] Error getting mentions context:", err);
    }
  };

  const handleDownloadBundledModel = async (modelId = "smollm2-135m") => {
    if (typeof window === "undefined" || !(window as any).desktop?.models?.download) return;
    setIsDownloading(true);
    try {
      await (window as any).desktop.models.download(modelId);
      await refreshInstalledModels();
      setSelectedModel(modelId);
      if ((window as any).desktop?.models?.preload) {
        await (window as any).desktop.models.preload(modelId);
      }
      await checkEngineStatus();
    } catch (err: any) {
      alert(`Download failed: ${err?.message || err}`);
      setIsDownloading(false);
    }
  };

  const handleImportOwnModel = async () => {
    if (typeof window === "undefined" || !(window as any).desktop?.models?.pickImport) return;
    setIsImporting(true);
    try {
      const imported = await (window as any).desktop.models.pickImport();
      if (imported) {
        await refreshInstalledModels();
        setSelectedModel(imported.modelId);
        if ((window as any).desktop?.models?.preload) {
          await (window as any).desktop.models.preload(imported.modelId);
        }
        await checkEngineStatus();
      }
    } catch (err: any) {
      alert(`Failed to import model: ${err?.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    // Check for '@' trigger for App Functions
    const atIndex = text.lastIndexOf("@");
    const slashIndex = text.lastIndexOf("/");

    if (atIndex !== -1 && (atIndex === 0 || text[atIndex - 1] === " ") && atIndex > slashIndex) {
      setMenuMode("@");
      setFilterText(text.slice(atIndex + 1).toLowerCase());
    } else if (slashIndex !== -1 && (slashIndex === 0 || text[slashIndex - 1] === " ") && slashIndex > atIndex) {
      setMenuMode("/");
      setFilterText(text.slice(slashIndex + 1).toLowerCase());
    } else {
      setMenuMode(null);
    }
  };

  const handleSelectFunction = (fnKey: string) => {
    const atIndex = inputText.lastIndexOf("@");
    const prefix = atIndex !== -1 ? inputText.slice(0, atIndex) : inputText;
    setInputText(`${prefix}${fnKey} `);
    setMenuMode(null);
    inputRef.current?.focus();
  };

  const handleSelectDocumentMention = (tag: string, detail: string) => {
    const slashIndex = inputText.lastIndexOf("/");
    const prefix = slashIndex !== -1 ? inputText.slice(0, slashIndex) : inputText;
    setInputText(`${prefix}/[${tag}: ${detail}] `);
    setMenuMode(null);
    inputRef.current?.focus();
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFiles(prev => [...prev, { name: file.name, size: file.size }]);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = inputText.trim();
    if (!query || isGenerating || !activeConversationId) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText("");
    setMenuMode(null);
    setIsGenerating(true);

    // Save user message to SQLite
    if ((window as any).desktop?.aiChat?.saveMessage) {
      void (window as any).desktop.aiChat.saveMessage({
        conversationId: activeConversationId,
        role: "user",
        content: query,
      });
    }

    // Auto-update conversation title if it's the first user message
    if (messages.length === 0 && (window as any).desktop?.aiChat?.updateTitle) {
      const titleCandidate = query.slice(0, 32);
      void (window as any).desktop.aiChat.updateTitle(activeConversationId, titleCandidate);
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title: titleCandidate } : c));
    }

    try {
      if (typeof window !== "undefined" && (window as any).desktop?.models?.chat) {
        const chatPayload = nextMessages.map(m => ({ role: m.role, content: m.content }));
        const response = await (window as any).desktop.models.chat(chatPayload, {
          provider: "local",
          modelId: selectedModel,
        });

        const botMsg: ChatMessage = {
          id: `msg_bot_${Date.now()}`,
          role: "assistant",
          content: response?.text || "No response generated.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          provider: response?.provider || "Local Offline Engine",
          model: response?.model || selectedModel,
        };

        const finalized = [...nextMessages, botMsg];
        setMessages(finalized);

        // Save assistant message to SQLite
        if ((window as any).desktop?.aiChat?.saveMessage) {
          void (window as any).desktop.aiChat.saveMessage({
            conversationId: activeConversationId,
            role: "assistant",
            content: botMsg.content,
            provider: botMsg.provider,
            model: botMsg.model,
          });
        }
      }
      await checkEngineStatus();
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `Error: ${err?.message || err}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([...nextMessages, errMsg]);
      await checkEngineStatus();
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const currentConv = conversations.find(c => c.id === activeConversationId);

  // Filter mention items
  const filteredDocs = (mentionContextData.documents || []).filter(d => (d?.name || "").toLowerCase().includes(filterText));
  const filteredCompanies = (mentionContextData.companies || []).filter(c => (c?.name || "").toLowerCase().includes(filterText));
  const filteredSessions = (mentionContextData.bankSessions || []).filter(s =>
    (s?.bankName || "Bank Statement").toLowerCase().includes(filterText) ||
    (s?.fileName || "").toLowerCase().includes(filterText)
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "440px",
        background: "var(--surface)",
        borderLeft: "1px solid var(--line)",
        boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.28)",
        zIndex: 900,
        display: "flex",
        flexDirection: "column",
        animation: "slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--surface-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              padding: "7px",
              borderRadius: "8px",
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontWeight: "800", fontSize: "14.5px", color: "var(--text)" }}>
              ReconcAILe Co-Pilot
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "5px" }}>
              {engineStatus.status === "READY" ? (
                <>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                  <span style={{ color: "#10b981", fontWeight: "700" }}>Engine Active</span>
                </>
              ) : engineStatus.status === "LOADING" ? (
                <>
                  <RefreshCw size={10} className="spin" style={{ color: "var(--accent)" }} />
                  <span style={{ color: "var(--accent)", fontWeight: "700" }}>Loading Weights...</span>
                </>
              ) : engineStatus.status === "ERROR" ? (
                <>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
                  <span style={{ color: "#ef4444", fontWeight: "700" }} title={engineStatus.error || "Engine error"}>Engine Error</span>
                </>
              ) : (
                <>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--muted)" }} />
                  <span>Offline Ready</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => handleNewConversation()}
            title="Start New Conversation"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--accent-subtle)",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              cursor: "pointer",
              padding: "5px 10px",
              borderRadius: "6px",
              fontSize: "11.5px",
              fontWeight: "700",
            }}
          >
            <Plus size={13} /> New Chat
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close Assistant Panel"
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "6px", borderRadius: "6px" }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Conversation Picker Header Bar */}
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={() => setShowConvList(!showConvList)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "transparent",
            border: "none",
            color: "var(--text)",
            fontWeight: "700",
            cursor: "pointer",
            maxWidth: "300px",
          }}
        >
          <MessageSquare size={14} style={{ color: "var(--accent)" }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentConv?.title || "Conversations"}
          </span>
          <ChevronDown size={13} style={{ color: "var(--muted)" }} />
        </button>

        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
          {conversations.length} saved {conversations.length === 1 ? "chat" : "chats"}
        </span>

        {/* Conversation Dropdown History Drawer */}
        {showConvList && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "12px",
              right: "12px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "10px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
              zIndex: 950,
              maxHeight: "280px",
              overflowY: "auto",
              padding: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ padding: "6px 8px", fontSize: "11px", fontWeight: "800", color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
              PREVIOUS CONVERSATIONS (SQLITE)
            </div>
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: c.id === activeConversationId ? "var(--accent-subtle)" : "var(--surface-2)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: c.id === activeConversationId ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.title}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                    {new Date(c.updatedAt).toLocaleDateString()} • {c.modelId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  title="Delete Conversation"
                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px", opacity: 0.8 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Model Selector & Diagnostics Bar */}
      <div
        style={{
          padding: "10px 16px",
          background: "var(--surface-2)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: "700", color: "var(--text)" }}>
            <Cpu size={14} style={{ color: "var(--accent)" }} /> Loaded AI Weights:
          </div>
          <button
            type="button"
            onClick={handleImportOwnModel}
            disabled={isImporting}
            title="Import custom GGUF or ONNX model file from disk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <FolderInput size={12} style={{ color: "var(--accent)" }} />
            {isImporting ? "Importing..." : "Import Model"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <select
            value={selectedModel}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedModel(val);
              if ((window as any).desktop?.models?.preload) {
                void (window as any).desktop.models.preload(val).then(checkEngineStatus);
              }
            }}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "11.5px",
              fontWeight: "600",
            }}
          >
            <optgroup label="Fast Bundled Quantized Models">
              <option value="smollm2-135m">SmolLM2 135M Instruct (101MB GGUF - Fastest)</option>
              <option value="smollm2-360m">SmolLM2 360M Instruct (258MB GGUF)</option>
              <option value="qwen2.5-0.5b">Qwen 2.5 0.5B Instruct (390MB GGUF)</option>
            </optgroup>
            {installedModels.length > 0 && (
              <optgroup label="Local Installed Models">
                {installedModels.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.name} ({Math.round(m.sizeBytes / (1024 * 1024))}MB)
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Quick Download Button if not yet installed */}
          {!installedModels.some(m => m.modelId === selectedModel) && (
            <button
              type="button"
              onClick={() => handleDownloadBundledModel(selectedModel)}
              disabled={isDownloading}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                background: "var(--accent)",
                color: "#FFFFFF",
                border: "none",
                fontSize: "11px",
                fontWeight: "700",
                cursor: isDownloading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {isDownloading ? <RefreshCw size={12} className="spin" /> : <Download size={12} />}
              {isDownloading ? `${downloadProgress?.progressPercentage || 0}%` : "Download"}
            </button>
          )}
        </div>

        {/* Engine error banner */}
        {engineStatus.error && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", padding: "4px 8px", borderRadius: "6px" }}>
            <AlertCircle size={12} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{engineStatus.error}</span>
          </div>
        )}
      </div>

      {/* Message Chat List */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "20px",
              color: "var(--muted)",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <Bot size={24} />
            </div>
            <div style={{ fontWeight: "800", fontSize: "15px", color: "var(--text)" }}>
              ReconcAILe Co-Pilot Assistant
            </div>
            <div style={{ fontSize: "12px", lineHeight: "1.5", maxWidth: "290px" }}>
              Native offline inference loaded in-memory. Type <code style={{ color: "var(--accent)", fontWeight: "700" }}>@</code> to mention documents, companies, or statements.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", marginTop: "10px" }}>
              {[
                "Explain Canara Bank statement closing balance discrepancy",
                "What is double entry rule for debit notes in GST?",
                "Classify this narration: UPI/2310/AMAZON/SELLER",
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(suggestion);
                    inputRef.current?.focus();
                  }}
                  style={{
                    padding: "8px 12px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    fontSize: "11.5px",
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "10.5px",
                  color: "var(--muted)",
                  padding: "0 4px",
                }}
              >
                {msg.role === "user" ? (
                  <>
                    <span>You</span>
                    <User size={11} />
                  </>
                ) : (
                  <>
                    <Bot size={11} style={{ color: "var(--accent)" }} />
                    <span>{msg.model || "Co-Pilot"}</span>
                  </>
                )}
                <span>• {msg.timestamp}</span>
              </div>

              <div
                style={{
                  maxWidth: "90%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  background: msg.role === "user" ? "var(--accent)" : "var(--surface-2)",
                  color: msg.role === "user" ? "#FFFFFF" : "var(--text)",
                  border: msg.role === "user" ? "none" : "1px solid var(--line)",
                  fontSize: "12.5px",
                  lineHeight: "1.55",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isGenerating && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)", fontSize: "12px", padding: "6px" }}>
            <RefreshCw size={13} className="spin" style={{ color: "var(--accent)" }} />
            <span>Generating answer with {selectedModel}...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* '@' App Functions Popup Menu */}
      {menuMode === "@" && (
        <div
          style={{
            position: "relative",
            margin: "0 14px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "10px",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.25)",
            maxHeight: "220px",
            overflowY: "auto",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            zIndex: 960,
          }}
        >
          <div style={{ padding: "4px 8px", fontSize: "11px", fontWeight: "800", color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px" }}>
            <AtSign size={12} /> SELECT APP FUNCTION / COMMAND
          </div>
          {APP_FUNCTIONS.filter(f => f.key.toLowerCase().includes(filterText) || f.label.toLowerCase().includes(filterText)).map(fn => (
            <div
              key={fn.key}
              onClick={() => handleSelectFunction(fn.key)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                padding: "6px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                background: "var(--surface-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700", color: "var(--accent)" }}>
                <span>{fn.key}</span>
                <span style={{ color: "var(--text)", fontWeight: "600" }}>— {fn.label}</span>
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>{fn.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* '/' Documents & App Resources Context Mention Dropdown */}
      {menuMode === "/" && (
        <div
          style={{
            position: "relative",
            margin: "0 14px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "10px",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.25)",
            maxHeight: "240px",
            overflowY: "auto",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            zIndex: 960,
          }}
        >
          <div style={{ padding: "4px 8px", fontSize: "11px", fontWeight: "800", color: "#3b82f6", display: "flex", alignItems: "center", gap: "4px" }}>
            <FolderInput size={12} /> ATTACH APP RESOURCE OR DOCUMENT
          </div>

          {filteredDocs.length > 0 && (
            <div>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "700", padding: "4px 8px" }}>PARSED INVOICES & DOCUMENTS</div>
              {filteredDocs.slice(0, 5).map(doc => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDocumentMention("doc", doc.name)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11.5px", color: "var(--text)", background: "var(--surface-2)" }}
                >
                  <FileText size={12} style={{ color: "var(--accent)" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</span>
                </div>
              ))}
            </div>
          )}

          {filteredSessions.length > 0 && (
            <div>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "700", padding: "4px 8px" }}>BANK STATEMENTS</div>
              {filteredSessions.slice(0, 5).map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectDocumentMention("statement", `${s.bankName || "Bank Statement"} - ${s.fileName || "Statement"}`)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11.5px", color: "var(--text)", background: "var(--surface-2)" }}
                >
                  <Landmark size={12} style={{ color: "#f59e0b" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.bankName || "Bank Statement"} ({s.fileName || "File"})</span>
                </div>
              ))}
            </div>
          )}

          {filteredCompanies.length > 0 && (
            <div>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "700", padding: "4px 8px" }}>COMPANIES</div>
              {filteredCompanies.slice(0, 5).map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelectDocumentMention("company", c.name)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11.5px", color: "var(--text)", background: "var(--surface-2)" }}
                >
                  <Building2 size={12} style={{ color: "#3b82f6" }} />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attached Files List Pills */}
      {attachedFiles.length > 0 && (
        <div style={{ padding: "4px 16px", display: "flex", gap: "6px", flexWrap: "wrap", background: "var(--surface)" }}>
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                color: "var(--text)",
              }}
            >
              <FileText size={11} style={{ color: "var(--accent)" }} />
              <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
              <button
                type="button"
                onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "0 2px" }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--line)",
          background: "var(--surface)",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        {/* Hidden File Input */}
        <input
          ref={fileAttachmentRef}
          type="file"
          accept=".pdf,.csv,.xlsx,.xml,.json,.txt"
          onChange={handleFileAttach}
          style={{ display: "none" }}
        />

        <button
          type="button"
          onClick={() => fileAttachmentRef.current?.click()}
          title="Attach document from computer"
          style={{
            padding: "8px",
            borderRadius: "8px",
            background: "var(--surface-2)",
            color: "var(--muted)",
            border: "1px solid var(--line)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FolderInput size={15} />
        </button>

        <button
          type="button"
          onClick={() => {
            setMenuMode(menuMode === "@" ? null : "@");
            inputRef.current?.focus();
          }}
          title="List App Functions (@)"
          style={{
            padding: "8px",
            borderRadius: "8px",
            background: menuMode === "@" ? "var(--accent-subtle)" : "var(--surface-2)",
            color: menuMode === "@" ? "var(--accent)" : "var(--muted)",
            border: "1px solid var(--line)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "800",
          }}
        >
          @
        </button>

        <button
          type="button"
          onClick={() => {
            setMenuMode(menuMode === "/" ? null : "/");
            inputRef.current?.focus();
          }}
          title="List Documents & Statements (/)"
          style={{
            padding: "8px",
            borderRadius: "8px",
            background: menuMode === "/" ? "var(--accent-subtle)" : "var(--surface-2)",
            color: menuMode === "/" ? "var(--accent)" : "var(--muted)",
            border: "1px solid var(--line)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "800",
          }}
        >
          /
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={`Type @ for functions, / for docs...`}
          disabled={isGenerating}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--text)",
            fontSize: "12.5px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={(!inputText.trim() && attachedFiles.length === 0) || isGenerating}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            background: (inputText.trim() || attachedFiles.length > 0) && !isGenerating ? "var(--accent)" : "var(--surface-2)",
            color: (inputText.trim() || attachedFiles.length > 0) && !isGenerating ? "#FFFFFF" : "var(--muted)",
            border: "none",
            cursor: (inputText.trim() || attachedFiles.length > 0) && !isGenerating ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
