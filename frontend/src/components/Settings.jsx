import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Save, LogOut, Loader2, Building2, Target, Users, Percent, DollarSign, 
  Settings2, Shield, Crown, ShoppingBag, KeyRound, Plus, Trash2, Eye, EyeOff,
  Copy, Edit2, Globe, Mail, Lock
} from "lucide-react";

export default function Settings({ user, shops = [], appSettings = {}, onSettingsChange, onShopsChange, onLogout }) {
  const [company, setCompany] = useState({ name: "", nip: "", address: "", postal_code: "", city: "", bank_name: "", bank_account: "", email: "", phone: "" });
  const [settings, setSettings] = useState({ target_revenue: 250000, profit_split: 2, vat_rate: 23, currency: "PLN", app_name: "Ecommify" });
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showAddCred, setShowAddCred] = useState(false);
  const [showEditCred, setShowEditCred] = useState(null);
  const [credForm, setCredForm] = useState({ name: "", url: "", email: "", password: "", notes: "" });
  const [savingCred, setSavingCred] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [c, s, cr] = await Promise.all([
          api.getCompanySettings(), 
          api.getAppSettings(),
          api.getCredentials()
        ]);
        if (c.data) setCompany(c.data);
        if (s.data) setSettings(prev => ({ ...prev, ...s.data }));
        setCredentials(cr.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const saveCompany = async () => {
    setSavingCompany(true);
    try {
      await api.updateCompanySettings(company);
      toast.success("Dane firmy zapisane!");
    } catch { toast.error("Błąd"); }
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
    } catch { toast.error("Błąd"); }
    finally { setSavingSettings(false); }
  };

  const resetCredForm = () => setCredForm({ name: "", url: "", email: "", password: "", notes: "" });

  const fetchCredentials = async () => {
    try {
      const cr = await api.getCredentials();
      setCredentials(cr.data || []);
    } catch {}
  };

  const addCredential = async () => {
    if (!credForm.name.trim()) { toast.error("Podaj nazwę"); return; }
    setSavingCred(true);
    try {
      await api.createCredential({ ...credForm, created_by: user?.name || "Admin" });
      toast.success("Dodano!");
      setShowAddCred(false);
      resetCredForm();
      fetchCredentials();
    } catch { toast.error("Błąd"); }
    finally { setSavingCred(false); }
  };

  const updateCredential = async () => {
    if (!credForm.name.trim() || !showEditCred) return;
    setSavingCred(true);
    try {
      await api.updateCredential(showEditCred.id, credForm);
      toast.success("Zapisano!");
      setShowEditCred(null);
      resetCredForm();
      fetchCredentials();
    } catch { toast.error("Błąd"); }
    finally { setSavingCred(false); }
  };

  const deleteCredential = async (id) => {
    if (!window.confirm("Usunąć te dane logowania?")) return;
    try {
      await api.deleteCredential(id);
      toast.success("Usunięto");
      fetchCredentials();
    } catch { toast.error("Błąd"); }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`Skopiowano ${label}`);
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return <div className="page-container flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>;
  }

  return (
    <div className="page-container" data-testid="settings-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Ustawienia</h1>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
          <Shield size={12} /> {user?.name}
        </span>
      </div>

      {/* Password Vault - Full Width at Top */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6" data-testid="credentials-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <KeyRound size={18} className="text-violet-500" /> Sejf haseł
          </h2>
          <Button onClick={() => { resetCredForm(); setShowAddCred(true); }} size="sm" className="bg-violet-600 hover:bg-violet-700 h-8" data-testid="add-cred-btn">
            <Plus size={14} className="mr-1" /> Dodaj konto
          </Button>
        </div>

        {credentials.length > 0 ? (
          <div className="space-y-2">
            {credentials.map(cred => {
              const isVisible = visiblePasswords[cred.id];
              
              return (
                <div key={cred.id} className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 flex items-center gap-4" data-testid={`cred-${cred.id}`}>
                  {/* Icon/Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{cred.name}</span>
                      {cred.url && (
                        <a href={cred.url.startsWith("http") ? cred.url : `https://${cred.url}`} target="_blank" rel="noopener noreferrer" 
                          className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-0.5">
                          <Globe size={10} /> {cred.url.replace(/https?:\/\//, "").split("/")[0]}
                        </a>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      {cred.email && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail size={12} className="text-slate-400" />
                          <span className="font-mono text-xs">{cred.email}</span>
                          <button onClick={() => copyToClipboard(cred.email, "email")} className="p-0.5 text-slate-400 hover:text-slate-600">
                            <Copy size={10} />
                          </button>
                        </div>
                      )}
                      {cred.password && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Lock size={12} className="text-slate-400" />
                          <span className="font-mono text-xs">{isVisible ? cred.password : "••••••••"}</span>
                          <button onClick={() => togglePasswordVisibility(cred.id)} className="p-0.5 text-slate-400 hover:text-slate-600">
                            {isVisible ? <EyeOff size={10} /> : <Eye size={10} />}
                          </button>
                          <button onClick={() => copyToClipboard(cred.password, "hasło")} className="p-0.5 text-slate-400 hover:text-slate-600">
                            <Copy size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {cred.notes && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{cred.notes}</p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setCredForm({ name: cred.name, url: cred.url || "", email: cred.email || "", password: cred.password || "", notes: cred.notes || "" }); setShowEditCred(cred); }}
                      className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteCredential(cred.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <KeyRound size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Brak zapisanych haseł</p>
            <p className="text-xs">Dodaj dane logowania do kont firmowych</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* App Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="app-settings-section">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Settings2 size={18} className="text-indigo-500" /> Ustawienia aplikacji
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                <Target size={12} /> Cel przychodu miesięcznego (PLN)
              </label>
              <Input type="number" value={settings.target_revenue}
                onChange={e => setSettings(s => ({ ...s, target_revenue: e.target.value }))} data-testid="target-revenue-input" />
              <p className="text-xs text-slate-400 mt-1">Aktualny cel: {Number(settings.target_revenue).toLocaleString("pl-PL")} PLN</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                  <Users size={12} /> Podział zysku (osoby)
                </label>
                <Input type="number" value={settings.profit_split}
                  onChange={e => setSettings(s => ({ ...s, profit_split: e.target.value }))} data-testid="profit-split-input" />
              </div>
              <div>
                <label className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                  <Percent size={12} /> Stawka VAT (%)
                </label>
                <Input type="number" value={settings.vat_rate}
                  onChange={e => setSettings(s => ({ ...s, vat_rate: e.target.value }))} data-testid="vat-rate-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                  <DollarSign size={12} /> Waluta
                </label>
                <Input value={settings.currency}
                  onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))} data-testid="currency-input" />
              </div>
              <div>
                <label className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                  <Crown size={12} /> Nazwa aplikacji
                </label>
                <Input value={settings.app_name}
                  onChange={e => setSettings(s => ({ ...s, app_name: e.target.value }))} data-testid="app-name-input" />
              </div>
            </div>
            <Button onClick={saveSettings2} disabled={savingSettings} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="save-app-settings">
              {savingSettings ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={14} className="mr-1.5" />}
              Zapisz ustawienia
            </Button>
          </div>
        </div>

        {/* Company Data */}
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="company-settings-section">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-emerald-500" /> Dane firmy
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Nazwa firmy</label>
              <Input value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))}
                placeholder="np. CAMARI SP. Z O.O." data-testid="company-name" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">NIP</label>
              <Input value={company.nip} onChange={e => setCompany(c => ({ ...c, nip: e.target.value }))}
                placeholder="np. PL6762697327" data-testid="company-nip" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Adres</label>
              <Input value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))}
                placeholder="np. Szlak 77/222" data-testid="company-address" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Kod pocztowy</label>
                <Input value={company.postal_code} onChange={e => setCompany(c => ({ ...c, postal_code: e.target.value }))}
                  placeholder="31-153" data-testid="company-postal" />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Miasto</label>
                <Input value={company.city} onChange={e => setCompany(c => ({ ...c, city: e.target.value }))}
                  placeholder="Kraków" data-testid="company-city" />
              </div>
            </div>
            <hr className="border-slate-100" />
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Bank</label>
              <Input value={company.bank_name} onChange={e => setCompany(c => ({ ...c, bank_name: e.target.value }))}
                placeholder="np. mBank" data-testid="company-bank" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Nr konta</label>
              <Input value={company.bank_account} onChange={e => setCompany(c => ({ ...c, bank_account: e.target.value }))}
                placeholder="PL 12 3456 7890 ..." data-testid="company-account" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Email</label>
                <Input value={company.email} onChange={e => setCompany(c => ({ ...c, email: e.target.value }))}
                  placeholder="kontakt@firma.pl" data-testid="company-email" />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Telefon</label>
                <Input value={company.phone} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))}
                  placeholder="+48 123 456 789" data-testid="company-phone" />
              </div>
            </div>
            <Button onClick={saveCompany} disabled={savingCompany} className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="save-company">
              {savingCompany ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={14} className="mr-1.5" />}
              Zapisz dane firmy
            </Button>
          </div>
        </div>
      </div>

      {/* Shops Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6" data-testid="shops-overview-section">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <ShoppingBag size={18} className="text-amber-500" /> Sklepy ({shops.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {shops.map(s => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-sm font-medium text-slate-700">{s.name}</span>
              <span className="text-xs text-slate-400">#{s.id}</span>
            </div>
          ))}
          {shops.length === 0 && <p className="text-sm text-slate-400">Brak sklepów</p>}
        </div>
        <p className="text-xs text-slate-400 mt-3">Zarządzanie sklepami i API w zakładce "Sklepy"</p>
      </div>

      {/* Account */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6" data-testid="account-section">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Shield size={18} className="text-red-500" /> Konto
        </h2>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 mb-4">
          <span className="text-sm text-slate-600">Zalogowany jako:</span>
          <span className="text-sm font-semibold text-slate-900">{user?.name} ({user?.role})</span>
        </div>
        <Button onClick={onLogout} variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" data-testid="logout-btn">
          <LogOut size={14} className="mr-2" /> Wyloguj się
        </Button>
      </div>

      {/* Add Credential Dialog */}
      <Dialog open={showAddCred} onOpenChange={setShowAddCred}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Dodaj konto</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Nazwa serwisu</label>
              <Input value={credForm.name} onChange={e => setCredForm(f => ({ ...f, name: e.target.value }))}
                placeholder="np. Shopify, TikTok Ads, Bank" data-testid="cred-name-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Adres strony (opcjonalnie)</label>
              <Input value={credForm.url} onChange={e => setCredForm(f => ({ ...f, url: e.target.value }))}
                placeholder="np. shopify.com" data-testid="cred-url-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Email / Login</label>
              <Input value={credForm.email} onChange={e => setCredForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@firma.pl" data-testid="cred-email-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Hasło</label>
              <Input type="password" value={credForm.password} onChange={e => setCredForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" data-testid="cred-password-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Notatki (opcjonalnie)</label>
              <Textarea value={credForm.notes} onChange={e => setCredForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Dodatkowe informacje, np. 2FA, pytanie bezpieczeństwa..." rows={2} data-testid="cred-notes-input" />
            </div>
            <Button onClick={addCredential} disabled={savingCred} className="w-full bg-violet-600 hover:bg-violet-700" data-testid="cred-submit-btn">
              {savingCred && <Loader2 className="animate-spin mr-2" size={16} />}
              <Plus size={14} className="mr-1" /> Dodaj
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Credential Dialog */}
      <Dialog open={!!showEditCred} onOpenChange={o => { if (!o) setShowEditCred(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Edytuj konto</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Nazwa serwisu</label>
              <Input value={credForm.name} onChange={e => setCredForm(f => ({ ...f, name: e.target.value }))} data-testid="cred-edit-name-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Adres strony</label>
              <Input value={credForm.url} onChange={e => setCredForm(f => ({ ...f, url: e.target.value }))} data-testid="cred-edit-url-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Email / Login</label>
              <Input value={credForm.email} onChange={e => setCredForm(f => ({ ...f, email: e.target.value }))} data-testid="cred-edit-email-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Hasło</label>
              <Input type="password" value={credForm.password} onChange={e => setCredForm(f => ({ ...f, password: e.target.value }))} data-testid="cred-edit-password-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Notatki</label>
              <Textarea value={credForm.notes} onChange={e => setCredForm(f => ({ ...f, notes: e.target.value }))} rows={2} data-testid="cred-edit-notes-input" />
            </div>
            <Button onClick={updateCredential} disabled={savingCred} className="w-full bg-violet-600 hover:bg-violet-700" data-testid="cred-edit-submit-btn">
              {savingCred && <Loader2 className="animate-spin mr-2" size={16} />}
              <Save size={14} className="mr-1" /> Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
