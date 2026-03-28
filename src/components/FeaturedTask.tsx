import { useState } from "react";
import { ArrowRight, Target, Check, X } from "lucide-react";

interface FeaturedTaskProps {
  workingOn: string;
  nextAction: string;
  stuckSignal: string | null;
  onDismiss?: () => void;
}

const FeaturedTask = ({ workingOn, nextAction, stuckSignal, onDismiss }: FeaturedTaskProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={`rounded-xl border-2 ${
        completed ? "border-score-high/30 bg-score-high/5" : "border-primary/30 bg-card"
      } p-5 space-y-3 animate-fade-in transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-primary uppercase tracking-wider">
          {completed ? "✓ Completed" : "Pick up where you left off"}
        </p>
        <button
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1 rounded-md hover:bg-secondary"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <h3
        className={`text-base font-semibold leading-snug ${
          completed ? "text-muted-foreground line-through" : "text-foreground"
        }`}
      >
        {workingOn}
      </h3>

      {stuckSignal && !completed && (
        <div className="flex items-start gap-2 bg-score-mid/10 rounded-lg px-3 py-2">
          <span className="text-score-mid text-xs">⚠</span>
          <p className="text-xs text-score-mid leading-relaxed">{stuckSignal}</p>
        </div>
      )}

      <div className="flex items-start gap-2 bg-surface-sunken rounded-lg px-3 py-2.5">
        <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-foreground flex-1">
          <span className="text-muted-foreground">Next → </span>
          <span>{nextAction}</span>
        </div>
        <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto mt-0.5 shrink-0" />
      </div>

      {!completed && (
        <button
          onClick={() => setCompleted(true)}
          className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Check className="w-4 h-4" />
          Mark as done
        </button>
      )}
    </div>
  );
};

export default FeaturedTask;
