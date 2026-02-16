import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Download, Settings2 } from "lucide-react";

const MONTHS_PL = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

// Format with full number and zł
const fmtZl = (v) => {
  const num = Math.round(v || 0);
  return `${num.toLocaleString("pl-PL")} zł`;
};

const CATEGORIES = [
  { id: "tiktok", name: "TikTok", color: "#00d4aa" },
  { id: "meta", name: "Meta", color: "#0088ff" },
  { id: "google", name: "Google", color: "#ffaa00" },
  { id: "zwroty", name: "Zwroty", color: "#ff6600" },
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

  const vatRate = appSettings?.vat_rate || 23;
  const profitSplit = appSettings?.profit_split || 2;

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = shop === 0
        ? await api.getCombinedStats({ year, month })
        : await api.getMonthlyStats({ shop_id: shop, year, month });
      setStats(r.data);
      if (r.data.custom_columns) setCustomColumns(r.data.custom_columns);
    } catch { toast.error("Błąd"); }
    finally { setLoading(false); }
  }, [shop, year, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Calculate netto (without VAT)
  const calcNetto = (brutto) => Math.round(brutto / (1 + vatRate / 100));

  // Open add dialog
  const openAdd = (type, category, date, shopId) => {
    setAddDialog({ open: true, type, category, date, shopId: shopId || (shop > 0 ? shop : 1) });
    setAmount("");
    setDesc("");
  };

  // Save
  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Podaj kwotę"); return; }
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
    } catch { toast.error("Błąd"); }
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
    } catch { toast.error("Błąd"); }
    finally { setEditLoading(false); }
  };

  // Delete income/cost
  const deleteIncome = async (id) => {
    try {
      await api.deleteIncome(id);
      toast.success("Usunięto");
      openEdit(editDialog.date, editDialog.shopId);
      fetchStats();
    } catch { toast.error("Błąd"); }
  };

  const deleteCost = async (id) => {
    try {
      await api.deleteCost(id);
      toast.success("Usunięto");
      openEdit(editDialog.date, editDialog.shopId);
      fetchStats();
    } catch { toast.error("Błąd"); }
  };

  // Columns
  const addColumn = async () => {
    if (!newColName.trim()) return;
    try {
      await api.createCustomColumn({ name: newColName, column_type: newColType, color: newColColor });
      toast.success("Dodano kolumnę");
      setNewColName("");
      fetchStats();
    } catch { toast.error("Błąd"); }
  };

  const deleteColumn = async (id) => {
    try {
      await api.deleteCustomColumn(id);
      toast.success("Usunięto");
      fetchStats();
    } catch { toast.error("Błąd"); }
  };

  const getDayNum = (d) => new Date(d).getDate();
  const getDayName = (d) => DAYS_PL[new Date(d).getDay()];

  const shopColor = (id) => shops.find(s => s.id === id)?.color || "#6366f1";
  const getCatColor = (cat) => CATEGORIES.find(c => c.id === cat)?.color || customColumns.find(c => c.name === cat)?.color || "#888";
  const getCatName = (cat) => CATEGORIES.find(c => c.id === cat)?.name || cat;

  const allCategories = [...CATEGORIES, ...customColumns.filter(c => c.column_type === "expense").map(c => ({ id: c.name, name: c.name, color: c.color }))];

  return (
    <div className="min-h-screen bg-slate-950 p-2 sm:p-4 pb-28" data-testid="wyniki-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg sm:text-xl font-bold text-white">Wyniki</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setColumnDialog(true)} className="text-slate-400 h-8 px-2">
            <Settings2 size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => api.downloadExcel(year, month, shop > 0 ? shop : null)} className="text-slate-400 h-8 px-2">
            <Download size={16} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button onClick={() => setShop(0)}
          className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap ${shop === 0 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>
          Wszystkie
        </button>
        {shops.map(s => (
          <button key={s.id} onClick={() => setShop(s.id)}
            className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap ${shop === s.id ? "text-white" : "bg-slate-800 text-slate-400"}`}
            style={shop === s.id ? { backgroundColor: s.color } : {}}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Month */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Button size="sm" variant="ghost" onClick={prevMonth} className="text-slate-400 h-8 w-8 p-0"><ChevronLeft size={20} /></Button>
        <span className="text-base font-semibold text-white min-w-[140px] text-center">{MONTHS_PL[month - 1]} {year}</span>
        <Button size="sm" variant="ghost" onClick={nextMonth} className="text-slate-400 h-8 w-8 p-0"><ChevronRight size={20} /></Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : stats && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-500 mb-1">Przychód brutto</p>
              <p className="text-sm font-bold text-white">{fmtZl(stats.total_income)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-500 mb-1">Przychód netto</p>
              <p className="text-sm font-bold text-blue-400">{fmtZl(calcNetto(stats.total_income))}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-500 mb-1">Koszty Ads</p>
              <p className="text-sm font-bold text-red-400">{fmtZl(stats.total_ads)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-500 mb-1">Dochód</p>
              <p className={`text-sm font-bold ${stats.total_profit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtZl(stats.total_profit)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-500 mb-1">Dochód na łeb</p>
              <p className="text-sm font-bold text-indigo-400">{fmtZl(stats.profit_per_person || Math.round(stats.total_profit / profitSplit))}</p>
            </div>
          </div>

          {/* Excel-like Table */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            {/* Table Header */}
            <div className="bg-slate-800 px-3 py-2 grid gap-2 text-[11px] font-semibold text-slate-300 uppercase tracking-wide"
              style={{ gridTemplateColumns: "50px 1fr 1fr 1fr 1fr 1fr 70px" }}>
              <div>Dzień</div>
              <div className="text-right">Przychód</div>
              <div className="text-right">Netto</div>
              <div className="text-right">Koszty Ads</div>
              <div className="text-right">Dochód</div>
              <div className="text-right">Na łeb</div>
              <div className="text-center">Akcje</div>
            </div>

            {/* Table Body */}
            <div className="max-h-[50vh] overflow-y-auto">
              {stats.days?.map((day, idx) => {
                const income = day.income || 0;
                const netto = calcNetto(income);
                const costs = day.ads_total || 0;
                const profit = netto - costs;
                const perPerson = Math.round(profit / profitSplit);
                const currentShopId = shop > 0 ? shop : 1;

                return (
                  <div key={day.date} 
                    className={`grid gap-2 px-3 py-2 text-sm items-center border-b border-slate-800/50 hover:bg-slate-800/30 ${idx % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"}`}
                    style={{ gridTemplateColumns: "50px 1fr 1fr 1fr 1fr 1fr 70px" }}
                    data-testid={`day-${day.date}`}>
                    
                    {/* Date */}
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-white">{getDayNum(day.date)}</span>
                      <span className="text-slate-500 text-[10px]">{getDayName(day.date)}</span>
                    </div>

                    {/* Przychód brutto */}
                    <div className="text-right flex items-center justify-end gap-1">
                      <span className={`font-medium ${income > 0 ? "text-white" : "text-slate-600"}`}>
                        {fmtZl(income)}
                      </span>
                      <button onClick={() => openAdd("income", null, day.date, currentShopId)}
                        className="w-5 h-5 rounded bg-green-600/20 hover:bg-green-600/40 text-green-400 flex items-center justify-center"
                        data-testid={`add-income-${day.date}`}>
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Netto */}
                    <div className="text-right">
                      <span className={`font-medium ${netto > 0 ? "text-blue-400" : "text-slate-600"}`}>
                        {fmtZl(netto)}
                      </span>
                    </div>

                    {/* Koszty Ads */}
                    <div className="text-right flex items-center justify-end gap-1">
                      <span className={`font-medium ${costs > 0 ? "text-red-400" : "text-slate-600"}`}>
                        {fmtZl(costs)}
                      </span>
                      <button onClick={() => openAdd("cost", "tiktok", day.date, currentShopId)}
                        className="w-5 h-5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 flex items-center justify-center"
                        data-testid={`add-cost-${day.date}`}>
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Dochód */}
                    <div className="text-right">
                      <span className={`font-bold ${profit > 0 ? "text-green-400" : profit < 0 ? "text-red-400" : "text-slate-600"}`}>
                        {fmtZl(profit)}
                      </span>
                    </div>

                    {/* Na łeb */}
                    <div className="text-right">
                      <span className={`font-medium ${perPerson > 0 ? "text-indigo-400" : perPerson < 0 ? "text-red-400" : "text-slate-600"}`}>
                        {fmtZl(perPerson)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center">
                      <button onClick={() => openEdit(day.date, currentShopId)}
                        className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px]"
                        data-testid={`edit-${day.date}`}>
                        Szczegóły
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Footer - Totals */}
            <div className="bg-slate-800 px-3 py-2 grid gap-2 text-sm font-bold border-t border-slate-700"
              style={{ gridTemplateColumns: "50px 1fr 1fr 1fr 1fr 1fr 70px" }}>
              <div className="text-white">Suma</div>
              <div className="text-right text-white">{fmtZl(stats.total_income)}</div>
              <div className="text-right text-blue-400">{fmtZl(calcNetto(stats.total_income))}</div>
              <div className="text-right text-red-400">{fmtZl(stats.total_ads)}</div>
              <div className={`text-right ${stats.total_profit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtZl(stats.total_profit)}</div>
              <div className="text-right text-indigo-400">{fmtZl(stats.profit_per_person || Math.round(stats.total_profit / profitSplit))}</div>
              <div></div>
            </div>
          </div>
        </>
      )}

      {/* ADD DIALOG */}
      <Dialog open={addDialog.open} onOpenChange={o => setAddDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {addDialog.type === "income" ? "Dodaj przychód" : `Dodaj koszt`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">{addDialog.date} - {shops.find(s => s.id === addDialog.shopId)?.name || "ecom1"}</p>
          
          {addDialog.type === "income" ? (
            <Select value={String(addDialog.shopId)} onValueChange={v => setAddDialog(d => ({ ...d, shopId: parseInt(v) }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {shops.map(s => <SelectItem key={s.id} value={String(s.id)} className="text-white">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Select value={addDialog.category || "tiktok"} onValueChange={v => setAddDialog(d => ({ ...d, category: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {allCategories.map(c => <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Input type="number" placeholder="Kwota" value={amount} onChange={e => setAmount(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          <Input placeholder="Opis (opcjonalnie)" value={desc} onChange={e => setDesc(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          
          <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500">
            {saving ? <Loader2 className="animate-spin" size={16} /> : "Zapisz"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG - Szczegóły */}
      <Dialog open={editDialog.open} onOpenChange={o => setEditDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Szczegóły: {editDialog.date}</DialogTitle>
          </DialogHeader>

          {editLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : (
            <>
              {/* Incomes */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-white">Przychody ({editData.incomes.length})</h3>
                  <Button size="sm" onClick={() => openAdd("income", null, editDialog.date, editDialog.shopId)} className="h-6 text-xs bg-green-600 hover:bg-green-500">
                    + Dodaj
                  </Button>
                </div>
                {editData.incomes.length === 0 ? (
                  <p className="text-slate-500 text-sm">Brak</p>
                ) : (
                  <div className="space-y-1">
                    {editData.incomes.map(i => (
                      <div key={i.id} className="flex justify-between items-center bg-slate-800 rounded px-2 py-1">
                        <span className="text-green-400 font-medium">{fmtZl(i.amount)}</span>
                        <span className="text-slate-400 text-xs flex-1 mx-2 truncate">{i.description || "-"}</span>
                        <button onClick={() => deleteIncome(i.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Costs */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-white">Koszty ({editData.costs.length})</h3>
                </div>
                {editData.costs.length === 0 ? (
                  <p className="text-slate-500 text-sm">Brak</p>
                ) : (
                  <div className="space-y-1">
                    {editData.costs.map(c => (
                      <div key={c.id} className="flex justify-between items-center bg-slate-800 rounded px-2 py-1">
                        <span className="text-red-400 font-medium">{fmtZl(c.amount)}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: getCatColor(c.category) + "30", color: getCatColor(c.category) }}>{getCatName(c.category)}</span>
                        <span className="text-slate-400 text-xs flex-1 mx-2 truncate">{c.description || "-"}</span>
                        <button onClick={() => deleteCost(c.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick add buttons */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {allCategories.map(c => (
                    <button key={c.id} onClick={() => openAdd("cost", c.id, editDialog.date, editDialog.shopId)}
                      className="px-2 py-1 rounded text-[10px] font-medium" 
                      style={{ backgroundColor: c.color + "20", color: c.color }}>
                      + {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* COLUMN MANAGER DIALOG */}
      <Dialog open={columnDialog} onOpenChange={setColumnDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Zarządzaj kolumnami</DialogTitle>
          </DialogHeader>

          {/* Existing columns */}
          <div className="space-y-2 mb-4">
            {customColumns.map(c => (
              <div key={c.id} className="flex justify-between items-center bg-slate-800 rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: c.color }} />
                  <span className="text-white text-sm">{c.name}</span>
                  <span className="text-slate-500 text-xs">({c.column_type === "expense" ? "koszt" : "przychód"})</span>
                </div>
                <button onClick={() => deleteColumn(c.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
              </div>
            ))}
            {customColumns.length === 0 && <p className="text-slate-500 text-sm">Brak własnych kolumn</p>}
          </div>

          {/* Add new column */}
          <div className="space-y-2 border-t border-slate-700 pt-3">
            <p className="text-slate-400 text-xs">Dodaj nową kolumnę:</p>
            <Input placeholder="Nazwa" value={newColName} onChange={e => setNewColName(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            <div className="flex gap-2">
              <Select value={newColType} onValueChange={setNewColType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="expense" className="text-white">Koszt</SelectItem>
                  <SelectItem value="income" className="text-white">Przychód</SelectItem>
                </SelectContent>
              </Select>
              <Input type="color" value={newColColor} onChange={e => setNewColColor(e.target.value)} className="w-14 p-1 bg-slate-800 border-slate-700" />
            </div>
            <Button onClick={addColumn} className="w-full bg-indigo-600 hover:bg-indigo-500">Dodaj kolumnę</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
