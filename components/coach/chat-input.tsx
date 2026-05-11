"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void | Promise<void>
  disabled: boolean
  placeholder?: string
  helperText?: string
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask your trading coach anything...",
  helperText = "TradeMind is a process coach, not a financial advisor. It does not recommend specific trades.",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
          />
        </div>
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          className="h-11 w-11 shrink-0 rounded-2xl shadow-sm"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
        {helperText}
      </p>
    </div>
  );
}
