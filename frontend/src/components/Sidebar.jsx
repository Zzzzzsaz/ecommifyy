import { 
  LayoutDashboard, BarChart3, ShoppingCart, CheckSquare, 
  Lightbulb, Calendar, Store, Settings, LogOut, X, FileSpreadsheet, KeyRound, FileText 
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Start", icon: LayoutDashboard },
  { id: "wyniki", label: "Wyniki", icon: BarChart3 },
  { id: "orders", label: "Zamówienia", icon: ShoppingCart },
  { id: "tasks", label: "Zadania", icon: CheckSquare },
  { id: "ideas", label: "Pomysły", icon: Lightbulb },
  { id: "excel", label: "Arkusze", icon: FileSpreadsheet },
  { id: "notepad", label: "Notatnik", icon: FileText },
  { id: "vault", label: "Hasła", icon: KeyRound },
  { id: "calendar", label: "Kalendarz", icon: Calendar },
  { id: "stores", label: "Sklepy", icon: Store },
  { id: "settings", label: "Ustawienia", icon: Settings },
];

export default function Sidebar({ activeTab, onTabChange, user, onLogout, mobileOpen, onClose }) {
  const handleNavClick = (id) => {
    onTabChange(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} data-testid="sidebar">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Ecommify</h1>
          </div>
          <button onClick={onClose} className="md:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-0.5">
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
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            </div>
          </div>
          <button onClick={onLogout} className="sidebar-nav-item text-red-600 hover:bg-red-50">
            <LogOut size={18} />
            <span>Wyloguj</span>
          </button>
        </div>
      </aside>
    </>
  );
}
