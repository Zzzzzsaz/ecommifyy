import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Plus, Trash2, Loader2, Save, FileText, Search, Pin, PinOff,
  Bold, Italic, List, ListOrdered, ChevronRight, Clock, Star
} from "lucide-react";

export default function Notepad({ user }) {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getNotes({ type: "notepad" });
      const notesData = r.data || [];
      setNotes(notesData.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      }));
    } catch { setNotes([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const createNote = async () => {
    if (!newTitle.trim()) { toast.error("Wpisz tytuł"); return; }
    setSaving(true);
    try {
      const newNote = {
        title: newTitle,
        content: "",
        type: "notepad",
        pinned: false,
        created_by: user.name
      };
      await api.createNote(newNote);
      toast.success("Notatka utworzona!");
      setShowNew(false);
      setNewTitle("");
      fetchNotes();
    } catch { toast.error("Błąd"); }
    finally { setSaving(false); }
  };

  const saveNote = async () => {
    if (!activeNote) return;
    setSaving(true);
    try {
      await api.createNote({
        ...activeNote,
        title,
        content,
        updated_at: new Date().toISOString()
      });
      toast.success("Zapisano!");
      fetchNotes();
    } catch { toast.error("Błąd zapisu"); }
    finally { setSaving(false); }
  };

  const deleteNote = async (id) => {
    if (!window.confirm("Czy na pewno usunąć tę notatkę?")) return;
    try {
      await api.deleteNote(id);
      toast.success("Usunięto");
      if (activeNote?.id === id) {
        setActiveNote(null);
        setContent("");
        setTitle("");
      }
      fetchNotes();
    } catch { toast.error("Błąd"); }
  };

  const togglePin = async (note) => {
    try {
      await api.createNote({ ...note, pinned: !note.pinned, updated_at: new Date().toISOString() });
      fetchNotes();
    } catch { toast.error("Błąd"); }
  };

  const selectNote = (note) => {
    setActiveNote(note);
    setTitle(note.title || "");
    setContent(note.content || "");
  };

  const insertFormatting = (format) => {
    const textarea = document.getElementById("note-content");
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newText = "";
    switch (format) {
      case "bold":
        newText = `**${selectedText || "tekst"}**`;
        break;
      case "italic":
        newText = `*${selectedText || "tekst"}*`;
        break;
      case "list":
        newText = selectedText ? selectedText.split("\n").map(line => `- ${line}`).join("\n") : "- element";
        break;
      case "numbered":
        newText = selectedText 
          ? selectedText.split("\n").map((line, i) => `${i + 1}. ${line}`).join("\n") 
          : "1. element";
        break;
      default:
        return;
    }
    
    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);
  };

  const filteredNotes = notes.filter(n => 
    n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const getPreview = (text, maxLength = 60) => {
    if (!text) return "Pusta notatka...";
    const cleaned = text.replace(/[*#\-\d.]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + "..." : cleaned;
  };

  return (
    <div className="page-container" data-testid="notepad-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title">Notatnik</h1>
        <Button onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800 h-9" data-testid="new-note-btn">
          <Plus size={14} className="mr-1.5" /> Nowa notatka
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-180px)]">
          {/* Notes List */}
          <div className="w-72 shrink-0 flex flex-col">
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Szukaj notatek..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`p-3 rounded-lg cursor-pointer group transition-all ${
                    activeNote?.id === note.id 
                      ? "bg-slate-900 text-white" 
                      : "bg-white border border-slate-200 hover:border-slate-300"
                  }`}
                  data-testid={`note-${note.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {note.pinned && <Pin size={12} className={activeNote?.id === note.id ? "text-yellow-300" : "text-yellow-500"} />}
                        <span className="font-medium text-sm truncate">{note.title || "Bez tytułu"}</span>
                      </div>
                      <p className={`text-xs truncate ${activeNote?.id === note.id ? "text-slate-300" : "text-slate-500"}`}>
                        {getPreview(note.content)}
                      </p>
                      <div className={`flex items-center gap-1 mt-1.5 text-[10px] ${activeNote?.id === note.id ? "text-slate-400" : "text-slate-400"}`}>
                        <Clock size={10} />
                        {formatDate(note.updated_at || note.created_at)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(note); }}
                        className={`p-1 rounded ${activeNote?.id === note.id ? "hover:bg-white/20" : "hover:bg-slate-100"}`}
                      >
                        {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        className={`p-1 rounded ${activeNote?.id === note.id ? "hover:bg-white/20 text-red-300" : "hover:bg-red-50 text-red-500"}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredNotes.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{searchQuery ? "Brak wyników" : "Brak notatek"}</p>
                </div>
              )}
            </div>
          </div>

          {/* Note Editor */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            {activeNote ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
                  <Button onClick={() => insertFormatting("bold")} variant="ghost" size="sm" className="h-8 w-8 p-0" title="Pogrubienie">
                    <Bold size={14} />
                  </Button>
                  <Button onClick={() => insertFormatting("italic")} variant="ghost" size="sm" className="h-8 w-8 p-0" title="Kursywa">
                    <Italic size={14} />
                  </Button>
                  <div className="h-6 w-px bg-slate-300 mx-1" />
                  <Button onClick={() => insertFormatting("list")} variant="ghost" size="sm" className="h-8 w-8 p-0" title="Lista">
                    <List size={14} />
                  </Button>
                  <Button onClick={() => insertFormatting("numbered")} variant="ghost" size="sm" className="h-8 w-8 p-0" title="Lista numerowana">
                    <ListOrdered size={14} />
                  </Button>
                  
                  <div className="flex-1" />
                  
                  <span className="text-xs text-slate-400 mr-2">
                    {content.length} znaków
                  </span>
                  <Button onClick={saveNote} disabled={saving} size="sm" className="bg-slate-900 hover:bg-slate-800 h-8">
                    {saving ? <Loader2 className="animate-spin mr-1" size={12} /> : <Save size={12} className="mr-1" />}
                    Zapisz
                  </Button>
                </div>
                
                {/* Title */}
                <div className="px-4 pt-4">
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Tytuł notatki..."
                    className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 placeholder:text-slate-300"
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1 p-4 pt-2">
                  <textarea
                    id="note-content"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Zacznij pisać..."
                    className="w-full h-full resize-none outline-none text-slate-700 placeholder:text-slate-300 leading-relaxed"
                    data-testid="note-content"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <FileText size={48} className="mb-4 opacity-30" />
                <p className="text-lg font-medium text-slate-500">Wybierz notatkę</p>
                <p className="text-sm">lub utwórz nową</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Note Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle>Nowa notatka</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              placeholder="Tytuł notatki..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createNote()}
              data-testid="note-title-input"
            />
            <Button onClick={createNote} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Plus size={14} className="mr-1" /> Utwórz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
