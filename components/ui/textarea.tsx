'use client'

import * as React from 'react'

import {
  looksLikeRichText,
  normalizeRichTextValue,
  plainTextToRichText,
} from '@/lib/rich-text'
import { cn } from '@/lib/utils'

type TextareaProps = React.ComponentProps<'textarea'>

type EditorInstance = {
  getData: () => string
  setData: (data: string) => void
  editing: {
    view: {
      focus: () => void
    }
  }
}

type EditorModules = {
  CKEditor: React.ComponentType<any>
  ClassicEditor: unknown
  editorConfig: Record<string, unknown>
}

const BASE_TEXTAREA_CLASS_NAME =
  'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'

const BASE_EDITOR_CLASS_NAME =
  'border-input dark:bg-input/30 flex min-h-16 w-full flex-col overflow-hidden rounded-md border bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'

const CKEDITOR_LICENSE_KEY = process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY ?? 'GPL'

function loadEditorModules(): Promise<EditorModules> {
  return Promise.all([import('@ckeditor/ckeditor5-react'), import('ckeditor5')]).then(
    ([reactModule, ckeditorModule]) => ({
      CKEditor: reactModule.CKEditor,
      ClassicEditor: ckeditorModule.ClassicEditor,
      editorConfig: {
        licenseKey: CKEDITOR_LICENSE_KEY,
        plugins: [
          ckeditorModule.Essentials,
          ckeditorModule.Paragraph,
          ckeditorModule.Bold,
          ckeditorModule.Italic,
          ckeditorModule.Link,
          ckeditorModule.AutoLink,
          ckeditorModule.List,
          ckeditorModule.BlockQuote,
          ckeditorModule.Undo,
        ],
        toolbar: ['undo', 'redo', '|', 'bold', 'italic', 'link', '|', 'bulletedList', 'numberedList', 'blockQuote'],
      },
    }),
  )
}

function normalizeTextareaValue(value: TextareaProps['value'] | TextareaProps['defaultValue']): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  return ''
}

type TextareaComponentProps = TextareaProps & {
  'data-slot'?: string
}

function createSyntheticTarget(value: string, id?: string, name?: string) {
  return {
    value,
    id,
    name,
  } as EventTarget & HTMLTextAreaElement
}

function buildEditorData(value: string): string {
  if (!value) {
    return ''
  }

  return looksLikeRichText(value) ? value : plainTextToRichText(value)
}

function Textarea({
  className,
  defaultValue,
  disabled,
  id,
  name,
  onBlur,
  onChange,
  onFocus,
  placeholder,
  readOnly,
  required,
  rows,
  style,
  value,
  ...props
}: TextareaProps) {
  const isControlled = value !== undefined
  const [editorModules, setEditorModules] = React.useState<EditorModules | null>(null)
  const [editorFailed, setEditorFailed] = React.useState(false)
  const [uncontrolledValue, setUncontrolledValue] = React.useState(() => normalizeTextareaValue(defaultValue))
  const editorRef = React.useRef<EditorInstance | null>(null)
  const slot = (props as TextareaComponentProps)['data-slot'] ?? 'textarea'
  const ariaInvalid = props['aria-invalid']
  const currentValue = isControlled ? normalizeTextareaValue(value) : uncontrolledValue
  const editorData = React.useMemo(() => buildEditorData(currentValue), [currentValue])

  React.useEffect(() => {
    let isMounted = true

    void loadEditorModules()
      .then((modules) => {
        if (isMounted) {
          setEditorModules(modules)
        }
      })
      .catch(() => {
        if (isMounted) {
          setEditorFailed(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const currentEditorValue = editor.getData()

    if (
      currentEditorValue === editorData ||
      normalizeRichTextValue(currentEditorValue) === normalizeRichTextValue(editorData)
    ) {
      return
    }

    editor.setData(editorData)
  }, [editorData])

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      const normalizedValue = normalizeRichTextValue(nextValue)

      if (!isControlled) {
        setUncontrolledValue(normalizedValue)
      }

      const target = createSyntheticTarget(normalizedValue, id, name)
      onChange?.({
        target,
        currentTarget: target,
      } as React.ChangeEvent<HTMLTextAreaElement>)
    },
    [id, isControlled, name, onChange],
  )

  const handleEditorBlur = React.useCallback(() => {
    const target = createSyntheticTarget(currentValue, id, name)
    onBlur?.({
      target,
      currentTarget: target,
    } as React.FocusEvent<HTMLTextAreaElement>)
  }, [currentValue, id, name, onBlur])

  const handleEditorFocus = React.useCallback(() => {
    const target = createSyntheticTarget(currentValue, id, name)
    onFocus?.({
      target,
      currentTarget: target,
    } as React.FocusEvent<HTMLTextAreaElement>)
  }, [currentValue, id, name, onFocus])

  if (!editorModules || editorFailed) {
    return (
      <textarea
        data-slot={slot}
        className={cn(BASE_TEXTAREA_CLASS_NAME, className)}
        defaultValue={isControlled ? undefined : currentValue}
        disabled={disabled}
        id={id}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        onFocus={onFocus}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        rows={rows}
        style={style}
        value={isControlled ? currentValue : undefined}
        {...props}
      />
    )
  }

  const { CKEditor, ClassicEditor, editorConfig } = editorModules

  return (
    <div
      data-slot={slot}
      data-editor="ckeditor"
      data-disabled={disabled || readOnly ? 'true' : undefined}
      aria-invalid={ariaInvalid}
      className={cn(BASE_EDITOR_CLASS_NAME, className)}
      style={{
        ...style,
        ['--textarea-editor-min-height' as string]: `${Math.max(rows ?? 4, 4) * 1.5}rem`,
      }}
    >
      <CKEditor
        editor={ClassicEditor}
        data={editorData}
        disabled={disabled || readOnly}
        config={{
          ...editorConfig,
          placeholder,
        }}
        onReady={(editor) => {
          editorRef.current = editor
        }}
        onChange={(_event, editor) => {
          handleValueChange(editor.getData())
        }}
        onBlur={handleEditorBlur}
        onFocus={handleEditorFocus}
      />
      <textarea
        aria-hidden="true"
        className="sr-only"
        disabled={disabled}
        id={id}
        name={name}
        onFocus={() => editorRef.current?.editing.view.focus()}
        readOnly={readOnly}
        required={required}
        tabIndex={-1}
        value={currentValue}
        onChange={() => undefined}
      />
    </div>
  )
}

export { Textarea }
