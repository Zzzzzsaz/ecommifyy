import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Check, Trash2, Loader2, Clock, User, Edit2 } from "lucide-react";

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
    } catch { setTasks([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const resetForm = () => setForm({ title: "", description: "", assigned_to: "oboje", due_date: "", priority: "medium", status: "todo" });

  const addTask = async () => {
    if (!form.title.trim()) { toast.error("Podaj tytuł"); return; }
    setSaving(true);
    try {
      await api.createTask(form);
      toast.success("Dodano");
      setShowAdd(false);
      resetForm();
      fetchTasks();
    } catch { toast.error("Błąd"); }
    finally { setSaving(false); }
  };

  const updateTask = async () => {
    if (!form.title.trim() || !editingTask) return;
    setSaving(true);
    try {
      await api.updateTask(editingTask.id, form);
      toast.success("Zaktualizowano");
      setShowEdit(false);
      setEditingTask(null);
      resetForm();
      fetchTasks();
    } catch { toast.error("Błąd"); }
    finally { setSaving(false); }
  };

  const toggleDone = async (task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await api.updateTask(task.id, { status: newStatus });
    fetchTasks();
  };

  const deleteTask = async (id) => {
    await api.deleteTask(id);
    toast.success("Usunięto");
    fetchTasks();
  };

  const getPriorityColor = (p) => PRIORITIES.find(x => x.id === p)?.color || "#f59e0b";
  const getPriorityLabel = (p) => PRIORITIES.find(x => x.id === p)?.label || "Średni";
  const getAssigneeColor = (a) => ASSIGNEES.find(x => x.id === a)?.color || "#6366f1";
  const getAssigneeLabel = (a) => ASSIGNEES.find(x => x.id === a)?.label || a;

  const filtered = tasks.filter(t => {
    if (filter === "all") return true;
    if (filter === "active") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  }).sort((a, b) => {
    if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1;
    const po = { high: 0, medium: 1, low: 2 };
    return po[a.priority] - po[b.priority];
  });

  const activeTasks = tasks.filter(t => t.status !== "done").length;
  const doneTasks = tasks.filter(t => t.status === "done").length;

  const TaskForm = ({ onSave, isEdit }) => (
    <div className="space-y-3 mt-2">
      <Input placeholder="Tytuł zadania" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="task-title-input" />
      <Textarea placeholder="Opis (opcjonalnie)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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
        <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASSIGNEES.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
      <Button onClick={onSave} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="save-task-btn">
        {saving && <Loader2 className="animate-spin mr-2" size={16} />}
        {isEdit ? "Zapisz" : "Dodaj"}
      </Button>
    </div>
  );

  return (
    <div className="page-container" data-testid="tasks-page">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">Zadania</h1>
          <p className="text-sm text-slate-500">{activeTasks} aktywnych, {doneTasks} ukończonych</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-slate-900 hover:bg-slate-800" data-testid="add-task-btn">
          <Plus size={16} className="mr-1" /> Nowe
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "all", label: `Wszystkie (${tasks.length})` },
          { id: "active", label: `Aktywne (${activeTasks})` },
          { id: "done", label: `Ukończone (${doneTasks})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Check size={40} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-500">Brak zadań</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const isDone = task.status === "done";
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;

            return (
              <div key={task.id} className={`card card-sm flex items-start gap-3 ${isDone ? "opacity-60" : ""}`}>
                <button onClick={() => toggleDone(task)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-emerald-500"}`}>
                  {isDone && <Check size={12} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0" onClick={() => { setEditingTask(task); setForm({ title: task.title, description: task.description || "", assigned_to: task.assigned_to || "oboje", due_date: task.due_date || "", priority: task.priority || "medium", status: task.status || "todo" }); setShowEdit(true); }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${isDone ? "line-through text-slate-400" : "text-slate-900"}`}>{task.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: getPriorityColor(task.priority) + "15", color: getPriorityColor(task.priority) }}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>
                  {task.description && <p className="text-sm text-slate-500 mb-1 line-clamp-1">{task.description}</p>}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1" style={{ color: getAssigneeColor(task.assigned_to) }}>
                      <User size={12} /> {getAssigneeLabel(task.assigned_to)}
                    </span>
                    {task.due_date && (
                      <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                        <Clock size={12} /> {task.due_date}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingTask(task); setForm({ title: task.title, description: task.description || "", assigned_to: task.assigned_to || "oboje", due_date: task.due_date || "", priority: task.priority || "medium", status: task.status || "todo" }); setShowEdit(true); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Nowe zadanie</DialogTitle></DialogHeader>
          <TaskForm onSave={addTask} isEdit={false} />
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={o => { setShowEdit(o); if (!o) setEditingTask(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Edytuj zadanie</DialogTitle></DialogHeader>
          <TaskForm onSave={updateTask} isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
