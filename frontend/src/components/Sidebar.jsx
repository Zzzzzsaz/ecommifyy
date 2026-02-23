import { LayoutDashboard, BarChart3, ShoppingCart, CheckSquare, Lightbulb, Calendar, Store, Settings, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

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
      {/* Mobile hamburger button */}
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-white rounded-lg border border-slate-200 shadow-sm"
        data-testid="mobile-menu-toggle"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`sidebar flex flex-col transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        data-testid="sidebar"
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">Ecommify</h1>
          <p className="text-sm text-slate-500 mt-1">Panel zarządzania</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`sidebar-link w-full text-left ${isActive ? 'active' : ''}`}
                data-testid={`nav-${item.id}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name || "Użytkownik"}</p>
              <p className="text-xs text-slate-500">{user?.role || "admin"}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            data-testid="logout-btn"
          >
            <LogOut size={18} />
            <span>Wyloguj się</span>
          </button>
        </div>
      </aside>
    </>
  );
}
