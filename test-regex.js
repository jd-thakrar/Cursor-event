const text = \`\\\`\\\`tsx
function RedButton() {
  return <button>Click me</button>;
}
render(<RedButton />);
\\\`\\\`\\\`;

const codeBlockPattern = /\`\`\`(?:tsx|jsx|typescript|javascript|react)?\\s*\\n([\\s\\S]*?)\`\`\`/gi;
const matches = [...text.matchAll(codeBlockPattern)];
console.log("MATCHES:", matches.length);
if (matches.length > 0) {
  console.log("MATCH:", matches[0][1].trim());
} else {
  console.log("FAILED");
}
