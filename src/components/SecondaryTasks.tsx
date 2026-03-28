import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface Task {
  id: string;
  name: string;
  badge: string;
  done: boolean;
}

const SecondaryTasks = ({ tasks: initial }: { tasks: Task[] }) => {
  const [tasks, setTasks] = useState(initial);

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 bg-card rounded-lg px-4 py-3 border border-border"
        >
          <Checkbox
            checked={t.done}
            onCheckedChange={() => toggle(t.id)}
            className="border-muted-foreground/40"
          />
          <span className={`text-sm flex-1 ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {t.name}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
            {t.badge}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SecondaryTasks;
