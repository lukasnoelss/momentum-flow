import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { scoreColor } from "@/hooks/useApi";

interface SessionTask {
  id: string;
  workingOn: string;
  focusScore: number;
  focusLabel: string;
  done: boolean;
}

const pillColor = {
  high: "bg-score-high/10 text-score-high",
  mid: "bg-score-mid/10 text-score-mid",
  low: "bg-score-low/10 text-score-low",
};

const SecondaryTasks = ({ tasks: initial }: { tasks: SessionTask[] }) => {
  const [tasks, setTasks] = useState(initial);

  const toggle = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  if (tasks.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border px-4 py-5 text-center">
        <p className="text-sm text-muted-foreground">
          No previous sessions yet — your recent tasks will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 bg-card rounded-lg px-4 py-3 border border-border transition-all duration-200 ${
            t.done ? "opacity-50" : ""
          }`}
        >
          <Checkbox
            checked={t.done}
            onCheckedChange={() => toggle(t.id)}
            className="border-muted-foreground/40"
          />
          <span
            className={`text-sm flex-1 truncate ${
              t.done ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {t.workingOn}
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${
              pillColor[scoreColor(t.focusScore)]
            }`}
          >
            {t.focusScore}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SecondaryTasks;
