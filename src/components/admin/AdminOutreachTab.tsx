import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, Loader2, Mail, MessageCircle, Phone, RefreshCw } from "lucide-react";
import { TURKISH_CITIES } from "@/lib/leadFormData";
import {
  DAILY_WA_CAP,
  SITE_URL,
  budgetLabel,
  buildMailtoLink,
  buildWaLink,
  claimUrl,
  profileUrl,
  projectSizeLabel,
  renderTemplate,
  type OutreachStep,
  type TemplateLead,
  type TemplateVars,
} from "@/lib/outreachTemplates";

// The generated types (src/lib/supabase/types.ts) predate the claim migrations, so the new RPCs and tables
// are reached through these minimal untyped views of the client.
interface RpcResult {
  data: unknown;
  error: { code?: string; message: string } | null;
}

interface UntypedQuery extends PromiseLike<RpcResult & { count?: number | null }> {
  eq(column: string, value: string): UntypedQuery;
  gte(column: string, value: string): UntypedQuery;
  order(column: string, options?: { ascending?: boolean }): UntypedQuery;
  range(from: number, to: number): UntypedQuery;
}

const rpc = (fn: string, args?: Record<string, unknown>) =>
  (supabase as unknown as { rpc: (name: string, params?: Record<string, unknown>) => PromiseLike<RpcResult> }).rpc(fn, args);

const fromTable = (table: string) =>
  (
    supabase as unknown as {
      from: (name: string) => { select: (columns: string, options?: { count: "exact"; head: boolean }) => UntypedQuery };
    }
  ).from(table);

type Channel = "whatsapp" | "email" | "phone";
type LogEvent = "sent" | "replied" | "not_interested" | "removal_requested" | "invalid_number";

interface QueueRow {
  firm_id: string;
  company_name: string;
  city: string;
  district: string | null;
  phone: string | null;
  email: string | null;
  slug: string | null;
  claim_code: string | null;
  is_claimed: boolean;
  completeness: number;
  has_mobile: boolean;
  has_email: boolean;
  segment: "A" | "B" | "C";
  last_step: string | null;
  last_status: string | null;
  last_sent_at: string | null;
  contact_count: number;
  clicked_at: string | null;
  next_step: OutreachStep | null;
  next_due_at: string | null;
  paid: boolean;
  opted_out: boolean;
  views_30d: number | null;
  total_count: number;
}

interface FunnelData {
  listed: number;
  with_mobile: number;
  with_email: number;
  contacted: number;
  replied: number;
  clicked: number;
  otp_started: number;
  claimed: number;
  organic_claims: number;
  paid: number;
  first_lead_bought: number;
}

interface LeadRow extends TemplateLead {
  id: string;
  created_at: string;
  /** Set when the homeowner picked one specific firm (leads.target_firm_id, added by the lead pipeline migrations). */
  target_firm_id?: string | null;
}

/** What the admin opened in WhatsApp or the mail client; 'Gönderildi' logs exactly this message. */
interface OpenedAction {
  step: OutreachStep;
  channel: Channel;
  message: string;
}

const PAGE_SIZE = 50;
const CAP_WARNING_AT = 20;
const WHATSAPP_STEPS: readonly OutreachStep[] = ["day0_intro", "day3_lead", "day14_breakup"];
const SENDER_STORAGE_KEY = "outreach:sender";
const DEFAULT_SENDER = "Peyzajbul ekibi";

const STEP_LABELS: Record<string, string> = {
  day0_intro: "Tanışma (gün 0)",
  day3_lead: "Talep (gün 3)",
  day7_email: "E-posta (gün 7)",
  day10_call: "Arama (gün 10)",
  day14_breakup: "Son mesaj (gün 14)",
  manual: "Elle",
};

const STATUS_LABELS: Record<string, string> = {
  sent: "Gönderildi",
  clicked: "Bağlantıya tıkladı",
  replied: "Yanıt verdi",
  claimed: "Sahiplendi",
  not_interested: "İlgisiz",
  removal_requested: "Kaldırıldı",
  invalid_number: "Numara hatalı",
  bounced: "Geri döndü",
  note: "Not",
};

const STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "never_contacted", label: "Hiç ulaşılmamış" },
  { value: "contacted", label: "Ulaşılmış" },
  { value: "clicked", label: "Bağlantıya tıklamış" },
  { value: "replied", label: "Yanıt vermiş" },
  { value: "claimed", label: "Sahiplenmiş" },
  { value: "paid", label: "Ödemiş" },
  { value: "opted_out", label: "Kaldırılmış" },
  { value: "due", label: "Sırası gelmiş" },
];

const NO_LEAD_TOOLTIP = "Bu ilde son 30 günde gerçek talep yok";

/** Lower-cases and strips diacritics so 'İstanbul' and 'Istanbul' meet. */
function foldTr(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .trim();
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function describeRpcError(error: { code?: string; message: string }): string {
  if (error.code === "PGRST202" || error.code === "42883" || error.code === "42P01") {
    return "Outreach kuyruğu için veritabanı güncellemeleri henüz uygulanmamış (20261021120000_claim_schema.sql ve 20261021120100_claim_rpcs.sql).";
  }
  if (error.code === "42501") return "Bu ekran yalnızca yönetici hesabı içindir.";
  return `Kuyruk yüklenemedi: ${error.message}`;
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  // A cell that starts with = + - @ would run as a formula when the file is opened in a spreadsheet.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const content = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  // The BOM makes Excel read the file as UTF-8, so ş ğ ı İ ö ü ç survive.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function startOfTodayIso(): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export default function AdminOutreachTab() {
  const { toast } = useToast();

  const [rows, setRows] = useState<QueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);

  const [segment, setSegment] = useState("all");
  const [state, setState] = useState("all");
  const [city, setCity] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sender, setSender] = useState(DEFAULT_SENDER);

  const [opened, setOpened] = useState<Record<string, OpenedAction>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"log" | "links" | null>(null);

  const [leadDialog, setLeadDialog] = useState<QueueRow | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [callDialog, setCallDialog] = useState<{ row: QueueRow; script: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<QueueRow | null>(null);
  const [capPrompt, setCapPrompt] = useState<{ proceed: () => void } | null>(null);

  const requestRef = useRef(0);

  // The sender name is typed into every message, so it is remembered between visits.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SENDER_STORAGE_KEY);
      if (stored) setSender(stored);
    } catch {
      // Storage is blocked: the default name is used.
    }
  }, []);

  const updateSender = (value: string) => {
    setSender(value);
    try {
      window.localStorage.setItem(SENDER_STORAGE_KEY, value);
    } catch {
      // Not remembered; the field still works for this visit.
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadQueue = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    const { data, error } = await rpc("admin_outreach_queue", {
      p_segment: segment === "all" ? null : segment,
      p_state: state === "all" ? null : state,
      p_city: city === "all" ? null : city,
      p_search: search || null,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    });
    if (request !== requestRef.current) return;

    if (error) {
      setRows([]);
      setTotal(0);
      setLoadError(describeRpcError(error));
    } else {
      const list = Array.isArray(data) ? (data as QueueRow[]) : [];
      setRows(list);
      setTotal(list.length > 0 ? Number(list[0].total_count) : 0);
      setLoadError(null);
    }
    setLoading(false);
  }, [segment, state, city, search, page]);

  const loadFunnel = useCallback(async () => {
    const { data, error } = await rpc("admin_outreach_funnel");
    if (!error && data && typeof data === "object") setFunnel(data as FunnelData);
  }, []);

  const loadTodayCount = useCallback(async () => {
    const { count, error } = await fromTable("firm_outreach")
      .select("id", { count: "exact", head: true })
      .eq("channel", "whatsapp")
      .gte("sent_at", startOfTodayIso());
    if (!error) setTodayCount(count ?? 0);
  }, []);

  const loadLeads = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const query = (columns: string) =>
      supabase
        .from("leads")
        .select(columns)
        .in("status", ["active", "purchased", "expired"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300);

    let { data, error } = await query("id, service_type, district, city, project_size, budget, created_at, target_firm_id");
    if (error) {
      // target_firm_id comes from the lead pipeline migrations; without it the picker still works by city.
      ({ data, error } = await query("id, service_type, district, city, project_size, budget, created_at"));
    }
    if (!error) setLeads((data ?? []) as unknown as LeadRow[]);
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    void loadFunnel();
    void loadTodayCount();
    void loadLeads();
  }, [loadFunnel, loadTodayCount, loadLeads]);

  const refreshAll = async () => {
    await Promise.all([loadQueue(), loadFunnel(), loadTodayCount()]);
  };

  const leadsByCity = useMemo(() => {
    const map = new Map<string, LeadRow[]>();
    for (const lead of leads) {
      const key = foldTr(lead.city);
      map.set(key, [...(map.get(key) ?? []), lead]);
    }
    return map;
  }, [leads]);

  /** Real leads of the last 30 days in the firm's city, plus any lead that asked for this very firm; those come first. */
  const leadsFor = (row: QueueRow): LeadRow[] => {
    const byCity = leadsByCity.get(foldTr(row.city)) ?? [];
    const direct = leads.filter((lead) => lead.target_firm_id === row.firm_id && !byCity.includes(lead));
    return [...direct, ...byCity].sort(
      (a, b) => Number(b.target_firm_id === row.firm_id) - Number(a.target_firm_id === row.firm_id),
    );
  };

  // --- Templates and links ------------------------------------------------------------------------

  const varsFor = (row: QueueRow, extra: Partial<TemplateVars> = {}): TemplateVars | null => {
    if (!row.claim_code) return null;
    return {
      firm: row.company_name,
      city: row.city,
      district: row.district,
      sender,
      profileUrl: row.slug ? profileUrl(row.slug) : `${SITE_URL}/firmalar`,
      claimUrl: claimUrl(row.claim_code),
      views30d: row.views_30d,
      ...extra,
    };
  };

  const whatsappFor = (row: QueueRow, lead?: LeadRow): { url: string; step: OutreachStep; message: string } | null => {
    const step = row.next_step;
    if (!step || !WHATSAPP_STEPS.includes(step)) return null;
    const vars = varsFor(row, { lead: lead ? { ...lead, requestedFirm: lead.target_firm_id === row.firm_id } : null });
    if (!vars || (step === "day3_lead" && !lead)) return null;
    const message = renderTemplate(step, vars).body;
    const url = buildWaLink(row.phone, message);
    return url ? { url, step, message } : null;
  };

  const mailFor = (row: QueueRow): { href: string; message: string } | null => {
    const vars = varsFor(row);
    if (!vars || !row.email) return null;
    const rendered = renderTemplate("day7_email", vars);
    return { href: buildMailtoLink(row.email, rendered), message: `${rendered.subject}\n\n${rendered.body}` };
  };

  const markOpened = (row: QueueRow, action: OpenedAction) => {
    setOpened((current) => ({ ...current, [row.firm_id]: action }));
  };

  const atCap = (todayCount ?? 0) >= DAILY_WA_CAP;

  /** Opens a WhatsApp link, asking first once the daily cap is used up. Opening writes nothing to the database. */
  const openWhatsApp = (row: QueueRow, action: { url: string; step: OutreachStep; message: string }) => {
    const proceed = () => {
      window.open(action.url, "_blank", "noopener,noreferrer");
      markOpened(row, { step: action.step, channel: "whatsapp", message: action.message });
    };
    if (atCap) setCapPrompt({ proceed });
    else proceed();
  };

  const copyClaimLink = async (row: QueueRow) => {
    if (!row.claim_code) return;
    try {
      await navigator.clipboard.writeText(claimUrl(row.claim_code));
      toast({ title: "Claim linki kopyalandı" });
    } catch {
      toast({ title: "Kopyalanamadı", description: claimUrl(row.claim_code), variant: "destructive" });
    }
  };

  // --- Logging ---------------------------------------------------------------------------------------

  const logEvent = async (
    row: QueueRow,
    event: LogEvent,
    extra: { channel?: Channel; step?: OutreachStep; message?: string } = {},
  ): Promise<boolean> => {
    setBusyId(row.firm_id);
    const { error } = await rpc("admin_log_outreach", {
      p_firm_id: row.firm_id,
      p_event: event,
      p_channel: extra.channel ?? "whatsapp",
      p_step: extra.step ?? "manual",
      p_message: extra.message ?? null,
      p_note: null,
    });
    setBusyId(null);

    if (error) {
      toast({ title: "Kayıt yazılamadı", description: error.message, variant: "destructive" });
      return false;
    }
    setOpened((current) => {
      const next = { ...current };
      delete next[row.firm_id];
      return next;
    });
    await refreshAll();
    return true;
  };

  const logSent = async (row: QueueRow) => {
    const action = opened[row.firm_id];
    if (!action) return;
    if (await logEvent(row, "sent", { channel: action.channel, step: action.step, message: action.message })) {
      toast({ title: "Gönderildi olarak kaydedildi", description: row.company_name });
    }
  };

  const logSimple = async (row: QueueRow, event: Exclude<LogEvent, "sent" | "removal_requested">, title: string) => {
    const action = opened[row.firm_id];
    if (await logEvent(row, event, { channel: action?.channel, step: action?.step ?? undefined })) {
      toast({ title, description: row.company_name });
    }
  };

  const confirmRemoval = async () => {
    const row = removeTarget;
    setRemoveTarget(null);
    if (row && (await logEvent(row, "removal_requested"))) {
      toast({ title: "Profil yayından kaldırıldı", description: `${row.company_name} listelerden ve site haritasından çıkar.` });
    }
  };

  // --- Day 3 (real lead) and day 10 (call) dialogs -----------------------------------------------------

  const openLeadDialog = (row: QueueRow) => {
    setSelectedLeadId("");
    setLeadDialog(row);
  };

  const confirmLeadDialog = () => {
    const row = leadDialog;
    if (!row) return;
    const lead = leadsFor(row).find((candidate) => candidate.id === selectedLeadId);
    if (!lead) return;
    const action = whatsappFor(row, lead);
    if (!action) {
      toast({ title: "Mesaj hazırlanamadı", description: "Numara cep numarası değil veya claim kodu yok.", variant: "destructive" });
      return;
    }
    setLeadDialog(null);
    openWhatsApp(row, action);
  };

  const openCallDialog = (row: QueueRow) => {
    const vars = varsFor(row);
    if (!vars) return;
    setCallDialog({ row, script: renderTemplate("day10_call", vars).body });
  };

  const confirmCall = async () => {
    const dialog = callDialog;
    if (!dialog) return;
    setCallDialog(null);
    if (await logEvent(dialog.row, "sent", { channel: "phone", step: "day10_call", message: dialog.script })) {
      toast({ title: "Arama kaydedildi", description: dialog.row.company_name });
    }
  };

  // --- CSV exports ----------------------------------------------------------------------------------------

  const exportLog = async () => {
    setExporting("log");
    try {
      const collected: Array<Record<string, unknown>> = [];
      for (let from = 0; from < 20000; from += 1000) {
        const { data, error } = await fromTable("firm_outreach")
          .select(
            "created_at, channel, step, status, segment, sent_at, clicked_at, replied_at, claimed_at, note, message_preview, firms(company_name, city, district, phone)",
          )
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        if (error) throw new Error(error.message);
        const chunk = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
        collected.push(...chunk);
        if (chunk.length < 1000) break;
      }
      downloadCsv(
        "outreach-kayitlari.csv",
        ["firma", "il", "ilce", "telefon", "kanal", "adim", "durum", "segment", "gonderim", "tiklama", "yanit", "sahiplenme", "not", "mesaj"],
        collected.map((item) => {
          const firm = (item.firms ?? {}) as Record<string, unknown>;
          return [
            firm.company_name, firm.city, firm.district, firm.phone, item.channel, item.step, item.status, item.segment,
            item.sent_at, item.clicked_at, item.replied_at, item.claimed_at, item.note, item.message_preview,
          ];
        }),
      );
    } catch (err) {
      toast({ title: "Kayıtlar indirilemedi", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportClaimLinks = async () => {
    setExporting("links");
    try {
      const collected: QueueRow[] = [];
      for (let offset = 0; offset < 20000; offset += 1000) {
        const { data, error } = await rpc("admin_outreach_queue", { p_limit: 1000, p_offset: offset });
        if (error) throw new Error(error.message);
        const chunk = Array.isArray(data) ? (data as QueueRow[]) : [];
        collected.push(...chunk);
        if (chunk.length < 1000) break;
      }
      downloadCsv(
        "sahiplenme-baglantilari.csv",
        ["firma", "il", "ilce", "telefon", "sahiplenme_linki"],
        collected
          .filter((item) => item.claim_code)
          .map((item) => [item.company_name, item.city, item.district, item.phone, claimUrl(item.claim_code as string)]),
      );
    } catch (err) {
      toast({ title: "Bağlantı listesi indirilemedi", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  // --- Rendering -----------------------------------------------------------------------------------------

  const funnelSteps = funnel
    ? [
        { key: "listed", label: "Listelenen", value: funnel.listed },
        { key: "contacted", label: "Ulaşılan", value: funnel.contacted },
        { key: "clicked", label: "Tıklayan", value: funnel.clicked },
        { key: "claimed", label: "Sahiplenen", value: funnel.claimed },
        { key: "paid", label: "Ödeyen", value: funnel.paid },
      ]
    : [];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const capNear = (todayCount ?? 0) >= CAP_WARNING_AT;

  const renderActions = (row: QueueRow) => {
    const busy = busyId === row.firm_id;
    const action = opened[row.firm_id];
    const step = row.next_step;
    const disabledAll = row.opted_out;

    const showWhatsApp = row.has_mobile && !!step && WHATSAPP_STEPS.includes(step);
    const dayThree = step === "day3_lead";
    const noLead = dayThree && leadsFor(row).length === 0;
    const direct = showWhatsApp && !dayThree ? whatsappFor(row) : null;

    const mail = row.has_email && !!step ? mailFor(row) : null;
    const removalVars = row.opted_out && row.has_mobile ? varsFor(row) : null;
    const removalAck = removalVars ? buildWaLink(row.phone, renderTemplate("removal_ack", removalVars).body) : null;
    const showCall = !!row.phone && !!step && (step === "day10_call" || (!row.has_mobile && !row.has_email));

    return (
      <div className="flex flex-wrap items-center gap-2">
        {showWhatsApp && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={noLead || !row.claim_code ? 0 : undefined}>
                <Button
                  size="sm"
                  disabled={disabledAll || busy || noLead || !row.claim_code || (!dayThree && !direct)}
                  onClick={() => {
                    if (dayThree) openLeadDialog(row);
                    else if (direct) openWhatsApp(row, direct);
                  }}
                >
                  <MessageCircle className="mr-1 h-4 w-4" aria-hidden="true" /> WhatsApp&apos;ta aç
                </Button>
              </span>
            </TooltipTrigger>
            {(noLead || !row.claim_code) && (
              <TooltipContent>{noLead ? NO_LEAD_TOOLTIP : "Bu firmanın sahiplenme kodu yok"}</TooltipContent>
            )}
          </Tooltip>
        )}

        {mail && (
          <Button size="sm" variant="outline" disabled={disabledAll || busy} asChild>
            <a
              href={mail.href}
              onClick={() => markOpened(row, { step: "day7_email", channel: "email", message: mail.message })}
            >
              <Mail className="mr-1 h-4 w-4" aria-hidden="true" /> E-posta aç
            </a>
          </Button>
        )}

        {showCall && (
          <Button size="sm" variant="outline" disabled={disabledAll || busy || !row.claim_code} onClick={() => openCallDialog(row)}>
            <Phone className="mr-1 h-4 w-4" aria-hidden="true" /> Ara
          </Button>
        )}

        <Button size="sm" variant="ghost" disabled={!row.claim_code} onClick={() => copyClaimLink(row)}>
          <Copy className="mr-1 h-4 w-4" aria-hidden="true" /> Claim linki kopyala
        </Button>

        {removalAck && (
          <Button size="sm" variant="outline" asChild>
            <a href={removalAck} target="_blank" rel="noopener noreferrer">
              Kaldırma yanıtı
            </a>
          </Button>
        )}

        {!row.opted_out && (action || row.contact_count > 0) && (
          <div className="flex flex-wrap items-center gap-2 border-l border-border pl-2">
            {action && (
              <Button size="sm" variant="accent" disabled={busy} onClick={() => logSent(row)}>
                {busy && <Loader2 className="mr-1 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
                Gönderildi
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => logSimple(row, "replied", "Yanıt kaydedildi")}>
              Yanıt verdi
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => logSimple(row, "not_interested", "İlgisiz olarak işaretlendi")}>
              İlgisiz
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => logSimple(row, "invalid_number", "Numara hatalı olarak işaretlendi")}>
              Numara hatalı
            </Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => setRemoveTarget(row)}>
              Kaldır
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderRow = (row: QueueRow) => {
    const overdue = row.next_due_at ? new Date(row.next_due_at).getTime() <= Date.now() : false;
    return (
      <li key={row.firm_id} className={`space-y-3 rounded-lg border border-border bg-card p-4 ${row.opted_out ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={row.segment === "A" ? "default" : "secondary"}>Segment {row.segment}</Badge>
              <span className="font-semibold text-foreground">{row.company_name}</span>
              {row.is_claimed && <Badge className="bg-verified text-verified-foreground">Sahiplenmiş</Badge>}
              {row.paid && <Badge className="bg-verified text-verified-foreground">Ödeyen</Badge>}
              {row.opted_out && <Badge variant="destructive">Kaldırıldı</Badge>}
              {!row.is_claimed && leads.some((lead) => lead.target_firm_id === row.firm_id) && (
                <Badge variant="outline">Doğrudan talep var</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {row.district ? `${row.city} / ${row.district}` : row.city}
              {row.phone ? ` · ${row.phone}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{row.has_mobile ? "Cep var" : "Cep yok"}</Badge>
            <Badge variant="outline">{row.has_email ? "E-posta var" : "E-posta yok"}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Progress value={row.completeness} className="h-2 max-w-[10rem]" aria-label={`Profil doluluğu ${row.completeness}%`} />
          <span className="text-xs text-muted-foreground">Doluluk %{row.completeness}</span>
        </div>

        <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            Son:{" "}
            {row.contact_count > 0 ? (
              <span className="text-foreground">
                {STEP_LABELS[row.last_step ?? "manual"] ?? row.last_step}
                {row.last_sent_at ? ` · ${formatDate(row.last_sent_at)}` : ""}
                {row.last_status ? ` · ${STATUS_LABELS[row.last_status] ?? row.last_status}` : ""}
              </span>
            ) : (
              "Hiç ulaşılmadı"
            )}
          </p>
          <p>
            Sıradaki:{" "}
            {row.next_step ? (
              <span className={overdue ? "font-medium text-foreground" : "text-foreground"}>
                {STEP_LABELS[row.next_step]}
                {row.next_due_at ? ` · ${overdue ? "sırası geldi" : formatDate(row.next_due_at)}` : ""}
              </span>
            ) : (
              "Yok"
            )}
          </p>
        </div>

        {renderActions(row)}
      </li>
    );
  };

  const selectedLead = leadDialog ? leadsFor(leadDialog).find((lead) => lead.id === selectedLeadId) : undefined;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <section className="space-y-3" aria-label="Huni">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground">Aktivasyon hunisi</h3>
            <p className="text-xs text-muted-foreground">Hipotez değil, ölçülen</p>
          </div>
          {funnel ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {funnelSteps.map((item, index) => {
                  const previous = index > 0 ? funnelSteps[index - 1].value : null;
                  return (
                    <div key={item.key} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-display text-2xl text-foreground">{item.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {previous === null ? " " : previous > 0 ? `Önceki adımın %${Math.round((item.value / previous) * 100)}'i` : "–"}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Yanıt veren: {funnel.replied} · Kod isteyen firma: {funnel.otp_started} · Ulaşılmadan sahiplenen: {funnel.organic_claims} ·
                İlk talebi satın alan: {funnel.first_lead_bought} · Cep numarası olan: {funnel.with_mobile} · E-postası olan: {funnel.with_email}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Huni sayıları yüklenemedi veya henüz hazır değil.</p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="outreach-sender">Gönderen adı</Label>
              <Input id="outreach-sender" className="h-10 w-44" value={sender} onChange={(e) => updateSender(e.target.value)} maxLength={60} />
            </div>
            <Badge
              variant="outline"
              className={`h-10 px-3 text-sm ${atCap ? "border-destructive text-destructive" : capNear ? "border-amber-500 bg-amber-100 text-amber-900" : ""}`}
            >
              Bugün {todayCount ?? "–"}/{DAILY_WA_CAP} WhatsApp
            </Badge>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={exportLog} disabled={exporting !== null}>
                {exporting === "log" ? <Loader2 className="mr-1 h-4 w-4 motion-safe:animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                Outreach kayıtları CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exportClaimLinks} disabled={exporting !== null}>
                {exporting === "links" ? <Loader2 className="mr-1 h-4 w-4 motion-safe:animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                Claim linkleri CSV
              </Button>
              <Button size="sm" variant="ghost" onClick={refreshAll} disabled={loading}>
                <RefreshCw className="mr-1 h-4 w-4" /> Yenile
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              value={segment}
              onValueChange={(value) => {
                setSegment(value);
                setPage(0);
              }}
            >
              <SelectTrigger aria-label="Segment">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm segmentler</SelectItem>
                <SelectItem value="A">Segment A</SelectItem>
                <SelectItem value="B">Segment B</SelectItem>
                <SelectItem value="C">Segment C</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={state}
              onValueChange={(value) => {
                setState(value);
                setPage(0);
              }}
            >
              <SelectTrigger aria-label="Durum">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm durumlar</SelectItem>
                {STATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={city}
              onValueChange={(value) => {
                setCity(value);
                setPage(0);
              }}
            >
              <SelectTrigger aria-label="İl">
                <SelectValue placeholder="İl" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm iller</SelectItem>
                {TURKISH_CITIES.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="search"
              className="h-10"
              placeholder="Firma adı veya telefon ara"
              aria-label="Ara"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </section>

        {loadError ? (
          <div role="alert" className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">{loadError}</p>
            <Button className="mt-4" variant="outline" onClick={() => void loadQueue()}>
              Tekrar dene
            </Button>
          </div>
        ) : loading && rows.length === 0 ? (
          <p className="text-muted-foreground">Yükleniyor...</p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">Bu filtrelerle eşleşen firma yok.</p>
        ) : (
          <>
            <ul className="space-y-3">{rows.map(renderRow)}</ul>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {page * PAGE_SIZE + 1}-{page * PAGE_SIZE + rows.length} / {total}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Önceki
                </Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                  Sonraki
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={leadDialog !== null} onOpenChange={(open) => !open && setLeadDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerçek bir talep seçin</DialogTitle>
            <DialogDescription>
              {leadDialog ? `${leadDialog.city} için son 30 günde gelen talepler. Mesaj yalnızca seçtiğiniz talebin bilgilerini içerir; ad, telefon ve e-posta paylaşılmaz.` : ""}
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedLeadId} onValueChange={setSelectedLeadId} className="gap-2">
            {(leadDialog ? leadsFor(leadDialog) : []).map((lead) => (
              <Label
                key={lead.id}
                htmlFor={`lead-${lead.id}`}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 font-normal"
              >
                <RadioGroupItem id={`lead-${lead.id}`} value={lead.id} className="mt-1" />
                <span className="text-sm">
                  <span className="font-medium">{lead.service_type}</span> · {lead.district ? `${lead.city} / ${lead.district}` : lead.city}
                  {leadDialog && lead.target_firm_id === leadDialog.firm_id && (
                    <Badge variant="secondary" className="ml-2">
                      Bu firmayı seçti
                    </Badge>
                  )}
                  <br />
                  <span className="text-muted-foreground">
                    {projectSizeLabel(lead.project_size)} · {budgetLabel(lead.budget)} · {formatDate(lead.created_at)}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeadDialog(null)}>
              Vazgeç
            </Button>
            <Button disabled={!selectedLead} onClick={confirmLeadDialog}>
              WhatsApp&apos;ta aç
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={callDialog !== null} onOpenChange={(open) => !open && setCallDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{callDialog?.row.company_name}</DialogTitle>
            <DialogDescription>Arama metni. Aramadan sonra &quot;Arama yapıldı&quot; ile kaydedin.</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-sm text-foreground">{callDialog?.script}</pre>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCallDialog(null)}>
              Kapat
            </Button>
            {callDialog?.row.phone && (
              <Button variant="outline" asChild>
                <a href={`tel:${callDialog.row.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone className="mr-1 h-4 w-4" aria-hidden="true" /> {callDialog.row.phone}
                </a>
              </Button>
            )}
            <Button variant="accent" onClick={confirmCall}>
              Arama yapıldı
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeTarget !== null} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{removeTarget?.company_name} listeden kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              Profil aynı gün firma listelerinden, profil sayfasından ve site haritasından çıkar. Firma bunu kendisi istediğinde kullanın.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoval}>Kaldır</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={capPrompt !== null} onOpenChange={(open) => !open && setCapPrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Günlük WhatsApp sınırına ulaştınız</AlertDialogTitle>
            <AlertDialogDescription>
              Bugün {todayCount}/{DAILY_WA_CAP} mesaj kaydedildi. Tanımadığınız numaralara çok sayıda mesaj atmak WhatsApp hesabının kapanmasına yol açabilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                capPrompt?.proceed();
                setCapPrompt(null);
              }}
            >
              Yine de aç
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
