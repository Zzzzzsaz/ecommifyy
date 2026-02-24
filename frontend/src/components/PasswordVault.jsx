import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  KeyRound, Plus, Trash2, Eye, EyeOff, Copy, Edit2, Globe, Mail, Lock, 
  Loader2, Save, Search
} from "lucide-react";

export default function PasswordVault({ user }) {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [form, setForm] = useState({ name: "", url: "", email: "", password: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [search, setSearch] = useState("");

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getCredentials();
      setCredentials(r.data || []);
    } catch { setCredentials([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  const resetForm = () => setForm({ name: "", url: "", email: "", password: "", notes: "" });

  const addCredential = async () => {
    if (!form.name.trim()) { toast.error("Podaj nazwę"); return; }
    setSaving(true);
    try {
      await api.createCredential({ ...form, created_by: user?.name || "Admin" });
      toast.success("Dodano!");
      setShowAdd(false);
      resetForm();
      fetchCredentials();
    } catch { toast.error("Błąd"); }
    finally { setSaving(false); }
  };

  const updateCredential = async () => {
    if (!form.name.trim() || !showEdit) return;
    setSaving(true);
    try {
      await api.updateCredential(showEdit.id, form);
      toast.success("Zapisano!");
      setShowEdit(null);
      resetForm();
      fetchCredentials();
    } catch { toast.error("Błąd"); }
    finally { setSaving(false); }
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

  const filtered = credentials.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.url && c.url.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-container" data-testid="vault-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Sejf haseł</h1>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-violet-600 hover:bg-violet-700 h-9" data-testid="add-cred-btn">
          <Plus size={14} className="mr-1.5" /> Dodaj konto
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input 
          placeholder="Szukaj po nazwie, emailu lub adresie..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white"
          data-testid="vault-search"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(cred => {
            const isVisible = visiblePasswords[cred.id];
            
            return (
              <div key={cred.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300" data-testid={`cred-${cred.id}`}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <KeyRound size={20} className="text-violet-600" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{cred.name}</span>
                      {cred.url && (
                        <a href={cred.url.startsWith("http") ? cred.url : `https://${cred.url}`} target="_blank" rel="noopener noreferrer" 
                          className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-0.5">
                          <Globe size={10} /> {cred.url.replace(/https?:\/\//, "").split("/")[0]}
                        </a>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                      {cred.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-slate-400" />
                          <span className="font-mono text-slate-600">{cred.email}</span>
                          <button onClick={() => copyToClipboard(cred.email, "email")} 
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                            <Copy size={12} />
                          </button>
                        </div>
                      )}
                      {cred.password && (
                        <div className="flex items-center gap-2 text-sm">
                          <Lock size={14} className="text-slate-400" />
                          <span className="font-mono text-slate-600">{isVisible ? cred.password : "••••••••••"}</span>
                          <button onClick={() => togglePasswordVisibility(cred.id)} 
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                            {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button onClick={() => copyToClipboard(cred.password, "hasło")} 
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                            <Copy size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {cred.notes && (
                      <p className="text-sm text-slate-400 mt-2 line-clamp-2">{cred.notes}</p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setForm({ name: cred.name, url: cred.url || "", email: cred.email || "", password: cred.password || "", notes: cred.notes || "" }); setShowEdit(cred); }}
                      className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100" data-testid={`edit-cred-${cred.id}`}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => deleteCredential(cred.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100" data-testid={`del-cred-${cred.id}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <KeyRound size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-500 mb-1">
            {search ? "Nie znaleziono" : "Brak zapisanych haseł"}
          </p>
          <p className="text-sm text-slate-400">
            {search ? "Spróbuj innej frazy" : "Dodaj dane logowania do kont firmowych"}
          </p>
        </div>
      )}

      {/* Stats */}
      {credentials.length > 0 && (
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{credentials.length}</span> zapisanych kont
          </p>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Dodaj konto</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Nazwa serwisu *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="np. Shopify, TikTok Ads, Bank" data-testid="cred-name-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Adres strony</label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="np. shopify.com" data-testid="cred-url-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Email / Login</label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@firma.pl" data-testid="cred-email-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Hasło</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" data-testid="cred-password-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Notatki</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Dodatkowe informacje, np. 2FA, pytanie bezpieczeństwa..." rows={2} data-testid="cred-notes-input" />
            </div>
            <Button onClick={addCredential} disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700" data-testid="cred-submit-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Plus size={14} className="mr-1" /> Dodaj
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEdit} onOpenChange={o => { if (!o) setShowEdit(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Edytuj konto</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Nazwa serwisu</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="cred-edit-name-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Adres strony</label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} data-testid="cred-edit-url-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Email / Login</label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} data-testid="cred-edit-email-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Hasło</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} data-testid="cred-edit-password-input" />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Notatki</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} data-testid="cred-edit-notes-input" />
            </div>
            <Button onClick={updateCredential} disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700" data-testid="cred-edit-submit-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Save size={14} className="mr-1" /> Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
