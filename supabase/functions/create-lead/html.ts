// Shared HTML helpers for outgoing mail. Pure module.

export const BRAND = {
  forest: "#1A3D2D",
  paper: "#FAF8F5",
  clay: "#A64826",
  ink: "#17251D",
  muted: "#5B6B62",
  border: "#E4DED3",
} as const;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes a value for use in element text and quoted attributes. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Single-line plain text safe for an email subject: control characters and line breaks removed. */
export function toSingleLine(value: string): string {
  // deno-lint-ignore no-control-regex
  return value.replace(/[\u0000-\u001F\u007F-\u009F]+/g, " ").replace(/\s+/g, " ").trim();
}
