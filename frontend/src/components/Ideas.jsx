import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Lightbulb, Link as LinkIcon, Star, Edit2, ExternalLink } from "lucide-react";

const CATEGORIES = [
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
    } catch {
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  const resetForm = () => {
    setForm({ title: "", description: "", category: "inne", link: "", priority: false });
  };

  const openAdd = () => {
    resetForm();
    setShowAdd(true);
  };

  const openEdit = (idea) => {
    setEditingIdea(idea);
    setForm({
      title: idea.title || "",
      description: idea.description || "",
      category: idea.category || "inne",
      link: idea.link || "",
      priority: idea.priority || false
    });
    setShowEdit(true);
  };

  const addIdea = async () => {
    if (!form.title.trim()) { toast.error("Podaj tytuł pomysłu"); return; }
    setSaving(true);
    try {
      await api.createIdea({ 
        title: form.title,
        description: form.description,
        category: form.category,
        link: form.link,
        priority: form.priority,
        created_by: user?.name || "Admin"
      });
      toast.success("Pomysł dodany!");
      setShowAdd(false);
      resetForm();
      fetchIdeas();
    } catch (err) {
      console.error("Error adding idea:", err);
      toast.error("Błąd dodawania");
    } finally {
      setSaving(false);
    }
  };

  const updateIdea = async () => {
    if (!form.title.trim()) { toast.error("Podaj tytuł"); return; }
    if (!editingIdea) return;
    setSaving(true);
    try {
      await api.updateIdea(editingIdea.id, form);
      toast.success("Pomysł zaktualizowany!");
      setShowEdit(false);
      setEditingIdea(null);
      resetForm();
      fetchIdeas();
    } catch {
      toast.error("Błąd aktualizacji");
    } finally {
      setSaving(false);
    }
  };

  const deleteIdea = async (e, ideaId) => {
    e.stopPropagation();
    try {
      await api.deleteIdea(ideaId);
      toast.success("Usunięto");
      fetchIdeas();
    } catch {
      toast.error("Błąd usuwania");
    }
  };

  const togglePriority = async (e, idea) => {
    e.stopPropagation();
    try {
      await api.updateIdea(idea.id, { priority: !idea.priority });
      fetchIdeas();
    } catch {
      toast.error("Błąd");
    }
  };

  const filteredIdeas = ideas.filter(i => {
    if (filter === "all") return true;
    if (filter === "priority") return i.priority;
    return i.category === filter;
  }).sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const getCategoryColor = (cat) => CATEGORIES.find(c => c.id === cat)?.color || "#f59e0b";
  const getCategoryLabel = (cat) => CATEGORIES.find(c => c.id === cat)?.label || "Inne";

  const IdeaForm = ({ onSave, isEdit }) => (
    <div className="space-y-4 mt-2">
      <Input
        placeholder="Tytuł pomysłu..."
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        data-testid="idea-title-input"
      />
      <Textarea
        placeholder="Opisz swój pomysł... Co? Dlaczego? Jak?"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        className="resize-none"
        rows={4}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Link (opcjonalnie)"
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
          />
        </div>
        <Button 
          type="button"
          variant={form.priority ? "default" : "outline"}
          onClick={() => setForm(f => ({ ...f, priority: !f.priority }))}
          className={form.priority ? "bg-amber-500 hover:bg-amber-400" : ""}
        >
          <Star size={16} className={form.priority ? "fill-current" : ""} />
        </Button>
      </div>
      <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
        <SelectTrigger>
          <SelectValue placeholder="Kategoria" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(c => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={onSave} disabled={saving} className="w-full btn-primary" data-testid="save-idea-btn">
        {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {isEdit ? "Zapisz zmiany" : "Dodaj pomysł"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" data-testid="ideas-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pomysły</h1>
          <p className="text-slate-500 text-sm mt-1">Twoje pomysły na rozwój biznesu</p>
        </div>
        <Button onClick={openAdd} className="btn-primary" data-testid="add-idea-btn">
          <Plus size={16} className="mr-2" /> Nowy pomysł
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button 
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === "all" 
              ? "bg-slate-900 text-white" 
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}>
          Wszystkie ({ideas.length})
        </button>
        <button 
          onClick={() => setFilter("priority")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors ${
            filter === "priority" 
              ? "bg-amber-500 text-white" 
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}>
          <Star size={14} /> Ważne
        </button>
        {CATEGORIES.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === cat.id 
                ? "text-white" 
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            style={filter === cat.id ? { backgroundColor: cat.color } : {}}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Ideas Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Lightbulb size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-lg text-slate-600 mb-2">Brak pomysłów</p>
              <p className="text-sm text-slate-400">Kliknij "Nowy pomysł" aby dodać pierwszy!</p>
            </div>
          ) : (
            filteredIdeas.map((idea) => (
              <div
                key={idea.id}
                onClick={() => openEdit(idea)}
                className={`pro-card p-5 cursor-pointer hover:shadow-md transition-all ${
                  idea.priority ? "ring-2 ring-amber-400" : ""
                }`}
                data-testid={`idea-card-${idea.id}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: getCategoryColor(idea.category) + "15", color: getCategoryColor(idea.category) }}>
                    {getCategoryLabel(idea.category)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => togglePriority(e, idea)}
                      className={`p-1.5 rounded-md transition-colors ${
                        idea.priority ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                      }`}>
                      <Star size={16} className={idea.priority ? "fill-current" : ""} />
                    </button>
                    <button 
                      onClick={(e) => deleteIdea(e, idea.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-slate-900 font-semibold mb-2 flex items-center gap-2">
                  {idea.title}
                  <Edit2 size={12} className="text-slate-400" />
                </h3>

                {/* Description */}
                {idea.description && (
                  <p className="text-slate-500 text-sm mb-3 line-clamp-3">{idea.description}</p>
                )}

                {/* Link */}
                {idea.link && (
                  <a 
                    href={idea.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mb-3">
                    <LinkIcon size={12} />
                    <span className="truncate max-w-[150px]">{idea.link.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink size={10} />
                  </a>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                  <span>{idea.created_by}</span>
                  <span>{new Date(idea.created_at).toLocaleDateString('pl-PL')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb size={20} className="text-amber-500" />
              Nowy pomysł
            </DialogTitle>
          </DialogHeader>
          <IdeaForm onSave={addIdea} isEdit={false} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) setEditingIdea(null); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 size={20} className="text-blue-600" />
              Edytuj pomysł
            </DialogTitle>
          </DialogHeader>
          <IdeaForm onSave={updateIdea} isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
