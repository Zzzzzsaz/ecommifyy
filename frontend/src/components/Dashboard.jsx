import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getRank, getNextRank, getRankProgress, TARGET } from "@/lib/ranks";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BarChart3, ClipboardList, Store, Sparkles, LogOut, ChevronRight,
  Target, Settings, Flame, TrendingUp, Crown, Users, CalendarDays,
  Plus, Check, Trash2, ShoppingCart, ArrowUp, ArrowDown
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_d80f261d-499e-4117-b40a-11f7363e88f3/artifacts/gvqot30h_ecommify%20logo.png";
const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (v) => (v || 0) >= 1000 ? ((v / 1000).toFixed(1) + "k") : (v || 0).toFixed(0);

const MENU_ITEMS = [
  { id: "wyniki", title: "WYNIKI", desc: "Przychody, zyski, ROI", icon: BarChart3, color: "#6366f1", accent: "rgba(99,102,241," },
  { id: "orders", title: "ZAMOWIENIA", desc: "Zamowienia i ewidencja", icon: ShoppingCart, color: "#10b981", accent: "rgba(16,185,129," },
  { id: "calendar", title: "KALENDARZ", desc: "Przypomnienia i notatki", icon: CalendarDays, color: "#f59e0b", accent: "rgba(245,158,11," },
  { id: "stores", title: "SKLEPY", desc: "Shopify & TikTok", icon: Store, color: "#8b5cf6", accent: "rgba(139,92,246," },
  { id: "ai", title: "AI EXPERT", desc: "Marketing GPT-5.2", icon: Sparkles, color: "#ec4899", accent: "rgba(236,72,153," },
];

const ConfettiEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-[60]">
    {Array.from({ length: 50 }, (_, i) => (
      <div key={i} className="confetti-piece" style={{ left: Math.random() * 100 + "%", animationDelay: Math.random() * 1.5 + "s", animationDuration: (Math.random() * 2 + 2) + "s", backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#FFD700"][i % 5], width: Math.random() * 8 + 4 + "px", height: Math.random() * 8 + 4 + "px", borderRadius: Math.random() > 0.5 ? "50%" : "2px" }} />
    ))}
  </div>
);

export default function Dashboard({ user, onNavigate, onLogout }) {
  const [stats, setStats] = useState(null);
  const [taskCount, setTaskCount] = useState(0);
  const [reminders, setReminders] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [showRankUp, setShowRankUp] = useState(false);
  const [rankUpData, setRankUpData] = useState(null);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [remForm, setRemForm] = useState({ title: "", date: "" });

  useEffect(() => {
    const now = new Date();
    api.getCombinedStats({ year: now.getFullYear(), month: now.getMonth() + 1 }).then((r) => {
      const prev = sessionStorage.getItem("ec_rank");
      const curr = getRank(r.data.total_income);
      if (prev && prev !== curr.name) { setRankUpData(curr); setShowRankUp(true); setTimeout(() => setShowRankUp(false), 4000); }
      sessionStorage.setItem("ec_rank", curr.name);
      setStats(r.data);
    }).catch(() => {});
    api.getTasks().then((r) => setTaskCount(r.data.filter((t) => t.status !== "done").length)).catch(() => {});
    api.getReminders().then((r) => setReminders(r.data)).catch(() => {});
    api.getWeeklyStats().then((r) => setWeekly(r.data)).catch(() => {});
  }, []);

  const addReminder = async () => {
    if (!remForm.title || !remForm.date) { toast.error("Wypelnij pola"); return; }
    await api.createReminder({ ...remForm, created_by: user.name });
    const r = await api.getReminders();
    setReminders(r.data);
    setShowAddReminder(false);
    setRemForm({ title: "", date: "" });
    toast.success("Przypomnienie dodane!");
  };

  const toggleReminder = async (id, done) => {
    await api.updateReminder(id, { done: !done });
    const r = await api.getReminders();
    setReminders(r.data);
  };

  const deleteReminder = async (id) => {
    await api.deleteReminder(id);
    setReminders((p) => p.filter((r) => r.id !== id));
  };

  const rank = getRank(stats?.total_income || 0);
  const nextRank = getNextRank(stats?.total_income || 0);
  const rp = getRankProgress(stats?.total_income || 0);
  const tp = stats ? Math.min((stats.total_income / TARGET) * 100, 100) : 0;
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

  const upcomingReminders = reminders.filter((r) => !r.done && r.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const overdueReminders = reminders.filter((r) => !r.done && r.date < todayStr);

  return (
    <div className="game-grid min-h-screen p-4 pb-24" data-testid="menu-page">
      <AnimatePresence>
        {showRankUp && rankUpData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.3, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="text-center">
              <p className="font-heading text-4xl font-bold text-ecom-warning mb-6 tracking-[0.3em] rank-up-text">RANK UP!</p>
              <div className="w-28 h-28 rounded-2xl border-3 mx-auto flex items-center justify-center font-heading font-bold text-4xl rank-up-badge" style={{ borderColor: rankUpData.color, color: rankUpData.color, background: rankUpData.color + "15", boxShadow: `0 0 60px ${rankUpData.color}40` }}>{rankUpData.icon}</div>
              <p className="font-heading font-bold text-white text-2xl mt-5">{rankUpData.name}</p>
            </motion.div>
            <ConfettiEffect />
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-5 pt-2">
        <div>
          <img src={LOGO_URL} alt="Ecommify" className="h-10 object-contain mb-2" data-testid="menu-logo" />
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white leading-none">Witaj, <span className="text-ecom-primary">{user.name}</span></h1>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => onNavigate("settings")} className="w-8 h-8 rounded-lg bg-ecom-card border border-ecom-border flex items-center justify-center text-ecom-muted hover:text-white transition-colors" data-testid="menu-settings-btn"><Settings size={14} /></button>
          <button onClick={onLogout} className="w-8 h-8 rounded-lg bg-ecom-card border border-ecom-border flex items-center justify-center text-ecom-muted hover:text-ecom-danger transition-colors" data-testid="menu-logout-btn"><LogOut size={14} /></button>
        </div>
      </motion.div>

      {/* RANK + TARGET */}
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.06 }}
        className="mb-3 p-4 rounded-xl border relative overflow-hidden" style={{ borderColor: rank.color + "30", background: `linear-gradient(135deg, ${rank.color}08, #1a1a2e 50%)` }} data-testid="rank-card">
        <div className="scan-line-anim absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-xl border-2 flex items-center justify-center font-heading font-bold text-xl shrink-0" style={{ borderColor: rank.color, color: rank.color, background: rank.color + "12" }}>{rank.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between"><p className="font-heading font-bold text-white text-base">{rank.name}</p><span className="text-[10px] text-ecom-muted tabular-nums">{tp.toFixed(1)}% z 250k</span></div>
            {nextRank && <div className="mt-1"><div className="h-1.5 bg-ecom-border/50 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${rp}%` }} transition={{ duration: 1.5 }} className="h-full rounded-full" style={{ backgroundColor: rank.color }} /></div><p className="text-[9px] text-ecom-muted mt-0.5 tabular-nums">{fmtK(stats?.total_income)} / {fmtK(nextRank.min)} zl do {nextRank.name}</p></div>}
          </div>
        </div>
      </motion.div>

      {/* REMINDERS */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-3 p-4 rounded-xl bg-ecom-card border border-ecom-border" data-testid="reminders-section">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5"><CalendarDays size={14} className="text-ecom-primary" /><span className="text-[10px] text-ecom-muted uppercase tracking-wider font-semibold">PRZYPOMNIENIA</span></div>
          <button onClick={() => setShowAddReminder(true)} className="text-ecom-primary hover:text-white" data-testid="add-reminder-btn"><Plus size={16} /></button>
        </div>
        {overdueReminders.length > 0 && overdueReminders.map((r) => (
          <div key={r.id} className="flex items-center gap-2 py-1.5 border-l-2 border-ecom-danger pl-2 mb-1 rounded-r bg-ecom-danger/5">
            <button onClick={() => toggleReminder(r.id, r.done)} className="w-4 h-4 rounded border border-ecom-danger shrink-0" />
            <span className="text-xs text-ecom-danger flex-1 truncate">{r.title}</span>
            <span className="text-[9px] text-ecom-danger tabular-nums">{r.date.slice(5)}</span>
            <button onClick={() => deleteReminder(r.id)} className="text-ecom-muted hover:text-ecom-danger"><Trash2 size={10} /></button>
          </div>
        ))}
        {upcomingReminders.length > 0 ? upcomingReminders.map((r) => (
          <div key={r.id} className="flex items-center gap-2 py-1.5">
            <button onClick={() => toggleReminder(r.id, r.done)} className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${r.done ? "bg-ecom-success border-ecom-success" : "border-ecom-border"}`}>
              {r.done && <Check size={10} className="text-white" />}
            </button>
            <span className={`text-xs flex-1 truncate ${r.done ? "line-through text-ecom-muted" : "text-white"}`}>{r.title}</span>
            <span className="text-[9px] text-ecom-muted tabular-nums">{r.date === todayStr ? "Dzisiaj" : r.date.slice(5)}</span>
            <button onClick={() => deleteReminder(r.id)} className="text-ecom-muted hover:text-ecom-danger"><Trash2 size={10} /></button>
          </div>
        )) : <p className="text-ecom-muted text-[10px]">Brak przypomnienek</p>}
      </motion.div>

      {/* TODAY + WEEKLY */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }}>
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <p className="text-[9px] text-ecom-muted uppercase tracking-[0.2em] font-semibold">DZISIAJ</p>
          <div className="flex items-center gap-2">
            {stats?.streak > 0 && <span className="flex items-center gap-0.5 text-[9px] text-orange-400 font-bold"><Flame size={10} />{stats.streak}d</span>}
            <span className="flex items-center gap-0.5 text-[9px] text-ecom-primary font-bold"><Users size={10} />{fmtPLN(td?.profit_pp || 0)} /os</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[{ l: "Przychod", v: td?.income, c: "text-white" }, { l: "Ads", v: td?.ads, c: "text-ecom-danger" }, { l: "Zysk", v: td?.profit, c: (td?.profit || 0) >= 0 ? "text-ecom-success" : "text-ecom-danger" }, { l: "Na leb", v: td?.profit_pp, c: "text-ecom-primary" }].map((s, i) => (
            <Card key={i} className="bg-ecom-card/60 border-ecom-border"><CardContent className="p-2"><p className="text-ecom-muted text-[8px] uppercase tracking-wider">{s.l}</p><p className={`font-heading font-bold text-xs tabular-nums ${s.c}`}>{fmtPLN(s.v || 0)}</p></CardContent></Card>
          ))}
        </div>
        {weekly && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <Card className="bg-ecom-card/60 border-ecom-border"><CardContent className="p-2">
              <p className="text-[8px] text-ecom-muted uppercase">Ten tydzien</p>
              <p className="text-white font-heading font-bold text-xs tabular-nums">{fmtPLN(weekly.current.income)}</p>
              <p className="flex items-center gap-0.5 text-[9px] tabular-nums" style={{ color: weekly.income_change >= 0 ? "#10b981" : "#ef4444" }}>{weekly.income_change >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}{Math.abs(weekly.income_change)}%</p>
            </CardContent></Card>
            <Card className="bg-ecom-card/60 border-ecom-border"><CardContent className="p-2">
              <p className="text-[8px] text-ecom-muted uppercase">Zysk tyg.</p>
              <p className={`font-heading font-bold text-xs tabular-nums ${weekly.current.profit >= 0 ? "text-ecom-success" : "text-ecom-danger"}`}>{fmtPLN(weekly.current.profit)}</p>
              <p className="flex items-center gap-0.5 text-[9px] tabular-nums" style={{ color: weekly.profit_change >= 0 ? "#10b981" : "#ef4444" }}>{weekly.profit_change >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}{Math.abs(weekly.profit_change)}%</p>
            </CardContent></Card>
          </div>
        )}
      </motion.div>

      {/* MENU TILES */}
      <div className="grid grid-cols-2 gap-2.5 mb-4" data-testid="menu-tiles">
        {MENU_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.button key={item.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05, type: "spring", stiffness: 180, damping: 18 }}
              onClick={() => onNavigate(item.id)} className="menu-tile group relative rounded-xl border border-ecom-border p-3.5 text-left h-[110px] flex flex-col justify-between overflow-hidden" style={{ backgroundColor: "#1a1a2e" }} data-testid={`menu-tile-${item.id}`}>
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(ellipse at 20% 20%, ${item.accent}0.1), transparent 70%)` }} />
              <div className="relative z-10">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5" style={{ backgroundColor: `${item.accent}0.08)` }}><Icon size={16} style={{ color: item.color }} /></div>
                <h3 className="font-heading font-bold text-white text-xs tracking-wider">{item.title}</h3>
                <p className="text-ecom-muted text-[9px]">{item.desc}</p>
              </div>
              <ChevronRight size={12} className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-60 transition-all" style={{ color: item.color }} />
            </motion.button>
          );
        })}
        {/* MARGIN CALC TILE */}
        <motion.button initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          onClick={() => setShowMargin(true)} className="menu-tile group rounded-xl border border-ecom-border p-3.5 text-left h-[110px] flex flex-col justify-between" style={{ backgroundColor: "#1a1a2e" }} data-testid="menu-tile-margin">
          <div><div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 bg-cyan-500/10"><Calculator size={16} className="text-cyan-400" /></div>
          <h3 className="font-heading font-bold text-white text-xs tracking-wider">MARZA</h3><p className="text-ecom-muted text-[9px]">Kalkulator marzy</p></div>
        </motion.button>
      </div>

      {/* BEST DAY */}
      {stats?.best_day && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="p-2.5 rounded-xl bg-ecom-card/40 border border-ecom-border/50 flex items-center gap-2" data-testid="best-day-badge">
        <Crown size={14} className="text-ecom-warning shrink-0" /><p className="text-[10px] text-ecom-muted">Najlepszy dzien: <span className="text-white font-medium">{stats.best_day}</span> - <span className="text-ecom-success tabular-nums">{fmtPLN(stats.days.find(d => d.date === stats.best_day)?.profit || 0)}</span></p>
      </motion.div>}

      {/* ADD REMINDER DIALOG */}
      <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-xs" data-testid="add-reminder-dialog">
          <DialogHeader><DialogTitle className="font-heading text-white">Nowe przypomnienie</DialogTitle><DialogDescription className="text-ecom-muted text-xs">Dodaj zadanie lub termin</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-1">
            <Input placeholder="Tytul (np. Wyslac faktury)" value={remForm.title} onChange={(e) => setRemForm(f => ({ ...f, title: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="reminder-title" />
            <Input type="date" value={remForm.date} onChange={(e) => setRemForm(f => ({ ...f, date: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="reminder-date" />
            <Button onClick={addReminder} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="reminder-save">Dodaj</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MARGIN CALCULATOR DIALOG */}
      <Dialog open={showMargin} onOpenChange={setShowMargin}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-xs" data-testid="margin-dialog">
          <DialogHeader><DialogTitle className="font-heading text-white">Kalkulator marzy</DialogTitle><DialogDescription className="text-ecom-muted text-xs">Oblicz marze i narzut</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-1">
            <Input type="number" placeholder="Cena zakupu (zl)" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} className="bg-ecom-bg border-ecom-border text-white" data-testid="margin-buy" />
            <Input type="number" placeholder="Cena sprzedazy (zl)" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="bg-ecom-bg border-ecom-border text-white" data-testid="margin-sell" />
            {(bp > 0 || sp > 0) && (
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-ecom-border/20 text-center"><p className="text-[8px] text-ecom-muted uppercase">Marza</p><p className="text-ecom-success font-heading font-bold text-sm">{marginPct.toFixed(1)}%</p></div>
                <div className="p-2 rounded-lg bg-ecom-border/20 text-center"><p className="text-[8px] text-ecom-muted uppercase">Narzut</p><p className="text-ecom-primary font-heading font-bold text-sm">{markupPct.toFixed(1)}%</p></div>
                <div className="p-2 rounded-lg bg-ecom-border/20 text-center"><p className="text-[8px] text-ecom-muted uppercase">Zysk/szt</p><p className="text-white font-heading font-bold text-sm">{profitUnit.toFixed(2)}</p></div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
