import { describe, expect, it } from "vitest"

import {
  appendPlainTextToRichText,
  getPlainTextFromRichText,
  getRichTextPreview,
  looksLikeRichText,
  normalizeRichTextValue,
  plainTextToRichText,
} from "@/lib/rich-text"

describe("looksLikeRichText", () => {
  it("detects HTML markup without treating comparison text as rich text", () => {
    expect(looksLikeRichText("<p>Trade note</p>")).toBe(true)
    expect(looksLikeRichText("2 < 5")).toBe(false)
  })
})

describe("plainTextToRichText", () => {
  it("wraps paragraphs and preserves single line breaks", () => {
    expect(plainTextToRichText("Line one\nLine two\n\nNext paragraph")).toBe(
      "<p>Line one<br>Line two</p><p>Next paragraph</p>",
    )
  })
})

describe("appendPlainTextToRichText", () => {
  it("creates rich text when appending to an empty value", () => {
    expect(appendPlainTextToRichText("", "Voice note summary")).toBe(
      "<p>Voice note summary</p>",
    )
  })

  it("converts existing plain text into rich text before appending", () => {
    expect(appendPlainTextToRichText("Existing note", "Voice note summary")).toBe(
      "<p>Existing note<br>Voice note summary</p>",
    )
  })

  it("appends a new paragraph when the current value is already rich text", () => {
    expect(
      appendPlainTextToRichText("<p>Existing <strong>bias</strong></p>", "Voice note summary"),
    ).toBe("<p>Existing <strong>bias</strong></p><p>Voice note summary</p>")
  })
})

describe("getPlainTextFromRichText", () => {
  it("strips supported markup into readable plain text", () => {
    expect(
      getPlainTextFromRichText(
        "<p>Setup was <strong>clean</strong>.</p><ul><li>Hold winner</li><li>Respect stop</li></ul>",
      ),
    ).toBe("Setup was clean.\n\n• Hold winner\n• Respect stop")
  })

  it("passes through plain text without modification", () => {
    expect(getPlainTextFromRichText("Existing plain note")).toBe("Existing plain note")
  })
})

describe("getRichTextPreview", () => {
  it("builds previews from stripped rich text", () => {
    expect(getRichTextPreview("<p>One <strong>two</strong> three four</p>", 7)).toBe("One two...")
  })
})

describe("normalizeRichTextValue", () => {
  it("collapses empty editor markup to an empty string", () => {
    expect(normalizeRichTextValue("<p>&nbsp;</p>")).toBe("")
    expect(normalizeRichTextValue("<p>   </p>")).toBe("")
  })

  it("preserves non-empty rich text content", () => {
    expect(normalizeRichTextValue("<p><strong>Keep me</strong></p>")).toBe(
      "<p><strong>Keep me</strong></p>",
    )
  })
})