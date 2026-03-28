import { Home, BarChart3, MessageCircle, Clock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", icon: Home, label: "Today" },
  { path: "/history", icon: BarChart3, label: "Focus" },
  { path: "/chat", icon: MessageCircle, label: "Ask" },
  { path: "/sessions", icon: Clock, label: "Log" },
];

const BottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-b border-border z-50">
      <div className="max-w-5xl mx-auto px-6 md:px-10 flex items-center justify-between h-14">
        <span className="text-lg font-display text-foreground tracking-tight">Momentum</span>
        <div className="flex gap-1">
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
