import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getRank, getNextRank, getRankProgress, TARGET } from "@/lib/ranks";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3, ClipboardList, Store, Sparkles, LogOut, ChevronRight,
  Target, Settings, Flame, TrendingUp, Crown, Users
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_d80f261d-499e-4117-b40a-11f7363e88f3/artifacts/gvqot30h_ecommify%20logo.png";
const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (v) => (v || 0) >= 1000 ? ((v / 1000).toFixed(1) + "k") : (v || 0).toFixed(0);

const MENU_ITEMS = [
  { id: "wyniki", title: "WYNIKI", desc: "Przychody, zyski, ROI", icon: BarChart3, color: "#6366f1", accent: "rgba(99,102,241," },
  { id: "tasks", title: "ZADANIA", desc: "Tablica Kanban zespolu", icon: ClipboardList, color: "#f59e0b", accent: "rgba(245,158,11," },
  { id: "stores", title: "SKLEPY", desc: "Shopify & TikTok Ads", icon: Store, color: "#10b981", accent: "rgba(16,185,129," },
  { id: "ai", title: "AI EXPERT", desc: "Marketing GPT-5.2", icon: Sparkles, color: "#ec4899", accent: "rgba(236,72,153," },
];

const ConfettiEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-[60]">
    {Array.from({ length: 50 }, (_, i) => (
      <div key={i} className="confetti-piece" style={{
        left: Math.random() * 100 + "%", animationDelay: Math.random() * 1.5 + "s",
        animationDuration: (Math.random() * 2 + 2) + "s",
        backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#FFD700"][i % 5],
        width: Math.random() * 8 + 4 + "px", height: Math.random() * 8 + 4 + "px",
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      }} />
    ))}
  </div>
);

export default function Dashboard({ user, onNavigate, onLogout }) {
  const [stats, setStats] = useState(null);
  const [taskCount, setTaskCount] = useState(0);
  const [showRankUp, setShowRankUp] = useState(false);
  const [rankUpData, setRankUpData] = useState(null);

  useEffect(() => {
    const now = new Date();
    api.getCombinedStats({ year: now.getFullYear(), month: now.getMonth() + 1 }).then((r) => {
      const d = r.data;
      const prev = sessionStorage.getItem("ec_rank");
      const curr = getRank(d.total_income);
      if (prev && prev !== curr.name) {
        setRankUpData(curr);
        setShowRankUp(true);
        setTimeout(() => setShowRankUp(false), 4000);
      }
      sessionStorage.setItem("ec_rank", curr.name);
      setStats(d);
    }).catch(() => {});
    api.getTasks().then((r) => setTaskCount(r.data.filter((t) => t.status !== "done").length)).catch(() => {});
  }, []);

  const rank = getRank(stats?.total_income || 0);
  const nextRank = getNextRank(stats?.total_income || 0);
  const rp = getRankProgress(stats?.total_income || 0);
  const tp = stats ? Math.min((stats.total_income / TARGET) * 100, 100) : 0;

  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const td = stats?.days?.find((d) => d.date === todayStr);

  return (
    <div className="game-grid min-h-screen p-4 pb-24" data-testid="menu-page">
      {/* RANK UP OVERLAY */}
      <AnimatePresence>
        {showRankUp && rankUpData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.3, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="text-center">
              <p className="font-heading text-4xl font-bold text-ecom-warning mb-6 tracking-[0.3em] rank-up-text">RANK UP!</p>
              <div className="w-28 h-28 rounded-2xl border-3 mx-auto flex items-center justify-center font-heading font-bold text-4xl rank-up-badge"
                style={{ borderColor: rankUpData.color, color: rankUpData.color, background: rankUpData.color + "15", boxShadow: `0 0 60px ${rankUpData.color}40` }}>
                {rankUpData.icon}
              </div>
              <p className="font-heading font-bold text-white text-2xl mt-5">{rankUpData.name}</p>
            </motion.div>
            <ConfettiEffect />
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-6 pt-2">
        <div>
          <img src={LOGO_URL} alt="Ecommify" className="h-10 object-contain mb-2" data-testid="menu-logo" />
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white leading-none">
            Witaj, <span className="text-ecom-primary">{user.name}</span>
          </h1>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => onNavigate("settings")} className="w-8 h-8 rounded-lg bg-ecom-card border border-ecom-border flex items-center justify-center text-ecom-muted hover:text-white hover:border-ecom-primary/40 transition-colors" data-testid="menu-settings-btn"><Settings size={14} /></button>
          <button onClick={onLogout} className="w-8 h-8 rounded-lg bg-ecom-card border border-ecom-border flex items-center justify-center text-ecom-muted hover:text-ecom-danger hover:border-ecom-danger/40 transition-colors" data-testid="menu-logout-btn"><LogOut size={14} /></button>
        </div>
      </motion.div>

      {/* CS:GO RANK CARD */}
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }}
        className="mb-4 p-5 rounded-xl border relative overflow-hidden"
        style={{ borderColor: rank.color + "30", background: `linear-gradient(135deg, ${rank.color}08, #1a1a2e 50%)` }}
        data-testid="rank-card">
        <div className="scan-line-anim absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-[72px] h-[72px] rounded-xl border-2 flex items-center justify-center font-heading font-bold text-2xl shrink-0"
            style={{ borderColor: rank.color, color: rank.color, background: rank.color + "12", boxShadow: `0 0 24px ${rank.color}20` }}>
            {rank.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-ecom-muted uppercase tracking-[0.25em]">RANGA</p>
            <p className="font-heading font-bold text-white text-xl leading-tight truncate">{rank.name}</p>
            {nextRank && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-ecom-muted mb-1">
                  <span className="tabular-nums">{fmtK(stats?.total_income)} zl</span>
                  <span className="tabular-nums">{fmtK(nextRank.min)} zl - {nextRank.name}</span>
                </div>
                <div className="h-2 bg-ecom-border/50 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${rp}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full rounded-full" style={{ backgroundColor: rank.color, boxShadow: `0 0 8px ${rank.color}60` }} />
                </div>
              </div>
            )}
            {!nextRank && <p className="text-[11px] mt-1 font-medium" style={{ color: rank.color }}>Maksymalny poziom osiagniety!</p>}
          </div>
        </div>
      </motion.div>

      {/* 250K TARGET + FORECAST */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }}
        className="mb-4 p-4 rounded-xl bg-ecom-card border border-ecom-border" data-testid="target-bar">
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5"><Target size={13} className="text-ecom-primary" /><span className="text-[9px] text-ecom-muted uppercase tracking-wider font-semibold">CEL: 250 000 zl</span></div>
          <span className="font-heading font-bold text-white text-sm tabular-nums">{tp.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-ecom-border/50 rounded-full overflow-hidden mb-2">
          <motion.div initial={{ width: 0 }} animate={{ width: `${tp}%` }} transition={{ duration: 2, ease: "easeOut" }}
            className="h-full rounded-full relative" style={{ background: "linear-gradient(90deg, #6366f1 0%, #10b981 50%, #f59e0b 100%)" }}>
            <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/25 rounded-full animate-pulse" />
          </motion.div>
        </div>
        <div className="flex justify-between text-[10px] text-ecom-muted">
          <span className="tabular-nums font-medium text-white">{fmtPLN(stats?.total_income || 0)} zl</span>
          <span>
            {stats?.forecast > 0 && (<><TrendingUp size={10} className="inline mr-0.5 text-ecom-success" />Prognoza: <span className="text-white font-medium tabular-nums">{fmtK(stats.forecast)} zl</span></>)}
          </span>
        </div>
      </motion.div>

      {/* TODAY'S COMBINED + STREAK */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <p className="text-[9px] text-ecom-muted uppercase tracking-[0.2em] font-semibold">DZISIAJ - WSZYSTKIE SKLEPY</p>
          <div className="flex items-center gap-3">
            {stats?.streak > 0 && <div className="flex items-center gap-1"><Flame size={12} className="text-orange-400" /><span className="text-[10px] text-orange-400 font-bold tabular-nums">{stats.streak}d streak</span></div>}
            <div className="flex items-center gap-1"><Users size={11} className="text-ecom-primary" /><span className="text-[10px] text-ecom-primary font-bold tabular-nums">{fmtPLN(td?.profit_pp || 0)} zl/os</span></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { l: "Przychod", v: td?.income, c: "text-white" },
            { l: "Ads", v: td?.ads, c: "text-ecom-danger" },
            { l: "Zysk", v: td?.profit, c: (td?.profit || 0) >= 0 ? "text-ecom-success" : "text-ecom-danger" },
            { l: "Na leb", v: td?.profit_pp, c: "text-ecom-primary" },
          ].map((s, i) => (
            <Card key={i} className="bg-ecom-card/60 border-ecom-border"><CardContent className="p-2.5">
              <p className="text-ecom-muted text-[8px] uppercase tracking-wider">{s.l}</p>
              <p className={`font-heading font-bold text-sm tabular-nums mt-0.5 ${s.c}`}>{fmtPLN(s.v || 0)}</p>
            </CardContent></Card>
          ))}
        </div>
      </motion.div>

      {/* MENU TILES */}
      <div className="grid grid-cols-2 gap-3 mb-5" data-testid="menu-tiles">
        {MENU_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.button key={item.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06, type: "spring", stiffness: 180, damping: 18 }}
              onClick={() => onNavigate(item.id)}
              className="menu-tile group relative rounded-xl border border-ecom-border p-4 text-left h-[130px] flex flex-col justify-between overflow-hidden"
              style={{ backgroundColor: "#1a1a2e" }}
              data-testid={`menu-tile-${item.id}`}>
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(ellipse at 20% 20%, ${item.accent}0.1), transparent 70%)` }} />
              <div className="relative z-10">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${item.accent}0.08)` }}>
                  <Icon size={18} style={{ color: item.color }} />
                </div>
                <h3 className="font-heading font-bold text-white text-sm tracking-wider">{item.title}</h3>
                <p className="text-ecom-muted text-[10px] mt-0.5">{item.desc}</p>
              </div>
              <div className="relative z-10 flex items-center justify-between">
                {item.id === "tasks" && taskCount > 0 && <span className="text-[10px] font-medium" style={{ color: item.color }}>{taskCount} aktywnych</span>}
                {item.id === "wyniki" && <span className="text-[10px] font-medium tabular-nums" style={{ color: item.color }}>{fmtK(stats?.total_income)} zl</span>}
                {!["tasks", "wyniki"].includes(item.id) && <span />}
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" style={{ color: item.color }} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* BEST DAY */}
      {stats?.best_day && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="p-3 rounded-xl bg-ecom-card/40 border border-ecom-border/50 flex items-center gap-3" data-testid="best-day-badge">
          <Crown size={16} className="text-ecom-warning shrink-0" />
          <div>
            <p className="text-[9px] text-ecom-muted uppercase tracking-wider">Najlepszy dzien</p>
            <p className="text-white text-xs font-medium">{stats.best_day} - <span className="text-ecom-success tabular-nums">{fmtPLN(stats.days.find(d => d.date === stats.best_day)?.profit || 0)} zl zysku</span></p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
