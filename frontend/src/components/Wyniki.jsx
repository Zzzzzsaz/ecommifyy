import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { getRank } from "@/lib/ranks";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2, ChevronDown, Trash2, Download, Settings2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MONTHS_PL = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
const DAYS_PL = ["Nd", "Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";
const fmtShort = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const COST_CATEGORIES = [
  { id: "tiktok", name: "TikTok", color: "#00f2ea" },
  { id: "meta", name: "Meta", color: "#0084ff" },
  { id: "google", name: "Google", color: "#fbbc04" },
  { id: "zwroty", name: "Zwroty", color: "#f97316" },
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
  const [addDialog, setAddDialog] = useState({ open: false, type: null, category: null, date: null, shopId: 1 });
  const [columnDialog, setColumnDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState({ open: false, date: null, shopId: null });
  
  // Form
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
    } catch { toast.error("Blad ladowania"); }
    finally { setLoading(false); }
  }, [shop, year, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const toggleDay = (date) => setExpandedDays(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });

  const openAddDialog = (type, category, date, shopId) => {
    setAddDialog({ open: true, type, category, date, shopId });
    setAmount("");
    setDesc("");
  };

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Podaj kwote"); return; }
    setSaving(true);
    try {
      if (addDialog.type === "income") {
        await api.createIncome({ amount: val, date: addDialog.date, description: desc || "Przychod", shop_id: addDialog.shopId });
      } else {
        await api.createCost({ date: addDialog.date, shop_id: addDialog.shopId, category: addDialog.category, amount: val, description: desc || "" });
      }
      toast.success("Zapisano!");
      setAddDialog({ open: false, type: null, category: null, date: null, shopId: 1 });
      fetchStats();
    } catch { toast.error("Blad"); }
    finally { setSaving(false); }
  };

  // Details dialog
  const openDetails = async (date, shopId) => {
    setDetailDialog({ open: true, date, shopId });
    setDetailLoading(true);
    try {
      const [inc, costs] = await Promise.all([
        api.getIncomes({ shop_id: shopId, date }),
        api.getCosts({ shop_id: shopId, date })
      ]);
      setDetails({ incomes: inc.data, costs: costs.data });
    } catch { toast.error("Blad"); }
    finally { setDetailLoading(false); }
  };

  const refreshDetails = async () => {
    if (!detailDialog.date || !detailDialog.shopId) return;
    try {
      const [inc, costs] = await Promise.all([
        api.getIncomes({ shop_id: detailDialog.shopId, date: detailDialog.date }),
        api.getCosts({ shop_id: detailDialog.shopId, date: detailDialog.date })
      ]);
      setDetails({ incomes: inc.data, costs: costs.data });
    } catch {}
  };

  const deleteIncome = async (id) => {
    if (!window.confirm("Usunac ten przychod?")) return;
    try {
      await api.deleteIncome(id);
      toast.success("Usunieto!");
      refreshDetails();
      fetchStats();
    } catch { toast.error("Blad usuwania"); }
  };

  const deleteCost = async (id) => {
    if (!window.confirm("Usunac ten koszt?")) return;
    try {
      await api.deleteCost(id);
      toast.success("Usunieto!");
      refreshDetails();
      fetchStats();
    } catch { toast.error("Blad usuwania"); }
  };

  // Custom columns
  const handleAddColumn = async () => {
    if (!newColName.trim()) { toast.error("Podaj nazwe"); return; }
    try {
      await api.createCustomColumn({ name: newColName, column_type: newColType, color: newColColor });
      toast.success("Dodano!");
      setNewColName("");
      fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || "Blad"); }
  };

  const handleDeleteColumn = async (id, name) => {
    if (!window.confirm(`Usunac kolumne "${name}"?`)) return;
    try {
      await api.deleteCustomColumn(id);
      toast.success("Usunieto!");
      fetchStats();
    } catch { toast.error("Blad"); }
  };

  const getDayName = (d) => DAYS_PL[new Date(d + "T12:00:00").getDay()];
  const getDayNum = (d) => parseInt(d.split("-")[2], 10);
  const isAll = shop === 0;
  const shopName = (id) => shops.find(s => s.id === id)?.name || `Sklep ${id}`;
  const shopColor = (id) => shops.find(s => s.id === id)?.color || "#6366f1";

  const getCatInfo = (cat) => {
    const c = COST_CATEGORIES.find(x => x.id === cat);
    if (c) return c;
    const custom = customColumns.find(x => x.name === cat);
    if (custom) return { id: cat, name: cat, color: custom.color };
    return { id: cat, name: cat, color: "#888" };
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-28" data-testid="wyniki-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Wyniki</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setColumnDialog(true)} className="border-slate-700 text-slate-300" data-testid="manage-columns-btn">
            <Settings2 size={14} className="mr-1" /> Kolumny
          </Button>
          <Button size="sm" variant="outline" onClick={() => api.downloadExcel(year, month, shop > 0 ? shop : null)} className="border-slate-700 text-slate-300" data-testid="export-excel-btn">
            <Download size={14} className="mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Shop tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button onClick={() => setShop(0)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${shop === 0 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          data-testid="wyniki-tab-all">
          Wszystkie
        </button>
        {shops.map(s => (
          <button key={s.id} onClick={() => setShop(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${shop === s.id ? "text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            style={shop === s.id ? { backgroundColor: s.color } : {}}
            data-testid={`wyniki-tab-${s.id}`}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Button size="icon" variant="ghost" onClick={prevMonth} className="text-slate-400" data-testid="wyniki-prev"><ChevronLeft size={20} /></Button>
        <span className="text-lg font-semibold text-white min-w-[160px] text-center">{MONTHS_PL[month - 1]} {year}</span>
        <Button size="icon" variant="ghost" onClick={nextMonth} className="text-slate-400" data-testid="wyniki-next"><ChevronRight size={20} /></Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : stats && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Przychod</p>
                <p className="text-lg font-bold text-white">{fmtPLN(stats.total_income)}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Koszty reklam</p>
                <p className="text-lg font-bold text-red-400">{fmtPLN(stats.total_ads)}</p>
                <p className="text-[10px] text-slate-600">TT:{fmtShort(stats.total_tiktok)} M:{fmtShort(stats.total_meta)} G:{fmtShort(stats.total_google)}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Zysk</p>
                <p className={`text-lg font-bold ${stats.total_profit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtPLN(stats.total_profit)}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Na leb</p>
                <p className="text-lg font-bold text-indigo-400">{fmtPLN(stats.profit_per_person)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Days */}
          <div className="space-y-2">
            {stats.days?.map(day => {
              const hasData = day.income > 0 || day.ads_total > 0 || day.zwroty > 0;
              const expanded = expandedDays.has(day.date);
              const profit = day.profit || 0;
              const currentShopId = isAll ? 1 : shop;

              if (!hasData && !isAll) return null;

              return (
                <div key={day.date} className={`rounded-xl border ${hasData ? "bg-slate-900 border-slate-800" : "bg-slate-900/50 border-slate-800/50"}`} data-testid={`wyniki-day-${day.date}`}>
                  {/* Day row */}
                  <div className={`p-3 flex items-center justify-between ${isAll && hasData ? "cursor-pointer" : ""}`} onClick={() => isAll && hasData && toggleDay(day.date)}>
                    <div className="flex items-center gap-3">
                      {/* Date */}
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex flex-col items-center justify-center">
                        <span className="text-sm font-bold text-white">{getDayNum(day.date)}</span>
                        <span className="text-[9px] text-slate-500">{getDayName(day.date)}</span>
                      </div>
                      {/* Income */}
                      <div>
                        <span className="text-white font-semibold">{fmtShort(day.income)} zl</span>
                        <span className="text-slate-500 text-xs ml-2">netto: {fmtShort(day.netto)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Cost breakdown */}
                      {hasData && (
                        <div className="hidden md:flex items-center gap-1 text-xs">
                          {day.tiktok_ads > 0 && <span className="text-cyan-400">TT:-{fmtShort(day.tiktok_ads)}</span>}
                          {day.meta_ads > 0 && <span className="text-blue-400">M:-{fmtShort(day.meta_ads)}</span>}
                          {day.google_ads > 0 && <span className="text-yellow-400">G:-{fmtShort(day.google_ads)}</span>}
                          {day.zwroty > 0 && <span className="text-orange-400">Zwr:-{fmtShort(day.zwroty)}</span>}
                        </div>
                      )}

                      {/* Profit */}
                      <div className={`px-2 py-1 rounded text-sm font-bold ${profit >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {profit >= 0 ? "+" : ""}{fmtShort(profit)}
                      </div>

                      {/* Na leb */}
                      <div className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 text-xs font-medium">
                        {fmtShort(day.profit_pp)}/os
                      </div>

                      {/* Actions for single shop */}
                      {!isAll && (
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openDetails(day.date, shop); }}
                            className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white text-xs" data-testid={`details-${day.date}`}>
                            Szczegoly
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openAddDialog("income", null, day.date, shop); }}
                            className="px-2 py-1 rounded bg-green-600 text-white text-xs" data-testid={`add-income-${day.date}`}>
                            +Przychod
                          </button>
                        </div>
                      )}

                      {isAll && hasData && <ChevronDown size={16} className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />}
                    </div>
                  </div>

                  {/* Cost buttons row */}
                  {!isAll && (
                    <div className="px-3 pb-3 flex flex-wrap gap-2">
                      {COST_CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => openAddDialog("cost", cat.id, day.date, shop)}
                          className="px-2 py-1 rounded text-xs font-medium border transition-colors hover:opacity-80"
                          style={{ borderColor: cat.color + "50", color: cat.color, backgroundColor: cat.color + "10" }}
                          data-testid={`add-cost-${cat.id}-${day.date}`}>
                          + {cat.name}
                        </button>
                      ))}
                      {customColumns.filter(c => c.column_type === "expense").map(cc => (
                        <button key={cc.id} onClick={() => openAddDialog("cost", cc.name, day.date, shop)}
                          className="px-2 py-1 rounded text-xs font-medium border transition-colors hover:opacity-80"
                          style={{ borderColor: cc.color + "50", color: cc.color, backgroundColor: cc.color + "10" }}>
                          + {cc.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Expanded shops */}
                  <AnimatePresence>
                    {isAll && expanded && day.shops && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-800">
                        <div className="p-3 space-y-2">
                          {day.shops.filter(s => s.income > 0 || s.ads_total > 0).map(s => (
                            <div key={s.shop_id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border-l-4" style={{ borderLeftColor: shopColor(s.shop_id) }}>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium" style={{ color: shopColor(s.shop_id) }}>{shopName(s.shop_id)}</span>
                                <span className="text-xs text-slate-400">{fmtShort(s.income)} zl</span>
                                <span className="text-xs text-red-400">-{fmtShort(s.ads_total)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${s.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {s.profit >= 0 ? "+" : ""}{fmtShort(s.profit)}
                                </span>
                                <button onClick={() => openAddDialog("income", null, day.date, s.shop_id)}
                                  className="px-2 py-1 rounded bg-green-600 text-white text-xs">+P</button>
                                <button onClick={() => openDetails(day.date, s.shop_id)}
                                  className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs">Szczegoly</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialog.open} onOpenChange={o => setAddDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {addDialog.type === "income" ? "Dodaj przychod" : `Dodaj koszt: ${getCatInfo(addDialog.category).name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="text-sm text-slate-400">
              {addDialog.date} - <span style={{ color: shopColor(addDialog.shopId) }}>{shopName(addDialog.shopId)}</span>
            </div>
            {isAll && (
              <Select value={String(addDialog.shopId)} onValueChange={v => setAddDialog(d => ({ ...d, shopId: parseInt(v) }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {shops.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input type="number" placeholder="Kwota (PLN)" value={amount} onChange={e => setAmount(e.target.value)} 
              className="bg-slate-800 border-slate-700 text-white" autoFocus data-testid="add-amount" />
            <Input placeholder="Opis (opcjonalnie)" value={desc} onChange={e => setDesc(e.target.value)} 
              className="bg-slate-800 border-slate-700 text-white" data-testid="add-desc" />
            <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500" data-testid="add-save">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog - EDYTOWANIE I USUWANIE */}
      <Dialog open={detailDialog.open} onOpenChange={o => setDetailDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Szczegoly: {detailDialog.date}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
          ) : (
            <div className="space-y-4 mt-2">
              {/* Incomes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-400">Przychody ({details.incomes.length})</p>
                  <button onClick={() => { setDetailDialog(d => ({ ...d, open: false })); openAddDialog("income", null, detailDialog.date, detailDialog.shopId); }}
                    className="px-2 py-1 rounded bg-green-600 text-white text-xs">+ Dodaj</button>
                </div>
                {details.incomes.length > 0 ? details.incomes.map(i => (
                  <div key={i.id} className="flex items-center justify-between p-2 mb-1 rounded bg-slate-800">
                    <div>
                      <p className="text-white text-sm">{fmtPLN(i.amount)}</p>
                      <p className="text-slate-500 text-xs">{i.description || "-"}</p>
                    </div>
                    <button onClick={() => deleteIncome(i.id)} className="p-2 text-slate-500 hover:text-red-400" data-testid={`delete-income-${i.id}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )) : <p className="text-slate-500 text-sm">Brak przychodow</p>}
              </div>

              {/* Costs */}
              <div>
                <p className="text-sm font-medium text-red-400 mb-2">Koszty ({details.costs.length})</p>
                {details.costs.length > 0 ? details.costs.map(c => {
                  const info = getCatInfo(c.category);
                  return (
                    <div key={c.id} className="flex items-center justify-between p-2 mb-1 rounded bg-slate-800">
                      <div>
                        <p className="text-sm" style={{ color: info.color }}>{fmtPLN(c.amount)}</p>
                        <p className="text-slate-500 text-xs">{info.name}{c.description ? ` - ${c.description}` : ""}</p>
                      </div>
                      <button onClick={() => deleteCost(c.id)} className="p-2 text-slate-500 hover:text-red-400" data-testid={`delete-cost-${c.id}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                }) : <p className="text-slate-500 text-sm">Brak kosztow</p>}

                {/* Quick add cost buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {COST_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => { setDetailDialog(d => ({ ...d, open: false })); openAddDialog("cost", cat.id, detailDialog.date, detailDialog.shopId); }}
                      className="px-2 py-1 rounded text-xs border"
                      style={{ borderColor: cat.color + "50", color: cat.color }}>
                      + {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Columns Dialog */}
      <Dialog open={columnDialog} onOpenChange={setColumnDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Zarzadzaj kolumnami</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Existing */}
            {customColumns.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase">Twoje kolumny</p>
                {customColumns.map(cc => (
                  <div key={cc.id} className="flex items-center justify-between p-2 rounded bg-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: cc.color }} />
                      <span className="text-white text-sm">{cc.name}</span>
                      <span className={`text-xs ${cc.column_type === "income" ? "text-green-400" : "text-red-400"}`}>
                        ({cc.column_type === "income" ? "przychod" : "koszt"})
                      </span>
                    </div>
                    <button onClick={() => handleDeleteColumn(cc.id, cc.name)} className="p-1 text-slate-500 hover:text-red-400" data-testid={`delete-col-${cc.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add new */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <p className="text-xs text-slate-500 uppercase">Dodaj nowa</p>
              <Input placeholder="Nazwa" value={newColName} onChange={e => setNewColName(e.target.value)} 
                className="bg-slate-800 border-slate-700 text-white" data-testid="new-col-name" />
              <div className="flex gap-2">
                <Select value={newColType} onValueChange={setNewColType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white flex-1" data-testid="new-col-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="expense">Koszt</SelectItem>
                    <SelectItem value="income">Przychod</SelectItem>
                  </SelectContent>
                </Select>
                <input type="color" value={newColColor} onChange={e => setNewColColor(e.target.value)} 
                  className="w-12 h-10 rounded border border-slate-700 bg-slate-800 cursor-pointer" data-testid="new-col-color" />
              </div>
              <Button onClick={handleAddColumn} className="w-full bg-indigo-600 hover:bg-indigo-500" data-testid="add-col-btn">
                + Dodaj kolumne
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
