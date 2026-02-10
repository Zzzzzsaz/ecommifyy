import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2, ShoppingCart, FileText, Download, Trash2 } from "lucide-react";

const SHOPS = [
  { id: 1, name: "ecom1", color: "#6366f1" },
  { id: 2, name: "ecom2", color: "#10b981" },
  { id: 3, name: "ecom3", color: "#f59e0b" },
  { id: 4, name: "ecom4", color: "#ec4899" },
];
const MONTHS_PL = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
const STATUS_MAP = { new: "Nowe", processing: "W realizacji", shipped: "Wyslane", delivered: "Dostarczone", cancelled: "Anulowane" };
const STATUS_COLORS = { new: "#6366f1", processing: "#f59e0b", shipped: "#10b981", delivered: "#22c55e", cancelled: "#ef4444" };
const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zl";
const shopColor = (id) => SHOPS.find(s => s.id === id)?.color || "#6366f1";
const shopName = (id) => SHOPS.find(s => s.id === id)?.name || "";

export default function Orders({ user }) {
  const now = new Date();
  const [shop, setShop] = useState(0);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddReceipt, setShowAddReceipt] = useState(false);
  const [orderForm, setOrderForm] = useState({ customer_name: "", total: "", date: "", shop_id: "1", items_desc: "" });
  const [receiptForm, setReceiptForm] = useState({ date: "", shop_id: "1", desc: "", qty: "1", price: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { year, month };
      if (shop > 0) params.shop_id = shop;
      const [o, r] = await Promise.all([api.getOrders(params), api.getReceipts(params)]);
      setOrders(o.data);
      setReceipts(r.data);
    } catch { toast.error("Blad ladowania"); }
    finally { setLoading(false); }
  }, [shop, year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const addOrder = async () => {
    if (!orderForm.total || !orderForm.date) { toast.error("Wypelnij kwote i date"); return; }
    setSaving(true);
    try {
      await api.createOrder({ customer_name: orderForm.customer_name, total: parseFloat(orderForm.total), date: orderForm.date, shop_id: parseInt(orderForm.shop_id), items: orderForm.items_desc ? [{ name: orderForm.items_desc, quantity: 1, price: parseFloat(orderForm.total) }] : [] });
      toast.success("Zamowienie dodane!");
      setShowAddOrder(false);
      setOrderForm({ customer_name: "", total: "", date: "", shop_id: "1", items_desc: "" });
      fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const addReceipt = async () => {
    if (!receiptForm.date || !receiptForm.price) { toast.error("Wypelnij date i cene"); return; }
    setSaving(true);
    try {
      await api.createReceipt({ date: receiptForm.date, shop_id: parseInt(receiptForm.shop_id), items: [{ description: receiptForm.desc || "Sprzedaz", quantity: parseInt(receiptForm.qty) || 1, netto_price: parseFloat(receiptForm.price) }] });
      toast.success("Paragon wystawiony!");
      setShowAddReceipt(false);
      setReceiptForm({ date: "", shop_id: "1", desc: "", qty: "1", price: "" });
      fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const deleteOrder = async (id) => { await api.deleteOrder(id); fetchData(); toast.success("Usunieto"); };
  const deleteReceipt = async (id) => { await api.deleteReceipt(id); fetchData(); toast.success("Usunieto"); };

  const totalOrders = orders.reduce((s, o) => s + o.total, 0);
  const totalRecNetto = receipts.reduce((s, r) => s + r.total_netto, 0);
  const totalRecBrutto = receipts.reduce((s, r) => s + r.total_brutto, 0);

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="orders-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading text-2xl font-bold text-white">ZAMOWIENIA</h1>
        <div className="flex gap-1.5">
          <Button size="sm" variant={tab === "orders" ? "default" : "outline"} onClick={() => setTab("orders")} className={tab === "orders" ? "bg-ecom-primary" : "border-ecom-border text-ecom-muted"} data-testid="tab-orders"><ShoppingCart size={13} className="mr-1" />Zamowienia</Button>
          <Button size="sm" variant={tab === "receipts" ? "default" : "outline"} onClick={() => setTab("receipts")} className={tab === "receipts" ? "bg-ecom-primary" : "border-ecom-border text-ecom-muted"} data-testid="tab-receipts"><FileText size={13} className="mr-1" />Paragony</Button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" data-testid="orders-shop-tabs">
        <button onClick={() => setShop(0)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${shop === 0 ? "text-white bg-ecom-primary/15 border-ecom-primary" : "text-ecom-muted border-ecom-border"}`}>WSZYSTKIE</button>
        {SHOPS.map(s => <button key={s.id} onClick={() => setShop(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${shop === s.id ? "text-white" : "text-ecom-muted border-ecom-border"}`} style={shop === s.id ? { backgroundColor: s.color + "20", borderColor: s.color, color: s.color } : {}}>{s.name}</button>)}
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="text-ecom-muted hover:text-white"><ChevronLeft size={20} /></Button>
        <span className="font-heading text-lg font-semibold text-white min-w-[160px] text-center">{MONTHS_PL[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="text-ecom-muted hover:text-white"><ChevronRight size={20} /></Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={32} /></div> : (
        <>
          {tab === "orders" ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-ecom-muted text-xs">{orders.length} zamowien - <span className="text-white font-medium">{fmtPLN(totalOrders)}</span></p>
                <Button size="sm" onClick={() => setShowAddOrder(true)} className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-order-btn"><Plus size={14} className="mr-1" />Dodaj</Button>
              </div>
              <div className="space-y-2" data-testid="orders-list">
                {orders.map(o => (
                  <Card key={o.id} className="bg-ecom-card border-ecom-border border-l-[3px]" style={{ borderLeftColor: shopColor(o.shop_id) }}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white text-sm font-medium truncate">{o.customer_name || o.order_number}</p>
                            <Badge variant="outline" className="text-[9px] shrink-0" style={{ borderColor: STATUS_COLORS[o.status], color: STATUS_COLORS[o.status] }}>{STATUS_MAP[o.status]}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-ecom-muted">
                            <span>{o.date}</span><span style={{ color: shopColor(o.shop_id) }}>{shopName(o.shop_id)}</span><span className="text-white font-medium">{fmtPLN(o.total)}</span>
                          </div>
                        </div>
                        <button onClick={() => deleteOrder(o.id)} className="text-ecom-muted hover:text-ecom-danger shrink-0 ml-2"><Trash2 size={14} /></button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {orders.length === 0 && <div className="text-center py-8 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg">Brak zamowien</div>}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-ecom-muted text-xs">{receipts.length} paragonow - Netto: <span className="text-white">{fmtPLN(totalRecNetto)}</span> Brutto: <span className="text-white">{fmtPLN(totalRecBrutto)}</span></p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => api.downloadSummaryPdf(year, month, shop > 0 ? shop : null)} className="border-ecom-border text-ecom-muted hover:text-white" data-testid="download-summary"><Download size={12} className="mr-1" />PDF</Button>
                  <Button size="sm" onClick={() => setShowAddReceipt(true)} className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-receipt-btn"><Plus size={14} className="mr-1" />Wystaw</Button>
                </div>
              </div>
              <div className="space-y-2" data-testid="receipts-list">
                {receipts.map(r => (
                  <Card key={r.id} className="bg-ecom-card border-ecom-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{r.receipt_number}</p>
                          <div className="flex gap-3 mt-1 text-[10px] text-ecom-muted">
                            <span>{r.date}</span><span style={{ color: shopColor(r.shop_id) }}>{shopName(r.shop_id)}</span>
                            <span>Netto: {fmtPLN(r.total_netto)}</span><span className="text-ecom-warning">VAT: {fmtPLN(r.vat_amount)}</span><span className="text-white font-medium">Brutto: {fmtPLN(r.total_brutto)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => api.downloadReceiptPdf(r.id)} className="text-ecom-muted hover:text-ecom-primary"><Download size={14} /></button>
                          <button onClick={() => deleteReceipt(r.id)} className="text-ecom-muted hover:text-ecom-danger"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {receipts.length === 0 && <div className="text-center py-8 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg">Brak paragonow</div>}
              </div>
            </>
          )}

          {/* Export Excel */}
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => api.downloadExcel(year, month, shop > 0 ? shop : null)} className="border-ecom-border text-ecom-muted hover:text-white w-full" data-testid="export-excel"><Download size={13} className="mr-1.5" />Eksportuj do Excel</Button>
          </div>
        </>
      )}

      {/* ADD ORDER DIALOG */}
      <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-order-dialog">
          <DialogHeader><DialogTitle className="font-heading text-white">Dodaj zamowienie</DialogTitle><DialogDescription className="text-ecom-muted text-xs">Reczne dodanie zamowienia</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-1">
            <Input placeholder="Klient" value={orderForm.customer_name} onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <Input placeholder="Opis produktow" value={orderForm.items_desc} onChange={e => setOrderForm(f => ({ ...f, items_desc: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <Input type="number" placeholder="Kwota (PLN)" value={orderForm.total} onChange={e => setOrderForm(f => ({ ...f, total: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <Input type="date" value={orderForm.date} onChange={e => setOrderForm(f => ({ ...f, date: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <Select value={orderForm.shop_id} onValueChange={v => setOrderForm(f => ({ ...f, shop_id: v }))}>
              <SelectTrigger className="bg-ecom-bg border-ecom-border text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-ecom-card border-ecom-border">{SHOPS.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={addOrder} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80">{saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}Dodaj</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD RECEIPT DIALOG */}
      <Dialog open={showAddReceipt} onOpenChange={setShowAddReceipt}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-receipt-dialog">
          <DialogHeader><DialogTitle className="font-heading text-white">Wystaw paragon</DialogTitle><DialogDescription className="text-ecom-muted text-xs">VAT 23% naliczany automatycznie</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-1">
            <Input type="date" value={receiptForm.date} onChange={e => setReceiptForm(f => ({ ...f, date: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <Select value={receiptForm.shop_id} onValueChange={v => setReceiptForm(f => ({ ...f, shop_id: v }))}>
              <SelectTrigger className="bg-ecom-bg border-ecom-border text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-ecom-card border-ecom-border">{SHOPS.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Opis (np. Koszulka XL)" value={receiptForm.desc} onChange={e => setReceiptForm(f => ({ ...f, desc: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Ilosc" value={receiptForm.qty} onChange={e => setReceiptForm(f => ({ ...f, qty: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
              <Input type="number" placeholder="Cena netto (zl)" value={receiptForm.price} onChange={e => setReceiptForm(f => ({ ...f, price: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            </div>
            {receiptForm.price && <p className="text-[10px] text-ecom-muted">Netto: {(parseFloat(receiptForm.price) * parseInt(receiptForm.qty || 1)).toFixed(2)} zl | VAT: {(parseFloat(receiptForm.price) * parseInt(receiptForm.qty || 1) * 0.23).toFixed(2)} zl | <span className="text-white font-medium">Brutto: {(parseFloat(receiptForm.price) * parseInt(receiptForm.qty || 1) * 1.23).toFixed(2)} zl</span></p>}
            <Button onClick={addReceipt} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80">{saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}Wystaw paragon</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
