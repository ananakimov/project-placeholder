import { useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Archive, ClipboardList, Plus, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Новая проверка", url: "/checks/new", icon: Plus },
  { title: "Проверки", url: "/checks", icon: ClipboardList },
  { title: "Архив проверок", url: "/archive", icon: Archive },
] as const;

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const path = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside aria-label="Меню DocCheck" className="app-sidebar" data-mobile-open={mobileOpen}
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileOpen) {
          setMobileOpen(false);
          trigger.current?.focus();
        }
      }}>
      <div className="brand" aria-label="DocCheck">
        <span className="brand-symbol"><ScanLine size={23} aria-hidden="true" /></span>
        <span className="brand-name">doccheck<span className="brand-dot" /></span>
      </div>
      <button ref={trigger} type="button" className="brand sidebar-mobile-trigger" aria-label="Меню разделов"
        aria-expanded={mobileOpen} aria-controls="doccheck-navigation" onClick={() => setMobileOpen((previous) => !previous)}>
        <span className="brand-symbol"><ScanLine size={23} aria-hidden="true" /></span>
        <span className="brand-name">doccheck<span className="brand-dot" /></span>
      </button>
      <nav id="doccheck-navigation" aria-label="Основная навигация">
        {items.map((item) => {
          const active = item.url === "/checks"
            ? /^\/checks\/?$/.test(path) || (path.startsWith("/checks/") && !/^\/checks\/new\/?$/.test(path))
            : path.replace(/\/$/, "") === item.url;
          return (
            <Link key={item.url} to={item.url} aria-label={item.title} aria-current={active ? "page" : undefined}
              activeOptions={{ exact: true }} onClick={() => setMobileOpen(false)} className={cn("nav-item", active && "active")}>
              <item.icon size={19} aria-hidden="true" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
