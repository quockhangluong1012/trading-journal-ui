"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function ChatMessage({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 shadow-sm">
          <Bot className="h-4 w-4 text-accent" />
        </div>
      )}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
        isUser
          ? "bg-primary text-primary-foreground"
          : "border border-border/70 bg-card/95 text-foreground"
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_p]:last:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_strong]:text-foreground [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs [&_code]:bg-secondary/50 [&_code]:px-1 [&_code]:rounded">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm">
          <User className="h-4 w-4 text-primary" />
        </div>
      )}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 shadow-sm">
        <Bot className="h-4 w-4 text-accent" />
      </div>
      <div className="rounded-2xl border border-border/70 bg-card/95 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
