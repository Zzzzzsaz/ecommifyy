import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Send, Loader2, Trash2, Sparkles } from "lucide-react";

const SHOPS = [
  { id: 1, name: "ecom1", color: "#6366f1" },
  { id: 2, name: "ecom2", color: "#10b981" },
  { id: 3, name: "ecom3", color: "#f59e0b" },
  { id: 4, name: "ecom4", color: "#ec4899" },
];

const QUICK_QUESTIONS = [
  "Jak poprawic ROI?",
  "Ktory sklep najlepszy?",
  "Porady na TikTok Ads",
  "Jak zmniejszyc koszty reklam?",
];

export default function Chat({ user }) {
  const [shop, setShop] = useState(1);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getChatHistory({ shop_id: shop, limit: 100 });
      setMessages(r.data);
    } catch {
      toast.error("Blad ladowania historii");
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg, id: "temp-" + Date.now() }]);
    setSending(true);
    try {
      const r = await api.sendChat({ shop_id: shop, message: msg });
      setMessages((prev) => [...prev, { role: "assistant", content: r.data.response, id: r.data.id }]);
    } catch {
      toast.error("Blad AI - sprobuj ponownie");
      setMessages((prev) => prev.filter((m) => !m.id?.startsWith("temp-")));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    try {
      await api.clearChatHistory(shop);
      setMessages([]);
      toast.success("Historia wyczyszczona");
    } catch {
      toast.error("Blad czyszczenia");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] animate-fade-in" data-testid="chat-page">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-ecom-primary" />
            <h1 className="font-heading text-xl font-bold text-white">AI Marketing Expert</h1>
          </div>
          <button onClick={clearHistory} className="text-ecom-muted hover:text-ecom-danger" data-testid="clear-chat-btn">
            <Trash2 size={16} />
          </button>
        </div>
        {/* Shop Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2" data-testid="chat-shop-tabs">
          {SHOPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setShop(s.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                shop === s.id ? "text-white" : "text-ecom-muted hover:text-white"
              }`}
              style={shop === s.id ? { backgroundColor: s.color + "20", color: s.color } : {}}
              data-testid={`chat-shop-${s.id}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4" data-testid="chat-messages">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ecom-primary" size={24} /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <Sparkles size={40} className="text-ecom-primary/30 mb-4" />
            <p className="text-ecom-muted text-sm text-center mb-6">Zapytaj AI o porady marketingowe</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-2 rounded-lg border border-ecom-border text-ecom-muted text-xs hover:text-white hover:border-ecom-primary/50 transition-colors"
                  data-testid={`quick-q-${i}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user" ? "chat-bubble-user text-white" : "chat-bubble-assistant text-ecom-muted"
                  }`}
                  data-testid={`chat-msg-${idx}`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="chat-bubble-assistant rounded-xl px-4 py-3">
                  <Loader2 className="animate-spin text-ecom-primary" size={16} />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 pt-2 border-t border-ecom-border" style={{ backgroundColor: "rgba(15, 15, 26, 0.95)" }}>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napisz wiadomosc..."
            className="bg-ecom-card border-ecom-border text-white flex-1"
            disabled={sending}
            data-testid="chat-input"
          />
          <Button onClick={() => sendMessage()} disabled={sending || !input.trim()} className="bg-ecom-primary hover:bg-ecom-primary/80 shrink-0" data-testid="chat-send-btn">
            {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
