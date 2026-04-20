import { api, ApiResponse } from "./api";

export interface ChecklistModelDto {
  id: number;
  name: string;
  description: string | null;
  criteriaCount: number;
}

export interface PretradeChecklistDto {
  id: number;
  name: string;
  checkListType: number;
  checklistModelId: number;
  checklistModelName: string;
}

export interface ChecklistModelDetailDto {
  id: number;
  name: string;
  description: string | null;
  criteria: PretradeChecklistDto[];
}

export interface ChecklistModelPayload {
  name: string;
  description?: string | null;
}

export interface PretradeChecklistPayload {
  name: string;
  type: number;
  checklistModelId: number;
}

export async function getChecklistModels() {
  return api.get<ApiResponse<ChecklistModelDto[]>>("/v1/checklist-models");
}

export async function getChecklistModelDetail(id: number) {
  return api.get<ApiResponse<ChecklistModelDetailDto>>(`/v1/checklist-models/${id}`);
}

export async function createChecklistModel(data: ChecklistModelPayload) {
  return api.post<ApiResponse<number>>("/v1/checklist-models", data);
}

export async function updateChecklistModel(data: ChecklistModelPayload & { id: number }) {
  return api.put<ApiResponse<boolean>>("/v1/checklist-models", data);
}

export async function getPretradeChecklists() {
  return api.get<ApiResponse<PretradeChecklistDto[]>>("/v1/pretrade-checklists");
}

export async function createPretradeChecklist(data: PretradeChecklistPayload) {
  return api.post<ApiResponse<number>>("/v1/pretrade-checklists", data);
}

export async function updatePretradeChecklist(data: PretradeChecklistPayload & { id: number }) {
  return api.put<ApiResponse<boolean>>("/v1/pretrade-checklists", data);
}

export async function deletePretradeChecklist(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/pretrade-checklists/${id}`);
}

export async function addCriteriaToModel(modelId: number, data: { name: string; type: number }) {
  return createPretradeChecklist({
    ...data,
    checklistModelId: modelId,
  });
}

export const ChecklistTypeLabels: Record<number, string> = {
  1: "Market Structure",
  2: "Trading Setup",
  3: "Risk Management",
  4: "Psychology",
};

export const ChecklistTypeColors: Record<number, string> = {
  1: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  2: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  3: "text-red-400 bg-red-400/10 border-red-400/20",
  4: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

export const CHECKLIST_TYPE_OPTIONS = [
  { value: "1", label: ChecklistTypeLabels[1] },
  { value: "2", label: ChecklistTypeLabels[2] },
  { value: "3", label: ChecklistTypeLabels[3] },
  { value: "4", label: ChecklistTypeLabels[4] },
];