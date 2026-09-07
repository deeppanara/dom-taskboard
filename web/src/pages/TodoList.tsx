import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  Check,
  Plus,
  Calendar,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Trash2,
  Pencil,
  Sparkles,
  ListTodo,
  X,
  Search,
  CheckCheck,
} from "lucide-react";
import { api, type TodoItem } from "../api/client";

const PRIORITIES = ["urgent", "high", "medium", "low"];

const PRIORITY_CONFIG: Record<
  string,
  { label: string; ringColor: string; checkColor: string; badgeColor: string; icon: typeof ArrowUp }
> = {
  urgent: {
    label: "P1 (Urgent)",
    ringColor: "border-red-500 hover:bg-red-500/10",
    checkColor: "text-red-500",
    badgeColor: "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
    icon: AlertTriangle,
  },
  high: {
    label: "P2 (High)",
    ringColor: "border-orange-500 hover:bg-orange-500/10",
    checkColor: "text-orange-500",
    badgeColor: "bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/40",
    icon: ArrowUp,
  },
  medium: {
    label: "P3 (Medium)",
    ringColor: "border-yellow-500 hover:bg-yellow-500/10",
    checkColor: "text-yellow-500",
    badgeColor: "bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/40",
    icon: ArrowRight,
  },
  low: {
    label: "P4 (Low)",
    ringColor: "border-slate-400 hover:bg-slate-400/10 dark:border-slate-500",
    checkColor: "text-slate-400 dark:text-slate-500",
    badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    icon: ArrowDown,
  },
};

export default function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"all" | "active" | "today" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  // Composer fields
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("low");
  const [newDueDate, setNewDueDate] = useState("");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState("");
  const [editingPriority, setEditingPriority] = useState("low");
  const [editingDueDate, setEditingDueDate] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const loadTodos = useCallback(async () => {
    try {
      const data = await api.todos.list();
      setTodos(data || []);
    } catch {
      // fallback to localStorage if needed
      const cached = localStorage.getItem("taskboard_quick_todos");
      if (cached) {
        setTodos(JSON.parse(cached));
      } else {
        setTodos([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleCreateTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const reqData = {
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      priority: newPriority,
      dueDate: newDueDate || undefined,
    };

    try {
      const created = await api.todos.create(reqData);
      setTodos((prev) => [created, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewPriority("low");
      inputRef.current?.focus();
    } catch {
      // Local fallback
      const localItem: TodoItem = {
        id: "local_" + Date.now(),
        title: reqData.title,
        description: reqData.description,
        completed: false,
        priority: reqData.priority,
        dueDate: reqData.dueDate,
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [localItem, ...todos];
      setTodos(updated);
      localStorage.setItem("taskboard_quick_todos", JSON.stringify(updated));
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewPriority("low");
    }
  };

  const handleToggleTodo = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await api.todos.toggle(id);
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      setTodos(updated);
      localStorage.setItem("taskboard_quick_todos", JSON.stringify(updated));
    }
  };

  const handleDeleteTodo = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.todos.delete(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {
      const updated = todos.filter((t) => t.id !== id);
      setTodos(updated);
      localStorage.setItem("taskboard_quick_todos", JSON.stringify(updated));
    }
  };

  const handleClearCompleted = async () => {
    try {
      await api.todos.clearCompleted();
      setTodos((prev) => prev.filter((t) => !t.completed));
    } catch {
      const updated = todos.filter((t) => !t.completed);
      setTodos(updated);
      localStorage.setItem("taskboard_quick_todos", JSON.stringify(updated));
    }
  };

  const startInlineEdit = (todo: TodoItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(todo.id);
    setEditingTitle(todo.title);
    setEditingDesc(todo.description || "");
    setEditingPriority(todo.priority || "low");
    setEditingDueDate(todo.dueDate ? todo.dueDate.split("T")[0] : "");
  };

  const saveInlineEdit = async (id: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const updated = await api.todos.update(id, {
        title: editingTitle.trim(),
        description: editingDesc.trim() || undefined,
        priority: editingPriority,
        dueDate: editingDueDate || undefined,
      });
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      const updated = todos.map((t) =>
        t.id === id
          ? {
              ...t,
              title: editingTitle.trim(),
              description: editingDesc.trim(),
              priority: editingPriority,
              dueDate: editingDueDate || undefined,
            }
          : t
      );
      setTodos(updated);
      localStorage.setItem("taskboard_quick_todos", JSON.stringify(updated));
    }
    setEditingId(null);
  };

  // Filtered todos
  const filteredTodos = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    return todos.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = t.title.toLowerCase().includes(q);
        const mDesc = t.description?.toLowerCase().includes(q);
        if (!mTitle && !mDesc) return false;
      }

      // Tab filter
      if (activeTab === "all") return true;
      if (activeTab === "active") return !t.completed;
      if (activeTab === "completed") return t.completed;
      if (activeTab === "today") {
        if (!t.dueDate) return false;
        return t.dueDate.split("T")[0] === todayStr;
      }
      return true;
    });
  }, [todos, activeTab, searchQuery]);

  const totalCount = todos.length;
  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <header className="shrink-0 flex items-center justify-between px-8 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ListTodo className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Todo List</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {completedCount} of {totalCount} completed ({completionPercentage}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress Mini Bar */}
          <div className="hidden sm:flex items-center gap-2 w-32">
            <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {completionPercentage}%
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search todos…"
              className="pl-8 pr-3 py-1.5 w-44 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
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

          {/* Clear Completed */}
          {completedCount > 0 && (
            <button
              onClick={handleClearCompleted}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-red-200 dark:hover:border-red-900/40 transition-colors shadow-2xs cursor-pointer"
              title="Clear all completed items"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Clear Done</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "all" as const, label: "All", count: totalCount },
              { id: "active" as const, label: "Active", count: activeCount },
              {
                id: "today" as const,
                label: "Today",
                count: todos.filter(
                  (t) => t.dueDate?.split("T")[0] === new Date().toISOString().split("T")[0]
                ).length,
              },
              { id: "completed" as const, label: "Completed", count: completedCount },
            ].map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-blue-700/80 text-blue-100"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Add Task Input Card */}
          <form
            onSubmit={handleCreateTodo}
            className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 transition-all shadow-2xs ${
              isComposerExpanded
                ? "border-blue-500/50 ring-2 ring-blue-500/10 shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-blue-500 shrink-0" />
              <input
                ref={inputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onFocus={() => setIsComposerExpanded(true)}
                placeholder="What needs to be done? Press Enter to add…"
                className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Expandable Options Toolbar */}
            {isComposerExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Notes or description (optional)…"
                  rows={2}
                  className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Due Date */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="bg-transparent text-xs focus:outline-none cursor-pointer"
                      />
                    </div>

                    {/* Priority Selector */}
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none capitalize cursor-pointer"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY_CONFIG[p]?.label || p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsComposerExpanded(false);
                        setNewTitle("");
                        setNewDescription("");
                      }}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-all shadow-xs ${
                        newTitle.trim()
                          ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      Add Todo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* List of Todos */}
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-600 text-sm">
              Loading todos…
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {searchQuery ? "No matching todos found" : "No todos in this view"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Add one above to stay organized.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/60 shadow-2xs overflow-hidden">
              {filteredTodos.map((todo) => {
                const isEditing = editingId === todo.id;
                const priorityConfig = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.low;
                const isDone = todo.completed;

                return (
                  <div
                    key={todo.id}
                    className={`group flex items-start gap-3 p-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30 ${
                      isDone ? "bg-slate-50/40 dark:bg-slate-950/20" : ""
                    }`}
                  >
                    {/* Circle Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleTodo(todo.id, e)}
                      className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        isDone
                          ? "bg-green-500 border-green-500 text-white shadow-2xs"
                          : `${priorityConfig.ringColor} bg-transparent`
                      }`}
                      title={isDone ? "Mark incomplete" : "Mark complete"}
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <Check
                          className={`w-3.5 h-3.5 stroke-[3] opacity-0 group-hover:opacity-100 ${priorityConfig.checkColor}`}
                        />
                      )}
                    </button>

                    {/* Todo Content / Inline Edit */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveInlineEdit(todo.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            value={editingDesc}
                            onChange={(e) => setEditingDesc(e.target.value)}
                            placeholder="Add notes…"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveInlineEdit(todo.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <input
                              type="date"
                              value={editingDueDate}
                              onChange={(e) => setEditingDueDate(e.target.value)}
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-slate-700 dark:text-slate-300 focus:outline-none"
                            />
                            <select
                              value={editingPriority}
                              onChange={(e) => setEditingPriority(e.target.value)}
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-slate-700 dark:text-slate-300 focus:outline-none capitalize"
                            >
                              {PRIORITIES.map((p) => (
                                <option key={p} value={p}>
                                  {PRIORITY_CONFIG[p]?.label || p}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                type="button"
                                onClick={() => saveInlineEdit(todo.id)}
                                className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1" onDoubleClick={(e) => startInlineEdit(todo, e)}>
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`text-sm leading-snug font-medium transition-all ${
                                isDone
                                  ? "line-through text-slate-400 dark:text-slate-500"
                                  : "text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {todo.title}
                            </span>
                          </div>

                          {todo.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {todo.description}
                            </p>
                          )}

                          {/* Badges footer */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                            {/* Priority badge */}
                            <span
                              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border ${priorityConfig.badgeColor}`}
                            >
                              {priorityConfig.label}
                            </span>

                            {/* Due Date */}
                            {todo.dueDate && (
                              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                                <Calendar className="w-3 h-3" />
                                {new Date(todo.dueDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Hover Actions */}
                    {!isEditing && (
                      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => startInlineEdit(todo, e)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit todo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTodo(todo.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete todo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
