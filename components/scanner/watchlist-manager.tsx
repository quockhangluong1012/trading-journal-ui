import { useState } from "react";
import { useScannerStore } from "@/lib/stores/scanner-store";
import { WatchlistDto, WatchlistAssetDto } from "@/lib/scanner-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, List, TrendingUp, Play, Square, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WatchlistManager() {
  const {
    watchlists,
    createWatchlist,
    deleteWatchlist,
    toggleWatchlistActive,
    toggleWatchlistScanner,
    addAsset,
    removeAsset,
  } = useScannerStore();

  const [newListName, setNewListName] = useState("");
  const [newAssetSymbol, setNewAssetSymbol] = useState("");
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [togglingScanner, setTogglingScanner] = useState<number | null>(null);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      await createWatchlist(newListName.trim());
      setNewListName("");
    }
  };

  const handleAddAsset = async (e: React.FormEvent, listId: number) => {
    e.preventDefault();
    if (newAssetSymbol.trim()) {
      await addAsset(listId, newAssetSymbol.trim().toUpperCase(), newAssetSymbol.trim().toUpperCase());
      setNewAssetSymbol("");
    }
  };

  const handleToggleScanner = async (listId: number, start: boolean) => {
    setTogglingScanner(listId);
    try {
      await toggleWatchlistScanner(listId, start);
    } finally {
      setTogglingScanner(null);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-muted-foreground" />
            Watchlists
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <form onSubmit={handleCreateList} className="flex gap-2">
            <Input
              placeholder="New watchlist name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="secondary" disabled={!newListName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!watchlists || !Array.isArray(watchlists) || watchlists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No watchlists yet. Create one to start scanning!
            </div>
          ) : (
            watchlists.map((list) => (
              <div key={list.id} className="border rounded-lg bg-card overflow-hidden">
                <div className="p-3 bg-muted/30 flex items-center justify-between border-b cursor-pointer hover:bg-muted/50 transition-colors"
                     onClick={() => setActiveListId(activeListId === list.id ? null : list.id)}>
                  <div className="flex items-center gap-3">
                    {/* Scanner Running Indicator */}
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      list.isScannerRunning
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-gray-400"
                    }`} />
                    <span className="font-medium">{list.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {list.assets.length} assets
                    </Badge>
                    {list.isScannerRunning && (
                      <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-600">
                        Scanning
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Per-Watchlist Scanner Toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${
                        list.isScannerRunning
                          ? "text-emerald-500 hover:text-red-500"
                          : "text-muted-foreground hover:text-emerald-500"
                      }`}
                      disabled={togglingScanner === list.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleScanner(list.id, !list.isScannerRunning);
                      }}
                      title={list.isScannerRunning ? "Stop scanner" : "Start scanner"}
                    >
                      {togglingScanner === list.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : list.isScannerRunning ? (
                        <Square className="h-3.5 w-3.5 fill-current" />
                      ) : (
                        <Play className="h-4 w-4 fill-current" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWatchlist(list.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {activeListId === list.id && (
                  <div className="p-3 bg-background">
                    <form onSubmit={(e) => handleAddAsset(e, list.id)} className="flex gap-2 mb-3">
                      <Input
                        size={1}
                        placeholder="Add symbol (e.g. BTCUSDT)..."
                        value={newAssetSymbol}
                        onChange={(e) => setNewAssetSymbol(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Button type="submit" size="sm" className="h-8" disabled={!newAssetSymbol.trim()}>
                        Add
                      </Button>
                    </form>

                    <div className="flex flex-wrap gap-2">
                      {list.assets.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic w-full text-center py-2">
                          No assets in this watchlist
                        </span>
                      ) : (
                        list.assets.map((asset) => (
                          <Badge
                            key={asset.id}
                            variant="outline"
                            className="bg-card pl-2 pr-1 py-1 flex items-center gap-1"
                          >
                            <TrendingUp className="h-3 w-3 text-muted-foreground mr-1" />
                            {asset.symbol}
                            <button
                              onClick={() => removeAsset(list.id, asset.id)}
                              className="ml-1 h-4 w-4 rounded-full hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
