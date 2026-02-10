import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { getRank, TARGET } from "@/lib/ranks";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2, ChevronDown, Crown, Users, TrendingUp, Flame, Target, Trash2, Eye, MessageSquare, Download, StickyNote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Textarea } from "@/components/ui/textarea";

const SHOPS = [
  { id: 1, name: "ecom1", color: "#6366f1" },
  { id: 2, name: "ecom2", color: "#10b981" },
  { id: 3, name: "ecom3", color: "#f59e0b" },
  { id: 4, name: "ecom4", color: "#ec4899" },
];
const MONTHS_PL = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
const DAYS_PL = ["Nd", "Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zl";
const fmtShort = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function Wyniki({ user }) {
  const now = new Date();
  const [shop, setShop] = useState(0); // 0 = WSZYSTKIE
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDays, setOpenDays] = useState(new Set());
  const [dialog, setDialog] = useState({ open: false, type: null, date: null, shopId: 1 });
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = shop === 0
        ? await api.getCombinedStats({ year, month })
        : await api.getMonthlyStats({ shop_id: shop, year, month });
      setStats(r.data);
    } catch { toast.error("Blad ladowania danych"); }
    finally { setLoading(false); }
  }, [shop, year, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const toggleDay = (date) => setOpenDays((prev) => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });

  const openAdd = (type, date, shopId) => { setDialog({ open: true, type, date, shopId }); setAmount(""); setDesc(""); };

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Podaj prawidlowa kwote"); return; }
    setSaving(true);
    try {
      if (dialog.type === "income") {
        await api.createIncome({ amount: val, date: dialog.date, description: desc || "Reczne dodanie", shop_id: dialog.shopId });
      } else {
        await api.createExpense({ amount: val, date: dialog.date, campaign_name: desc || "Reczne dodanie", shop_id: dialog.shopId });
      }
      toast.success("Dodano!");
      setDialog({ open: false, type: null, date: null, shopId: 1 });
      fetchStats();
    } catch { toast.error("Blad zapisu"); }
    finally { setSaving(false); }
  };

  const getDayName = (d) => DAYS_PL[new Date(d + "T12:00:00").getDay()];
  const getDayNum = (d) => parseInt(d.split("-")[2], 10);

  const rank = getRank(stats?.total_income || 0);
  const isAll = shop === 0;
  const dailyTarget = TARGET / (stats?.days?.length || 28);
  const sparkData = stats?.days?.map((d) => ({ v: d.income })) || [];

  const kpis = stats ? [
    { l: "Przychod", v: fmtPLN(stats.total_income), c: "text-white" },
    { l: "Ads", v: fmtPLN(stats.total_ads), c: "text-ecom-danger" },
    { l: "Netto", v: fmtPLN(stats.total_netto), c: "text-ecom-muted" },
    { l: "Zysk", v: fmtPLN(stats.total_profit), c: stats.total_profit >= 0 ? "text-ecom-success" : "text-ecom-danger" },
    { l: "ROI", v: (stats.roi || 0).toFixed(1) + "%", c: (stats.roi || 0) >= 0 ? "text-ecom-success" : "text-ecom-danger" },
    ...(isAll ? [{ l: "Na leb", v: fmtPLN(stats.profit_per_person), c: "text-ecom-primary" }] : []),
  ] : [];

  const shopName = (id) => SHOPS.find(s => s.id === id)?.name || "";
  const shopColor = (id) => SHOPS.find(s => s.id === id)?.color || "#6366f1";

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="wyniki-page">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold text-white tracking-wide">WYNIKI</h1>
          {isAll && stats && (
            <Badge variant="outline" className="text-[9px] tracking-wider" style={{ borderColor: rank.color, color: rank.color }}>{rank.icon} {rank.name}</Badge>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">{user.name}</Badge>
      </div>

      {/* SHOP TABS */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" data-testid="wyniki-shop-tabs">
        <button onClick={() => { setShop(0); setOpenDays(new Set()); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${shop === 0 ? "text-white bg-ecom-primary/15 border-ecom-primary" : "text-ecom-muted border-ecom-border hover:text-white"}`}
          data-testid="wyniki-tab-all">WSZYSTKIE</button>
        {SHOPS.map((s) => (
          <button key={s.id} onClick={() => { setShop(s.id); setOpenDays(new Set()); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors ${shop === s.id ? "text-white border-transparent" : "text-ecom-muted border-ecom-border hover:text-white"}`}
            style={shop === s.id ? { backgroundColor: s.color + "20", borderColor: s.color, color: s.color } : {}}
            data-testid={`wyniki-tab-${s.id}`}>{s.name}</button>
        ))}
      </div>

      {/* MONTH NAV */}
      <div className="flex items-center justify-center gap-4 mb-4" data-testid="wyniki-month-nav">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="text-ecom-muted hover:text-white" data-testid="wyniki-prev"><ChevronLeft size={20} /></Button>
        <span className="font-heading text-lg font-semibold text-white min-w-[160px] text-center">{MONTHS_PL[month - 1]} {year}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="text-ecom-muted hover:text-white" data-testid="wyniki-next"><ChevronRight size={20} /></Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={32} /></div> : stats && (
        <>
          {/* TARGET PROGRESS (only on WSZYSTKIE) */}
          {isAll && (
            <div className="mb-4 p-3 rounded-lg bg-ecom-card/60 border border-ecom-border/50">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-ecom-muted flex items-center gap-1"><Target size={10} /> CEL 250k</span>
                <span className="text-white font-bold tabular-nums">{((stats.total_income / TARGET) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-ecom-border/50 rounded-full overflow-hidden mb-1.5">
                <div className="h-full rounded-full" style={{ width: `${Math.min((stats.total_income / TARGET) * 100, 100)}%`, background: "linear-gradient(90deg, #6366f1, #10b981)" }} />
              </div>
              <div className="flex justify-between text-[9px] text-ecom-muted">
                <span>{stats.forecast > 0 && <><TrendingUp size={9} className="inline text-ecom-success" /> Prognoza: <span className="text-white">{fmtShort(stats.forecast)} zl</span></>}</span>
                <span>{stats.streak > 0 && <><Flame size={9} className="inline text-orange-400" /> {stats.streak}d streak</>}</span>
              </div>
            </div>
          )}

          {/* SPARKLINE */}
          {sparkData.length > 0 && sparkData.some(d => d.v > 0) && (
            <div className="mb-4 h-[50px] rounded-lg overflow-hidden" data-testid="sparkline">
              <ResponsiveContainer width="100%" height={50}>
                <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sparkG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isAll ? "#6366f1" : shopColor(shop)} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={isAll ? "#6366f1" : shopColor(shop)} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={isAll ? "#6366f1" : shopColor(shop)} fill="url(#sparkG)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* KPI CARDS */}
          <div className={`grid ${isAll ? "grid-cols-3 md:grid-cols-6" : "grid-cols-2 md:grid-cols-5"} gap-2 mb-5`} data-testid="wyniki-kpis">
            {kpis.map((k, i) => (
              <Card key={i} className="bg-ecom-card border-ecom-border">
                <CardContent className="p-3">
                  <p className="text-ecom-muted text-[9px] uppercase tracking-widest">{k.l}</p>
                  <p className={`text-base font-heading font-bold tabular-nums mt-0.5 ${k.c}`}>{k.v}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* DAILY LIST */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading text-sm font-semibold text-white">Dni</h2>
            {isAll && <p className="text-[9px] text-ecom-muted">Dzienny cel: {fmtShort(dailyTarget)} zl</p>}
          </div>
          <div className="space-y-1.5" data-testid="wyniki-days">
            {stats.days?.map((day) => {
              const hasData = day.income > 0 || day.ads > 0;
              const isBest = isAll && stats.best_day === day.date;
              const expanded = openDays.has(day.date);
              const aboveTarget = isAll && day.income >= dailyTarget;
              return (
                <div key={day.date} className={`rounded-lg border overflow-hidden ${isBest ? "border-ecom-warning/40 bg-ecom-warning/5" : hasData ? "bg-ecom-card border-ecom-border" : "bg-ecom-card/40 border-ecom-border/40"}`}
                  data-testid={`wyniki-day-${day.date}`}>
                  {/* Day header */}
                  <div className={`flex items-center justify-between p-3 ${isAll ? "cursor-pointer" : ""}`} onClick={() => isAll && toggleDay(day.date)}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isBest && <Crown size={12} className="text-ecom-warning" />}
                        <span className="text-white font-heading font-bold text-lg leading-none w-6">{getDayNum(day.date)}</span>
                        <span className="text-ecom-muted text-[10px]">{getDayName(day.date)}</span>
                      </div>
                      {aboveTarget && <div className="w-1.5 h-1.5 rounded-full bg-ecom-success animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex gap-4 text-xs tabular-nums">
                        <span className="text-white">{fmtShort(day.income)} zl</span>
                        <span className="text-ecom-danger">{fmtShort(day.ads)} zl</span>
                        <span className={day.profit >= 0 ? "text-ecom-success" : "text-ecom-danger"}>{fmtShort(day.profit)} zl</span>
                        {isAll && <span className="text-ecom-primary"><Users size={10} className="inline" /> {fmtShort(day.profit_pp || day.profit / 2)} zl</span>}
                      </div>
                      {!isAll && (
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openAdd("income", day.date, shop); }} className="btn-press flex items-center gap-0.5 text-[9px] font-medium text-ecom-success bg-ecom-success/10 hover:bg-ecom-success/20 px-2 py-1 rounded-md" data-testid={`add-inc-${day.date}`}><Plus size={10} />P</button>
                          <button onClick={(e) => { e.stopPropagation(); openAdd("expense", day.date, shop); }} className="btn-press flex items-center gap-0.5 text-[9px] font-medium text-ecom-danger bg-ecom-danger/10 hover:bg-ecom-danger/20 px-2 py-1 rounded-md" data-testid={`add-exp-${day.date}`}><Plus size={10} />A</button>
                        </div>
                      )}
                      {isAll && <ChevronDown size={14} className={`text-ecom-muted transition-transform ${expanded ? "rotate-180" : ""}`} />}
                    </div>
                  </div>

                  {/* Mobile summary */}
                  <div className="md:hidden px-3 pb-2 grid grid-cols-4 gap-1">
                    <div><p className="text-[8px] text-ecom-muted">Przychod</p><p className="text-white text-[11px] tabular-nums font-medium">{fmtShort(day.income)}</p></div>
                    <div><p className="text-[8px] text-ecom-muted">Ads</p><p className="text-ecom-danger text-[11px] tabular-nums">{fmtShort(day.ads)}</p></div>
                    <div><p className="text-[8px] text-ecom-muted">Zysk</p><p className={`text-[11px] tabular-nums font-medium ${day.profit >= 0 ? "text-ecom-success" : "text-ecom-danger"}`}>{fmtShort(day.profit)}</p></div>
                    {isAll && <div><p className="text-[8px] text-ecom-muted">Na leb</p><p className="text-ecom-primary text-[11px] tabular-nums">{fmtShort(day.profit_pp || day.profit / 2)}</p></div>}
                  </div>

                  {/* EXPANDED: per-shop rows */}
                  <AnimatePresence>
                    {isAll && expanded && day.shops && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="border-t border-ecom-border/30 mx-3" />
                        <div className="p-3 pt-2 space-y-1.5">
                          {day.shops.map((s) => {
                            const sc = shopColor(s.shop_id);
                            return (
                              <div key={s.shop_id} className="flex items-center justify-between py-1.5 pl-3 border-l-2 rounded-r-md bg-ecom-border/5" style={{ borderLeftColor: sc }}>
                                <span className="text-[11px] font-semibold min-w-[50px]" style={{ color: sc }}>{shopName(s.shop_id)}</span>
                                <div className="flex items-center gap-3 text-[10px] tabular-nums">
                                  <span className="text-white">{fmtShort(s.income)}</span>
                                  <span className="text-ecom-danger">{fmtShort(s.ads)}</span>
                                  <span className={s.profit >= 0 ? "text-ecom-success" : "text-ecom-danger"}>{fmtShort(s.profit)}</span>
                                  <button onClick={() => openAdd("income", day.date, s.shop_id)} className="btn-press text-ecom-success bg-ecom-success/10 px-1.5 py-0.5 rounded text-[9px] font-bold" data-testid={`add-inc-${day.date}-${s.shop_id}`}>+P</button>
                                  <button onClick={() => openAdd("expense", day.date, s.shop_id)} className="btn-press text-ecom-danger bg-ecom-danger/10 px-1.5 py-0.5 rounded text-[9px] font-bold" data-testid={`add-exp-${day.date}-${s.shop_id}`}>+A</button>
                                </div>
                              </div>
                            );
                          })}
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

      {/* ADD DIALOG */}
      <Dialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="wyniki-add-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">{dialog.type === "income" ? "Dodaj przychod" : "Dodaj koszt reklamy"}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-ecom-muted text-sm flex items-center gap-2">
                {dialog.date}
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: shopColor(dialog.shopId), color: shopColor(dialog.shopId) }}>{shopName(dialog.shopId)}</Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {isAll && (
              <Select value={String(dialog.shopId)} onValueChange={(v) => setDialog((d) => ({ ...d, shopId: parseInt(v) }))}>
                <SelectTrigger className="bg-ecom-bg border-ecom-border text-white" data-testid="dialog-shop-select"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-ecom-card border-ecom-border">
                  {SHOPS.map((s) => <SelectItem key={s.id} value={String(s.id)}><span style={{ color: s.color }}>{s.name}</span></SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input type="number" placeholder="Kwota (PLN)" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-ecom-bg border-ecom-border text-white" data-testid="wyniki-add-amount" />
            <Input placeholder={dialog.type === "income" ? "Opis" : "Nazwa kampanii"} value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-ecom-bg border-ecom-border text-white" data-testid="wyniki-add-desc" />
            <Button onClick={handleSave} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="wyniki-add-save">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
