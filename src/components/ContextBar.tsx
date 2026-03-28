import { Sparkles } from "lucide-react";

const ContextBar = ({ message }: { message: string }) => (
  <div className="relative bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent rounded-2xl px-4 py-4 flex gap-3 items-start animate-fade-in card-glow overflow-hidden">
    {/* Shimmer overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.03] to-transparent opacity-60" style={{ backgroundSize: '200% 100%', animation: 'shimmer 4s ease-in-out infinite' }} />
    <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0 drop-shadow-[0_0_8px_rgba(108,93,211,0.4)] relative z-10" />
    <p className="text-[13px] text-foreground/80 leading-relaxed font-medium relative z-10">{message}</p>
  </div>
);

export default ContextBar;
