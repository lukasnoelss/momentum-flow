import { ReactNode } from "react";
import BottomNav from "./BottomNav";

const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex justify-center py-6 px-4">
    <div className="w-full max-w-[420px] bg-card rounded-3xl shadow-2xl shadow-primary/5 min-h-[calc(100vh-48px)] relative overflow-hidden">
      <div className="px-5 pb-28 pt-5">
        {children}
      </div>
      <BottomNav />
    </div>
  </div>
);

export default AppShell;
