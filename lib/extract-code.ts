export function extractComponentCode(text: string): string | null {
  const match = text.match(/```(?:tsx|jsx|typescript|javascript|react)?\s*\n([\s\S]*?)(?:```|$)/i);
  if (match) {
    return match[1].trim();
  }

  if (
    (text.includes("function ") || text.includes("const ") || text.includes("=>")) &&
    text.includes("render(")
  ) {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      const firstNewline = cleaned.indexOf("\n");
      if (firstNewline !== -1) {
        cleaned = cleaned.substring(firstNewline + 1);
      }
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  }

  return null;
}
