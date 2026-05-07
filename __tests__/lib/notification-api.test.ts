import { describe, expect, it } from "vitest"
import {
  normalizeNotification,
  NotificationPriority,
  NotificationType,
} from "@/lib/notification-api"

describe("normalizeNotification", () => {
  it("maps string notification types and priorities from the backend", () => {
    expect(
      normalizeNotification({
        id: 1,
        userId: 7,
        title: "Tilt warning",
        message: "Pause before the next trade.",
        type: "TiltWarning",
        priority: "Critical",
        isRead: false,
        createdDate: "2026-05-06T12:00:00Z",
      }),
    ).toMatchObject({
      type: NotificationType.TiltWarning,
      priority: NotificationPriority.Critical,
    })
  })
})