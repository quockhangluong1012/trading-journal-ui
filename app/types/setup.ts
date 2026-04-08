export interface Setup {
  id: number;
  name: string;
  model: string;
  description: string;
  status: number;
  notes?: string;
  createdDate: string;
  updatedDate: string;
}

export interface SetupStepDto {
  id?: number;
  stepNumber: number;
  label: string;
  description: string;
  nodeType: string;
  color: string;
  positionX: number;
  positionY: number;
}

export interface SetupConnectionDto {
  id?: number;
  sourceStepId: number;
  targetStepId: number;
  label?: string;
  isAnimated: boolean;
  color?: string;
}

export interface SetupDetail extends Setup {
  steps: SetupStepDto[];
  connections: SetupConnectionDto[];
}

/** Status enum values matching backend SetupStatus */
export const SetupStatus = {
  Active: 1,
  Draft: 2,
  Archived: 3,
} as const;

export type SetupStatusType = (typeof SetupStatus)[keyof typeof SetupStatus];

export function getSetupStatusLabel(status: number): string {
  switch (status) {
    case SetupStatus.Active:
      return "Active";
    case SetupStatus.Draft:
      return "Draft";
    case SetupStatus.Archived:
      return "Archived";
    default:
      return "Unknown";
  }
}

export function getSetupStatusKey(status: number): "active" | "draft" | "archived" {
  switch (status) {
    case SetupStatus.Active:
      return "active";
    case SetupStatus.Draft:
      return "draft";
    case SetupStatus.Archived:
      return "archived";
    default:
      return "draft";
  }
}
