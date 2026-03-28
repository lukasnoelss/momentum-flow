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
      className={`rounded-2xl border-2 transition-all duration-300 animate-fade-in ${
        completed
          ? "border-score-high/40 bg-score-high/5"
          : "border-primary/30 bg-card"
      } p-5 space-y-3`}
      style={!completed ? {
        boxShadow: '0 0 20px -4px rgba(108,93,211,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
        background: 'linear-gradient(180deg, rgba(108,93,211,0.06) 0%, rgba(108,93,211,0.01) 100%)',
      } : undefined}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] drop-shadow-[0_0_4px_rgba(108,93,211,0.3)]">
          {completed ? "✓ Completed" : "Continue where you left off"}
        </p>
        <button onClick={() => { setDismissed(true); onDismiss?.(); }} className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1 rounded-full hover:bg-muted/50">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <h3 className={`text-[15px] font-bold leading-snug ${completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
        {workingOn}
      </h3>

      {stuckSignal && !completed && (
        <div className="flex items-start gap-2 bg-score-mid/15 rounded-xl px-3 py-2 border border-score-mid/20">
          <span className="text-score-mid text-xs">⚠</span>
          <p className="text-xs text-score-mid leading-relaxed font-medium">{stuckSignal}</p>
        </div>
      )}

      <div className="flex items-center gap-2 bg-foreground/[0.04] hover:bg-foreground/[0.07] rounded-xl px-4 py-3 cursor-pointer transition-all border border-foreground/[0.06]">
        <Target className="w-4 h-4 text-primary shrink-0 drop-shadow-[0_0_4px_rgba(108,93,211,0.3)]" />
        <div className="text-xs text-foreground flex-1">
          <span className="text-muted-foreground font-medium">Next → </span>
          <span className="font-semibold">{nextAction}</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />
      </div>

      {!completed && (
        <button onClick={() => setCompleted(true)} className="w-full flex items-center justify-center gap-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-xl px-4 py-3 text-xs font-bold transition-all">
          <Check className="w-4 h-4" />
          Mark as done
        </button>
      )}
    </div>
  );
};

export default FeaturedTask;
