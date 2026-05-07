import React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SpeechToTextButton } from "@/components/ui/speech-to-text-button"
import { ImagePlus, X } from "lucide-react"
import type { TradeFormData } from "@/lib/create-trade-form"
import { TradeFormSection } from "./trade-form-section"
import { CREATE_TRADE_SCREENSHOT_MAX_COUNT } from "@/lib/create-trade-form"

export interface UploadedTradeScreenshot {
  url: string
  sizeBytes: number
}

export interface NotesEvidenceSectionProps {
  formData: TradeFormData
  handleInputChange: (field: keyof Omit<TradeFormData, "position">, value: string) => void
  surfaceFieldClassName: string
  screenshots: UploadedTradeScreenshot[]
  handleScreenshotUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  removeScreenshot: (index: number) => void
}

export function NotesEvidenceSection({
  formData,
  handleInputChange,
  surfaceFieldClassName,
  screenshots,
  handleScreenshotUpload,
  removeScreenshot,
}: NotesEvidenceSectionProps) {
  return (
    <TradeFormSection
      title="Notes & Evidence"
      description="Capture why the trade exists and attach chart context or setup screenshots for later review."
      icon={<ImagePlus className="h-4 w-4 text-primary" />}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Label htmlFor="trade-notes">Trade Notes</Label>
            <SpeechToTextButton
              label="Voice note"
              onTranscript={(transcript) =>
                handleInputChange(
                  "notes",
                  formData.notes.trim() ? `${formData.notes.trimEnd()}\n${transcript}` : transcript,
                )
              }
            />
          </div>
          <Textarea
            id="trade-notes"
            placeholder="Add your rationale, market conditions, trigger, or execution notes..."
            value={formData.notes}
            onChange={(event) => handleInputChange("notes", event.target.value)}
            rows={12}
            className={cn(surfaceFieldClassName, "min-h-96 resize-y")}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-foreground">Screenshots</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload up to {CREATE_TRADE_SCREENSHOT_MAX_COUNT} PNG, JPG, or WebP screenshots, 5MB each.
            </p>
          </div>

          <label
            htmlFor="screenshot-upload"
            className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-linear-to-br from-muted/20 to-background px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <ImagePlus className="mb-3 h-8 w-8 text-muted-foreground transition-transform group-hover:scale-105 group-hover:text-primary" />
            <span className="text-sm font-medium text-foreground">
              Click to upload screenshots
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, or WebP
            </span>
            <input
              id="screenshot-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              onChange={handleScreenshotUpload}
            />
          </label>

          {screenshots.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {screenshots.map((src, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm"
                >
                  <img
                    src={src.url}
                    alt={`Screenshot ${index + 1}`}
                    className="aspect-video w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(index)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-background/85 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                    aria-label={`Remove screenshot ${index + 1}`}
                  >
                    <X className="h-3.5 w-3.5 text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </TradeFormSection>
  )
}
