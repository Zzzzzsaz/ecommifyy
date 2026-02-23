import { useState } from "react";
import { 
  LayoutDashboard, BarChart3, ShoppingCart, CheckSquare, 
  Lightbulb, Calendar, Store, Settings, LogOut, Menu, X 
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Panel główny", icon: LayoutDashboard },
  { id: "wyniki", label: "Wyniki", icon: BarChart3 },
  { id: "orders", label: "Zamówienia", icon: ShoppingCart },
  { id: "tasks", label: "Zadania", icon: CheckSquare },
  { id: "ideas", label: "Pomysły", icon: Lightbulb },
  { id: "calendar", label: "Kalendarz", icon: Calendar },
  { id: "stores", label: "Sklepy", icon: Store },
  { id: "settings", label: "Ustawienia", icon: Settings },
];

export default function Sidebar({ activeTab, onTabChange, user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (id) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="btn-icon"
          data-testid="mobile-menu-toggle"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="font-semibold text-slate-900">Ecommify</span>
      </div>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} data-testid="sidebar">
        {/* Logo */}
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900">Ecommify</h1>
          <p className="text-xs text-slate-400 mt-0.5">Panel Ecommify</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name || "Użytkownik"}</p>
              <p className="text-xs text-slate-400">{user?.role || "admin"}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="sidebar-nav-item text-red-600 hover:bg-red-50 hover:text-red-700"
            data-testid="logout-btn"
          >
            <LogOut size={18} />
            <span>Wyloguj</span>
          </button>
        </div>
      </aside>
    </>
  );
}
