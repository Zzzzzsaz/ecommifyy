import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { getRank } from "@/lib/ranks";
import { toast } from "sonner";
import { 
  ChevronLeft, ChevronRight, Plus, Loader2, ChevronDown, Crown, Users, 
  TrendingUp, Flame, Target, Trash2, Eye, Download, Settings2, X, 
  DollarSign, ShoppingBag, BarChart3, Percent, Edit3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const MONTHS_PL = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
const DAYS_PL = ["Nd", "Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";
const fmtShort = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Cost categories with icons and colors
const COST_CATEGORIES = [
  { id: "tiktok", name: "TikTok", color: "#00f2ea", icon: "🎵" },
  { id: "meta", name: "Meta", color: "#0084ff", icon: "📘" },
  { id: "google", name: "Google", color: "#fbbc04", icon: "🔍" },
  { id: "zwroty", name: "Zwroty", color: "#f97316", icon: "↩️" },
];

export default function Wyniki({ user, shops = [], appSettings = {} }) {
  const TARGET = appSettings.target_revenue || 250000;
  const now = new Date();
  const [shop, setShop] = useState(0);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState(new Set());
  
  // Dialogs
  const [incomeDialog, setIncomeDialog] = useState({ open: false, date: null, shopId: 1 });
  const [costDialog, setCostDialog] = useState({ open: false, category: null, date: null, shopId: 1 });
  const [columnDialog, setColumnDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState({ open: false, date: null, shopId: null });
  
  // Form states
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("expense");
  const [newColColor, setNewColColor] = useState("#8b5cf6");
  
  // Details
  const [details, setDetails] = useState({ incomes: [], costs: [] });
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [customColumns, setCustomColumns] = useState([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = shop === 0
        ? await api.getCombinedStats({ year, month })
        : await api.getMonthlyStats({ shop_id: shop, year, month });
      setStats(r.data);
      if (r.data.custom_columns) setCustomColumns(r.data.custom_columns);
    } catch { toast.error("Błąd ładowania danych"); }
    finally { setLoading(false); }
  }, [shop, year, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const toggleDay = (date) => setExpandedDays(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });

  // Save income
  const handleSaveIncome = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Podaj prawidłową kwotę"); return; }
    setSaving(true);
    try {
      await api.createIncome({ amount: val, date: incomeDialog.date, description: desc || "Przychód", shop_id: incomeDialog.shopId });
      toast.success("Dodano przychód!");
      setIncomeDialog({ open: false, date: null, shopId: 1 });
      setAmount(""); setDesc("");
      fetchStats();
    } catch { toast.error("Błąd zapisu"); }
    finally { setSaving(false); }
  };

  // Save cost
  const handleSaveCost = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Podaj prawidłową kwotę"); return; }
    setSaving(true);
    try {
      await api.createCost({ date: costDialog.date, shop_id: costDialog.shopId, category: costDialog.category, amount: val, description: desc || "" });
      toast.success("Dodano koszt!");
      setCostDialog({ open: false, category: null, date: null, shopId: 1 });
      setAmount(""); setDesc("");
      fetchStats();
    } catch { toast.error("Błąd zapisu"); }
    finally { setSaving(false); }
  };

  // Open details
  const openDetails = async (date, shopId) => {
    setDetailDialog({ open: true, date, shopId });
    setDetailLoading(true);
    try {
      const [inc, costs] = await Promise.all([
        api.getIncomes({ shop_id: shopId, date }),
        api.getCosts({ shop_id: shopId, date })
      ]);
      setDetails({ incomes: inc.data, costs: costs.data });
    } catch { toast.error("Błąd"); }
    finally { setDetailLoading(false); }
  };

  // Delete entry
  const deleteEntry = async (type, id) => {
    try {
      if (type === "income") await api.deleteIncome(id);
      else await api.deleteCost(id);
      toast.success("Usunięto!");
      openDetails(detailDialog.date, detailDialog.shopId);
      fetchStats();
    } catch { toast.error("Błąd"); }
  };

  // Custom columns
  const handleAddColumn = async () => {
    if (!newColName.trim()) { toast.error("Podaj nazwę"); return; }
    try {
      await api.createCustomColumn({ name: newColName, column_type: newColType, color: newColColor });
      toast.success("Dodano kolumnę!");
      setNewColName(""); setNewColType("expense"); setNewColColor("#8b5cf6");
      fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || "Błąd"); }
  };

  const handleDeleteColumn = async (id, name) => {
    if (!window.confirm(`Usunąć kolumnę "${name}"? Wszystkie dane zostaną usunięte.`)) return;
    try {
      await api.deleteCustomColumn(id);
      toast.success("Usunięto!");
      fetchStats();
    } catch { toast.error("Błąd"); }
  };

  const getDayName = (d) => DAYS_PL[new Date(d + "T12:00:00").getDay()];
  const getDayNum = (d) => parseInt(d.split("-")[2], 10);
  const isAll = shop === 0;
  const rank = getRank(stats?.total_income || 0);
  const sparkData = stats?.days?.map(d => ({ v: d.income })) || [];
  const shopName = (id) => shops.find(s => s.id === id)?.name || "";
  const shopColor = (id) => shops.find(s => s.id === id)?.color || "#6366f1";

  const getCatColor = (cat) => {
    const c = COST_CATEGORIES.find(x => x.id === cat);
    if (c) return c.color;
    const custom = customColumns.find(x => x.name === cat);
    return custom?.color || "#888";
  };

  const getCatName = (cat) => {
    const c = COST_CATEGORIES.find(x => x.id === cat);
    if (c) return c.name;
    return cat;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 pb-28" data-testid="wyniki-page">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Wyniki</h1>
            <p className="text-xs text-slate-400">{user?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setColumnDialog(true)} className="text-slate-400 hover:text-white hover:bg-white/5" data-testid="manage-columns-btn">
            <Settings2 size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => api.downloadExcel(year, month, shop > 0 ? shop : null)} className="text-slate-400 hover:text-white hover:bg-white/5" data-testid="export-excel-btn">
            <Download size={16} />
          </Button>
        </div>
      </header>

      {/* Shop tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide" data-testid="wyniki-shop-tabs">
        <button onClick={() => setShop(0)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${shop === 0 
            ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30" 
            : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white hover:border-slate-600"}`}
          data-testid="wyniki-tab-all">
          Wszystkie
        </button>
        {shops.map(s => (
          <button key={s.id} onClick={() => setShop(s.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${shop === s.id
              ? "text-white border" 
              : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"}`}
            style={shop === s.id ? { backgroundColor: s.color + "15", borderColor: s.color + "50", color: s.color } : {}}
            data-testid={`wyniki-tab-${s.id}`}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button size="icon" variant="ghost" onClick={prevMonth} className="text-slate-400 hover:text-white" data-testid="wyniki-prev">
          <ChevronLeft size={20} />
        </Button>
        <div className="min-w-[180px] text-center">
          <span className="text-lg font-semibold text-white">{MONTHS_PL[month - 1]} {year}</span>
        </div>
        <Button size="icon" variant="ghost" onClick={nextMonth} className="text-slate-400 hover:text-white" data-testid="wyniki-next">
          <ChevronRight size={20} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
      ) : stats && (
        <>
          {/* Progress bar (all shops view) */}
          {isAll && (
            <div className="mb-6 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-indigo-400" />
                  <span className="text-xs text-slate-400">Cel miesięczny</span>
                </div>
                <span className="text-sm font-bold text-white">{((stats.total_income / TARGET) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((stats.total_income / TARGET) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                <span>{fmtShort(stats.total_income)} / {fmtShort(TARGET)} zł</span>
                <span className="flex items-center gap-1">
                  {stats.streak > 0 && <><Flame size={10} className="text-orange-400" />{stats.streak}d streak</>}
                </span>
              </div>
            </div>
          )}

          {/* Sparkline */}
          {sparkData.some(d => d.v > 0) && (
            <div className="mb-6 h-16 rounded-xl overflow-hidden bg-slate-800/20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isAll ? "#6366f1" : shopColor(shop)} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={isAll ? "#6366f1" : shopColor(shop)} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={isAll ? "#6366f1" : shopColor(shop)} fill="url(#sparkGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" data-testid="wyniki-kpis">
            <KPICard icon={<DollarSign size={16} />} label="Przychód brutto" value={fmtPLN(stats.total_income)} color="text-white" />
            <KPICard icon={<ShoppingBag size={16} />} label="Koszty reklam" value={fmtPLN(stats.total_ads)} color="text-red-400" subtext={`TT: ${fmtShort(stats.total_tiktok)} | M: ${fmtShort(stats.total_meta)} | G: ${fmtShort(stats.total_google)}`} />
            <KPICard icon={<TrendingUp size={16} />} label="Zysk" value={fmtPLN(stats.total_profit)} color={stats.total_profit >= 0 ? "text-emerald-400" : "text-red-400"} />
            <KPICard icon={<Users size={16} />} label="Na łeb" value={fmtPLN(stats.profit_per_person)} color="text-indigo-400" />
          </div>

          {/* Daily breakdown */}
          <div className="space-y-2" data-testid="wyniki-days">
            {stats.days?.filter(d => d.income > 0 || d.ads_total > 0 || d.zwroty > 0).map(day => {
              const expanded = expandedDays.has(day.date);
              const isBest = isAll && stats.best_day === day.date;
              const profit = day.profit || 0;
              const adsTotal = day.ads_total || 0;
              const currentShopId = isAll ? 1 : shop;

              return (
                <motion.div key={day.date} layout
                  className={`rounded-2xl border overflow-hidden transition-colors ${isBest 
                    ? "bg-gradient-to-r from-amber-500/5 to-transparent border-amber-500/30" 
                    : "bg-slate-800/30 border-slate-700/50"}`}
                  data-testid={`wyniki-day-${day.date}`}>
                  
                  {/* Day header */}
                  <div className={`p-4 ${isAll ? "cursor-pointer" : ""}`} onClick={() => isAll && toggleDay(day.date)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Date badge */}
                        <div className="w-14 h-14 rounded-xl bg-slate-700/50 flex flex-col items-center justify-center">
                          <span className="text-xl font-bold text-white leading-none">{getDayNum(day.date)}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{getDayName(day.date)}</span>
                        </div>
                        
                        {/* Main metrics */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isBest && <Crown size={14} className="text-amber-400" />}
                            <span className="text-lg font-bold text-white">{fmtShort(day.income)} zł</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-400">Netto: <span className="text-slate-300">{fmtShort(day.netto)}</span></span>
                            <span className="text-red-400">Ads: -{fmtShort(adsTotal)}</span>
                            {day.zwroty > 0 && <span className="text-orange-400">Zwr: -{fmtShort(day.zwroty)}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right side - profit & actions */}
                      <div className="flex items-center gap-3">
                        {/* Profit badge */}
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${profit >= 0 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                          {profit >= 0 ? "+" : ""}{fmtShort(profit)} zł
                        </div>

                        {/* Actions */}
                        {!isAll && (
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); openDetails(day.date, shop); }}
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                              <Eye size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIncomeDialog({ open: true, date: day.date, shopId: shop }); }}
                              className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors" data-testid={`add-income-${day.date}`}>
                              <Plus size={14} />
                            </button>
                          </div>
                        )}

                        {isAll && <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />}
                      </div>
                    </div>

                    {/* Cost breakdown row */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {COST_CATEGORIES.map(cat => {
                        const val = day[`${cat.id}_ads`] || day[cat.id] || 0;
                        if (cat.id === "zwroty" && day.zwroty) {
                          return (
                            <CostPill key={cat.id} cat={cat} value={day.zwroty} 
                              onClick={() => { setCostDialog({ open: true, category: cat.id, date: day.date, shopId: currentShopId }); setAmount(""); setDesc(""); }} />
                          );
                        }
                        if (cat.id !== "zwroty") {
                          return (
                            <CostPill key={cat.id} cat={cat} value={val}
                              onClick={() => { setCostDialog({ open: true, category: cat.id, date: day.date, shopId: currentShopId }); setAmount(""); setDesc(""); }} />
                          );
                        }
                        return null;
                      })}
                      {/* Custom columns */}
                      {customColumns.filter(c => c.column_type === "expense").map(cc => (
                        <CostPill key={cc.id} cat={{ id: cc.name, name: cc.name, color: cc.color, icon: "📊" }} 
                          value={day.custom_costs?.[cc.name] || 0}
                          onClick={() => { setCostDialog({ open: true, category: cc.name, date: day.date, shopId: currentShopId }); setAmount(""); setDesc(""); }} />
                      ))}
                      {/* Na łeb */}
                      <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
                        <Users size={12} className="text-indigo-400" />
                        <span className="text-xs font-medium text-indigo-400">{fmtShort(day.profit_pp)} zł/os</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded shop details */}
                  <AnimatePresence>
                    {isAll && expanded && day.shops && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-700/30">
                        <div className="p-4 space-y-2">
                          {day.shops.filter(s => s.income > 0 || s.ads_total > 0).map(s => (
                            <div key={s.shop_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border-l-4" style={{ borderLeftColor: shopColor(s.shop_id) }}>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium" style={{ color: shopColor(s.shop_id) }}>{shopName(s.shop_id)}</span>
                                <span className="text-xs text-slate-400">{fmtShort(s.income)} zł</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-red-400">-{fmtShort(s.ads_total)}</span>
                                <span className={`text-sm font-medium ${s.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {s.profit >= 0 ? "+" : ""}{fmtShort(s.profit)}
                                </span>
                                <button onClick={() => { setIncomeDialog({ open: true, date: day.date, shopId: s.shop_id }); setAmount(""); setDesc(""); }}
                                  className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10">
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Days without data */}
            {stats.days?.filter(d => d.income === 0 && (d.ads_total || 0) === 0 && (d.zwroty || 0) === 0).length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
                <p className="text-sm text-slate-500 text-center">
                  {stats.days.filter(d => d.income === 0 && (d.ads_total || 0) === 0).length} dni bez danych
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Income Dialog */}
      <Dialog open={incomeDialog.open} onOpenChange={o => setIncomeDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Plus size={16} className="text-emerald-400" />
              </div>
              Dodaj przychód
            </DialogTitle>
            <DialogDescription className="text-slate-400 flex items-center gap-2">
              {incomeDialog.date}
              <Badge style={{ backgroundColor: shopColor(incomeDialog.shopId) + "20", color: shopColor(incomeDialog.shopId), borderColor: shopColor(incomeDialog.shopId) }}>
                {shopName(incomeDialog.shopId)}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {isAll && (
              <Select value={String(incomeDialog.shopId)} onValueChange={v => setIncomeDialog(d => ({ ...d, shopId: parseInt(v) }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {shops.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input type="number" placeholder="Kwota (PLN)" value={amount} onChange={e => setAmount(e.target.value)} 
              className="bg-slate-800 border-slate-700 text-white text-lg h-12" autoFocus />
            <Input placeholder="Opis (opcjonalnie)" value={desc} onChange={e => setDesc(e.target.value)} 
              className="bg-slate-800 border-slate-700 text-white" />
            <Button onClick={handleSaveIncome} disabled={saving} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
              {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : null} Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost Dialog */}
      <Dialog open={costDialog.open} onOpenChange={o => setCostDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: getCatColor(costDialog.category) + "20" }}>
                <Edit3 size={16} style={{ color: getCatColor(costDialog.category) }} />
              </div>
              <span>Dodaj koszt: <span style={{ color: getCatColor(costDialog.category) }}>{getCatName(costDialog.category)}</span></span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 flex items-center gap-2">
              {costDialog.date}
              <Badge style={{ backgroundColor: shopColor(costDialog.shopId) + "20", color: shopColor(costDialog.shopId), borderColor: shopColor(costDialog.shopId) }}>
                {shopName(costDialog.shopId)}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {isAll && (
              <Select value={String(costDialog.shopId)} onValueChange={v => setCostDialog(d => ({ ...d, shopId: parseInt(v) }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {shops.map(s => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input type="number" placeholder="Kwota (PLN)" value={amount} onChange={e => setAmount(e.target.value)} 
              className="bg-slate-800 border-slate-700 text-white text-lg h-12" autoFocus />
            <Input placeholder="Opis (opcjonalnie)" value={desc} onChange={e => setDesc(e.target.value)} 
              className="bg-slate-800 border-slate-700 text-white" />
            <Button onClick={handleSaveCost} disabled={saving} className="w-full h-12 font-medium" 
              style={{ backgroundColor: getCatColor(costDialog.category), color: "#fff" }}>
              {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : null} Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={o => setDetailDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Szczegóły dnia</DialogTitle>
            <DialogDescription className="text-slate-400">{detailDialog.date}</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
          ) : (
            <div className="space-y-4 mt-4">
              {/* Incomes */}
              <div>
                <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide mb-2">Przychody ({details.incomes.length})</p>
                {details.incomes.length > 0 ? details.incomes.map(i => (
                  <div key={i.id} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                    <div>
                      <p className="text-white text-sm">{fmtPLN(i.amount)}</p>
                      <p className="text-slate-500 text-xs">{i.description}</p>
                    </div>
                    <button onClick={() => deleteEntry("income", i.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                )) : <p className="text-slate-500 text-sm">Brak</p>}
              </div>
              {/* Costs */}
              <div>
                <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-2">Koszty ({details.costs.length})</p>
                {details.costs.length > 0 ? details.costs.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                    <div>
                      <p className="text-sm" style={{ color: getCatColor(c.category) }}>{fmtPLN(c.amount)}</p>
                      <p className="text-slate-500 text-xs">{getCatName(c.category)}{c.description ? ` - ${c.description}` : ""}</p>
                    </div>
                    <button onClick={() => deleteEntry("cost", c.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                )) : <p className="text-slate-500 text-sm">Brak</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Columns Dialog */}
      <Dialog open={columnDialog} onOpenChange={setColumnDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings2 size={18} className="text-indigo-400" />
              Zarządzaj kolumnami
            </DialogTitle>
            <DialogDescription className="text-slate-400">Dodawaj własne kategorie kosztów lub przychodów</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Existing columns */}
            {customColumns.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Twoje kolumny</p>
                {customColumns.map(cc => (
                  <div key={cc.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: cc.color }} />
                      <span className="text-white text-sm">{cc.name}</span>
                      <Badge variant="outline" className="text-[10px]" style={{ 
                        borderColor: cc.column_type === "income" ? "#10b981" : "#ef4444", 
                        color: cc.column_type === "income" ? "#10b981" : "#ef4444" 
                      }}>
                        {cc.column_type === "income" ? "Przychód" : "Koszt"}
                      </Badge>
                    </div>
                    <button onClick={() => handleDeleteColumn(cc.id, cc.name)} className="text-slate-500 hover:text-red-400 p-1" data-testid={`delete-col-${cc.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add new */}
            <div className="pt-4 border-t border-slate-700/50 space-y-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Dodaj nową</p>
              <Input placeholder="Nazwa kolumny" value={newColName} onChange={e => setNewColName(e.target.value)} 
                className="bg-slate-800 border-slate-700 text-white" data-testid="new-col-name" />
              <div className="flex gap-2">
                <Select value={newColType} onValueChange={setNewColType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white flex-1" data-testid="new-col-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="expense"><span className="text-red-400">Koszt</span></SelectItem>
                    <SelectItem value="income"><span className="text-emerald-400">Przychód</span></SelectItem>
                  </SelectContent>
                </Select>
                <input type="color" value={newColColor} onChange={e => setNewColColor(e.target.value)} 
                  className="w-12 h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer" data-testid="new-col-color" />
              </div>
              <Button onClick={handleAddColumn} className="w-full bg-indigo-600 hover:bg-indigo-500" data-testid="add-col-btn">
                <Plus size={16} className="mr-2" /> Dodaj kolumnę
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// KPI Card component
function KPICard({ icon, label, value, color, subtext }) {
  return (
    <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 text-slate-400">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        {subtext && <p className="text-[10px] text-slate-500 mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

// Cost pill component with add button
function CostPill({ cat, value, onClick }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="group px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all hover:scale-105"
      style={{ backgroundColor: cat.color + "10", borderColor: cat.color + "30" }}
      data-testid={`add-cost-${cat.id}`}>
      <span className="text-xs">{cat.icon}</span>
      <span className="text-xs font-medium" style={{ color: cat.color }}>
        {value > 0 ? `-${fmtShort(value)}` : cat.name}
      </span>
      <Plus size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: cat.color }} />
    </button>
  );
}
