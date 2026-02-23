import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Lightbulb, Link as LinkIcon, Star, Edit2, ExternalLink } from "lucide-react";

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
      toast.success("Zaktualizowano");
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

  const IdeaForm = ({ onSave, isEdit }) => (
    <div className="space-y-3 mt-2">
      <Input placeholder="Tytuł pomysłu" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="idea-title-input" />
      <Textarea placeholder="Opis (opcjonalnie)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
      <div className="flex gap-2">
        <Input placeholder="Link (opcjonalnie)" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} className="flex-1" />
        <Button type="button" variant={form.priority ? "default" : "outline"} onClick={() => setForm(f => ({ ...f, priority: !f.priority }))} className={form.priority ? "bg-amber-500 hover:bg-amber-400" : ""}>
          <Star size={16} className={form.priority ? "fill-current" : ""} />
        </Button>
      </div>
      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {CATS.map(c => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={onSave} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="save-idea-btn">
        {saving && <Loader2 className="animate-spin mr-2" size={16} />}
        {isEdit ? "Zapisz" : "Dodaj"}
      </Button>
    </div>
  );

  return (
    <div className="page-container" data-testid="ideas-page">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">Pomysły</h1>
          <p className="text-sm text-slate-500">Twoje pomysły na rozwój</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-slate-900 hover:bg-slate-800" data-testid="add-idea-btn">
          <Plus size={16} className="mr-1" /> Nowy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          Wszystkie ({ideas.length})
        </button>
        <button onClick={() => setFilter("priority")} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-1 ${filter === "priority" ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          <Star size={12} /> Ważne
        </button>
        {CATS.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === c.id ? "text-white" : "bg-white border border-slate-200 text-slate-600"}`} style={filter === c.id ? { backgroundColor: c.color } : {}}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb size={40} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-500">Brak pomysłów</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(idea => (
            <div key={idea.id} onClick={() => { setEditingIdea(idea); setForm({ title: idea.title, description: idea.description || "", category: idea.category || "inne", link: idea.link || "", priority: idea.priority }); setShowEdit(true); }}
              className={`card cursor-pointer hover:shadow-md transition-all ${idea.priority ? "ring-2 ring-amber-400" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: getCatColor(idea.category) + "15", color: getCatColor(idea.category) }}>
                  {getCatLabel(idea.category)}
                </span>
                <div className="flex gap-1">
                  <button onClick={e => togglePriority(e, idea)} className={`p-1 rounded ${idea.priority ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}>
                    <Star size={14} className={idea.priority ? "fill-current" : ""} />
                  </button>
                  <button onClick={e => deleteIdea(e, idea.id)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{idea.title}</h3>
              {idea.description && <p className="text-sm text-slate-500 mb-2 line-clamp-2">{idea.description}</p>}
              {idea.link && (
                <a href={idea.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-blue-600 flex items-center gap-1 mb-2">
                  <LinkIcon size={10} />
                  <span className="truncate max-w-[120px]">{idea.link.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink size={10} />
                </a>
              )}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                <span>{idea.created_by}</span>
                <span>{new Date(idea.created_at).toLocaleDateString('pl-PL')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Nowy pomysł</DialogTitle></DialogHeader>
          <IdeaForm onSave={addIdea} isEdit={false} />
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={o => { setShowEdit(o); if (!o) setEditingIdea(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle>Edytuj pomysł</DialogTitle></DialogHeader>
          <IdeaForm onSave={updateIdea} isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
