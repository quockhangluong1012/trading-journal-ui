import { cn } from "@/lib/utils";

interface ConfluenceIndicatorProps {
  score: number;
  maxScore?: number;
}

export function ConfluenceIndicator({ score, maxScore = 4 }: ConfluenceIndicatorProps) {
  const getScoreColor = (index: number) => {
    if (index >= score) return "bg-muted";
    
    // Gradient from yellow to green based on score
    if (score === 1) return "bg-amber-400";
    if (score === 2) return "bg-amber-500";
    if (score === 3) return "bg-emerald-400";
    return "bg-emerald-500";
  };

  const getScoreText = () => {
    if (score <= 1) return "Low Confluence";
    if (score === 2) return "Medium Confluence";
    if (score === 3) return "High Confluence";
    return "Max Confluence";
  };

  return (
    <div className="flex items-center gap-2" title={getScoreText()}>
      <div className="flex gap-1">
        {Array.from({ length: maxScore }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3 w-1.5 rounded-sm transition-colors duration-300",
              getScoreColor(i)
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground font-medium">
        {score}/{maxScore}
      </span>
    </div>
  );
}
