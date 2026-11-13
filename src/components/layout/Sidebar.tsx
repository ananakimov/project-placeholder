import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Plus, History, ScanLine } from "lucide-react";
import { useRole, type Role } from "@/context/RoleContext";
import { cn } from "@/lib/utils";
const items = [
  { title: "Новая проверка", url: "/checks/new", icon: Plus },
  { title: "Обзор проверок", url: "/checks", icon: ClipboardList },
  { title: "Журнал действий", url: "/log", icon: History },
] as const;
export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role, setRole } = useRole();
  return (
    <aside className="app-sidebar">
      <Link to="/checks/new" className="brand">
        <span className="brand-symbol">
          <ScanLine size={23} />
        </span>
        doccheck
        <span className="brand-dot" />
      </Link>
      <nav aria-label="Основная навигация">
        {items.map((i) => (
          <Link
            key={i.url}
            to={i.url}
            activeOptions={{ exact: true }}
            className={cn(
              "nav-item",
              (i.url === "/checks"
                ? path === "/checks" || (path.startsWith("/checks/") && path !== "/checks/new")
                : path.startsWith(i.url)) && "active",
            )}
          >
            <i.icon size={19} />
            <span>{i.title}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="role-switch" role="group" aria-label="Роль пользователя">
          {(["Аспирант", "Бухгалтер"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={cn(role === r && "selected")}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="profile">
          <span className="profile-avatar">АИ</span>
          <div>
            <strong>Анна Иванова</strong>
            <small>{role}</small>
          </div>
          <span className="online-dot" />
        </div>
      </div>
    </aside>
  );
}
