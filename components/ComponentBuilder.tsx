"use client";

import dynamic from "next/dynamic";
import { EXAMPLE_PROMPTS } from "@/lib/example-prompts";
import {
  Check,
  Code2,
  Copy,
  Eye,
  Lightbulb,
  Loader2,
  SendHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const LivePreviewPanel = dynamic(() => import("@/components/LivePreview"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5">
      <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
    </div>
  ),
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ViewMode = "preview" | "code";

const DEFAULT_CODE = `function WelcomeCard() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-8 text-center shadow-xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg">
        <span className="text-2xl">✦</span>
      </div>
      <h2 className="text-xl font-bold text-zinc-900">Component Builder</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Describe a UI in the chat and click Generate to see it come alive here.
      </p>
    </div>
  );
}

render(<WelcomeCard />);`;

export default function ComponentBuilder() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your component builder. Describe any UI in detail and click Generate — I'll produce production-quality React + Tailwind code with a live preview.\n\nTry an example prompt below, or paste this:\n\n\"Build a SaaS pricing section with 3 tiers (Starter $9, Pro $29, Enterprise $99), monthly/yearly toggle with 20% annual discount, feature lists with checkmarks, and highlight the Pro tier with a gradient border.\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState(DEFAULT_CODE);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [generatedCode]);

  const handleGenerate = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);
    setStreamingText("");

    let assistantText = "";

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          agentId: useFallback ? undefined : agentId,
          history,
          forceFallback: useFallback,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Failed to start generation");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const payload = JSON.parse(line.slice(6)) as
            | { type: "text"; content: string }
            | {
                type: "done";
                fullText: string;
                code: string | null;
                agentId: string | null;
                provider: "cursor" | "openai" | "groq";
                status: string;
              }
            | { type: "error"; message: string; code?: string };

          if (payload.type === "text") {
            assistantText += payload.content;
            setStreamingText(assistantText);
          } else if (payload.type === "done") {
            assistantText = payload.fullText;
            if (payload.provider === "openai" || payload.provider === "groq") {
              setUseFallback(true);
              setAgentId(null);
            } else if (payload.agentId) {
              setAgentId(payload.agentId);
              setUseFallback(false);
            }
            if (payload.code) {
              setGeneratedCode(payload.code);
              setViewMode("preview");
            }
            if (payload.status === "error") {
              throw new Error("The agent run failed. Try refining your prompt.");
            }
          } else if (payload.type === "error") {
            throw new Error(payload.message);
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantText || "Component generated successfully.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setStreamingText("");
      setIsGenerating(false);
      textareaRef.current?.focus();
    }
  };

  const applyExample = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-zinc-100 font-sans antialiased selection:bg-white/30">
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-black/50 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-b from-white/10 to-transparent shadow-sm">
            <Wand2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-white">
              Component Builder
            </h1>
            <p className="text-[13px] text-zinc-500">
              Powered by Llama 3.3 · Next.js
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-medium tracking-wide text-zinc-400 sm:flex">
          <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
          Design. Generate. Deploy.
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Chat panel */}
        <section className="flex min-h-0 w-full flex-col border-b border-white/[0.08] bg-black lg:w-[420px] lg:border-b-0 lg:border-r xl:w-[460px]">
          <div className="border-b border-white/[0.05] px-6 py-3.5">
            <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">Prompting Engine</h2>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed tracking-tight ${
                    message.role === "user"
                      ? "bg-white text-black font-medium"
                      : "border border-white/10 bg-[#0a0a0a] text-zinc-300"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl border border-white/10 bg-[#0a0a0a] px-5 py-3.5 text-[14px] leading-relaxed tracking-tight text-zinc-300">
                  <p className="whitespace-pre-wrap">{streamingText}</p>
                  <span className="mt-1 inline-block h-4 w-1 animate-pulse rounded-sm bg-zinc-500" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="shrink-0 border-t border-white/[0.08] bg-black p-5">
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                <Lightbulb className="h-3 w-3" />
                Examples
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => applyExample(example.prompt)}
                    disabled={isGenerating}
                    className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-3 transition-colors focus-within:border-white/30 focus-within:bg-black">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your vision..."
                rows={3}
                disabled={isGenerating}
                className="w-full resize-none bg-transparent text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-60"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-600">
                  <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-sans text-zinc-400">Enter</kbd> to execute
                </span>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!input.trim() || isGenerating}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-black transition-all hover:bg-zinc-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Compiling...
                    </>
                  ) : (
                    <>
                      <SendHorizontal className="h-3.5 w-3.5" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Preview panel */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#050505] relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center justify-between border-b border-white/[0.08] bg-black/50 backdrop-blur-md px-6 py-3">
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all ${
                  viewMode === "preview"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => setViewMode("code")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all ${
                  viewMode === "code"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                Code
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden p-8">
            {viewMode === "preview" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-white/10 bg-black shadow-2xl">
                <LivePreviewPanel code={generatedCode} />
              </div>
            ) : (
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]">
                <pre className="h-full overflow-auto p-6 font-mono text-[13px] leading-relaxed text-zinc-300">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
