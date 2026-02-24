import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Check, Trash2, Loader2, Clock, User, Edit2, RotateCcw } from "lucide-react";

const PRIORITIES = [
  { id: "high", label: "Wysoki", color: "#ef4444" },
  { id: "medium", label: "Średni", color: "#f59e0b" },
  { id: "low", label: "Niski", color: "#22c55e" },
];

const ASSIGNEES = [
  { id: "kacper", label: "Kacper" },
  { id: "szymon", label: "Szymon" },
  { id: "oboje", label: "Oboje" },
];

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "oboje", due_date: "", priority: "medium", status: "todo" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("active");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getTasks();
      const all = r.data || [];
      setTasks(all.filter(t => t.status !== "deleted"));
      setDeletedTasks(all.filter(t => t.status === "deleted"));
    } catch { setTasks([]); setDeletedTasks([]); }
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
      toast.success("Zapisano");
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

  const softDelete = async (id) => {
    await api.updateTask(id, { status: "deleted" });
    fetchTasks();
    toast.success("Przeniesiono do usuniętych");
  };

  const restore = async (id) => {
    await api.updateTask(id, { status: "todo" });
    fetchTasks();
    toast.success("Przywrócono");
  };

  const permanentDelete = async (id) => {
    if (!window.confirm("Na pewno usunąć na zawsze?")) return;
    await api.deleteTask(id);
    fetchTasks();
    toast.success("Usunięto na zawsze");
  };

  const getPriorityColor = (p) => PRIORITIES.find(x => x.id === p)?.color || "#f59e0b";
  const getPriorityLabel = (p) => PRIORITIES.find(x => x.id === p)?.label || "Średni";
  const getAssigneeLabel = (a) => ASSIGNEES.find(x => x.id === a)?.label || a;

  const activeTasks = tasks.filter(t => t.status !== "done");
  const doneTasks = tasks.filter(t => t.status === "done");

  const filtered = filter === "active" ? activeTasks : 
                   filter === "done" ? doneTasks :
                   filter === "deleted" ? deletedTasks : tasks;

  const sorted = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === "done" ? 1 : -1;
    const po = { high: 0, medium: 1, low: 2 };
    return (po[a.priority] || 1) - (po[b.priority] || 1);
  });

  return (
    <div className="page-container" data-testid="tasks-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Zadania</h1>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-slate-900 hover:bg-slate-800 h-9">
          <Plus size={16} className="mr-1" /> Nowe
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFilter("active")} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === "active" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          Aktywne ({activeTasks.length})
        </button>
        <button onClick={() => setFilter("done")} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === "done" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          Ukończone ({doneTasks.length})
        </button>
        <button onClick={() => setFilter("deleted")} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === "deleted" ? "bg-red-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          Usunięte ({deletedTasks.length})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Check size={40} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-500">
            {filter === "deleted" ? "Brak usuniętych zadań" : filter === "done" ? "Brak ukończonych" : "Brak zadań"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(task => {
            const isDone = task.status === "done";
            const isDeleted = task.status === "deleted";
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone && !isDeleted;

            return (
              <div key={task.id} className={`bg-white rounded-xl border border-slate-200 p-4 ${isDone || isDeleted ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  {!isDeleted && (
                    <button onClick={() => toggleDone(task)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-emerald-500"}`}>
                      {isDone && <Check size={12} className="text-white" />}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${isDone || isDeleted ? "line-through text-slate-400" : "text-slate-900"}`}>{task.title}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: getPriorityColor(task.priority) + "15", color: getPriorityColor(task.priority) }}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    {task.description && <p className="text-sm text-slate-500 mb-2 line-clamp-1">{task.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User size={12} /> {getAssigneeLabel(task.assigned_to)}
                      </span>
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                          <Clock size={12} /> {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isDeleted ? (
                      <>
                        <button onClick={() => restore(task.id)} className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100">
                          <RotateCcw size={16} />
                        </button>
                        <button onClick={() => permanentDelete(task.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100">
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingTask(task); setForm({ title: task.title, description: task.description || "", assigned_to: task.assigned_to || "oboje", due_date: task.due_date || "", priority: task.priority || "medium", status: task.status || "todo" }); setShowEdit(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => softDelete(task.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Nowe zadanie</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input 
              placeholder="Tytuł" 
              value={form.title} 
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              data-testid="task-title-input"
            />
            <Textarea 
              placeholder="Opis (opcjonalnie)" 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              rows={2}
              data-testid="task-desc-input"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNEES.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input 
              type="date" 
              placeholder="Termin" 
              value={form.due_date} 
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              data-testid="task-date-input"
            />
            <Button onClick={addTask} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="task-submit-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              Dodaj
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={o => { setShowEdit(o); if (!o) setEditingTask(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Edytuj zadanie</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input 
              placeholder="Tytuł" 
              value={form.title} 
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              data-testid="task-edit-title-input"
            />
            <Textarea 
              placeholder="Opis (opcjonalnie)" 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              rows={2}
              data-testid="task-edit-desc-input"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNEES.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input 
              type="date" 
              placeholder="Termin" 
              value={form.due_date} 
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              data-testid="task-edit-date-input"
            />
            <Button onClick={updateTask} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="task-edit-submit-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
