import { useCallback, useEffect, useState, useMemo } from "react";
import {
  Inbox as InboxIcon,
  Plus,
  Check,
  Calendar,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Users,
  Trash2,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Search,
} from "lucide-react";
import { api, type Ticket, type Project, type Team } from "../api/client";
import TicketPanel from "../components/TicketPanel";

const STATUSES = ["todo", "in_progress", "dev_done", "qa_in_progress", "live_in_progress", "done"];
const PRIORITIES = ["urgent", "high", "medium", "low"];

const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  dev_done: "Dev Done",
  qa_in_progress: "QA In Progress",
  live_in_progress: "Live In Progress",
  done: "Done",
};

const STATUS_STYLES: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400",
  in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  dev_done: "bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  qa_in_progress: "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  live_in_progress: "bg-teal-50 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400",
  done: "bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-400",
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; ringColor: string; checkColor: string; textColor: string; icon: typeof ArrowUp }
> = {
  urgent: {
    label: "Priority 1 (Urgent)",
    ringColor: "border-red-500 hover:bg-red-500/10",
    checkColor: "text-red-500",
    textColor: "text-red-600 dark:text-red-400",
    icon: AlertTriangle,
  },
  high: {
    label: "Priority 2 (High)",
    ringColor: "border-orange-500 hover:bg-orange-500/10",
    checkColor: "text-orange-500",
    textColor: "text-orange-600 dark:text-orange-400",
    icon: ArrowUp,
  },
  medium: {
    label: "Priority 3 (Medium)",
    ringColor: "border-yellow-500 hover:bg-yellow-500/10",
    checkColor: "text-yellow-500",
    textColor: "text-yellow-600 dark:text-yellow-400",
    icon: ArrowRight,
  },
  low: {
    label: "Priority 4 (Low)",
    ringColor: "border-slate-400 hover:bg-slate-400/10 dark:border-slate-500",
    checkColor: "text-slate-400 dark:text-slate-500",
    textColor: "text-green-600 dark:text-green-400",
    icon: ArrowDown,
  },
};

type GroupBy = "none" | "project" | "priority" | "status" | "date";
type SortBy = "position" | "date" | "priority" | "title";

interface TaskSection {
  id: string;
  title: string;
  color?: string;
  textColor?: string;
  tickets: Ticket[];
}

export default function Inbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortBy, setSortBy] = useState<SortBy>("position");
  const [showCompleted, setShowCompleted] = useState(true);

  // Quick Inline Add Task state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newStatus, setNewStatus] = useState("todo");

  const loadData = useCallback(async () => {
    try {
      const [t, p, tm] = await Promise.all([
        api.tickets.list(),
        api.projects.list(),
        api.teams.list(),
      ]);
      setTickets(t || []);
      setProjects(p || []);
      setTeams(tm || []);
      if (!newProjectId && p && p.length > 0) {
        setNewProjectId(p[0].id);
      }
    } catch {
      setTickets([]);
      setProjects([]);
      setTeams([]);
    }
    setLoading(false);
  }, [newProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleComplete = async (ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTargetStatus = ticket.status === "done" ? "todo" : "done";
    try {
      await api.tickets.move(ticket.id, newTargetStatus);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, status: newTargetStatus } : t))
      );
    } catch {
      loadData();
    }
  };

  const handleDeleteTicket = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.tickets.delete(id);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      if (selectedTicket?.id === id) setSelectedTicket(null);
    } catch {
      loadData();
    }
  };

  const handleCreateTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const projId = newProjectId || (projects[0] ? projects[0].id : "");
    if (!projId) return;

    try {
      const created = await api.tickets.create({
        projectId: projId,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
        status: newStatus,
        dueDate: newDueDate || undefined,
        teamId: newTeamId || undefined,
      });

      setTickets((prev) => [...prev, created]);
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
    } catch (err) {
      console.error("Failed to create ticket:", err);
    }
  };

  const handleUpdate = async (id: string, data: Partial<Ticket>) => {
    await api.tickets.update(id, data);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await api.tickets.delete(id);
    loadData();
  };

  // Filter and sort tickets
  const processedTickets = useMemo(() => {
    let result = tickets.filter((t) => {
      if (!showCompleted && t.status === "done") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchPrefix = `${t.projectPrefix}-${t.number}`.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchPrefix) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "priority") {
        const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
      }
      if (sortBy === "date") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      // default: position or creation
      return a.position - b.position;
    });

    return result;
  }, [tickets, showCompleted, searchQuery, sortBy]);

  // Grouping logic
  const groupedSections = useMemo<TaskSection[]>(() => {
    if (groupBy === "none") {
      return [{ id: "all", title: "", tickets: processedTickets }];
    }

    if (groupBy === "project") {
      const map = new Map<string, Ticket[]>();
      for (const t of processedTickets) {
        const pId = t.projectId || "none";
        if (!map.has(pId)) map.set(pId, []);
        map.get(pId)!.push(t);
      }
      return Array.from(map.entries()).map(([pId, list]) => {
        const proj = projects.find((p) => p.id === pId);
        return {
          id: pId,
          title: proj ? `${proj.icon || "📁"} ${proj.name}` : "No Project",
          color: proj?.color,
          tickets: list,
        };
      });
    }

    if (groupBy === "status") {
      return STATUSES.map((status) => ({
        id: status,
        title: STATUS_LABELS[status] || status,
        tickets: processedTickets.filter((t) => t.status === status),
      })).filter((sec) => sec.tickets.length > 0);
    }

    if (groupBy === "priority") {
      return PRIORITIES.map((p) => ({
        id: p,
        title: PRIORITY_CONFIG[p]?.label || p,
        textColor: PRIORITY_CONFIG[p]?.textColor,
        tickets: processedTickets.filter((t) => t.priority === p),
      })).filter((sec) => sec.tickets.length > 0);
    }

    if (groupBy === "date") {
      const today = new Date().toISOString().split("T")[0];
      const overdue: Ticket[] = [];
      const dueToday: Ticket[] = [];
      const upcoming: Ticket[] = [];
      const noDate: Ticket[] = [];

      for (const t of processedTickets) {
        if (!t.dueDate) {
          noDate.push(t);
        } else {
          const d = t.dueDate.split("T")[0];
          if (d < today) overdue.push(t);
          else if (d === today) dueToday.push(t);
          else upcoming.push(t);
        }
      }

      const sections: TaskSection[] = [];
      if (overdue.length > 0) sections.push({ id: "overdue", title: "Overdue", tickets: overdue, textColor: "text-red-500" });
      if (dueToday.length > 0) sections.push({ id: "today", title: "Today", tickets: dueToday, textColor: "text-amber-500" });
      if (upcoming.length > 0) sections.push({ id: "upcoming", title: "Upcoming", tickets: upcoming });
      if (noDate.length > 0) sections.push({ id: "nodate", title: "No Due Date", tickets: noDate });
      return sections;
    }

    return [{ id: "all", title: "", tickets: processedTickets }];
  }, [groupBy, processedTickets, projects]);

  const activeCount = useMemo(() => tickets.filter((t) => t.status !== "done").length, [tickets]);
  const doneCount = useMemo(() => tickets.filter((t) => t.status === "done").length, [tickets]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <header className="shrink-0 flex items-center justify-between px-8 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <InboxIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Inbox</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeCount} active task{activeCount !== 1 ? "s" : ""}
              {doneCount > 0 && ` • ${doneCount} completed`}
            </p>
          </div>
        </div>

        {/* Action / View controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick search…"
              className="pl-8 pr-3 py-1.5 w-48 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Group By Select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="none">No Grouping</option>
              <option value="project">Group by Project</option>
              <option value="status">Group by Status</option>
              <option value="priority">Group by Priority</option>
              <option value="date">Group by Due Date</option>
            </select>
          </div>

          {/* Sort By Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="position">Sort: Order</option>
            <option value="date">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Alphabetical</option>
          </select>

          {/* Toggle completed */}
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors shadow-2xs cursor-pointer ${
              showCompleted
                ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
            }`}
            title="Toggle completed tasks"
          >
            {showCompleted ? "Hide Done" : "Show Done"}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-600 text-sm">
              Loading inbox…
            </div>
          ) : (
            <>
              {/* Task Sections / List */}
              {groupedSections.map((section) => (
                <div key={section.id} className="space-y-1.5">
                  {section.title && (
                    <div className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800">
                      <h2
                        className={`text-xs font-semibold uppercase tracking-wider ${
                          section.textColor || "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {section.title}
                      </h2>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-600 font-medium">
                        {section.tickets.length}
                      </span>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {section.tickets.map((ticket) => {
                      const isDone = ticket.status === "done";
                      const project = projects.find((p) => p.id === ticket.projectId);
                      const team = teams.find((t) => t.id === ticket.teamId);
                      const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.low;

                      return (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          className="group flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800 cursor-pointer shadow-none hover:shadow-2xs"
                        >
                          {/* Round Todoist-Style Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleComplete(ticket, e)}
                            className={`shrink-0 mt-0.5 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                              isDone
                                ? "bg-green-500 border-green-500 text-white"
                                : `${priorityConfig.ringColor} bg-transparent`
                            }`}
                            title={isDone ? "Mark incomplete" : "Mark complete"}
                          >
                            {isDone ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : (
                              <Check className={`w-3 h-3 stroke-[3] opacity-0 group-hover:opacity-100 ${priorityConfig.checkColor}`} />
                            )}
                          </button>

                          {/* Task Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm leading-snug font-medium transition-all ${
                                  isDone
                                    ? "line-through text-slate-400 dark:text-slate-500"
                                    : "text-slate-800 dark:text-slate-100"
                                }`}
                              >
                                {ticket.title}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                                {ticket.projectPrefix}-{ticket.number}
                              </span>
                            </div>

                            {ticket.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                {ticket.description}
                              </p>
                            )}

                            {/* Tags & Metadata Footer */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                              {/* Status Badge */}
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                                  STATUS_STYLES[ticket.status] || "bg-slate-100 dark:bg-slate-800 text-slate-600"
                                }`}
                              >
                                {STATUS_LABELS[ticket.status] || ticket.status}
                              </span>

                              {/* Project Tag */}
                              {project && (
                                <span
                                  className="inline-flex items-center gap-1 font-medium"
                                  style={{ color: project.color || "#3b82f6" }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: project.color || "#3b82f6" }}
                                  />
                                  {project.name}
                                </span>
                              )}

                              {/* Due Date */}
                              {ticket.dueDate && (
                                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(ticket.dueDate).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}

                              {/* Team */}
                              {team && (
                                <span
                                  className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400"
                                  style={{ color: team.color }}
                                >
                                  <Users className="w-3 h-3" />
                                  {team.name}
                                </span>
                              )}

                              {/* Subtasks counter */}
                              {ticket.subtasks && ticket.subtasks.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 font-mono">
                                  <CheckCircle2 className="w-3 h-3 text-slate-400" />
                                  {ticket.subtasks.filter((s) => s.completed).length}/
                                  {ticket.subtasks.length}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Action Buttons on Hover */}
                          <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTicket(ticket.id, e)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {processedTickets.length === 0 && !isAddingTask && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600">
                    <InboxIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Your inbox is all clear!
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      No active tasks found. Add a task below or relax.
                    </p>
                  </div>
                </div>
              )}

              {/* Todoist-Style Inline Add Task Composer */}
              <div className="pt-2">
                {!isAddingTask ? (
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all group cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium">Add task</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleCreateTask}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 space-y-3 shadow-md transition-all"
                  >
                    <input
                      autoFocus
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Task name (e.g. Implement cache invalidation)"
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                    />

                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none"
                    />

                    {/* Quick Settings Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      {/* Project selector */}
                      <select
                        value={newProjectId}
                        onChange={(e) => setNewProjectId(e.target.value)}
                        className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.icon || "📁"} {p.name}
                          </option>
                        ))}
                      </select>

                      {/* Due date picker */}
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <input
                          type="date"
                          value={newDueDate}
                          onChange={(e) => setNewDueDate(e.target.value)}
                          className="bg-transparent text-xs focus:outline-none cursor-pointer"
                        />
                      </div>

                      {/* Priority selector */}
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none capitalize"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>

                      {/* Status selector */}
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s] || s}
                          </option>
                        ))}
                      </select>

                      {/* Team selector */}
                      {teams.length > 0 && (
                        <select
                          value={newTeamId}
                          onChange={(e) => setNewTeamId(e.target.value)}
                          className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
                        >
                          <option value="">No Team</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Composer actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingTask(false);
                          setNewTitle("");
                          setNewDescription("");
                        }}
                        className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newTitle.trim()}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all shadow-xs ${
                          newTitle.trim()
                            ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        Add task
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ticket Detail Slide-over Panel */}
      {selectedTicket && (
        <TicketPanel
          ticket={selectedTicket}
          projects={projects}
          teams={teams}
          onClose={() => {
            setSelectedTicket(null);
            loadData();
          }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
