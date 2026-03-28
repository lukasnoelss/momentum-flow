import { Checkbox } from "@/components/ui/checkbox";
import { SessionTask } from "@/hooks/useApi";
import { Zap, Battery, BatteryLow, ListChecks } from "lucide-react";

export interface TaskItem extends SessionTask {
  index: number;
  done?: boolean;
}

const pillStyles = {
  high: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20",
  medium: "bg-cyan-500/15 text-cyan-600 border border-cyan-500/20",
  low: "bg-pink-500/15 text-pink-600 border border-pink-500/20",
};

const pillIcons = {
  high: Zap,
  medium: Battery,
  low: BatteryLow,
};

const SecondaryTasks = ({
  tasks,
  onToggle,
}: {
  tasks: TaskItem[];
  onToggle: (index: number, done: boolean) => void;
}) => {
  if (tasks.length === 0) {
    return (
      <div className="relative rounded-2xl p-6 text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(108,93,211,0.04) 0%, rgba(6,182,212,0.04) 100%)' }}>
        <div className="absolute top-3 left-5 w-1.5 h-1.5 rounded-full bg-primary/15 animate-bounce" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-4 right-6 w-1 h-1 rounded-full bg-cyan-400/20 animate-bounce" style={{ animationDuration: '3s', animationDelay: '1.5s' }} />
        
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <ListChecks className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground mb-0.5">No tasks yet</p>
        <p className="text-xs text-muted-foreground">Tasks will appear here after your first scan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase px-1">Supporting tasks</p>
      {tasks.map((t) => {
        const PillIcon = pillIcons[t.energy] || Zap;
        return (
          <div
            key={t.index}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200 bg-card border border-border/60 hover:border-primary/20 hover:shadow-sm ${
              t.done ? "opacity-40" : ""
            }`}
          >
            <Checkbox
              checked={!!t.done}
              onCheckedChange={(checked) => onToggle(t.index, !!checked)}
              className="border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary w-5 h-5 rounded-md"
            />
            <span className={`text-[13px] flex-1 font-medium ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {t.task}
            </span>
            <span className={`text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold shrink-0 flex items-center gap-1 ${pillStyles[t.energy] || "bg-secondary text-primary"}`}>
              <PillIcon className="w-3 h-3" />
              {t.energy}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default SecondaryTasks;
