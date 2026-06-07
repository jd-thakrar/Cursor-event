import { extractComponentCode } from "@/lib/extract-code";
import {
  CursorAgentError,
  generateWithCursorSdk,
  generateWithOpenAI,
  generateWithGroq,
  isPlanRequiredError,
  type ChatMessage,
} from "@/lib/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamEvent =
  | { type: "text"; content: string }
  | {
      type: "done";
      fullText: string;
      code: string | null;
      agentId: string | null;
      provider: "cursor" | "openai" | "groq";
      status: string;
    }
  | { type: "error"; message: string; retryable?: boolean; code?: string };

function sse(data: StreamEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

const PLAN_REQUIRED_MESSAGE =
  "Cursor SDK requires a Cursor Pro plan. The SDK validates models via a cloud endpoint that free accounts cannot access.\n\n" +
  "Options:\n" +
  "1. Upgrade to Cursor Pro at https://cursor.com/pricing\n" +
  "2. Add GROQ_API_KEY or OPENAI_API_KEY to .env.local for automatic fallback generation";

export async function POST(request: Request) {
  const cursorApiKey = process.env.CURSOR_API_KEY?.trim();
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  const groqApiKey = process.env.GROQ_API_KEY?.trim();

  if (!cursorApiKey && !openaiApiKey && !groqApiKey) {
    return Response.json(
      {
        error:
          "No API key configured. Set CURSOR_API_KEY (Pro plan), GROQ_API_KEY, or OPENAI_API_KEY in .env.local.",
      },
      { status: 500 },
    );
  }

  let body: {
    prompt?: string;
    agentId?: string;
    history?: ChatMessage[];
    forceFallback?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, agentId, history = [], forceFallback = false } = body;
  if (!prompt?.trim()) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const cwd = process.cwd();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(sse(event)));
      };

      const onText = (chunk: string) => {
        send({ type: "text", content: chunk });
      };

      try {
        let fullText = "";
        let resultAgentId: string | null = null;
        let provider: "cursor" | "openai" | "groq" = "cursor";
        let status = "finished";

        const tryCursor = cursorApiKey && !forceFallback;

        const runFallback = async () => {
          if (groqApiKey) {
            provider = "groq";
            const fallback = await generateWithGroq(prompt.trim(), history, groqApiKey, { onText });
            return fallback;
          } else if (openaiApiKey) {
            provider = "openai";
            const fallback = await generateWithOpenAI(prompt.trim(), history, openaiApiKey, { onText });
            return fallback;
          }
          throw new Error("No fallback API key available");
        };

        if (tryCursor) {
          try {
            const result = await generateWithCursorSdk(
              prompt.trim(),
              agentId,
              cwd,
              cursorApiKey,
              { onText },
            );
            fullText = result.fullText;
            resultAgentId = result.agentId;
            status = result.status;
          } catch (err) {
            if (isPlanRequiredError(err) && (groqApiKey || openaiApiKey)) {
              const notice =
                `_(Using ${groqApiKey ? 'Groq' : 'OpenAI'} fallback — Cursor SDK requires Pro plan)_\n\n`;
              send({ type: "text", content: notice });
              const fallback = await runFallback();
              fullText = notice + fallback.fullText;
              status = fallback.status;
            } else if (isPlanRequiredError(err)) {
              send({
                type: "error",
                code: "plan_required",
                message: PLAN_REQUIRED_MESSAGE,
                retryable: false,
              });
              return;
            } else if (err instanceof CursorAgentError) {
              send({
                type: "error",
                message: err.message,
                retryable: err.isRetryable,
              });
              return;
            } else {
              throw err;
            }
          }
        } else if (groqApiKey || openaiApiKey) {
          const fallback = await runFallback();
          fullText = fallback.fullText;
          status = fallback.status;
        } else {
          send({
            type: "error",
            code: "plan_required",
            message: PLAN_REQUIRED_MESSAGE,
            retryable: false,
          });
          return;
        }

        const code = extractComponentCode(fullText);

        send({
          type: "done",
          fullText,
          code,
          agentId: resultAgentId,
          provider,
          status,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Generation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
