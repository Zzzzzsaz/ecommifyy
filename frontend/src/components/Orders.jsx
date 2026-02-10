import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Loader2, ShoppingCart, FileText,
  Download, Trash2, Zap, Package, User, Phone, Mail, MapPin, CreditCard, Hash, BookOpen
} from "lucide-react";

const MONTHS_PL = ["Styczen","Luty","Marzec","Kwiecien","Maj","Czerwiec","Lipiec","Sierpien","Wrzesien","Pazdziernik","Listopad","Grudzien"];
const STATUS_MAP = { new: "Nowe", processing: "W realizacji", shipped: "Wyslane", delivered: "Dostarczone", cancelled: "Anulowane" };
const STATUS_COLORS = { new: "#6366f1", processing: "#f59e0b", shipped: "#10b981", delivered: "#22c55e", cancelled: "#ef4444" };
const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zl";

export default function Orders({ user, shops = [] }) {
  const shopColor = (id) => shops.find(s => s.id === id)?.color || "#6366f1";
  const shopName = (id) => shops.find(s => s.id === id)?.name || "";
  const now = new Date();
  const [shop, setShop] = useState(0);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState(null);
  const [orderForm, setOrderForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    shipping_address: "", shipping_method: "", payment_gateway: "",
    transaction_id: "", total: "", date: "", shop_id: "1", items_desc: ""
  });
  const [recordForm, setRecordForm] = useState({
    date: "", order_number: "", product_name: "", quantity: "1", brutto: "", payment_method: "", shop_id: "1"
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { year, month };
      if (shop > 0) params.shop_id = shop;
      const [o, s] = await Promise.all([api.getOrders(params), api.getSalesRecords(params)]);
      setOrders(o.data);
      setSalesRecords(s.data);
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
      await api.createOrder({
        customer_name: orderForm.customer_name, customer_email: orderForm.customer_email,
        customer_phone: orderForm.customer_phone, shipping_address: orderForm.shipping_address,
        shipping_method: orderForm.shipping_method, payment_gateway: orderForm.payment_gateway,
        transaction_id: orderForm.transaction_id, total: parseFloat(orderForm.total),
        date: orderForm.date, shop_id: parseInt(orderForm.shop_id),
        items: orderForm.items_desc ? [{ name: orderForm.items_desc, quantity: 1, price: parseFloat(orderForm.total) }] : []
      });
      toast.success("Zamowienie dodane!");
      setShowAddOrder(false);
      setOrderForm({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", shipping_method: "", payment_gateway: "", transaction_id: "", total: "", date: "", shop_id: "1", items_desc: "" });
      fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const addRecord = async () => {
    if (!recordForm.date || !recordForm.brutto || !recordForm.product_name) { toast.error("Wypelnij date, produkt i kwote brutto"); return; }
    setSaving(true);
    try {
      const brutto = parseFloat(recordForm.brutto);
      const netto = Math.round((brutto / 1.23) * 100) / 100;
      await api.createSalesRecord({
        date: recordForm.date, order_number: recordForm.order_number,
        product_name: recordForm.product_name, quantity: parseInt(recordForm.quantity) || 1,
        netto, vat_rate: 23, brutto,
        payment_method: recordForm.payment_method, shop_id: parseInt(recordForm.shop_id)
      });
      toast.success("Wpis dodany do ewidencji!");
      setShowAddRecord(false);
      setRecordForm({ date: "", order_number: "", product_name: "", quantity: "1", brutto: "", payment_method: "", shop_id: "1" });
      fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const generateFromOrders = async () => {
    setGenerating(true);
    try {
      const params = { year, month };
      if (shop > 0) params.shop_id = shop;
      const res = await api.generateSalesFromOrders(params);
      toast.success(res.data.message);
      fetchData();
    } catch { toast.error("Blad generowania"); }
    finally { setGenerating(false); }
  };

  const deleteOrder = async (id) => { await api.deleteOrder(id); fetchData(); toast.success("Usunieto"); };
  const deleteRecord = async (id) => { await api.deleteSalesRecord(id); fetchData(); toast.success("Usunieto"); };

  const totalOrders = orders.reduce((s, o) => s + o.total, 0);
  const totalBrutto = salesRecords.reduce((s, r) => s + (r.brutto || 0), 0);
  const totalVat = salesRecords.reduce((s, r) => s + (r.vat_amount || 0), 0);
  const totalNetto = salesRecords.reduce((s, r) => s + (r.netto || 0), 0);

  // Group sales records by date for daily view
  const dateGroups = {};
  salesRecords.forEach(r => {
    if (!dateGroups[r.date]) dateGroups[r.date] = [];
    dateGroups[r.date].push(r);
  });
  const sortedDates = Object.keys(dateGroups).sort().reverse();

  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="orders-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading text-2xl font-bold text-white">ZAMOWIENIA</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-3">
        <Button size="sm" variant={tab === "orders" ? "default" : "outline"}
          onClick={() => setTab("orders")}
          className={tab === "orders" ? "bg-ecom-primary" : "border-ecom-border text-ecom-muted"}
          data-testid="tab-orders">
          <ShoppingCart size={13} className="mr-1" />Zamowienia
          <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1.5">{orders.length}</Badge>
        </Button>
        <Button size="sm" variant={tab === "ewidencja" ? "default" : "outline"}
          onClick={() => setTab("ewidencja")}
          className={tab === "ewidencja" ? "bg-ecom-success" : "border-ecom-border text-ecom-muted"}
          data-testid="tab-ewidencja">
          <BookOpen size={13} className="mr-1" />Ewidencja
          <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1.5">{salesRecords.length}</Badge>
        </Button>
      </div>

      {/* Shop filter */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" data-testid="orders-shop-tabs">
        <button onClick={() => setShop(0)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${shop === 0 ? "text-white bg-ecom-primary/15 border-ecom-primary" : "text-ecom-muted border-ecom-border"}`}>WSZYSTKIE</button>
        {shops.map(s => (
          <button key={s.id} onClick={() => setShop(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${shop === s.id ? "text-white" : "text-ecom-muted border-ecom-border"}`}
            style={shop === s.id ? { backgroundColor: s.color + "20", borderColor: s.color, color: s.color } : {}}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="text-ecom-muted hover:text-white"><ChevronLeft size={20} /></Button>
        <span className="font-heading text-lg font-semibold text-white min-w-[160px] text-center">{MONTHS_PL[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="text-ecom-muted hover:text-white"><ChevronRight size={20} /></Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={32} /></div>
      ) : (
        <>
          {tab === "orders" ? (
            <>
              {/* Orders summary */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Card className="bg-ecom-card border-ecom-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-ecom-muted text-[9px] uppercase">Zamowienia</p>
                    <p className="text-white font-bold text-lg font-heading">{orders.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-ecom-card border-ecom-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-ecom-muted text-[9px] uppercase">Wartosc</p>
                    <p className="text-white font-bold text-sm font-heading">{fmtPLN(totalOrders)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-end mb-3">
                <Button size="sm" onClick={() => setShowAddOrder(true)} className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-order-btn">
                  <Plus size={14} className="mr-1" />Dodaj
                </Button>
              </div>

              <div className="space-y-2" data-testid="orders-list">
                {orders.map(o => (
                  <Card key={o.id} className="bg-ecom-card border-ecom-border border-l-[3px] hover:bg-ecom-card/80 transition-colors cursor-pointer"
                    style={{ borderLeftColor: shopColor(o.shop_id) }} onClick={() => setShowOrderDetail(o)}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white text-sm font-medium truncate">{o.customer_name || o.order_number}</p>
                            <Badge variant="outline" className="text-[9px] shrink-0"
                              style={{ borderColor: STATUS_COLORS[o.status], color: STATUS_COLORS[o.status] }}>
                              {STATUS_MAP[o.status] || o.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ecom-muted flex-wrap">
                            <span className="flex items-center gap-0.5"><Hash size={9} />{o.order_number}</span>
                            <span>{o.date}</span>
                            <span style={{ color: shopColor(o.shop_id) }}>{shopName(o.shop_id)}</span>
                            <span className="text-white font-semibold">{fmtPLN(o.total)}</span>
                          </div>
                          {o.items?.length > 0 && (
                            <p className="text-[10px] text-ecom-muted mt-1 truncate flex items-center gap-0.5">
                              <Package size={9} />{o.items.map(it => it.name || it.description).join(", ")}
                            </p>
                          )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteOrder(o.id); }}
                          className="text-ecom-muted hover:text-ecom-danger shrink-0 p-1" data-testid={`delete-order-${o.id}`}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {orders.length === 0 && (
                  <div className="text-center py-10 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg">
                    <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />Brak zamowien
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Ewidencja summary */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <Card className="bg-ecom-card border-ecom-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-ecom-muted text-[9px] uppercase">Brutto</p>
                    <p className="text-white font-bold text-sm font-heading">{fmtPLN(totalBrutto)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-ecom-card border-ecom-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-ecom-muted text-[9px] uppercase">VAT 23%</p>
                    <p className="text-ecom-warning font-bold text-sm font-heading">{fmtPLN(totalVat)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-ecom-card border-ecom-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-ecom-muted text-[9px] uppercase">Netto</p>
                    <p className="text-ecom-success font-bold text-sm font-heading">{fmtPLN(totalNetto)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <Button size="sm" onClick={generateFromOrders} disabled={generating}
                  className="bg-ecom-success hover:bg-ecom-success/80 text-white" data-testid="generate-from-orders-btn">
                  {generating ? <Loader2 size={14} className="animate-spin mr-1" /> : <Zap size={14} className="mr-1" />}
                  Z zamowien
                </Button>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => api.downloadSalesPdfDaily(todayStr, shop > 0 ? shop : null)}
                    className="border-ecom-border text-ecom-muted hover:text-white" data-testid="pdf-daily-btn">
                    <Download size={12} className="mr-1" />Dzienna
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => api.downloadSalesPdfMonthly(year, month, shop > 0 ? shop : null)}
                    className="border-ecom-border text-ecom-muted hover:text-white" data-testid="pdf-monthly-btn">
                    <Download size={12} className="mr-1" />Miesieczna
                  </Button>
                  <Button size="sm" onClick={() => setShowAddRecord(true)}
                    className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-record-btn">
                    <Plus size={14} className="mr-1" />Dodaj
                  </Button>
                </div>
              </div>

              {/* Sales records grouped by date */}
              <div className="space-y-3" data-testid="sales-records-list">
                {sortedDates.map(date => {
                  const records = dateGroups[date];
                  const dayBrutto = records.reduce((s, r) => s + (r.brutto || 0), 0);
                  const dayVat = records.reduce((s, r) => s + (r.vat_amount || 0), 0);
                  return (
                    <div key={date}>
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-semibold">{date}</span>
                          <Badge variant="secondary" className="text-[9px]">{records.length} poz.</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="text-white font-medium">{fmtPLN(dayBrutto)}</span>
                          <span className="text-ecom-warning">VAT: {fmtPLN(dayVat)}</span>
                          <button onClick={() => api.downloadSalesPdfDaily(date, shop > 0 ? shop : null)}
                            className="text-ecom-muted hover:text-ecom-primary" data-testid={`pdf-day-${date}`}>
                            <Download size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {records.map(r => (
                          <Card key={r.id} className="bg-ecom-card border-ecom-border">
                            <CardContent className="p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-white text-xs font-medium truncate">{r.product_name}</p>
                                    {r.source === "order" && (
                                      <Badge variant="outline" className="text-[8px] border-ecom-primary/30 text-ecom-primary shrink-0">
                                        <ShoppingCart size={8} className="mr-0.5" />{r.order_number}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-ecom-muted flex-wrap">
                                    <span>x{r.quantity}</span>
                                    <span style={{ color: shopColor(r.shop_id) }}>{shopName(r.shop_id)}</span>
                                    {r.payment_method && <span className="flex items-center gap-0.5"><CreditCard size={8} />{r.payment_method}</span>}
                                    <span className="text-ecom-muted">N: {fmtPLN(r.netto)}</span>
                                    <span className="text-ecom-warning">V: {fmtPLN(r.vat_amount)}</span>
                                    <span className="text-white font-semibold">B: {fmtPLN(r.brutto)}</span>
                                  </div>
                                </div>
                                <button onClick={() => deleteRecord(r.id)}
                                  className="text-ecom-muted hover:text-ecom-danger shrink-0 p-1" data-testid={`delete-record-${r.id}`}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {salesRecords.length === 0 && (
                  <div className="text-center py-10 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg">
                    <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
                    Brak wpisow w ewidencji<br />
                    <span className="text-[10px]">Kliknij "Z zamowien" aby wygenerowac z zamowien</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => api.downloadExcel(year, month, shop > 0 ? shop : null)}
              className="border-ecom-border text-ecom-muted hover:text-white w-full" data-testid="export-excel">
              <Download size={13} className="mr-1.5" />Eksportuj do Excel
            </Button>
          </div>
        </>
      )}

      {/* ORDER DETAIL DIALOG */}
      <Dialog open={!!showOrderDetail} onOpenChange={() => setShowOrderDetail(null)}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-md max-h-[80vh] overflow-y-auto" data-testid="order-detail-dialog">
          {showOrderDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-white flex items-center gap-2">
                  <ShoppingCart size={16} />Zamowienie {showOrderDetail.order_number}
                </DialogTitle>
                <DialogDescription className="text-ecom-muted text-xs">Szczegoly zamowienia</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-ecom-muted block text-[10px] uppercase">Data</span><span className="text-white">{showOrderDetail.date}</span></div>
                  <div><span className="text-ecom-muted block text-[10px] uppercase">Sklep</span><span style={{ color: shopColor(showOrderDetail.shop_id) }}>{shopName(showOrderDetail.shop_id)}</span></div>
                  <div><span className="text-ecom-muted block text-[10px] uppercase">Kwota</span><span className="text-white font-bold">{fmtPLN(showOrderDetail.total)}</span></div>
                  <div><span className="text-ecom-muted block text-[10px] uppercase">Status</span>
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: STATUS_COLORS[showOrderDetail.status], color: STATUS_COLORS[showOrderDetail.status] }}>{STATUS_MAP[showOrderDetail.status]}</Badge>
                  </div>
                </div>
                {showOrderDetail.customer_name && <div className="flex items-center gap-2 text-xs text-ecom-muted"><User size={12} /><span className="text-white">{showOrderDetail.customer_name}</span></div>}
                {showOrderDetail.customer_email && <div className="flex items-center gap-2 text-xs text-ecom-muted"><Mail size={12} /><span className="text-white">{showOrderDetail.customer_email}</span></div>}
                {showOrderDetail.customer_phone && <div className="flex items-center gap-2 text-xs text-ecom-muted"><Phone size={12} /><span className="text-white">{showOrderDetail.customer_phone}</span></div>}
                {showOrderDetail.shipping_address && <div className="flex items-center gap-2 text-xs text-ecom-muted"><MapPin size={12} /><span className="text-white">{showOrderDetail.shipping_address}</span></div>}
                {showOrderDetail.payment_gateway && <div className="flex items-center gap-2 text-xs text-ecom-muted"><CreditCard size={12} /><span className="text-white">{showOrderDetail.payment_gateway}</span>{showOrderDetail.transaction_id && <span className="text-ecom-muted">#{showOrderDetail.transaction_id}</span>}</div>}
                {showOrderDetail.items?.length > 0 && (
                  <div>
                    <p className="text-ecom-muted text-[10px] uppercase mb-1">Produkty</p>
                    <div className="space-y-1">
                      {showOrderDetail.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-xs bg-ecom-bg rounded p-2">
                          <span className="text-white">{it.name || it.description}</span>
                          <span className="text-ecom-muted">{it.quantity}x {fmtPLN(it.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD ORDER DIALOG */}
      <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm max-h-[80vh] overflow-y-auto" data-testid="add-order-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Dodaj zamowienie</DialogTitle>
            <DialogDescription className="text-ecom-muted text-xs">Reczne dodanie zamowienia</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 mt-1">
            <Input placeholder="Nazwa klienta" value={orderForm.customer_name} onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="order-customer-name" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Email" value={orderForm.customer_email} onChange={e => setOrderForm(f => ({ ...f, customer_email: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
              <Input placeholder="Telefon" value={orderForm.customer_phone} onChange={e => setOrderForm(f => ({ ...f, customer_phone: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            </div>
            <Input placeholder="Adres dostawy" value={orderForm.shipping_address} onChange={e => setOrderForm(f => ({ ...f, shipping_address: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <Input placeholder="Opis produktow" value={orderForm.items_desc} onChange={e => setOrderForm(f => ({ ...f, items_desc: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Kwota brutto (PLN)" value={orderForm.total} onChange={e => setOrderForm(f => ({ ...f, total: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="order-total" />
              <Input type="date" value={orderForm.date} onChange={e => setOrderForm(f => ({ ...f, date: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="order-date" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Platnosc (np. Stripe)" value={orderForm.payment_gateway} onChange={e => setOrderForm(f => ({ ...f, payment_gateway: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
              <Input placeholder="Nr transakcji" value={orderForm.transaction_id} onChange={e => setOrderForm(f => ({ ...f, transaction_id: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            </div>
            <Select value={orderForm.shop_id} onValueChange={v => setOrderForm(f => ({ ...f, shop_id: v }))}>
              <SelectTrigger className="bg-ecom-bg border-ecom-border text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-ecom-card border-ecom-border">{shops.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={addOrder} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="submit-order-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}Dodaj zamowienie
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD SALES RECORD DIALOG */}
      <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-record-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Dodaj do ewidencji</DialogTitle>
            <DialogDescription className="text-ecom-muted text-xs">Reczny wpis - VAT 23% naliczany automatycznie</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 mt-1">
            <Input type="date" value={recordForm.date} onChange={e => setRecordForm(f => ({ ...f, date: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="record-date" />
            <Input placeholder="Nazwa produktu" value={recordForm.product_name} onChange={e => setRecordForm(f => ({ ...f, product_name: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="record-product" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Ilosc" value={recordForm.quantity} onChange={e => setRecordForm(f => ({ ...f, quantity: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
              <Input type="number" placeholder="Kwota brutto (zl)" value={recordForm.brutto} onChange={e => setRecordForm(f => ({ ...f, brutto: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="record-brutto" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nr zamowienia" value={recordForm.order_number} onChange={e => setRecordForm(f => ({ ...f, order_number: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
              <Input placeholder="Platnosc" value={recordForm.payment_method} onChange={e => setRecordForm(f => ({ ...f, payment_method: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" />
            </div>
            <Select value={recordForm.shop_id} onValueChange={v => setRecordForm(f => ({ ...f, shop_id: v }))}>
              <SelectTrigger className="bg-ecom-bg border-ecom-border text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-ecom-card border-ecom-border">{shops.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}</SelectContent>
            </Select>
            {recordForm.brutto && (() => {
              const b = parseFloat(recordForm.brutto) * (parseInt(recordForm.quantity) || 1);
              const n = b / 1.23; const v = b - n;
              return (
                <div className="bg-ecom-bg rounded-lg p-2.5 text-[10px] space-y-0.5">
                  <div className="flex justify-between text-ecom-muted"><span>Brutto:</span><span className="text-white font-medium">{b.toFixed(2)} zl</span></div>
                  <div className="flex justify-between text-ecom-muted"><span>VAT 23%:</span><span className="text-ecom-warning">{v.toFixed(2)} zl</span></div>
                  <div className="flex justify-between text-ecom-muted"><span>Netto:</span><span className="text-ecom-success">{n.toFixed(2)} zl</span></div>
                </div>
              );
            })()}
            <Button onClick={addRecord} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="submit-record-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}Dodaj wpis
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
