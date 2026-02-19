import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Lightbulb, Link as LinkIcon, Star, Edit2, ExternalLink, Sparkles } from "lucide-react";

const CATEGORIES = [
  { id: "produkt", label: "Produkt", color: "#6366f1", icon: "📦" },
  { id: "marketing", label: "Marketing", color: "#ec4899", icon: "📣" },
  { id: "sklep", label: "Sklep", color: "#22c55e", icon: "🏪" },
  { id: "inne", label: "Inne", color: "#f59e0b", icon: "💡" },
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
      // If endpoint doesn't exist yet, just set empty
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
        ...form, 
        created_by: user.name,
        created_at: new Date().toISOString()
      });
      toast.success("Pomysł dodany!");
      setShowAdd(false);
      resetForm();
      fetchIdeas();
    } catch {
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
    // Priority first, then by date
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const getCategoryColor = (cat) => CATEGORIES.find(c => c.id === cat)?.color || "#f59e0b";
  const getCategoryIcon = (cat) => CATEGORIES.find(c => c.id === cat)?.icon || "💡";
  const getCategoryLabel = (cat) => CATEGORIES.find(c => c.id === cat)?.label || "Inne";

  const IdeaForm = ({ onSave, isEdit }) => (
    <div className="space-y-3 mt-2">
      <Input
        placeholder="Tytuł pomysłu..."
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        className="bg-slate-800 border-slate-700 text-white"
      />
      <Textarea
        placeholder="Opisz swój pomysł... Co? Dlaczego? Jak?"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        className="bg-slate-800 border-slate-700 text-white resize-none"
        rows={4}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Link (opcjonalnie)"
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <Button 
          type="button"
          variant={form.priority ? "default" : "outline"}
          onClick={() => setForm(f => ({ ...f, priority: !f.priority }))}
          className={form.priority ? "bg-yellow-500 hover:bg-yellow-400" : "border-slate-700 text-slate-400"}
        >
          <Star size={16} className={form.priority ? "fill-current" : ""} />
        </Button>
      </div>
      <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
          <SelectValue placeholder="Kategoria" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          {CATEGORIES.map(c => (
            <SelectItem key={c.id} value={c.id} className="text-white">
              <span className="flex items-center gap-2">
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={onSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500">
        {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Sparkles size={16} className="mr-2" />}
        {isEdit ? "Zapisz zmiany" : "Dodaj pomysł"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-28" data-testid="ideas-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb size={24} className="text-yellow-400" />
          <h1 className="text-xl font-bold text-white">Pomysły</h1>
        </div>
        <Button onClick={openAdd} size="sm" className="bg-indigo-600 hover:bg-indigo-500">
          <Plus size={16} className="mr-1" /> Nowy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
        <button 
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === "all" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>
          Wszystkie ({ideas.length})
        </button>
        <button 
          onClick={() => setFilter("priority")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${filter === "priority" ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-400"}`}>
          <Star size={12} /> Ważne
        </button>
        {CATEGORIES.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === cat.id ? "text-white" : "bg-slate-800 text-slate-400"}`}
            style={filter === cat.id ? { backgroundColor: cat.color } : {}}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Ideas Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredIdeas.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              <Lightbulb size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg mb-2">Brak pomysłów</p>
              <p className="text-sm">Kliknij "Nowy" aby dodać pierwszy pomysł!</p>
            </div>
          ) : (
            filteredIdeas.map((idea) => (
              <div
                key={idea.id}
                onClick={() => openEdit(idea)}
                className={`bg-slate-900 rounded-xl border-2 p-4 cursor-pointer hover:bg-slate-800/50 transition-all hover:scale-[1.02] ${idea.priority ? "border-yellow-500/50" : "border-slate-800"}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(idea.category)}</span>
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: getCategoryColor(idea.category) + "20", color: getCategoryColor(idea.category) }}>
                      {getCategoryLabel(idea.category)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => togglePriority(e, idea)}
                      className={`p-1 rounded ${idea.priority ? "text-yellow-400" : "text-slate-600 hover:text-yellow-400"}`}>
                      <Star size={16} className={idea.priority ? "fill-current" : ""} />
                    </button>
                    <button 
                      onClick={(e) => deleteIdea(e, idea.id)}
                      className="p-1 text-slate-600 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-white font-semibold mb-2 flex items-center gap-1">
                  {idea.title}
                  <Edit2 size={12} className="text-slate-500" />
                </h3>

                {/* Description */}
                {idea.description && (
                  <p className="text-slate-400 text-sm mb-3 line-clamp-3">{idea.description}</p>
                )}

                {/* Link */}
                {idea.link && (
                  <a 
                    href={idea.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mb-2">
                    <LinkIcon size={12} />
                    <span className="truncate max-w-[150px]">{idea.link.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink size={10} />
                  </a>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-800">
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
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lightbulb size={20} className="text-yellow-400" />
              Nowy pomysł
            </DialogTitle>
          </DialogHeader>
          <IdeaForm onSave={addIdea} isEdit={false} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) setEditingIdea(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit2 size={20} className="text-indigo-400" />
              Edytuj pomysł
            </DialogTitle>
          </DialogHeader>
          <IdeaForm onSave={updateIdea} isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
