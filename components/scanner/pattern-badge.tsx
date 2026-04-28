import { Badge } from "@/components/ui/badge";
import { IctPatternType } from "@/lib/scanner-api";

interface PatternBadgeProps {
  type: IctPatternType;
}

export function PatternBadge({ type }: PatternBadgeProps) {
  const getBadgeProps = () => {
    switch (type) {
      case IctPatternType.FVG:
        return { label: "FVG", className: "bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 dark:text-blue-400" };
      case IctPatternType.OrderBlock:
        return { label: "Order Block", className: "bg-purple-500/15 text-purple-600 hover:bg-purple-500/25 dark:text-purple-400" };
      case IctPatternType.BreakerBlock:
        return { label: "Breaker Block", className: "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400" };
      case IctPatternType.Liquidity:
        return { label: "Liquidity Pool", className: "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400" };
      case IctPatternType.LiquiditySweep:
        return { label: "Liquidity Sweep", className: "bg-red-500/15 text-red-600 hover:bg-red-500/25 dark:text-red-400" };
      default:
        return { label: "Unknown", className: "bg-gray-500/15 text-gray-600 hover:bg-gray-500/25 dark:text-gray-400" };
    }
  };

  const { label, className } = getBadgeProps();

  return (
    <Badge variant="outline" className={`border-transparent font-semibold ${className}`}>
      {label}
    </Badge>
  );
}
