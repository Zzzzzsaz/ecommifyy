import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Download, RefreshCw, ChevronDown } from "lucide-react";

const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const DAYS = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
const fmtZl = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COST_CATS = [
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
  const [syncing, setSyncing] = useState(false);
  
  const [addDialog, setAddDialog] = useState({ open: false, type: null, category: null, date: null, shopId: 1 });
  const [detailDialog, setDetailDialog] = useState({ open: false, date: null, shopId: null });
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailData, setDetailData] = useState({ incomes: [], costs: [] });
  const [detailLoading, setDetailLoading] = useState(false);

  const vatRate = appSettings?.vat_rate || 23;
  const profitSplit = appSettings?.profit_split || 2;
  const calcNetto = (b) => Math.round((b / (1 + vatRate / 100)) * 100) / 100;

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = shop === 0
        ? await api.getCombinedStats({ year, month })
        : await api.getMonthlyStats({ shop_id: shop, year, month });
      setStats(r.data);
    } catch { toast.error("Błąd"); }
    finally { setLoading(false); }
  }, [shop, year, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const syncData = async () => {
    setSyncing(true);
    try {
      await api.syncAll(year, month);
      await fetchStats();
      toast.success("Odświeżono");
    } catch { 
      await fetchStats();
      toast.success("Odświeżono");
    }
    finally { setSyncing(false); }
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const openAdd = (type, category, date, shopId) => {
    setAddDialog({ open: true, type, category, date, shopId: shopId || (shop > 0 ? shop : 1) });
    setAmount("");
    setDesc("");
  };

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Podaj kwotę"); return; }
    setSaving(true);
    try {
      if (addDialog.type === "income") {
        await api.createIncome({ amount: val, date: addDialog.date, description: desc, shop_id: addDialog.shopId });
      } else {
        await api.createCost({ date: addDialog.date, shop_id: addDialog.shopId, category: addDialog.category, amount: val, description: desc });
      }
      toast.success("Dodano");
      setAddDialog({ open: false, type: null, category: null, date: null, shopId: 1 });
      fetchStats();
      if (detailDialog.open) openDetail(detailDialog.date, detailDialog.shopId);
    } catch { toast.error("Błąd"); }
    finally { setSaving(false); }
  };

  const openDetail = async (date, shopId) => {
    setDetailDialog({ open: true, date, shopId });
    setDetailLoading(true);
    try {
      const [inc, costs] = await Promise.all([
        api.getIncomes({ shop_id: shopId, date }),
        api.getCosts({ shop_id: shopId, date })
      ]);
      setDetailData({ incomes: inc.data || [], costs: costs.data || [] });
    } catch {}
    finally { setDetailLoading(false); }
  };

  const deleteIncome = async (id) => {
    await api.deleteIncome(id);
    openDetail(detailDialog.date, detailDialog.shopId);
    fetchStats();
  };

  const deleteCost = async (id) => {
    await api.deleteCost(id);
    openDetail(detailDialog.date, detailDialog.shopId);
    fetchStats();
  };

  const getCatColor = (cat) => COST_CATS.find(c => c.id === cat)?.color || "#64748b";

  // Calculate totals
  const totalNetto = calcNetto(stats?.total_income || 0);
  const totalProfit = totalNetto - (stats?.total_ads || 0);
  const totalPP = Math.round(totalProfit / profitSplit);

  return (
    <div className="page-container" data-testid="wyniki-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Wyniki</h1>
        <div className="flex items-center gap-2">
          <Select value={String(shop)} onValueChange={v => setShop(parseInt(v))}>
            <SelectTrigger className="h-9 bg-white border-slate-200 text-sm gap-1 w-auto">
              <SelectValue>{shop === 0 ? "Wszystkie" : shops.find(s => s.id === shop)?.name}</SelectValue>
              <ChevronDown size={14} className="text-slate-400" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Wszystkie</SelectItem>
              {shops.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button onClick={syncData} disabled={syncing} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          </button>
          <button onClick={() => api.downloadExcel(year, month, shop > 0 ? shop : null)} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button onClick={prevMonth} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-slate-900 min-w-[140px] text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : stats && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Przychód</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{fmtZl(stats.total_income)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Koszty</p>
              <p className="text-lg font-bold text-orange-600 tabular-nums">{fmtZl(stats.total_ads)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Zysk</p>
              <p className={`text-lg font-bold tabular-nums ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtZl(totalProfit)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Na osobę</p>
              <p className={`text-lg font-bold tabular-nums ${totalPP >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmtZl(totalPP)}</p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              <div>Dzień</div>
              <div className="text-right">Przychód</div>
              <div className="text-right">Koszty</div>
              <div className="text-right">Zysk</div>
              <div className="text-right">Na osobę</div>
              <div className="text-center">Akcje</div>
            </div>
            {/* Rows */}
            <div className="max-h-[50vh] overflow-y-auto">
              {stats.days?.map(day => {
                const income = day.income || 0;
                const costs = day.ads_total || 0;
                const netto = calcNetto(income);
                const profit = netto - costs;
                const pp = Math.round(profit / profitSplit);
                const shopId = shop > 0 ? shop : 1;
                const dayNum = new Date(day.date).getDate();
                const dayName = DAYS[new Date(day.date).getDay()];

                return (
                  <div key={day.date} className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 text-sm items-center">
                    <div className="font-medium text-slate-900">
                      {dayNum} <span className="text-slate-400 font-normal">{dayName}</span>
                    </div>
                    <div className="text-right flex items-center justify-end gap-2">
                      <span className={`tabular-nums ${income > 0 ? "" : "text-slate-300"}`}>{fmtZl(income)}</span>
                      <button onClick={() => openAdd("income", null, day.date, shopId)} 
                        className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="text-right flex items-center justify-end gap-2">
                      <span className={`tabular-nums ${costs > 0 ? "text-orange-600" : "text-slate-300"}`}>{fmtZl(costs)}</span>
                      <button onClick={() => openAdd("cost", "tiktok", day.date, shopId)}
                        className="w-6 h-6 rounded-md bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-600">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className={`text-right font-medium tabular-nums ${profit > 0 ? "text-emerald-600" : profit < 0 ? "text-red-600" : "text-slate-300"}`}>
                      {fmtZl(profit)}
                    </div>
                    <div className={`text-right font-medium tabular-nums ${pp > 0 ? "text-blue-600" : pp < 0 ? "text-red-600" : "text-slate-300"}`}>
                      {fmtZl(pp)}
                    </div>
                    <div className="flex justify-center">
                      <button onClick={() => openDetail(day.date, shopId)} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md">
                        Szczegóły
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {stats.days?.map(day => {
              const income = day.income || 0;
              const costs = day.ads_total || 0;
              const netto = calcNetto(income);
              const profit = netto - costs;
              const pp = Math.round(profit / profitSplit);
              const shopId = shop > 0 ? shop : 1;
              const dayNum = new Date(day.date).getDate();
              const dayName = DAYS[new Date(day.date).getDay()];

              return (
                <div key={day.date} className="bg-white rounded-xl border border-slate-200 p-4" onClick={() => openDetail(day.date, shopId)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-slate-900">{dayNum} <span className="font-normal text-slate-400">{dayName}</span></span>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openAdd("income", null, day.date, shopId); }}
                        className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Plus size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openAdd("cost", "tiktok", day.date, shopId); }}
                        className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Przychód</p>
                      <p className="font-semibold tabular-nums">{fmtZl(income)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Koszty</p>
                      <p className="font-semibold text-orange-600 tabular-nums">{fmtZl(costs)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Zysk</p>
                      <p className={`font-semibold tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtZl(profit)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Na osobę</p>
                      <p className={`font-semibold tabular-nums ${pp >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmtZl(pp)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialog.open} onOpenChange={o => setAddDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle>{addDialog.type === "income" ? "Dodaj przychód" : "Dodaj koszt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-slate-500">{addDialog.date}</p>
            {addDialog.type === "income" ? (
              <Select value={String(addDialog.shopId)} onValueChange={v => setAddDialog(d => ({ ...d, shopId: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {shops.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={addDialog.category || "tiktok"} onValueChange={v => setAddDialog(d => ({ ...d, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COST_CATS.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input type="number" placeholder="Kwota" value={amount} onChange={e => setAmount(e.target.value)} />
            <Input placeholder="Opis (opcjonalnie)" value={desc} onChange={e => setDesc(e.target.value)} />
            <Button onClick={handleSave} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800">
              {saving ? <Loader2 className="animate-spin" size={16} /> : "Zapisz"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={o => setDetailDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-white max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Szczegóły: {detailDialog.date}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="space-y-4 mt-2">
              {/* Incomes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Przychody</h3>
                  <Button size="sm" onClick={() => openAdd("income", null, detailDialog.date, detailDialog.shopId)} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                    + Dodaj
                  </Button>
                </div>
                {detailData.incomes.length === 0 ? (
                  <p className="text-slate-400 text-sm">Brak</p>
                ) : (
                  <div className="space-y-1">
                    {detailData.incomes.map(i => (
                      <div key={i.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-emerald-600 font-medium tabular-nums">{fmtZl(i.amount)} zł</span>
                        <span className="text-slate-400 text-xs flex-1 mx-2 truncate">{i.description || "-"}</span>
                        <button onClick={() => deleteIncome(i.id)} className="text-slate-400 hover:text-red-500 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Costs */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Koszty</h3>
                {detailData.costs.length === 0 ? (
                  <p className="text-slate-400 text-sm">Brak</p>
                ) : (
                  <div className="space-y-1">
                    {detailData.costs.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-orange-600 font-medium tabular-nums">{fmtZl(c.amount)} zł</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: getCatColor(c.category) + "20", color: getCatColor(c.category) }}>
                          {c.category}
                        </span>
                        <span className="text-slate-400 text-xs flex-1 mx-2 truncate">{c.description || "-"}</span>
                        <button onClick={() => deleteCost(c.id)} className="text-slate-400 hover:text-red-500 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {COST_CATS.map(c => (
                    <button key={c.id} onClick={() => openAdd("cost", c.id, detailDialog.date, detailDialog.shopId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{ borderColor: c.color + "40", color: c.color, backgroundColor: c.color + "10" }}>
                      + {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
