import { Sparkles } from "lucide-react";

const ContextBar = ({ message }: { message: string }) => (
  <div className="bg-surface-sunken rounded-lg px-4 py-3 flex gap-3 items-start animate-fade-in">
    <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
    <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
  </div>
);

export default ContextBar;
