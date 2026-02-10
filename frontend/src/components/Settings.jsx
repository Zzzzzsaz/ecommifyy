import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LogOut, Smartphone, Monitor, Info, Save, Building2, Loader2 } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_d80f261d-499e-4117-b40a-11f7363e88f3/artifacts/gvqot30h_ecommify%20logo.png";

export default function Settings({ user, onLogout }) {
  const [company, setCompany] = useState({ name: "", nip: "", address: "", city: "", postal_code: "", bank_name: "", bank_account: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getCompany().then(r => {
      if (r.data && Object.keys(r.data).length > 0) setCompany(r.data);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const saveCompany = async () => {
    setSaving(true);
    try {
      await api.updateCompany(company);
      toast.success("Dane firmy zapisane!");
    } catch { toast.error("Blad zapisu"); }
    finally { setSaving(false); }
  };

  const f = (key, label, placeholder) => (
    <div key={key}>
      <label className="text-ecom-muted text-[10px] uppercase tracking-wider">{label}</label>
      <Input value={company[key] || ""} onChange={e => setCompany(c => ({ ...c, [key]: e.target.value }))} placeholder={placeholder} className="bg-ecom-bg border-ecom-border text-white mt-0.5" data-testid={`company-${key}`} />
    </div>
  );

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="settings-page">
      <h1 className="font-heading text-2xl font-bold text-white mb-6">Ustawienia</h1>

      {/* User Info */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="user-info-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-ecom-primary/20 flex items-center justify-center text-ecom-primary font-heading font-bold text-xl">{user.name[0]}</div>
            <div><p className="text-white font-medium">{user.name}</p><Badge variant="secondary" className="mt-1 text-[10px] capitalize">{user.role}</Badge></div>
          </div>
        </CardContent>
      </Card>

      {/* Company Settings */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="company-settings-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-ecom-primary" />
            <h3 className="text-white font-medium text-sm">Dane firmy</h3>
            <span className="text-[9px] text-ecom-muted">(do paragonow i zestawien)</span>
          </div>
          {loaded ? (
            <div className="space-y-3">
              {f("name", "Nazwa firmy", "Ecommify Sp. z o.o.")}
              {f("nip", "NIP", "1234567890")}
              <div className="grid grid-cols-3 gap-2">
                {f("address", "Adres", "ul. Przykladowa 1")}
                {f("postal_code", "Kod", "00-001")}
                {f("city", "Miasto", "Warszawa")}
              </div>
              {f("bank_name", "Bank", "mBank")}
              {f("bank_account", "Nr konta", "PL 12 3456 ...")}
              <div className="grid grid-cols-2 gap-2">
                {f("email", "Email", "kontakt@firma.pl")}
                {f("phone", "Telefon", "+48 123 456 789")}
              </div>
              <Button onClick={saveCompany} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80 mt-2" data-testid="save-company-btn">
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={14} className="mr-1.5" />} Zapisz dane firmy
              </Button>
            </div>
          ) : <div className="flex justify-center py-4"><Loader2 className="animate-spin text-ecom-primary" size={24} /></div>}
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="bg-ecom-card border-ecom-border mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <img src={LOGO_URL} alt="Ecommify" className="h-8 object-contain" />
            <div><p className="text-white font-medium text-sm">Ecommify Campaign Calculator</p><p className="text-ecom-muted text-xs">v2.0.0</p></div>
          </div>
          <p className="text-ecom-muted text-xs leading-relaxed">Sledzenie zyskownosci e-commerce z rangami CS:GO, paragonami, zamowieniami i AI ekspertem.</p>
        </CardContent>
      </Card>

      {/* PWA */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="pwa-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3"><Info size={16} className="text-ecom-primary" /><h3 className="text-white font-medium text-sm">Zainstaluj aplikacje</h3></div>
          <div className="space-y-3">
            <div className="flex items-start gap-2"><Smartphone size={14} className="text-ecom-muted mt-0.5 shrink-0" /><div><p className="text-white text-xs font-medium">iPhone</p><p className="text-ecom-muted text-xs">Safari &rarr; Udostepnij &rarr; Dodaj do ekranu</p></div></div>
            <div className="flex items-start gap-2"><Smartphone size={14} className="text-ecom-muted mt-0.5 shrink-0" /><div><p className="text-white text-xs font-medium">Android</p><p className="text-ecom-muted text-xs">Chrome &rarr; Menu &rarr; Zainstaluj</p></div></div>
            <div className="flex items-start gap-2"><Monitor size={14} className="text-ecom-muted mt-0.5 shrink-0" /><div><p className="text-white text-xs font-medium">Komputer</p><p className="text-ecom-muted text-xs">Chrome &rarr; Ikona instalacji w pasku</p></div></div>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-ecom-border my-4" />
      <Button onClick={onLogout} variant="outline" className="w-full border-ecom-danger/50 text-ecom-danger hover:bg-ecom-danger/10" data-testid="logout-btn"><LogOut size={16} className="mr-2" /> Wyloguj sie</Button>
    </div>
  );
}
