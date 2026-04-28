import { formatDistanceToNow } from "date-fns";
import { ScannerAlertDto, ScannerTimeframe } from "@/lib/scanner-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Target, Crosshair } from "lucide-react";
import { PatternBadge } from "./pattern-badge";
import { ConfluenceIndicator } from "./confluence-indicator";

interface AlertCardProps {
  alert: ScannerAlertDto;
  onDismiss: (id: number) => void;
}

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const getTimeframeLabel = (tf: ScannerTimeframe) => {
    switch (tf) {
      case ScannerTimeframe.M5: return "M5";
      case ScannerTimeframe.M15: return "M15";
      case ScannerTimeframe.H1: return "H1";
      case ScannerTimeframe.D1: return "D1";
      default: return `${tf}m`;
    }
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md border-l-4" style={{
      borderLeftColor: 'hsl(var(--primary))'
    }}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{alert.symbol}</h3>
            <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {getTimeframeLabel(alert.timeframe)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(alert.detectedAt), { addSuffix: true })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onDismiss(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <PatternBadge type={alert.patternType} />
          <ConfluenceIndicator score={alert.confluenceScore} />
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {alert.description}
        </p>

        <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Crosshair className="h-3 w-3" /> Price at Detection
            </span>
            <span className="font-mono font-medium">{alert.priceAtDetection.toFixed(5)}</span>
          </div>
          {(alert.zoneHighPrice || alert.zoneLowPrice) && (
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Target className="h-3 w-3" /> Zone
              </span>
              <span className="font-mono font-medium">
                {alert.zoneLowPrice ? alert.zoneLowPrice.toFixed(5) : '-'} 
                {" - "} 
                {alert.zoneHighPrice ? alert.zoneHighPrice.toFixed(5) : '-'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
