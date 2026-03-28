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
    <nav className="fixed top-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-b border-border/50 z-50">
      <div className="max-w-5xl mx-auto px-8 md:px-12 flex items-center justify-between h-16">
        <span className="text-xl font-display text-foreground tracking-tight">Momentum</span>
        <div className="flex gap-1">
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "drop-shadow-[0_0_6px_rgba(108,93,211,0.4)]" : ""}`} />
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
