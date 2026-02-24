import { LayoutDashboard, BarChart3, CheckSquare, Lightbulb, Menu } from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Start", icon: LayoutDashboard },
  { id: "wyniki", label: "Wyniki", icon: BarChart3 },
  { id: "tasks", label: "Zadania", icon: CheckSquare },
  { id: "ideas", label: "Pomysły", icon: Lightbulb },
  { id: "menu", label: "Więcej", icon: Menu },
];

export default function BottomNav({ activeTab, onTabChange, onMenuClick }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isMenu = item.id === "menu";

          return (
            <button
              key={item.id}
              onClick={() => isMenu ? onMenuClick() : onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
                isActive && !isMenu ? "text-slate-900" : "text-slate-400"
              }`}
              data-testid={`bottom-nav-${item.id}`}
            >
              <Icon size={20} strokeWidth={isActive && !isMenu ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
