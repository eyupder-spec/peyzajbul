import { createElement } from "react";

/**
 * Serialises structured data for a `<script type="application/ld+json">` tag.
 *
 * Plain JSON.stringify output is NOT safe inside an inline script: a firm-controlled
 * string containing `</script><script>...` would close the tag and run attacker markup.
 * Escaping `<`, `>` and `&` (plus the JS line separators U+2028/U+2029) as unicode
 * escapes keeps the payload valid JSON that parses back to the identical object.
 */
export function safeJsonLd(data: unknown): string {
  return (JSON.stringify(data) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Drop-in replacement for a raw `<script type="application/ld+json" dangerouslySetInnerHTML=...>`. */
export const JsonLd = ({ data }: { data: unknown }) =>
  createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: safeJsonLd(data) },
  });
