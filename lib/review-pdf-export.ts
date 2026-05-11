import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { ReviewData, ReviewTrade } from "./review-api"
import { formatTradePrice } from "./trade-price-format"

const COLORS = {
  primary: [99, 102, 241] as [number, number, number],
  emerald: [52, 211, 153] as [number, number, number],
  red: [248, 113, 113] as [number, number, number],
  amber: [251, 191, 36] as [number, number, number],
  dark: [15, 15, 20] as [number, number, number],
  muted: [120, 120, 140] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  surface: [24, 24, 32] as [number, number, number],
}

function fmtCurrency(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
}

function fmtDate(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

const confidenceLabels = ["None", "Very Low", "Low", "Neutral", "High", "Very High"]

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ""
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export async function generateReviewPdf(
  review: ReviewData,
  trades: ReviewTrade[],
  periodLabel: string,
  userNotes: string
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  
  try {
    const [regularRes, boldRes] = await Promise.all([
      fetch("/fonts/Roboto-Regular.ttf"),
      fetch("/fonts/Roboto-Bold.ttf")
    ])
    
    if (regularRes.ok && boldRes.ok) {
      const [regularBuffer, boldBuffer] = await Promise.all([
        regularRes.arrayBuffer(),
        boldRes.arrayBuffer()
      ])
      
      const regularBase64 = arrayBufferToBase64(regularBuffer)
      const boldBase64 = arrayBufferToBase64(boldBuffer)
      
      doc.addFileToVFS("Roboto-Regular.ttf", regularBase64)
      doc.addFileToVFS("Roboto-Bold.ttf", boldBase64)
      
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal")
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold")
    }
  } catch (error) {
    console.error("Failed to load PDF fonts", error)
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ─── Header ────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, pageWidth, 38, "F")

  doc.setTextColor(...COLORS.white)
  doc.setFontSize(22)
  doc.setFont("Roboto", "bold")
  doc.text("Trading Journal Report", margin, 17)

  doc.setFontSize(11)
  doc.setFont("Roboto", "normal")
  doc.text(periodLabel, margin, 25)

  doc.setFontSize(9)
  doc.text(`Generated ${new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`, margin, 32)

  y = 48

  // ─── Performance Summary ──────────────────────────────────────────
  doc.setTextColor(...COLORS.dark)
  doc.setFontSize(14)
  doc.setFont("Roboto", "bold")
  doc.text("Performance Summary", margin, y)
  y += 8

  const summaryData = [
    ["Total P&L", fmtCurrency(review.totalPnl), "Win Rate", `${review.winRate.toFixed(1)}%`],
    ["Total Trades", String(review.totalTrades), "Wins / Losses", `${review.wins} / ${review.losses}`],
    ["Avg Win", fmtCurrency(review.averageWin), "Avg Loss", fmtCurrency(review.averageLoss)],
    ["Best Trade", fmtCurrency(review.bestTradePnl), "Worst Trade", fmtCurrency(review.worstTradePnl)],
    ["Best Day", fmtCurrency(review.bestDayPnl), "Worst Day", fmtCurrency(review.worstDayPnl)],
    ["Long Trades", String(review.longTrades), "Short Trades", String(review.shortTrades)],
    ["Rule Breaks", String(review.ruleBreakTrades), "High Confidence", String(review.highConfidenceTrades)],
  ]

  if (review.topAsset) summaryData.push(["Top Asset", review.topAsset, "Primary Zone", review.primaryTradingZone ?? "—"])
  if (review.dominantEmotion) summaryData.push(["Dominant Emotion", review.dominantEmotion, "Technical Theme", review.topTechnicalTheme ?? "—"])

  autoTable(doc, {
    startY: y,
    head: [],
    body: summaryData,
    theme: "plain",
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3, textColor: COLORS.dark, font: "Roboto" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30, textColor: COLORS.muted },
      1: { cellWidth: contentWidth / 2 - 30 },
      2: { fontStyle: "bold", cellWidth: 30, textColor: COLORS.muted },
      3: { cellWidth: contentWidth / 2 - 30 },
    },
    didParseCell(data) {
      // Color P&L values
      if (data.column.index === 1 && data.row.index === 0) {
        const pnl = review.totalPnl
        data.cell.styles.textColor = pnl > 0 ? COLORS.emerald : pnl < 0 ? COLORS.red : COLORS.dark
        data.cell.styles.fontStyle = "bold"
      }
    },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // ─── AI Summary (if exists) ────────────────────────────────────────
  if (review.aiSummary) {
    y = checkPageBreak(doc, y, 40)
    doc.setFontSize(14)
    doc.setFont("Roboto", "bold")
    doc.setTextColor(...COLORS.dark)
    doc.text("AI Review Summary", margin, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont("Roboto", "normal")
    doc.setTextColor(...COLORS.muted)
    const summaryLines = doc.splitTextToSize(review.aiSummary, contentWidth)
    doc.text(summaryLines, margin, y)
    y += summaryLines.length * 4 + 6
  }

  // ─── User Notes ────────────────────────────────────────────────────
  if (userNotes.trim()) {
    y = checkPageBreak(doc, y, 30)
    doc.setFontSize(14)
    doc.setFont("Roboto", "bold")
    doc.setTextColor(...COLORS.dark)
    doc.text("Review Notes", margin, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont("Roboto", "normal")
    doc.setTextColor(...COLORS.muted)
    const notesLines = doc.splitTextToSize(userNotes, contentWidth)
    doc.text(notesLines, margin, y)
    y += notesLines.length * 4 + 10
  }

  // ─── Trade Details Table ───────────────────────────────────────────
  if (trades.length > 0) {
    y = checkPageBreak(doc, y, 30)
    doc.setFontSize(14)
    doc.setFont("Roboto", "bold")
    doc.setTextColor(...COLORS.dark)
    doc.text(`Trade Details (${trades.length} trades)`, margin, y)
    y += 8

    autoTable(doc, {
      startY: y,
      head: [["#", "Date", "Asset", "Direction", "Entry", "Exit", "P&L", "Conf.", "Zone"]],
      body: trades.map((t) => [
        String(t.id),
        fmtDate(t.closedDate),
        t.asset,
        t.position,
        formatTradePrice(t.entryPrice),
        formatTradePrice(t.exitPrice),
        fmtCurrency(t.pnl),
        confidenceLabels[t.confidenceLevel] ?? "—",
        t.tradingZone ?? "—",
      ]),
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, textColor: COLORS.dark },
      styles: { font: "Roboto" },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 6) {
          const trade = trades[data.row.index]
          if (trade?.pnl !== null && trade?.pnl !== undefined) {
            data.cell.styles.textColor = trade.pnl > 0 ? COLORS.emerald : trade.pnl < 0 ? COLORS.red : COLORS.dark
            data.cell.styles.fontStyle = "bold"
          }
        }
      },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  // ─── Trade Journal Entries ─────────────────────────────────────────
  const tradesWithNotes = trades.filter((t) => t.notes?.trim() || t.emotionTags?.length > 0 || t.technicalThemes?.length > 0)

  if (tradesWithNotes.length > 0) {
    y = checkPageBreak(doc, y, 30)
    doc.setFontSize(14)
    doc.setFont("Roboto", "bold")
    doc.setTextColor(...COLORS.dark)
    doc.text("Trade Journal Entries", margin, y)
    y += 8

    for (const trade of tradesWithNotes) {
      y = checkPageBreak(doc, y, 35)

      // Trade header
      const pnlColor = (trade.pnl ?? 0) > 0 ? COLORS.emerald : (trade.pnl ?? 0) < 0 ? COLORS.red : COLORS.dark
      doc.setFontSize(10)
      doc.setFont("Roboto", "bold")
      doc.setTextColor(...COLORS.dark)
      doc.text(`${trade.asset} · ${trade.position} · ${fmtCurrency(trade.pnl)}`, margin, y)

      doc.setFontSize(8)
      doc.setFont("Roboto", "normal")
      doc.setTextColor(...COLORS.muted)
      doc.text(`${fmtDate(trade.closedDate)} · Confidence: ${confidenceLabels[trade.confidenceLevel] ?? "—"}`, margin, y + 4)
      y += 10

      // Tags
      const tags: string[] = []
      if (trade.emotionTags?.length > 0) tags.push(`Emotions: ${trade.emotionTags.join(", ")}`)
      if (trade.technicalThemes?.length > 0) tags.push(`Technical: ${trade.technicalThemes.join(", ")}`)
      if (trade.checklistItems?.length > 0) tags.push(`Checklist: ${trade.checklistItems.join(", ")}`)
      if (trade.isRuleBroken) tags.push(`⚠ Rule break: ${trade.ruleBreakReason ?? "No reason given"}`)

      if (tags.length > 0) {
        doc.setFontSize(8)
        doc.setTextColor(...COLORS.muted)
        for (const tag of tags) {
          y = checkPageBreak(doc, y, 8)
          const tagLines = doc.splitTextToSize(tag, contentWidth - 4)
          doc.text(tagLines, margin + 2, y)
          y += tagLines.length * 3.5
        }
        y += 2
      }

      // Notes
      if (trade.notes?.trim()) {
        const plainNotes = stripHtml(trade.notes)
        if (plainNotes) {
          y = checkPageBreak(doc, y, 12)
          doc.setFontSize(8)
          doc.setTextColor(...COLORS.dark)
          const noteLines = doc.splitTextToSize(plainNotes, contentWidth - 4)
          doc.text(noteLines, margin + 2, y)
          y += noteLines.length * 3.5
        }
      }

      y += 5

      // Separator
      doc.setDrawColor(220, 220, 230)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5
    }
  }

  // ─── Footer on each page ───────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFontSize(7)
    doc.setFont("Roboto", "normal")
    doc.setTextColor(...COLORS.muted)
    doc.text(`Trading Journal Report · ${periodLabel} · Page ${i} of ${totalPages}`, margin, pageHeight - 8)
  }

  // ─── Save ──────────────────────────────────────────────────────────
  const safeLabel = periodLabel.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")
  doc.save(`trading-report_${safeLabel}.pdf`)
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - 16) {
    doc.addPage()
    return 16
  }
  return y
}
