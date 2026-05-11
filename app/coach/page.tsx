"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppPageShell } from "@/components/app-page-shell";
import { ChatMessage, TypingIndicator } from "@/components/coach/chat-message";
import { ChatInput } from "@/components/coach/chat-input";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Bot,
  Brain,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { streamCoachReply, type CoachMessage, type CoachMode } from "@/lib/coach-api";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { buildRedirectWithNext } from "@/lib/auth-redirect";
import { AppShellLoader } from "@/components/app-shell-loader";

interface StarterPrompt {
  icon: LucideIcon
  label: string
  prompt: string
}

interface CoachModeConfig {
  label: string
  subtitle: string
  description: string
  emptyStateHint: string
  placeholder: string
  helperText: string
  starterPrompts: StarterPrompt[]
}

const COACH_MODE_CONFIG: Record<CoachMode, CoachModeConfig> = {
  coach: {
    label: "Coach",
    subtitle: "Personalized to your data",
    description:
      "Your AI trading coach analyzes your real performance data, psychology journal, and trade history to give personalized, actionable guidance.",
    emptyStateHint: "Start a coaching conversation or pick a personalized prompt above",
    placeholder: "Ask about your recent trades, performance, or psychology...",
    helperText:
      "TradeMind is a process coach, not a financial advisor. It does not recommend specific trades.",
    starterPrompts: [
      {
        icon: TrendingUp,
        label: "Review my performance",
        prompt:
          "Can you review my recent trading performance and highlight what I'm doing well and what needs improvement?",
      },
      {
        icon: Brain,
        label: "Analyze my psychology",
        prompt:
          "Based on my psychology journal entries and emotion patterns, what mental game insights can you share?",
      },
      {
        icon: Target,
        label: "Review my ICT execution",
        prompt:
          "Analyze my recent trades through the lens of ICT concepts. Am I correctly identifying order blocks, fair value gaps, and market structure? Which concepts are showing up most in my execution?",
      },
      {
        icon: Lightbulb,
        label: "Killzone and AMD coaching",
        prompt:
          "Based on my killzone performance data, which sessions am I most profitable in? Help me optimize my AMD entries and identify my best trading windows.",
      },
    ],
  },
  research: {
    label: "Learn / Research",
    subtitle: "ICT concept learning and deeper explanations",
    description:
      "Switch into research mode for structured ICT lessons, concept comparisons, study drills, and deeper breakdowns. If you keep lessons, playbooks, and daily notes, TradeMind can use that knowledge library as extra study context.",
    emptyStateHint: "Ask for an ICT lesson, concept comparison, study plan, or use your knowledge library",
    placeholder: "Ask for an ICT concept deep dive, comparison, or study plan...",
    helperText:
      "Research mode teaches concepts and study frameworks. Saved lessons, playbooks, and daily notes can be used as additional study context, but it still does not replace live market data or financial advice.",
    starterPrompts: [
      {
        icon: BookOpen,
        label: "Explain AMD deeply",
        prompt:
          "Explain the ICT AMD model in depth. What defines each phase, what should I observe on the chart, and what are the most common mistakes traders make when applying it?",
      },
      {
        icon: Search,
        label: "Compare BOS vs CHoCH",
        prompt:
          "Compare break of structure and change of character. How do they differ, when does each matter most, and what are the common misreads?",
      },
      {
        icon: Target,
        label: "Study PD arrays",
        prompt:
          "Build me a practical ICT study plan for PD arrays, including fair value gaps, order blocks, breakers, mitigation blocks, and how to journal each one.",
      },
      {
        icon: Sparkles,
        label: "Research entry logic",
        prompt:
          "Teach me how to think about liquidity, displacement, premium-discount, and entry timing together instead of as isolated concepts.",
      },
      {
        icon: MessageSquare,
        label: "Use my knowledge library",
        prompt:
          "Use my saved lessons, playbooks, and daily notes to identify the main ICT concepts or execution themes I keep studying, then turn them into a focused 7-day review plan.",
      },
    ],
  },
};

const COACH_MODE_OPTIONS: CoachMode[] = ["coach", "research"];

function createEmptyThreads(): Record<CoachMode, CoachMessage[]> {
  return {
    coach: [],
    research: [],
  };
}

function upsertAssistantMessage(messages: CoachMessage[], content: string): CoachMessage[] {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "assistant") {
    return [...messages, { role: "assistant", content }];
  }

  if (lastMessage.content === content) {
    return messages;
  }

  return [...messages.slice(0, -1), { ...lastMessage, content }];
}

function CoachContent() {
  const [threads, setThreads] = useState<Record<CoachMode, CoachMessage[]>>(createEmptyThreads);
  const [mode, setMode] = useState<CoachMode>("coach");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRequestControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const modeConfig = COACH_MODE_CONFIG[mode];
  const messages = threads[mode];

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      activeRequestControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !user) router.replace(buildRedirectWithNext("/login", pathname));
  }, [user, isAuthLoading, pathname, router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (content: string) => {
    const activeMode = mode;
    const userMessage: CoachMessage = { role: "user", content };
    const updatedMessages = [...threads[activeMode], userMessage];
    const requestController = new AbortController();

    activeRequestControllerRef.current?.abort();
    activeRequestControllerRef.current = requestController;

    setThreads((currentThreads) => ({
      ...currentThreads,
      [activeMode]: updatedMessages,
    }));
    setIsLoading(true);
    try {
      const response = await streamCoachReply(updatedMessages, activeMode, {
        signal: requestController.signal,
        onChunk: (partialReply) => {
          if (!isMountedRef.current) {
            return;
          }

          setThreads((currentThreads) => ({
            ...currentThreads,
            [activeMode]: upsertAssistantMessage(currentThreads[activeMode], partialReply),
          }));
        },
      });

      if (!isMountedRef.current) {
        return;
      }

      setThreads((currentThreads) => ({
        ...currentThreads,
        [activeMode]: upsertAssistantMessage(currentThreads[activeMode], response.reply),
      }));
    } catch (err) {
      if (!isMountedRef.current || requestController.signal.aborted) {
        return;
      }

      toast({ title: "Coach unavailable", description: "Could not reach the AI coach. Please try again in a moment.", variant: "destructive" });
      setThreads((currentThreads) => ({
        ...currentThreads,
        [activeMode]: currentThreads[activeMode].at(-1)?.role === "assistant"
          ? currentThreads[activeMode]
          : updatedMessages,
      }));
    } finally {
      if (activeRequestControllerRef.current === requestController) {
        activeRequestControllerRef.current = null;
      }

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [mode, threads, toast]);

  const handleReset = useCallback(() => {
    setThreads((currentThreads) => ({
      ...currentThreads,
      [mode]: [],
    }));
  }, [mode]);

  const handleModeChange = useCallback((nextMode: CoachMode) => {
    if (isLoading || nextMode === mode) {
      return;
    }

    setMode(nextMode);
  }, [isLoading, mode]);

  if (isAuthLoading) return <AppShellLoader title="Loading coach" description="Preparing your AI trading coach." />;
  if (!user) return <AppShellLoader title="Redirecting" description="Taking you to login." />;

  return (
    <AppPageShell
      width="full"
      contentClassName="flex min-h-0 flex-1 flex-col px-0 py-0 sm:px-0 sm:py-0 lg:px-0"
    >
      {/* Chat header bar */}
      <div className="flex items-center justify-between border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 shadow-sm">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">TradeMind</h1>
            <p className="text-xs text-muted-foreground">AI Trading Coach &middot; {modeConfig.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex rounded-2xl border border-border/70 bg-card/80 p-1 shadow-sm">
            {COACH_MODE_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={mode === option ? "default" : "ghost"}
                onClick={() => handleModeChange(option)}
                disabled={isLoading}
                className="rounded-xl"
              >
                {COACH_MODE_CONFIG[option].label}
              </Button>
            ))}
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 rounded-xl">
              <RotateCcw className="h-3.5 w-3.5" /> New chat
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-accent/20 bg-accent/10 shadow-lg">
                <Bot className="h-10 w-10 text-accent" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-foreground">Welcome to TradeMind</h2>
              <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
                {modeConfig.description}
              </p>
              <div className="mt-8 grid w-full max-w-lg gap-3 sm:grid-cols-2">
                {modeConfig.starterPrompts.map((starter) => (
                  <button key={starter.label} type="button" onClick={() => sendMessage(starter.prompt)}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/95 p-4 text-left shadow-sm transition-all hover:border-accent/30 hover:bg-accent/5 hover:shadow-md">
                    <starter.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{starter.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{starter.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-2 rounded-2xl border border-border/50 bg-secondary/20 px-4 py-2.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{modeConfig.emptyStateHint}</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
              {isLoading && messages.at(-1)?.role !== "assistant" && <TypingIndicator />}
            </>
          )}
        </div>
      </div>

      {/* Input area */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={modeConfig.placeholder}
        helperText={modeConfig.helperText}
      />
    </AppPageShell>
  );
}

export default function CoachPage() {
  return <CoachContent />;
}
