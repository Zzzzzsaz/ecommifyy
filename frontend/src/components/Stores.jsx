import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RefreshCw, Plus, Trash2, Loader2, Save, ShoppingBag, Palette, Pencil } from "lucide-react";

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
    } catch { toast.error("Blad ladowania konfiguracji"); }
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
    <div className="p-4 pb-24 animate-fade-in" data-testid="stores-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading text-2xl font-bold text-white">SKLEPY</h1>
        <div className="flex gap-1.5">
          <Button onClick={syncAll} disabled={syncing} size="sm" variant="outline" className="border-ecom-border text-ecom-muted hover:text-white" data-testid="sync-all-btn">
            <RefreshCw size={14} className={`mr-1 ${syncing ? "animate-spin" : ""}`} />{syncing ? "..." : "Sync"}
          </Button>
          <Button onClick={() => { setShopForm({ name: "", color: COLORS[shops.length % COLORS.length] }); setShowAddShop(true); }} size="sm" className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-shop-btn">
            <Plus size={14} className="mr-1" />Dodaj sklep
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={32} /></div>
      ) : (
        <>
          {/* Shops list */}
          <div className="space-y-2 mb-6">
            {shops.map(s => {
              const hasShopify = shopifyConfigs.some(c => c.shop_id === s.id);
              const f = shopifyForms[s.id] || { store_url: "", api_token: "" };
              return (
                <Card key={s.id} className="bg-ecom-card border-ecom-border border-l-[3px]" style={{ borderLeftColor: s.color }} data-testid={`shop-card-${s.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-white font-medium text-sm">{s.name}</span>
                        <Badge variant="secondary" className="text-[9px]">ID: {s.id}</Badge>
                        {hasShopify && <Badge className="text-[9px] bg-ecom-success/20 text-ecom-success border-ecom-success/40">Shopify</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setShopForm({ name: s.name, color: s.color }); setShowEditShop(s); }}
                          className="text-ecom-muted hover:text-white p-1" data-testid={`edit-shop-${s.id}`}><Pencil size={13} /></button>
                        <button onClick={() => removeShop(s.id)}
                          className="text-ecom-muted hover:text-ecom-danger p-1" data-testid={`delete-shop-${s.id}`}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    {/* Shopify config */}
                    <div className="space-y-1.5">
                      <Input placeholder="Store URL (np. sklep.myshopify.com)" value={f.store_url}
                        onChange={e => setShopifyForms(p => ({ ...p, [s.id]: { ...p[s.id], store_url: e.target.value } }))}
                        className="bg-ecom-bg border-ecom-border text-white text-xs h-8" data-testid={`shopify-url-${s.id}`} />
                      <Input placeholder="Admin API Access Token" type="password" value={f.api_token}
                        onChange={e => setShopifyForms(p => ({ ...p, [s.id]: { ...p[s.id], api_token: e.target.value } }))}
                        className="bg-ecom-bg border-ecom-border text-white text-xs h-8" data-testid={`shopify-token-${s.id}`} />
                      <div className="flex gap-1.5">
                        <Button onClick={() => saveShopify(s.id)} size="sm" disabled={saving} className="bg-ecom-primary hover:bg-ecom-primary/80 h-7 text-[10px]" data-testid={`save-shopify-${s.id}`}>
                          <Save size={11} className="mr-0.5" />Zapisz Shopify
                        </Button>
                        {hasShopify && (
                          <Button onClick={() => deleteShopify(s.id)} size="sm" variant="outline" className="border-ecom-danger/30 text-ecom-danger h-7 text-[10px]" data-testid={`del-shopify-${s.id}`}>
                            <Trash2 size={11} className="mr-0.5" />Usun
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {shops.length === 0 && (
              <div className="text-center py-8 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg">
                <ShoppingBag size={28} className="mx-auto mb-2 opacity-30" />Brak sklepow - dodaj pierwszy!
              </div>
            )}
          </div>

          <Separator className="bg-ecom-border mb-4" />

          {/* TikTok */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base font-semibold text-white">TikTok Ads</h2>
            <Button onClick={() => setShowTikTokAdd(true)} size="sm" variant="outline" className="border-ecom-border text-ecom-muted hover:text-white" data-testid="add-tiktok-btn">
              <Plus size={14} className="mr-1" />Dodaj
            </Button>
          </div>
          <div className="space-y-2">
            {tiktokConfigs.map(tc => (
              <Card key={tc.id} className="bg-ecom-card border-ecom-border" data-testid={`tiktok-config-${tc.id}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-xs">{tc.name}</p>
                    <p className="text-ecom-muted text-[10px]">ID: {tc.advertiser_id}</p>
                    <div className="flex gap-1 mt-1">
                      {tc.linked_shop_ids?.map(sid => {
                        const sh = shops.find(s => s.id === sid);
                        return sh ? <Badge key={sid} variant="outline" className="text-[9px]" style={{ borderColor: sh.color, color: sh.color }}>{sh.name}</Badge> : null;
                      })}
                    </div>
                  </div>
                  <button onClick={() => deleteTikTok(tc.id)} className="text-ecom-muted hover:text-ecom-danger"><Trash2 size={14} /></button>
                </CardContent>
              </Card>
            ))}
            {tiktokConfigs.length === 0 && <p className="text-ecom-muted text-xs text-center py-4">Brak kont TikTok</p>}
          </div>
        </>
      )}

      {/* ADD SHOP */}
      <Dialog open={showAddShop} onOpenChange={setShowAddShop}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-xs" data-testid="add-shop-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Nowy sklep</DialogTitle>
            <DialogDescription className="text-ecom-muted text-xs">Dodaj nowy sklep do systemu</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <Input placeholder="Nazwa sklepu (np. MojSklep)" value={shopForm.name}
              onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white" data-testid="shop-name-input" />
            <div>
              <p className="text-ecom-muted text-[10px] uppercase mb-1.5">Kolor</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setShopForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${shopForm.color === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} data-testid={`color-${c}`} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-ecom-bg">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: shopForm.color }} />
              <span className="text-white text-sm">{shopForm.name || "Podglad"}</span>
            </div>
            <Button onClick={addShop} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="save-shop-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Plus size={14} className="mr-1" />}Dodaj sklep
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT SHOP */}
      <Dialog open={!!showEditShop} onOpenChange={() => setShowEditShop(null)}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-xs" data-testid="edit-shop-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Edytuj sklep</DialogTitle>
            <DialogDescription className="text-ecom-muted text-xs">Zmien nazwe lub kolor</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <Input placeholder="Nazwa" value={shopForm.name} onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white" data-testid="edit-shop-name" />
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setShopForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${shopForm.color === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <Button onClick={editShop} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="save-edit-shop">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={14} className="mr-1" />}Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD TIKTOK */}
      <Dialog open={showTikTokAdd} onOpenChange={setShowTikTokAdd}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-tiktok-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Dodaj konto TikTok</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nazwa konta" value={ttForm.name} onChange={e => setTtForm(f => ({ ...f, name: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="tiktok-name-input" />
            <Input placeholder="Advertiser ID" value={ttForm.advertiser_id} onChange={e => setTtForm(f => ({ ...f, advertiser_id: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="tiktok-adv-id-input" />
            <Input placeholder="Access Token" type="password" value={ttForm.access_token} onChange={e => setTtForm(f => ({ ...f, access_token: e.target.value }))} className="bg-ecom-bg border-ecom-border text-white" data-testid="tiktok-token-input" />
            <div>
              <p className="text-ecom-muted text-xs mb-2">Powiazane sklepy:</p>
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
            <Button onClick={addTikTok} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="tiktok-save-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}Dodaj
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
