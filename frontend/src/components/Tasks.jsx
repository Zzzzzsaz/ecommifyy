import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Check, Trash2, Loader2, Clock, User, Edit2, Circle, CheckCircle2 } from "lucide-react";

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

const STATUS_OPTIONS = [
  { id: "todo", label: "Do zrobienia" },
  { id: "in_progress", label: "W trakcie" },
  { id: "done", label: "Zrobione" },
];

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "oboje", due_date: "", priority: "medium", status: "todo" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getTasks();
      setTasks(r.data || []);
    } catch {
      toast.error("Błąd ładowania zadań");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const resetForm = () => {
    setForm({ title: "", description: "", assigned_to: "oboje", due_date: "", priority: "medium", status: "todo" });
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to || "oboje",
      due_date: task.due_date || "",
      priority: task.priority || "medium",
      status: task.status || "todo"
    });
    setShowEdit(true);
  };

  const addTask = async () => {
    if (!form.title.trim()) { toast.error("Podaj tytuł"); return; }
    setSaving(true);
    try {
      await api.createTask(form);
      toast.success("Zadanie dodane!");
      setShowAdd(false);
      resetForm();
      fetchTasks();
    } catch {
      toast.error("Błąd");
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async () => {
    if (!form.title.trim() || !editingTask) return;
    setSaving(true);
    try {
      await api.updateTask(editingTask.id, form);
      toast.success("Zaktualizowano!");
      setShowEdit(false);
      setEditingTask(null);
      resetForm();
      fetchTasks();
    } catch {
      toast.error("Błąd");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      await api.updateTask(task.id, { status: newStatus });
      fetchTasks();
    } catch {
      toast.error("Błąd");
    }
  };

  const deleteTask = async (id) => {
    try {
      await api.deleteTask(id);
      toast.success("Usunięto");
      fetchTasks();
    } catch {
      toast.error("Błąd");
    }
  };

  const getPriorityColor = (p) => PRIORITIES.find(x => x.id === p)?.color || "#f59e0b";
  const getPriorityLabel = (p) => PRIORITIES.find(x => x.id === p)?.label || "Średni";
  const getAssigneeColor = (a) => ASSIGNEES.find(x => x.id === a)?.color || "#6366f1";
  const getAssigneeLabel = (a) => ASSIGNEES.find(x => x.id === a)?.label || a;

  const filteredTasks = tasks.filter(t => {
    if (filter === "all") return true;
    if (filter === "active") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  }).sort((a, b) => {
    // Done tasks at bottom
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const activeTasks = tasks.filter(t => t.status !== "done").length;
  const doneTasks = tasks.filter(t => t.status === "done").length;

  const TaskForm = ({ onSave, isEdit }) => (
    <div className="space-y-4 mt-2">
      <Input
        placeholder="Tytuł zadania..."
        value={form.title}
        onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
        data-testid="task-title-input"
      />
      <Textarea
        placeholder="Opis (opcjonalnie)"
        value={form.description}
        onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
        rows={3}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Priorytet</label>
          <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Przypisane do</label>
          <Select value={form.assigned_to} onValueChange={(v) => setForm(f => ({ ...f, assigned_to: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNEES.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                    {a.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Termin</label>
          <Input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
        </div>
        {isEdit && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Status</label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <Button onClick={onSave} disabled={saving} className="w-full btn-primary" data-testid="save-task-btn">
        {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {isEdit ? "Zapisz zmiany" : "Dodaj zadanie"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" data-testid="tasks-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Zadania</h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeTasks} aktywnych, {doneTasks} ukończonych
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary" data-testid="add-task-btn">
          <Plus size={16} className="mr-2" /> Nowe zadanie
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "all", label: `Wszystkie (${tasks.length})` },
          { id: "active", label: `Aktywne (${activeTasks})` },
          { id: "done", label: `Ukończone (${doneTasks})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id 
                ? "bg-slate-900 text-white" 
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <Check size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-lg text-slate-600 mb-2">Brak zadań</p>
              <p className="text-sm text-slate-400">Kliknij "Nowe zadanie" aby dodać</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isDone = task.status === "done";
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;

              return (
                <div
                  key={task.id}
                  className={`pro-card p-4 flex items-start gap-4 transition-all ${isDone ? "opacity-60" : ""}`}
                  data-testid={`task-${task.id}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleDone(task)}
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isDone 
                        ? "bg-emerald-500 border-emerald-500 text-white" 
                        : "border-slate-300 hover:border-emerald-500"
                    }`}
                    data-testid={`task-toggle-${task.id}`}
                  >
                    {isDone && <Check size={14} />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0" onClick={() => openEdit(task)}>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${isDone ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {task.title}
                      </h3>
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: getPriorityColor(task.priority) + "15", color: getPriorityColor(task.priority) }}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-500 mb-2 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      <span 
                        className="flex items-center gap-1"
                        style={{ color: getAssigneeColor(task.assigned_to) }}>
                        <User size={12} />
                        {getAssigneeLabel(task.assigned_to)}
                      </span>
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                          <Clock size={12} />
                          {task.due_date}
                          {isOverdue && " (zaległe)"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(task)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Nowe zadanie</DialogTitle>
          </DialogHeader>
          <TaskForm onSave={addTask} isEdit={false} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={(o) => { setShowEdit(o); if (!o) setEditingTask(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edytuj zadanie</DialogTitle>
          </DialogHeader>
          <TaskForm onSave={updateTask} isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
