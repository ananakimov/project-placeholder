import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="app-content">
        <main className="app-main">
          <div className="page-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
