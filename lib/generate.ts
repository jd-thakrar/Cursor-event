import { Agent, CursorAgentError } from "@cursor/sdk";
import {
  buildFollowUpPrompt,
  buildInitialPrompt,
  COMPONENT_SYSTEM_PROMPT,
} from "@/lib/prompts";

export type GenerateCallbacks = {
  onText: (chunk: string) => void;
};

export type GenerateResult = {
  fullText: string;
  agentId: string;
  status: string;
};

export function isPlanRequiredError(err: unknown): boolean {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return (
    message.includes("plan_required") ||
    message.includes("free users") ||
    message.includes("upgrade to Pro")
  );
}

async function disposeAgent(agent: Awaited<ReturnType<typeof Agent.create>>) {
  const disposable = agent as AsyncDisposable;
  if (typeof disposable[Symbol.asyncDispose] === "function") {
    await disposable[Symbol.asyncDispose]();
  }
}

export async function generateWithCursorSdk(
  prompt: string,
  agentId: string | undefined,
  cwd: string,
  apiKey: string,
  callbacks: GenerateCallbacks,
): Promise<GenerateResult> {
  let agent: Awaited<ReturnType<typeof Agent.create>> | null = null;

  try {
    agent = agentId
      ? await Agent.resume(agentId, {
          apiKey,
          model: { id: "composer-2.5" },
          local: { cwd, settingSources: [] },
        })
      : await Agent.create({
          apiKey,
          model: { id: "composer-2.5" },
          local: { cwd, settingSources: [] },
        });

    const message = agentId
      ? buildFollowUpPrompt(prompt)
      : buildInitialPrompt(prompt);

    const run = await agent.send(message);
    let fullText = "";

    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            fullText += block.text;
            callbacks.onText(block.text);
          }
        }
      }
    }

    const result = await run.wait();

    return {
      fullText,
      agentId: agent.agentId,
      status: result.status,
    };
  } finally {
    if (agent) {
      await disposeAgent(agent);
    }
  }
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function generateWithOpenAI(
  prompt: string,
  history: ChatMessage[],
  apiKey: string,
  callbacks: GenerateCallbacks,
): Promise<{ fullText: string; status: string }> {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [{ role: "system", content: COMPONENT_SYSTEM_PROMPT }];

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      stream: true,
      temperature: 0.7,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream from OpenAI");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const chunk = parsed.choices?.[0]?.delta?.content;
        if (chunk) {
          fullText += chunk;
          callbacks.onText(chunk);
        }
      } catch {
        // skip malformed SSE chunks
      }
    }
  }

  return { fullText, status: "finished" };
}

export async function generateWithGroq(
  prompt: string,
  history: ChatMessage[],
  apiKey: string,
  callbacks: GenerateCallbacks,
): Promise<{ fullText: string; status: string }> {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [{ role: "system", content: COMPONENT_SYSTEM_PROMPT }];

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      stream: true,
      temperature: 0.7,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream from Groq");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const chunk = parsed.choices?.[0]?.delta?.content;
        if (chunk) {
          fullText += chunk;
          callbacks.onText(chunk);
        }
      } catch {
        // skip malformed SSE chunks
      }
    }
  }

  return { fullText, status: "finished" };
}

export { CursorAgentError };
