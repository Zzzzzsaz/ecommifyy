import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RefreshCw, Plus, Trash2, Loader2, Save, ShoppingBag } from "lucide-react";

const SHOPS = [
  { id: 1, name: "ecom1", color: "#6366f1" },
  { id: 2, name: "ecom2", color: "#10b981" },
  { id: 3, name: "ecom3", color: "#f59e0b" },
  { id: 4, name: "ecom4", color: "#ec4899" },
];

export default function Stores() {
  const [shopifyConfigs, setShopifyConfigs] = useState([]);
  const [tiktokConfigs, setTiktokConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
      SHOPS.forEach((s) => {
        const existing = sh.data.find((c) => c.shop_id === s.id);
        forms[s.id] = { store_url: existing?.store_url || "", api_token: existing?.api_token || "" };
      });
      setShopifyForms(forms);
    } catch {
      toast.error("Blad ladowania konfiguracji");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const saveShopify = async (shopId) => {
    const f = shopifyForms[shopId];
    if (!f?.store_url || !f?.api_token) { toast.error("Wypelnij oba pola"); return; }
    setSaving(true);
    try {
      await api.saveShopifyConfig({ shop_id: shopId, store_url: f.store_url, api_token: f.api_token });
      toast.success("Zapisano konfiguracje Shopify");
      fetchConfigs();
    } catch {
      toast.error("Blad zapisu");
    } finally {
      setSaving(false);
    }
  };

  const deleteShopify = async (shopId) => {
    try {
      await api.deleteShopifyConfig(shopId);
      toast.success("Usunieto");
      fetchConfigs();
    } catch {
      toast.error("Blad usuwania");
    }
  };

  const addTikTok = async () => {
    if (!ttForm.name || !ttForm.advertiser_id || !ttForm.access_token) { toast.error("Wypelnij wymagane pola"); return; }
    setSaving(true);
    try {
      await api.createTikTokConfig(ttForm);
      toast.success("Dodano konto TikTok");
      setShowTikTokAdd(false);
      setTtForm({ name: "", advertiser_id: "", access_token: "", linked_shop_ids: [] });
      fetchConfigs();
    } catch {
      toast.error("Blad dodawania");
    } finally {
      setSaving(false);
    }
  };

  const deleteTikTok = async (id) => {
    try {
      await api.deleteTikTokConfig(id);
      toast.success("Usunieto");
      fetchConfigs();
    } catch {
      toast.error("Blad usuwania");
    }
  };

  const syncAll = async () => {
    const now = new Date();
    setSyncing(true);
    try {
      const r = await api.syncAll(now.getFullYear(), now.getMonth() + 1);
      toast.success("Synchronizacja zakonczona");
      console.log("Sync results:", r.data);
    } catch {
      toast.error("Blad synchronizacji");
    } finally {
      setSyncing(false);
    }
  };

  const toggleLinkedShop = (shopId) => {
    setTtForm((f) => ({
      ...f,
      linked_shop_ids: f.linked_shop_ids.includes(shopId)
        ? f.linked_shop_ids.filter((id) => id !== shopId)
        : [...f.linked_shop_ids, shopId],
    }));
  };

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="stores-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Sklepy</h1>
        <Button onClick={syncAll} disabled={syncing} size="sm" variant="outline" className="border-ecom-border text-ecom-muted hover:text-white" data-testid="sync-all-btn">
          <RefreshCw size={14} className={`mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchronizuje..." : "Synchronizuj"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={32} /></div>
      ) : (
        <>
          {/* Shopify Section */}
          <h2 className="font-heading text-base font-semibold text-white mb-3 flex items-center gap-2">
            <ShoppingBag size={16} className="text-ecom-primary" /> Shopify
          </h2>
          <div className="space-y-3 mb-8">
            {SHOPS.map((s) => {
              const f = shopifyForms[s.id] || { store_url: "", api_token: "" };
              const existing = shopifyConfigs.find((c) => c.shop_id === s.id);
              return (
                <Card key={s.id} className="bg-ecom-card border-ecom-border border-l-[3px]" style={{ borderLeftColor: s.color }} data-testid={`shopify-config-${s.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">{s.name}</span>
                        {existing && <Badge variant="secondary" className="text-[10px] text-ecom-success">Skonfigurowany</Badge>}
                      </div>
                      {existing && (
                        <button onClick={() => deleteShopify(s.id)} className="text-ecom-muted hover:text-ecom-danger" data-testid={`delete-shopify-${s.id}`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Store URL (np. sklep.myshopify.com)"
                        value={f.store_url}
                        onChange={(e) => setShopifyForms((p) => ({ ...p, [s.id]: { ...p[s.id], store_url: e.target.value } }))}
                        className="bg-ecom-bg border-ecom-border text-white text-sm"
                        data-testid={`shopify-url-${s.id}`}
                      />
                      <Input
                        placeholder="Admin API Access Token"
                        type="password"
                        value={f.api_token}
                        onChange={(e) => setShopifyForms((p) => ({ ...p, [s.id]: { ...p[s.id], api_token: e.target.value } }))}
                        className="bg-ecom-bg border-ecom-border text-white text-sm"
                        data-testid={`shopify-token-${s.id}`}
                      />
                      <Button onClick={() => saveShopify(s.id)} size="sm" disabled={saving} className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid={`save-shopify-${s.id}`}>
                        <Save size={12} className="mr-1" /> Zapisz
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator className="bg-ecom-border mb-6" />

          {/* TikTok Section */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base font-semibold text-white flex items-center gap-2">TikTok Ads</h2>
            <Button onClick={() => setShowTikTokAdd(true)} size="sm" variant="outline" className="border-ecom-border text-ecom-muted hover:text-white" data-testid="add-tiktok-btn">
              <Plus size={14} className="mr-1" /> Dodaj konto
            </Button>
          </div>
          <div className="space-y-3">
            {tiktokConfigs.map((tc) => (
              <Card key={tc.id} className="bg-ecom-card border-ecom-border" data-testid={`tiktok-config-${tc.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{tc.name}</p>
                      <p className="text-ecom-muted text-xs mt-0.5">ID: {tc.advertiser_id}</p>
                      <div className="flex gap-1 mt-1">
                        {tc.linked_shop_ids?.map((sid) => {
                          const sh = SHOPS.find((s) => s.id === sid);
                          return sh ? <Badge key={sid} variant="outline" className="text-[10px]" style={{ borderColor: sh.color, color: sh.color }}>{sh.name}</Badge> : null;
                        })}
                      </div>
                    </div>
                    <button onClick={() => deleteTikTok(tc.id)} className="text-ecom-muted hover:text-ecom-danger" data-testid={`delete-tiktok-${tc.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tiktokConfigs.length === 0 && (
              <div className="text-center py-8 text-ecom-muted text-sm border border-dashed border-ecom-border rounded-lg">Brak kont TikTok</div>
            )}
          </div>
        </>
      )}

      {/* Add TikTok Dialog */}
      <Dialog open={showTikTokAdd} onOpenChange={setShowTikTokAdd}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-tiktok-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Dodaj konto TikTok</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Nazwa konta"
              value={ttForm.name}
              onChange={(e) => setTtForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white"
              data-testid="tiktok-name-input"
            />
            <Input
              placeholder="Advertiser ID"
              value={ttForm.advertiser_id}
              onChange={(e) => setTtForm((f) => ({ ...f, advertiser_id: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white"
              data-testid="tiktok-adv-id-input"
            />
            <Input
              placeholder="Access Token"
              type="password"
              value={ttForm.access_token}
              onChange={(e) => setTtForm((f) => ({ ...f, access_token: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white"
              data-testid="tiktok-token-input"
            />
            <div>
              <p className="text-ecom-muted text-xs mb-2">Powiazane sklepy:</p>
              <div className="flex flex-wrap gap-3">
                {SHOPS.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={ttForm.linked_shop_ids.includes(s.id)}
                      onCheckedChange={() => toggleLinkedShop(s.id)}
                      data-testid={`tiktok-link-shop-${s.id}`}
                    />
                    <span className="text-sm" style={{ color: s.color }}>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={addTikTok} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="tiktok-save-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Dodaj
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
