"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Database, AlertCircle, Upload, FileText, CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionHeader, TableSkeleton, EmptyState } from "../components/shared";

import {
  getBacktestAssets,
  createBacktestAsset,
  deleteBacktestAsset,
  bulkUploadCsvFiles,
  getImportJobs,
  AssetDto,
  AdminCreateAssetRequest,
  CsvImportJobDto,
  PipType,
  PipTypeLabels,
} from "@/lib/admin-api";
import { attachToken } from "@/lib/api";

const formSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(30),
  displayName: z.string().min(1, "Display Name is required").max(100),
  category: z.string().min(1, "Category is required"),
  defaultSpreadPips: z.coerce.number().min(0, "Spread must be >= 0"),
  pipType: z.string().min(1, "Pip Type is required"),
});

// ─── Job Status Badge ────────────────────────────────────
function JobStatusBadge({ status }: { status: CsvImportJobDto["status"] }) {
  const config = {
    Pending: {
      icon: Clock,
      label: "Pending",
      className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    },
    Processing: {
      icon: Loader2,
      label: "Processing",
      className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    Completed: {
      icon: CheckCircle2,
      label: "Completed",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    Failed: {
      icon: XCircle,
      label: "Failed",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      <Icon
        className={`h-3 w-3 ${status === "Processing" ? "animate-spin" : ""}`}
      />
      {config.label}
    </span>
  );
}

// ─── Bulk Upload Dialog ──────────────────────────────────
function BulkUploadDialog({
  asset,
  onComplete,
}: {
  asset: AssetDto;
  onComplete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [jobs, setJobs] = useState<CsvImportJobDto[]>([]);
  const [showJobs, setShowJobs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      attachToken();
      const res = await getImportJobs(asset.id);
      if (res.data.isSuccess) {
        setJobs(res.data.value);

        // Stop polling if no jobs are pending/processing
        const hasActive = res.data.value.some(
          (j) => j.status === "Pending" || j.status === "Processing"
        );
        if (!hasActive && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          onComplete();
        }
      }
    } catch {
      // Silent fail on poll
    }
  }, [asset.id, onComplete]);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchJobs, 3000);
  }, [fetchJobs]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Load existing jobs
      await fetchJobs();
      setShowJobs(true);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      setSelectedFiles([]);
      setIsDragOver(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.endsWith(".csv") || f.name.endsWith(".txt")
      );
      setSelectedFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      attachToken();
      const res = await bulkUploadCsvFiles(asset.id, selectedFiles);
      if (res.data.isSuccess) {
        toast.success(
          `${res.data.value.queuedFiles} file(s) queued for import`
        );
        setSelectedFiles([]);
        setShowJobs(true);
        await fetchJobs();
        startPolling();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to upload files"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Calculate progress stats
  const completedJobs = jobs.filter((j) => j.status === "Completed").length;
  const totalJobs = jobs.length;
  const totalImported = jobs.reduce((sum, j) => sum + j.importedCandles, 0);
  const hasActiveJobs = jobs.some(
    (j) => j.status === "Pending" || j.status === "Processing"
  );

  // Start polling if there are active jobs when dialog opens
  useEffect(() => {
    if (isOpen && hasActiveJobs) {
      startPolling();
    }
  }, [isOpen, hasActiveJobs, startPolling]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-blue-500"
          title="Upload CSV files"
        >
          <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk CSV Import — {asset.symbol}
          </DialogTitle>
          <DialogDescription>
            Upload multiple monthly CSV files. They will be processed
            sequentially by the background import service.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Drop Zone */}
          <div
            className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
              isDragOver
                ? "border-blue-500 bg-blue-500/5"
                : "border-border hover:border-muted-foreground/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload
              className={`mx-auto h-8 w-8 mb-2 ${isDragOver ? "text-blue-500" : "text-muted-foreground"}`}
            />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                Click to browse
              </span>{" "}
              or drag &amp; drop CSV files here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports .csv and .txt files (HistData or standard format)
            </p>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {selectedFiles.length} file(s) selected
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedFiles([])}
                >
                  Clear all
                </Button>
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1 pr-3">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload {selectedFiles.length} File(s)
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Import Jobs Panel */}
          {showJobs && jobs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Import History
                </p>
                {totalJobs > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {completedJobs}/{totalJobs} completed •{" "}
                    {new Intl.NumberFormat().format(totalImported)} candles
                  </span>
                )}
              </div>

              {hasActiveJobs && totalJobs > 0 && (
                <Progress
                  value={(completedJobs / totalJobs) * 100}
                  className="h-1.5"
                />
              )}

              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1.5 pr-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-md border border-border/50 bg-card px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{job.fileName}</p>
                          {job.status === "Completed" && (
                            <p className="text-xs text-muted-foreground">
                              {new Intl.NumberFormat().format(
                                job.importedCandles
                              )}{" "}
                              imported
                              {job.skippedDuplicates > 0 &&
                                `, ${new Intl.NumberFormat().format(job.skippedDuplicates)} skipped`}
                            </p>
                          )}
                          {job.status === "Failed" && job.errorMessage && (
                            <p
                              className="text-xs text-red-400 truncate"
                              title={job.errorMessage}
                            >
                              {job.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <JobStatusBadge status={job.status} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────
export default function AssetsPage() {
  const [data, setData] = useState<AssetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbol: "",
      displayName: "",
      category: "",
      defaultSpreadPips: 1.0,
      pipType: "",
    },
  });

  const fetchData = async () => {
    try {
      attachToken();
      setLoading(true);
      const res = await getBacktestAssets();
      if (res.data.isSuccess) {
        setData(res.data.value);
      }
    } catch (error) {
      toast.error("Failed to load assets");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      attachToken();
      const payload: AdminCreateAssetRequest = {
        symbol: values.symbol,
        displayName: values.displayName,
        category: values.category,
        dataProvider: "CSV",
        dataStartDate: new Date("2000-01-01").toISOString(),
        dataEndDate: null,
        defaultSpreadPips: values.defaultSpreadPips,
        pipType: parseInt(values.pipType),
      };

      const res = await createBacktestAsset(payload);
      if (res.data.isSuccess) {
        toast.success("Asset created and queued for sync");
        setIsDialogOpen(false);
        form.reset();
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to create asset");
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    
    try {
      attachToken();
      const res = await deleteBacktestAsset(id);
      if (res.data.isSuccess) {
        toast.success("Asset deleted successfully");
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to delete asset");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Backtest Assets" 
        description="Manage historical data assets, their data providers, and observe sync engine statuses."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 gap-1.5 rounded-xl px-4 bg-blue-500 text-white hover:bg-blue-600">
              <Plus className="h-3.5 w-3.5" />
              New Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Register Backtest Asset</DialogTitle>
              <DialogDescription>
                Assign an asset via an automated API Provider or reserve a slot for a CSV import.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="EURUSD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Euro / US Dollar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Forex">Forex</SelectItem>
                            <SelectItem value="Crypto">Crypto</SelectItem>
                            <SelectItem value="Indices">Indices</SelectItem>
                            <SelectItem value="Metals">Metals</SelectItem>
                            <SelectItem value="Futures">Futures</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultSpreadPips"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Spread (pips)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" min="0" placeholder="1.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pipType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pip Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(PipTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Registering..." : "Register Asset"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </SectionHeader>

      <div className="rounded-md border border-border">
        {loading ? (
          <TableSkeleton columns={7} rows={4} />
        ) : data.length === 0 ? (
          <EmptyState 
            icon={Database} 
            title="No assets registered" 
            description="Register your first asset to trigger the backtesting data synchronization." 
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Candles Generated</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{item.symbol}</div>
                    <div className="text-xs text-muted-foreground">{item.displayName}</div>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.dataProvider}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground`}>
                      {item.syncStatus}
                      {item.lastError && <AlertCircle className="ml-1 h-3 w-3 text-red-500" title={item.lastError} />}
                    </span>
                  </TableCell>
                  <TableCell>{new Intl.NumberFormat().format(item.totalCandles)} M1</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(item.createdDate), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Upload CSV button — shown for all assets */}
                      <BulkUploadDialog
                        asset={item}
                        onComplete={fetchData}
                      />

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you absolutely sure you want to delete this asset? This will permanently destroy all associated backtest raw candle data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
