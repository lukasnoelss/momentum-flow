import { ReactNode } from "react";
import BottomNav from "./BottomNav";

const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background">
    <BottomNav />
    <div className="max-w-5xl mx-auto px-6 md:px-10 pb-12 pt-20 md:pt-24">
      {children}
    </div>
  </div>
);

export default AppShell;
