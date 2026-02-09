import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LogOut, Smartphone, Monitor, Info } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_d80f261d-499e-4117-b40a-11f7363e88f3/artifacts/gvqot30h_ecommify%20logo.png";

export default function Settings({ user, onLogout }) {
  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="settings-page">
      <h1 className="font-heading text-2xl font-bold text-white mb-6">Ustawienia</h1>

      {/* User Info */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="user-info-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-ecom-primary/20 flex items-center justify-center text-ecom-primary font-heading font-bold text-xl">
              {user.name[0]}
            </div>
            <div>
              <p className="text-white font-medium">{user.name}</p>
              <Badge variant="secondary" className="mt-1 text-[10px] capitalize">{user.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="app-info-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <img src={LOGO_URL} alt="Ecommify" className="h-8 object-contain" />
            <div>
              <p className="text-white font-medium text-sm">Ecommify Campaign Calculator</p>
              <p className="text-ecom-muted text-xs">v1.0.0</p>
            </div>
          </div>
          <p className="text-ecom-muted text-xs leading-relaxed">
            Sledzenie zyskownosci e-commerce. Przychody Shopify, koszty TikTok Ads, obliczanie zysku netto.
          </p>
        </CardContent>
      </Card>

      {/* PWA Instructions */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="pwa-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-ecom-primary" />
            <h3 className="text-white font-medium text-sm">Zainstaluj aplikacje</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Smartphone size={14} className="text-ecom-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-white text-xs font-medium">iPhone</p>
                <p className="text-ecom-muted text-xs">Safari &rarr; Udostepnij &rarr; Dodaj do ekranu poczatkowego</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Smartphone size={14} className="text-ecom-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-white text-xs font-medium">Android</p>
                <p className="text-ecom-muted text-xs">Chrome &rarr; Menu (3 kropki) &rarr; Zainstaluj aplikacje</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Monitor size={14} className="text-ecom-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-white text-xs font-medium">Komputer</p>
                <p className="text-ecom-muted text-xs">Chrome &rarr; Ikona instalacji w pasku adresu</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-ecom-border my-4" />

      <Button onClick={onLogout} variant="outline" className="w-full border-ecom-danger/50 text-ecom-danger hover:bg-ecom-danger/10 hover:text-ecom-danger" data-testid="logout-btn">
        <LogOut size={16} className="mr-2" /> Wyloguj sie
      </Button>
    </div>
  );
}
