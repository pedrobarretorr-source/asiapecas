import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { type Lang, tr } from "./translations";
import asiaLogo from "@/assets/LOGO-ATUALIZADO.png";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function QuoteChat({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: tr("chat.greeting", lang) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLang = useRef(lang);

  // Update greeting when language changes
  useEffect(() => {
    if (prevLang.current !== lang && messages.length === 1) {
      setMessages([{ role: "assistant", content: tr("chat.greeting", lang) }]);
    }
    prevLang.current = lang;
  }, [lang, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const displayMsgs = [...messages, userMsg];
    setMessages(displayMsgs);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: displayMsgs, lang }),
      });

      if (!resp.ok || !resp.body) throw new Error("Error");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantText += c;
              setMessages([...displayMsgs, { role: "assistant", content: assistantText }]);
            }
          } catch {}
        }
      }

      if (!assistantText) {
        setMessages([...displayMsgs, { role: "assistant", content: tr("chat.noResponse", lang) }]);
      }
    } catch {
      setMessages([...displayMsgs, { role: "assistant", content: tr("chat.error", lang) }]);
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-secondary text-secondary-foreground h-14 w-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-80 sm:w-96 bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "70vh" }}>
      <div className="bg-secondary text-secondary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={asiaLogo} alt="Ásia Peças" className="h-5 w-5 rounded" />
          <span className="font-semibold text-sm">{tr("chat.title", lang)}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-secondary-foreground hover:text-primary" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && <Bot className="h-5 w-5 text-primary mt-1 shrink-0" />}
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none [&_p]:m-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
            {msg.role === "user" && <User className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <Bot className="h-5 w-5 text-primary mt-1" />
            <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground animate-pulse">{tr("chat.typing", lang)}</div>
          </div>
        )}
      </div>

      <div className="border-t p-3 flex gap-2">
        <Input
          placeholder={tr("chat.placeholder", lang)}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          className="h-9 text-sm"
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
