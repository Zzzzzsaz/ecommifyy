import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Download, Settings2 } from "lucide-react";

const MONTHS_PL = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
const DAYS_PL = ["Nd", "Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const fmt = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const CATEGORIES = [
  { id: "tiktok", name: "TikTok", color: "#00d4aa", short: "TT" },
  { id: "meta", name: "Meta", color: "#0088ff", short: "M" },
  { id: "google", name: "Google", color: "#ffaa00", short: "G" },
  { id: "zwroty", name: "Zwroty", color: "#ff6600", short: "Zw" },
];

export default function Wyniki({ user, shops = [], appSettings = {} }) {
  const now = new Date();
  const [shop, setShop] = useState(0);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customColumns, setCustomColumns] = useState([]);
  
  // Dialogs
  const [addDialog, setAddDialog] = useState({ open: false, type: null, category: null, date: null, shopId: 1 });
  const [editDialog, setEditDialog] = useState({ open: false, date: null, shopId: null });
  const [columnDialog, setColumnDialog] = useState(false);
  
  // Form
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Edit dialog data
  const [editData, setEditData] = useState({ incomes: [], costs: [] });
  const [editLoading, setEditLoading] = useState(false);
  
  // Column form
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("expense");
  const [newColColor, setNewColColor] = useState("#8b5cf6");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = shop === 0
        ? await api.getCombinedStats({ year, month })
        : await api.getMonthlyStats({ shop_id: shop, year, month });
      setStats(r.data);
      if (r.data.custom_columns) setCustomColumns(r.data.custom_columns);
    } catch { toast.error("Blad"); }
    finally { setLoading(false); }
  }, [shop, year, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Open add dialog
  const openAdd = (type, category, date, shopId) => {
    setAddDialog({ open: true, type, category, date, shopId: shopId || (shop > 0 ? shop : 1) });
    setAmount("");
    setDesc("");
  };

  // Save
  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Podaj kwote"); return; }
    setSaving(true);
    try {
      if (addDialog.type === "income") {
        await api.createIncome({ amount: val, date: addDialog.date, description: desc || "", shop_id: addDialog.shopId });
      } else {
        await api.createCost({ date: addDialog.date, shop_id: addDialog.shopId, category: addDialog.category, amount: val, description: desc || "" });
      }
      toast.success("Dodano!");
      setAddDialog({ open: false, type: null, category: null, date: null, shopId: 1 });
      fetchStats();
    } catch { toast.error("Blad"); }
    finally { setSaving(false); }
  };

  // Open edit dialog
  const openEdit = async (date, shopId) => {
    setEditDialog({ open: true, date, shopId });
    setEditLoading(true);
    try {
      const [inc, costs] = await Promise.all([
        api.getIncomes({ shop_id: shopId, date }),
        api.getCosts({ shop_id: shopId, date })
      ]);
      setEditData({ incomes: inc.data, costs: costs.data });
    } catch { toast.error("Blad"); }
    finally { setEditLoading(false); }
  };

  const refreshEdit = async () => {
    if (!editDialog.date || !editDialog.shopId) return;
    try {
      const [inc, costs] = await Promise.all([
        api.getIncomes({ shop_id: editDialog.shopId, date: editDialog.date }),
        api.getCosts({ shop_id: editDialog.shopId, date: editDialog.date })
      ]);
      setEditData({ incomes: inc.data, costs: costs.data });
    } catch {}
  };

  const deleteIncome = async (id) => {
    if (!window.confirm("Usunac?")) return;
    try {
      await api.deleteIncome(id);
      toast.success("Usunieto");
      refreshEdit();
      fetchStats();
    } catch { toast.error("Blad"); }
  };

  const deleteCost = async (id) => {
    if (!window.confirm("Usunac?")) return;
    try {
      await api.deleteCost(id);
      toast.success("Usunieto");
      refreshEdit();
      fetchStats();
    } catch { toast.error("Blad"); }
  };

  // Columns
  const addColumn = async () => {
    if (!newColName.trim()) return;
    try {
      await api.createCustomColumn({ name: newColName, column_type: newColType, color: newColColor });
      toast.success("Dodano");
      setNewColName("");
      fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || "Blad"); }
  };

  const deleteColumn = async (id, name) => {
    if (!window.confirm(`Usunac "${name}"?`)) return;
    try {
      await api.deleteCustomColumn(id);
      toast.success("Usunieto");
      fetchStats();
    } catch { toast.error("Blad"); }
  };

  const getDayName = (d) => DAYS_PL[new Date(d + "T12:00:00").getDay()];
  const getDayNum = (d) => parseInt(d.split("-")[2], 10);
  const isAll = shop === 0;
  const shopName = (id) => shops.find(s => s.id === id)?.name || `Sklep ${id}`;
  const shopColor = (id) => shops.find(s => s.id === id)?.color || "#6366f1";
  const getCatColor = (cat) => CATEGORIES.find(c => c.id === cat)?.color || customColumns.find(c => c.name === cat)?.color || "#888";
  const getCatName = (cat) => CATEGORIES.find(c => c.id === cat)?.name || cat;

  const allCategories = [...CATEGORIES, ...customColumns.filter(c => c.column_type === "expense").map(c => ({ id: c.name, name: c.name, color: c.color, short: c.name.slice(0,2) }))];

  return (
    <div className="min-h-screen bg-slate-950 p-2 sm:p-3 pb-28" data-testid="wyniki-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-base sm:text-lg font-bold text-white">Wyniki</h1>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setColumnDialog(true)} className="text-slate-400 h-7 sm:h-8 px-2">
            <Settings2 size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => api.downloadExcel(year, month, shop > 0 ? shop : null)} className="text-slate-400 h-7 sm:h-8 px-2">
            <Download size={14} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
        <button onClick={() => setShop(0)}
          className={`px-2 sm:px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${shop === 0 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>
          Wszystkie
        </button>
        {shops.map(s => (
          <button key={s.id} onClick={() => setShop(s.id)}
            className={`px-2 sm:px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${shop === s.id ? "text-white" : "bg-slate-800 text-slate-400"}`}
            style={shop === s.id ? { backgroundColor: s.color } : {}}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Month */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <Button size="sm" variant="ghost" onClick={prevMonth} className="text-slate-400 h-7 w-7 p-0"><ChevronLeft size={16} /></Button>
        <span className="text-sm font-semibold text-white min-w-[120px] text-center">{MONTHS_PL[month - 1]} {year}</span>
        <Button size="sm" variant="ghost" onClick={nextMonth} className="text-slate-400 h-7 w-7 p-0"><ChevronRight size={16} /></Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
      ) : stats && (
        <>
          {/* KPIs - Compact for mobile */}
          <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-2">
            <div className="bg-slate-900 rounded-lg p-1.5 sm:p-2 border border-slate-800">
              <p className="text-[9px] sm:text-[10px] text-slate-500">Przychod</p>
              <p className="text-xs sm:text-sm font-bold text-white">{fmt(stats.total_income)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-1.5 sm:p-2 border border-slate-800">
              <p className="text-[9px] sm:text-[10px] text-slate-500">Koszty</p>
              <p className="text-xs sm:text-sm font-bold text-red-400">{fmt(stats.total_ads)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-1.5 sm:p-2 border border-slate-800">
              <p className="text-[9px] sm:text-[10px] text-slate-500">Zysk</p>
              <p className={`text-xs sm:text-sm font-bold ${stats.total_profit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(stats.total_profit)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-1.5 sm:p-2 border border-slate-800">
              <p className="text-[9px] sm:text-[10px] text-slate-500">Na leb</p>
              <p className="text-xs sm:text-sm font-bold text-indigo-400">{fmt(stats.profit_per_person)}</p>
            </div>
          </div>

          {/* Excel-like Table - responsive */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            {/* Table Header */}
            <div className="bg-slate-800 px-2 py-1.5 grid gap-1 text-[9px] sm:text-[10px] font-medium text-slate-400"
              style={{ gridTemplateColumns: "40px 1fr 1fr 60px" }}>
              <div>Dzien</div>
              <div>Przychod</div>
              <div>Koszty</div>
              <div className="text-center">Akcje</div>
            </div>

            {/* Days - ALL DAYS - Excel style rows */}
            <div className="max-h-[55vh] overflow-y-auto">
              {stats.days?.map((day, idx) => {
                const profit = day.profit || 0;
                const currentShopId = shop > 0 ? shop : 1;

                return (
                  <div key={day.date} 
                    className={`grid gap-1 px-2 py-1.5 text-xs items-center border-b border-slate-800/50 ${idx % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"}`}
                    style={{ gridTemplateColumns: "40px 1fr 1fr 60px" }}
                    data-testid={`day-${day.date}`}>
                    
                    {/* Date - compact */}
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-bold text-white text-sm">{getDayNum(day.date)}</span>
                      <span className="text-slate-500 text-[8px]">{getDayName(day.date)}</span>
                    </div>

                    {/* Income with inline add button */}
                    <div className="flex items-center gap-1">
                      <span className={`font-medium ${day.income > 0 ? "text-green-400" : "text-slate-600"}`}>
                        {day.income > 0 ? fmt(day.income) : "0"} zl
                      </span>
                      <button onClick={() => openAdd("income", null, day.date, currentShopId)}
                        className="w-5 h-5 rounded bg-green-600/20 hover:bg-green-600/40 text-green-400 flex items-center justify-center"
                        data-testid={`add-income-${day.date}`}
                        title="Dodaj przychod">
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Costs summary with inline add button */}
                    <div className="flex items-center gap-1">
                      <span className={`font-medium ${day.ads_total > 0 ? "text-red-400" : "text-slate-600"}`}>
                        {day.ads_total > 0 ? `-${fmt(day.ads_total)}` : "0"} zl
                      </span>
                      <button onClick={() => openAdd("cost", "tiktok", day.date, currentShopId)}
                        className="w-5 h-5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 flex items-center justify-center"
                        data-testid={`add-cost-${day.date}`}
                        title="Dodaj koszt">
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Actions - expand for details */}
                    <div className="flex justify-center">
                      <button onClick={() => openEdit(day.date, currentShopId)}
                        className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px]"
                        data-testid={`edit-${day.date}`}>
                        Szczegoly
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick legend under table */}
          <div className="flex flex-wrap gap-1 mt-2 text-[9px] text-slate-500">
            <span>Kategorie kosztow:</span>
            {allCategories.map(c => (
              <span key={c.id} className="px-1 rounded" style={{ backgroundColor: c.color + "20", color: c.color }}>
                {c.name}
              </span>
            ))}
          </div>
        </>
      )}

      {/* ADD DIALOG */}
      <Dialog open={addDialog.open} onOpenChange={o => setAddDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-white text-base">
              {addDialog.type === "income" ? "Dodaj przychod" : `Dodaj ${getCatName(addDialog.category)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">{addDialog.date} - {shopName(addDialog.shopId)}</p>
            
            {addDialog.type === "cost" && (
              <Select value={addDialog.category} onValueChange={v => setAddDialog(d => ({ ...d, category: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {allCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span style={{ color: c.color }}>{c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isAll && (
              <Select value={String(addDialog.shopId)} onValueChange={v => setAddDialog(d => ({ ...d, shopId: parseInt(v) }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {shops.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Input type="number" placeholder="Kwota" value={amount} onChange={e => setAmount(e.target.value)} 
              className="bg-slate-800 border-slate-700 text-white h-9" autoFocus />
            <Input placeholder="Opis" value={desc} onChange={e => setDesc(e.target.value)} 
              className="bg-slate-800 border-slate-700 text-white h-9" />
            <Button onClick={handleSave} disabled={saving} className="w-full h-9 bg-indigo-600 hover:bg-indigo-500">
              {saving ? <Loader2 className="animate-spin mr-1" size={14} /> : null} Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editDialog.open} onOpenChange={o => setEditDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Edytuj: {editDialog.date}</DialogTitle>
          </DialogHeader>
          
          {editLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : (
            <div className="space-y-4">
              {/* INCOMES */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-green-400">Przychody ({editData.incomes.length})</span>
                  <button onClick={() => { setEditDialog(d => ({ ...d, open: false })); openAdd("income", null, editDialog.date, editDialog.shopId); }}
                    className="px-2 py-1 rounded bg-green-600 text-white text-xs">+ Dodaj</button>
                </div>
                {editData.incomes.length > 0 ? editData.incomes.map(i => (
                  <div key={i.id} className="flex justify-between items-center p-2 mb-1 bg-slate-800 rounded">
                    <div>
                      <span className="text-white text-sm font-medium">{fmt(i.amount)} zl</span>
                      {i.description && <span className="text-slate-500 text-xs ml-2">{i.description}</span>}
                    </div>
                    <button onClick={() => deleteIncome(i.id)} className="p-1 text-slate-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )) : <p className="text-slate-500 text-xs">Brak</p>}
              </div>

              {/* COSTS */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-red-400">Koszty ({editData.costs.length})</span>
                </div>
                {editData.costs.length > 0 ? editData.costs.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-2 mb-1 bg-slate-800 rounded">
                    <div>
                      <span className="text-sm font-medium" style={{ color: getCatColor(c.category) }}>{fmt(c.amount)} zl</span>
                      <span className="text-slate-500 text-xs ml-2">{getCatName(c.category)}</span>
                      {c.description && <span className="text-slate-600 text-xs ml-1">- {c.description}</span>}
                    </div>
                    <button onClick={() => deleteCost(c.id)} className="p-1 text-slate-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )) : <p className="text-slate-500 text-xs">Brak</p>}

                {/* Quick add buttons */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {allCategories.map(c => (
                    <button key={c.id} onClick={() => { setEditDialog(d => ({ ...d, open: false })); openAdd("cost", c.id, editDialog.date, editDialog.shopId); }}
                      className="px-2 py-1 rounded text-[10px] border"
                      style={{ borderColor: c.color, color: c.color }}>
                      + {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* COLUMNS DIALOG */}
      <Dialog open={columnDialog} onOpenChange={setColumnDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Kolumny kosztow</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {customColumns.length > 0 && (
              <div className="space-y-1">
                {customColumns.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-2 bg-slate-800 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: c.color }} />
                      <span className="text-white text-sm">{c.name}</span>
                    </div>
                    <button onClick={() => deleteColumn(c.id, c.name)} className="text-slate-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-slate-700 pt-3 space-y-2">
              <Input placeholder="Nazwa" value={newColName} onChange={e => setNewColName(e.target.value)} 
                className="bg-slate-800 border-slate-700 text-white h-9" />
              <div className="flex gap-2">
                <Select value={newColType} onValueChange={setNewColType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="expense">Koszt</SelectItem>
                    <SelectItem value="income">Przychod</SelectItem>
                  </SelectContent>
                </Select>
                <input type="color" value={newColColor} onChange={e => setNewColColor(e.target.value)} 
                  className="w-9 h-9 rounded border border-slate-700 bg-slate-800 cursor-pointer" />
              </div>
              <Button onClick={addColumn} className="w-full h-9 bg-indigo-600 hover:bg-indigo-500">
                Dodaj kolumne
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
