import { useState, useCallback, useEffect } from "react";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";
import Wyniki from "@/components/Wyniki";
import Orders from "@/components/Orders";
import Tasks from "@/components/Tasks";
import CalendarPage from "@/components/CalendarPage";
import Stores from "@/components/Stores";
import Settings from "@/components/Settings";
import BottomNav from "@/components/BottomNav";
import AiAssistant from "@/components/AiAssistant";

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

  const handleAiDataChange = useCallback(() => {
    // Trigger refresh of current view when AI makes changes
    setRefreshKey(k => k + 1);
    refreshShops();
  }, [refreshShops]);

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
      case "calendar": return <CalendarPage user={user} />;
      case "stores": return <Stores shops={shops} onShopsChange={refreshShops} />;
      case "settings": return <Settings user={user} shops={shops} appSettings={appSettings} onSettingsChange={refreshSettings} onShopsChange={refreshShops} onLogout={handleLogout} />;
      default: return <Dashboard key={refreshKey} user={user} shops={shops} appSettings={appSettings} onNavigate={setActiveTab} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="app-container">
      <div className="content-area">
        {renderContent()}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <AiAssistant onDataChange={handleAiDataChange} />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
