import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, ChevronRight, ChevronLeft, Check, Trash2, Loader2 } from "lucide-react";

const COLUMNS = [
  { id: "todo", label: "Do zrobienia", color: "#f59e0b" },
  { id: "in_progress", label: "W trakcie", color: "#6366f1" },
  { id: "done", label: "Gotowe", color: "#10b981" },
];

const ASSIGNEE_COLORS = { kacper: "#6366f1", szymon: "#ec4899", oboje: "#f59e0b" };

const sendNotification = (title, body) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
};

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "oboje", due_date: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getTasks();
      setTasks(r.data);
    } catch {
      toast.error("Blad ladowania zadan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async () => {
    if (!form.title.trim()) { toast.error("Podaj tytul"); return; }
    setSaving(true);
    try {
      await api.createTask({ ...form, created_by: user.name, due_date: form.due_date || null });
      toast.success("Zadanie dodane!");
      sendNotification("Nowe zadanie", `${form.title} - przypisane do: ${form.assigned_to}`);
      setShowAdd(false);
      setForm({ title: "", description: "", assigned_to: "oboje", due_date: "" });
      fetchTasks();
    } catch {
      toast.error("Blad dodawania");
    } finally {
      setSaving(false);
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      const task = tasks.find((t) => t.id === taskId);
      const col = COLUMNS.find((c) => c.id === newStatus);
      sendNotification("Zadanie przeniesione", `${task?.title} -> ${col?.label}`);
      fetchTasks();
    } catch {
      toast.error("Blad aktualizacji");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      toast.success("Usunieto");
      fetchTasks();
    } catch {
      toast.error("Blad usuwania");
    }
  };

  const getTasksByStatus = (status) => tasks.filter((t) => t.status === status);

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="tasks-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Zadania</h1>
        <Button onClick={() => setShowAdd(true)} size="sm" className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-task-btn">
          <Plus size={16} className="mr-1" /> Dodaj
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="kanban-board">
          {COLUMNS.map((col) => (
            <div key={col.id} className="kanban-col" data-testid={`kanban-col-${col.id}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <h2 className="font-heading text-sm font-semibold text-white uppercase tracking-wider">{col.label}</h2>
                <Badge variant="secondary" className="text-[10px] ml-auto">{getTasksByStatus(col.id).length}</Badge>
              </div>
              <div className="space-y-2">
                {getTasksByStatus(col.id).map((task) => (
                  <Card
                    key={task.id}
                    className="bg-ecom-card border-ecom-border border-l-[3px] animate-fade-in"
                    style={{ borderLeftColor: ASSIGNEE_COLORS[task.assigned_to] || "#6366f1" }}
                    data-testid={`task-card-${task.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{task.title}</p>
                          {task.description && <p className="text-ecom-muted text-xs mt-1 line-clamp-2">{task.description}</p>}
                        </div>
                        <button onClick={() => deleteTask(task.id)} className="text-ecom-muted hover:text-ecom-danger shrink-0" data-testid={`delete-task-${task.id}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize" style={{ borderColor: ASSIGNEE_COLORS[task.assigned_to], color: ASSIGNEE_COLORS[task.assigned_to] }}>
                            {task.assigned_to}
                          </Badge>
                          {task.due_date && <span className="text-ecom-muted text-[10px]">{task.due_date}</span>}
                        </div>
                        <div className="flex gap-1">
                          {col.id !== "todo" && (
                            <button
                              onClick={() => moveTask(task.id, col.id === "in_progress" ? "todo" : "in_progress")}
                              className="w-6 h-6 rounded flex items-center justify-center bg-ecom-border/50 hover:bg-ecom-border text-ecom-muted hover:text-white"
                              data-testid={`move-left-${task.id}`}
                            >
                              <ChevronLeft size={14} />
                            </button>
                          )}
                          {col.id !== "done" && (
                            <button
                              onClick={() => moveTask(task.id, col.id === "todo" ? "in_progress" : "done")}
                              className="w-6 h-6 rounded flex items-center justify-center bg-ecom-border/50 hover:bg-ecom-border text-ecom-muted hover:text-white"
                              data-testid={`move-right-${task.id}`}
                            >
                              {col.id === "in_progress" ? <Check size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {getTasksByStatus(col.id).length === 0 && (
                  <div className="text-center py-8 text-ecom-muted text-xs border border-dashed border-ecom-border rounded-lg">Brak zadan</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-task-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Nowe zadanie</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Tytul"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white"
              data-testid="task-title-input"
            />
            <Textarea
              placeholder="Opis (opcjonalnie)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white resize-none"
              rows={3}
              data-testid="task-desc-input"
            />
            <Select value={form.assigned_to} onValueChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))}>
              <SelectTrigger className="bg-ecom-bg border-ecom-border text-white" data-testid="task-assignee-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-ecom-card border-ecom-border">
                <SelectItem value="kacper">Kacper</SelectItem>
                <SelectItem value="szymon">Szymon</SelectItem>
                <SelectItem value="oboje">Oboje</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white"
              data-testid="task-due-date-input"
            />
            <Button onClick={addTask} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="task-save-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Dodaj zadanie
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
