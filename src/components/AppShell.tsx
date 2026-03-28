import { ReactNode } from "react";
import BottomNav from "./BottomNav";

const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background">
    <div className="max-w-[420px] mx-auto px-5 pb-24 pt-6">
      {children}
    </div>
    <BottomNav />
  </div>
);

export default AppShell;
