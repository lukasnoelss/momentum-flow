import { Checkbox } from "@/components/ui/checkbox";
import { SessionTask } from "@/hooks/useApi";

export interface TaskItem extends SessionTask {
  index: number;
  done?: boolean;
}

const pillStyles = {
  high: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20",
  medium: "bg-cyan-500/15 text-cyan-600 border border-cyan-500/20",
  low: "bg-pink-500/15 text-pink-600 border border-pink-500/20",
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
      <div className="bg-primary/[0.03] rounded-2xl px-4 py-5 text-center">
        <p className="text-xs text-muted-foreground">No secondary tasks for this session yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div
          key={t.index}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200 bg-card border border-border/60 hover:border-primary/20 hover:shadow-sm ${
            t.done ? "opacity-40" : ""
          }`}
        >
          <Checkbox
            checked={!!t.done}
            onCheckedChange={(checked) => onToggle(t.index, !!checked)}
            className="border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <span className={`text-[13px] flex-1 truncate font-medium ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {t.task}
          </span>
          <span className={`text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold shrink-0 ${pillStyles[t.energy] || "bg-secondary text-primary"}`}>
            {t.energy}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SecondaryTasks;
