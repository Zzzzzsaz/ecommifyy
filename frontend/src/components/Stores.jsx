import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RefreshCw, Plus, Trash2, Loader2, Save, ShoppingBag, Pencil, ExternalLink, Key } from "lucide-react";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6", "#a855f7", "#3b82f6", "#84cc16"];

export default function Stores({ shops = [], onShopsChange }) {
  const [shopifyConfigs, setShopifyConfigs] = useState([]);
  const [tiktokConfigs, setTiktokConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showAddShop, setShowAddShop] = useState(false);
  const [showEditShop, setShowEditShop] = useState(null);
  const [shopForm, setShopForm] = useState({ name: "", color: "#6366f1" });
  const [shopifyForms, setShopifyForms] = useState({});
  const [showTikTokAdd, setShowTikTokAdd] = useState(false);
  const [ttForm, setTtForm] = useState({ name: "", advertiser_id: "", access_token: "", linked_shop_ids: [] });
  const [saving, setSaving] = useState(false);
  const [expandedShop, setExpandedShop] = useState(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const [sh, tt] = await Promise.all([api.getShopifyConfigs(), api.getTikTokConfigs()]);
      setShopifyConfigs(sh.data);
      setTiktokConfigs(tt.data);
      const forms = {};
      shops.forEach((s) => {
        const existing = sh.data.find((c) => c.shop_id === s.id);
        forms[s.id] = { store_url: existing?.store_url || "", api_token: existing?.api_token || "" };
      });
      setShopifyForms(forms);
    } catch { toast.error("Blad ladowania"); }
    finally { setLoading(false); }
  }, [shops]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const addShop = async () => {
    if (!shopForm.name) { toast.error("Wpisz nazwe sklepu"); return; }
    setSaving(true);
    try {
      await api.createShop({ name: shopForm.name, color: shopForm.color });
      toast.success("Sklep dodany!");
      setShowAddShop(false);
      setShopForm({ name: "", color: "#6366f1" });
      onShopsChange?.();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const editShop = async () => {
    if (!showEditShop) return;
    setSaving(true);
    try {
      await api.updateShop(showEditShop.id, { name: shopForm.name, color: shopForm.color });
      toast.success("Zapisano!");
      setShowEditShop(null);
      onShopsChange?.();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const removeShop = async (id) => {
    if (!window.confirm("Czy na pewno usunac ten sklep?")) return;
    try {
      await api.deleteShop(id);
      toast.success("Sklep usuniety!");
      onShopsChange?.();
    } catch { toast.error("Blad"); }
  };

  const saveShopify = async (shopId) => {
    const f = shopifyForms[shopId];
    if (!f?.store_url || !f?.api_token) { toast.error("Wypelnij oba pola"); return; }
    setSaving(true);
    try {
      await api.saveShopifyConfig({ shop_id: shopId, store_url: f.store_url, api_token: f.api_token });
      toast.success("Zapisano Shopify");
      fetchConfigs();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const deleteShopify = async (shopId) => {
    try { await api.deleteShopifyConfig(shopId); toast.success("Usunieto"); fetchConfigs(); }
    catch { toast.error("Blad"); }
  };

  const addTikTok = async () => {
    if (!ttForm.name || !ttForm.advertiser_id || !ttForm.access_token) { toast.error("Wypelnij pola"); return; }
    setSaving(true);
    try {
      await api.createTikTokConfig(ttForm);
      toast.success("Dodano TikTok");
      setShowTikTokAdd(false);
      setTtForm({ name: "", advertiser_id: "", access_token: "", linked_shop_ids: [] });
      fetchConfigs();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const deleteTikTok = async (id) => {
    if (!window.confirm("Usunac konfiguracje TikTok?")) return;
    try { await api.deleteTikTokConfig(id); toast.success("Usunieto"); fetchConfigs(); }
    catch { toast.error("Blad"); }
  };

  const syncAll = async () => {
    const now = new Date();
    setSyncing(true);
    try {
      await api.syncAll(now.getFullYear(), now.getMonth() + 1);
      toast.success("Synchronizacja zakonczona");
    } catch { toast.error("Blad synchronizacji"); }
    finally { setSyncing(false); }
  };

  return (
    <div className="page-container" data-testid="stores-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Sklepy</h1>
        <div className="flex gap-2">
          <Button onClick={syncAll} disabled={syncing} variant="outline" className="h-9" data-testid="sync-all-btn">
            <RefreshCw size={14} className={`mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Synchronizacja..." : "Sync"}
          </Button>
          <Button onClick={() => { setShopForm({ name: "", color: COLORS[shops.length % COLORS.length] }); setShowAddShop(true); }} className="bg-slate-900 hover:bg-slate-800 h-9" data-testid="add-shop-btn">
            <Plus size={14} className="mr-1.5" /> Dodaj sklep
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : (
        <>
          {/* Shops List */}
          <div className="space-y-3 mb-8">
            {shops.length > 0 ? shops.map(s => {
              const hasShopify = shopifyConfigs.some(c => c.shop_id === s.id);
              const f = shopifyForms[s.id] || { store_url: "", api_token: "" };
              const isExpanded = expandedShop === s.id;

              return (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid={`shop-card-${s.id}`}>
                  {/* Shop Header */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{s.name}</span>
                        <span className="text-xs text-slate-400">ID: {s.id}</span>
                        {hasShopify && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Shopify</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExpandedShop(isExpanded ? null : s.id)}
                        className={`p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 ${isExpanded ? "bg-slate-100 text-slate-600" : ""}`}>
                        <Key size={16} />
                      </button>
                      <button onClick={() => { setShopForm({ name: s.name, color: s.color }); setShowEditShop(s); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" data-testid={`edit-shop-${s.id}`}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => removeShop(s.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" data-testid={`delete-shop-${s.id}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Shopify Config - Expandable */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50">
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <ExternalLink size={12} /> Konfiguracja Shopify
                      </p>
                      <div className="space-y-2">
                        <Input placeholder="Store URL (np. sklep.myshopify.com)" value={f.store_url}
                          onChange={e => setShopifyForms(p => ({ ...p, [s.id]: { ...p[s.id], store_url: e.target.value } }))}
                          className="bg-white" data-testid={`shopify-url-${s.id}`} />
                        <Input placeholder="Admin API Access Token" type="password" value={f.api_token}
                          onChange={e => setShopifyForms(p => ({ ...p, [s.id]: { ...p[s.id], api_token: e.target.value } }))}
                          className="bg-white" data-testid={`shopify-token-${s.id}`} />
                        <div className="flex gap-2">
                          <Button onClick={() => saveShopify(s.id)} size="sm" disabled={saving} className="bg-slate-900 hover:bg-slate-800" data-testid={`save-shopify-${s.id}`}>
                            <Save size={12} className="mr-1" /> Zapisz
                          </Button>
                          {hasShopify && (
                            <Button onClick={() => deleteShopify(s.id)} size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" data-testid={`del-shopify-${s.id}`}>
                              <Trash2 size={12} className="mr-1" /> Usun
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <ShoppingBag size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">Brak sklepow</p>
                <p className="text-sm text-slate-400">Dodaj pierwszy sklep, aby rozpoczac</p>
              </div>
            )}
          </div>

          {/* TikTok Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">TikTok Ads</h2>
              <Button onClick={() => setShowTikTokAdd(true)} variant="outline" size="sm" className="h-8" data-testid="add-tiktok-btn">
                <Plus size={12} className="mr-1" /> Dodaj
              </Button>
            </div>

            {tiktokConfigs.length > 0 ? (
              <div className="space-y-2">
                {tiktokConfigs.map(tc => (
                  <div key={tc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50" data-testid={`tiktok-config-${tc.id}`}>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{tc.name}</p>
                      <p className="text-xs text-slate-500">ID: {tc.advertiser_id}</p>
                      <div className="flex gap-1 mt-1">
                        {tc.linked_shop_ids?.map(sid => {
                          const sh = shops.find(s => s.id === sid);
                          return sh ? (
                            <span key={sid} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: sh.color + "20", color: sh.color }}>{sh.name}</span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <button onClick={() => deleteTikTok(tc.id)} className="p-2 text-slate-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Brak skonfigurowanych kont TikTok</p>
            )}
          </div>
        </>
      )}

      {/* ADD SHOP DIALOG */}
      <Dialog open={showAddShop} onOpenChange={setShowAddShop}>
        <DialogContent className="bg-white max-w-sm" data-testid="add-shop-dialog">
          <DialogHeader><DialogTitle>Nowy sklep</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input placeholder="Nazwa sklepu (np. MojSklep)" value={shopForm.name}
              onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))} data-testid="shop-name-input" />
            <div>
              <p className="text-sm text-slate-600 mb-2">Kolor</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setShopForm(f => ({ ...f, color: c }))}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${shopForm.color === c ? "border-slate-900 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} data-testid={`color-${c}`} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: shopForm.color }} />
              <span className="font-medium text-slate-900">{shopForm.name || "Podglad"}</span>
            </div>
            <Button onClick={addShop} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="save-shop-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Plus size={14} className="mr-1" /> Dodaj sklep
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT SHOP DIALOG */}
      <Dialog open={!!showEditShop} onOpenChange={() => setShowEditShop(null)}>
        <DialogContent className="bg-white max-w-sm" data-testid="edit-shop-dialog">
          <DialogHeader><DialogTitle>Edytuj sklep</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input placeholder="Nazwa" value={shopForm.name} onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))} data-testid="edit-shop-name" />
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setShopForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${shopForm.color === c ? "border-slate-900 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <Button onClick={editShop} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="save-edit-shop">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Save size={14} className="mr-1" /> Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD TIKTOK DIALOG */}
      <Dialog open={showTikTokAdd} onOpenChange={setShowTikTokAdd}>
        <DialogContent className="bg-white max-w-sm" data-testid="add-tiktok-dialog">
          <DialogHeader><DialogTitle>Dodaj konto TikTok</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nazwa konta" value={ttForm.name} onChange={e => setTtForm(f => ({ ...f, name: e.target.value }))} data-testid="tiktok-name-input" />
            <Input placeholder="Advertiser ID" value={ttForm.advertiser_id} onChange={e => setTtForm(f => ({ ...f, advertiser_id: e.target.value }))} data-testid="tiktok-adv-id-input" />
            <Input placeholder="Access Token" type="password" value={ttForm.access_token} onChange={e => setTtForm(f => ({ ...f, access_token: e.target.value }))} data-testid="tiktok-token-input" />
            <div>
              <p className="text-sm text-slate-600 mb-2">Powiazane sklepy:</p>
              <div className="flex flex-wrap gap-3">
                {shops.map(s => (
                  <label key={s.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={ttForm.linked_shop_ids.includes(s.id)}
                      onCheckedChange={() => setTtForm(f => ({ ...f, linked_shop_ids: f.linked_shop_ids.includes(s.id) ? f.linked_shop_ids.filter(id => id !== s.id) : [...f.linked_shop_ids, s.id] }))} />
                    <span className="text-sm" style={{ color: s.color }}>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={addTikTok} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="tiktok-save-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />} Dodaj
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
