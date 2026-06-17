import apiClient from './client';

export const TASK_TYPES = [
    'FEED', 'WATER_TEST', 'SAMPLING', 'AERATOR_CHECK', 'MORTALITY_CHECK', 'HARVEST_PREP', 'OTHER',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export interface Task {
    id: string;
    farmId: string;
    pondId?: string | null;
    cropId?: string | null;
    title: string;
    description?: string | null;
    /** FEED | WATER_TEST | SAMPLING | AERATOR_CHECK | MORTALITY_CHECK | HARVEST_PREP | OTHER */
    type: string;
    /** 'open' | 'in_progress' | 'done' | 'verified' | 'cancelled' */
    status: string;
    /** 'low' | 'medium' | 'high' */
    priority: string;
    dueDate?: string | null;
    timeWindowStart?: string | null;
    timeWindowEnd?: string | null;
    recurrenceRule?: string | null;
    parentTaskId?: string | null;
    assignedToId?: string | null;
    createdById?: string | null;
    completedAt?: string | null;
    verifiedAt?: string | null;
    verifiedById?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskDto {
    farmId: string;
    title: string;
    description?: string;
    type?: TaskType;
    status?: string;
    priority?: string;
    dueDate?: string;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    recurrenceFreq?: 'daily' | 'weekly';
    recurrenceCount?: number;
    pondId?: string;
    cropId?: string;
    assignedToId?: string;
}

export type UpdateTaskDto = Partial<Omit<CreateTaskDto, 'farmId'>>;

export const tasksApi = {
    getAll: (farmId: string, params?: { status?: string; assignedToId?: string }) =>
        apiClient.get<Task[]>('/tasks', { params: { farmId, ...params } }),

    getById: (id: string) => apiClient.get<Task>(`/tasks/${id}`),

    create: (data: CreateTaskDto) => apiClient.post<Task>('/tasks', data),

    update: (id: string, data: UpdateTaskDto) => apiClient.patch<Task>(`/tasks/${id}`, data),

    delete: (id: string) => apiClient.delete(`/tasks/${id}`),

    /** Worker marks their assigned task done (assignee enforced server-side). */
    complete: (id: string) => apiClient.post<Task>(`/tasks/${id}/complete`, {}),

    /** Manager/owner verifies a completed task. */
    verify: (id: string) => apiClient.post<Task>(`/tasks/${id}/verify`, {}),
};
