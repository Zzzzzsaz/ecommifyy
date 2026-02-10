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
  Download, Trash2, Receipt, CheckCircle2, AlertCircle, Zap, Eye,
  Package, User, Phone, Mail, MapPin, CreditCard, Hash
} from "lucide-react";

const SHOPS = [
  { id: 1, name: "ecom1", color: "#6366f1" },
  { id: 2, name: "ecom2", color: "#10b981" },
  { id: 3, name: "ecom3", color: "#f59e0b" },
  { id: 4, name: "ecom4", color: "#ec4899" },
];
const MONTHS_PL = ["Styczen","Luty","Marzec","Kwiecien","Maj","Czerwiec","Lipiec","Sierpien","Wrzesien","Pazdziernik","Listopad","Grudzien"];
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
  const [showOrderDetail, setShowOrderDetail] = useState(null);
  const [orderForm, setOrderForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    shipping_address: "", shipping_method: "", payment_gateway: "",
    transaction_id: "", total: "", date: "", shop_id: "1", items_desc: ""
  });
  const [receiptForm, setReceiptForm] = useState({ date: "", shop_id: "1", desc: "", qty: "1", price: "" });
  const [saving, setSaving] = useState(false);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [generatingSingle, setGeneratingSingle] = useState(null);

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
      await api.createOrder({
        customer_name: orderForm.customer_name,
        customer_email: orderForm.customer_email,
        customer_phone: orderForm.customer_phone,
        shipping_address: orderForm.shipping_address,
        shipping_method: orderForm.shipping_method,
        payment_gateway: orderForm.payment_gateway,
        transaction_id: orderForm.transaction_id,
        total: parseFloat(orderForm.total),
        date: orderForm.date,
        shop_id: parseInt(orderForm.shop_id),
        items: orderForm.items_desc ? [{ name: orderForm.items_desc, quantity: 1, price: parseFloat(orderForm.total) }] : []
      });
      toast.success("Zamowienie dodane!");
      setShowAddOrder(false);
      setOrderForm({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", shipping_method: "", payment_gateway: "", transaction_id: "", total: "", date: "", shop_id: "1", items_desc: "" });
      fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const addReceipt = async () => {
    if (!receiptForm.date || !receiptForm.price) { toast.error("Wypelnij date i cene"); return; }
    setSaving(true);
    try {
      const bruttoPrice = parseFloat(receiptForm.price);
      await api.createReceipt({
        date: receiptForm.date,
        shop_id: parseInt(receiptForm.shop_id),
        items: [{ description: receiptForm.desc || "Sprzedaz", quantity: parseInt(receiptForm.qty) || 1, brutto_price: bruttoPrice }]
      });
      toast.success("Paragon wystawiony!");
      setShowAddReceipt(false);
      setReceiptForm({ date: "", shop_id: "1", desc: "", qty: "1", price: "" });
      fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const generateReceiptForOrder = async (orderId) => {
    setGeneratingSingle(orderId);
    try {
      await api.generateReceiptFromOrder(orderId);
      toast.success("Paragon wystawiony!");
      fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Blad generowania paragonu");
    } finally { setGeneratingSingle(null); }
  };

  const generateAllReceipts = async () => {
    setGeneratingBulk(true);
    try {
      const params = { year, month };
      if (shop > 0) params.shop_id = shop;
      const res = await api.generateReceiptsBulk(params);
      toast.success(res.data.message || `Wystawiono ${res.data.generated} paragonow`);
      fetchData();
    } catch { toast.error("Blad generowania"); }
    finally { setGeneratingBulk(false); }
  };

  const deleteOrder = async (id) => { await api.deleteOrder(id); fetchData(); toast.success("Usunieto"); };
  const deleteReceipt = async (id) => { await api.deleteReceipt(id); fetchData(); toast.success("Usunieto"); };

  const ordersWithoutReceipt = orders.filter(o => !o.receipt_id);
  const totalOrders = orders.reduce((s, o) => s + o.total, 0);
  const totalRecBrutto = receipts.reduce((s, r) => s + (r.total_brutto || 0), 0);
  const totalRecVat = receipts.reduce((s, r) => s + (r.vat_amount || 0), 0);
  const totalRecNetto = receipts.reduce((s, r) => s + (r.total_netto || 0), 0);

  const receiptForOrder = (orderId) => receipts.find(r => r.order_id === orderId);

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="orders-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading text-2xl font-bold text-white">ZAMOWIENIA I PARAGONY</h1>
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
        <Button size="sm" variant={tab === "receipts" ? "default" : "outline"}
          onClick={() => setTab("receipts")}
          className={tab === "receipts" ? "bg-ecom-primary" : "border-ecom-border text-ecom-muted"}
          data-testid="tab-receipts">
          <FileText size={13} className="mr-1" />Paragony
          <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1.5">{receipts.length}</Badge>
        </Button>
      </div>

      {/* Shop filter */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" data-testid="orders-shop-tabs">
        <button onClick={() => setShop(0)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${shop === 0 ? "text-white bg-ecom-primary/15 border-ecom-primary" : "text-ecom-muted border-ecom-border"}`}>WSZYSTKIE</button>
        {SHOPS.map(s => (
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
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-2 mb-4">
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
                <Card className="bg-ecom-card border-ecom-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-ecom-muted text-[9px] uppercase">Bez paragonu</p>
                    <p className={`font-bold text-lg font-heading ${ordersWithoutReceipt.length > 0 ? "text-ecom-warning" : "text-ecom-success"}`}>
                      {ordersWithoutReceipt.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex gap-1.5">
                  {ordersWithoutReceipt.length > 0 && (
                    <Button size="sm" onClick={generateAllReceipts} disabled={generatingBulk}
                      className="bg-ecom-success hover:bg-ecom-success/80 text-white" data-testid="bulk-generate-btn">
                      {generatingBulk ? <Loader2 size={14} className="animate-spin mr-1" /> : <Zap size={14} className="mr-1" />}
                      Wystaw paragony ({ordersWithoutReceipt.length})
                    </Button>
                  )}
                </div>
                <Button size="sm" onClick={() => setShowAddOrder(true)} className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-order-btn">
                  <Plus size={14} className="mr-1" />Dodaj
                </Button>
              </div>

              {/* Orders list */}
              <div className="space-y-2" data-testid="orders-list">
                {orders.map(o => {
                  const hasReceipt = !!o.receipt_id;
                  const linkedReceipt = receiptForOrder(o.id);
                  return (
                    <Card key={o.id} className="bg-ecom-card border-ecom-border border-l-[3px] hover:bg-ecom-card/80 transition-colors"
                      style={{ borderLeftColor: shopColor(o.shop_id) }}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1" onClick={() => setShowOrderDetail(o)} style={{ cursor: "pointer" }}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white text-sm font-medium truncate">{o.customer_name || o.order_number}</p>
                              <Badge variant="outline" className="text-[9px] shrink-0"
                                style={{ borderColor: STATUS_COLORS[o.status], color: STATUS_COLORS[o.status] }}>
                                {STATUS_MAP[o.status] || o.status}
                              </Badge>
                              {hasReceipt ? (
                                <Badge className="text-[9px] shrink-0 bg-ecom-success/20 text-ecom-success border-ecom-success/40" data-testid={`receipt-badge-${o.id}`}>
                                  <CheckCircle2 size={10} className="mr-0.5" />Paragon
                                </Badge>
                              ) : (
                                <Badge className="text-[9px] shrink-0 bg-ecom-warning/15 text-ecom-warning border-ecom-warning/40" data-testid={`no-receipt-badge-${o.id}`}>
                                  <AlertCircle size={10} className="mr-0.5" />Brak paragonu
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ecom-muted flex-wrap">
                              <span className="flex items-center gap-0.5"><Hash size={9} />{o.order_number}</span>
                              <span>{o.date}</span>
                              <span style={{ color: shopColor(o.shop_id) }}>{shopName(o.shop_id)}</span>
                              <span className="text-white font-semibold">{fmtPLN(o.total)}</span>
                            </div>
                            {o.items?.length > 0 && (
                              <p className="text-[10px] text-ecom-muted mt-1 truncate flex items-center gap-0.5">
                                <Package size={9} />
                                {o.items.map(it => it.name || it.description).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {!hasReceipt && (
                              <Button size="sm" variant="outline"
                                onClick={(e) => { e.stopPropagation(); generateReceiptForOrder(o.id); }}
                                disabled={generatingSingle === o.id}
                                className="text-[10px] h-7 px-2 border-ecom-success/40 text-ecom-success hover:bg-ecom-success/10"
                                data-testid={`gen-receipt-${o.id}`}>
                                {generatingSingle === o.id ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />}
                              </Button>
                            )}
                            {hasReceipt && linkedReceipt && (
                              <Button size="sm" variant="outline"
                                onClick={(e) => { e.stopPropagation(); api.downloadReceiptPdf(linkedReceipt.id); }}
                                className="text-[10px] h-7 px-2 border-ecom-primary/40 text-ecom-primary hover:bg-ecom-primary/10"
                                data-testid={`download-receipt-${o.id}`}>
                                <Download size={12} />
                              </Button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); deleteOrder(o.id); }}
                              className="text-ecom-muted hover:text-ecom-danger p-1" data-testid={`delete-order-${o.id}`}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {orders.length === 0 && (
                  <div className="text-center py-10 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg">
                    <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />
                    Brak zamowien w tym miesiacu
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Receipts summary */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <Card className="bg-ecom-card border-ecom-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-ecom-muted text-[9px] uppercase">Brutto</p>
                    <p className="text-white font-bold text-sm font-heading">{fmtPLN(totalRecBrutto)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-ecom-card border-ecom-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-ecom-muted text-[9px] uppercase">VAT 23%</p>
                    <p className="text-ecom-warning font-bold text-sm font-heading">{fmtPLN(totalRecVat)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-ecom-card border-ecom-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-ecom-muted text-[9px] uppercase">Netto</p>
                    <p className="text-ecom-success font-bold text-sm font-heading">{fmtPLN(totalRecNetto)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Receipts actions */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-ecom-muted text-xs">{receipts.length} paragonow</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => api.downloadSummaryPdf(year, month, shop > 0 ? shop : null)}
                    className="border-ecom-border text-ecom-muted hover:text-white" data-testid="download-summary">
                    <Download size={12} className="mr-1" />Zestawienie PDF
                  </Button>
                  <Button size="sm" onClick={() => setShowAddReceipt(true)}
                    className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-receipt-btn">
                    <Plus size={14} className="mr-1" />Wystaw
                  </Button>
                </div>
              </div>

              {/* Receipts list */}
              <div className="space-y-2" data-testid="receipts-list">
                {receipts.map(r => (
                  <Card key={r.id} className="bg-ecom-card border-ecom-border hover:bg-ecom-card/80 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white text-sm font-medium">{r.receipt_number}</p>
                            {r.order_id && (
                              <Badge variant="outline" className="text-[9px] border-ecom-primary/40 text-ecom-primary">
                                <ShoppingCart size={9} className="mr-0.5" />{r.order_number || "Zamowienie"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ecom-muted flex-wrap">
                            <span>{r.date}</span>
                            <span style={{ color: shopColor(r.shop_id) }}>{shopName(r.shop_id)}</span>
                            {r.customer_name && <span className="flex items-center gap-0.5"><User size={9} />{r.customer_name}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px]">
                            <span className="text-white font-semibold">Brutto: {fmtPLN(r.total_brutto)}</span>
                            <span className="text-ecom-warning">VAT: {fmtPLN(r.vat_amount)}</span>
                            <span className="text-ecom-muted">Netto: {fmtPLN(r.total_netto)}</span>
                          </div>
                          {r.items?.length > 0 && (
                            <p className="text-[10px] text-ecom-muted mt-1 truncate">
                              {r.items.map(it => it.description).join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => api.downloadReceiptPdf(r.id)}
                            className="text-ecom-muted hover:text-ecom-primary p-1" data-testid={`download-receipt-pdf-${r.id}`}>
                            <Download size={14} />
                          </button>
                          <button onClick={() => deleteReceipt(r.id)}
                            className="text-ecom-muted hover:text-ecom-danger p-1" data-testid={`delete-receipt-${r.id}`}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {receipts.length === 0 && (
                  <div className="text-center py-10 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg">
                    <FileText size={28} className="mx-auto mb-2 opacity-30" />
                    Brak paragonow w tym miesiacu
                  </div>
                )}
              </div>
            </>
          )}

          {/* Export */}
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
                  <div>
                    <span className="text-ecom-muted block text-[10px] uppercase">Data</span>
                    <span className="text-white">{showOrderDetail.date}</span>
                  </div>
                  <div>
                    <span className="text-ecom-muted block text-[10px] uppercase">Sklep</span>
                    <span style={{ color: shopColor(showOrderDetail.shop_id) }}>{shopName(showOrderDetail.shop_id)}</span>
                  </div>
                  <div>
                    <span className="text-ecom-muted block text-[10px] uppercase">Kwota</span>
                    <span className="text-white font-bold">{fmtPLN(showOrderDetail.total)}</span>
                  </div>
                  <div>
                    <span className="text-ecom-muted block text-[10px] uppercase">Status</span>
                    <Badge variant="outline" className="text-[10px]"
                      style={{ borderColor: STATUS_COLORS[showOrderDetail.status], color: STATUS_COLORS[showOrderDetail.status] }}>
                      {STATUS_MAP[showOrderDetail.status]}
                    </Badge>
                  </div>
                </div>
                {showOrderDetail.customer_name && (
                  <div className="flex items-center gap-2 text-xs text-ecom-muted">
                    <User size={12} /><span className="text-white">{showOrderDetail.customer_name}</span>
                  </div>
                )}
                {showOrderDetail.customer_email && (
                  <div className="flex items-center gap-2 text-xs text-ecom-muted">
                    <Mail size={12} /><span className="text-white">{showOrderDetail.customer_email}</span>
                  </div>
                )}
                {showOrderDetail.customer_phone && (
                  <div className="flex items-center gap-2 text-xs text-ecom-muted">
                    <Phone size={12} /><span className="text-white">{showOrderDetail.customer_phone}</span>
                  </div>
                )}
                {showOrderDetail.shipping_address && (
                  <div className="flex items-center gap-2 text-xs text-ecom-muted">
                    <MapPin size={12} /><span className="text-white">{showOrderDetail.shipping_address}</span>
                  </div>
                )}
                {showOrderDetail.payment_gateway && (
                  <div className="flex items-center gap-2 text-xs text-ecom-muted">
                    <CreditCard size={12} /><span className="text-white">{showOrderDetail.payment_gateway}</span>
                    {showOrderDetail.transaction_id && <span className="text-ecom-muted">#{showOrderDetail.transaction_id}</span>}
                  </div>
                )}
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
                <div className="border-t border-ecom-border pt-3">
                  {showOrderDetail.receipt_id ? (
                    <div className="flex items-center justify-between">
                      <Badge className="bg-ecom-success/20 text-ecom-success border-ecom-success/40">
                        <CheckCircle2 size={12} className="mr-1" />Paragon wystawiony
                      </Badge>
                      <Button size="sm" variant="outline"
                        onClick={() => { const lr = receiptForOrder(showOrderDetail.id); if (lr) api.downloadReceiptPdf(lr.id); }}
                        className="border-ecom-primary/40 text-ecom-primary text-xs">
                        <Download size={12} className="mr-1" />Pobierz PDF
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => { generateReceiptForOrder(showOrderDetail.id); setShowOrderDetail(null); }}
                      className="w-full bg-ecom-success hover:bg-ecom-success/80">
                      <Receipt size={14} className="mr-1" />Wystaw paragon
                    </Button>
                  )}
                </div>
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
              <SelectContent className="bg-ecom-card border-ecom-border">
                {SHOPS.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={addOrder} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="submit-order-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}Dodaj zamowienie
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD RECEIPT DIALOG */}
      <Dialog open={showAddReceipt} onOpenChange={setShowAddReceipt}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-receipt-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Wystaw paragon</DialogTitle>
            <DialogDescription className="text-ecom-muted text-xs">Cena brutto - VAT 23% naliczany automatycznie</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <Input type="date" value={receiptForm.date} onChange={e => setReceiptForm(f => ({ ...f, date: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="receipt-date" />
            <Select value={receiptForm.shop_id} onValueChange={v => setReceiptForm(f => ({ ...f, shop_id: v }))}>
              <SelectTrigger className="bg-ecom-bg border-ecom-border text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-ecom-card border-ecom-border">
                {SHOPS.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Opis (np. Koszulka XL)" value={receiptForm.desc} onChange={e => setReceiptForm(f => ({ ...f, desc: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="receipt-desc" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Ilosc" value={receiptForm.qty} onChange={e => setReceiptForm(f => ({ ...f, qty: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="receipt-qty" />
              <Input type="number" placeholder="Cena brutto (zl)" value={receiptForm.price} onChange={e => setReceiptForm(f => ({ ...f, price: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="receipt-price" />
            </div>
            {receiptForm.price && (() => {
              const brutto = parseFloat(receiptForm.price) * parseInt(receiptForm.qty || 1);
              const vat = brutto - brutto / 1.23;
              const netto = brutto / 1.23;
              return (
                <div className="bg-ecom-bg rounded-lg p-2.5 text-[10px] space-y-0.5">
                  <div className="flex justify-between text-ecom-muted"><span>Brutto:</span><span className="text-white font-medium">{brutto.toFixed(2)} zl</span></div>
                  <div className="flex justify-between text-ecom-muted"><span>VAT 23%:</span><span className="text-ecom-warning">{vat.toFixed(2)} zl</span></div>
                  <div className="flex justify-between text-ecom-muted"><span>Netto:</span><span className="text-ecom-success">{netto.toFixed(2)} zl</span></div>
                </div>
              );
            })()}
            <Button onClick={addReceipt} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="submit-receipt-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}Wystaw paragon
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
