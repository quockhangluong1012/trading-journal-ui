import DOMPurify from "isomorphic-dompurify"
import { useMemo } from "react"
import type { ComponentPropsWithoutRef, ElementType } from "react"

const SAFE_URI_PATTERN = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i

const DEFAULT_SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    "a",
    "blockquote",
    "br",
    "code",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "ol",
    "p",
    "pre",
    "span",
    "strong",
    "u",
    "ul",
  ],
  ALLOWED_ATTR: ["class", "href", "rel", "target", "title"],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  ALLOWED_URI_REGEXP: SAFE_URI_PATTERN,
  FORBID_TAGS: ["button", "form", "iframe", "input", "script", "style", "textarea"],
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html?.trim()) {
    return ""
  }

  try {
    return DOMPurify.sanitize(html, DEFAULT_SANITIZE_CONFIG)
  } catch (error) {
    console.error("Failed to sanitize HTML content", error)
    return ""
  }
}

type SafeHtmlProps<T extends ElementType> = {
  as?: T
  html: string | null | undefined
} & Omit<ComponentPropsWithoutRef<T>, "children" | "dangerouslySetInnerHTML">

export function SafeHtml<T extends ElementType = "div">({
  as,
  html,
  ...props
}: SafeHtmlProps<T>) {
  const Component = (as ?? "div") as ElementType
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html])

  return (
    <Component
      {...props}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}