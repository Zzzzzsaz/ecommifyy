import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_d80f261d-499e-4117-b40a-11f7363e88f3/artifacts/gvqot30h_ecommify%20logo.png";

const SHOPS = [
  { id: 1, name: "ecom1", color: "#6366f1" },
  { id: 2, name: "ecom2", color: "#10b981" },
  { id: 3, name: "ecom3", color: "#f59e0b" },
  { id: 4, name: "ecom4", color: "#ec4899" },
];

const MONTHS_PL = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
const DAYS_PL = ["Nd", "Pn", "Wt", "Sr", "Cz", "Pt", "So"];

const fmtPLN = (v) => v.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zl";

export default function Dashboard({ user }) {
  const now = new Date();
  const [shop, setShop] = useState(1);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: null, date: null });
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getMonthlyStats({ shop_id: shop, year, month });
      setStats(r.data);
    } catch {
      toast.error("Blad ladowania danych");
    } finally {
      setLoading(false);
    }
  }, [shop, year, month]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const openAdd = (type, date) => {
    setDialog({ open: true, type, date });
    setAmount("");
    setDesc("");
  };

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Podaj prawidlowa kwote"); return; }
    setSaving(true);
    try {
      if (dialog.type === "income") {
        await api.createIncome({ amount: val, date: dialog.date, description: desc || "Reczne dodanie", shop_id: shop });
      } else {
        await api.createExpense({ amount: val, date: dialog.date, campaign_name: desc || "Reczne dodanie", shop_id: shop });
      }
      toast.success("Dodano!");
      setDialog({ open: false, type: null, date: null });
      fetchStats();
    } catch {
      toast.error("Blad zapisu");
    } finally {
      setSaving(false);
    }
  };

  const getDayName = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    return DAYS_PL[d.getDay()];
  };
  const getDayNum = (dateStr) => parseInt(dateStr.split("-")[2], 10);

  const shopColor = SHOPS.find((s) => s.id === shop)?.color || "#6366f1";

  const kpis = stats
    ? [
        { label: "Przychod", value: fmtPLN(stats.total_income), color: "text-white" },
        { label: "Ads", value: fmtPLN(stats.total_ads), color: "text-ecom-danger" },
        { label: "Netto", value: fmtPLN(stats.total_netto), color: "text-ecom-muted" },
        { label: "Zysk", value: fmtPLN(stats.total_profit), color: stats.total_profit >= 0 ? "text-ecom-success" : "text-ecom-danger" },
        { label: "ROI", value: stats.roi.toFixed(1) + "%", color: stats.roi >= 0 ? "text-ecom-success" : "text-ecom-danger" },
      ]
    : [];

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Ecommify" className="h-8 object-contain" />
          <h1 className="font-heading text-xl font-bold text-white tracking-wide">ECOMMIFY</h1>
        </div>
        <Badge variant="secondary" className="text-xs" data-testid="user-badge">{user.name}</Badge>
      </div>

      {/* Shop Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" data-testid="shop-tabs">
        {SHOPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setShop(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors duration-150 border ${
              shop === s.id ? "text-white border-transparent" : "text-ecom-muted border-ecom-border hover:text-white hover:border-ecom-muted"
            }`}
            style={shop === s.id ? { backgroundColor: s.color + "20", borderColor: s.color, color: s.color } : {}}
            data-testid={`shop-tab-${s.id}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-center gap-4 mb-6" data-testid="month-nav">
        <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="prev-month" className="text-ecom-muted hover:text-white">
          <ChevronLeft size={20} />
        </Button>
        <span className="font-heading text-lg font-semibold text-white min-w-[160px] text-center">
          {MONTHS_PL[month - 1]} {year}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="next-month" className="text-ecom-muted hover:text-white">
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={32} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6" data-testid="kpi-cards">
            {kpis.map((kpi, i) => (
              <Card key={i} className="bg-ecom-card border-ecom-border" style={i === 0 ? { borderTop: `2px solid ${shopColor}` } : {}}>
                <CardContent className="p-4">
                  <p className="text-ecom-muted text-[10px] uppercase tracking-widest font-medium">{kpi.label}</p>
                  <p className={`text-lg font-heading font-bold tabular-nums mt-1 ${kpi.color}`} data-testid={`kpi-${kpi.label.toLowerCase()}`}>
                    {kpi.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Daily List */}
          <h2 className="font-heading text-base font-semibold text-white mb-3">Dni</h2>
          <div className="space-y-2" data-testid="daily-list">
            {stats?.days?.map((day) => {
              const hasData = day.income > 0 || day.ads > 0;
              return (
                <div
                  key={day.date}
                  className={`day-card rounded-lg border p-3 ${hasData ? "bg-ecom-card border-ecom-border" : "bg-ecom-card/50 border-ecom-border/50"}`}
                  data-testid={`day-${day.date}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-heading font-bold text-lg leading-none">{getDayNum(day.date)}</span>
                      <span className="text-ecom-muted text-xs">{getDayName(day.date)}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openAdd("income", day.date)}
                        className="btn-press flex items-center gap-1 text-[10px] font-medium text-ecom-success bg-ecom-success/10 hover:bg-ecom-success/20 px-2 py-1 rounded-md"
                        data-testid={`add-income-${day.date}`}
                      >
                        <Plus size={12} /> Przychod
                      </button>
                      <button
                        onClick={() => openAdd("expense", day.date)}
                        className="btn-press flex items-center gap-1 text-[10px] font-medium text-ecom-danger bg-ecom-danger/10 hover:bg-ecom-danger/20 px-2 py-1 rounded-md"
                        data-testid={`add-expense-${day.date}`}
                      >
                        <Plus size={12} /> Ads
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                    <div>
                      <span className="text-ecom-muted text-[10px]">Przychod</span>
                      <p className="text-white text-sm tabular-nums font-medium">{fmtPLN(day.income)}</p>
                    </div>
                    <div>
                      <span className="text-ecom-muted text-[10px]">Ads</span>
                      <p className="text-ecom-danger text-sm tabular-nums font-medium">{fmtPLN(day.ads)}</p>
                    </div>
                    <div>
                      <span className="text-ecom-muted text-[10px]">Netto</span>
                      <p className="text-ecom-muted text-sm tabular-nums">{fmtPLN(day.netto)}</p>
                    </div>
                    <div>
                      <span className="text-ecom-muted text-[10px]">Zysk</span>
                      <p className={`text-sm tabular-nums font-medium ${day.profit >= 0 ? "text-ecom-success" : "text-ecom-danger"}`}>
                        {fmtPLN(day.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">
              {dialog.type === "income" ? "Dodaj przychod" : "Dodaj koszt reklamy"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-ecom-muted text-sm">{dialog.date}</p>
            <Input
              type="number"
              placeholder="Kwota (PLN)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-ecom-bg border-ecom-border text-white"
              data-testid="add-amount-input"
            />
            <Input
              placeholder={dialog.type === "income" ? "Opis (opcjonalnie)" : "Nazwa kampanii (opcjonalnie)"}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="bg-ecom-bg border-ecom-border text-white"
              data-testid="add-desc-input"
            />
            <Button onClick={handleSave} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-save-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
