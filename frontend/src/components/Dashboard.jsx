import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, ClipboardList, Store, Sparkles,
  LogOut, ChevronRight, Target, Settings, Zap
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_d80f261d-499e-4117-b40a-11f7363e88f3/artifacts/gvqot30h_ecommify%20logo.png";

const MENU_ITEMS = [
  { id: "wyniki", title: "WYNIKI", desc: "Przychody, zyski, ROI", icon: BarChart3, color: "#6366f1", accent: "rgba(99,102,241," },
  { id: "tasks", title: "ZADANIA", desc: "Tablica Kanban zespolu", icon: ClipboardList, color: "#f59e0b", accent: "rgba(245,158,11," },
  { id: "stores", title: "SKLEPY", desc: "Shopify & TikTok Ads", icon: Store, color: "#10b981", accent: "rgba(16,185,129," },
  { id: "ai", title: "AI EXPERT", desc: "Marketing GPT-5.2", icon: Sparkles, color: "#ec4899", accent: "rgba(236,72,153," },
];

const SHOPS_PREVIEW = [
  { name: "ecom1", color: "#6366f1" },
  { name: "ecom2", color: "#10b981" },
  { name: "ecom3", color: "#f59e0b" },
  { name: "ecom4", color: "#ec4899" },
];

const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 0 });

const getLevel = (roi) => {
  if (roi > 300) return { name: "LEGENDA", emoji: "V", progress: 100 };
  if (roi > 200) return { name: "ELITA", emoji: "IV", progress: 85 };
  if (roi > 100) return { name: "WOJOWNIK", emoji: "III", progress: 65 };
  if (roi > 50) return { name: "LOWCA", emoji: "II", progress: 45 };
  if (roi > 0) return { name: "ZWIADOWCA", emoji: "I", progress: 25 };
  return { name: "REKRUT", emoji: "0", progress: 5 };
};

export default function Dashboard({ user, onNavigate, onLogout }) {
  const [taskCount, setTaskCount] = useState(0);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getTasks().then((r) => setTaskCount(r.data.filter((t) => t.status !== "done").length)).catch(() => {});
    const now = new Date();
    api.getMonthlyStats({ shop_id: 1, year: now.getFullYear(), month: now.getMonth() + 1 })
      .then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const level = getLevel(stats?.roi || 0);

  return (
    <div className="game-grid min-h-screen p-4 pb-24" data-testid="menu-page">
      {/* ===== HEADER ===== */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8 pt-2">
        <div>
          <img src={LOGO_URL} alt="Ecommify" className="h-10 object-contain mb-3" data-testid="menu-logo" />
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white leading-none">
            Witaj, <span className="text-ecom-primary">{user.name}</span>
          </h1>
          <p className="text-ecom-muted text-sm mt-1.5 flex items-center gap-1.5">
            <Zap size={12} className="text-ecom-warning" /> Centrum dowodzenia
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 pt-1">
          <Badge variant="outline" className="text-[10px] border-ecom-border text-ecom-muted uppercase tracking-wider">{user.role}</Badge>
          <div className="flex gap-2">
            <button onClick={() => onNavigate("settings")} className="w-8 h-8 rounded-lg bg-ecom-card border border-ecom-border flex items-center justify-center text-ecom-muted hover:text-white hover:border-ecom-primary/40 transition-colors" data-testid="menu-settings-btn">
              <Settings size={14} />
            </button>
            <button onClick={onLogout} className="w-8 h-8 rounded-lg bg-ecom-card border border-ecom-border flex items-center justify-center text-ecom-muted hover:text-ecom-danger hover:border-ecom-danger/40 transition-colors" data-testid="menu-logout-btn">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ===== LEVEL BAR ===== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        className="mb-8 p-5 rounded-xl border border-ecom-border relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.05) 0%, #1a1a2e 40%, rgba(16,185,129,0.03) 100%)" }}
        data-testid="level-bar"
      >
        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="scan-line-anim absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-ecom-primary/30 to-transparent" />
        </div>

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border border-ecom-primary/30 bg-ecom-primary/10 flex items-center justify-center">
              <Target size={18} className="text-ecom-primary" />
            </div>
            <div>
              <p className="text-[10px] text-ecom-muted uppercase tracking-[0.25em] font-medium">POZIOM</p>
              <p className="font-heading font-bold text-white text-lg leading-tight">{level.name} <span className="text-ecom-primary text-sm">{level.emoji}</span></p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-ecom-muted uppercase tracking-wider">ROI</p>
            <p className={`font-heading font-bold text-xl tabular-nums ${(stats?.roi || 0) >= 0 ? "text-ecom-success" : "text-ecom-danger"}`}>
              {stats?.roi?.toFixed(1) || "0.0"}%
            </p>
          </div>
        </div>

        {/* XP Bar */}
        <div className="h-2 bg-ecom-border/50 rounded-full overflow-hidden mb-4 relative z-10">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${level.progress}%` }}
            transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
            className="h-full rounded-full relative"
            style={{ background: "linear-gradient(90deg, #6366f1 0%, #10b981 60%, #f59e0b 100%)" }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/20 rounded-full animate-pulse" />
          </motion.div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-4 relative z-10">
          <div>
            <p className="text-ecom-muted text-[10px] uppercase tracking-wider mb-0.5">Zysk netto</p>
            <p className="text-white font-heading font-bold text-lg tabular-nums">{fmtPLN(stats?.total_profit)} <span className="text-xs text-ecom-muted font-normal">zl</span></p>
          </div>
          <div>
            <p className="text-ecom-muted text-[10px] uppercase tracking-wider mb-0.5">Przychod</p>
            <p className="text-white font-heading font-bold text-lg tabular-nums">{fmtPLN(stats?.total_income)} <span className="text-xs text-ecom-muted font-normal">zl</span></p>
          </div>
          <div>
            <p className="text-ecom-muted text-[10px] uppercase tracking-wider mb-0.5">Aktywne</p>
            <p className="text-ecom-warning font-heading font-bold text-lg tabular-nums">{taskCount} <span className="text-xs text-ecom-muted font-normal">zadan</span></p>
          </div>
        </div>
      </motion.div>

      {/* ===== MENU TILES ===== */}
      <div className="grid grid-cols-2 gap-4 mb-6" data-testid="menu-tiles">
        {MENU_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 180, damping: 18 }}
              onClick={() => onNavigate(item.id)}
              className="menu-tile group relative rounded-xl border border-ecom-border p-5 text-left h-[170px] flex flex-col justify-between overflow-hidden"
              style={{ backgroundColor: "#1a1a2e" }}
              data-testid={`menu-tile-${item.id}`}
            >
              {/* Ambient glow on hover */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(ellipse at 20% 20%, ${item.accent}0.12), transparent 70%)` }}
              />

              {/* Top content */}
              <div className="relative z-10">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-3 border transition-colors duration-300"
                  style={{ backgroundColor: `${item.accent}0.08)`, borderColor: `${item.accent}0.15)` }}
                >
                  <Icon size={20} style={{ color: item.color }} className="group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="font-heading font-bold text-white text-lg tracking-wider leading-tight">{item.title}</h3>
                <p className="text-ecom-muted text-[11px] mt-1 leading-snug">{item.desc}</p>
              </div>

              {/* Bottom: stat + arrow */}
              <div className="relative z-10 flex items-center justify-between">
                {item.id === "tasks" && taskCount > 0 && (
                  <span className="text-[10px] font-medium tabular-nums" style={{ color: item.color }}>{taskCount} aktywnych</span>
                )}
                {item.id === "wyniki" && stats && (
                  <span className="text-[10px] font-medium tabular-nums" style={{ color: item.color }}>{fmtPLN(stats.total_income)} zl</span>
                )}
                {item.id !== "tasks" && item.id !== "wyniki" && <span />}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
                  style={{ backgroundColor: `${item.accent}0.1)` }}
                >
                  <ChevronRight size={14} style={{ color: item.color }} />
                </div>
              </div>

              {/* Hover border glow */}
              <div
                className="absolute inset-0 rounded-xl border-2 border-transparent pointer-events-none transition-all duration-300"
                style={{ borderColor: "transparent" }}
              />
              <style>{`
                [data-testid="menu-tile-${item.id}"]:hover > div:last-child {
                  border-color: ${item.color}25 !important;
                  box-shadow: 0 0 24px ${item.accent}0.08), inset 0 0 24px ${item.accent}0.02);
                }
              `}</style>
            </motion.button>
          );
        })}
      </div>

      {/* ===== SHOP QUICK ACCESS ===== */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <p className="text-[10px] text-ecom-muted uppercase tracking-[0.2em] font-medium mb-2 px-1">SZYBKI DOSTEP</p>
        <div className="grid grid-cols-4 gap-2" data-testid="quick-shops">
          {SHOPS_PREVIEW.map((s) => (
            <button
              key={s.name}
              onClick={() => onNavigate("wyniki")}
              className="group py-3.5 rounded-xl border border-ecom-border bg-ecom-card/60 hover:bg-ecom-card text-center transition-all duration-200 hover:border-opacity-60"
              style={{ "--hover-c": s.color }}
              data-testid={`quick-shop-${s.name}`}
            >
              <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1.5 transition-transform duration-200 group-hover:scale-125" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-ecom-muted font-medium group-hover:text-white transition-colors">{s.name}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
