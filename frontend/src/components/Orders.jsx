import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Loader2, ShoppingCart, BookOpen,
  Download, Trash2, Zap, Package, User, Phone, Mail, MapPin, CreditCard, Hash,
  RotateCcw, Truck, Bell, CheckCircle2, XCircle, Clock, Archive, Send,
  Undo2, DollarSign, StickyNote, Pencil
} from "lucide-react";

const MONTHS_PL = ["Styczen","Luty","Marzec","Kwiecien","Maj","Czerwiec","Lipiec","Sierpien","Wrzesien","Pazdziernik","Listopad","Grudzien"];
const ALL_STATUSES = [
  { value: "new", label: "Nowe", color: "#6366f1" },
  { value: "processing", label: "W realizacji", color: "#f59e0b" },
  { value: "shipped", label: "Wyslane", color: "#10b981" },
  { value: "delivered", label: "Dostarczone", color: "#22c55e" },
  { value: "cancelled", label: "Anulowane", color: "#ef4444" },
  { value: "returned", label: "Zwrocone", color: "#ef4444" },
];
const STATUS_MAP = Object.fromEntries(ALL_STATUSES.map(s => [s.value, s.label]));
const STATUS_COLORS = Object.fromEntries(ALL_STATUSES.map(s => [s.value, s.color]));

const STAGES = [
  { id: "waiting", label: "Oczekujace", icon: Clock, color: "#6366f1" },
  { id: "reminder_sent", label: "Przypomnienie", icon: Bell, color: "#f59e0b" },
  { id: "check_payment", label: "Sprawdzenie", icon: DollarSign, color: "#8b5cf6" },
  { id: "to_ship", label: "Wysylka", icon: Truck, color: "#10b981" },
  { id: "unpaid", label: "Nieoplacone", icon: XCircle, color: "#ef4444" },
  { id: "archived", label: "Archiwum", icon: Archive, color: "#64748b" },
];
const STAGE_PREV = { reminder_sent: "waiting", check_payment: "reminder_sent", to_ship: "check_payment", archived: "to_ship", unpaid: "check_payment" };
const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zl";

export default function Orders({ user, shops = [] }) {
  const sc = (id) => shops.find(s => s.id === id)?.color || "#6366f1";
  const sn = (id) => shops.find(s => s.id === id)?.name || "";
  const now = new Date();
  const [shop, setShop] = useState(0);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [returns, setReturns] = useState([]);
  const [fulfillment, setFulfillment] = useState([]);
  const [fNotes, setFNotes] = useState([]);
  const [reminderInfo, setReminderInfo] = useState(null);
  const [activeStage, setActiveStage] = useState("waiting");
  const [loading, setLoading] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(null);
  const [showFulfillDialog, setShowFulfillDialog] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(null);
  const [showEditStatus, setShowEditStatus] = useState(null);
  const [editStatusVal, setEditStatusVal] = useState("");
  const [orderForm, setOrderForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", payment_gateway: "", transaction_id: "", total: "", date: "", shop_id: "1", items_desc: "" });
  const [recordForm, setRecordForm] = useState({ date: "", order_number: "", product_name: "", quantity: "1", brutto: "", payment_method: "", shop_id: "1" });
  const [returnReason, setReturnReason] = useState("");
  const [fulfillExtra, setFulfillExtra] = useState("");
  const [fulfillNotes, setFulfillNotes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const sourceMonth = `${year}-${String(month).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = { year, month }; if (shop > 0) p.shop_id = shop;
      const [o, s, r] = await Promise.all([api.getOrders(p), api.getSalesRecords(p), api.getReturns(p)]);
      setOrders(o.data); setSalesRecords(s.data); setReturns(r.data);
    } catch { toast.error("Blad"); } finally { setLoading(false); }
  }, [shop, year, month]);

  const fetchFulfillment = useCallback(async () => {
    try {
      const [f, ri, n] = await Promise.all([
        api.getFulfillment({ source_month: sourceMonth }),
        api.getFulfillmentReminder(),
        api.getFulfillmentNotes({ source_month: sourceMonth })
      ]);
      setFulfillment(f.data); setReminderInfo(ri.data); setFNotes(n.data);
    } catch {}
  }, [sourceMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (tab === "realizacja") fetchFulfillment(); }, [tab, fetchFulfillment]);

  const pm = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nm = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Actions
  const addOrder = async () => {
    if (!orderForm.total || !orderForm.date) { toast.error("Wypelnij kwote i date"); return; }
    setSaving(true);
    try {
      await api.createOrder({ ...orderForm, total: parseFloat(orderForm.total), shop_id: parseInt(orderForm.shop_id), items: orderForm.items_desc ? [{ name: orderForm.items_desc, quantity: 1, price: parseFloat(orderForm.total) }] : [] });
      toast.success("Dodano!"); setShowAddOrder(false); setOrderForm({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", payment_gateway: "", transaction_id: "", total: "", date: "", shop_id: "1", items_desc: "" }); fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };
  const addRecord = async () => {
    if (!recordForm.date || !recordForm.brutto || !recordForm.product_name) { toast.error("Wypelnij pola"); return; }
    setSaving(true);
    try {
      const b = parseFloat(recordForm.brutto);
      await api.createSalesRecord({ ...recordForm, netto: Math.round((b / 1.23) * 100) / 100, vat_rate: 23, brutto: b, quantity: parseInt(recordForm.quantity) || 1, shop_id: parseInt(recordForm.shop_id) });
      toast.success("Dodano!"); setShowAddRecord(false); setRecordForm({ date: "", order_number: "", product_name: "", quantity: "1", brutto: "", payment_method: "", shop_id: "1" }); fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };
  const createReturn = async () => {
    if (!showReturnDialog) return; setSaving(true);
    try { await api.createReturn({ order_id: showReturnDialog.id, reason: returnReason }); toast.success("Zwrot!"); setShowReturnDialog(null); setReturnReason(""); fetchData(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Blad"); } finally { setSaving(false); }
  };
  const addToFulfillment = async () => {
    if (!showFulfillDialog) return; setSaving(true);
    try { await api.createFulfillment({ order_id: showFulfillDialog.id, extra_payment: parseFloat(fulfillExtra) || 0, notes: fulfillNotes }); toast.success("Dodano do realizacji!"); setShowFulfillDialog(null); setFulfillExtra(""); setFulfillNotes(""); fetchData(); fetchFulfillment(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Blad"); } finally { setSaving(false); }
  };
  const updateStatus = async (id, status) => { try { await api.updateFulfillment(id, { status }); toast.success("Zaktualizowano"); fetchFulfillment(); } catch { toast.error("Blad"); } };
  const undoStatus = async (id, currentStatus) => { const prev = STAGE_PREV[currentStatus]; if (prev) { await updateStatus(id, prev); } };
  const markPaid = async (id, paid) => {
    try {
      if (paid) { await api.updateFulfillment(id, { extra_payment_paid: true, status: "to_ship" }); toast.success("Oplacone → Wysylka"); }
      else { await api.updateFulfillment(id, { extra_payment_paid: false, status: "unpaid" }); toast.error("Nieoplacone"); }
      fetchFulfillment();
    } catch { toast.error("Blad"); }
  };
  const bulkReminder = async () => {
    try { const r = await api.bulkFulfillmentStatus({ source_month: sourceMonth, from_status: "waiting", to_status: "reminder_sent" }); toast.success(`Oznaczono ${r.data.updated}`); fetchFulfillment(); } catch { toast.error("Blad"); }
  };
  const changeOrderStatus = async () => {
    if (!showEditStatus || !editStatusVal) return; setSaving(true);
    try { await api.updateOrderStatus(showEditStatus.id, editStatusVal); toast.success("Status zmieniony"); setShowEditStatus(null); fetchData(); }
    catch { toast.error("Blad"); } finally { setSaving(false); }
  };
  const addFNote = async () => {
    if (!newNote.trim()) return;
    try { await api.createFulfillmentNote({ content: newNote, source_month: sourceMonth, created_by: user?.name || "" }); setNewNote(""); fetchFulfillment(); }
    catch { toast.error("Blad"); }
  };

  const totalOrders = orders.reduce((s, o) => s + o.total, 0);
  const totalBrutto = salesRecords.reduce((s, r) => s + (r.brutto || 0), 0);
  const totalVat = salesRecords.reduce((s, r) => s + (r.vat_amount || 0), 0);
  const totalNetto = salesRecords.reduce((s, r) => s + (r.netto || 0), 0);
  const totalRefund = returns.reduce((s, r) => s + (r.refund_amount || 0), 0);
  const dateGroups = {}; salesRecords.forEach(r => { if (!dateGroups[r.date]) dateGroups[r.date] = []; dateGroups[r.date].push(r); });
  const sortedDates = Object.keys(dateGroups).sort().reverse();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const stageItems = (id) => fulfillment.filter(f => f.status === id);
  const stageCounts = Object.fromEntries(STAGES.map(s => [s.id, stageItems(s.id).length]));

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="orders-page">
      <h1 className="font-heading text-2xl font-bold text-white mb-3">ZAMOWIENIA</h1>
      {/* Top tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
        {[{ id: "orders", label: "Zamowienia", icon: ShoppingCart, count: orders.length, clr: "bg-ecom-primary" },
          { id: "ewidencja", label: "Ewidencja", icon: BookOpen, count: salesRecords.length, clr: "bg-ecom-success" },
          { id: "zwroty", label: "Zwroty", icon: RotateCcw, count: returns.length, clr: "bg-ecom-danger" },
          { id: "realizacja", label: "Realizacja", icon: Truck, count: fulfillment.length, clr: "bg-ecom-success" }
        ].map(t => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "outline"} onClick={() => setTab(t.id)}
            className={`shrink-0 ${tab === t.id ? t.clr : "border-ecom-border text-ecom-muted"}`} data-testid={`tab-${t.id}`}>
            <t.icon size={12} className="mr-1" />{t.label}
            {t.count > 0 && <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">{t.count}</Badge>}
          </Button>
        ))}
      </div>
      {/* Shop + Month */}
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
        <button onClick={() => setShop(0)} className={`px-2 py-1 rounded text-[10px] font-bold border shrink-0 ${shop === 0 ? "text-white bg-ecom-primary/15 border-ecom-primary" : "text-ecom-muted border-ecom-border"}`}>WSZYSTKIE</button>
        {shops.map(s => <button key={s.id} onClick={() => setShop(s.id)} className={`px-2 py-1 rounded text-[10px] font-semibold border shrink-0 ${shop === s.id ? "text-white" : "text-ecom-muted border-ecom-border"}`} style={shop === s.id ? { backgroundColor: s.color + "20", borderColor: s.color, color: s.color } : {}}>{s.name}</button>)}
      </div>
      <div className="flex items-center justify-center gap-3 mb-3">
        <Button variant="ghost" size="icon" onClick={pm} className="text-ecom-muted hover:text-white h-7 w-7"><ChevronLeft size={16} /></Button>
        <span className="font-heading text-sm font-semibold text-white min-w-[130px] text-center">{MONTHS_PL[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" onClick={nm} className="text-ecom-muted hover:text-white h-7 w-7"><ChevronRight size={16} /></Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={32} /></div> : (
        <>
          {/* ========== ZAMOWIENIA ========== */}
          {tab === "orders" && (<>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Card className="bg-ecom-card border-ecom-border"><CardContent className="p-2.5 text-center"><p className="text-ecom-muted text-[9px] uppercase">Zamowienia</p><p className="text-white font-bold text-lg font-heading">{orders.length}</p></CardContent></Card>
              <Card className="bg-ecom-card border-ecom-border"><CardContent className="p-2.5 text-center"><p className="text-ecom-muted text-[9px] uppercase">Wartosc</p><p className="text-white font-bold text-sm font-heading">{fmtPLN(totalOrders)}</p></CardContent></Card>
            </div>
            <div className="flex justify-end mb-2"><Button size="sm" onClick={() => setShowAddOrder(true)} className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-order-btn"><Plus size={14} className="mr-1" />Dodaj</Button></div>
            <div className="space-y-1.5" data-testid="orders-list">
              {orders.map(o => (
                <Card key={o.id} className="bg-ecom-card border-ecom-border border-l-[3px] hover:bg-ecom-card/80 transition-colors" style={{ borderLeftColor: sc(o.shop_id) }}>
                  <CardContent className="p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setShowOrderDetail(o)}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white text-xs font-medium truncate">{o.customer_name || o.order_number}</span>
                          <Badge variant="outline" className="text-[8px] cursor-pointer" style={{ borderColor: STATUS_COLORS[o.status], color: STATUS_COLORS[o.status] }}
                            onClick={(e) => { e.stopPropagation(); setShowEditStatus(o); setEditStatusVal(o.status); }}>
                            {STATUS_MAP[o.status] || o.status} <Pencil size={7} className="ml-0.5 inline" />
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-ecom-muted flex-wrap">
                          <span><Hash size={8} className="inline" />{o.order_number}</span><span>{o.date}</span>
                          <span style={{ color: sc(o.shop_id) }}>{sn(o.shop_id)}</span><span className="text-white font-semibold">{fmtPLN(o.total)}</span>
                        </div>
                        {o.items?.length > 0 && <p className="text-[9px] text-ecom-muted mt-0.5 truncate"><Package size={8} className="inline mr-0.5" />{o.items.map(it => it.name || it.description).join(", ")}</p>}
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {o.status !== "returned" && o.status !== "processing" && (<>
                          <button onClick={() => setShowReturnDialog(o)} className="text-ecom-muted hover:text-ecom-danger p-1" title="Zwrot"><RotateCcw size={12} /></button>
                          <button onClick={() => setShowFulfillDialog(o)} className="text-ecom-muted hover:text-ecom-success p-1" title="Realizacja"><Truck size={12} /></button>
                        </>)}
                        <button onClick={() => deleteOrder(o.id)} className="text-ecom-muted hover:text-ecom-danger p-1"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {orders.length === 0 && <div className="text-center py-8 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg"><ShoppingCart size={24} className="mx-auto mb-1 opacity-30" />Brak</div>}
            </div>
          </>)}

          {/* ========== EWIDENCJA ========== */}
          {tab === "ewidencja" && (<>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Card className="bg-ecom-card border-ecom-border"><CardContent className="p-2 text-center"><p className="text-ecom-muted text-[9px] uppercase">Brutto</p><p className="text-white font-bold text-sm font-heading">{fmtPLN(totalBrutto)}</p></CardContent></Card>
              <Card className="bg-ecom-card border-ecom-border"><CardContent className="p-2 text-center"><p className="text-ecom-muted text-[9px] uppercase">VAT</p><p className="text-ecom-warning font-bold text-sm font-heading">{fmtPLN(totalVat)}</p></CardContent></Card>
              <Card className="bg-ecom-card border-ecom-border"><CardContent className="p-2 text-center"><p className="text-ecom-muted text-[9px] uppercase">Netto</p><p className="text-ecom-success font-bold text-sm font-heading">{fmtPLN(totalNetto)}</p></CardContent></Card>
            </div>
            <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
              <Button size="sm" onClick={async () => { setGenerating(true); try { const p = { year, month }; if (shop > 0) p.shop_id = shop; const r = await api.generateSalesFromOrders(p); toast.success(r.data.message); fetchData(); } catch { toast.error("Blad"); } finally { setGenerating(false); }}} disabled={generating} className="bg-ecom-success hover:bg-ecom-success/80 text-white" data-testid="generate-from-orders-btn">{generating ? <Loader2 size={12} className="animate-spin mr-1" /> : <Zap size={12} className="mr-1" />}Z zamowien</Button>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => api.downloadSalesPdfDaily(todayStr, shop > 0 ? shop : null)} className="border-ecom-border text-ecom-muted hover:text-white h-7 text-[10px]"><Download size={10} className="mr-0.5" />Dz.</Button>
                <Button size="sm" variant="outline" onClick={() => api.downloadSalesPdfMonthly(year, month, shop > 0 ? shop : null)} className="border-ecom-border text-ecom-muted hover:text-white h-7 text-[10px]"><Download size={10} className="mr-0.5" />Mies.</Button>
                <Button size="sm" onClick={() => setShowAddRecord(true)} className="bg-ecom-primary hover:bg-ecom-primary/80 h-7 text-[10px]"><Plus size={12} /></Button>
              </div>
            </div>
            <div className="space-y-2" data-testid="sales-records-list">
              {sortedDates.map(date => { const recs = dateGroups[date]; const db2 = recs.reduce((s, r) => s + (r.brutto || 0), 0); return (
                <div key={date}><div className="flex items-center justify-between mb-1 px-0.5"><div className="flex items-center gap-1.5"><span className="text-white text-xs font-semibold">{date}</span><Badge variant="secondary" className="text-[9px]">{recs.length}</Badge></div><div className="flex items-center gap-2 text-[10px]"><span className="text-white">{fmtPLN(db2)}</span><button onClick={() => api.downloadSalesPdfDaily(date, shop > 0 ? shop : null)} className="text-ecom-muted hover:text-ecom-primary"><Download size={11} /></button></div></div>
                  <div className="space-y-1">{recs.map(r => (<Card key={r.id} className="bg-ecom-card border-ecom-border"><CardContent className="p-2 flex items-center justify-between gap-2"><div className="min-w-0 flex-1"><div className="flex items-center gap-1"><span className="text-white text-xs font-medium truncate">{r.product_name}</span>{r.source === "order" && <Badge variant="outline" className="text-[7px] border-ecom-primary/30 text-ecom-primary"><ShoppingCart size={7} />{r.order_number}</Badge>}</div><div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-ecom-muted"><span>x{r.quantity}</span><span style={{ color: sc(r.shop_id) }}>{sn(r.shop_id)}</span><span className="text-white font-medium">B:{fmtPLN(r.brutto)}</span></div></div><button onClick={() => deleteRecord(r.id)} className="text-ecom-muted hover:text-ecom-danger p-1"><Trash2 size={11} /></button></CardContent></Card>))}</div></div>);})}
              {salesRecords.length === 0 && <div className="text-center py-6 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg"><BookOpen size={24} className="mx-auto mb-1 opacity-30" />Brak</div>}
            </div>
          </>)}

          {/* ========== ZWROTY ========== */}
          {tab === "zwroty" && (<>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Card className="bg-ecom-card border-ecom-border"><CardContent className="p-2.5 text-center"><p className="text-ecom-muted text-[9px] uppercase">Zwroty</p><p className="text-ecom-danger font-bold text-lg font-heading">{returns.length}</p></CardContent></Card>
              <Card className="bg-ecom-card border-ecom-border"><CardContent className="p-2.5 text-center"><p className="text-ecom-muted text-[9px] uppercase">Wartosc</p><p className="text-ecom-danger font-bold text-sm font-heading">{fmtPLN(totalRefund)}</p></CardContent></Card>
            </div>
            <p className="text-ecom-muted text-[10px] mb-2">Kliknij ikone zwrotu przy zamowieniu w "Zamowienia". Usunięcie zwrotu przywraca zamówienie.</p>
            <div className="space-y-1.5" data-testid="returns-list">
              {returns.map(r => (<Card key={r.id} className="bg-ecom-card border-ecom-border border-l-[3px] border-l-ecom-danger"><CardContent className="p-2.5 flex items-start justify-between"><div><div className="flex items-center gap-1.5"><span className="text-white text-xs font-medium">{r.customer_name}</span><Badge className="text-[8px] bg-ecom-danger/20 text-ecom-danger border-ecom-danger/40">Zwrot</Badge></div><div className="flex items-center gap-2 mt-1 text-[10px] text-ecom-muted"><span><Hash size={8} className="inline" />{r.order_number}</span><span>{r.date}</span><span style={{ color: sc(r.shop_id) }}>{sn(r.shop_id)}</span><span className="text-ecom-danger font-semibold">{fmtPLN(r.refund_amount)}</span></div>{r.reason && <p className="text-[9px] text-ecom-muted mt-0.5">{r.reason}</p>}</div><button onClick={() => deleteReturn(r.id)} className="flex items-center gap-1 text-[10px] text-ecom-muted hover:text-ecom-primary px-2 py-1 rounded hover:bg-ecom-primary/10 transition-colors" title="Cofnij zwrot - zamówienie wróci do listy" data-testid={`undo-return-${r.id}`}><Undo2 size={12} /><span>Cofnij</span></button></CardContent></Card>))}
              {returns.length === 0 && <div className="text-center py-8 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg"><RotateCcw size={24} className="mx-auto mb-1 opacity-30" />Brak zwrotow</div>}
            </div>
          </>)}

          {/* ========== REALIZACJA ========== */}
          {tab === "realizacja" && (<>
            {/* Reminder banner */}
            {reminderInfo?.show_reminder && (
              <Card className="bg-ecom-warning/10 border-ecom-warning/30 mb-3" data-testid="reminder-banner">
                <CardContent className="p-2.5 flex items-center justify-between"><div className="flex items-center gap-2"><Bell size={14} className="text-ecom-warning" /><div><p className="text-white text-xs font-medium">Czas na przypomnienia!</p><p className="text-ecom-muted text-[10px]">{reminderInfo.prev_month}: {reminderInfo.waiting_for_reminder} zamowien</p></div></div>
                  <Button size="sm" onClick={bulkReminder} className="bg-ecom-warning hover:bg-ecom-warning/80 text-black shrink-0" data-testid="bulk-reminder-btn"><Send size={12} className="mr-1" />Wyslij</Button>
                </CardContent>
              </Card>
            )}

            {/* Horizontal stage tabs */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1" data-testid="stage-tabs">
              {STAGES.map(s => {
                const cnt = stageCounts[s.id] || 0;
                const active = activeStage === s.id;
                return (
                  <button key={s.id} onClick={() => setActiveStage(s.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all shrink-0 ${active ? "text-white" : "text-ecom-muted border-ecom-border hover:border-ecom-border/80"}`}
                    style={active ? { backgroundColor: s.color + "20", borderColor: s.color, color: s.color } : {}}
                    data-testid={`stage-tab-${s.id}`}>
                    <s.icon size={11} />{s.label}
                    {cnt > 0 && <span className={`ml-0.5 px-1 rounded text-[8px] font-bold ${active ? "bg-white/20" : "bg-ecom-border/40"}`}>{cnt}</span>}
                  </button>
                );
              })}
            </div>

            {/* Active stage content */}
            <div className="min-h-[200px]" data-testid={`stage-content-${activeStage}`}>
              {/* Stage actions bar */}
              {activeStage === "waiting" && stageCounts.waiting > 0 && (
                <div className="mb-2"><Button size="sm" onClick={bulkReminder} className="bg-ecom-warning hover:bg-ecom-warning/80 text-black" data-testid="bulk-send-reminder"><Send size={12} className="mr-1" />Oznacz wszystkie jako wyslane</Button></div>
              )}

              {/* Items */}
              <div className="space-y-1.5">
                {stageItems(activeStage).map(item => (
                  <Card key={item.id} className="bg-ecom-card border-ecom-border border-l-[3px]" style={{ borderLeftColor: sc(item.shop_id) }}>
                    <CardContent className="p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-white text-xs font-medium">{item.customer_name || item.order_number}</span>
                            <Badge variant="outline" className="text-[8px]" style={{ borderColor: STAGES.find(s => s.id === item.status)?.color, color: STAGES.find(s => s.id === item.status)?.color }}>
                              {STAGES.find(s => s.id === item.status)?.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-ecom-muted flex-wrap">
                            <span><Hash size={8} className="inline" />{item.order_number}</span>
                            <span style={{ color: sc(item.shop_id) }}>{sn(item.shop_id)}</span>
                            <span className="text-white font-medium">{fmtPLN(item.total)}</span>
                            {item.extra_payment > 0 && <span className="text-ecom-warning"><DollarSign size={8} className="inline" />Doplata: {fmtPLN(item.extra_payment)} {item.extra_payment_paid && <CheckCircle2 size={8} className="inline text-ecom-success ml-0.5" />}</span>}
                          </div>
                          {item.status === "reminder_sent" && <p className="text-[9px] mt-0.5">{item.auto_check_ready ? <span className="text-ecom-success">Gotowe do sprawdzenia</span> : <span className="text-ecom-muted"><Clock size={8} className="inline mr-0.5" />{item.days_until_check} dni</span>}</p>}
                          {item.notes && <p className="text-[9px] text-ecom-muted mt-0.5">{item.notes}</p>}
                          {item.shipping_address && <p className="text-[9px] text-ecom-muted mt-0.5"><MapPin size={8} className="inline mr-0.5" />{item.shipping_address}</p>}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {/* Forward actions per stage */}
                          {item.status === "waiting" && <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "reminder_sent")} className="text-[9px] h-6 px-2 border-ecom-warning/40 text-ecom-warning" title="Wyslij przypomnienie"><Send size={10} /></Button>}
                          {item.status === "reminder_sent" && item.auto_check_ready && <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "check_payment")} className="text-[9px] h-6 px-2 border-ecom-primary/40 text-ecom-primary" title="Sprawdz"><DollarSign size={10} /></Button>}
                          {item.status === "check_payment" && <div className="flex gap-0.5"><Button size="sm" onClick={() => markPaid(item.id, true)} className="text-[9px] h-6 px-1.5 bg-ecom-success hover:bg-ecom-success/80" title="Oplacone"><CheckCircle2 size={10} /></Button><Button size="sm" variant="outline" onClick={() => markPaid(item.id, false)} className="text-[9px] h-6 px-1.5 border-ecom-danger/40 text-ecom-danger" title="Nieoplacone"><XCircle size={10} /></Button></div>}
                          {item.status === "unpaid" && <Button size="sm" onClick={() => markPaid(item.id, true)} className="text-[9px] h-6 px-2 bg-ecom-success hover:bg-ecom-success/80" title="Jednak oplacone"><CheckCircle2 size={10} /></Button>}
                          {item.status === "to_ship" && <Button size="sm" onClick={() => updateStatus(item.id, "archived")} className="text-[9px] h-6 px-2 bg-ecom-primary hover:bg-ecom-primary/80" title="Wyslane"><Archive size={10} className="mr-0.5" />Wyslane</Button>}
                          {/* Undo button */}
                          {STAGE_PREV[item.status] && (
                            <Button size="sm" variant="ghost" onClick={() => undoStatus(item.id, item.status)} className="text-[9px] h-6 px-2 text-ecom-muted hover:text-white" title="Cofnij" data-testid={`undo-${item.id}`}><Undo2 size={10} /></Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {stageItems(activeStage).length === 0 && <div className="text-center py-6 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg">{STAGES.find(s => s.id === activeStage)?.label}: brak zamowien</div>}
              </div>
            </div>

            {/* Notepad */}
            <Card className="bg-ecom-card border-ecom-border mt-4" data-testid="fulfill-notepad">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white text-xs font-semibold flex items-center gap-1"><StickyNote size={12} className="text-ecom-warning" />Notatnik - {MONTHS_PL[month - 1]}</p>
                </div>
                <div className="flex gap-1.5 mb-2">
                  <Input placeholder="Nowa notatka..." value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addFNote()}
                    className="bg-ecom-bg border-ecom-border text-white text-xs h-8 flex-1" data-testid="fulfill-note-input" />
                  <Button size="sm" onClick={addFNote} className="bg-ecom-warning/20 hover:bg-ecom-warning/30 text-ecom-warning h-8" data-testid="fulfill-note-add"><Plus size={12} /></Button>
                </div>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {fNotes.map(n => (
                    <div key={n.id} className="flex items-start gap-1.5 text-[10px] bg-ecom-bg rounded p-1.5">
                      <p className="text-white flex-1">{n.content}</p>
                      <span className="text-ecom-muted shrink-0">{n.created_by}</span>
                      <button onClick={() => { api.deleteFulfillmentNote(n.id).then(fetchFulfillment); }} className="text-ecom-muted hover:text-ecom-danger shrink-0"><Trash2 size={10} /></button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <p className="text-ecom-muted text-[9px] mt-2">Dodaj zamowienie do realizacji ikonka ciezarowki w "Zamowienia"</p>
          </>)}

          <div className="mt-3"><Button variant="outline" size="sm" onClick={() => api.downloadExcel(year, month, shop > 0 ? shop : null)} className="border-ecom-border text-ecom-muted hover:text-white w-full" data-testid="export-excel"><Download size={12} className="mr-1" />Excel</Button></div>
        </>
      )}

      {/* EDIT ORDER STATUS */}
      <Dialog open={!!showEditStatus} onOpenChange={() => setShowEditStatus(null)}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-[260px]" data-testid="edit-status-dialog">
          <DialogHeader><DialogTitle className="font-heading text-white text-sm">Zmien status</DialogTitle><DialogDescription className="text-ecom-muted text-xs">{showEditStatus?.order_number}</DialogDescription></DialogHeader>
          <div className="space-y-2 mt-1">
            <Select value={editStatusVal} onValueChange={setEditStatusVal}>
              <SelectTrigger className="bg-ecom-bg border-ecom-border text-white" data-testid="status-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-ecom-card border-ecom-border">
                {ALL_STATUSES.map(s => <SelectItem key={s.value} value={s.value}><span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />{s.label}</span></SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={changeOrderStatus} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="save-status">{saving ? <Loader2 className="animate-spin mr-1" size={14} /> : null}Zapisz</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ORDER DETAIL */}
      <Dialog open={!!showOrderDetail} onOpenChange={() => setShowOrderDetail(null)}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-md max-h-[80vh] overflow-y-auto" data-testid="order-detail-dialog">
          {showOrderDetail && (<><DialogHeader><DialogTitle className="font-heading text-white text-sm"><ShoppingCart size={14} className="inline mr-1" />{showOrderDetail.order_number}</DialogTitle></DialogHeader>
            <div className="space-y-2 mt-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-ecom-muted text-[10px] uppercase block">Data</span><span className="text-white">{showOrderDetail.date}</span></div>
                <div><span className="text-ecom-muted text-[10px] uppercase block">Kwota</span><span className="text-white font-bold">{fmtPLN(showOrderDetail.total)}</span></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ecom-muted text-[10px]">Status:</span>
                <Badge variant="outline" className="text-[9px] cursor-pointer" style={{ borderColor: STATUS_COLORS[showOrderDetail.status], color: STATUS_COLORS[showOrderDetail.status] }}
                  onClick={() => { setShowOrderDetail(null); setShowEditStatus(showOrderDetail); setEditStatusVal(showOrderDetail.status); }}>
                  {STATUS_MAP[showOrderDetail.status]} <Pencil size={7} className="ml-0.5 inline" />
                </Badge>
              </div>
              {showOrderDetail.customer_name && <div className="flex items-center gap-2 text-ecom-muted"><User size={11} /><span className="text-white">{showOrderDetail.customer_name}</span></div>}
              {showOrderDetail.customer_email && <div className="flex items-center gap-2 text-ecom-muted"><Mail size={11} /><span className="text-white">{showOrderDetail.customer_email}</span></div>}
              {showOrderDetail.customer_phone && <div className="flex items-center gap-2 text-ecom-muted"><Phone size={11} /><span className="text-white">{showOrderDetail.customer_phone}</span></div>}
              {showOrderDetail.shipping_address && <div className="flex items-center gap-2 text-ecom-muted"><MapPin size={11} /><span className="text-white">{showOrderDetail.shipping_address}</span></div>}
              {showOrderDetail.items?.length > 0 && <div>{showOrderDetail.items.map((it, i) => <div key={i} className="flex justify-between bg-ecom-bg rounded p-1.5 mt-1"><span className="text-white">{it.name || it.description}</span><span className="text-ecom-muted">{it.quantity}x {fmtPLN(it.price)}</span></div>)}</div>}
              <div className="flex gap-2 pt-2 border-t border-ecom-border">
                {showOrderDetail.status !== "returned" && showOrderDetail.status !== "processing" && (<>
                  <Button size="sm" variant="outline" onClick={() => { setShowOrderDetail(null); setShowReturnDialog(showOrderDetail); }} className="border-ecom-danger/40 text-ecom-danger flex-1"><RotateCcw size={12} className="mr-1" />Zwrot</Button>
                  <Button size="sm" onClick={() => { setShowOrderDetail(null); setShowFulfillDialog(showOrderDetail); }} className="bg-ecom-success hover:bg-ecom-success/80 flex-1"><Truck size={12} className="mr-1" />Realizacja</Button>
                </>)}
              </div>
            </div></>)}
        </DialogContent>
      </Dialog>

      {/* RETURN DIALOG */}
      <Dialog open={!!showReturnDialog} onOpenChange={() => setShowReturnDialog(null)}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-xs" data-testid="return-dialog">
          <DialogHeader><DialogTitle className="font-heading text-white text-sm">Zwrot</DialogTitle><DialogDescription className="text-ecom-muted text-xs">{showReturnDialog?.order_number}</DialogDescription></DialogHeader>
          <div className="space-y-2 mt-1"><div className="bg-ecom-bg rounded p-2 text-center"><span className="text-ecom-danger font-bold">{fmtPLN(showReturnDialog?.total)}</span></div>
            <Textarea placeholder="Powod (opcjonalnie)" value={returnReason} onChange={e => setReturnReason(e.target.value)} className="bg-ecom-bg border-ecom-border text-white resize-none" rows={2} data-testid="return-reason" />
            <Button onClick={createReturn} disabled={saving} className="w-full bg-ecom-danger hover:bg-ecom-danger/80" data-testid="confirm-return">{saving ? <Loader2 className="animate-spin mr-1" size={14} /> : <RotateCcw size={12} className="mr-1" />}Potwierdz</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FULFILLMENT DIALOG */}
      <Dialog open={!!showFulfillDialog} onOpenChange={() => setShowFulfillDialog(null)}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-xs" data-testid="fulfillment-dialog">
          <DialogHeader><DialogTitle className="font-heading text-white text-sm">Do realizacji</DialogTitle><DialogDescription className="text-ecom-muted text-xs">{showFulfillDialog?.order_number}</DialogDescription></DialogHeader>
          <div className="space-y-2 mt-1"><div className="bg-ecom-bg rounded p-2 text-center"><span className="text-white font-bold">{fmtPLN(showFulfillDialog?.total)}</span></div>
            <div><label className="text-ecom-muted text-[10px] uppercase block mb-0.5">Doplata (PLN)</label><Input type="number" placeholder="0.00" value={fulfillExtra} onChange={e => setFulfillExtra(e.target.value)} className="bg-ecom-bg border-ecom-border text-white" data-testid="fulfill-extra" /></div>
            <Textarea placeholder="Notatki" value={fulfillNotes} onChange={e => setFulfillNotes(e.target.value)} className="bg-ecom-bg border-ecom-border text-white resize-none" rows={2} data-testid="fulfill-notes" />
            <Button onClick={addToFulfillment} disabled={saving} className="w-full bg-ecom-success hover:bg-ecom-success/80" data-testid="confirm-fulfill">{saving ? <Loader2 className="animate-spin mr-1" size={14} /> : <Truck size={12} className="mr-1" />}Dodaj</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD ORDER */}
      <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm max-h-[80vh] overflow-y-auto" data-testid="add-order-dialog">
          <DialogHeader><DialogTitle className="font-heading text-white text-sm">Dodaj zamowienie</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-1">
            <Input placeholder="Klient" value={orderForm.customer_name} onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="order-customer-name" />
            <div className="grid grid-cols-2 gap-2"><Input placeholder="Email" value={orderForm.customer_email} onChange={e => setOrderForm(f => ({ ...f, customer_email: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" /><Input placeholder="Telefon" value={orderForm.customer_phone} onChange={e => setOrderForm(f => ({ ...f, customer_phone: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" /></div>
            <Input placeholder="Adres" value={orderForm.shipping_address} onChange={e => setOrderForm(f => ({ ...f, shipping_address: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <Input placeholder="Produkty" value={orderForm.items_desc} onChange={e => setOrderForm(f => ({ ...f, items_desc: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <div className="grid grid-cols-2 gap-2"><Input type="number" placeholder="Kwota (PLN)" value={orderForm.total} onChange={e => setOrderForm(f => ({ ...f, total: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="order-total" /><Input type="date" value={orderForm.date} onChange={e => setOrderForm(f => ({ ...f, date: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="order-date" /></div>
            <Select value={orderForm.shop_id} onValueChange={v => setOrderForm(f => ({ ...f, shop_id: v }))}><SelectTrigger className="bg-ecom-bg border-ecom-border text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-ecom-card border-ecom-border">{shops.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}</SelectContent></Select>
            <Button onClick={addOrder} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="submit-order-btn">{saving ? <Loader2 className="animate-spin mr-1" size={14} /> : null}Dodaj</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD RECORD */}
      <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-record-dialog">
          <DialogHeader><DialogTitle className="font-heading text-white text-sm">Ewidencja</DialogTitle><DialogDescription className="text-ecom-muted text-xs">VAT 23% auto</DialogDescription></DialogHeader>
          <div className="space-y-2 mt-1">
            <Input type="date" value={recordForm.date} onChange={e => setRecordForm(f => ({ ...f, date: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="record-date" />
            <Input placeholder="Produkt" value={recordForm.product_name} onChange={e => setRecordForm(f => ({ ...f, product_name: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="record-product" />
            <div className="grid grid-cols-2 gap-2"><Input type="number" placeholder="Ilosc" value={recordForm.quantity} onChange={e => setRecordForm(f => ({ ...f, quantity: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" /><Input type="number" placeholder="Brutto" value={recordForm.brutto} onChange={e => setRecordForm(f => ({ ...f, brutto: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="record-brutto" /></div>
            <Select value={recordForm.shop_id} onValueChange={v => setRecordForm(f => ({ ...f, shop_id: v }))}><SelectTrigger className="bg-ecom-bg border-ecom-border text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-ecom-card border-ecom-border">{shops.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}</SelectContent></Select>
            <Button onClick={addRecord} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="submit-record-btn">{saving ? <Loader2 className="animate-spin mr-1" size={14} /> : null}Dodaj</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
  function deleteOrder(id) { api.deleteOrder(id).then(fetchData).then(() => toast.success("Usunieto")); }
  function deleteRecord(id) { api.deleteSalesRecord(id).then(fetchData).then(() => toast.success("Usunieto")); }
  function deleteReturn(id) { api.deleteReturn(id).then(fetchData).then(() => toast.success("Zwrot cofniety - zamowienie przywrocone")); }
}
