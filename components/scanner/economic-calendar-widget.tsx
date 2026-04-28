"use client";

import { useEffect, useState } from "react";
import { scannerApi, EconomicCalendarDto, EconomicEventDto } from "@/lib/scanner-api";
import { Calendar, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, isToday, isPast } from "date-fns";

export function EconomicCalendarWidget() {
  const [calendar, setCalendar] = useState<EconomicCalendarDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        // Get today's events by default
        const today = new Date();
        const dateStr = format(today, 'yyyy-MM-dd');
        
        const data = await scannerApi.getEconomicCalendar(dateStr, dateStr);
        if (mounted) {
          setCalendar(data);
        }
      } catch (error) {
        console.error("Failed to load economic calendar:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High": return "bg-red-500";
      case "Medium": return "bg-orange-500";
      case "Low": return "bg-yellow-500";
      default: return "bg-slate-300 dark:bg-slate-700";
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "High": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "Medium": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "Low": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    }
  };

  const renderEventList = (events: EconomicEventDto[]) => {
    if (events.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Calendar className="h-8 w-8 mb-2 opacity-20" />
          <p>No economic events scheduled.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {events.map((event) => {
          const isPastEvent = isPast(new Date(event.eventDateUtc));
          const isUpcoming = event.isUpcoming;
          
          return (
            <div 
              key={event.id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-md ${
                isUpcoming ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-card border-border hover:bg-accent/30'
              } ${isPastEvent ? 'opacity-60' : ''}`}
            >
              <div className="flex flex-col items-center min-w-[60px] p-2 bg-background rounded-lg border shadow-sm">
                <span className="text-sm font-semibold text-foreground">
                  {format(new Date(event.eventDateUtc), "HH:mm")}
                </span>
                <span className="text-xs uppercase font-bold mt-1 text-muted-foreground">
                  {event.currency}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className={`text-sm font-semibold truncate ${isUpcoming ? 'text-primary' : 'text-foreground'}`} title={event.eventName}>
                    {event.eventName}
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 font-medium rounded-full border ${getImpactBadge(event.impact)}`}>
                    {event.impact}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div className="flex flex-col bg-muted/30 rounded p-1.5 border border-border/50 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase">Actual</span>
                    {event.actual != null ? (
                      <span className={`font-semibold mt-0.5 ${
                        event.forecast != null && event.actual > event.forecast ? 'text-green-600 dark:text-green-400' :
                        event.forecast != null && event.actual < event.forecast ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                      }`}>{event.actual}{event.unit}</span>
                    ) : (
                      <span className="font-medium mt-0.5 text-muted-foreground">--</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col bg-muted/30 rounded p-1.5 border border-border/50 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase">Forecast</span>
                    <span className="font-medium mt-0.5 text-foreground">
                      {event.forecast != null ? `${event.forecast}${event.unit}` : '--'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col bg-muted/30 rounded p-1.5 border border-border/50 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase">Previous</span>
                    <span className="font-medium mt-0.5 text-foreground">
                      {event.previous != null ? `${event.previous}${event.unit}` : '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-card border rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Today's Economic Calendar
        </h3>
        {!isLoading && calendar && (
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" title={`${calendar.highImpactCount} High Impact`} />
            <span className="h-2 w-2 rounded-full bg-orange-500" title={`${calendar.mediumImpactCount} Medium Impact`} />
            <span className="h-2 w-2 rounded-full bg-yellow-500" title={`${calendar.lowImpactCount} Low Impact`} />
          </div>
        )}
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading calendar data...</p>
          </div>
        ) : calendar ? (
          <>
            <div className="text-xs text-muted-foreground flex justify-between mb-2">
              <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
              <span>{calendar.totalEvents} events</span>
            </div>
            {renderEventList(calendar.events)}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-red-500">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p>Failed to load economic data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
