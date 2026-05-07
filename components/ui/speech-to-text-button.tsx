'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

interface SpeechToTextButtonProps {
  onTranscript: (transcript: string) => void
  label?: string
  listeningLabel?: string
  disabled?: boolean
  className?: string
}

const speechErrorMessages: Record<string, string> = {
  'audio-capture': 'Microphone access is unavailable.',
  'not-allowed': 'Allow microphone access to record a voice note.',
  'service-not-allowed': 'Speech recognition is blocked in this browser.',
  'no-speech': 'No speech was detected. Try again in a quieter environment.',
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function SpeechToTextButton({
  onTranscript,
  label = 'Voice note',
  listeningLabel = 'Listening...',
  disabled = false,
  className,
}: SpeechToTextButtonProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptRef = useRef('')
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionConstructor()))
  }, [])

  useEffect(
    () => () => {
      const recognition = recognitionRef.current
      const pendingTranscript = transcriptRef.current.trim()

      recognitionRef.current = null

      if (recognition) {
        recognition.onend = null
        recognition.onerror = null
        recognition.onresult = null
        recognition.stop()
      }

      if (pendingTranscript) {
        onTranscript(pendingTranscript)
        transcriptRef.current = ''
      }
    },
    [onTranscript],
  )

  const handleToggle = () => {
    if (disabled || !isSupported) {
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) {
      setError('Speech recognition is unavailable in this browser.')
      return
    }

    transcriptRef.current = ''
    setError(null)

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      let finalTranscript = transcriptRef.current

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result[0]?.transcript?.trim()

        if (!transcript || !result.isFinal) {
          continue
        }

        finalTranscript = `${finalTranscript} ${transcript}`.trim()
      }

      transcriptRef.current = finalTranscript
    }
    recognition.onerror = (event) => {
      setError(speechErrorMessages[event.error] ?? 'Speech recognition failed. Try again.')
      setIsListening(false)
    }
    recognition.onend = () => {
      setIsListening(false)

      if (!transcriptRef.current) {
        return
      }

      onTranscript(transcriptRef.current)
      transcriptRef.current = ''
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  return (
    <div className={cn('space-y-1', className)}>
      <Button type="button" variant="outline" size="sm" onClick={handleToggle} disabled={disabled || !isSupported} className="gap-2 rounded-full">
        {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        {isListening ? listeningLabel : label}
      </Button>
      {!isSupported ? <p className="text-[11px] text-muted-foreground">Speech capture needs a supported browser such as Chrome or Edge.</p> : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  )
}