import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, ChevronDown, Calendar, Plus, Check, Trash2, AlertCircle } from "lucide-react";

const fmtPLN = (v) => (v || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DATE_PRESETS = [
  { id: "today", label: "Dzisiaj" },
  { id: "yesterday", label: "Wczoraj" },
  { id: "week", label: "Ten tydzień" },
  { id: "month", label: "Ten miesiąc" },
  { id: "last_month", label: "Poprzedni miesiąc" },
];

export default function Dashboard({ user, shops = [], appSettings = {}, onNavigate }) {
  const [dateRange, setDateRange] = useState("today");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [remForm, setRemForm] = useState({ title: "", date: "" });

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchStats();
    api.getReminders().then(r => setReminders(r.data || [])).catch(() => {});
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth() + 1;

      if (dateRange === "last_month") {
        month = month === 1 ? 12 : month - 1;
        year = month === 12 ? year - 1 : year;
      }

      const r = await api.getCombinedStats({ year, month });
      setStats(r.data);
    } catch {}
    finally { setLoading(false); }
  };

  const getDisplayStats = () => {
    if (!stats) return { income: 0, costs: 0, profit: 0, profitPP: 0 };

    if (dateRange === "today" || dateRange === "yesterday") {
      const targetDate = dateRange === "today" 
        ? todayStr 
        : new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const day = stats.days?.find(d => d.date === targetDate);
      const income = day?.income || 0;
      const costs = day?.ads_total || 0;
      const netto = income / 1.23;
      const profit = netto - costs;
      return { income, costs, profit, profitPP: profit / (appSettings?.profit_split || 2) };
    }

    if (dateRange === "week") {
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const weekDays = stats.days?.filter(d => new Date(d.date) >= weekAgo) || [];
      const income = weekDays.reduce((s, d) => s + (d.income || 0), 0);
      const costs = weekDays.reduce((s, d) => s + (d.ads_total || 0), 0);
      const netto = income / 1.23;
      const profit = netto - costs;
      return { income, costs, profit, profitPP: profit / (appSettings?.profit_split || 2) };
    }

    // month or last_month
    const netto = stats.total_income / 1.23;
    const profit = netto - stats.total_ads;
    return { 
      income: stats.total_income, 
      costs: stats.total_ads, 
      profit, 
      profitPP: profit / (appSettings?.profit_split || 2) 
    };
  };

  const displayStats = getDisplayStats();
  const TARGET = appSettings.target_revenue || 250000;
  const progress = stats ? Math.min((stats.total_income / TARGET) * 100, 100) : 0;

  const upcomingReminders = reminders.filter(r => !r.done && r.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const overdueReminders = reminders.filter(r => !r.done && r.date < todayStr);

  const addReminder = async () => {
    if (!remForm.title || !remForm.date) { toast.error("Wypełnij pola"); return; }
    await api.createReminder({ ...remForm, created_by: user.name });
    const r = await api.getReminders();
    setReminders(r.data || []);
    setShowAddReminder(false);
    setRemForm({ title: "", date: "" });
    toast.success("Dodano");
  };

  const toggleReminder = async (id, done) => {
    await api.updateReminder(id, { done: !done });
    const r = await api.getReminders();
    setReminders(r.data || []);
  };

  const deleteReminder = async (id) => {
    await api.deleteReminder(id);
    setReminders(p => p.filter(r => r.id !== id));
  };

  return (
    <div className="page-container" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Witaj, {user.name}</h1>
        </div>
        
        {/* Date Selector like Shopify */}
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-auto gap-2 bg-white border-slate-200 h-9 px-3">
            <Calendar size={14} className="text-slate-400" />
            <SelectValue />
            <ChevronDown size={14} className="text-slate-400" />
          </SelectTrigger>
          <SelectContent align="end">
            {DATE_PRESETS.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Przychód</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums">{fmtPLN(displayStats.income)} zł</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Koszty reklam</p>
          <p className="text-xl font-bold text-orange-600 tabular-nums">{fmtPLN(displayStats.costs)} zł</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Zysk</p>
          <p className={`text-xl font-bold tabular-nums ${displayStats.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {fmtPLN(displayStats.profit)} zł
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Na osobę</p>
          <p className={`text-xl font-bold tabular-nums ${displayStats.profitPP >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {fmtPLN(displayStats.profitPP)} zł
          </p>
        </div>
      </div>

      {/* Progress to target */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Cel miesięczny</p>
          <p className="text-sm font-bold text-slate-900">{progress.toFixed(0)}%</p>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-900 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-2">{fmtPLN(stats?.total_income || 0)} / {fmtPLN(TARGET)} zł</p>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => onNavigate("wyniki")} className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-slate-300 transition-colors">
          <p className="text-sm font-semibold text-slate-900">Wyniki</p>
          <p className="text-xs text-slate-500">Szczegółowe finanse</p>
        </button>
        <button onClick={() => onNavigate("tasks")} className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-slate-300 transition-colors">
          <p className="text-sm font-semibold text-slate-900">Zadania</p>
          <p className="text-xs text-slate-500">Do zrobienia</p>
        </button>
      </div>

      {/* Reminders */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Przypomnienia</h3>
          <button onClick={() => setShowAddReminder(true)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
            <Plus size={16} />
          </button>
        </div>

        {overdueReminders.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
              <AlertCircle size={12} /> Zaległe
            </p>
            {overdueReminders.map(r => (
              <div key={r.id} className="flex items-center gap-2 py-2 px-3 mb-1 rounded-lg bg-red-50">
                <button onClick={() => toggleReminder(r.id, r.done)} className="w-4 h-4 rounded border border-red-300 shrink-0" />
                <span className="text-sm text-red-700 flex-1 truncate">{r.title}</span>
                <span className="text-xs text-red-500">{r.date.slice(5)}</span>
                <button onClick={() => deleteReminder(r.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {upcomingReminders.length > 0 ? (
          <div className="space-y-1">
            {upcomingReminders.map(r => (
              <div key={r.id} className="flex items-center gap-2 py-2">
                <button
                  onClick={() => toggleReminder(r.id, r.done)}
                  className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${r.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}
                >
                  {r.done && <Check size={10} className="text-white" />}
                </button>
                <span className={`text-sm flex-1 truncate ${r.done ? "line-through text-slate-400" : "text-slate-700"}`}>{r.title}</span>
                <span className="text-xs text-slate-400">{r.date === todayStr ? "Dziś" : r.date.slice(5)}</span>
                <button onClick={() => deleteReminder(r.id)} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : !overdueReminders.length && (
          <p className="text-sm text-slate-400 text-center py-2">Brak przypomnień</p>
        )}
      </div>

      {/* Add Reminder Dialog */}
      <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle>Nowe przypomnienie</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Tytuł" value={remForm.title} onChange={e => setRemForm(f => ({ ...f, title: e.target.value }))} />
            <Input type="date" value={remForm.date} onChange={e => setRemForm(f => ({ ...f, date: e.target.value }))} />
            <Button onClick={addReminder} className="w-full bg-slate-900 hover:bg-slate-800">Dodaj</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
