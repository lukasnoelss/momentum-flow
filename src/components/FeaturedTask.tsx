import { ArrowRight, FileCode } from "lucide-react";

interface FeaturedTaskProps {
  name: string;
  nudge: string;
  firstStep: { file: string; line: number; action: string };
}

const FeaturedTask = ({ name, nudge, firstStep }: FeaturedTaskProps) => (
  <div className="rounded-xl border-2 border-primary/30 bg-card p-5 space-y-3 animate-fade-in">
    <p className="text-xs font-medium text-primary uppercase tracking-wider">Pick up where you left off</p>
    <h3 className="text-base font-semibold text-foreground leading-snug">{name}</h3>
    <p className="text-sm text-muted-foreground">{nudge}</p>
    <div className="flex items-start gap-2 bg-surface-sunken rounded-lg px-3 py-2.5">
      <FileCode className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <div className="text-xs text-foreground">
        <span className="font-mono text-primary">{firstStep.file}:{firstStep.line}</span>
        <span className="text-muted-foreground"> — </span>
        <span>{firstStep.action}</span>
      </div>
      <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto mt-0.5 shrink-0" />
    </div>
  </div>
);

export default FeaturedTask;
