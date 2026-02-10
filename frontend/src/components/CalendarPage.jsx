import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
const MONTHS_PL = ["Styczen","Luty","Marzec","Kwiecien","Maj","Czerwiec","Lipiec","Sierpien","Wrzesien","Pazdziernik","Listopad","Grudzien"];
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
  return d === 0 ? 6 : d - 1; // Monday = 0
}

function isReminderOnDate(reminder, dateStr) {
  if (reminder.date === dateStr) return true;
  if (reminder.recurring === "none") return false;
  const remDate = new Date(reminder.date);
  const checkDate = new Date(dateStr);
  if (checkDate < remDate) return false;
  if (reminder.recurring === "daily") return true;
  if (reminder.recurring === "weekly") {
    return remDate.getDay() === checkDate.getDay();
  }
  if (reminder.recurring === "monthly") {
    return remDate.getDate() === checkDate.getDate();
  }
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

  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

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

  // Build calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Get reminders for a date
  const getRemindersForDate = (dateStr) => reminders.filter(r => isReminderOnDate(r, dateStr));
  const getNotesForDate = (dateStr) => notes.filter(n => n.date === dateStr);

  // Selected date content
  const selDateStr = selectedDate || todayStr;
  const selReminders = getRemindersForDate(selDateStr);
  const selNotes = getNotesForDate(selDateStr);

  // Upcoming overdue
  const overdueReminders = reminders.filter(r => !r.done && r.date < todayStr && r.recurring === "none");

  return (
    <div className="p-4 pb-24 animate-fade-in" data-testid="calendar-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading text-2xl font-bold text-white">KALENDARZ</h1>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => { setRemForm(f => ({ ...f, date: selDateStr })); setShowAddReminder(true); }}
            className="bg-ecom-primary hover:bg-ecom-primary/80" data-testid="add-reminder-btn">
            <Bell size={13} className="mr-1" />Przypomnienie
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <Card className="bg-ecom-card border-ecom-border mb-4" data-testid="calendar-widget">
        <CardContent className="p-3">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="text-ecom-muted hover:text-white h-7 w-7">
              <ChevronLeft size={16} />
            </Button>
            <span className="font-heading text-base font-semibold text-white">{MONTHS_PL[month - 1]} {year}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="text-ecom-muted hover:text-white h-7 w-7">
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS_PL.map(d => (
              <div key={d} className="text-center text-[10px] text-ecom-muted font-semibold py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
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
                    isSelected ? "bg-ecom-primary/20 border border-ecom-primary" :
                    isToday ? "bg-ecom-border/40 border border-ecom-primary/30" :
                    "hover:bg-ecom-border/30"
                  }`}
                  data-testid={`cal-day-${day}`}>
                  <span className={`text-xs font-medium ${
                    isSelected ? "text-ecom-primary" :
                    isToday ? "text-white" :
                    "text-ecom-muted"
                  }`}>{day}</span>
                  {hasContent && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayReminders.length > 0 && (
                        <div className={`w-1 h-1 rounded-full ${hasOverdue ? "bg-ecom-danger" : "bg-ecom-primary"}`} />
                      )}
                      {dayNotes.length > 0 && <div className="w-1 h-1 rounded-full bg-ecom-warning" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 px-1">
            <div className="flex items-center gap-1 text-[9px] text-ecom-muted"><div className="w-1.5 h-1.5 rounded-full bg-ecom-primary" />Przypomnienie</div>
            <div className="flex items-center gap-1 text-[9px] text-ecom-muted"><div className="w-1.5 h-1.5 rounded-full bg-ecom-warning" />Notatka</div>
            <div className="flex items-center gap-1 text-[9px] text-ecom-muted"><div className="w-1.5 h-1.5 rounded-full bg-ecom-danger" />Zaległe</div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue */}
      {overdueReminders.length > 0 && (
        <Card className="bg-ecom-danger/5 border-ecom-danger/30 mb-3" data-testid="overdue-section">
          <CardContent className="p-3">
            <p className="text-ecom-danger text-[10px] uppercase font-semibold mb-2 flex items-center gap-1">
              <Bell size={12} />Zaległe ({overdueReminders.length})
            </p>
            {overdueReminders.map(r => (
              <div key={r.id} className="flex items-center gap-2 py-1.5">
                <button onClick={() => toggleReminder(r.id, r.done)} className="w-4 h-4 rounded border border-ecom-danger shrink-0 flex items-center justify-center">
                  {r.done && <Check size={10} className="text-white" />}
                </button>
                <span className="text-xs text-ecom-danger flex-1 truncate">{r.title}</span>
                <span className="text-[9px] text-ecom-danger">{r.date}</span>
                <button onClick={() => deleteReminder(r.id)} className="text-ecom-muted hover:text-ecom-danger"><Trash2 size={11} /></button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Selected date content */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white font-heading font-semibold text-sm flex items-center gap-1.5">
            <CalendarDays size={14} className="text-ecom-primary" />
            {selDateStr === todayStr ? "Dzisiaj" : selDateStr}
          </p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => { setRemForm(f => ({ ...f, date: selDateStr })); setShowAddReminder(true); }}
              className="border-ecom-border text-ecom-muted hover:text-white h-7 text-[10px]" data-testid="add-reminder-date-btn">
              <Bell size={11} className="mr-0.5" />+
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setNoteForm({ content: "", date: selDateStr }); setShowAddNote(true); }}
              className="border-ecom-border text-ecom-muted hover:text-white h-7 text-[10px]" data-testid="add-note-date-btn">
              <StickyNote size={11} className="mr-0.5" />+
            </Button>
          </div>
        </div>

        {/* Reminders for selected date */}
        {selReminders.length > 0 && (
          <div className="space-y-1 mb-3">
            {selReminders.map(r => (
              <Card key={r.id} className={`border-l-[3px] ${r.done ? "bg-ecom-card/40 border-ecom-border" : "bg-ecom-card border-ecom-border"}`}
                style={{ borderLeftColor: RECURRING_COLORS[r.recurring] || "#6366f1" }}>
                <CardContent className="p-2.5 flex items-center gap-2">
                  <button onClick={() => toggleReminder(r.id, r.done)}
                    className={`w-5 h-5 rounded border shrink-0 flex items-center justify-center transition-colors ${r.done ? "bg-ecom-success border-ecom-success" : "border-ecom-border hover:border-ecom-primary"}`}
                    data-testid={`toggle-reminder-${r.id}`}>
                    {r.done && <Check size={12} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${r.done ? "line-through text-ecom-muted" : "text-white"}`}>{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.time && <span className="text-[9px] text-ecom-muted flex items-center gap-0.5"><Clock size={8} />{r.time}</span>}
                      {r.recurring !== "none" && (
                        <Badge variant="outline" className="text-[8px] h-4 px-1"
                          style={{ borderColor: RECURRING_COLORS[r.recurring], color: RECURRING_COLORS[r.recurring] }}>
                          <Repeat size={7} className="mr-0.5" />{RECURRING_LABELS[r.recurring]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteReminder(r.id)} className="text-ecom-muted hover:text-ecom-danger shrink-0" data-testid={`del-reminder-${r.id}`}>
                    <Trash2 size={12} />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selReminders.length === 0 && (
          <p className="text-ecom-muted text-[10px] mb-3 pl-1">Brak przypomnien na ten dzien</p>
        )}
      </div>

      {/* Notes section */}
      <div data-testid="notes-section">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white font-heading font-semibold text-sm flex items-center gap-1.5">
            <StickyNote size={14} className="text-ecom-warning" />Notatki
          </p>
          <Button size="sm" onClick={() => { setNoteForm({ content: "", date: selDateStr }); setShowAddNote(true); }}
            className="bg-ecom-warning/20 hover:bg-ecom-warning/30 text-ecom-warning h-7 text-[10px]" data-testid="add-note-btn">
            <Plus size={12} className="mr-0.5" />Notatka
          </Button>
        </div>
        <div className="space-y-1.5">
          {selNotes.length > 0 ? selNotes.map(n => (
            <Card key={n.id} className="bg-ecom-card border-ecom-border border-l-[3px] border-l-ecom-warning/50">
              <CardContent className="p-2.5 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs whitespace-pre-wrap">{n.content}</p>
                  <p className="text-[9px] text-ecom-muted mt-1">{n.created_by} - {n.date}</p>
                </div>
                <button onClick={() => deleteNote(n.id)} className="text-ecom-muted hover:text-ecom-danger shrink-0" data-testid={`del-note-${n.id}`}>
                  <Trash2 size={12} />
                </button>
              </CardContent>
            </Card>
          )) : (
            <p className="text-ecom-muted text-[10px] pl-1">Brak notatek na ten dzien</p>
          )}
        </div>
      </div>

      {/* ADD REMINDER DIALOG */}
      <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-reminder-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Nowe przypomnienie</DialogTitle>
            <DialogDescription className="text-ecom-muted text-xs">Dodaj przypomnienie z opcja powtarzania</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <Input placeholder="Tytul (np. Wyslac zamowienia)" value={remForm.title}
              onChange={e => setRemForm(f => ({ ...f, title: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white" data-testid="reminder-title" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={remForm.date} onChange={e => setRemForm(f => ({ ...f, date: e.target.value }))}
                className="bg-ecom-bg border-ecom-border text-white" data-testid="reminder-date" />
              <Input type="time" value={remForm.time} onChange={e => setRemForm(f => ({ ...f, time: e.target.value }))}
                placeholder="Godzina" className="bg-ecom-bg border-ecom-border text-white" data-testid="reminder-time" />
            </div>
            <Select value={remForm.recurring} onValueChange={v => setRemForm(f => ({ ...f, recurring: v }))}>
              <SelectTrigger className="bg-ecom-bg border-ecom-border text-white" data-testid="reminder-recurring">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-ecom-card border-ecom-border">
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
            <Button onClick={addReminder} disabled={saving} className="w-full bg-ecom-primary hover:bg-ecom-primary/80" data-testid="reminder-save">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}Dodaj przypomnienie
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD NOTE DIALOG */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="bg-ecom-card border-ecom-border max-w-sm" data-testid="add-note-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Nowa notatka</DialogTitle>
            <DialogDescription className="text-ecom-muted text-xs">Dodaj notatke na {noteForm.date || selDateStr}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <Input type="date" value={noteForm.date || selDateStr}
              onChange={e => setNoteForm(f => ({ ...f, date: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white" data-testid="note-date" />
            <Textarea placeholder="Tresc notatki..." value={noteForm.content}
              onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
              className="bg-ecom-bg border-ecom-border text-white resize-none" rows={4} data-testid="note-content" />
            <Button onClick={addNote} disabled={saving} className="w-full bg-ecom-warning/80 hover:bg-ecom-warning/60 text-white" data-testid="note-save">
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}Dodaj notatke
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
