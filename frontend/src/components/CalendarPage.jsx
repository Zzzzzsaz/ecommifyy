import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Loader2, CalendarDays, Check, Trash2, Bell, StickyNote,
  ChevronLeft, ChevronRight, Clock, Repeat
} from "lucide-react";

const DAYS_PL = ["Pon", "Wt", "Sr", "Czw", "Pt", "Sob", "Nd"];
const MONTHS_PL = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
const RECURRING_OPTIONS = [
  { value: "none", label: "Jednorazowe" },
  { value: "daily", label: "Codziennie" },
  { value: "weekly", label: "Co tydzien" },
  { value: "monthly", label: "Co miesiac" },
];
const RECURRING_COLORS = { none: "#6366f1", daily: "#ef4444", weekly: "#f59e0b", monthly: "#10b981" };
const RECURRING_LABELS = { none: "", daily: "Codziennie", weekly: "Co tydzien", monthly: "Co miesiac" };

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function isReminderOnDate(reminder, dateStr) {
  if (reminder.date === dateStr) return true;
  if (reminder.recurring === "none") return false;
  const remDate = new Date(reminder.date);
  const checkDate = new Date(dateStr);
  if (checkDate < remDate) return false;
  if (reminder.recurring === "daily") return true;
  if (reminder.recurring === "weekly") return remDate.getDay() === checkDate.getDay();
  if (reminder.recurring === "monthly") return remDate.getDate() === checkDate.getDate();
  return false;
}

export default function CalendarPage({ user }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [remForm, setRemForm] = useState({ title: "", date: "", time: "", recurring: "none" });
  const [noteForm, setNoteForm] = useState({ content: "", date: "" });
  const [saving, setSaving] = useState(false);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, n] = await Promise.all([api.getReminders(), api.getNotes({ year, month })]);
      setReminders(r.data);
      setNotes(n.data);
    } catch { toast.error("Blad ladowania"); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const addReminder = async () => {
    if (!remForm.title || !remForm.date) { toast.error("Wypelnij tytul i date"); return; }
    setSaving(true);
    try {
      await api.createReminder({ title: remForm.title, date: remForm.date, time: remForm.time || null, recurring: remForm.recurring, created_by: user.name });
      toast.success("Przypomnienie dodane!");
      setShowAddReminder(false);
      setRemForm({ title: "", date: "", time: "", recurring: "none" });
      fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const addNote = async () => {
    if (!noteForm.content) { toast.error("Wpisz tresc notatki"); return; }
    setSaving(true);
    try {
      await api.createNote({ content: noteForm.content, date: noteForm.date || selectedDate || todayStr, created_by: user.name });
      toast.success("Notatka dodana!");
      setShowAddNote(false);
      setNoteForm({ content: "", date: "" });
      fetchData();
    } catch { toast.error("Blad"); } finally { setSaving(false); }
  };

  const toggleReminder = async (id, done) => {
    await api.updateReminder(id, { done: !done });
    fetchData();
  };

  const deleteReminder = async (id) => { await api.deleteReminder(id); fetchData(); toast.success("Usunieto"); };
  const deleteNote = async (id) => { await api.deleteNote(id); fetchData(); toast.success("Usunieto"); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getRemindersForDate = (dateStr) => reminders.filter(r => isReminderOnDate(r, dateStr));
  const getNotesForDate = (dateStr) => notes.filter(n => n.date === dateStr);

  const selDateStr = selectedDate || todayStr;
  const selReminders = getRemindersForDate(selDateStr);
  const selNotes = getNotesForDate(selDateStr);
  const overdueReminders = reminders.filter(r => !r.done && r.date < todayStr && r.recurring === "none");

  return (
    <div className="page-container" data-testid="calendar-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Kalendarz</h1>
        <Button onClick={() => { setRemForm(f => ({ ...f, date: selDateStr })); setShowAddReminder(true); }} className="bg-slate-900 hover:bg-slate-800 h-9" data-testid="add-reminder-btn">
          <Bell size={14} className="mr-1" /> Przypomnienie
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : (
        <div className="grid md:grid-cols-[1fr,320px] gap-6">
          {/* Calendar Widget */}
          <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="calendar-widget">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold text-slate-900">{MONTHS_PL[month - 1]} {year}</span>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_PL.map(d => (
                <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="h-10" />;
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selDateStr;
                const dayReminders = getRemindersForDate(dateStr);
                const dayNotes = getNotesForDate(dateStr);
                const hasContent = dayReminders.length > 0 || dayNotes.length > 0;
                const hasOverdue = dayReminders.some(r => !r.done && dateStr < todayStr && r.recurring === "none");

                return (
                  <button key={day} onClick={() => setSelectedDate(dateStr)}
                    className={`h-10 rounded-lg flex flex-col items-center justify-center relative transition-all ${
                      isSelected ? "bg-slate-900 text-white" :
                      isToday ? "bg-slate-100 border border-slate-300" :
                      "hover:bg-slate-50"
                    }`}
                    data-testid={`cal-day-${day}`}>
                    <span className={`text-sm font-medium ${isSelected ? "text-white" : isToday ? "text-slate-900" : "text-slate-600"}`}>{day}</span>
                    {hasContent && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayReminders.length > 0 && <div className={`w-1.5 h-1.5 rounded-full ${hasOverdue ? "bg-red-500" : isSelected ? "bg-white/70" : "bg-indigo-500"}`} />}
                        {dayNotes.length > 0 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-amber-500"}`} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Przypomnienie</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-amber-500" /> Notatka</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2 h-2 rounded-full bg-red-500" /> Zalegle</div>
            </div>
          </div>

          {/* Right Panel - Selected Date */}
          <div className="space-y-4">
            {/* Overdue */}
            {overdueReminders.length > 0 && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-4" data-testid="overdue-section">
                <p className="text-red-700 text-xs font-semibold mb-3 flex items-center gap-1">
                  <Bell size={12} /> Zalegle ({overdueReminders.length})
                </p>
                <div className="space-y-2">
                  {overdueReminders.map(r => (
                    <div key={r.id} className="flex items-center gap-2">
                      <button onClick={() => toggleReminder(r.id, r.done)} className="w-4 h-4 rounded border border-red-400 shrink-0" />
                      <span className="text-sm text-red-700 flex-1 truncate">{r.title}</span>
                      <span className="text-xs text-red-500">{r.date}</span>
                      <button onClick={() => deleteReminder(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Date */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-slate-900 flex items-center gap-2">
                  <CalendarDays size={16} className="text-indigo-500" />
                  {selDateStr === todayStr ? "Dzisiaj" : selDateStr}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => { setRemForm(f => ({ ...f, date: selDateStr })); setShowAddReminder(true); }}
                    className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-indigo-600" data-testid="add-reminder-date-btn">
                    <Bell size={12} />
                  </button>
                  <button onClick={() => { setNoteForm({ content: "", date: selDateStr }); setShowAddNote(true); }}
                    className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-600" data-testid="add-note-date-btn">
                    <StickyNote size={12} />
                  </button>
                </div>
              </div>

              {/* Reminders */}
              {selReminders.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {selReminders.map(r => (
                    <div key={r.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border-l-2" style={{ borderLeftColor: RECURRING_COLORS[r.recurring] }}>
                      <button onClick={() => toggleReminder(r.id, r.done)}
                        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center mt-0.5 ${r.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}
                        data-testid={`toggle-reminder-${r.id}`}>
                        {r.done && <Check size={10} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${r.done ? "line-through text-slate-400" : "text-slate-700"}`}>{r.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {r.time && <span className="text-xs text-slate-400 flex items-center gap-0.5"><Clock size={10} />{r.time}</span>}
                          {r.recurring !== "none" && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: RECURRING_COLORS[r.recurring] + "20", color: RECURRING_COLORS[r.recurring] }}>
                              <Repeat size={8} className="inline mr-0.5" />{RECURRING_LABELS[r.recurring]}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => deleteReminder(r.id)} className="text-slate-400 hover:text-red-500" data-testid={`del-reminder-${r.id}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mb-4">Brak przypomnien na ten dzien</p>
              )}

              {/* Notes */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-1"><StickyNote size={12} className="text-amber-500" /> Notatki</p>
                  <button onClick={() => { setNoteForm({ content: "", date: selDateStr }); setShowAddNote(true); }}
                    className="text-xs text-amber-600 hover:text-amber-700" data-testid="add-note-btn">
                    <Plus size={12} className="inline" /> Dodaj
                  </button>
                </div>
                {selNotes.length > 0 ? (
                  <div className="space-y-2">
                    {selNotes.map(n => (
                      <div key={n.id} className="p-2 rounded-lg bg-amber-50 border-l-2 border-amber-400">
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap flex-1">{n.content}</p>
                          <button onClick={() => deleteNote(n.id)} className="text-slate-400 hover:text-red-500 ml-2" data-testid={`del-note-${n.id}`}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{n.created_by}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Brak notatek</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD REMINDER DIALOG */}
      <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
        <DialogContent className="bg-white max-w-sm" data-testid="add-reminder-dialog">
          <DialogHeader>
            <DialogTitle>Nowe przypomnienie</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Tytul (np. Wyslac zamowienia)" value={remForm.title}
              onChange={e => setRemForm(f => ({ ...f, title: e.target.value }))} data-testid="reminder-title" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={remForm.date} onChange={e => setRemForm(f => ({ ...f, date: e.target.value }))} data-testid="reminder-date" />
              <Input type="time" value={remForm.time} onChange={e => setRemForm(f => ({ ...f, time: e.target.value }))} placeholder="Godzina" data-testid="reminder-time" />
            </div>
            <Select value={remForm.recurring} onValueChange={v => setRemForm(f => ({ ...f, recurring: v }))}>
              <SelectTrigger data-testid="reminder-recurring"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECURRING_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RECURRING_COLORS[o.value] }} />
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addReminder} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="reminder-save">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />} Dodaj przypomnienie
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD NOTE DIALOG */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="bg-white max-w-sm" data-testid="add-note-dialog">
          <DialogHeader>
            <DialogTitle>Nowa notatka</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input type="date" value={noteForm.date || selDateStr}
              onChange={e => setNoteForm(f => ({ ...f, date: e.target.value }))} data-testid="note-date" />
            <Textarea placeholder="Tresc notatki..." value={noteForm.content}
              onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
              className="resize-none" rows={4} data-testid="note-content" />
            <Button onClick={addNote} disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600" data-testid="note-save">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />} Dodaj notatke
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
