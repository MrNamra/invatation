"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  KeyRound,
  Layers,
  LogOut,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { AmCrest } from "@/components/AmCrest";
import {
  parseGuestCsv,
  SAMPLE_GUEST_CSV,
  sanitizePhoneNumber,
  type ParsedCsvGuestRow,
} from "@/lib/csv";
import { ORDERED_EVENT_IDS, TEMPLATES } from "@/lib/default-template";
import {
  getAllConfigEventsOrdered,
  getEventShortLabel,
  sortEventsChronologically,
} from "@/lib/events";
import {
  buildInviteUrl,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  formatPhoneDisplay,
} from "@/lib/whatsapp";
import type { StorageBackendState } from "@/lib/db";
import type {
  EventId,
  GuestRecord,
  InvitationConfig,
  PublicHostUser,
  TemplateId,
} from "@/types/invitation";

const EASE = [0.22, 1, 0.36, 1] as const;

type NavTab = "ledger" | "templates" | "ceremonies";
type StatusFilter = "all" | "pending_send" | "opened" | "attending";

interface HostDashboardProps {
  initialConfig: InvitationConfig;
  initialGuests: GuestRecord[];
  initialStorageBackend: StorageBackendState;
  schemaSql?: string;
  supabaseProjectRef?: string | null;
  currentUser: PublicHostUser;
  registrationEnabled?: boolean;
  maxUsers?: number;
}

export function HostDashboard({
  initialConfig,
  initialGuests,
  initialStorageBackend,
  schemaSql = "",
  supabaseProjectRef = null,
  currentUser,
  registrationEnabled = false,
  maxUsers = 1,
}: HostDashboardProps) {
  const [hostUser, setHostUser] = useState<PublicHostUser>(currentUser);
  const [config, setConfig] = useState<InvitationConfig>(initialConfig);
  const [guests, setGuests] = useState<GuestRecord[]>(initialGuests);
  const [storageBackend, setStorageBackend] = useState<StorageBackendState>(
    initialStorageBackend
  );
  const [checkingSchema, setCheckingSchema] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>("ledger");

  // Account settings & sign-out state
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountDisplayName, setAccountDisplayName] = useState(
    currentUser.display_name
  );
  const [accountEmail, setAccountEmail] = useState(currentUser.email);
  const [accountCurrentPassword, setAccountCurrentPassword] = useState("");
  const [accountNewPassword, setAccountNewPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Selection & Filters
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(
    initialGuests[0]?.id ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [eventFilter, setEventFilter] = useState<EventId | "all">("all");

  // CSV Staging
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvSectionRef = useRef<HTMLDivElement | null>(null);
  const [defaultCountryCode, setDefaultCountryCode] = useState("91");
  const [stagedRows, setStagedRows] = useState<ParsedCsvGuestRow[]>([]);
  const [selectedStageIndexes, setSelectedStageIndexes] = useState<number[]>(
    []
  );
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);

  // Add Guest Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");
  const [newGuestEvents, setNewGuestEvents] = useState<EventId[]>([
    "grah_shanti",
    "wedding",
    "reception_jariwala",
  ]);
  const [addingGuest, setAddingGuest] = useState(false);

  // Inline Guest & Event Permissions Editor
  const [editingPermissionsGuestId, setEditingPermissionsGuestId] = useState<
    string | null
  >(null);
  const [editingNameDraft, setEditingNameDraft] = useState("");
  const [editingPhoneDraft, setEditingPhoneDraft] = useState("");
  const [editingEventsDraft, setEditingEventsDraft] = useState<EventId[]>([]);
  const [savingGuestId, setSavingGuestId] = useState<string | null>(null);

  // Feedback / Toast
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  // Config draft for Ceremonies & Copy tab
  const [configDraft, setConfigDraft] = useState<InvitationConfig>(initialConfig);
  const [savingConfig, setSavingConfig] = useState(false);

  const showNotice = useCallback(
    (kind: "success" | "error", text: string) => {
      setNotice({ kind, text });
      window.setTimeout(() => {
        setNotice((curr) => (curr?.text === text ? null : curr));
      }, 3600);
    },
    []
  );

  const getAppOrigin = useCallback(() => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (envUrl) return envUrl.replace(/\/+$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "http://localhost:3000";
  }, []);

  const orderedEvents = useMemo(
    () => getAllConfigEventsOrdered(config),
    [config]
  );

  const selectedGuest = useMemo(
    () => guests.find((g) => g.id === selectedGuestId) ?? guests[0] ?? null,
    [guests, selectedGuestId]
  );

  const filteredGuests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return guests.filter((g) => {
      if (q) {
        const matchName = g.guest_name.toLowerCase().includes(q);
        const matchCode = g.unique_code.toLowerCase().includes(q);
        const matchPhone = g.phone_number.includes(q);
        if (!matchName && !matchCode && !matchPhone) return false;
      }
      if (statusFilter === "pending_send" && g.whatsapp_sent_status) {
        return false;
      }
      if (statusFilter === "opened" && !g.viewed_status) {
        return false;
      }
      if (statusFilter === "attending" && g.rsvp_status !== "attending") {
        return false;
      }
      if (
        eventFilter !== "all" &&
        !g.allowed_events.includes(eventFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [guests, searchQuery, statusFilter, eventFilter]);

  const stats = useMemo(() => {
    const total = guests.length;
    const totalPasses = guests.reduce(
      (acc, g) => acc + g.allowed_events.length,
      0
    );
    const sent = guests.filter((g) => g.whatsapp_sent_status).length;
    const pendingSend = total - sent;
    const opened = guests.filter((g) => g.viewed_status).length;
    const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
    const attending = guests.filter((g) => g.rsvp_status === "attending");
    const attendingHeadcount = attending.reduce(
      (acc, g) => acc + (g.rsvp_guests_count || 1),
      0
    );
    return {
      total,
      totalPasses,
      sent,
      pendingSend,
      opened,
      openRate,
      attendingCount: attending.length,
      attendingHeadcount,
    };
  }, [guests]);

  const processCsvText = useCallback(
    (csvText: string, fileName: string) => {
      const parsed = parseGuestCsv(csvText, defaultCountryCode);
      setStagedRows(parsed.rows);
      setCsvErrors(parsed.errors);
      setCsvFileName(fileName);
      setSelectedStageIndexes(
        parsed.rows.filter((r) => r.valid).map((r) => r.rowIndex)
      );
      if (parsed.rows.length === 0) {
        showNotice("error", "No data rows found in CSV");
      }
    },
    [defaultCountryCode, showNotice]
  );

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      processCsvText(String(reader.result ?? ""), file.name);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadSampleCsv = () => {
    processCsvText(SAMPLE_GUEST_CSV, "sample-surat-guests.csv");
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_GUEST_CSV], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wedding-guests-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmCsvImport = async () => {
    const rowsToImport = stagedRows.filter(
      (r) => r.valid && selectedStageIndexes.includes(r.rowIndex)
    );
    if (rowsToImport.length === 0) return;

    setImportingCsv(true);
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: rowsToImport.map((r) => ({
            guest_name: r.guest_name,
            phone_number: r.phone_number,
            allowed_events: r.allowed_events,
          })),
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = (await res.json()) as {
        created?: GuestRecord[];
        error?: string;
      };
      if (!res.ok || !data.created) {
        throw new Error(data.error || "Import failed");
      }
      setGuests((prev) => [...data.created!, ...prev]);
      if (data.created[0]) {
        setSelectedGuestId(data.created[0].id);
      }
      setStagedRows([]);
      setSelectedStageIndexes([]);
      setCsvFileName(null);
      showNotice(
        "success",
        `Generated unique codes for ${data.created.length} guests`
      );
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to import guests"
      );
    } finally {
      setImportingCsv(false);
    }
  };

  const handleAddSingleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = sanitizePhoneNumber(newGuestPhone, defaultCountryCode);
    if (!newGuestName.trim() || cleanPhone.length < 10) {
      showNotice("error", "Enter a valid guest name and WhatsApp number");
      return;
    }

    setAddingGuest(true);
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: [
            {
              guest_name: newGuestName.trim(),
              phone_number: cleanPhone,
              allowed_events: sortEventsChronologically(newGuestEvents),
            },
          ],
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = (await res.json()) as {
        created?: GuestRecord[];
        error?: string;
      };
      if (!res.ok || !data.created?.[0]) {
        throw new Error(data.error || "Could not add guest");
      }
      setGuests((prev) => [data.created![0], ...prev]);
      setSelectedGuestId(data.created[0].id);
      setNewGuestName("");
      setNewGuestPhone("");
      setAddModalOpen(false);
      showNotice("success", `Added ${data.created[0].guest_name}`);
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to add guest"
      );
    } finally {
      setAddingGuest(false);
    }
  };

  const handleSendWhatsApp = async (guest: GuestRecord) => {
    const origin = getAppOrigin();
    const waUrl = buildWhatsAppUrl(guest, config, origin);
    window.open(waUrl, "_blank", "noopener,noreferrer");

    if (!guest.whatsapp_sent_status) {
      try {
        const res = await fetch(`/api/guests/${guest.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsapp_sent_status: true }),
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = (await res.json()) as { guest?: GuestRecord };
        if (res.ok && data.guest) {
          setGuests((prev) =>
            prev.map((g) => (g.id === guest.id ? data.guest! : g))
          );
        }
      } catch {
        // Non-blocking status sync
      }
    }
  };

  const handleCopyInviteLink = async (guest: GuestRecord) => {
    const url = buildInviteUrl(getAppOrigin(), guest.unique_code);
    await navigator.clipboard.writeText(url);
    setCopiedCode(guest.unique_code);
    window.setTimeout(() => {
      setCopiedCode((curr) => (curr === guest.unique_code ? null : curr));
    }, 2000);
  };

  const handleSavePermissions = async (guestId: string) => {
    const cleanName = editingNameDraft.trim();
    const cleanPhone = sanitizePhoneNumber(editingPhoneDraft, defaultCountryCode);
    if (!cleanName || cleanPhone.length < 10) {
      showNotice("error", "Enter a valid guest name and WhatsApp number");
      return;
    }

    setSavingGuestId(guestId);
    try {
      const res = await fetch(`/api/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: cleanName,
          phone_number: cleanPhone,
          allowed_events: sortEventsChronologically(editingEventsDraft),
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = (await res.json()) as { guest?: GuestRecord; error?: string };
      if (!res.ok || !data.guest) {
        throw new Error(data.error || "Update failed");
      }
      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? data.guest! : g))
      );
      setEditingPermissionsGuestId(null);
      showNotice("success", `Updated ${data.guest.guest_name}`);
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Could not update guest"
      );
    } finally {
      setSavingGuestId(null);
    }
  };

  const handleDeleteGuest = async (guest: GuestRecord) => {
    try {
      const res = await fetch(`/api/guests/${guest.id}`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Failed to remove guest");
      setGuests((prev) => prev.filter((g) => g.id !== guest.id));
      if (selectedGuestId === guest.id) {
        setSelectedGuestId(null);
      }
      showNotice("success", `Removed ${guest.guest_name}`);
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to remove guest"
      );
    }
  };

  const handleSelectTemplate = async (templateId: TemplateId) => {
    setConfig((prev) => ({ ...prev, template_id: templateId }));
    setConfigDraft((prev) => ({ ...prev, template_id: templateId }));
    try {
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = (await res.json()) as {
        config?: InvitationConfig;
        storageBackend?: StorageBackendState;
        error?: string;
      };
      if (!res.ok || !data.config) {
        throw new Error(data.error || "Failed to update template");
      }
      setConfig(data.config);
      setConfigDraft((prev) => ({
        ...prev,
        template_id: data.config!.template_id,
      }));
      if (data.storageBackend) {
        setStorageBackend(data.storageBackend);
      }
      showNotice("success", `Active template set to ${TEMPLATES[templateId].name}`);
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to save template"
      );
    }
  };

  const handleSaveConfigDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couple: configDraft.couple,
          parents: configDraft.parents,
          copy: configDraft.copy,
          events: configDraft.events,
          whatsapp_message_template: configDraft.whatsapp_message_template,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = (await res.json()) as {
        config?: InvitationConfig;
        storageBackend?: StorageBackendState;
        error?: string;
      };
      if (!res.ok || !data.config) {
        throw new Error(data.error || "Failed to save configuration");
      }
      setConfig(data.config);
      setConfigDraft(data.config);
      if (data.storageBackend) {
        setStorageBackend(data.storageBackend);
      }
      showNotice("success", "Saved couple, copy, ceremony, and message configuration");
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRestoreDemoGuests = async () => {
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_demo" }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = (await res.json()) as { guests?: GuestRecord[] };
      if (res.ok && data.guests) {
        setGuests(data.guests);
        showNotice("success", "Restored sample Surat guest records");
      }
    } catch {
      showNotice("error", "Could not restore sample guests");
    }
  };

  const handleCopySchemaSql = async () => {
    if (!schemaSql) return;
    await navigator.clipboard.writeText(schemaSql);
    setCopiedSchema(true);
    window.setTimeout(() => setCopiedSchema(false), 2000);
    showNotice("success", "Copied SQL schema to clipboard");
  };

  const handleVerifySupabaseTables = async () => {
    setCheckingSchema(true);
    try {
      const res = await fetch("/api/health");
      const data = (await res.json()) as {
        storageBackend?: StorageBackendState;
      };
      if (data.storageBackend === "supabase") {
        setStorageBackend("supabase");
        const [cfgRes, gstRes] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/guests"),
        ]);
        if (cfgRes.status === 401 || gstRes.status === 401) {
          window.location.href = "/login";
          return;
        }
        const cfgJson = (await cfgRes.json()) as { config?: InvitationConfig };
        const gstJson = (await gstRes.json()) as { guests?: GuestRecord[] };
        if (cfgJson.config) {
          setConfig(cfgJson.config);
          setConfigDraft(cfgJson.config);
        }
        if (gstJson.guests) {
          setGuests(gstJson.guests);
        }
        showNotice("success", "Connected to Supabase PostgreSQL");
      } else {
        showNotice(
          "error",
          "Tables not found yet — run schema.sql in Supabase SQL Editor first"
        );
      }
    } catch {
      showNotice("error", "Could not verify Supabase connection");
    } finally {
      setCheckingSchema(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: accountDisplayName.trim(),
          email: accountEmail.trim(),
          currentPassword: accountCurrentPassword,
          newPassword: accountNewPassword,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = (await res.json()) as {
        user?: PublicHostUser;
        error?: string;
      };
      if (!res.ok || !data.user) {
        throw new Error(data.error || "Could not update host account");
      }
      setHostUser(data.user);
      setAccountDisplayName(data.user.display_name);
      setAccountEmail(data.user.email);
      setAccountCurrentPassword("");
      setAccountNewPassword("");
      setAccountModalOpen(false);
      showNotice("success", "Updated host account credentials");
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Could not update account"
      );
    } finally {
      setSavingAccount(false);
    }
  };

  const activeTemplateMeta = TEMPLATES[config.template_id];

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#1f1b16] flex flex-col lg:flex-row">
      {/* Sidebar / Mobile Top Navigation */}
      <aside className="w-full lg:w-[264px] shrink-0 bg-[#f2ede3] border-b lg:border-b-0 lg:border-r border-[#1f1b16]/10 flex flex-col justify-between p-3 lg:p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div>
          {/* Flat Logo + Mobile Account/Sign Out */}
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 lg:py-2 mb-2 lg:mb-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#a63429] flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="w-4 h-4"
                >
                  <path
                    d="M4.5 15.5V9C4.5 6 6.96243 4 10 4C13.0376 4 15.5 6 15.5 9V15.5"
                    stroke="#fdfbf7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="10" cy="9.5" r="1.5" fill="#fdfbf7" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[16px] leading-none font-medium tracking-[-0.01em] truncate">
                  Patrika Studio
                </p>
                <p className="text-[12px] text-[#7b7266] mt-1 truncate">
                  {config.couple.groom} &amp; {config.couple.bride}
                </p>
              </div>
            </div>

            <div className="flex lg:hidden items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label="Account settings"
                onClick={() => setAccountModalOpen(true)}
                className="h-8 px-2.5 rounded-lg bg-[#fdfbf7] border border-[#1f1b16]/10 text-[12px] text-[#5e554a] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" strokeWidth={1.5} />
                Account
              </button>
              <button
                type="button"
                aria-label="Sign out"
                disabled={signingOut}
                onClick={handleSignOut}
                className="h-8 px-2.5 rounded-lg bg-[#fdfbf7] border border-[#1f1b16]/10 text-[12px] text-[#5e554a] inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          </div>

          <p className="hidden lg:block text-[12px] text-[#7b7266] px-2 mt-6 mb-2">
            Workspace
          </p>

          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={`h-8 lg:h-9 px-2.5 lg:px-3 rounded-lg flex items-center gap-1.5 lg:gap-2.5 text-[13px] lg:text-[14px] whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 ${
                activeTab === "ledger"
                  ? "bg-[#fdfbf7] text-[#1f1b16] font-medium border border-[#1f1b16]/10"
                  : "text-[#5e554a] hover:bg-[#efe9df]"
              }`}
            >
              <Users
                className="w-4 h-4 lg:w-[18px] lg:h-[18px] shrink-0 text-[#7b7266]"
                strokeWidth={1.5}
              />
              Guest ledger
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={`h-8 lg:h-9 px-2.5 lg:px-3 rounded-lg flex items-center gap-1.5 lg:gap-2.5 text-[13px] lg:text-[14px] whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 ${
                activeTab === "templates"
                  ? "bg-[#fdfbf7] text-[#1f1b16] font-medium border border-[#1f1b16]/10"
                  : "text-[#5e554a] hover:bg-[#efe9df]"
              }`}
            >
              <Layers
                className="w-4 h-4 lg:w-[18px] lg:h-[18px] shrink-0 text-[#7b7266]"
                strokeWidth={1.5}
              />
              Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ceremonies")}
              className={`h-8 lg:h-9 px-2.5 lg:px-3 rounded-lg flex items-center gap-1.5 lg:gap-2.5 text-[13px] lg:text-[14px] whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 ${
                activeTab === "ceremonies"
                  ? "bg-[#fdfbf7] text-[#1f1b16] font-medium border border-[#1f1b16]/10"
                  : "text-[#5e554a] hover:bg-[#efe9df]"
              }`}
            >
              <Calendar
                className="w-4 h-4 lg:w-[18px] lg:h-[18px] shrink-0 text-[#7b7266]"
                strokeWidth={1.5}
              />
              Ceremonies &amp; Copy
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="hidden lg:flex flex-col gap-2 pt-4 border-t border-[#1f1b16]/10">
          <div className="rounded-lg bg-[#fdfbf7] border border-[#1f1b16]/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Database
                className="w-4 h-4 text-[#7b7266] shrink-0"
                strokeWidth={1.5}
              />
              <span className="text-[12px] font-medium text-[#1f1b16]">
                {storageBackend === "supabase"
                  ? "Supabase PostgreSQL"
                  : storageBackend === "supabase_needs_schema"
                    ? "Supabase setup pending"
                    : "Local file store"}
              </span>
            </div>
            <p className="text-[12px] text-[#7b7266] mt-1 leading-snug">
              {storageBackend === "supabase"
                ? "Connected via environment config"
                : storageBackend === "supabase_needs_schema"
                  ? "Run supabase/schema.sql in your SQL Editor to enable sync"
                  : "Set Supabase env keys in .env for cloud sync"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="h-8 px-2.5 rounded-lg flex items-center gap-2 text-[13px] text-[#5e554a] hover:bg-[#efe9df] transition-colors duration-150 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#7b7266]" strokeWidth={1.5} />
            Download sample CSV
          </button>

          <button
            type="button"
            onClick={handleRestoreDemoGuests}
            className="h-8 px-2.5 rounded-lg flex items-center gap-2 text-[13px] text-[#5e554a] hover:bg-[#efe9df] transition-colors duration-150 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#7b7266]" strokeWidth={1.5} />
            Restore demo guests
          </button>

          <div className="mt-1 pt-2 border-t border-[#1f1b16]/10 flex flex-col gap-1.5">
            <div className="px-2">
              <p className="text-[12px] font-medium text-[#1f1b16] truncate">
                {hostUser.display_name}
              </p>
              <p className="text-[11px] font-mono-tabular text-[#7b7266] truncate">
                {hostUser.email}
              </p>
              <p className="text-[11px] text-[#7b7266] mt-0.5 tabular-nums">
                Single user ({maxUsers}) · Registration{" "}
                {registrationEnabled ? "on" : "off"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-1">
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="flex-1 h-8 px-2.5 rounded-lg bg-[#fdfbf7] border border-[#1f1b16]/10 flex items-center justify-center gap-1.5 text-[12px] text-[#5e554a] hover:text-[#1f1b16] transition-colors duration-150 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#7b7266]" strokeWidth={1.5} />
                Account
              </button>
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="flex-1 h-8 px-2.5 rounded-lg bg-[#fdfbf7] border border-[#1f1b16]/10 flex items-center justify-center gap-1.5 text-[12px] text-[#5e554a] hover:text-[#1f1b16] disabled:opacity-50 transition-colors duration-150 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#7b7266]" strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="min-h-[60px] shrink-0 px-4 sm:px-6 py-2.5 sm:py-0 border-b border-[#1f1b16]/10 bg-[#f7f4ee] flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-medium tracking-[-0.01em] truncate">
              {activeTab === "ledger"
                ? "Guest ledger"
                : activeTab === "templates"
                  ? "Templates"
                  : "Ceremonies & Copy"}
            </h1>
            <span className="hidden sm:inline text-[13px] text-[#7b7266] font-mono-tabular">
              {config.couple.hashtag}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {notice ? (
              <span
                className={`hidden md:inline-flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-md border ${
                  notice.kind === "success"
                    ? "bg-[#1d6f42]/10 border-[#1d6f42]/20 text-[#1d6f42]"
                    : "bg-[#b91c1c]/10 border-[#b91c1c]/20 text-[#b91c1c]"
                }`}
              >
                {notice.text}
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setActiveTab("ledger");
                window.setTimeout(() => {
                  fileInputRef.current?.click();
                }, 40);
              }}
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[12px] sm:text-[13px] font-medium text-[#1f1b16] hover:bg-[#e7dfd2] inline-flex items-center gap-1.5 sm:gap-2 transition-colors duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5e554a]" strokeWidth={1.5} />
              Upload CSV
            </button>

            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-lg bg-[#1f1b16] text-[#fdfbf7] text-[12px] sm:text-[13px] font-medium hover:bg-[#332d25] inline-flex items-center gap-1.5 sm:gap-2 transition-colors duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.5} />
              Add guest
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto flex flex-col gap-5 sm:gap-6">
          {notice ? (
            <div
              className={`md:hidden rounded-lg px-3 py-2 text-[13px] border ${
                notice.kind === "success"
                  ? "bg-[#1d6f42]/10 border-[#1d6f42]/20 text-[#1d6f42]"
                  : "bg-[#b91c1c]/10 border-[#b91c1c]/20 text-[#b91c1c]"
              }`}
            >
              {notice.text}
            </div>
          ) : null}

          {storageBackend === "supabase_needs_schema" ? (
            <section className="rounded-xl bg-[#fdfbf7] border border-[#a85c12]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-[#1f1b16]">
                  Supabase API connected — provision database tables to switch from local fallback
                </p>
                <p className="text-[13px] text-[#5e554a] mt-0.5">
                  Copy and run <span className="font-mono-tabular">supabase/schema.sql</span> in your Supabase SQL Editor, then verify tables.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopySchemaSql}
                  className="h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px] font-medium text-[#1f1b16] hover:bg-[#e7dfd2] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSchema ? (
                    <Check className="w-4 h-4 text-[#1d6f42]" strokeWidth={1.5} />
                  ) : (
                    <Copy className="w-4 h-4 text-[#5e554a]" strokeWidth={1.5} />
                  )}
                  {copiedSchema ? "SQL copied" : "Copy SQL schema"}
                </button>
                {supabaseProjectRef ? (
                  <a
                    href={`https://supabase.com/dashboard/project/${supabaseProjectRef}/sql/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px] font-medium text-[#1f1b16] hover:bg-[#e7dfd2] inline-flex items-center gap-1.5"
                  >
                    Open SQL Editor
                    <ExternalLink className="w-3.5 h-3.5 text-[#5e554a]" strokeWidth={1.5} />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={handleVerifySupabaseTables}
                  disabled={checkingSchema}
                  className="h-9 px-3.5 rounded-lg bg-[#a63429] text-[#fdfbf7] text-[13px] font-medium hover:bg-[#8c2a20] disabled:opacity-50 cursor-pointer"
                >
                  {checkingSchema ? "Checking..." : "Verify tables"}
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "ledger" ? (
            <>
              {/* 4 Stat Cards (numbers only, equal height) */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-4 flex flex-col justify-between">
                  <p className="text-[13px] text-[#5e554a]">Total guests</p>
                  <p className="text-[28px] leading-none font-medium tabular-nums mt-3">
                    {stats.total}
                  </p>
                  <p className="text-[12px] text-[#7b7266] mt-2 tabular-nums">
                    {stats.totalPasses} ceremony passes assigned
                  </p>
                </div>

                <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-4 flex flex-col justify-between">
                  <p className="text-[13px] text-[#5e554a]">WhatsApp sent</p>
                  <p className="text-[28px] leading-none font-medium tabular-nums mt-3">
                    {stats.sent}
                  </p>
                  <p className="text-[12px] text-[#7b7266] mt-2 tabular-nums">
                    {stats.pendingSend} pending dispatch
                  </p>
                </div>

                <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-4 flex flex-col justify-between">
                  <p className="text-[13px] text-[#5e554a]">
                    Invitations opened
                  </p>
                  <p className="text-[28px] leading-none font-medium tabular-nums mt-3">
                    {stats.opened}
                  </p>
                  <p className="text-[12px] text-[#7b7266] mt-2 tabular-nums">
                    {stats.openRate}% of guest links viewed
                  </p>
                </div>

                <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-4 flex flex-col justify-between">
                  <p className="text-[13px] text-[#5e554a]">Confirmed RSVPs</p>
                  <p className="text-[28px] leading-none font-medium tabular-nums mt-3">
                    {stats.attendingCount}
                  </p>
                  <p className="text-[12px] text-[#7b7266] mt-2 tabular-nums">
                    {stats.attendingHeadcount} total seats confirmed
                  </p>
                </div>
              </section>

              {/* Asymmetric Split: CSV Import & Selected Guest Preview */}
              <section
                ref={csvSectionRef}
                className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 items-stretch"
              >
                {/* CSV Uploader & Staging Table */}
                <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-5 flex flex-col justify-between gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[16px] font-medium">
                        CSV guest import
                      </h2>
                      <p className="text-[13px] text-[#5e554a] mt-0.5">
                        Columns: Guest Name, WhatsApp Number, Invited Events
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[12px] text-[#7b7266] flex items-center gap-1.5">
                        Country code
                        <input
                          type="text"
                          value={defaultCountryCode}
                          onChange={(e) =>
                            setDefaultCountryCode(
                              e.target.value.replace(/\D/g, "") || "91"
                            )
                          }
                          className="w-12 h-7 px-2 rounded-md bg-[#efe9df] border border-[#1f1b16]/10 text-[12px] font-mono-tabular text-[#1f1b16] text-center"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleLoadSampleCsv}
                        className="h-8 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[12px] font-medium text-[#1f1b16] hover:bg-[#e7dfd2] transition-colors duration-150 cursor-pointer"
                      >
                        Load sample CSV
                      </button>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFileChange}
                    className="hidden"
                  />

                  {stagedRows.length === 0 ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          processCsvText(
                            String(reader.result ?? ""),
                            file.name
                          );
                        };
                        reader.readAsText(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 min-h-[148px] rounded-lg border border-dashed border-[#1f1b16]/20 bg-[#f7f4ee] px-6 py-6 flex flex-col items-center justify-center text-center hover:bg-[#efe9df]/60 transition-colors duration-150 cursor-pointer"
                    >
                      <FileSpreadsheet
                        className="w-6 h-6 text-[#7b7266] mb-2"
                        strokeWidth={1.5}
                      />
                      <p className="text-[14px] font-medium text-[#1f1b16]">
                        Drop a CSV file here or browse
                      </p>
                      <p className="text-[12px] text-[#7b7266] mt-1">
                        Events like Dinner, Mosariya Sangeet, Grah Shanti, Baraat, Wedding, and Reception are mapped automatically
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#5e554a]">
                          Staged from{" "}
                          <span className="font-mono-tabular text-[#1f1b16]">
                            {csvFileName}
                          </span>{" "}
                          ({stagedRows.length} rows)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setStagedRows([]);
                            setCsvFileName(null);
                            setCsvErrors([]);
                          }}
                          className="text-[12px] text-[#7b7266] hover:text-[#1f1b16] cursor-pointer"
                        >
                          Clear staging
                        </button>
                      </div>

                      {csvErrors.length > 0 ? (
                        <p className="text-[12px] text-[#b91c1c]">
                          {csvErrors[0]}
                        </p>
                      ) : null}

                      <div className="max-h-[210px] overflow-y-auto rounded-lg border border-[#1f1b16]/10">
                        <table className="w-full text-left text-[13px]">
                          <thead className="bg-[#efe9df] text-[#5e554a] border-b border-[#1f1b16]/10">
                            <tr>
                              <th className="py-2 px-3 font-medium w-8">
                                <span className="sr-only">Include</span>
                              </th>
                              <th className="py-2 px-3 font-medium">Guest</th>
                              <th className="py-2 px-3 font-medium">WhatsApp</th>
                              <th className="py-2 px-3 font-medium">
                                Permitted events
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1f1b16]/10">
                            {stagedRows.map((row) => {
                              const checked = selectedStageIndexes.includes(
                                row.rowIndex
                              );
                              return (
                                <tr key={row.rowIndex} className="bg-[#fdfbf7]">
                                  <td className="py-2 px-3">
                                    <input
                                      type="checkbox"
                                      disabled={!row.valid}
                                      checked={checked}
                                      onChange={() =>
                                        setSelectedStageIndexes((prev) =>
                                          prev.includes(row.rowIndex)
                                            ? prev.filter(
                                                (i) => i !== row.rowIndex
                                              )
                                            : [...prev, row.rowIndex]
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="py-2 px-3 font-medium">
                                    {row.guest_name || "Missing name"}
                                    {row.warning ? (
                                      <p className="text-[11px] text-[#a85c12] font-normal">
                                        {row.warning}
                                      </p>
                                    ) : null}
                                  </td>
                                  <td className="py-2 px-3 font-mono-tabular text-[12px] text-[#5e554a]">
                                    {row.phone_number
                                      ? formatPhoneDisplay(row.phone_number)
                                      : "Invalid"}
                                  </td>
                                  <td className="py-2 px-3">
                                    <div className="flex flex-wrap gap-1">
                                      {row.allowed_events.map((ev) => (
                                        <span
                                          key={ev}
                                          className="px-2 py-0.5 rounded bg-[#efe9df] text-[11px] text-[#1f1b16]"
                                        >
                                          {getEventShortLabel(ev, config)}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmCsvImport}
                          disabled={
                            importingCsv || selectedStageIndexes.length === 0
                          }
                          className="h-9 px-4 rounded-lg bg-[#a63429] text-[#fdfbf7] text-[13px] font-medium hover:bg-[#8c2a20] disabled:opacity-50 transition-colors duration-150 active:scale-[0.98] cursor-pointer"
                        >
                          {importingCsv
                            ? "Generating codes..."
                            : `Generate codes & save (${selectedStageIndexes.length})`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Guest Folio Preview Moment */}
                <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-[16px] font-medium">
                        Guest invitation preview
                      </h2>
                      <p className="text-[13px] text-[#5e554a]">
                        Active template: {activeTemplateMeta.name}
                      </p>
                    </div>
                    {selectedGuest ? (
                      <span className="text-[12px] font-mono-tabular px-2 py-1 rounded bg-[#efe9df] text-[#1f1b16]">
                        {selectedGuest.unique_code}
                      </span>
                    ) : null}
                  </div>

                  {selectedGuest ? (
                    <>
                      {activeTemplateMeta.hasSceneArtwork ? (
                        <div className="rounded-xl p-3.5 border border-[#1f1b16]/12 bg-[#f3eee4]/65 flex flex-col sm:flex-row items-stretch gap-3.5">
                          <div className="w-[108px] mx-auto sm:mx-0 shrink-0 aspect-[9/16] rounded-lg overflow-hidden border border-[#1f1b16]/15 relative bg-[#e8eef5] shadow-[0_2px_8px_rgba(31,27,22,0.08)]">
                            <img
                              src="/cards/cover-elephants.jpg"
                              alt="Royal Jharokha invitation card preview"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div
                              className="absolute inset-x-0 top-0 h-[60%] pointer-events-none"
                              style={{
                                background:
                                  "linear-gradient(180deg, rgba(246, 250, 255, 0.55) 0%, rgba(246, 250, 255, 0) 100%)",
                              }}
                            />
                            <div className="absolute inset-x-0 top-[21%] flex flex-col items-center text-center px-3">
                              <AmCrest
                                groom={config.couple.groom}
                                bride={config.couple.bride}
                                hashtag={config.couple.hashtag}
                                tone="rose"
                                className="w-7 h-7 mb-0.5"
                              />
                              <p className="font-calligraphy text-[13px] leading-[1.02] text-[#b92252] truncate max-w-full">
                                {config.couple.groom}
                              </p>
                              <p className="font-heritage-serif text-[8px] font-medium text-[#5e6b34]">
                                Weds
                              </p>
                              <p className="font-calligraphy text-[13px] leading-[1.02] text-[#b92252] truncate max-w-full">
                                {config.couple.bride}
                              </p>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between text-[12px] font-mono-tabular text-[#6c7640] mb-2">
                                <span className="truncate">{config.couple.hashtag}</span>
                                <span className="shrink-0 tabular-nums">
                                  {selectedGuest.allowed_events.length} of{" "}
                                  {ORDERED_EVENT_IDS.length}
                                </span>
                              </div>
                              <p className="text-[12px] text-[#7b7266]">
                                Invited guest
                              </p>
                              <p className="font-heritage-serif text-[20px] leading-tight font-medium text-[#1f1b16] truncate">
                                {selectedGuest.guest_name}
                              </p>
                              <p className="text-[12px] text-[#5e554a] mt-1 truncate">
                                {config.couple.groom} &amp; {config.couple.bride}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {orderedEvents.map((ev) => {
                                const allowed =
                                  selectedGuest.allowed_events.includes(ev.id);
                                return (
                                  <span
                                    key={ev.id}
                                    className="px-2 py-0.5 rounded text-[12px] border"
                                    style={{
                                      borderColor: allowed
                                        ? activeTemplateMeta.previewAccent
                                        : "rgba(31, 27, 22, 0.14)",
                                      color: allowed
                                        ? activeTemplateMeta.previewAccent
                                        : "#7b7266",
                                      backgroundColor: allowed
                                        ? "rgba(194, 45, 90, 0.08)"
                                        : "transparent",
                                      opacity: allowed ? 1 : 0.48,
                                      textDecoration: allowed
                                        ? "none"
                                        : "line-through",
                                    }}
                                  >
                                    {ev.shortLabel}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="rounded-xl p-4 border transition-colors duration-200"
                          style={{
                            backgroundColor: activeTemplateMeta.previewCard,
                            color: activeTemplateMeta.previewText,
                            borderColor: activeTemplateMeta.previewMuted + "33",
                          }}
                        >
                          <div
                            className="flex items-center justify-between text-[12px] font-mono-tabular mb-3"
                            style={{ color: activeTemplateMeta.previewMuted }}
                          >
                            <span>{config.couple.hashtag}</span>
                            <span className="tabular-nums">
                              {selectedGuest.allowed_events.length} of{" "}
                              {ORDERED_EVENT_IDS.length} events
                            </span>
                          </div>
                          <p className="font-serif-display text-[22px] leading-tight">
                            {config.couple.groom} &amp; {config.couple.bride}
                          </p>
                          <p
                            className="text-[12px] mt-1"
                            style={{ color: activeTemplateMeta.previewMuted }}
                          >
                            Invited guest: {selectedGuest.guest_name}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {orderedEvents.map((ev) => {
                              const allowed =
                                selectedGuest.allowed_events.includes(ev.id);
                              return (
                                <span
                                  key={ev.id}
                                  className="px-2 py-0.5 rounded text-[12px] border"
                                  style={{
                                    borderColor: allowed
                                      ? activeTemplateMeta.previewAccent
                                      : activeTemplateMeta.previewMuted + "33",
                                    color: allowed
                                      ? activeTemplateMeta.previewAccent
                                      : activeTemplateMeta.previewMuted,
                                    opacity: allowed ? 1 : 0.45,
                                    textDecoration: allowed
                                      ? "none"
                                      : "line-through",
                                  }}
                                >
                                  {ev.shortLabel}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <a
                          href={`/invite/${selectedGuest.unique_code}?preview=host`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-3.5 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px] font-medium text-[#1f1b16] hover:bg-[#e7dfd2] inline-flex items-center gap-1.5 transition-colors duration-150"
                        >
                          <Eye className="w-4 h-4 text-[#5e554a]" strokeWidth={1.5} />
                          Open guest view
                        </a>

                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(selectedGuest)}
                          className="h-9 px-3.5 rounded-lg bg-[#1d6f42] text-[#fdfbf7] text-[13px] font-medium hover:bg-[#165934] inline-flex items-center gap-1.5 transition-colors duration-150 active:scale-[0.98] cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                          Send via WhatsApp
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] text-[#7b7266] py-8 text-center">
                      Select a guest row below to inspect their permission-filtered invitation
                    </p>
                  )}
                </div>
              </section>

              {/* Guest Table */}
              <section className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 overflow-hidden">
                <div className="p-4 border-b border-[#1f1b16]/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">
                    <div className="relative w-full sm:w-auto">
                      <Search
                        className="w-4 h-4 text-[#7b7266] absolute left-3 top-1/2 -translate-y-1/2"
                        strokeWidth={1.5}
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="h-9 w-full sm:w-56 pl-9 pr-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px] text-[#1f1b16] placeholder:text-[#7b7266] focus:outline-none focus:border-[#1f1b16]/30"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-[#efe9df] p-1 rounded-lg border border-[#1f1b16]/10 overflow-x-auto no-scrollbar max-w-full">
                      {(
                        [
                          { id: "all", label: "All" },
                          { id: "pending_send", label: "Pending send" },
                          { id: "opened", label: "Opened" },
                          { id: "attending", label: "Attending" },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStatusFilter(tab.id)}
                          className={`h-7 px-2.5 rounded-md text-[12px] whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                            statusFilter === tab.id
                              ? "bg-[#fdfbf7] text-[#1f1b16] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                              : "text-[#5e554a] hover:text-[#1f1b16]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Filter by ceremony"
                      value={eventFilter}
                      onChange={(e) =>
                        setEventFilter(e.target.value as EventId | "all")
                      }
                      className="h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px] text-[#1f1b16] focus:outline-none"
                    >
                      <option value="all">All ceremonies</option>
                      {orderedEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.shortLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f7f4ee] border-b border-[#1f1b16]/10 text-[12px] text-[#5e554a]">
                        <th className="py-3 px-4 font-medium">Guest</th>
                        <th className="py-3 px-4 font-medium">Unique code</th>
                        <th className="py-3 px-4 font-medium">
                          Permitted events
                        </th>
                        <th className="py-3 px-4 font-medium">
                          Tracking &amp; RSVP
                        </th>
                        <th className="py-3 px-4 font-medium text-right">
                          Distribution
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1b16]/10 text-[13px]">
                      {filteredGuests.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-10 px-4 text-center text-[#7b7266]"
                          >
                            No guests match the current filters
                          </td>
                        </tr>
                      ) : (
                        filteredGuests.map((guest) => {
                          const isSelected = selectedGuest?.id === guest.id;
                          const isEditingPerms =
                            editingPermissionsGuestId === guest.id;
                          return (
                            <tr
                              key={guest.id}
                              onClick={() => setSelectedGuestId(guest.id)}
                              className={`transition-colors duration-150 cursor-pointer ${
                                isSelected
                                  ? "bg-[#efe9df]/60"
                                  : "hover:bg-[#f7f4ee]"
                              }`}
                            >
                              <td className="py-3.5 px-4 align-top">
                                {isEditingPerms ? (
                                  <div
                                    className="flex flex-col gap-1.5 min-w-[180px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      aria-label="Edit guest name"
                                      value={editingNameDraft}
                                      onChange={(e) =>
                                        setEditingNameDraft(e.target.value)
                                      }
                                      className="w-full h-8 px-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/15 text-[13px] font-medium text-[#1f1b16]"
                                    />
                                    <input
                                      type="tel"
                                      aria-label="Edit WhatsApp number"
                                      value={editingPhoneDraft}
                                      onChange={(e) =>
                                        setEditingPhoneDraft(e.target.value)
                                      }
                                      className="w-full h-8 px-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/15 text-[12px] font-mono-tabular text-[#5e554a]"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-medium text-[#1f1b16]">
                                      {guest.guest_name}
                                    </p>
                                    <p className="text-[12px] font-mono-tabular text-[#7b7266] mt-0.5">
                                      {formatPhoneDisplay(guest.phone_number)}
                                    </p>
                                  </>
                                )}
                              </td>

                              <td className="py-3.5 px-4 align-top">
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="font-mono-tabular text-[12px] px-2 py-1 rounded bg-[#efe9df] border border-[#1f1b16]/10 text-[#1f1b16]">
                                    {guest.unique_code}
                                  </span>
                                  <button
                                    type="button"
                                    title="Copy invitation link"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyInviteLink(guest);
                                    }}
                                    className="w-7 h-7 rounded-md flex items-center justify-center text-[#7b7266] hover:text-[#1f1b16] hover:bg-[#efe9df] transition-colors duration-150 cursor-pointer"
                                  >
                                    {copiedCode === guest.unique_code ? (
                                      <Check
                                        className="w-4 h-4 text-[#1d6f42]"
                                        strokeWidth={1.5}
                                      />
                                    ) : (
                                      <Copy
                                        className="w-4 h-4"
                                        strokeWidth={1.5}
                                      />
                                    )}
                                  </button>
                                </div>
                              </td>

                              <td
                                className="py-3.5 px-4 align-top"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isEditingPerms ? (
                                  <div className="flex flex-col gap-2 max-w-[320px]">
                                    <div className="flex flex-wrap gap-1.5">
                                      {orderedEvents.map((ev) => {
                                        const active =
                                          editingEventsDraft.includes(ev.id);
                                        return (
                                          <button
                                            key={ev.id}
                                            type="button"
                                            onClick={() =>
                                              setEditingEventsDraft((prev) =>
                                                prev.includes(ev.id)
                                                  ? prev.filter(
                                                      (id) => id !== ev.id
                                                    )
                                                  : [...prev, ev.id]
                                              )
                                            }
                                            className={`px-2 py-1 rounded text-[11px] border cursor-pointer ${
                                              active
                                                ? "bg-[#a63429] border-[#a63429] text-[#fdfbf7]"
                                                : "bg-[#f7f4ee] border-[#1f1b16]/15 text-[#5e554a]"
                                            }`}
                                          >
                                            {ev.shortLabel}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={savingGuestId === guest.id}
                                        onClick={() =>
                                          handleSavePermissions(guest.id)
                                        }
                                        className="h-7 px-2.5 rounded bg-[#1f1b16] text-[#fdfbf7] text-[12px] font-medium cursor-pointer"
                                      >
                                        {savingGuestId === guest.id
                                          ? "Saving..."
                                          : "Save"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingPermissionsGuestId(null)
                                        }
                                        className="h-7 px-2.5 rounded bg-[#efe9df] text-[#5e554a] text-[12px] cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {guest.allowed_events.map((evId) => (
                                      <span
                                        key={evId}
                                        className="px-2 py-0.5 rounded bg-[#efe9df] text-[12px] text-[#1f1b16]"
                                      >
                                        {getEventShortLabel(evId, config)}
                                      </span>
                                    ))}
                                    <button
                                      type="button"
                                      title="Edit guest details & permitted events"
                                      onClick={() => {
                                        setEditingPermissionsGuestId(guest.id);
                                        setEditingNameDraft(guest.guest_name);
                                        setEditingPhoneDraft(
                                          guest.phone_number
                                        );
                                        setEditingEventsDraft(
                                          guest.allowed_events
                                        );
                                      }}
                                      className="w-6 h-6 rounded inline-flex items-center justify-center text-[#7b7266] hover:text-[#1f1b16] hover:bg-[#efe9df] cursor-pointer"
                                    >
                                      <Pencil
                                        className="w-3.5 h-3.5"
                                        strokeWidth={1.5}
                                      />
                                    </button>
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-4 align-top">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-block w-2 h-2 rounded-full ${
                                        guest.viewed_status
                                          ? "bg-[#1d6f42]"
                                          : guest.whatsapp_sent_status
                                            ? "bg-[#a85c12]"
                                            : "bg-[#7b7266]/40"
                                      }`}
                                    />
                                    <span className="text-[13px] text-[#1f1b16]">
                                      {guest.viewed_status
                                        ? "Opened"
                                        : guest.whatsapp_sent_status
                                          ? "Sent via WhatsApp"
                                          : "Not sent"}
                                    </span>
                                  </div>
                                  {guest.rsvp_status !== "pending" ? (
                                    <span className="text-[12px] text-[#5e554a] tabular-nums">
                                      RSVP:{" "}
                                      {guest.rsvp_status === "attending"
                                        ? `Attending (${guest.rsvp_guests_count})`
                                        : "Declined"}
                                    </span>
                                  ) : (
                                    <span className="text-[12px] text-[#7b7266]">
                                      RSVP pending
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td
                                className="py-3.5 px-4 align-top text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsApp(guest)}
                                    className={`h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-150 active:scale-[0.98] cursor-pointer ${
                                      guest.whatsapp_sent_status
                                        ? "bg-[#efe9df] border border-[#1f1b16]/10 text-[#5e554a] hover:text-[#1f1b16]"
                                        : "bg-[#1d6f42] text-[#fdfbf7] hover:bg-[#165934]"
                                    }`}
                                  >
                                    <MessageCircle
                                      className="w-3.5 h-3.5"
                                      strokeWidth={1.5}
                                    />
                                    {guest.whatsapp_sent_status
                                      ? "Resend"
                                      : "Send via WhatsApp"}
                                  </button>

                                  <a
                                    href={`/invite/${guest.unique_code}?preview=host`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Preview invitation"
                                    className="w-8 h-8 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 inline-flex items-center justify-center text-[#5e554a] hover:text-[#1f1b16] transition-colors duration-150"
                                  >
                                    <ExternalLink
                                      className="w-3.5 h-3.5"
                                      strokeWidth={1.5}
                                    />
                                  </a>

                                  <button
                                    type="button"
                                    title="Delete guest"
                                    onClick={() => handleDeleteGuest(guest)}
                                    className="w-8 h-8 rounded-lg border border-transparent inline-flex items-center justify-center text-[#7b7266] hover:text-[#b91c1c] hover:bg-[#b91c1c]/10 transition-colors duration-150 cursor-pointer"
                                  >
                                    <Trash2
                                      className="w-3.5 h-3.5"
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : activeTab === "templates" ? (
            <section className="flex flex-col gap-6">
              <div>
                <h2 className="text-[18px] font-medium">
                  Invitation folio templates
                </h2>
                <p className="text-[14px] text-[#5e554a] mt-1">
                  Select a stationery theme. All active guest links adapt immediately while preserving each guest&apos;s strict ceremony permissions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {(Object.keys(TEMPLATES) as TemplateId[]).map((tplId) => {
                  const tpl = TEMPLATES[tplId];
                  const isActive = config.template_id === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      className={`rounded-xl p-4 bg-[#fdfbf7] border flex flex-col justify-between gap-4 transition-colors duration-150 ${
                        isActive
                          ? "border-[#a63429]"
                          : "border-[#1f1b16]/10"
                      }`}
                    >
                      <div>
                        <div
                          className="h-[212px] rounded-lg p-3 border mb-4 flex items-center justify-center overflow-hidden"
                          style={{
                            backgroundColor: tpl.previewBg,
                            borderColor: tpl.previewMuted + "2A",
                          }}
                        >
                          {tpl.hasSceneArtwork ? (
                            <div className="aspect-[9/16] h-full rounded-md overflow-hidden border border-[#1f1b16]/15 relative bg-[#fdfbf7] shadow-[0_6px_16px_rgba(31,27,22,0.12)]">
                              <img
                                src="/cards/cover-elephants.jpg"
                                alt="Royal Jharokha & Starlight preview"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div
                                className="absolute inset-x-0 top-0 h-[62%] pointer-events-none"
                                style={{
                                  background:
                                    "linear-gradient(180deg, rgba(246, 250, 255, 0.56) 0%, rgba(246, 250, 255, 0) 100%)",
                                }}
                              />
                              <div className="absolute inset-x-0 top-[21%] flex flex-col items-center text-center px-3">
                                <AmCrest
                                  groom={config.couple.groom}
                                  bride={config.couple.bride}
                                  hashtag={config.couple.hashtag}
                                  tone="rose"
                                  className="w-7 h-7 mb-0.5"
                                />
                                <p className="font-calligraphy text-[13px] leading-[1.02] text-[#b92252] truncate max-w-full">
                                  {config.couple.groom}
                                </p>
                                <p className="font-heritage-serif text-[8px] font-medium text-[#5e6b34]">
                                  Weds
                                </p>
                                <p className="font-calligraphy text-[13px] leading-[1.02] text-[#b92252] truncate max-w-full">
                                  {config.couple.bride}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-full rounded-md p-4 border"
                              style={{
                                backgroundColor: tpl.previewCard,
                                borderColor: tpl.previewMuted + "33",
                                color: tpl.previewText,
                              }}
                            >
                              <p
                                className="text-[12px] font-mono-tabular mb-2 truncate"
                                style={{ color: tpl.previewAccent }}
                              >
                                {config.couple.hashtag}
                              </p>
                              <p className="font-serif-display text-[20px] leading-tight truncate">
                                {config.couple.groom} &amp;{" "}
                                {config.couple.bride}
                              </p>
                              <p
                                className="text-[12px] mt-1"
                                style={{ color: tpl.previewMuted }}
                              >
                                {[config.copy.city_label, config.copy.date_range_label]
                                  .filter(Boolean)
                                  .join(" · ") || "Surat · Nov – Dec 2026"}
                              </p>
                              <div
                                className="mt-4 inline-flex items-center px-3 py-1 rounded text-[12px] font-medium"
                                style={{
                                  backgroundColor: tpl.previewAccent,
                                  color: tpl.previewCard,
                                }}
                              >
                                Open invitation
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-[15px] font-medium">
                            {tpl.name}
                          </h3>
                          {isActive ? (
                            <span className="text-[12px] font-medium text-[#a63429] shrink-0">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[13px] text-[#5e554a] mt-1">
                          {tpl.subtitle}
                        </p>
                        <p className="text-[12px] font-mono-tabular text-[#7b7266] mt-2">
                          {tpl.paperLabel} · {tpl.accentLabel}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#1f1b16]/10">
                        <button
                          type="button"
                          onClick={() => handleSelectTemplate(tpl.id)}
                          className={`flex-1 h-9 rounded-lg text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
                            isActive
                              ? "bg-[#a63429] text-[#fdfbf7]"
                              : "bg-[#efe9df] text-[#1f1b16] hover:bg-[#e7dfd2]"
                          }`}
                        >
                          {isActive ? "Selected template" : "Use template"}
                        </button>
                        {selectedGuest ? (
                          <a
                            href={`/invite/${selectedGuest.unique_code}?preview=host`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (!isActive) {
                                handleSelectTemplate(tpl.id);
                              }
                            }}
                            className="h-9 px-3 rounded-lg bg-[#fdfbf7] border border-[#1f1b16]/10 text-[13px] text-[#5e554a] hover:text-[#1f1b16] inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-4 h-4" strokeWidth={1.5} />
                            Preview
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <form
              onSubmit={handleSaveConfigDetails}
              className="flex flex-col gap-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Couple & Parents */}
                <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-5 flex flex-col gap-4">
                  <h2 className="text-[16px] font-medium">
                    Couple &amp; family details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] text-[#5e554a] mb-1">
                        Bride
                      </label>
                      <input
                        type="text"
                        value={configDraft.couple.bride}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            couple: { ...prev.couple, bride: e.target.value },
                          }))
                        }
                        className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] text-[#5e554a] mb-1">
                        Groom
                      </label>
                      <input
                        type="text"
                        value={configDraft.couple.groom}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            couple: { ...prev.couple, groom: e.target.value },
                          }))
                        }
                        className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Wedding hashtag
                    </label>
                    <input
                      type="text"
                      value={configDraft.couple.hashtag}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          couple: { ...prev.couple, hashtag: e.target.value },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Bride&apos;s parents
                    </label>
                    <input
                      type="text"
                      value={configDraft.parents.bride_parents}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          parents: {
                            ...prev.parents,
                            bride_parents: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Groom&apos;s parents
                    </label>
                    <input
                      type="text"
                      value={configDraft.parents.groom_parents}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          parents: {
                            ...prev.parents,
                            groom_parents: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                    />
                  </div>
                </div>

                {/* WhatsApp Template */}
                <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-5 flex flex-col justify-between gap-4">
                  <div>
                    <h2 className="text-[16px] font-medium">
                      WhatsApp dispatch message
                    </h2>
                    <p className="text-[13px] text-[#5e554a] mt-1">
                      Supports variables: {"{{guest_name}}"}, {"{{bride}}"},{" "}
                      {"{{groom}}"}, {"{{hashtag}}"}, {"{{events}}"}, {"{{link}}"}
                    </p>
                    <textarea
                      rows={4}
                      value={configDraft.whatsapp_message_template}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          whatsapp_message_template: e.target.value,
                        }))
                      }
                      className="w-full mt-3 px-3 py-2.5 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px] leading-relaxed"
                    />
                  </div>

                  {selectedGuest ? (
                    <div className="rounded-lg bg-[#f7f4ee] border border-[#1f1b16]/10 p-3">
                      <p className="text-[12px] text-[#7b7266] mb-1">
                        Preview for {selectedGuest.guest_name}
                      </p>
                      <p className="text-[13px] text-[#1f1b16] leading-relaxed break-words">
                        {buildWhatsAppMessage(
                          selectedGuest,
                          configDraft,
                          getAppOrigin()
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Invitation text, prefixes & closing */}
              <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-5 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-medium">
                      Invitation copy &amp; closing lines
                    </h2>
                    <p className="text-[13px] text-[#5e554a]">
                      Customize the cover blessing quote, parent prefixes, city overview, and closing family card
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="h-9 px-4 rounded-lg bg-[#1f1b16] text-[#fdfbf7] text-[13px] font-medium hover:bg-[#332d25] disabled:opacity-50 transition-colors duration-150 cursor-pointer"
                  >
                    {savingConfig ? "Saving..." : "Save changes"}
                  </button>
                </div>

                <div>
                  <label className="block text-[12px] text-[#5e554a] mb-1">
                    Cover blessing quote
                  </label>
                  <textarea
                    rows={2}
                    value={configDraft.copy.cover_quote}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({
                        ...prev,
                        copy: { ...prev.copy, cover_quote: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px] leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Groom parent prefix
                    </label>
                    <input
                      type="text"
                      value={configDraft.copy.groom_parent_prefix}
                      placeholder="S/o."
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          copy: {
                            ...prev.copy,
                            groom_parent_prefix: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Bride parent prefix
                    </label>
                    <input
                      type="text"
                      value={configDraft.copy.bride_parent_prefix}
                      placeholder="D/o."
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          copy: {
                            ...prev.copy,
                            bride_parent_prefix: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      City label
                    </label>
                    <input
                      type="text"
                      value={configDraft.copy.city_label}
                      placeholder="Surat"
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          copy: { ...prev.copy, city_label: e.target.value },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Date range label
                    </label>
                    <input
                      type="text"
                      value={configDraft.copy.date_range_label}
                      placeholder="Nov – Dec 2026"
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          copy: {
                            ...prev.copy,
                            date_range_label: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Closing kicker
                    </label>
                    <input
                      type="text"
                      value={configDraft.copy.closing_kicker}
                      placeholder="With warm regards"
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          copy: {
                            ...prev.copy,
                            closing_kicker: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Closing heading
                    </label>
                    <input
                      type="text"
                      value={configDraft.copy.closing_heading}
                      placeholder="Auto from parent surname"
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          copy: {
                            ...prev.copy,
                            closing_heading: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Closing subheading
                    </label>
                    <input
                      type="text"
                      value={configDraft.copy.closing_subheading}
                      placeholder="Family"
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          copy: {
                            ...prev.copy,
                            closing_subheading: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-[#5e554a] mb-1">
                      Classic folio blessing
                    </label>
                    <input
                      type="text"
                      value={configDraft.copy.classic_blessing}
                      placeholder="With the blessings of our families"
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          copy: {
                            ...prev.copy,
                            classic_blessing: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[13px]"
                    />
                  </div>
                </div>
              </div>

              {/* Ceremonies schedule */}
              <div className="rounded-xl bg-[#fdfbf7] border border-[#1f1b16]/10 p-5 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-medium">
                      Ceremonies schedule ({getAllConfigEventsOrdered(configDraft).length})
                    </h2>
                    <p className="text-[13px] text-[#5e554a]">
                      Guests only see ceremonies assigned in their unique code permissions
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="h-9 px-4 rounded-lg bg-[#a63429] text-[#fdfbf7] text-[13px] font-medium hover:bg-[#8c2a20] disabled:opacity-50 transition-colors duration-150 cursor-pointer"
                  >
                    {savingConfig ? "Saving..." : "Save configuration"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getAllConfigEventsOrdered(configDraft).map((ev) => {
                    const usesTagline = ev.id === "sangeet" || Boolean(ev.tagline);
                    const noteValue = usesTagline
                      ? ev.tagline ?? ""
                      : ev.subtitle ?? "";

                    return (
                      <div
                        key={ev.key}
                        className="rounded-lg bg-[#f7f4ee] border border-[#1f1b16]/10 p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-mono-tabular text-[#a63429]">
                            {ev.id}
                          </span>
                          <span className="text-[12px] text-[#7b7266]">
                            {ev.shortLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[12px] text-[#7b7266] mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              aria-label={`${ev.id} title`}
                              value={ev.title}
                              onChange={(e) =>
                                setConfigDraft((prev) => ({
                                  ...prev,
                                  events: {
                                    ...prev.events,
                                    [ev.key]: { ...ev, title: e.target.value },
                                  },
                                }))
                              }
                              className="w-full h-8 px-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 text-[13px] font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] text-[#7b7266] mb-1">
                              Short tab label
                            </label>
                            <input
                              type="text"
                              aria-label={`${ev.id} short label`}
                              value={ev.shortLabel}
                              onChange={(e) =>
                                setConfigDraft((prev) => ({
                                  ...prev,
                                  events: {
                                    ...prev.events,
                                    [ev.key]: {
                                      ...ev,
                                      shortLabel: e.target.value,
                                    },
                                  },
                                }))
                              }
                              className="w-full h-8 px-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 text-[13px]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[12px] text-[#7b7266] mb-1">
                              Date
                            </label>
                            <input
                              type="text"
                              aria-label={`${ev.id} date`}
                              value={ev.date}
                              onChange={(e) =>
                                setConfigDraft((prev) => ({
                                  ...prev,
                                  events: {
                                    ...prev.events,
                                    [ev.key]: { ...ev, date: e.target.value },
                                  },
                                }))
                              }
                              className="w-full h-8 px-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 text-[12px]"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] text-[#7b7266] mb-1">
                              Time
                            </label>
                            <input
                              type="text"
                              aria-label={`${ev.id} time`}
                              value={ev.time}
                              onChange={(e) =>
                                setConfigDraft((prev) => ({
                                  ...prev,
                                  events: {
                                    ...prev.events,
                                    [ev.key]: { ...ev, time: e.target.value },
                                  },
                                }))
                              }
                              className="w-full h-8 px-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 text-[12px]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[12px] text-[#7b7266] mb-1">
                              Hosted by / eyebrow
                            </label>
                            <input
                              type="text"
                              aria-label={`${ev.id} hosted by`}
                              value={ev.host ?? ""}
                              placeholder="Optional family name"
                              onChange={(e) =>
                                setConfigDraft((prev) => ({
                                  ...prev,
                                  events: {
                                    ...prev.events,
                                    [ev.key]: { ...ev, host: e.target.value },
                                  },
                                }))
                              }
                              className="w-full h-8 px-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 text-[12px]"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] text-[#7b7266] mb-1">
                              Dress code / attire
                            </label>
                            <input
                              type="text"
                              aria-label={`${ev.id} attire`}
                              value={ev.attire ?? ""}
                              placeholder="Optional dress code"
                              onChange={(e) =>
                                setConfigDraft((prev) => ({
                                  ...prev,
                                  events: {
                                    ...prev.events,
                                    [ev.key]: { ...ev, attire: e.target.value },
                                  },
                                }))
                              }
                              className="w-full h-8 px-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 text-[12px]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[12px] text-[#7b7266] mb-1">
                            Venue address
                          </label>
                          <textarea
                            rows={2}
                            aria-label={`${ev.id} venue`}
                            value={ev.venue}
                            onChange={(e) =>
                              setConfigDraft((prev) => ({
                                ...prev,
                                events: {
                                  ...prev.events,
                                  [ev.key]: { ...ev, venue: e.target.value },
                                },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 text-[12px] leading-snug"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] text-[#7b7266] mb-1">
                            Card invitation note
                          </label>
                          <input
                            type="text"
                            aria-label={`${ev.id} card note`}
                            value={noteValue}
                            placeholder="Optional verse or invitation line"
                            onChange={(e) =>
                              setConfigDraft((prev) => ({
                                ...prev,
                                events: {
                                  ...prev.events,
                                  [ev.key]: usesTagline
                                    ? { ...ev, tagline: e.target.value }
                                    : { ...ev, subtitle: e.target.value },
                                },
                              }))
                            }
                            className="w-full h-8 px-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 text-[12px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] text-[#7b7266] mb-1">
                            Google Maps link
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <MapPin
                                className="w-4 h-4 text-[#7b7266] absolute left-2.5 top-1/2 -translate-y-1/2"
                                strokeWidth={1.5}
                              />
                              <input
                                type="url"
                                aria-label={`${ev.id} Google Maps link`}
                                value={ev.mapUrl ?? ""}
                                placeholder="https://maps.app.goo.gl/..."
                                onChange={(e) =>
                                  setConfigDraft((prev) => ({
                                    ...prev,
                                    events: {
                                      ...prev.events,
                                      [ev.key]: {
                                        ...ev,
                                        mapUrl: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="w-full h-8 pl-8 pr-2.5 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 text-[12px] font-mono-tabular"
                              />
                            </div>
                            {ev.mapUrl ? (
                              <a
                                href={ev.mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open venue link"
                                className="w-8 h-8 rounded bg-[#fdfbf7] border border-[#1f1b16]/10 inline-flex items-center justify-center text-[#5e554a] hover:text-[#1f1b16] shrink-0 transition-colors duration-150"
                              >
                                <ExternalLink
                                  className="w-4 h-4"
                                  strokeWidth={1.5}
                                />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>
          )}
        </main>
      </div>

      {/* Add Guest Modal */}
      <AnimatePresence>
        {addModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="fixed inset-0 z-50 bg-[#1f1b16]/40 flex items-center justify-center p-4"
            onClick={() => setAddModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[460px] rounded-2xl bg-[#fdfbf7] border border-[#1f1b16]/15 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-medium">Add guest</h2>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7b7266] hover:bg-[#efe9df] cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <form onSubmit={handleAddSingleGuest} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[13px] text-[#5e554a] mb-1">
                    Guest name
                  </label>
                  <input
                    type="text"
                    required
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    placeholder="Rajesh & Sunita Kapadia"
                    className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-[#5e554a] mb-1">
                    WhatsApp number
                  </label>
                  <input
                    type="tel"
                    required
                    value={newGuestPhone}
                    onChange={(e) => setNewGuestPhone(e.target.value)}
                    placeholder="9825011482"
                    className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px] font-mono-tabular"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[13px] text-[#5e554a]">
                      Permitted ceremonies
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewGuestEvents(
                          newGuestEvents.length === ORDERED_EVENT_IDS.length
                            ? ["wedding", "reception_jariwala"]
                            : [...ORDERED_EVENT_IDS]
                        )
                      }
                      className="text-[12px] text-[#a63429] cursor-pointer"
                    >
                      {newGuestEvents.length === ORDERED_EVENT_IDS.length
                        ? "Reset"
                        : "Select all"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {orderedEvents.map((ev) => {
                      const active = newGuestEvents.includes(ev.id);
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() =>
                            setNewGuestEvents((prev) =>
                              prev.includes(ev.id)
                                ? prev.filter((id) => id !== ev.id)
                                : [...prev, ev.id]
                            )
                          }
                          className={`h-9 px-3 rounded-lg border text-left text-[13px] flex items-center justify-between cursor-pointer ${
                            active
                              ? "bg-[#a63429]/10 border-[#a63429] text-[#a63429] font-medium"
                              : "bg-[#f7f4ee] border-[#1f1b16]/10 text-[#5e554a]"
                          }`}
                        >
                          <span className="truncate">{ev.shortLabel}</span>
                          {active ? (
                            <Check className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="h-9 px-4 rounded-lg bg-[#efe9df] text-[13px] text-[#5e554a] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingGuest}
                    className="h-9 px-4 rounded-lg bg-[#1f1b16] text-[#fdfbf7] text-[13px] font-medium disabled:opacity-50 cursor-pointer"
                  >
                    {addingGuest ? "Saving..." : "Generate code & save"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Host Account Settings Modal */}
      <AnimatePresence>
        {accountModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="fixed inset-0 z-50 bg-[#1f1b16]/40 flex items-center justify-center p-4"
            onClick={() => setAccountModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[440px] rounded-2xl bg-[#fdfbf7] border border-[#1f1b16]/15 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[18px] font-medium">Host account</h2>
                  <p className="text-[12px] text-[#7b7266] mt-0.5 tabular-nums">
                    Single-user mode ({maxUsers}) · Registration{" "}
                    {registrationEnabled ? "enabled" : "disabled"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close account modal"
                  onClick={() => setAccountModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7b7266] hover:bg-[#efe9df] cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-[13px] text-[#5e554a] mb-1">
                    Display name
                  </label>
                  <input
                    type="text"
                    required
                    value={accountDisplayName}
                    onChange={(e) => setAccountDisplayName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-[#5e554a] mb-1">
                    Host email
                  </label>
                  <input
                    type="email"
                    required
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-[#5e554a] mb-1">
                    Current password (required for email/password change)
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={accountCurrentPassword}
                    onChange={(e) => setAccountCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-[#5e554a] mb-1">
                    New password (optional)
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={accountNewPassword}
                    onChange={(e) => setAccountNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full h-9 px-3 rounded-lg bg-[#efe9df] border border-[#1f1b16]/10 text-[14px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAccountModalOpen(false)}
                    className="h-9 px-4 rounded-lg bg-[#efe9df] text-[13px] text-[#5e554a] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAccount}
                    className="h-9 px-4 rounded-lg bg-[#1f1b16] text-[#fdfbf7] text-[13px] font-medium disabled:opacity-50 cursor-pointer"
                  >
                    {savingAccount ? "Saving..." : "Update account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
