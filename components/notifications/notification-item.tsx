import React from "react";
import { formatDistanceToNow } from "date-fns";
import { NotificationDto, NotificationType, NotificationPriority } from "@/lib/notification-api";
import { Bell, ShieldAlert, LineChart, Cpu, X, Check, Trophy, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import Link from "next/link";

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.System:
        return <Bell className="h-5 w-5 text-blue-500" />;
      case NotificationType.ScannerAlert:
        return <LineChart className="h-5 w-5 text-purple-500" />;
      case NotificationType.TradeReminder:
        return <ShieldAlert className="h-5 w-5 text-amber-500" />;
      case NotificationType.AiInsight:
        return <Cpu className="h-5 w-5 text-emerald-500" />;
      case NotificationType.TiltWarning:
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case NotificationType.StreakAlert:
        return <Trophy className="h-5 w-5 text-amber-500" />;
      case NotificationType.GoalCompleted:
        return <Target className="h-5 w-5 text-emerald-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case NotificationPriority.Critical:
        return "border-l-4 border-red-500";
      case NotificationPriority.High:
        return "border-l-4 border-amber-500";
      case NotificationPriority.Normal:
        return "border-l-4 border-blue-500";
      case NotificationPriority.Low:
        return "border-l-4 border-gray-300 dark:border-gray-700";
      default:
        return "";
    }
  };

  const content = (
    <div
      className={cn(
        "relative p-4 mb-2 rounded-lg bg-card text-card-foreground border transition-all hover:bg-accent hover:text-accent-foreground group",
        !notification.isRead && "bg-muted/50 dark:bg-muted/20 font-medium",
        getPriorityColor()
      )}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h4 className="text-sm font-semibold truncate pr-8">{notification.title}</h4>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.createdDate), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
              >
                <Check className="h-3 w-3 mr-1" /> Mark Read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 ml-auto text-destructive hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(notification.id);
              }}
            >
              <X className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>
      {!notification.isRead && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500" />
      )}
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} className="block w-full">
        {content}
      </Link>
    );
  }

  return content;
}
