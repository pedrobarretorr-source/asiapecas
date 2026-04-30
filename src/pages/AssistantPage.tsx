import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`;

const SUGGESTIONS = [
  "Quais peças servem na escavadeira XE215?",
  "Peças paradas há mais de 2 anos com maior valor",
  "Resumo geral do estoque",
  "Filtros compatíveis entre modelos diferentes",
  "Resumo de vendas recentes",
  "Peças com estoque crítico (menos de 5 unidades)",
];

const FOLLOW_UP_MAP: Record<string, string[]> = {
  "filtro": ["Qual o intervalo de troca recomendado?", "Tem kit de filtros para revisão completa?", "Quais modelos usam o mesmo filtro?"],
  "estoque": ["Quais peças estão com estoque zerado?", "Valor total do estoque parado?", "Top 10 peças mais caras em estoque"],
  "compatib": ["Peças intercambiáveis entre escavadeiras?", "Filtros universais para linha XCMG?", "Peças de motor Cummins compatíveis"],
  "venda": ["Qual o ticket médio das vendas?", "Clientes que mais compraram", "Vendas por status (orçamento vs faturado)"],
  "parad": ["Sugestão de descontos para desova", "Quais modelos têm mais peças paradas?", "Valor total do capital imobilizado"],
  "pesquisa": ["Qual distribuidor tem melhor preço?", "Preços médios por distribuidor", "Peças onde somos mais caros que o mercado"],
  default: ["Quais peças precisam reposição urgente?", "Resumo do catálogo por categoria", "Peças mais vendidas"],
};

function getFollowUps(content: string): string[] {
  const lower = content.toLowerCase();
  for (const [key, suggestions] of Object.entries(FOLLOW_UP_MAP)) {
    if (key !== "default" && lower.includes(key)) return suggestions;
  }
  return FOLLOW_UP_MAP.default;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou o **Assistente Técnico Lopes & Lopes**, especialista em peças XCMG.\n\nPosso ajudar com:\n- 🔍 **Buscar peças** por código, descrição ou modelo\n- 🔄 **Compatibilidade** entre máquinas\n- 📊 **Análise de estoque** e preços\n- 💰 **Vendas e clientes**\n- 🔧 **Consultoria técnica** sobre manutenção\n- 📎 **Analisar documentos** — envie planilhas ou PDFs\n\n**Dica:** Quanto mais detalhes você fornecer, mais precisa será minha resposta!\n\nComo posso ajudar?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, followUps]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();

    if (file.name.match(/\.(csv|xlsx|xls)$/i)) {
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const text = XLSX.utils.sheet_to_csv(sheet);
          setAttachedFile({ name: file.name, content: text.substring(0, 15000) });
          toast.success(`${file.name} anexado`);
        } catch { toast.error("Erro ao ler planilha"); }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.match(/\.(txt|json|md)$/i)) {
      reader.onload = (e) => {
        setAttachedFile({ name: file.name, content: (e.target?.result as string).substring(0, 15000) });
        toast.success(`${file.name} anexado`);
      };
      reader.readAsText(file);
    } else {
      toast.error("Formato não suportado. Use .csv, .xlsx, .txt ou .json");
    }
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if ((!msg && !attachedFile) || isLoading) return;

    const displayContent = attachedFile ? `📎 ${attachedFile.name}\n${msg || "Analise este documento"}` : msg;
    const userMsg: Msg = { role: "user", content: displayContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setFollowUps([]);

    let assistantSoFar = "";
    const currentFile = attachedFile;
    setAttachedFile(null);

    try {
      const url = currentFile ? ANALYZE_URL : CHAT_URL;
      const body = currentFile
        ? { content: currentFile.content, question: msg, fileName: currentFile.name }
        : { messages: newMessages.filter(m => m.content) };

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > newMessages.length) {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (assistantSoFar) setFollowUps(getFollowUps(assistantSoFar));
    } catch (e: any) {
      console.error("Chat error:", e);
      toast.error(e.message || "Erro ao conectar com o assistente");
      setMessages(prev => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const showSuggestions = messages.length <= 1;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="flex-1 overflow-auto p-6" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="assistant-markdown prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {showSuggestions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)} disabled={isLoading}
                    className="flex items-center gap-2 text-left text-sm px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />{s}
                  </button>
                ))}
              </div>
            )}

            {!isLoading && followUps.length > 0 && !showSuggestions && (
              <div className="flex flex-wrap gap-2 mt-2">
                {followUps.map((s, i) => (
                  <button key={i} onClick={() => { setFollowUps([]); send(s); }}
                    className="text-xs px-3 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t bg-card p-4">
          {attachedFile && (
            <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{attachedFile.name}</span>
              <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => setAttachedFile(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="max-w-3xl mx-auto flex gap-2">
            <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} className="shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <input ref={fileRef} type="file" className="hidden" accept=".csv,.xlsx,.xls,.txt,.json,.md" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
            <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={attachedFile ? "Pergunte sobre o documento..." : "Pergunte sobre peças, compatibilidade, estoque, vendas..."} disabled={isLoading} className="text-sm" />
            <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && !attachedFile)}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
