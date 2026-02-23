import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target,
  Plus, Check, Trash2, Edit2, Package, Calendar, ChevronRight,
  BarChart3, AlertCircle
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
    api.getReminders().then(r => setReminders(r.data)).catch(() => {});
    api.getWeeklyStats().then(r => setWeekly(r.data)).catch(() => {});
    api.getProducts().then(r => setProducts(r.data)).catch(() => {});
  }, []);

  const addReminder = async () => {
    if (!remForm.title || !remForm.date) { toast.error("Wypełnij wszystkie pola"); return; }
    await api.createReminder({ ...remForm, created_by: user.name });
    const r = await api.getReminders();
    setReminders(r.data);
    setShowAddReminder(false);
    setRemForm({ title: "", date: "" });
    toast.success("Przypomnienie dodane");
  };

  const toggleReminder = async (id, done) => {
    await api.updateReminder(id, { done: !done });
    const r = await api.getReminders();
    setReminders(r.data);
  };

  const deleteReminder = async (id) => {
    await api.deleteReminder(id);
    setReminders(p => p.filter(r => r.id !== id));
  };

  const saveProduct = async () => {
    if (!productForm.name) { toast.error("Podaj nazwę produktu"); return; }
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, productForm);
        toast.success("Produkt zaktualizowany");
      } else {
        await api.createProduct(productForm);
        toast.success("Produkt dodany");
      }
      const r = await api.getProducts();
      setProducts(r.data);
      setShowAddProduct(false);
      setEditingProduct(null);
      setProductForm({ name: "", sku: "", price: 0, extra_payment: 0, shop_id: shops[0]?.id || 1, category: "" });
    } catch { toast.error("Błąd zapisu"); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Usunąć produkt?")) return;
    await api.deleteProduct(id);
    const r = await api.getProducts();
    setProducts(r.data);
    toast.success("Produkt usunięty");
  };

  const TARGET = appSettings.target_revenue || 250000;
  const progress = stats ? Math.min((stats.total_income / TARGET) * 100, 100) : 0;
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const td = stats?.days?.find(d => d.date === todayStr);
  const upcomingReminders = reminders.filter(r => !r.done && r.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const overdueReminders = reminders.filter(r => !r.done && r.date < todayStr);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Witaj, {user.name}</h1>
        <p className="text-slate-500 mt-1">Panel zarządzania Twoim e-commerce</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card" data-testid="kpi-income">
          <div className="flex items-center justify-between mb-3">
            <span className="kpi-label">Przychód miesięczny</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <DollarSign size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="kpi-value">{fmtPLN(stats?.total_income)} zł</p>
          {weekly && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${weekly.income_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {weekly.income_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(weekly.income_change)}% vs poprzedni tydzień
            </p>
          )}
        </div>

        <div className="kpi-card" data-testid="kpi-profit">
          <div className="flex items-center justify-between mb-3">
            <span className="kpi-label">Zysk</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
          </div>
          <p className={`kpi-value ${(stats?.total_profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {fmtPLN(stats?.total_profit)} zł
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Na osobę: {fmtPLN(stats?.profit_per_person)} zł
          </p>
        </div>

        <div className="kpi-card" data-testid="kpi-orders">
          <div className="flex items-center justify-between mb-3">
            <span className="kpi-label">Koszty reklam</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <ShoppingCart size={16} className="text-orange-600" />
            </div>
          </div>
          <p className="kpi-value text-orange-600">{fmtPLN(stats?.total_ads)} zł</p>
          <p className="text-xs text-slate-500 mt-2">
            ROI: {stats?.roi || 0}%
          </p>
        </div>

        <div className="kpi-card" data-testid="kpi-target">
          <div className="flex items-center justify-between mb-3">
            <span className="kpi-label">Cel miesięczny</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Target size={16} className="text-violet-600" />
            </div>
          </div>
          <p className="kpi-value">{progress.toFixed(0)}%</p>
          <div className="progress-bar mt-3">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today Card */}
          <div className="pro-card p-6" data-testid="today-stats">
            <h2 className="font-semibold text-slate-900 mb-4">Dzisiaj</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Przychód</p>
                <p className="text-lg font-semibold text-slate-900">{fmtPLN(td?.income)} zł</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Koszty</p>
                <p className="text-lg font-semibold text-orange-600">{fmtPLN(td?.ads_total)} zł</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Zysk</p>
                <p className={`text-lg font-semibold ${(td?.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {fmtPLN(td?.profit)} zł
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Na osobę</p>
                <p className="text-lg font-semibold text-slate-900">{fmtPLN(td?.profit_pp)} zł</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pro-card p-6" data-testid="quick-actions">
            <h2 className="font-semibold text-slate-900 mb-4">Szybkie akcje</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: "wyniki", label: "Wyniki", icon: BarChart3, color: "bg-blue-50 text-blue-600" },
                { id: "orders", label: "Zamówienia", icon: ShoppingCart, color: "bg-emerald-50 text-emerald-600" },
                { id: "tasks", label: "Zadania", icon: Check, color: "bg-violet-50 text-violet-600" },
                { id: "calendar", label: "Kalendarz", icon: Calendar, color: "bg-orange-50 text-orange-600" },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                  data-testid={`quick-action-${item.id}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <span className="font-medium text-slate-700 text-sm">{item.label}</span>
                  <ChevronRight size={16} className="text-slate-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="pro-card p-6" data-testid="products-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Produkty ({products.length})</h2>
              <Button
                size="sm"
                onClick={() => { setEditingProduct(null); setProductForm({ name: "", sku: "", price: 0, extra_payment: 0, shop_id: shops[0]?.id || 1, category: "" }); setShowAddProduct(true); }}
                className="btn-primary h-8 text-xs"
                data-testid="add-product-btn"
              >
                <Plus size={14} className="mr-1" /> Dodaj
              </Button>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Brak produktów. Dodaj pierwszy!</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {products.slice(0, 5).map(p => {
                  const shop = shops.find(s => s.id === p.shop_id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 group" data-testid={`product-${p.id}`}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shop?.color || "#64748b" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-500">{fmtPLN(p.price)} zł</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-600">+{fmtPLN(p.extra_payment)} zł</p>
                        <p className="text-[10px] text-slate-400">dopłata</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setProductForm({ name: p.name, sku: p.sku || "", price: p.price || 0, extra_payment: p.extra_payment || 0, shop_id: p.shop_id, category: p.category || "" }); setEditingProduct(p); setShowAddProduct(true); }} className="p-1 text-slate-400 hover:text-slate-600">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1 text-slate-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {products.length > 5 && (
                  <p className="text-xs text-slate-500 text-center py-2">+{products.length - 5} więcej produktów</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Reminders */}
        <div className="space-y-6">
          {/* Reminders */}
          <div className="pro-card p-6" data-testid="reminders-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Przypomnienia</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddReminder(true)}
                className="h-8 w-8 p-0"
                data-testid="add-reminder-btn"
              >
                <Plus size={16} />
              </Button>
            </div>

            {/* Overdue */}
            {overdueReminders.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                  <AlertCircle size={12} /> Zaległe ({overdueReminders.length})
                </p>
                {overdueReminders.map(r => (
                  <div key={r.id} className="flex items-center gap-2 py-2 px-3 mb-1 rounded-lg bg-red-50 border border-red-100">
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

            {/* Upcoming */}
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
                    <span className="text-xs text-slate-400">
                      {r.date === todayStr ? "Dzisiaj" : r.date.slice(5)}
                    </span>
                    <button onClick={() => deleteReminder(r.id)} className="text-slate-300 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">Brak przypomnień</p>
            )}
          </div>

          {/* Weekly Summary */}
          {weekly && (
            <div className="pro-card p-6" data-testid="weekly-summary">
              <h2 className="font-semibold text-slate-900 mb-4">Podsumowanie tygodnia</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Przychód</span>
                  <span className="font-semibold text-slate-900">{fmtPLN(weekly.current.income)} zł</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Zysk</span>
                  <span className={`font-semibold ${weekly.current.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmtPLN(weekly.current.profit)} zł
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Zmiana</span>
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
          <DialogHeader>
            <DialogTitle>Nowe przypomnienie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              placeholder="Tytuł przypomnienia"
              value={remForm.title}
              onChange={e => setRemForm(f => ({ ...f, title: e.target.value }))}
              data-testid="reminder-title-input"
            />
            <Input
              type="date"
              value={remForm.date}
              onChange={e => setRemForm(f => ({ ...f, date: e.target.value }))}
              data-testid="reminder-date-input"
            />
            <Button onClick={addReminder} className="w-full btn-primary" data-testid="save-reminder-btn">
              Dodaj przypomnienie
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={v => { setShowAddProduct(v); if (!v) setEditingProduct(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edytuj produkt" : "Nowy produkt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nazwa produktu *</label>
              <Input
                placeholder="np. Bluza Premium"
                value={productForm.name}
                onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                data-testid="product-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">SKU</label>
                <Input
                  placeholder="ABC-123"
                  value={productForm.sku}
                  onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Cena (zł)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={e => setProductForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-blue-600 font-medium mb-1 block">Dopłata (zł) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.extra_payment}
                  onChange={e => setProductForm(f => ({ ...f, extra_payment: parseFloat(e.target.value) || 0 }))}
                  className="border-blue-200 focus:border-blue-400"
                  data-testid="product-extra-input"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Sklep</label>
                <Select value={String(productForm.shop_id)} onValueChange={v => setProductForm(f => ({ ...f, shop_id: parseInt(v) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={saveProduct} className="w-full btn-primary" data-testid="save-product-btn">
              {editingProduct ? "Zapisz zmiany" : "Dodaj produkt"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
