import { useState, useCallback } from "react";
import "@/index.css";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";
import Wyniki from "@/components/Wyniki";
import Orders from "@/components/Orders";
import Tasks from "@/components/Tasks";
import Ideas from "@/components/Ideas";
import CalendarPage from "@/components/CalendarPage";
import Stores from "@/components/Stores";
import Settings from "@/components/Settings";
import Sidebar from "@/components/Sidebar";

function App() {
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [appSettings, setAppSettings] = useState({});
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogin = useCallback((data) => {
    setUser(data.user);
    if (data.shops) setShops(data.shops);
    if (data.settings) setAppSettings(data.settings);
  }, []);

  const refreshShops = useCallback(async () => {
    try {
      const r = await api.getShops();
      setShops(r.data);
    } catch {}
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const r = await api.getAppSettings();
      setAppSettings(r.data);
    } catch {}
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setShops([]);
    setAppSettings({});
    setActiveTab("dashboard");
  }, []);

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard key={refreshKey} user={user} shops={shops} appSettings={appSettings} onNavigate={setActiveTab} onLogout={handleLogout} />;
      case "wyniki": return <Wyniki key={refreshKey} user={user} shops={shops} appSettings={appSettings} />;
      case "orders": return <Orders key={refreshKey} user={user} shops={shops} />;
      case "tasks": return <Tasks user={user} />;
      case "ideas": return <Ideas user={user} />;
      case "calendar": return <CalendarPage user={user} />;
      case "stores": return <Stores shops={shops} onShopsChange={refreshShops} />;
      case "settings": return <Settings user={user} shops={shops} appSettings={appSettings} onSettingsChange={refreshSettings} onShopsChange={refreshShops} onLogout={handleLogout} />;
      default: return <Dashboard key={refreshKey} user={user} shops={shops} appSettings={appSettings} onNavigate={setActiveTab} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        user={user}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {renderContent()}
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
