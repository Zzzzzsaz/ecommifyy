import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Check, Trash2, Loader2, Clock, User } from "lucide-react";

const PRIORITIES = [
  { id: "high", label: "Wysoki", color: "#ef4444" },
  { id: "medium", label: "Średni", color: "#f59e0b" },
  { id: "low", label: "Niski", color: "#22c55e" },
];

const ASSIGNEES = [
  { id: "kacper", label: "Kacper", color: "#6366f1" },
  { id: "szymon", label: "Szymon", color: "#ec4899" },
  { id: "oboje", label: "Oboje", color: "#f59e0b" },
];

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "oboje", due_date: "", priority: "medium" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all"); // all, todo, done

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getTasks();
      setTasks(r.data);
    } catch {
      toast.error("Błąd ładowania zadań");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async () => {
    if (!form.title.trim()) { toast.error("Podaj tytuł"); return; }
    setSaving(true);
    try {
      await api.createTask({ 
        ...form, 
        created_by: user.name, 
        due_date: form.due_date || null,
        status: "todo"
      });
      toast.success("Zadanie dodane!");
      setShowAdd(false);
      setForm({ title: "", description: "", assigned_to: "oboje", due_date: "", priority: "medium" });
      fetchTasks();
    } catch {
      toast.error("Błąd dodawania");
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    try {
      await api.updateTask(taskId, { status: newStatus });
      toast.success(newStatus === "done" ? "Zrobione!" : "Przywrócono");
      fetchTasks();
    } catch {
      toast.error("Błąd aktualizacji");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      toast.success("Usunięto");
      fetchTasks();
    } catch {
      toast.error("Błąd usuwania");
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === "all") return true;
    if (filter === "todo") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  }).sort((a, b) => {
    // Sort by status (todo first), then by priority, then by date
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  });

  const todoCount = tasks.filter(t => t.status !== "done").length;
  const doneCount = tasks.filter(t => t.status === "done").length;

  const getPriorityColor = (p) => PRIORITIES.find(pr => pr.id === p)?.color || "#f59e0b";
  const getAssigneeColor = (a) => ASSIGNEES.find(as => as.id === a)?.color || "#6366f1";

  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-28" data-testid="tasks-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Zadania</h1>
        <Button onClick={() => setShowAdd(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-500" data-testid="add-task-btn">
          <Plus size={16} className="mr-1" /> Dodaj
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button 
          onClick={() => setFilter("all")}
          className={`p-3 rounded-lg border text-center ${filter === "all" ? "bg-slate-800 border-indigo-500" : "bg-slate-900 border-slate-800"}`}>
          <p className="text-2xl font-bold text-white">{tasks.length}</p>
          <p className="text-xs text-slate-400">Wszystkie</p>
        </button>
        <button 
          onClick={() => setFilter("todo")}
          className={`p-3 rounded-lg border text-center ${filter === "todo" ? "bg-slate-800 border-yellow-500" : "bg-slate-900 border-slate-800"}`}>
          <p className="text-2xl font-bold text-yellow-400">{todoCount}</p>
          <p className="text-xs text-slate-400">Do zrobienia</p>
        </button>
        <button 
          onClick={() => setFilter("done")}
          className={`p-3 rounded-lg border text-center ${filter === "done" ? "bg-slate-800 border-green-500" : "bg-slate-900 border-slate-800"}`}>
          <p className="text-2xl font-bold text-green-400">{doneCount}</p>
          <p className="text-xs text-slate-400">Zrobione</p>
        </button>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg mb-2">Brak zadań</p>
              <p className="text-sm">Kliknij "Dodaj" aby utworzyć nowe zadanie</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`bg-slate-900 rounded-lg border border-slate-800 p-3 flex items-start gap-3 ${task.status === "done" ? "opacity-60" : ""}`}
                data-testid={`task-card-${task.id}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id, task.status)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    task.status === "done" 
                      ? "bg-green-500 border-green-500 text-white" 
                      : "border-slate-600 hover:border-indigo-500"
                  }`}
                  data-testid={`toggle-task-${task.id}`}
                >
                  {task.status === "done" && <Check size={14} />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-white font-medium ${task.status === "done" ? "line-through text-slate-400" : ""}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Priority */}
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: getPriorityColor(task.priority) + "20", color: getPriorityColor(task.priority) }}
                    >
                      {PRIORITIES.find(p => p.id === task.priority)?.label || "Średni"}
                    </span>
                    {/* Assignee */}
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"
                      style={{ backgroundColor: getAssigneeColor(task.assigned_to) + "20", color: getAssigneeColor(task.assigned_to) }}
                    >
                      <User size={10} />
                      {task.assigned_to}
                    </span>
                    {/* Due date */}
                    {task.due_date && (
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Clock size={10} />
                        {task.due_date}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button 
                  onClick={() => deleteTask(task.id)} 
                  className="text-slate-600 hover:text-red-400 shrink-0"
                  data-testid={`delete-task-${task.id}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm" data-testid="add-task-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">Nowe zadanie</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Tytuł zadania"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
              data-testid="task-title-input"
            />
            <Textarea
              placeholder="Opis (opcjonalnie)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white resize-none"
              rows={3}
              data-testid="task-desc-input"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.assigned_to} onValueChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="task-assignee-select">
                  <SelectValue placeholder="Przypisz do" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {ASSIGNEES.map(a => (
                    <SelectItem key={a.id} value={a.id} className="text-white">{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Priorytet" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
              data-testid="task-due-date-input"
            />
            <Button onClick={addTask} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500" data-testid="task-save-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Dodaj zadanie
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
