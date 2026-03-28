import { ReactNode } from "react";
import BottomNav from "./BottomNav";

const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background flex justify-center">
    <div className="w-full max-w-[420px] bg-card min-h-screen relative px-5 pb-28 pt-16">
      {children}
      <BottomNav />
    </div>
  </div>
);

export default AppShell;
