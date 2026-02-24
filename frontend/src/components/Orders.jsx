import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2, ShoppingCart, Trash2, Truck, Clock, CheckCircle2, XCircle, Archive, Send, Undo2, DollarSign, Bell, Hash, User, MapPin } from "lucide-react";

const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const STAGES = [
  { id: "waiting", label: "Oczekujące", icon: Clock, color: "#6366f1" },
  { id: "reminder_sent", label: "Przypomnienie", icon: Bell, color: "#f59e0b" },
  { id: "check_payment", label: "Sprawdzenie", icon: DollarSign, color: "#8b5cf6" },
  { id: "to_ship", label: "Wysyłka", icon: Truck, color: "#10b981" },
  { id: "unpaid", label: "Nieopłacone", icon: XCircle, color: "#ef4444" },
  { id: "archived", label: "Archiwum", icon: Archive, color: "#64748b" },
];
const STAGE_PREV = { reminder_sent: "waiting", check_payment: "reminder_sent", to_ship: "check_payment", archived: "to_ship", unpaid: "check_payment" };
const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";

export default function Orders({ user, shops = [] }) {
  const sc = (id) => shops.find(s => s.id === id)?.color || "#6366f1";
  const sn = (id) => shops.find(s => s.id === id)?.name || "";
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [orders, setOrders] = useState([]);
  const [fulfillment, setFulfillment] = useState([]);
  const [activeStage, setActiveStage] = useState("waiting");
  const [loading, setLoading] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showFulfillDialog, setShowFulfillDialog] = useState(null);
  const [orderForm, setOrderForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", total: "", date: "", shop_id: "1", items_desc: "" });
  const [fulfillExtra, setFulfillExtra] = useState("");
  const [fulfillNotes, setFulfillNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const sourceMonth = `${year}-${String(month).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [o, f] = await Promise.all([
        api.getOrders({ year, month }),
        api.getFulfillment({ source_month: sourceMonth })
      ]);
      setOrders(o.data || []);
      setFulfillment(f.data || []);
    } catch {} 
    finally { setLoading(false); }
  }, [year, month, sourceMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pm = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nm = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const addOrder = async () => {
    if (!orderForm.total || !orderForm.date) { toast.error("Podaj kwotę i datę"); return; }
    setSaving(true);
    try {
      await api.createOrder({ ...orderForm, total: parseFloat(orderForm.total), shop_id: parseInt(orderForm.shop_id), items: orderForm.items_desc ? [{ name: orderForm.items_desc, quantity: 1, price: parseFloat(orderForm.total) }] : [] });
      toast.success("Dodano");
      setShowAddOrder(false);
      setOrderForm({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", total: "", date: "", shop_id: "1", items_desc: "" });
      fetchData();
    } catch { toast.error("Błąd"); }
    finally { setSaving(false); }
  };

  const addToFulfillment = async () => {
    if (!showFulfillDialog) return;
    setSaving(true);
    try {
      await api.createFulfillment({ order_id: showFulfillDialog.id, extra_payment: parseFloat(fulfillExtra) || 0, notes: fulfillNotes });
      toast.success("Dodano do realizacji");
      setShowFulfillDialog(null);
      setFulfillExtra("");
      setFulfillNotes("");
      fetchData();
    } catch (e) { toast.error(e?.response?.data?.detail || "Błąd"); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try { await api.updateFulfillment(id, { status }); fetchData(); } catch { toast.error("Błąd"); }
  };

  const undoStatus = async (id, currentStatus) => {
    const prev = STAGE_PREV[currentStatus];
    if (prev) updateStatus(id, prev);
  };

  const deleteFulfillmentItem = async (id) => {
    if (!window.confirm("Usunąć z realizacji?")) return;
    try { await api.deleteFulfillment(id); toast.success("Usunięto"); fetchData(); } catch {}
  };

  const markPaid = async (id, paid) => {
    try {
      if (paid) { await api.updateFulfillment(id, { extra_payment_paid: true, status: "to_ship" }); }
      else { await api.updateFulfillment(id, { extra_payment_paid: false, status: "unpaid" }); }
      fetchData();
    } catch {}
  };

  const deleteOrder = async (id) => {
    await api.deleteOrder(id);
    toast.success("Usunięto");
    fetchData();
  };

  const stageItems = (id) => fulfillment.filter(f => f.status === id);
  const stageCounts = Object.fromEntries(STAGES.map(s => [s.id, stageItems(s.id).length]));
  const ordersNotInFulfillment = orders.filter(o => !fulfillment.find(f => f.order_id === o.id));

  return (
    <div className="page-container" data-testid="orders-page">
      <h1 className="text-xl font-bold text-slate-900 mb-4">Zamówienia</h1>

      {/* Month Nav */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button onClick={pm} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-slate-900 min-w-[140px] text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={nm} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : (
        <>
          {/* New Orders Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">Nowe zamówienia ({ordersNotInFulfillment.length})</h2>
              <Button onClick={() => setShowAddOrder(true)} className="bg-slate-900 hover:bg-slate-800 h-9">
                <Plus size={16} className="mr-1" /> Dodaj
              </Button>
            </div>

            {ordersNotInFulfillment.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <ShoppingCart size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-slate-500">Brak nowych zamówień</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ordersNotInFulfillment.map(o => (
                  <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4 border-l-4" style={{ borderLeftColor: sc(o.shop_id) }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">{o.customer_name || o.order_number}</span>
                          <span className="text-xs text-slate-400">#{o.order_number}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span>{o.date}</span>
                          <span style={{ color: sc(o.shop_id) }}>{sn(o.shop_id)}</span>
                          <span className="font-semibold text-slate-900">{fmtPLN(o.total)}</span>
                        </div>
                        {o.shipping_address && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin size={10} /> {o.shipping_address}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowFulfillDialog(o)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <Truck size={18} />
                        </button>
                        <button onClick={() => deleteOrder(o.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fulfillment Pipeline */}
          <div>
            <h2 className="font-semibold text-slate-900 mb-3">Realizacja ({fulfillment.length})</h2>

            {/* Stage Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {STAGES.map(s => {
                const cnt = stageCounts[s.id] || 0;
                const active = activeStage === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveStage(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      active ? "text-white" : "bg-white border border-slate-200 text-slate-600"
                    }`}
                    style={active ? { backgroundColor: s.color } : {}}
                  >
                    <Icon size={14} />
                    {s.label}
                    {cnt > 0 && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${active ? "bg-white/20" : "bg-slate-100"}`}>
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stage Items */}
            <div className="space-y-2">
              {stageItems(activeStage).length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <p className="text-slate-500">{STAGES.find(s => s.id === activeStage)?.label}: brak</p>
                </div>
              ) : (
                stageItems(activeStage).map(item => (
                  <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 border-l-4" style={{ borderLeftColor: sc(item.shop_id) }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">{item.customer_name || item.order_number}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: STAGES.find(s => s.id === item.status)?.color + "15", color: STAGES.find(s => s.id === item.status)?.color }}>
                            {STAGES.find(s => s.id === item.status)?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span>#{item.order_number}</span>
                          <span style={{ color: sc(item.shop_id) }}>{sn(item.shop_id)}</span>
                          <span className="font-semibold text-slate-900">{fmtPLN(item.total)}</span>
                          {item.extra_payment > 0 && (
                            <span className="text-orange-600 flex items-center gap-1">
                              <DollarSign size={12} />
                              Dopłata: {fmtPLN(item.extra_payment)}
                              {item.extra_payment_paid && <CheckCircle2 size={12} className="text-emerald-500" />}
                            </span>
                          )}
                        </div>
                        {item.notes && <p className="text-xs text-slate-400 mt-1">{item.notes}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        {item.status === "waiting" && (
                          <Button size="sm" onClick={() => updateStatus(item.id, "reminder_sent")} className="h-8 text-xs bg-orange-500 hover:bg-orange-400">
                            <Send size={12} className="mr-1" /> Przypomnienie
                          </Button>
                        )}
                        {item.status === "reminder_sent" && (
                          <Button size="sm" onClick={() => updateStatus(item.id, "check_payment")} className="h-8 text-xs bg-violet-500 hover:bg-violet-400">
                            <DollarSign size={12} className="mr-1" /> Sprawdź
                          </Button>
                        )}
                        {item.status === "check_payment" && (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => markPaid(item.id, true)} className="h-8 text-xs bg-emerald-500 hover:bg-emerald-400">
                              <CheckCircle2 size={12} />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => markPaid(item.id, false)} className="h-8 text-xs border-red-200 text-red-600">
                              <XCircle size={12} />
                            </Button>
                          </div>
                        )}
                        {item.status === "unpaid" && (
                          <Button size="sm" onClick={() => markPaid(item.id, true)} className="h-8 text-xs bg-emerald-500 hover:bg-emerald-400">
                            <CheckCircle2 size={12} className="mr-1" /> Opłacone
                          </Button>
                        )}
                        {item.status === "to_ship" && (
                          <Button size="sm" onClick={() => updateStatus(item.id, "archived")} className="h-8 text-xs bg-slate-600 hover:bg-slate-500">
                            <Archive size={12} className="mr-1" /> Wysłane
                          </Button>
                        )}
                        <div className="flex gap-1">
                          {STAGE_PREV[item.status] && (
                            <button onClick={() => undoStatus(item.id, item.status)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                              <Undo2 size={14} />
                            </button>
                          )}
                          <button onClick={() => deleteFulfillmentItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Order Dialog */}
      <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Nowe zamówienie</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Klient" value={orderForm.customer_name} onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Email" value={orderForm.customer_email} onChange={e => setOrderForm(f => ({ ...f, customer_email: e.target.value }))} />
              <Input placeholder="Telefon" value={orderForm.customer_phone} onChange={e => setOrderForm(f => ({ ...f, customer_phone: e.target.value }))} />
            </div>
            <Input placeholder="Adres" value={orderForm.shipping_address} onChange={e => setOrderForm(f => ({ ...f, shipping_address: e.target.value }))} />
            <Input placeholder="Produkty" value={orderForm.items_desc} onChange={e => setOrderForm(f => ({ ...f, items_desc: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Kwota (zł)" value={orderForm.total} onChange={e => setOrderForm(f => ({ ...f, total: e.target.value }))} />
              <Input type="date" value={orderForm.date} onChange={e => setOrderForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <Select value={orderForm.shop_id} onValueChange={v => setOrderForm(f => ({ ...f, shop_id: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {shops.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={addOrder} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />} Dodaj
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fulfillment Dialog */}
      <Dialog open={!!showFulfillDialog} onOpenChange={() => setShowFulfillDialog(null)}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle>Do realizacji</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">{showFulfillDialog?.order_number} - {fmtPLN(showFulfillDialog?.total)}</p>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Dopłata (zł)</label>
              <Input type="number" placeholder="0.00" value={fulfillExtra} onChange={e => setFulfillExtra(e.target.value)} />
            </div>
            <Textarea placeholder="Notatki" value={fulfillNotes} onChange={e => setFulfillNotes(e.target.value)} rows={2} />
            <Button onClick={addToFulfillment} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Truck size={16} className="mr-1" /> Dodaj do realizacji
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
