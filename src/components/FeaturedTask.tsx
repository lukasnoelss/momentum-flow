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
      className={`rounded-2xl border ${
        completed ? "border-score-high/30 bg-score-high/5" : "border-primary/20"
      } p-5 space-y-3 animate-fade-in transition-all duration-300`}
      style={!completed ? { background: 'linear-gradient(180deg, hsl(248 42% 50% / 0.04) 0%, transparent 100%)' } : undefined}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-primary uppercase tracking-[0.15em]">
          {completed ? "✓ Completed" : "Pick up where you left off"}
        </p>
        <button
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1 rounded-md"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <h3
        className={`text-[15px] font-semibold leading-snug ${
          completed ? "text-muted-foreground line-through" : "text-foreground"
        }`}
      >
        {workingOn}
      </h3>

      {stuckSignal && !completed && (
        <div className="flex items-start gap-2 bg-score-mid/10 rounded-xl px-3 py-2">
          <span className="text-score-mid text-xs">⚠</span>
          <p className="text-xs text-score-mid leading-relaxed">{stuckSignal}</p>
        </div>
      )}

      <div className="flex items-center gap-2 bg-foreground/[0.04] rounded-xl px-3.5 py-3 cursor-pointer hover:bg-foreground/[0.07] transition-colors">
        <Target className="w-4 h-4 text-primary shrink-0" />
        <div className="text-xs text-foreground flex-1">
          <span className="text-muted-foreground">Next → </span>
          <span className="font-medium">{nextAction}</span>
        </div>
        <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
      </div>

      {!completed && (
        <button
          onClick={() => setCompleted(true)}
          className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Mark as done
        </button>
      )}
    </div>
  );
};

export default FeaturedTask;
