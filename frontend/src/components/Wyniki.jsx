import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Download, RefreshCw } from "lucide-react";

const MONTHS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];
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
    } catch { toast.error("Błąd"); }
    finally { setDetailLoading(false); }
  };

  const deleteIncome = async (id) => {
    await api.deleteIncome(id);
    toast.success("Usunięto");
    openDetail(detailDialog.date, detailDialog.shopId);
    fetchStats();
  };

  const deleteCost = async (id) => {
    await api.deleteCost(id);
    toast.success("Usunięto");
    openDetail(detailDialog.date, detailDialog.shopId);
    fetchStats();
  };

  const getCatColor = (cat) => COST_CATS.find(c => c.id === cat)?.color || "#64748b";

  return (
    <div className="page-container" data-testid="wyniki-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="page-title">Wyniki</h1>
          <p className="text-sm text-slate-500">Przychody i koszty</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(shop)} onValueChange={v => setShop(parseInt(v))}>
            <SelectTrigger className="w-[140px] h-9 bg-white text-sm">
              <SelectValue>{shop === 0 ? "Wszystkie" : shops.find(s => s.id === shop)?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Wszystkie</SelectItem>
              {shops.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button onClick={syncData} disabled={syncing} className="btn-icon">
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          </button>
          <button onClick={() => api.downloadExcel(year, month, shop > 0 ? shop : null)} className="btn-icon">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button onClick={prevMonth} className="btn-icon"><ChevronLeft size={18} /></button>
        <span className="font-semibold text-slate-900 min-w-[120px] text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} className="btn-icon"><ChevronRight size={18} /></button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : stats && (
        <>
          {/* KPI */}
          <div className="kpi-grid mb-4">
            <div className="kpi-card">
              <p className="kpi-label">Przychód</p>
              <p className="kpi-value tabular-nums">{fmtZl(stats.total_income)} zł</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Netto</p>
              <p className="kpi-value tabular-nums text-blue-600">{fmtZl(calcNetto(stats.total_income))} zł</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Koszty</p>
              <p className="kpi-value tabular-nums text-orange-600">{fmtZl(stats.total_ads)} zł</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Zysk</p>
              <p className={`kpi-value tabular-nums ${stats.total_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {fmtZl(stats.total_profit)} zł
              </p>
            </div>
          </div>

          {/* Table - Desktop */}
          <div className="hidden md:block data-table">
            <div className="data-table-header grid grid-cols-7 gap-2">
              <div>Dzień</div>
              <div className="text-right">Przychód</div>
              <div className="text-right">Netto</div>
              <div className="text-right">Koszty</div>
              <div className="text-right">Zysk</div>
              <div className="text-right">Na os.</div>
              <div className="text-center">Akcje</div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {stats.days?.map(day => {
                const income = day.income || 0;
                const netto = calcNetto(income);
                const costs = day.ads_total || 0;
                const profit = netto - costs;
                const perPerson = Math.round(profit / profitSplit);
                const shopId = shop > 0 ? shop : 1;
                const dayNum = new Date(day.date).getDate();
                const dayName = DAYS[new Date(day.date).getDay()];

                return (
                  <div key={day.date} className="data-table-row grid grid-cols-7 gap-2 items-center">
                    <div className="font-medium">
                      <span className="text-slate-900">{dayNum}</span>
                      <span className="text-slate-400 text-xs ml-1">{dayName}</span>
                    </div>
                    <div className="text-right flex items-center justify-end gap-1">
                      <span className={`tabular-nums ${income > 0 ? "text-slate-900" : "text-slate-300"}`}>{fmtZl(income)}</span>
                      <button onClick={() => openAdd("income", null, day.date, shopId)} className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-right tabular-nums text-blue-600">{fmtZl(netto)}</div>
                    <div className="text-right flex items-center justify-end gap-1">
                      <span className={`tabular-nums ${costs > 0 ? "text-orange-600" : "text-slate-300"}`}>{fmtZl(costs)}</span>
                      <button onClick={() => openAdd("cost", "tiktok", day.date, shopId)} className="w-6 h-6 rounded bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className={`text-right tabular-nums font-medium ${profit > 0 ? "text-emerald-600" : profit < 0 ? "text-red-600" : "text-slate-300"}`}>
                      {fmtZl(profit)}
                    </div>
                    <div className={`text-right tabular-nums ${perPerson > 0 ? "text-violet-600" : perPerson < 0 ? "text-red-600" : "text-slate-300"}`}>
                      {fmtZl(perPerson)}
                    </div>
                    <div className="text-center">
                      <button onClick={() => openDetail(day.date, shopId)} className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">
                        Szczegóły
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Total */}
            <div className="data-table-header grid grid-cols-7 gap-2 border-t">
              <div className="font-semibold">Suma</div>
              <div className="text-right font-semibold tabular-nums">{fmtZl(stats.total_income)}</div>
              <div className="text-right font-semibold tabular-nums text-blue-600">{fmtZl(calcNetto(stats.total_income))}</div>
              <div className="text-right font-semibold tabular-nums text-orange-600">{fmtZl(stats.total_ads)}</div>
              <div className={`text-right font-semibold tabular-nums ${stats.total_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtZl(stats.total_profit)}</div>
              <div className="text-right font-semibold tabular-nums text-violet-600">{fmtZl(stats.profit_per_person)}</div>
              <div></div>
            </div>
          </div>

          {/* Cards - Mobile */}
          <div className="md:hidden space-y-2">
            {stats.days?.map(day => {
              const income = day.income || 0;
              const netto = calcNetto(income);
              const costs = day.ads_total || 0;
              const profit = netto - costs;
              const perPerson = Math.round(profit / profitSplit);
              const shopId = shop > 0 ? shop : 1;
              const dayNum = new Date(day.date).getDate();
              const dayName = DAYS[new Date(day.date).getDay()];

              return (
                <div key={day.date} className="card card-sm" onClick={() => openDetail(day.date, shopId)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-slate-900">
                      {dayNum} <span className="text-slate-400 font-normal">{dayName}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openAdd("income", null, day.date, shopId); }} className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Plus size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openAdd("cost", "tiktok", day.date, shopId); }} className="w-7 h-7 rounded bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Przychód</span>
                      <span className="tabular-nums font-medium">{fmtZl(income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Netto</span>
                      <span className="tabular-nums text-blue-600">{fmtZl(netto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Koszty</span>
                      <span className="tabular-nums text-orange-600">{fmtZl(costs)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Zysk</span>
                      <span className={`tabular-nums font-semibold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtZl(profit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Mobile Total */}
            <div className="card bg-slate-50">
              <div className="font-semibold text-slate-900 mb-2">Podsumowanie</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Przychód</span>
                  <span className="tabular-nums font-semibold">{fmtZl(stats.total_income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Netto</span>
                  <span className="tabular-nums font-semibold text-blue-600">{fmtZl(calcNetto(stats.total_income))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Koszty</span>
                  <span className="tabular-nums font-semibold text-orange-600">{fmtZl(stats.total_ads)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Zysk</span>
                  <span className={`tabular-nums font-semibold ${stats.total_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtZl(stats.total_profit)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialog.open} onOpenChange={o => setAddDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle>{addDialog.type === "income" ? "Dodaj przychód" : "Dodaj koszt"}</DialogTitle>
          </DialogHeader>
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
            <>
              {/* Incomes */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold">Przychody ({detailData.incomes.length})</h3>
                  <Button size="sm" onClick={() => openAdd("income", null, detailDialog.date, detailDialog.shopId)} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                    + Dodaj
                  </Button>
                </div>
                {detailData.incomes.length === 0 ? (
                  <p className="text-slate-400 text-sm">Brak</p>
                ) : (
                  <div className="space-y-2">
                    {detailData.incomes.map(i => (
                      <div key={i.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-emerald-600 font-medium tabular-nums">{fmtZl(i.amount)} zł</span>
                        <span className="text-slate-400 text-xs flex-1 mx-2 truncate">{i.description || "-"}</span>
                        <button onClick={() => deleteIncome(i.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Costs */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Koszty ({detailData.costs.length})</h3>
                {detailData.costs.length === 0 ? (
                  <p className="text-slate-400 text-sm">Brak</p>
                ) : (
                  <div className="space-y-2">
                    {detailData.costs.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-orange-600 font-medium tabular-nums">{fmtZl(c.amount)} zł</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: getCatColor(c.category) + "20", color: getCatColor(c.category) }}>
                          {c.category}
                        </span>
                        <span className="text-slate-400 text-xs flex-1 mx-2 truncate">{c.description || "-"}</span>
                        <button onClick={() => deleteCost(c.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Quick add */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {COST_CATS.map(c => (
                    <button key={c.id} onClick={() => openAdd("cost", c.id, detailDialog.date, detailDialog.shopId)}
                      className="px-3 py-1.5 rounded text-xs font-medium border"
                      style={{ borderColor: c.color + "40", color: c.color, backgroundColor: c.color + "10" }}>
                      + {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
