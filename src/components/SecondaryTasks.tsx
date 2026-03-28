import { Checkbox } from "@/components/ui/checkbox";
import { SessionTask } from "@/hooks/useApi";

export interface TaskItem extends SessionTask {
  index: number;
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
      <div className="bg-card rounded-lg border border-border px-4 py-5 text-center">
        <p className="text-sm text-muted-foreground">
          No secondary tasks auto-generated for this session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div
          key={t.index}
          className={`flex items-center gap-3 bg-card rounded-lg px-4 py-3 border border-border transition-all duration-200 ${
            t.done ? "opacity-50" : ""
          }`}
        >
          <Checkbox
            checked={t.done}
            onCheckedChange={(checked) => onToggle(t.index, !!checked)}
            className="border-muted-foreground/40"
          />
          <span
            className={`text-sm flex-1 truncate ${
              t.done ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {t.task}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
              pillColor[t.energy] || "bg-secondary text-primary"
            }`}
          >
            {t.energy} energy
          </span>
        </div>
      ))}
    </div>
  );
};

export default SecondaryTasks;
