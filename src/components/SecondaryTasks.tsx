import { Checkbox } from "@/components/ui/checkbox";
import { SessionTask } from "@/hooks/useApi";

export interface TaskItem extends SessionTask {
  index: number;
  done?: boolean;
}

const pillColor = {
  high: "bg-score-high/10 text-score-high",
  medium: "bg-score-mid/10 text-score-mid",
  low: "bg-score-low/10 text-score-low",
};

const SecondaryTasks = ({ 
  tasks, 
  onToggle 
}: { 
  tasks: TaskItem[], 
  onToggle: (index: number, done: boolean) => void 
}) => {
  if (tasks.length === 0) {
    return (
      <div className="bg-primary/[0.02] rounded-2xl px-4 py-5 text-center">
        <p className="text-xs text-muted-foreground">
          No secondary tasks for this session yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div
          key={t.index}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 bg-foreground/[0.02] ${
            t.done ? "opacity-50" : ""
          }`}
        >
          <Checkbox
            checked={!!t.done}
            onCheckedChange={(checked) => onToggle(t.index, !!checked)}
            className="border-muted-foreground/30"
          />
          <span
            className={`text-[13px] flex-1 truncate ${
              t.done ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {t.task}
          </span>
          <span
            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0 ${
              pillColor[t.energy] || "bg-secondary text-primary"
            }`}
          >
            {t.energy}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SecondaryTasks;
