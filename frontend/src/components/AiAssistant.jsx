import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Loader2, X, Trash2, ChevronDown,
  CheckCircle2, Package, ShoppingCart, RotateCcw, Bell, Store
} from "lucide-react";

const QUICK_ACTIONS = [
  { text: "Pokaz zamowienia z tego miesiaca", icon: ShoppingCart },
  { text: "Ile mam produktow?", icon: Package },
  { text: "Pokaz zwroty", icon: RotateCcw },
  { text: "Dodaj przypomnienie na jutro", icon: Bell },
];

const ActionBadge = ({ action }) => {
  const getIcon = (fn) => {
    if (fn.includes("product")) return Package;
    if (fn.includes("order")) return ShoppingCart;
    if (fn.includes("return")) return RotateCcw;
    if (fn.includes("shop")) return Store;
    if (fn.includes("reminder")) return Bell;
    return CheckCircle2;
  };
  const Icon = getIcon(action.function);
  const success = action.result?.success;
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
      <Icon size={10} />
      <span>{action.function.replace(/_/g, " ")}</span>
      {success && <CheckCircle2 size={10} />}
    </div>
  );
};

export default function AiAssistant({ onDataChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const r = await api.getAiAssistantHistory(50);
      setMessages(r.data);
    } catch {
      // Ignore error, start fresh
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg, id: "temp-" + Date.now() }]);
    setSending(true);
    
    try {
      const r = await api.sendAiAssistant(msg);
      setMessages((prev) => [
        ...prev.filter(m => !m.id?.startsWith("temp-")),
        { role: "user", content: msg, id: "user-" + Date.now() },
        { role: "assistant", content: r.data.response, actions: r.data.actions, id: r.data.id }
      ]);
      
      // If any actions were taken, refresh data
      if (r.data.actions && r.data.actions.length > 0) {
        onDataChange?.();
        toast.success(`AI wykonal ${r.data.actions.length} akcji`);
      }
    } catch (e) {
      toast.error("Blad AI - sprobuj ponownie");
      setMessages((prev) => prev.filter((m) => !m.id?.startsWith("temp-")));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    try {
      await api.clearAiAssistantHistory();
      setMessages([]);
      toast.success("Historia wyczyszczona");
    } catch {
      toast.error("Blad");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-110 transition-transform"
            data-testid="ai-assistant-btn"
          >
            <Sparkles size={24} className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-120px)] rounded-2xl bg-[#0f0f1a] border border-violet-500/30 shadow-2xl shadow-violet-500/20 flex flex-col overflow-hidden"
            data-testid="ai-assistant-panel"
          >
            {/* Header */}
            <div className="p-3 border-b border-violet-500/20 bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold">AI Asystent</h3>
                    <p className="text-violet-300/60 text-[10px]">Moge wykonywac akcje na stronie</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={clearHistory} className="p-1.5 rounded-lg text-violet-300/50 hover:text-violet-300 hover:bg-violet-500/10 transition-colors" title="Wyczysc historie">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg text-violet-300/50 hover:text-white hover:bg-violet-500/10 transition-colors">
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 p-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-violet-500" size={24} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-6">
                  <Sparkles size={32} className="text-violet-500/30 mb-3" />
                  <p className="text-violet-300/50 text-xs text-center mb-4">Zapytaj mnie o cokolwiek lub popros o wykonanie akcji</p>
                  <div className="space-y-2 w-full">
                    {QUICK_ACTIONS.map((q, i) => {
                      const Icon = q.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => sendMessage(q.text)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-500/20 text-violet-300/70 text-xs hover:text-white hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left"
                        >
                          <Icon size={12} />
                          {q.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white"
                          : "bg-violet-500/10 border border-violet-500/20 text-violet-100"
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-violet-500/20 flex flex-wrap gap-1">
                            {msg.actions.map((action, i) => (
                              <ActionBadge key={i} action={action} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2">
                        <Loader2 className="animate-spin text-violet-500" size={14} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-violet-500/20 bg-[#0a0a14]">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Napisz co mam zrobic..."
                  className="bg-violet-500/5 border-violet-500/20 text-white text-xs placeholder:text-violet-300/30 focus:border-violet-500/50 flex-1"
                  disabled={sending}
                  data-testid="ai-input"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={sending || !input.trim()}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shrink-0 h-9 w-9 p-0"
                  data-testid="ai-send-btn"
                >
                  {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
