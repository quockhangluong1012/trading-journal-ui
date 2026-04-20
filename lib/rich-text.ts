const RICH_TEXT_PATTERN = /<\/?[a-z][\s\S]*>/i

type RichTextValue = string | null | undefined

const SERVER_ENTITY_REPLACEMENTS: ReadonlyArray<[string, string]> = [
  ["&nbsp;", " "],
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
  ["&apos;", "'"],
]

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function decodeHtmlEntities(value: string): string {
  if (typeof window === "undefined") {
    return SERVER_ENTITY_REPLACEMENTS.reduce(
      (result, [entity, replacement]) => result.replaceAll(entity, replacement),
      value,
    )
  }

  const textarea = document.createElement("textarea")
  textarea.innerHTML = value
  return textarea.value
}

export function looksLikeRichText(value: RichTextValue): boolean {
  return typeof value === "string" && RICH_TEXT_PATTERN.test(value)
}

export function plainTextToRichText(value: RichTextValue): string {
  const normalized = (value ?? "").replace(/\r\n/g, "\n").trim()

  if (!normalized) {
    return ""
  }

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

export function getPlainTextFromRichText(value: RichTextValue): string {
  if (!value) {
    return ""
  }

  if (!looksLikeRichText(value)) {
    return value
  }

  const normalized = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|div|blockquote|h[1-6])>/gi, "\n\n")
    .replace(/<\/(li|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")

  return decodeHtmlEntities(normalized)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function getRichTextPreview(value: RichTextValue, maxLength: number): string {
  const plainText = getPlainTextFromRichText(value)

  if (plainText.length <= maxLength) {
    return plainText
  }

  return `${plainText.slice(0, maxLength).trimEnd()}...`
}

export function normalizeRichTextValue(value: RichTextValue): string {
  if (!value || value.trim() === "") {
    return ""
  }

  if (looksLikeRichText(value) && getPlainTextFromRichText(value).trim() === "") {
    return ""
  }

  return value
}