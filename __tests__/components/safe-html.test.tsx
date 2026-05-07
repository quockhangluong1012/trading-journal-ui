import { render, screen } from "@testing-library/react"

import { SafeHtml, sanitizeHtml } from "@/components/ui/safe-html"

describe("sanitizeHtml", () => {
  it("strips script tags while preserving safe markup", () => {
    const sanitized = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>')

    expect(sanitized).toContain("<p>Hello</p>")
    expect(sanitized).not.toContain("<script")
  })

  it("removes inline event handlers", () => {
    const sanitized = sanitizeHtml('<p onclick="alert(1)">Clickable</p>')

    expect(sanitized).toContain("Clickable")
    expect(sanitized).not.toContain("onclick")
  })

  it("removes javascript protocol links", () => {
    const sanitized = sanitizeHtml('<a href="javascript:alert(1)">Bad link</a>')

    expect(sanitized).toContain("Bad link")
    expect(sanitized).not.toContain("javascript:")
  })

  it("removes data protocol links", () => {
    const sanitized = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">Bad data link</a>')

    expect(sanitized).toContain("Bad data link")
    expect(sanitized).not.toContain("data:text/html")
  })

  it("returns an empty string for nullish or blank input", () => {
    expect(sanitizeHtml(undefined)).toBe("")
    expect(sanitizeHtml(null)).toBe("")
    expect(sanitizeHtml("   ")).toBe("")
  })
})

describe("SafeHtml", () => {
  it("renders sanitized content", () => {
    const { container } = render(
      <SafeHtml
        className="prose"
        html={'<p>Safe content</p><img src="x" onerror="alert(1)" />'}
      />,
    )

    expect(screen.getByText("Safe content")).toBeInTheDocument()
    expect(container.querySelector("img")).toBeNull()
    expect(container.firstChild).toHaveClass("prose")
  })

  it("supports semantic wrapper elements", () => {
    const { container } = render(<SafeHtml as="section" html="<p>Wrapped</p>" />)

    expect(container.querySelector("section")).not.toBeNull()
    expect(screen.getByText("Wrapped")).toBeInTheDocument()
  })
})