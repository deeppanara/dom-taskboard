import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Inbox,
  ListTodo,
  LayoutDashboard,
  FolderKanban,
  Users,
  Ticket,
  Zap,
  TerminalSquare,
  Sun,
  Moon,
} from "lucide-react";
import TerminalPanel from "./TerminalPanel";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { to: "/inbox", icon: Inbox, label: "Inbox" },
  { to: "/todos", icon: ListTodo, label: "Todo List" },
  { to: "/", icon: LayoutDashboard, label: "Board" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/teams", icon: Users, label: "Teams" },
  { to: "/tickets", icon: Ticket, label: "Tickets" },
];

export default function Layout() {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <aside className="w-56 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-200 dark:border-slate-800">
          <Zap className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <span className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
            Taskboard
          </span>
        </div>

        <nav className="flex-1 py-3 px-2.5 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2.5 pb-2 space-y-1">
          <button
            onClick={() => setTerminalOpen((v) => !v)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors w-full ${
              terminalOpen
                ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 font-medium"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <TerminalSquare className="w-4 h-4" />
            Terminal
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors w-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <div className="flex items-center gap-2.5">
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
              {theme}
            </span>
          </button>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 tracking-wider uppercase">
            v0.6.0
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 transition-colors">
          <Outlet />
        </main>
        <TerminalPanel
          isOpen={terminalOpen}
          onClose={() => setTerminalOpen(false)}
        />
      </div>
    </div>
  );
}
