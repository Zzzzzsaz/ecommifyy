import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Lightbulb, Star, Edit2 } from "lucide-react";

const CATS = [
  { id: "produkt", label: "Produkt", color: "#6366f1" },
  { id: "marketing", label: "Marketing", color: "#ec4899" },
  { id: "sklep", label: "Sklep", color: "#10b981" },
  { id: "inne", label: "Inne", color: "#f59e0b" },
];

export default function Ideas({ user }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingIdea, setEditingIdea] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "inne", link: "", priority: false });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getIdeas();
      setIdeas(r.data || []);
    } catch { setIdeas([]); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  const resetForm = () => setForm({ title: "", description: "", category: "inne", link: "", priority: false });

  const addIdea = async () => {
    if (!form.title.trim()) { toast.error("Podaj tytuł"); return; }
    setSaving(true);
    try {
      await api.createIdea({ ...form, created_by: user?.name || "Admin" });
      toast.success("Dodano");
      setShowAdd(false);
      resetForm();
      fetchIdeas();
    } catch { toast.error("Błąd"); } 
    finally { setSaving(false); }
  };

  const updateIdea = async () => {
    if (!form.title.trim() || !editingIdea) return;
    setSaving(true);
    try {
      await api.updateIdea(editingIdea.id, form);
      toast.success("Zapisano");
      setShowEdit(false);
      setEditingIdea(null);
      resetForm();
      fetchIdeas();
    } catch { toast.error("Błąd"); } 
    finally { setSaving(false); }
  };

  const deleteIdea = async (e, id) => {
    e.stopPropagation();
    await api.deleteIdea(id);
    toast.success("Usunięto");
    fetchIdeas();
  };

  const togglePriority = async (e, idea) => {
    e.stopPropagation();
    await api.updateIdea(idea.id, { priority: !idea.priority });
    fetchIdeas();
  };

  const filtered = ideas.filter(i => {
    if (filter === "all") return true;
    if (filter === "priority") return i.priority;
    return i.category === filter;
  }).sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const getCatColor = (c) => CATS.find(x => x.id === c)?.color || "#f59e0b";
  const getCatLabel = (c) => CATS.find(x => x.id === c)?.label || "Inne";

  return (
    <div className="page-container" data-testid="ideas-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Pomysły</h1>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-slate-900 hover:bg-slate-800 h-9" data-testid="add-idea-btn">
          <Plus size={16} className="mr-1" /> Nowy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          Wszystkie
        </button>
        <button onClick={() => setFilter("priority")} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === "priority" ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          <Star size={12} className="inline mr-1" />Ważne
        </button>
        {CATS.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === c.id ? "text-white" : "bg-white border border-slate-200 text-slate-600"}`} style={filter === c.id ? { backgroundColor: c.color } : {}}>
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Lightbulb size={40} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-500">Brak pomysłów</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(idea => (
            <div key={idea.id} onClick={() => { setEditingIdea(idea); setForm({ title: idea.title, description: idea.description || "", category: idea.category || "inne", link: idea.link || "", priority: idea.priority }); setShowEdit(true); }}
              className={`bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-slate-300 ${idea.priority ? "ring-2 ring-amber-400" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900">{idea.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: getCatColor(idea.category) + "15", color: getCatColor(idea.category) }}>
                      {getCatLabel(idea.category)}
                    </span>
                  </div>
                  {idea.description && <p className="text-sm text-slate-500 mb-1 line-clamp-2">{idea.description}</p>}
                  <p className="text-xs text-slate-400">{idea.created_by} • {new Date(idea.created_at).toLocaleDateString('pl-PL')}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => togglePriority(e, idea)} className={`p-2 rounded-lg ${idea.priority ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:bg-slate-100"}`}>
                    <Star size={16} className={idea.priority ? "fill-current" : ""} />
                  </button>
                  <button onClick={e => deleteIdea(e, idea.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Nowy pomysł</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input 
              placeholder="Tytuł" 
              value={form.title} 
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              data-testid="idea-title-input"
            />
            <Textarea 
              placeholder="Opis (opcjonalnie)" 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              rows={3}
              data-testid="idea-desc-input"
            />
            <Input 
              placeholder="Link (opcjonalnie)" 
              value={form.link} 
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              data-testid="idea-link-input"
            />
            <div className="flex gap-2">
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant={form.priority ? "default" : "outline"} 
                onClick={() => setForm(f => ({ ...f, priority: !f.priority }))} 
                className={`w-10 ${form.priority ? "bg-amber-500 hover:bg-amber-400" : ""}`}
                data-testid="idea-priority-btn"
              >
                <Star size={16} className={form.priority ? "fill-current" : ""} />
              </Button>
            </div>
            <Button onClick={addIdea} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="idea-submit-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              Dodaj
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={o => { setShowEdit(o); if (!o) setEditingIdea(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Edytuj pomysł</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input 
              placeholder="Tytuł" 
              value={form.title} 
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              data-testid="idea-edit-title-input"
            />
            <Textarea 
              placeholder="Opis (opcjonalnie)" 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              rows={3}
              data-testid="idea-edit-desc-input"
            />
            <Input 
              placeholder="Link (opcjonalnie)" 
              value={form.link} 
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              data-testid="idea-edit-link-input"
            />
            <div className="flex gap-2">
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant={form.priority ? "default" : "outline"} 
                onClick={() => setForm(f => ({ ...f, priority: !f.priority }))} 
                className={`w-10 ${form.priority ? "bg-amber-500 hover:bg-amber-400" : ""}`}
                data-testid="idea-edit-priority-btn"
              >
                <Star size={16} className={form.priority ? "fill-current" : ""} />
              </Button>
            </div>
            <Button onClick={updateIdea} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="idea-edit-submit-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
