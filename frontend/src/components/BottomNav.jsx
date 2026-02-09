import { LayoutDashboard, ClipboardList, Store, Sparkles, Settings } from "lucide-react";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "Zadania", icon: ClipboardList },
  { id: "stores", label: "Sklepy", icon: Store },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "settings", label: "Wiecej", icon: Settings },
];

export const BottomNav = ({ activeTab, onTabChange }) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-ecom-border"
      style={{ backgroundColor: "rgba(15, 15, 26, 0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
      data-testid="bottom-nav"
    >
      <div className="max-w-[1280px] mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors duration-150 ${
                isActive ? "text-ecom-primary" : "text-ecom-muted hover:text-white"
              }`}
              data-testid={`nav-${tab.id}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
