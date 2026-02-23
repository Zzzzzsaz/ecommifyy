import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, Target, Plus, Check, 
  Trash2, Edit2, Package, Calendar, ChevronRight, BarChart3, 
  AlertCircle, ShoppingCart, Wallet
} from "lucide-react";

const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard({ user, shops = [], appSettings = {}, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [products, setProducts] = useState([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [remForm, setRemForm] = useState({ title: "", date: "" });
  const [productForm, setProductForm] = useState({ name: "", sku: "", price: 0, extra_payment: 0, shop_id: 1, category: "" });

  useEffect(() => {
    const now = new Date();
    api.getCombinedStats({ year: now.getFullYear(), month: now.getMonth() + 1 }).then(r => setStats(r.data)).catch(() => {});
    api.getReminders().then(r => setReminders(r.data || [])).catch(() => {});
    api.getWeeklyStats().then(r => setWeekly(r.data)).catch(() => {});
    api.getProducts().then(r => setProducts(r.data || [])).catch(() => {});
  }, []);

  const addReminder = async () => {
    if (!remForm.title || !remForm.date) { toast.error("Wypełnij pola"); return; }
    await api.createReminder({ ...remForm, created_by: user.name });
    const r = await api.getReminders();
    setReminders(r.data || []);
    setShowAddReminder(false);
    setRemForm({ title: "", date: "" });
    toast.success("Dodano");
  };

  const toggleReminder = async (id, done) => {
    await api.updateReminder(id, { done: !done });
    const r = await api.getReminders();
    setReminders(r.data || []);
  };

  const deleteReminder = async (id) => {
    await api.deleteReminder(id);
    setReminders(p => p.filter(r => r.id !== id));
  };

  const saveProduct = async () => {
    if (!productForm.name) { toast.error("Podaj nazwę"); return; }
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, productForm);
      } else {
        await api.createProduct(productForm);
      }
      const r = await api.getProducts();
      setProducts(r.data || []);
      setShowAddProduct(false);
      setEditingProduct(null);
      setProductForm({ name: "", sku: "", price: 0, extra_payment: 0, shop_id: shops[0]?.id || 1, category: "" });
      toast.success(editingProduct ? "Zaktualizowano" : "Dodano");
    } catch { toast.error("Błąd"); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Usunąć?")) return;
    await api.deleteProduct(id);
    const r = await api.getProducts();
    setProducts(r.data || []);
    toast.success("Usunięto");
  };

  const TARGET = appSettings.target_revenue || 250000;
  const progress = stats ? Math.min((stats.total_income / TARGET) * 100, 100) : 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const td = stats?.days?.find(d => d.date === todayStr);
  const upcomingReminders = (reminders || []).filter(r => !r.done && r.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const overdueReminders = (reminders || []).filter(r => !r.done && r.date < todayStr);

  return (
    <div className="page-container" data-testid="dashboard-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Witaj, {user.name}</h1>
        <p className="text-slate-500 text-sm">Twój panel zarządzania e-commerce</p>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Przychód</span>
            <DollarSign size={16} className="text-blue-500" />
          </div>
          <p className="kpi-value tabular-nums">{fmtPLN(stats?.total_income)} zł</p>
          {weekly && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${weekly.income_change >= 0 ? 'text-success' : 'text-danger'}`}>
              {weekly.income_change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(weekly.income_change)}%
            </p>
          )}
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Zysk</span>
            <Wallet size={16} className="text-emerald-500" />
          </div>
          <p className={`kpi-value tabular-nums ${(stats?.total_profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {fmtPLN(stats?.total_profit)} zł
          </p>
          <p className="text-xs text-slate-400 mt-1">Na os: {fmtPLN(stats?.profit_per_person)} zł</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Reklamy</span>
            <ShoppingCart size={16} className="text-orange-500" />
          </div>
          <p className="kpi-value tabular-nums text-orange-600">{fmtPLN(stats?.total_ads)} zł</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="kpi-label">Cel</span>
            <Target size={16} className="text-violet-500" />
          </div>
          <p className="kpi-value tabular-nums">{progress.toFixed(0)}%</p>
          <div className="w-full h-1.5 bg-slate-100 rounded mt-2">
            <div className="h-full bg-violet-500 rounded transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Today */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">Dzisiaj</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Przychód</p>
                <p className="font-semibold tabular-nums">{fmtPLN(td?.income)} zł</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600 mb-1">Koszty</p>
                <p className="font-semibold text-orange-600 tabular-nums">{fmtPLN(td?.ads_total)} zł</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-600 mb-1">Zysk</p>
                <p className={`font-semibold tabular-nums ${(td?.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {fmtPLN(td?.profit)} zł
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Na osobę</p>
                <p className="font-semibold text-blue-600 tabular-nums">{fmtPLN(td?.profit_pp)} zł</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">Szybkie akcje</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "wyniki", label: "Wyniki", icon: BarChart3, color: "text-blue-500 bg-blue-50" },
                { id: "orders", label: "Zamówienia", icon: ShoppingCart, color: "text-emerald-500 bg-emerald-50" },
                { id: "tasks", label: "Zadania", icon: Check, color: "text-violet-500 bg-violet-50" },
                { id: "calendar", label: "Kalendarz", icon: Calendar, color: "text-orange-500 bg-orange-50" },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Produkty ({products.length})</h3>
              <Button
                size="sm"
                onClick={() => { setEditingProduct(null); setProductForm({ name: "", sku: "", price: 0, extra_payment: 0, shop_id: shops[0]?.id || 1, category: "" }); setShowAddProduct(true); }}
                className="h-8 text-xs bg-slate-900 hover:bg-slate-800"
              >
                <Plus size={14} className="mr-1" /> Dodaj
              </Button>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Brak produktów</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {products.slice(0, 5).map(p => {
                  const shop = shops.find(s => s.id === p.shop_id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg group">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: shop?.color || "#64748b" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400">{fmtPLN(p.price)} zł</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-blue-600">+{fmtPLN(p.extra_payment)} zł</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setProductForm({ name: p.name, sku: p.sku || "", price: p.price || 0, extra_payment: p.extra_payment || 0, shop_id: p.shop_id, category: p.category || "" }); setEditingProduct(p); setShowAddProduct(true); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Reminders */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Przypomnienia</h3>
              <button onClick={() => setShowAddReminder(true)} className="btn-icon w-8 h-8">
                <Plus size={16} />
              </button>
            </div>

            {overdueReminders.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                  <AlertCircle size={12} /> Zaległe
                </p>
                {overdueReminders.map(r => (
                  <div key={r.id} className="flex items-center gap-2 py-2 px-3 mb-1 rounded-lg bg-red-50">
                    <button onClick={() => toggleReminder(r.id, r.done)} className="w-4 h-4 rounded border border-red-300 shrink-0" />
                    <span className="text-sm text-red-700 flex-1 truncate">{r.title}</span>
                    <span className="text-xs text-red-500">{r.date.slice(5)}</span>
                    <button onClick={() => deleteReminder(r.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {upcomingReminders.length > 0 ? (
              <div className="space-y-1">
                {upcomingReminders.map(r => (
                  <div key={r.id} className="flex items-center gap-2 py-2">
                    <button
                      onClick={() => toggleReminder(r.id, r.done)}
                      className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${r.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}
                    >
                      {r.done && <Check size={10} className="text-white" />}
                    </button>
                    <span className={`text-sm flex-1 truncate ${r.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {r.title}
                    </span>
                    <span className="text-xs text-slate-400">{r.date === todayStr ? "Dziś" : r.date.slice(5)}</span>
                    <button onClick={() => deleteReminder(r.id)} className="text-slate-300 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Brak</p>
            )}
          </div>

          {/* Weekly */}
          {weekly && (
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-4">Ten tydzień</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Przychód</span>
                  <span className="font-semibold tabular-nums">{fmtPLN(weekly.current?.income)} zł</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Zysk</span>
                  <span className={`font-semibold tabular-nums ${(weekly.current?.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmtPLN(weekly.current?.profit)} zł
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Zmiana</span>
                  <span className={`flex items-center gap-1 font-medium ${weekly.profit_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {weekly.profit_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(weekly.profit_change)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Reminder Dialog */}
      <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle>Nowe przypomnienie</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Tytuł" value={remForm.title} onChange={e => setRemForm(f => ({ ...f, title: e.target.value }))} />
            <Input type="date" value={remForm.date} onChange={e => setRemForm(f => ({ ...f, date: e.target.value }))} />
            <Button onClick={addReminder} className="w-full bg-slate-900 hover:bg-slate-800">Dodaj</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={v => { setShowAddProduct(v); if (!v) setEditingProduct(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>{editingProduct ? "Edytuj produkt" : "Nowy produkt"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nazwa" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="SKU" value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} />
              <Input type="number" placeholder="Cena" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-blue-600 font-medium mb-1 block">Dopłata (zł)</label>
                <Input type="number" value={productForm.extra_payment} onChange={e => setProductForm(f => ({ ...f, extra_payment: parseFloat(e.target.value) || 0 }))} className="border-blue-200" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Sklep</label>
                <Select value={String(productForm.shop_id)} onValueChange={v => setProductForm(f => ({ ...f, shop_id: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {shops.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={saveProduct} className="w-full bg-slate-900 hover:bg-slate-800">
              {editingProduct ? "Zapisz" : "Dodaj"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
