"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useBacktestStore, fetchAvailableAssetsApi, AvailableAsset } from "@/lib/backtest-store";
import { format } from "date-fns";
import { Activity, CalendarIcon, Database, Loader2, WalletCards } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";



const formSchema = z.object({
  asset: z.string({ required_error: "Please select an asset." }),
  startDate: z.date({ required_error: "A start date is required." }),
  initialBalance: z.coerce
    .number()
    .positive("Initial balance must be greater than 0")
    .min(10, "Minimum starting balance is $10"),
});

interface CreateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSessionModal({
  open,
  onOpenChange,
}: CreateSessionModalProps) {
  const router = useRouter();
  const { createSession } = useBacktestStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingAssets(true);
      fetchAvailableAssetsApi()
        .then(setAvailableAssets)
        .catch(err => console.error("Failed to load assets", err))
        .finally(() => setLoadingAssets(false));
    }
  }, [open]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      initialBalance: 10000,
    },
  });

  const selectedAssetSymbol = form.watch("asset");
  const selectedAsset = useMemo(
    () => availableAssets.find((asset) => asset.symbol === selectedAssetSymbol),
    [availableAssets, selectedAssetSymbol],
  );

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "Present";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";

    return format(date, "MMM dd, yyyy");
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      const req = {
        asset: values.asset,
        startDate: values.startDate.toISOString(),
        endDate: null, // Default to present
        initialBalance: values.initialBalance,
      };

      const sessionId = await createSession(req);
      onOpenChange(false);
      form.reset();
      
      // Redirect to the newly created session workspace
      router.push(`/backtest/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session", error);
      toast.error("Failed to create backtest session");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Create backtest session</DialogTitle>
          <DialogDescription>
            Select the market and starting capital for the replay workspace.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            <FormField
              control={form.control}
              name="asset"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Pair</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-md">
                        <SelectValue placeholder={loadingAssets ? "Loading assets..." : "Select an asset"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingAssets ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading assets
                        </div>
                      ) : null}
                      {availableAssets.map((asset) => (
                        <SelectItem key={asset.symbol} value={asset.symbol}>
                          {asset.symbol} <span className="text-muted-foreground ml-2 text-xs">({new Intl.NumberFormat().format(asset.totalCandles)} candles)</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedAsset ? (
              <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/25 p-3 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-background text-primary">
                    <Database className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{selectedAsset.displayName}</p>
                    <p className="text-xs text-muted-foreground">{selectedAsset.category}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available candles</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {new Intl.NumberFormat().format(selectedAsset.totalCandles)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data range</p>
                  <p className="mt-1 font-semibold">
                    {formatDate(selectedAsset.dataStartDate)} - {formatDate(selectedAsset.dataEndDate)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-11 w-full justify-start rounded-md pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("2000-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>Replay continues to the latest available data.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Balance ($)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <WalletCards className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          className="h-11 rounded-md pl-9 tabular-nums"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-3 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Replay mode</span>
              </div>
              <div className="font-medium">Manual execution</div>
              <div className="text-muted-foreground sm:text-right">M15 default chart</div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-10 rounded-md" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & Launch
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
