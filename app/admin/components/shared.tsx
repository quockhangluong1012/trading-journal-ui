import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Sparkles, Loader2 } from "lucide-react";

export function SectionHeader({
  title,
  description,
  count,
  onAdd,
  searchValue,
  onSearchChange,
}: {
  title: string;
  description: string;
  count: number;
  onAdd: () => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          {title}
          <Badge variant="secondary" className="text-xs font-normal tabular-nums">
            {count}
          </Badge>
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      
    </div>
  );
}

export function TableSkeleton({ rows = 4, columns }: { rows?: number; columns?: number }) {
  return (
    <div className="flex h-[300px] w-full items-center justify-center text-primary">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export function EmptyState({ title, action }: { title: string; action: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
        <Sparkles className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4">Get started by adding your first item.</p>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={action}>
        <Plus className="h-3.5 w-3.5" />
        Add Now
      </Button>
    </div>
  );
}
