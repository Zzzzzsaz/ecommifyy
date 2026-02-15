import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Save, LogOut, Loader2, Building2, Target, Users, Percent, DollarSign,
  Palette, ShoppingBag, Settings2, Shield, Crown
} from "lucide-react";

export default function Settings({ user, shops = [], appSettings = {}, onSettingsChange, onShopsChange, onLogout }) {
  const [company, setCompany] = useState({ name: "", nip: "", address: "", postal_code: "", city: "", bank_name: "", bank_account: "", email: "", phone: "" });
  const [settings, setSettings] = useState({ target_revenue: 250000, profit_split: 2, vat_rate: 23, currency: "PLN", app_name: "Ecommify" });
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [c, s] = await Promise.all([api.getCompanySettings(), api.getAppSettings()]);
        if (c.data) setCompany(c.data);
        if (s.data) setSettings(prev => ({ ...prev, ...s.data }));
      } catch {}
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCompany = async () => {
    setSavingCompany(true);
    try {
      await api.updateCompanySettings(company);
      toast.success("Dane firmy zapisane!");
    } catch { toast.error("Blad"); }
    finally { setSavingCompany(false); }
  };

  const saveSettings2 = async () => {
    setSavingSettings(true);
    try {
      await api.updateAppSettings({
        target_revenue: parseFloat(settings.target_revenue) || 250000,
        profit_split: parseInt(settings.profit_split) || 2,
        vat_rate: parseInt(settings.vat_rate) || 23,
        currency: settings.currency || "PLN",
        app_name: settings.app_name || "Ecommify",
      });
      toast.success("Ustawienia zapisane!");
      onSettingsChange?.();
    } catch { toast.error("Blad"); }
    finally { setSavingSettings(false); }
  };

  if (loading) {
    return <div className="p-4 flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={32} /></div>;
  }

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="settings-page">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading text-2xl font-bold text-white">USTAWIENIA</h1>
        <Badge variant="outline" className="text-[10px] border-ecom-primary text-ecom-primary">
          <Shield size={10} className="mr-0.5" />{user?.name}
        </Badge>
      </div>

      {/* ===== APP SETTINGS ===== */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="app-settings-section">
        <CardContent className="p-4">
          <h2 className="font-heading text-base font-semibold text-white flex items-center gap-2 mb-3">
            <Settings2 size={16} className="text-ecom-primary" />Ustawienia aplikacji
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-ecom-muted text-[10px] uppercase block mb-1">
                <Target size={10} className="inline mr-1" />Cel przychodu miesiecznego (PLN)
              </label>
              <Input type="number" value={settings.target_revenue}
                onChange={e => setSettings(s => ({ ...s, target_revenue: e.target.value }))}
                className="bg-ecom-bg border-ecom-border text-white" data-testid="target-revenue-input" />
              <p className="text-ecom-muted text-[9px] mt-0.5">Aktualny cel: {Number(settings.target_revenue).toLocaleString("pl-PL")} PLN - widoczny na Wynikach i Dashboard</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ecom-muted text-[10px] uppercase block mb-1">
                  <Users size={10} className="inline mr-1" />Podział zysku (ile osob)
                </label>
                <Input type="number" value={settings.profit_split}
                  onChange={e => setSettings(s => ({ ...s, profit_split: e.target.value }))}
                  className="bg-ecom-bg border-ecom-border text-white" data-testid="profit-split-input" />
                <p className="text-ecom-muted text-[9px] mt-0.5">Zysk / {settings.profit_split} osob</p>
              </div>
              <div>
                <label className="text-ecom-muted text-[10px] uppercase block mb-1">
                  <Percent size={10} className="inline mr-1" />Stawka VAT (%)
                </label>
                <Input type="number" value={settings.vat_rate}
                  onChange={e => setSettings(s => ({ ...s, vat_rate: e.target.value }))}
                  className="bg-ecom-bg border-ecom-border text-white" data-testid="vat-rate-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ecom-muted text-[10px] uppercase block mb-1">
                  <DollarSign size={10} className="inline mr-1" />Waluta
                </label>
                <Input value={settings.currency}
                  onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
                  className="bg-ecom-bg border-ecom-border text-white" data-testid="currency-input" />
              </div>
              <div>
                <label className="text-ecom-muted text-[10px] uppercase block mb-1">
                  <Crown size={10} className="inline mr-1" />Nazwa aplikacji
                </label>
                <Input value={settings.app_name}
                  onChange={e => setSettings(s => ({ ...s, app_name: e.target.value }))}
                  className="bg-ecom-bg border-ecom-border text-white" data-testid="app-name-input" />
              </div>
            </div>
            <Button onClick={saveSettings2} disabled={savingSettings} className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="save-app-settings">
              {savingSettings ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={14} className="mr-1" />}Zapisz ustawienia
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== COMPANY DATA ===== */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="company-settings-section">
        <CardContent className="p-4">
          <h2 className="font-heading text-base font-semibold text-white flex items-center gap-2 mb-3">
            <Building2 size={16} className="text-ecom-success" />Dane firmy
          </h2>
          <p className="text-ecom-muted text-[10px] mb-3">Dane widoczne na ewidencji sprzedazy PDF i innych dokumentach</p>
          <div className="space-y-2.5">
            <div>
              <label className="text-ecom-muted text-[10px] uppercase block mb-1">Nazwa firmy / spolki</label>
              <Input value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))}
                placeholder="np. CAMARI SP. Z O.O." className="bg-ecom-bg border-ecom-border text-white" data-testid="company-name" />
            </div>
            <div>
              <label className="text-ecom-muted text-[10px] uppercase block mb-1">NIP</label>
              <Input value={company.nip} onChange={e => setCompany(c => ({ ...c, nip: e.target.value }))}
                placeholder="np. PL6762697327" className="bg-ecom-bg border-ecom-border text-white" data-testid="company-nip" />
            </div>
            <div>
              <label className="text-ecom-muted text-[10px] uppercase block mb-1">Adres</label>
              <Input value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))}
                placeholder="np. Szlak 77/222" className="bg-ecom-bg border-ecom-border text-white" data-testid="company-address" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-ecom-muted text-[10px] uppercase block mb-1">Kod pocztowy</label>
                <Input value={company.postal_code} onChange={e => setCompany(c => ({ ...c, postal_code: e.target.value }))}
                  placeholder="31-153" className="bg-ecom-bg border-ecom-border text-white" data-testid="company-postal" />
              </div>
              <div>
                <label className="text-ecom-muted text-[10px] uppercase block mb-1">Miasto</label>
                <Input value={company.city} onChange={e => setCompany(c => ({ ...c, city: e.target.value }))}
                  placeholder="Krakow" className="bg-ecom-bg border-ecom-border text-white" data-testid="company-city" />
              </div>
            </div>
            <Separator className="bg-ecom-border" />
            <div>
              <label className="text-ecom-muted text-[10px] uppercase block mb-1">Bank</label>
              <Input value={company.bank_name} onChange={e => setCompany(c => ({ ...c, bank_name: e.target.value }))}
                placeholder="np. mBank" className="bg-ecom-bg border-ecom-border text-white" data-testid="company-bank" />
            </div>
            <div>
              <label className="text-ecom-muted text-[10px] uppercase block mb-1">Nr konta bankowego</label>
              <Input value={company.bank_account} onChange={e => setCompany(c => ({ ...c, bank_account: e.target.value }))}
                placeholder="PL 12 3456 7890 ..." className="bg-ecom-bg border-ecom-border text-white" data-testid="company-account" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-ecom-muted text-[10px] uppercase block mb-1">Email</label>
                <Input value={company.email} onChange={e => setCompany(c => ({ ...c, email: e.target.value }))}
                  placeholder="kontakt@firma.pl" className="bg-ecom-bg border-ecom-border text-white" data-testid="company-email" />
              </div>
              <div>
                <label className="text-ecom-muted text-[10px] uppercase block mb-1">Telefon</label>
                <Input value={company.phone} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))}
                  placeholder="+48 123 456 789" className="bg-ecom-bg border-ecom-border text-white" data-testid="company-phone" />
              </div>
            </div>
            <Button onClick={saveCompany} disabled={savingCompany} className="bg-ecom-success hover:bg-ecom-success/80" data-testid="save-company">
              {savingCompany ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={14} className="mr-1" />}Zapisz dane firmy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== SHOPS OVERVIEW ===== */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="shops-overview-section">
        <CardContent className="p-4">
          <h2 className="font-heading text-base font-semibold text-white flex items-center gap-2 mb-3">
            <ShoppingBag size={16} className="text-ecom-warning" />Sklepy ({shops.length})
          </h2>
          <div className="space-y-1.5">
            {shops.map(s => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-ecom-bg">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-white text-xs font-medium">{s.name}</span>
                <Badge variant="secondary" className="text-[8px] ml-auto">ID: {s.id}</Badge>
              </div>
            ))}
          </div>
          <p className="text-ecom-muted text-[9px] mt-2">Zarzadzanie sklepami i API Shopify w zakladce "Sklepy" w menu glownym</p>
        </CardContent>
      </Card>

      {/* ===== ACCOUNT ===== */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="account-section">
        <CardContent className="p-4">
          <h2 className="font-heading text-base font-semibold text-white flex items-center gap-2 mb-3">
            <Shield size={16} className="text-ecom-danger" />Konto
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-ecom-bg rounded-lg p-2.5">
              <span className="text-ecom-muted text-xs">Zalogowany jako:</span>
              <span className="text-white text-xs font-semibold">{user?.name} ({user?.role})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onLogout} variant="outline" className="w-full border-ecom-danger/40 text-ecom-danger hover:bg-ecom-danger/10" data-testid="logout-btn">
        <LogOut size={14} className="mr-2" />Wyloguj sie
      </Button>
    </div>
  );
}
