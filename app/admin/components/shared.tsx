import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Sparkles, Loader2 } from "lucide-react";

export function SectionHeader({
  title,
  description,
  count,
  onAdd,
  searchValue,
  onSearchChange,
  children,
}: {
  title: string;
  description: string;
  count?: number;
  onAdd?: () => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] border border-border/70 bg-card/75 px-5 py-5 shadow-sm backdrop-blur-md sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          {title}
          {count !== undefined && (
            <Badge variant="secondary" className="text-xs font-normal tabular-nums">
              {count}
            </Badge>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[320px] sm:flex-row sm:items-center">
        {searchValue !== undefined && onSearchChange !== undefined && (
          <div className="relative flex-1 sm:min-w-55">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="h-10 rounded-xl border-border/70 bg-background/75 pl-9"
            />
          </div>
        )}

        {children}
        
        {onAdd && !children && (
          <Button onClick={onAdd} className="h-10 gap-1.5 rounded-xl px-4">
            <Plus className="h-3.5 w-3.5" />
            Add New
          </Button>
        )}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 4, columns }: { rows?: number; columns?: number }) {
  return (
    <div className="flex h-75 w-full flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-border/60 bg-card/60 text-primary">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm font-medium text-foreground">Loading records</p>
      <p className="text-xs text-muted-foreground">Fetching the latest admin data.</p>
    </div>
  );
}

export function EmptyState({ title, action }: { title: string; action: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/60 bg-card/60 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
        <Sparkles className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4">Get started by adding your first item.</p>
      <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={action}>
        <Plus className="h-3.5 w-3.5" />
        Add Now
      </Button>
    </div>
  );
}
