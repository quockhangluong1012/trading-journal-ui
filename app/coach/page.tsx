"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/header";
import { ChatMessage, TypingIndicator } from "@/components/coach/chat-message";
import { ChatInput } from "@/components/coach/chat-input";
import { Button } from "@/components/ui/button";
import { Bot, Brain, Lightbulb, MessageSquare, RotateCcw, Sparkles, Target, TrendingUp } from "lucide-react";
import { chatWithCoach, type CoachMessage } from "@/lib/coach-api";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { buildRedirectWithNext } from "@/lib/auth-redirect";
import { AppShellLoader } from "@/components/app-shell-loader";

const STARTER_PROMPTS = [
  { icon: TrendingUp, label: "Review my performance", prompt: "Can you review my recent trading performance and highlight what I'm doing well and what needs improvement?" },
  { icon: Brain, label: "Analyze my psychology", prompt: "Based on my psychology journal entries and emotion patterns, what mental game insights can you share?" },
  { icon: Target, label: "ICT concept review", prompt: "Analyze my recent trades through the lens of ICT concepts. Am I correctly identifying Order Blocks, Fair Value Gaps, and market structure? Which ICT concepts are working best for me?" },
  { icon: Lightbulb, label: "Killzone & AMD coaching", prompt: "Based on my killzone performance data, which sessions am I most profitable in? Help me optimize my Power of 3 (AMD) entries and identify my best trading windows." },
];

function CoachContent() {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthLoading && !user) router.replace(buildRedirectWithNext("/login", pathname));
  }, [user, isAuthLoading, pathname, router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: CoachMessage = { role: "user", content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    try {
      const response = await chatWithCoach(updatedMessages);
      setMessages([...updatedMessages, { role: "assistant", content: response.reply }]);
    } catch (err) {
      console.error("Coach chat error:", err);
      toast({ title: "Coach unavailable", description: "Could not reach the AI coach. Please try again in a moment.", variant: "destructive" });
      setMessages(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  }, [messages, toast]);

  const handleReset = () => { setMessages([]); };

  if (isAuthLoading) return <AppShellLoader title="Loading coach" description="Preparing your AI trading coach." />;
  if (!user) return <AppShellLoader title="Redirecting" description="Taking you to login." />;

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Chat header bar */}
        <div className="flex items-center justify-between border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 shadow-sm">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">TradeMind</h1>
              <p className="text-xs text-muted-foreground">AI Trading Coach &middot; Personalized to your data</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 rounded-xl">
              <RotateCcw className="h-3.5 w-3.5" /> New chat
            </Button>
          )}
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
                  Your AI trading coach analyzes your real performance data, psychology journal, and trade history to give personalized, actionable guidance.
                </p>
                <div className="mt-8 grid w-full max-w-lg gap-3 sm:grid-cols-2">
                  {STARTER_PROMPTS.map((starter) => (
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
                  <p className="text-xs text-muted-foreground">Start a conversation or pick a starter prompt above</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <ChatMessage key={i} role={msg.role} content={msg.content} />
                ))}
                {isLoading && <TypingIndicator />}
              </>
            )}
          </div>
        </div>

        {/* Input area */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}

export default function CoachPage() {
  return <CoachContent />;
}
