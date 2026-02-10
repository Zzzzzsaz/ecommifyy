import { useState, useCallback } from "react";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";
import Wyniki from "@/components/Wyniki";
import Tasks from "@/components/Tasks";
import Stores from "@/components/Stores";
import Chat from "@/components/Chat";
import Settings from "@/components/Settings";
import BottomNav from "@/components/BottomNav";

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleLogin = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
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
      case "dashboard": return <Dashboard user={user} onNavigate={setActiveTab} onLogout={handleLogout} />;
      case "wyniki": return <Wyniki user={user} />;
      case "tasks": return <Tasks user={user} />;
      case "stores": return <Stores />;
      case "ai": return <Chat user={user} />;
      case "settings": return <Settings user={user} onLogout={handleLogout} />;
      default: return <Dashboard user={user} onNavigate={setActiveTab} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="app-container">
      <div className="content-area">
        {renderContent()}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
